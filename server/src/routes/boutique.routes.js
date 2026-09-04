import { Router } from "express";
import Categorie from "../models/Categorie.js";
import Produit from "../models/Produit.js";
import { requireAuth } from "../middleware/auth.js";
import { upload, processAndStore, deleteStoredFile, erreursUpload } from "../middleware/upload.js";

const router = Router();

// Au-delà, la fiche devient un diaporama que personne ne fait défiler, et la
// page pèse pour rien.
const PHOTOS_MAX = 8;

/* ------------------------------------------------------------------ *
 * Normalisation
 * ------------------------------------------------------------------ */

const texte = (valeur, max) => String(valeur ?? "").trim().slice(0, max);

function normaliserTailles(entrees) {
  if (!Array.isArray(entrees)) return null;
  return entrees
    .map((t) => texte(t, 12))
    .filter(Boolean)
    .slice(0, 16);
}

function normaliserCaracteristiques(entrees) {
  return entrees
    .slice(0, 10)
    .map((c) => ({ cle: texte(c?.cle, 40), valeur: texte(c?.valeur, 80) }))
    .filter((c) => c.cle);
}

/**
 * Aligne le stock sur la grille de tailles de la catégorie.
 *
 * C'est le point qui casse silencieusement si on l'oublie : le gérant change
 * la grille d'un rayon (« on ne fait plus de A4 »), et les fiches gardent une
 * ligne A4 que le site continue d'afficher. On repart donc TOUJOURS de la
 * grille de la catégorie, en conservant les quantités déjà saisies pour les
 * tailles qui subsistent.
 */
function alignerStock(taillesCategorie, stockEnvoye, stockExistant) {
  const saisi = new Map();
  if (Array.isArray(stockEnvoye)) {
    stockEnvoye.forEach((s) => {
      const taille = texte(s?.taille, 12);
      if (taille) saisi.set(taille, Math.max(0, Math.round(Number(s?.quantite) || 0)));
    });
  }
  const ancien = new Map((stockExistant ?? []).map((s) => [s.taille, s.quantite]));

  return taillesCategorie.map((taille) => ({
    taille,
    quantite: saisi.has(taille) ? saisi.get(taille) : ancien.get(taille) ?? 0,
  }));
}

async function appliquerProduit(produit, body) {
  if (body.nom !== undefined) produit.nom = texte(body.nom, 80);
  if (body.description !== undefined) produit.description = texte(body.description, 600);

  if (body.prix !== undefined) {
    const n = Number(body.prix);
    produit.prix = Number.isFinite(n) ? Math.max(0, n) : 0;
  }

  if (Array.isArray(body.caracteristiques)) {
    produit.caracteristiques = normaliserCaracteristiques(body.caracteristiques);
  }

  if (body.misEnAvant !== undefined) produit.misEnAvant = body.misEnAvant === true;
  if (body.actif !== undefined) produit.actif = body.actif === true;

  if (body.categorie !== undefined) produit.categorie = body.categorie;

  // Le stock dépend de la catégorie : il se recalcule APRÈS elle, jamais avant.
  const categorie = await Categorie.findById(produit.categorie);
  if (!categorie) {
    const err = new Error("Catégorie introuvable.");
    err.status = 400;
    throw err;
  }
  produit.stock = alignerStock(categorie.tailles, body.stock, produit.stock);
}

/* ------------------------------------------------------------------ *
 * Public
 * ------------------------------------------------------------------ */

/**
 * Une seule route pour toute la boutique : les catégories servent à la fois de
 * filtres et de grilles de tailles, les produits en dépendent. Deux appels
 * séparés feraient afficher une grille filtrée sur des catégories pas encore
 * chargées.
 */
router.get("/", async (req, res) => {
  const [categories, produits] = await Promise.all([
    Categorie.find({ actif: true }).sort({ ordre: 1 }),
    Produit.find({ actif: true }).sort({ ordre: 1 }),
  ]);

  // On ne renvoie que les produits dont la catégorie est visible : masquer un
  // rayon doit masquer son contenu, sans avoir à désactiver chaque article.
  const visibles = new Set(categories.map((c) => c._id.toString()));
  res.json({
    categories,
    produits: produits.filter((p) => visibles.has(p.categorie.toString())),
  });
});

/* ------------------------------------------------------------------ *
 * Admin — catégories
 * ------------------------------------------------------------------ */

router.get("/admin/categories", requireAuth, async (req, res) => {
  res.json(await Categorie.find().sort({ ordre: 1 }));
});

router.post("/admin/categories", requireAuth, async (req, res) => {
  const nom = texte(req.body.nom, 40);
  if (!nom) return res.status(400).json({ message: "Le nom est requis." });

  const tailles = normaliserTailles(req.body.tailles);
  const categorie = await Categorie.create({
    nom,
    ...(tailles?.length ? { tailles } : {}),
    ordre: await Categorie.countDocuments(),
  });
  res.status(201).json(categorie);
});

// DÉCLARÉ AVANT `/admin/categories/:id` : sinon Express matche `id === "reorder"`.
router.patch("/admin/categories/reorder", requireAuth, async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ message: "Liste d'ids requise." });

  await Promise.all(ids.map((id, index) => Categorie.findByIdAndUpdate(id, { ordre: index })));
  res.json(await Categorie.find().sort({ ordre: 1 }));
});

router.put("/admin/categories/:id", requireAuth, async (req, res) => {
  const categorie = await Categorie.findById(req.params.id);
  if (!categorie) return res.status(404).json({ message: "Catégorie introuvable." });

  if (req.body.nom !== undefined) {
    const nom = texte(req.body.nom, 40);
    if (!nom) return res.status(400).json({ message: "Le nom est requis." });
    categorie.nom = nom;
  }
  if (req.body.actif !== undefined) categorie.actif = req.body.actif === true;

  const tailles = normaliserTailles(req.body.tailles);
  if (tailles) {
    if (!tailles.length) {
      return res.status(400).json({ message: "Il faut au moins une taille." });
    }
    categorie.tailles = tailles;
  }

  await categorie.save();

  // La grille a pu changer : on réaligne le stock des articles du rayon, sinon
  // ils garderaient des tailles que la catégorie ne propose plus.
  if (tailles) {
    const produits = await Produit.find({ categorie: categorie._id });
    await Promise.all(
      produits.map((p) => {
        p.stock = alignerStock(categorie.tailles, null, p.stock);
        return p.save();
      })
    );
  }

  res.json(categorie);
});

router.delete("/admin/categories/:id", requireAuth, async (req, res) => {
  const nombre = await Produit.countDocuments({ categorie: req.params.id });
  if (nombre) {
    // Supprimer en cascade effacerait des fiches et leurs photos sur un simple
    // clic mal placé. On refuse, et on dit combien d'articles sont concernés.
    return res.status(409).json({
      message: `Ce rayon contient ${nombre} article${nombre > 1 ? "s" : ""}. Déplacez-les ou supprimez-les d'abord.`,
    });
  }

  const categorie = await Categorie.findByIdAndDelete(req.params.id);
  if (!categorie) return res.status(404).json({ message: "Catégorie introuvable." });
  res.status(204).end();
});

/* ------------------------------------------------------------------ *
 * Admin — produits
 * ------------------------------------------------------------------ */

router.get("/admin/produits", requireAuth, async (req, res) => {
  res.json(await Produit.find().sort({ ordre: 1 }));
});

router.post("/admin/produits", requireAuth, async (req, res) => {
  const nom = texte(req.body.nom, 80);
  if (!nom) return res.status(400).json({ message: "Le nom est requis." });
  if (!req.body.categorie) return res.status(400).json({ message: "La catégorie est requise." });

  const produit = new Produit({
    nom,
    categorie: req.body.categorie,
    ordre: await Produit.countDocuments(),
  });
  await appliquerProduit(produit, req.body);
  await produit.save();

  res.status(201).json(produit);
});

// Avant `/admin/produits/:id`, même raison que pour les catégories.
router.patch("/admin/produits/reorder", requireAuth, async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ message: "Liste d'ids requise." });

  await Promise.all(ids.map((id, index) => Produit.findByIdAndUpdate(id, { ordre: index })));
  res.json(await Produit.find().sort({ ordre: 1 }));
});

router.put("/admin/produits/:id", requireAuth, async (req, res) => {
  const produit = await Produit.findById(req.params.id);
  if (!produit) return res.status(404).json({ message: "Article introuvable." });

  await appliquerProduit(produit, req.body);
  if (!produit.nom) return res.status(400).json({ message: "Le nom est requis." });

  await produit.save();
  res.json(produit);
});

router.delete("/admin/produits/:id", requireAuth, async (req, res) => {
  const produit = await Produit.findByIdAndDelete(req.params.id);
  if (!produit) return res.status(404).json({ message: "Article introuvable." });

  // Les photos ne sont référencées que par cette fiche : sans ce nettoyage,
  // elles resteraient sur le disque à jamais.
  await Promise.all(produit.photos.map((url) => deleteStoredFile(url)));
  res.status(204).end();
});

/* ------------------------------------------------------------------ *
 * Admin — photos
 * ------------------------------------------------------------------ */

router.post(
  "/admin/produits/:id/photos",
  requireAuth,
  upload.array("photos", PHOTOS_MAX),
  async (req, res) => {
    const produit = await Produit.findById(req.params.id);
    if (!produit) return res.status(404).json({ message: "Article introuvable." });
    if (!req.files?.length) return res.status(400).json({ message: "Aucune image envoyée." });

    const place = PHOTOS_MAX - produit.photos.length;
    if (place <= 0) {
      return res.status(409).json({ message: `Maximum ${PHOTOS_MAX} photos par article.` });
    }

    // 1400 px : assez pour la fiche sur un écran dense, sans faire payer au
    // visiteur mobile une image d'appareil photo.
    const urls = [];
    for (const fichier of req.files.slice(0, place)) {
      urls.push(await processAndStore(fichier.buffer, "produit", 1400));
    }

    produit.photos.push(...urls);
    await produit.save();
    res.status(201).json(produit);
  }
);

router.patch("/admin/produits/:id/photos", requireAuth, async (req, res) => {
  const produit = await Produit.findById(req.params.id);
  if (!produit) return res.status(404).json({ message: "Article introuvable." });

  const { urls } = req.body;
  if (!Array.isArray(urls)) return res.status(400).json({ message: "Liste d'urls requise." });

  // On ne garde que des photos qui appartiennent DÉJÀ à cette fiche : sans ce
  // filtre, un corps forgé y accrocherait le fichier d'un autre article.
  const connues = new Set(produit.photos);
  const ordonnees = urls.filter((u) => connues.has(u));
  if (ordonnees.length !== produit.photos.length) {
    return res.status(400).json({ message: "La liste ne correspond pas aux photos de l'article." });
  }

  produit.photos = ordonnees;
  await produit.save();
  res.json(produit);
});

router.delete("/admin/produits/:id/photos", requireAuth, async (req, res) => {
  const produit = await Produit.findById(req.params.id);
  if (!produit) return res.status(404).json({ message: "Article introuvable." });

  const { url } = req.body;
  if (!produit.photos.includes(url)) {
    return res.status(404).json({ message: "Photo introuvable sur cet article." });
  }

  produit.photos = produit.photos.filter((u) => u !== url);
  await produit.save();
  await deleteStoredFile(url);

  res.json(produit);
});

router.use(erreursUpload);

export default router;

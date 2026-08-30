import { Router } from "express";
import Cours from "../models/Cours.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const TYPES = ["gi", "nogi", "kids", "competition", "openmat"];

/**
 * Champs que l'admin peut écrire, et rien d'autre. Whitelist explicite plutôt
 * qu'un `Object.assign(doc, req.body)` : sans elle, un corps forgé pourrait
 * écrire `_id` ou `createdAt`.
 */
function appliquer(cours, body) {
  if (body.jour !== undefined) cours.jour = Number(body.jour);
  if (body.heureDebut !== undefined) cours.heureDebut = String(body.heureDebut).trim();
  if (body.duree !== undefined) cours.duree = Number(body.duree);
  if (body.type !== undefined) cours.type = String(body.type);
  if (body.libelle !== undefined) cours.libelle = String(body.libelle).trim();
  if (body.niveau !== undefined) cours.niveau = String(body.niveau).trim();
  if (body.actif !== undefined) cours.actif = body.actif === true || body.actif === "true";

  // Chaîne vide = « aucun coach », qu'il faut pouvoir remettre : on distingue
  // donc explicitement l'absence de champ du champ vidé.
  if (body.coach !== undefined) cours.coach = body.coach || null;
}

/** Renvoie un message d'erreur, ou `null` si le créneau est cohérent. */
function valider(cours) {
  if (!Number.isInteger(cours.jour) || cours.jour < 1 || cours.jour > 7) {
    return "Jour invalide (1 = lundi … 7 = dimanche).";
  }
  if (!/^\d{2}:\d{2}$/.test(cours.heureDebut)) return "Heure attendue au format HH:mm.";
  const [h, m] = cours.heureDebut.split(":").map(Number);
  if (h > 23 || m > 59) return "Heure invalide.";
  if (!Number.isFinite(cours.duree) || cours.duree < 15 || cours.duree > 240) {
    return "Durée attendue entre 15 et 240 minutes.";
  }
  if (!TYPES.includes(cours.type)) return "Type de cours invalide.";
  if (!cours.libelle) return "Le libellé est requis.";
  return null;
}

/* --- Public --- */
router.get("/", async (req, res) => {
  const cours = await Cours.find({ actif: true })
    .sort({ jour: 1, heureDebut: 1 })
    .populate("coach", "nom ceinture degres");
  res.json(cours);
});

/* --- Admin --- */
router.get("/admin", requireAuth, async (req, res) => {
  const cours = await Cours.find()
    .sort({ jour: 1, heureDebut: 1 })
    .populate("coach", "nom ceinture degres");
  res.json(cours);
});

router.post("/admin", requireAuth, async (req, res) => {
  const cours = new Cours({ actif: true });
  appliquer(cours, req.body);

  const probleme = valider(cours);
  if (probleme) return res.status(400).json({ message: probleme });

  await cours.save();
  await cours.populate("coach", "nom ceinture degres");
  res.status(201).json(cours);
});

router.put("/admin/:id", requireAuth, async (req, res) => {
  const cours = await Cours.findById(req.params.id);
  if (!cours) return res.status(404).json({ message: "Créneau introuvable." });

  appliquer(cours, req.body);
  const probleme = valider(cours);
  if (probleme) return res.status(400).json({ message: probleme });

  await cours.save();
  await cours.populate("coach", "nom ceinture degres");
  res.json(cours);
});

router.delete("/admin/:id", requireAuth, async (req, res) => {
  const cours = await Cours.findByIdAndDelete(req.params.id);
  if (!cours) return res.status(404).json({ message: "Créneau introuvable." });
  res.status(204).end();
});

export default router;

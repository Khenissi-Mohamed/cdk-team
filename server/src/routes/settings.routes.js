import { Router } from "express";
import Setting from "../models/Setting.js";
import { requireAuth } from "../middleware/auth.js";
import {
  upload,
  uploadVideo,
  processAndStore,
  storeLogo,
  deleteStoredFile,
  limiteUpload,
  erreursUpload,
  VIDEO_MAX_MO,
} from "../middleware/upload.js";

const router = Router();

/**
 * Champs autorisés, section par section.
 *
 * Whitelist explicite : un `Object.assign(settings, req.body)` laisserait
 * écrire `_id` ou `createdAt`, et surtout `logo` — qui ne doit changer que par
 * la route d'upload, jamais par un PUT de texte.
 */
const CHAMPS_RACINE = [
  "nomClub",
  "ville",
  "telephone",
  "email",
  "whatsapp",
  "adresse",
  "raisonSociale",
  "formeJuridique",
  "siret",
  "numeroAgrement",
  "directeurPublication",
  "hebergeur",
];

const CHAMPS_SECTION = {
  hero: ["surtitre", "titre", "titreAccent", "texte", "ctaPrincipal", "ctaSecondaire"],
  club: ["surtitre", "titre", "titreAccent", "texte"],
  planning: ["surtitre", "titre", "badge"],
  coachs: ["surtitre", "titre"],
  tarifs: ["surtitre", "titre", "note"],
  documents: ["surtitre", "titre", "texte"],
  appel: ["titre", "texte", "cta"],
};

// Un texte de section peut être long (le manifeste du club fait deux
// paragraphes) mais pas illimité.
const MAX_TEXTE = 2000;

async function getOrCreateSettings() {
  let settings = await Setting.findOne();
  if (!settings) settings = await Setting.create({});
  return settings;
}

/** Les chiffres du bandeau « le club en bref ». */
function normaliserChiffres(entrees) {
  return entrees
    .slice(0, 4)
    .map((c) => ({
      valeur: Number.isFinite(Number(c?.valeur)) ? Number(c.valeur) : 0,
      // Pas de `trim()` sur le suffixe : l'espace de tête de « 200 t » est
      // significatif, c'est lui qui sépare le chiffre animé de son unité.
      suffixe: String(c?.suffixe ?? "").replace(/\s+$/, "").slice(0, 12),
      libelle: String(c?.libelle ?? "").trim().slice(0, 60),
    }))
    .filter((c) => c.libelle);
}

/**
 * Les drapeaux de la vidéo du club.
 *
 * Traités À PART de la boucle `CHAMPS_SECTION`, qui fait `String(...).trim()`
 * sur tout ce qu'elle touche : un booléen `false` y deviendrait la chaîne
 * "false", VRAIE en JavaScript, et l'autoplay ne se couperait jamais.
 *
 * `fichier` et `poster` sont volontairement absents : ils n'appartiennent
 * qu'aux routes multipart, comme le logo.
 */
const MODES_VIDEO = ["arriere-plan", "bloc", "bandeau"];

function appliquerVideo(video, entree) {
  if (!entree || typeof entree !== "object") return;

  if (MODES_VIDEO.includes(entree.mode)) video.mode = entree.mode;

  ["autoplay", "son", "boucle"].forEach((champ) => {
    if (entree[champ] !== undefined) video[champ] = entree[champ] === true;
  });
}

/* --- Public --- */
router.get("/", async (req, res) => {
  res.json(await getOrCreateSettings());
});

/* --- Admin --- */
router.put("/admin", requireAuth, async (req, res) => {
  const settings = await getOrCreateSettings();

  // Garde `!== undefined` champ par champ : une chaîne vide est une valeur
  // légitime (le gérant efface son WhatsApp), un champ absent ne doit pas
  // écraser l'existant quand le formulaire n'en envoie qu'une partie.
  CHAMPS_RACINE.forEach((champ) => {
    if (req.body[champ] !== undefined) settings[champ] = String(req.body[champ]).trim();
  });

  Object.entries(CHAMPS_SECTION).forEach(([section, champs]) => {
    const entree = req.body[section];
    if (!entree || typeof entree !== "object") return;
    champs.forEach((champ) => {
      if (entree[champ] !== undefined) {
        settings[section][champ] = String(entree[champ]).trim().slice(0, MAX_TEXTE);
      }
    });
  });

  if (req.body.club && Array.isArray(req.body.club.chiffres)) {
    settings.club.chiffres = normaliserChiffres(req.body.club.chiffres);
  }

  if (req.body.club) appliquerVideo(settings.club.video, req.body.club.video);

  // Même raison que la vidéo : l'énum ne doit pas passer par la moulinette
  // générique, qui accepterait n'importe quelle chaîne et ferait échouer le
  // `save()` sur une erreur de validation Mongoose peu parlante.
  if (["photo", "avatar"].includes(req.body.coachs?.affichage)) {
    settings.coachs.affichage = req.body.coachs.affichage;
  }

  if (Array.isArray(req.body.marquee)) {
    settings.marquee = req.body.marquee
      .map((item) => String(item ?? "").trim().slice(0, 60))
      .filter(Boolean)
      .slice(0, 12);
  }

  await settings.save();
  res.json(settings);
});

/* --- Logo ---
 *
 * Route multipart séparée du PUT de texte : mélanger les deux ferait arriver
 * TOUS les champs en `String`, et la structure imbriquée des sections ne
 * survivrait pas à un encodage multipart.
 */
router.put("/admin/logo", requireAuth, upload.single("logo"), async (req, res) => {
  const settings = await getOrCreateSettings();
  if (!req.file) return res.status(400).json({ message: "Aucune image envoyée." });

  await deleteStoredFile(settings.logo);
  settings.logo = await storeLogo(req.file);
  await settings.save();

  res.json(settings);
});

router.delete("/admin/logo", requireAuth, async (req, res) => {
  const settings = await getOrCreateSettings();
  await deleteStoredFile(settings.logo);
  settings.logo = null;
  await settings.save();
  res.json(settings);
});

/* --- Image de fond du Hero --- */
router.put("/admin/hero-image", requireAuth, upload.single("image"), async (req, res) => {
  const settings = await getOrCreateSettings();
  if (!req.file) return res.status(400).json({ message: "Aucune image envoyée." });

  const nouvelleImage = await processAndStore(req.file.buffer, "hero", 2200);
  await deleteStoredFile(settings.hero.imageFond);
  settings.hero.imageFond = nouvelleImage;
  await settings.save();

  res.json(settings);
});

router.delete("/admin/hero-image", requireAuth, async (req, res) => {
  const settings = await getOrCreateSettings();
  await deleteStoredFile(settings.hero.imageFond);
  settings.hero.imageFond = null;
  await settings.save();
  res.json(settings);
});

/* --- Vidéo de la section « le club » ---
 *
 * Deux routes plutôt qu'une : le poster est une image, qui passe par sharp,
 * la vidéo est un flux qu'on écrit tel quel. Les mélanger imposerait de
 * deviner le rôle de chaque fichier d'après son type.
 *
 * `limiteUpload` précède multer pour que le 413 cite la limite des vidéos et
 * non celle des PDF.
 */
router.put(
  "/admin/club-video",
  requireAuth,
  limiteUpload(VIDEO_MAX_MO),
  uploadVideo.single("video"),
  async (req, res) => {
    const settings = await getOrCreateSettings();
    if (!req.file) return res.status(400).json({ message: "Aucune vidéo envoyée." });

    await deleteStoredFile(settings.club.video.fichier);
    settings.club.video.fichier = `/uploads/video/${req.file.filename}`;
    await settings.save();

    res.json(settings);
  }
);

router.delete("/admin/club-video", requireAuth, async (req, res) => {
  const settings = await getOrCreateSettings();
  await deleteStoredFile(settings.club.video.fichier);
  settings.club.video.fichier = null;
  await settings.save();
  res.json(settings);
});

router.put("/admin/club-poster", requireAuth, upload.single("image"), async (req, res) => {
  const settings = await getOrCreateSettings();
  if (!req.file) return res.status(400).json({ message: "Aucune image envoyée." });

  const nouvelleImage = await processAndStore(req.file.buffer, "video", 1600);
  await deleteStoredFile(settings.club.video.poster);
  settings.club.video.poster = nouvelleImage;
  await settings.save();

  res.json(settings);
});

router.delete("/admin/club-poster", requireAuth, async (req, res) => {
  const settings = await getOrCreateSettings();
  await deleteStoredFile(settings.club.video.poster);
  settings.club.video.poster = null;
  await settings.save();
  res.json(settings);
});

router.use(erreursUpload);

export default router;

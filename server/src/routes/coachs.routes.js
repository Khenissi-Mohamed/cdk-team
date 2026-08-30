import { Router } from "express";
import Coach from "../models/Coach.js";
import Cours from "../models/Cours.js";
import { requireAuth } from "../middleware/auth.js";
import { upload, processAndStore, deleteStoredFile, erreursUpload } from "../middleware/upload.js";

const router = Router();

const CEINTURES = ["blanche", "bleue", "violette", "marron", "noire"];

const CHAMPS_MODIFIABLES = ["nom", "role"];

function appliquer(coach, body) {
  CHAMPS_MODIFIABLES.forEach((champ) => {
    if (body[champ] !== undefined) coach[champ] = String(body[champ]).trim();
  });
  if (body.ceinture !== undefined && CEINTURES.includes(body.ceinture)) {
    coach.ceinture = body.ceinture;
  }
  if (body.degres !== undefined) {
    const n = Number(body.degres);
    coach.degres = Number.isFinite(n) ? Math.min(6, Math.max(0, Math.round(n))) : 0;
  }
  if (body.actif !== undefined) coach.actif = body.actif === true || body.actif === "true";
}

/* --- Public --- */
router.get("/", async (req, res) => {
  const coachs = await Coach.find({ actif: true }).sort({ ordre: 1 });
  res.json(coachs);
});

/* --- Admin ---
 *
 * Le texte passe en JSON, la photo par une route multipart dédiée. En
 * multipart TOUS les champs arrivent en `String` : `actif` y vaudrait la
 * chaîne "false", vraie en JavaScript, et la bascule ne désactiverait rien.
 */
router.get("/admin", requireAuth, async (req, res) => {
  const coachs = await Coach.find().sort({ ordre: 1 });
  res.json(coachs);
});

router.post("/admin", requireAuth, async (req, res) => {
  const nom = String(req.body.nom ?? "").trim();
  if (!nom) return res.status(400).json({ message: "Le nom est requis." });

  const coach = new Coach({ ordre: await Coach.countDocuments(), actif: true });
  appliquer(coach, req.body);
  await coach.save();
  res.status(201).json(coach);
});

router.put("/admin/:id", requireAuth, async (req, res) => {
  const coach = await Coach.findById(req.params.id);
  if (!coach) return res.status(404).json({ message: "Coach introuvable." });

  appliquer(coach, req.body);
  if (!coach.nom) return res.status(400).json({ message: "Le nom est requis." });

  await coach.save();
  res.json(coach);
});

// DÉCLARÉ AVANT `/admin/:id` : sinon Express matche `id === "reorder"`.
router.patch("/admin/reorder", requireAuth, async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ message: "Liste d'ids requise." });

  await Promise.all(ids.map((id, index) => Coach.findByIdAndUpdate(id, { ordre: index })));
  res.json(await Coach.find().sort({ ordre: 1 }));
});

router.put("/admin/:id/photo", requireAuth, upload.single("photo"), async (req, res) => {
  const coach = await Coach.findById(req.params.id);
  if (!coach) return res.status(404).json({ message: "Coach introuvable." });
  if (!req.file) return res.status(400).json({ message: "Aucune image envoyée." });

  await deleteStoredFile(coach.photo);
  coach.photo = await processAndStore(req.file.buffer, "coach", 900);
  await coach.save();
  res.json(coach);
});

router.delete("/admin/:id/photo", requireAuth, async (req, res) => {
  const coach = await Coach.findById(req.params.id);
  if (!coach) return res.status(404).json({ message: "Coach introuvable." });

  await deleteStoredFile(coach.photo);
  coach.photo = null;
  await coach.save();
  res.json(coach);
});

router.delete("/admin/:id", requireAuth, async (req, res) => {
  const coach = await Coach.findByIdAndDelete(req.params.id);
  if (!coach) return res.status(404).json({ message: "Coach introuvable." });

  await deleteStoredFile(coach.photo);
  // Les créneaux qui le référençaient ne doivent pas garder un identifiant
  // mort : le planning afficherait un coach fantôme.
  await Cours.updateMany({ coach: coach._id }, { coach: null });

  res.status(204).end();
});

router.use(erreursUpload);

export default router;

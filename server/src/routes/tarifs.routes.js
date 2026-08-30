import { Router } from "express";
import Tarif from "../models/Tarif.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const CHAMPS_TEXTE = ["libelle", "mention"];

function appliquer(tarif, body) {
  CHAMPS_TEXTE.forEach((champ) => {
    if (body[champ] !== undefined) tarif[champ] = String(body[champ]).trim();
  });
  if (body.montant !== undefined) {
    const n = Number(body.montant);
    tarif.montant = Number.isFinite(n) && n >= 0 ? n : 0;
  }
  if (body.misEnAvant !== undefined) {
    tarif.misEnAvant = body.misEnAvant === true || body.misEnAvant === "true";
  }
  if (body.actif !== undefined) tarif.actif = body.actif === true || body.actif === "true";
}

/* --- Public --- */
router.get("/", async (req, res) => {
  res.json(await Tarif.find({ actif: true }).sort({ ordre: 1 }));
});

/* --- Admin --- */
router.get("/admin", requireAuth, async (req, res) => {
  res.json(await Tarif.find().sort({ ordre: 1 }));
});

router.post("/admin", requireAuth, async (req, res) => {
  const libelle = String(req.body.libelle ?? "").trim();
  if (!libelle) return res.status(400).json({ message: "Le libellé est requis." });

  const tarif = new Tarif({ ordre: await Tarif.countDocuments(), actif: true });
  appliquer(tarif, req.body);
  await tarif.save();
  res.status(201).json(tarif);
});

router.put("/admin/:id", requireAuth, async (req, res) => {
  const tarif = await Tarif.findById(req.params.id);
  if (!tarif) return res.status(404).json({ message: "Tarif introuvable." });

  appliquer(tarif, req.body);
  if (!tarif.libelle) return res.status(400).json({ message: "Le libellé est requis." });

  await tarif.save();
  res.json(tarif);
});

// DÉCLARÉ AVANT `/admin/:id`.
router.patch("/admin/reorder", requireAuth, async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ message: "Liste d'ids requise." });

  await Promise.all(ids.map((id, index) => Tarif.findByIdAndUpdate(id, { ordre: index })));
  res.json(await Tarif.find().sort({ ordre: 1 }));
});

router.delete("/admin/:id", requireAuth, async (req, res) => {
  const tarif = await Tarif.findByIdAndDelete(req.params.id);
  if (!tarif) return res.status(404).json({ message: "Tarif introuvable." });
  res.status(204).end();
});

export default router;

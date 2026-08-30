import { Router } from "express";
import Event from "../models/Event.js";
import { requireAuth } from "../middleware/auth.js";
import { limiteurEvents } from "../middleware/rateLimit.js";

const router = Router();

const CANAUX = ["telephone", "email", "whatsapp", "planning", "document"];

// --- Public : enregistre un clic vers un canal de contact ou un téléchargement ---
router.post("/", limiteurEvents, async (req, res) => {
  const { canal, page } = req.body;
  if (!CANAUX.includes(canal)) {
    return res.status(400).json({ message: "Canal invalide." });
  }
  await Event.create({ canal, page: String(page || "/").slice(0, 200) });
  res.status(204).end();
});

// --- Admin : synthèse des 30 derniers jours ---
router.get("/admin/summary", requireAuth, async (req, res) => {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const counts = await Event.aggregate([
    { $match: { date: { $gte: since } } },
    { $group: { _id: "$canal", total: { $sum: 1 } } },
  ]);

  const summary = Object.fromEntries(CANAUX.map((c) => [c, 0]));
  counts.forEach(({ _id, total }) => {
    if (_id in summary) summary[_id] = total;
  });

  res.json({ depuis: since, parCanal: summary });
});

export default router;

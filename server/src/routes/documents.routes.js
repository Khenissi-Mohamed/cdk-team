import { Router } from "express";
import fs from "node:fs/promises";
import Document from "../models/Document.js";
import { requireAuth } from "../middleware/auth.js";
import { uploadPdf, deleteStoredFile, erreursUpload } from "../middleware/upload.js";

const router = Router();

/* --- Public --- */
router.get("/", async (req, res) => {
  res.json(await Document.find({ actif: true }).sort({ ordre: 1 }));
});

/* --- Admin --- */
router.get("/admin", requireAuth, async (req, res) => {
  res.json(await Document.find().sort({ ordre: 1 }));
});

/**
 * Téléversement d'un PDF. Le titre voyage en champ multipart : contrairement à
 * l'upload d'image du coach (qui met à jour une fiche existante), ici le
 * fichier ET sa fiche naissent dans la même requête, il n'y a rien à créer au
 * préalable.
 */
router.post("/admin", requireAuth, uploadPdf.single("fichier"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Aucun PDF envoyé." });

  const titre = String(req.body.titre ?? "").trim() || req.file.originalname.replace(/\.pdf$/i, "");
  const doc = await Document.create({
    titre: titre.slice(0, 80),
    description: String(req.body.description ?? "").trim().slice(0, 120),
    url: `/uploads/documents/${req.file.filename}`,
    taille: req.file.size,
    ordre: await Document.countDocuments(),
    actif: true,
  });

  res.status(201).json(doc);
});

/** Remplace le fichier d'une fiche existante, en supprimant l'ancien. */
router.put("/admin/:id/fichier", requireAuth, uploadPdf.single("fichier"), async (req, res) => {
  const doc = await Document.findById(req.params.id);
  if (!doc) {
    // La fiche a disparu entre-temps : le PDF déjà écrit sur le disque
    // deviendrait orphelin, on le retire tout de suite.
    if (req.file) await fs.rm(req.file.path, { force: true });
    return res.status(404).json({ message: "Document introuvable." });
  }
  if (!req.file) return res.status(400).json({ message: "Aucun PDF envoyé." });

  await deleteStoredFile(doc.url);
  doc.url = `/uploads/documents/${req.file.filename}`;
  doc.taille = req.file.size;
  await doc.save();

  res.json(doc);
});

router.put("/admin/:id", requireAuth, async (req, res) => {
  const doc = await Document.findById(req.params.id);
  if (!doc) return res.status(404).json({ message: "Document introuvable." });

  if (req.body.titre !== undefined) doc.titre = String(req.body.titre).trim().slice(0, 80);
  if (req.body.description !== undefined) {
    doc.description = String(req.body.description).trim().slice(0, 120);
  }
  if (req.body.actif !== undefined) doc.actif = req.body.actif === true || req.body.actif === "true";

  if (!doc.titre) return res.status(400).json({ message: "Le titre est requis." });
  await doc.save();
  res.json(doc);
});

// DÉCLARÉ AVANT `/admin/:id`.
router.patch("/admin/reorder", requireAuth, async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ message: "Liste d'ids requise." });

  await Promise.all(ids.map((id, index) => Document.findByIdAndUpdate(id, { ordre: index })));
  res.json(await Document.find().sort({ ordre: 1 }));
});

router.delete("/admin/:id", requireAuth, async (req, res) => {
  const doc = await Document.findByIdAndDelete(req.params.id);
  if (!doc) return res.status(404).json({ message: "Document introuvable." });
  await deleteStoredFile(doc.url);
  res.status(204).end();
});

router.use(erreursUpload);

export default router;

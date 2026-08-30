import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import Admin from "../models/Admin.js";
import { sendResetPasswordEmail } from "../utils/mailer.js";
import { requireAuth } from "../middleware/auth.js";
import { limiteurLogin } from "../middleware/rateLimit.js";

const router = Router();

router.post("/login", limiteurLogin, async (req, res) => {
  const { identifiant, motDePasse } = req.body;
  if (!identifiant || !motDePasse) {
    return res.status(400).json({ message: "Identifiant et mot de passe requis." });
  }

  const admin = await Admin.findOne({ identifiant: identifiant.toLowerCase().trim() });
  if (!admin) {
    return res.status(401).json({ message: "Identifiants incorrects." });
  }

  const valid = await bcrypt.compare(motDePasse, admin.motDePasseHash);
  if (!valid) {
    return res.status(401).json({ message: "Identifiants incorrects." });
  }

  const token = jwt.sign({ sub: admin._id.toString() }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "8h",
  });

  res.json({ token, identifiant: admin.identifiant });
});

router.get("/me", requireAuth, async (req, res) => {
  const admin = await Admin.findById(req.admin.sub).select("identifiant");
  if (!admin) return res.status(404).json({ message: "Compte introuvable." });
  res.json({ identifiant: admin.identifiant });
});

router.post("/forgot-password", limiteurLogin, async (req, res) => {
  const { identifiant } = req.body;
  const admin = identifiant
    ? await Admin.findOne({ identifiant: identifiant.toLowerCase().trim() })
    : null;

  // Toujours répondre pareil, qu'un compte existe ou non, pour ne pas divulguer d'information.
  if (!admin) return res.json({ message: "Si ce compte existe, un email a été envoyé." });

  const rawToken = crypto.randomBytes(32).toString("hex");
  admin.resetTokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  admin.resetTokenExpire = new Date(Date.now() + 60 * 60 * 1000); // 1h
  await admin.save();

  const resetUrl = `${process.env.PUBLIC_APP_URL}/admin/reinitialiser-mot-de-passe?token=${rawToken}`;
  await sendResetPasswordEmail(admin.identifiant, resetUrl);

  res.json({ message: "Si ce compte existe, un email a été envoyé." });
});

router.post("/reset-password", async (req, res) => {
  const { token, motDePasse } = req.body;
  if (!token || !motDePasse || motDePasse.length < 8) {
    return res.status(400).json({ message: "Lien invalide ou mot de passe trop court (8 caractères min)." });
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const admin = await Admin.findOne({
    resetTokenHash: tokenHash,
    resetTokenExpire: { $gt: new Date() },
  });

  if (!admin) {
    return res.status(400).json({ message: "Ce lien a expiré ou n'est plus valide." });
  }

  admin.motDePasseHash = await bcrypt.hash(motDePasse, 10);
  admin.resetTokenHash = null;
  admin.resetTokenExpire = null;
  await admin.save();

  res.json({ message: "Mot de passe mis à jour." });
});

export default router;

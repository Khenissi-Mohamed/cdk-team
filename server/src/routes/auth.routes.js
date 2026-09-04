import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import Admin from "../models/Admin.js";
import { sendResetPasswordEmail, sendIdentifiantChangeEmail } from "../utils/mailer.js";
import { requireAuth } from "../middleware/auth.js";
import { limiteurLogin, limiteurMotDePasse } from "../middleware/rateLimit.js";

const router = Router();

// Longueur minimale d'un mot de passe. Déclarée une fois : la règle du
// changement depuis l'admin et celle de la réinitialisation par email doivent
// bouger ensemble, sinon on finit avec deux exigences différentes selon le
// chemin emprunté.
const MOT_DE_PASSE_MIN = 8;

// L'identifiant EST l'adresse qui reçoit les liens de réinitialisation : elle
// doit donc être une adresse joignable, pas un pseudonyme. Contrôle volontaire-
// ment permissif — le rôle de cette expression est d'attraper la faute de
// frappe, pas de rejouer la RFC 5322.
const FORMAT_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

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
  if (!token || !motDePasse || motDePasse.length < MOT_DE_PASSE_MIN) {
    return res.status(400).json({
      message: `Lien invalide ou mot de passe trop court (${MOT_DE_PASSE_MIN} caractères min).`,
    });
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

/**
 * Changement de mot de passe par un administrateur déjà connecté.
 *
 * Le mot de passe ACTUEL est exigé en plus du jeton : un jeton seul ne suffit
 * pas. Sans cette vérification, une session laissée ouverte sur un poste
 * partagé permettrait à n'importe qui de changer le mot de passe et d'exclure
 * le gérant de son propre site.
 *
 * À savoir : les jetons déjà émis restent valides jusqu'à leur expiration
 * (`JWT_EXPIRES_IN`, 8 h par défaut). Changer le mot de passe ferme la porte
 * aux prochaines connexions, pas aux sessions en cours.
 */
router.put("/password", limiteurMotDePasse, requireAuth, async (req, res) => {
  const { motDePasseActuel, motDePasse } = req.body;

  if (!motDePasseActuel || !motDePasse) {
    return res.status(400).json({ message: "Mot de passe actuel et nouveau mot de passe requis." });
  }

  if (String(motDePasse).length < MOT_DE_PASSE_MIN) {
    return res.status(400).json({
      message: `Le nouveau mot de passe doit faire au moins ${MOT_DE_PASSE_MIN} caractères.`,
    });
  }

  if (motDePasseActuel === motDePasse) {
    return res.status(400).json({ message: "Le nouveau mot de passe doit être différent de l'ancien." });
  }

  const admin = await Admin.findById(req.admin.sub);
  if (!admin) return res.status(404).json({ message: "Compte introuvable." });

  const valide = await bcrypt.compare(motDePasseActuel, admin.motDePasseHash);
  if (!valide) {
    return res.status(400).json({ message: "Le mot de passe actuel est incorrect." });
  }

  admin.motDePasseHash = await bcrypt.hash(motDePasse, 10);
  // Un lien de réinitialisation encore en circulation n'a plus lieu d'être :
  // le gérant vient de prouver qu'il a la main sur le compte, et ce lien
  // resterait sinon utilisable pendant une heure pour repasser derrière lui.
  admin.resetTokenHash = null;
  admin.resetTokenExpire = null;
  await admin.save();

  res.json({ message: "Mot de passe mis à jour." });
});

/**
 * Changement de l'identifiant de connexion.
 *
 * Le mot de passe est exigé, comme pour le changement de mot de passe — et ici
 * l'enjeu est plus grand encore : cette adresse est celle qui reçoit les liens
 * de réinitialisation. Sans cette vérification, une session laissée ouverte
 * permettrait d'y mettre son adresse, de demander un lien « mot de passe
 * oublié » et de s'approprier le compte. L'ancienne adresse en est prévenue,
 * pour que le vrai propriétaire l'apprenne.
 */
router.put("/identifiant", limiteurMotDePasse, requireAuth, async (req, res) => {
  const nouvelIdentifiant = String(req.body.identifiant ?? "").toLowerCase().trim();
  const { motDePasse } = req.body;

  if (!nouvelIdentifiant || !motDePasse) {
    return res.status(400).json({ message: "Nouvel identifiant et mot de passe requis." });
  }

  if (!FORMAT_EMAIL.test(nouvelIdentifiant)) {
    return res.status(400).json({ message: "L'identifiant doit être une adresse e-mail valide." });
  }

  const admin = await Admin.findById(req.admin.sub);
  if (!admin) return res.status(404).json({ message: "Compte introuvable." });

  const valide = await bcrypt.compare(motDePasse, admin.motDePasseHash);
  if (!valide) {
    return res.status(400).json({ message: "Le mot de passe est incorrect." });
  }

  const ancienIdentifiant = admin.identifiant;
  if (ancienIdentifiant === nouvelIdentifiant) {
    return res.status(400).json({ message: "C'est déjà votre identifiant actuel." });
  }

  admin.identifiant = nouvelIdentifiant;
  try {
    await admin.save();
  } catch (err) {
    // 11000 : l'index unique du modèle. Sans ce cas, une adresse déjà prise
    // ressortirait en 500 « Erreur serveur », qui n'aide personne.
    if (err.code === 11000) {
      return res.status(409).json({ message: "Cet identifiant est déjà utilisé." });
    }
    throw err;
  }

  // Volontairement pas attendu par la réponse : un SMTP lent ou en panne ne
  // doit pas faire croire que le changement a échoué. Il est déjà enregistré.
  sendIdentifiantChangeEmail(ancienIdentifiant, nouvelIdentifiant);

  res.json({ identifiant: admin.identifiant });
});

export default router;

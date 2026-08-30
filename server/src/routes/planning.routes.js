import { Router } from "express";
import path from "node:path";
import fs from "node:fs/promises";
import PDFDocument from "pdfkit";
import sharp from "sharp";
import Cours from "../models/Cours.js";
import Setting from "../models/Setting.js";

const router = Router();

const JOURS = ["LUNDI", "MARDI", "MERCREDI", "JEUDI", "VENDREDI", "SAMEDI", "DIMANCHE"];

// Mêmes couleurs que le site : le PDF affiché dans la salle et la page doivent
// se reconnaître au premier coup d'oeil.
const ENCRE = "#0a0a0b";
const ACCENT = "#c1121f";
const CASE_VIDE = "#f1f1f2";
const GRIS = "#7d7f85";
const CLAIR = "#f5f3f0";

const LIBELLES_TYPE = {
  gi: "Gi",
  nogi: "No-gi",
  lutte: "Lutte",
  kids: "Kids",
  competition: "Compétition",
  openmat: "Open mat",
};

/** « 07:00 » → 420. Sert au tri des lignes et au partage matin / soir. */
const enMinutes = (heure) => {
  const [h, m] = String(heure).split(":").map(Number);
  return h * 60 + m;
};

/**
 * Le logo est stocké en WebP ou en SVG, deux formats que pdfkit ne sait PAS
 * lire — il n'accepte que PNG et JPEG. On le rasterise donc à la volée avec
 * sharp. Sans cette conversion, `doc.image()` lève et c'est tout le PDF qui
 * échoue, pour une simple vignette.
 */
async function logoEnPng(url) {
  if (!url || !url.startsWith("/uploads/")) return null;
  try {
    const chemin = path.join(path.resolve("uploads"), url.replace("/uploads/", ""));
    const donnees = await fs.readFile(chemin);
    return await sharp(donnees).resize({ height: 120, withoutEnlargement: true }).png().toBuffer();
  } catch (err) {
    // Un logo illisible ne doit pas priver le club de son planning.
    console.error("[planning] logo non intégré au PDF :", err.message);
    return null;
  }
}

/**
 * GET /api/planning/pdf
 *
 * Le planning n'est pas un fichier téléversé mais un document ENGENDRÉ à
 * chaque appel depuis les créneaux : le gérant déplace un cours dans l'admin,
 * le PDF affiché dans la salle suit à la prochaine impression. Un PDF
 * téléversé aurait dérivé du site dès la première modification.
 */
router.get("/pdf", async (req, res) => {
  const [cours, reglages] = await Promise.all([
    Cours.find({ actif: true }).sort({ jour: 1, heureDebut: 1 }).populate("coach", "nom"),
    Setting.findOne(),
  ]);

  const nomClub = reglages?.nomClub || "CDK-Team";
  const logo = await logoEnPng(reglages?.logo);

  // Une ligne par heure de début distincte : la grille épouse le planning
  // réel au lieu d'imposer des rangées vides de 7h à 22h.
  const heures = [...new Set(cours.map((c) => c.heureDebut))].sort(
    (a, b) => enMinutes(a) - enMinutes(b)
  );

  // `cases[heure][jour]` — plusieurs cours le même jour à la même heure sont
  // possibles (deux tapis) : on les empile dans la même case.
  const cases = new Map();
  cours.forEach((c) => {
    const cle = `${c.heureDebut}|${c.jour}`;
    if (!cases.has(cle)) cases.set(cle, []);
    cases.get(cle).push(c);
  });

  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 28 });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", 'attachment; filename="planning-cdk-team.pdf"');
  doc.pipe(res);

  const gauche = doc.page.margins.left;
  const largeur = doc.page.width - gauche - doc.page.margins.right;

  /* ---------- En-tête ---------- */
  let y = doc.page.margins.top;

  if (logo) {
    try {
      doc.image(logo, gauche, y, { height: 34 });
    } catch {
      // Format inattendu malgré la conversion : on continue sans logo.
    }
  }

  doc
    .font("Helvetica-Bold")
    .fontSize(22)
    .fillColor(ENCRE)
    .text(`PLANNING DES COURS — ${nomClub.toUpperCase()}`, gauche + (logo ? 46 : 0), y + 8, {
      width: largeur - (logo ? 46 : 0) - 150,
    });

  const badge = reglages?.planning?.badge;
  if (badge) {
    const largeurBadge = 140;
    doc.rect(gauche + largeur - largeurBadge, y, largeurBadge, 30).fill(ACCENT);
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor("#ffffff")
      .text(badge.toUpperCase(), gauche + largeur - largeurBadge, y + 11, {
        width: largeurBadge,
        align: "center",
      });
  }

  y += 48;

  /* ---------- Grille ---------- */
  const colHeure = 46;
  const ecart = 3;
  const largeurJour = (largeur - colHeure - ecart * 7) / 7;
  // La hauteur des lignes s'adapte au nombre de créneaux pour que la grille
  // remplisse la page sans jamais déborder sur une seconde feuille.
  const dispo = doc.page.height - doc.page.margins.bottom - y - 42;
  const hauteurLigne = Math.max(26, Math.min(52, (dispo - 24) / (heures.length + 1)));

  const xJour = (index) => gauche + colHeure + ecart + index * (largeurJour + ecart);

  // Entête des jours
  JOURS.forEach((jour, i) => {
    doc.rect(xJour(i), y, largeurJour, 22).fill(ENCRE);
    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor("#ffffff")
      .text(jour, xJour(i), y + 7, { width: largeurJour, align: "center" });
  });
  y += 22 + ecart;

  let separateurPose = false;

  heures.forEach((heure) => {
    // Le trait pointillé sépare le bloc du matin de celui du soir, comme sur
    // l'affiche : c'est ce qui rend la grille lisible d'un coup d'oeil.
    if (!separateurPose && enMinutes(heure) >= 14 * 60) {
      doc
        .moveTo(gauche + colHeure, y + 2)
        .lineTo(gauche + largeur, y + 2)
        .dash(3, { space: 3 })
        .strokeColor("#c9cdd4")
        .lineWidth(1)
        .stroke()
        .undash();
      y += 10;
      separateurPose = true;
    }

    const soir = enMinutes(heure) >= 14 * 60;

    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor(GRIS)
      .text(heure, gauche, y + hauteurLigne / 2 - 5, { width: colHeure - 6, align: "right" });

    for (let j = 0; j < 7; j += 1) {
      const x = xJour(j);
      const contenu = cases.get(`${heure}|${j + 1}`);

      if (!contenu) {
        doc.rect(x, y, largeurJour, hauteurLigne).fill(CASE_VIDE);
        continue;
      }

      const competition = contenu.some((c) => c.type === "competition");
      const fond = competition ? ACCENT : soir ? ENCRE : "#ffd6d8";
      const texte = competition || soir ? CLAIR : ENCRE;

      doc.rect(x, y, largeurJour, hauteurLigne).fill(fond);
      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor(texte)
        .text(
          contenu.map((c) => c.libelle || LIBELLES_TYPE[c.type] || "").join(" / "),
          x + 3,
          y + hauteurLigne / 2 - 9,
          { width: largeurJour - 6, align: "center", lineBreak: true }
        );
      doc
        .font("Helvetica")
        .fontSize(6.5)
        .fillColor(texte)
        .opacity(0.75)
        .text(`${contenu[0].duree} min`, x + 3, y + hauteurLigne / 2 + 3, {
          width: largeurJour - 6,
          align: "center",
        })
        .opacity(1);
    }

    y += hauteurLigne + ecart;
  });

  /* ---------- Pied ---------- */
  const yPied = doc.page.height - doc.page.margins.bottom - 22;
  doc
    .moveTo(gauche, yPied)
    .lineTo(gauche + largeur, yPied)
    .strokeColor(ENCRE)
    .lineWidth(1.5)
    .stroke();

  const contact = [reglages?.adresse, reglages?.telephone, reglages?.email]
    .filter(Boolean)
    .join("   ·   ");

  doc.font("Helvetica").fontSize(8).fillColor(GRIS).text(contact, gauche, yPied + 7, {
    width: largeur,
  });

  doc.end();
});

export default router;

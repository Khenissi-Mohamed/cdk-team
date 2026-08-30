import multer from "multer";
import sharp from "sharp";
import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";

const UPLOAD_ROOT = path.resolve("uploads");

const PDF_MAX_MO = Number(process.env.PDF_MAX_SIZE_MB || 12);

/**
 * Refus imputable à l'appelant. Le gestionnaire d'erreurs global lit
 * `err.status` : sans lui, un mauvais type de fichier ressortirait en 500
 * « Erreur serveur », ce qui envoie l'admin chercher une panne inexistante.
 */
function refus(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

/* ------------------------------------------------------------------ *
 * Images (photos de coachs, logo)
 * ------------------------------------------------------------------ */

// Fichier en mémoire : on ne touche jamais le disque avant compression.
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(refus("Seules les images sont acceptées."));
    }
    cb(null, true);
  },
});

/**
 * Redimensionne et convertit une image en WebP, puis l'écrit sur le disque.
 * @returns {Promise<string>} url relative (ex: /uploads/coach/xxx.webp)
 */
export async function processAndStore(buffer, folder, maxWidth = 1200) {
  const dir = path.join(UPLOAD_ROOT, folder);
  await fs.mkdir(dir, { recursive: true });

  const filename = `${crypto.randomUUID()}.webp`;
  const filePath = path.join(dir, filename);

  await sharp(buffer)
    .rotate() // respecte l'orientation EXIF avant de la supprimer
    .resize({ width: maxWidth, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(filePath);

  return `/uploads/${folder}/${filename}`;
}

/**
 * Stockage du LOGO. Le SVG est écrit tel quel, sans passer par sharp.
 *
 * C'est le point qui casse silencieusement si on l'oublie : sharp sait lire un
 * SVG, mais il le RASTERISE. Un logo vectoriel ressortirait donc en bitmap de
 * largeur fixe, flou dès qu'on l'agrandit — et personne ne s'en apercevrait
 * avant de le voir en grand sur le PDF du planning.
 *
 * Le SVG n'est pas non plus assaini ici : il n'est jamais injecté dans le DOM
 * du site, seulement servi comme fichier statique derrière un `<img>`, qui
 * n'exécute pas les scripts qu'il contiendrait. Et seul l'administrateur
 * authentifié peut en téléverser un.
 */
export async function storeLogo(fichier) {
  const dir = path.join(UPLOAD_ROOT, "marque");
  await fs.mkdir(dir, { recursive: true });

  if (fichier.mimetype === "image/svg+xml") {
    const filename = `${crypto.randomUUID()}.svg`;
    await fs.writeFile(path.join(dir, filename), fichier.buffer);
    return `/uploads/marque/${filename}`;
  }

  // Un logo n'a pas besoin d'être large, mais il doit rester net sur un écran
  // à forte densité : 600 px couvre un affichage à 200 px en 3x.
  return processAndStore(fichier.buffer, "marque", 600);
}

/* ------------------------------------------------------------------ *
 * Documents PDF
 * ------------------------------------------------------------------ */

/**
 * Les PDF vont directement sur le disque : rien à transformer, et les charger
 * en mémoire n'apporterait qu'un pic d'occupation inutile.
 */
export const uploadPdf = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      const dir = path.join(UPLOAD_ROOT, "documents");
      try {
        await fs.mkdir(dir, { recursive: true });
        cb(null, dir);
      } catch (err) {
        cb(err);
      }
    },
    filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}.pdf`),
  }),
  limits: { fileSize: PDF_MAX_MO * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(refus("Seuls les fichiers PDF sont acceptés."));
    }
    cb(null, true);
  },
});

/* ------------------------------------------------------------------ *
 * Suppression
 * ------------------------------------------------------------------ */

export async function deleteStoredFile(url) {
  // Garde-fou : une valeur forgée ne doit jamais faire sortir du dossier.
  if (!url || !url.startsWith("/uploads/")) return;
  const filePath = path.join(UPLOAD_ROOT, url.replace("/uploads/", ""));
  await fs.rm(filePath, { force: true });
}

/* ------------------------------------------------------------------ *
 * Erreurs
 * ------------------------------------------------------------------ */

/**
 * Traduit les erreurs de multer. Sans ce middleware, un dépassement de taille
 * remonte en 500 et l'admin n'a aucun moyen de comprendre que son fichier
 * était trop lourd.
 */
export function erreursUpload(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ message: `Fichier trop volumineux (maximum ${PDF_MAX_MO} Mo).` });
    }
    return res.status(400).json({ message: err.message });
  }
  next(err);
}

export { PDF_MAX_MO };

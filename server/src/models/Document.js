import mongoose from "mongoose";

/**
 * Un PDF téléversé depuis l'admin et proposé au téléchargement : la fiche
 * d'inscription, le certificat médical, le règlement intérieur…
 *
 * Le planning, lui, n'est PAS un Document : il est engendré à la volée depuis
 * les créneaux (voir `routes/planning.routes.js`), sinon il faudrait le
 * re-téléverser à chaque changement d'horaire.
 */
const documentSchema = new mongoose.Schema(
  {
    titre: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, default: "", trim: true, maxlength: 120 },

    url: { type: String, required: true },
    // En octets, pour afficher « 240 Ko » à côté du lien : un visiteur en
    // 4G sur un chantier aime savoir ce qu'il déclenche.
    taille: { type: Number, default: 0 },

    ordre: { type: Number, default: 0 },
    actif: { type: Boolean, default: true },
  },
  { timestamps: true }
);

documentSchema.index({ ordre: 1 });

export default mongoose.model("Document", documentSchema);

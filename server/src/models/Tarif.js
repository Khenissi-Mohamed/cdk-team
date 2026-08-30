import mongoose from "mongoose";

/**
 * Une formule d'adhésion.
 *
 * `montant` est un nombre et non « 420 € » : c'est lui qui s'incrémente dans
 * le compteur animé du site. L'unité est affichée à part, en plus petit, et
 * ne défile pas avec le chiffre.
 */
const tarifSchema = new mongoose.Schema(
  {
    libelle: { type: String, required: true, trim: true, maxlength: 60 },
    montant: { type: Number, default: 0, min: 0 },
    // « Saison complète · tous les créneaux »
    mention: { type: String, default: "", trim: true, maxlength: 120 },

    // Met la formule en évidence (l'essai gratuit, en pratique).
    misEnAvant: { type: Boolean, default: false },

    ordre: { type: Number, default: 0 },
    actif: { type: Boolean, default: true },
  },
  { timestamps: true }
);

tarifSchema.index({ ordre: 1 });

export default mongoose.model("Tarif", tarifSchema);

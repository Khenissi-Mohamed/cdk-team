import mongoose from "mongoose";

/**
 * Un professeur. Le grade n'est pas un texte libre : c'est une couleur de
 * ceinture plus un nombre de degrés, parce que le site le DESSINE — une vraie
 * barre de ceinture avec sa barrette et ses liserés. Une chaîne « ceinture
 * noire 2e degré » ne se dessinerait pas.
 */
const coachSchema = new mongoose.Schema(
  {
    nom: { type: String, required: true, trim: true, maxlength: 80 },
    role: { type: String, default: "", trim: true, maxlength: 120 },

    ceinture: {
      type: String,
      enum: ["blanche", "bleue", "violette", "marron", "noire"],
      default: "noire",
    },
    // Liserés sur la barrette. La fédération en compte jusqu'à 6.
    degres: { type: Number, default: 0, min: 0, max: 6 },

    photo: { type: String, default: null },
    ordre: { type: Number, default: 0 },
    actif: { type: Boolean, default: true },
  },
  { timestamps: true }
);

coachSchema.index({ ordre: 1 });

export default mongoose.model("Coach", coachSchema);

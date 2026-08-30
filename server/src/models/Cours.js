import mongoose from "mongoose";

/**
 * Un créneau hebdomadaire récurrent : « le mardi à 19h30, gi, 90 minutes ».
 *
 * L'heure est stockée en "HH:mm" LOCALE, pas en Date — convention reprise du
 * cabinet de sophrologie, où elle règle une panne concrète : « mardi 19h30 »
 * doit rester 19h30 avant comme après le changement d'heure. Une Date décalerait
 * tout le planning d'une heure deux fois par an.
 *
 * La durée est en minutes plutôt qu'une heure de fin : c'est ce que le gérant
 * a en tête (« un cours d'une heure et demie »), et l'heure de fin s'en déduit.
 */
const coursSchema = new mongoose.Schema(
  {
    // 1 = lundi … 7 = dimanche (convention ISO, celle de `luxon.weekday`).
    jour: { type: Number, required: true, min: 1, max: 7 },
    heureDebut: { type: String, required: true, match: /^\d{2}:\d{2}$/ },
    duree: { type: Number, required: true, min: 15, max: 240 },

    // Décide de la couleur de la case dans la grille et de la légende.
    type: {
      type: String,
      enum: ["gi", "nogi", "kids", "competition", "openmat"],
      required: true,
    },

    // Libellé court, celui qui tient dans une case de 45 px : « Kids 6-9 ».
    libelle: { type: String, required: true, trim: true, maxlength: 40 },
    // Précision affichée dans le détail du jour : « tous niveaux », « sur sélection ».
    niveau: { type: String, default: "", trim: true, maxlength: 60 },

    // Facultatif : un créneau peut exister avant qu'on ait saisi les coachs.
    coach: { type: mongoose.Schema.Types.ObjectId, ref: "Coach", default: null },

    actif: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Le tri du planning est toujours « jour puis heure » : l'index suit.
coursSchema.index({ jour: 1, heureDebut: 1 });

export default mongoose.model("Cours", coursSchema);

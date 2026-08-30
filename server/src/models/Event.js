import mongoose from "mongoose";

// Tracking interne minimaliste des clics vers les canaux de contact.
// Aucune donnée personnelle : pas de cookie, pas d'IP, pas d'identifiant visiteur.
const eventSchema = new mongoose.Schema(
  {
    canal: {
      type: String,
      // `planning` et `document` comptent les téléchargements de PDF : ce sont
      // eux qui disent si le dossier d'inscription circule vraiment.
      enum: ["telephone", "email", "whatsapp", "planning", "document"],
      required: true,
    },
    page: { type: String, default: "/" },
  },
  { timestamps: { createdAt: "date", updatedAt: false } }
);

eventSchema.index({ canal: 1, date: 1 });

export default mongoose.model("Event", eventSchema);

import mongoose from "mongoose";

/**
 * Un rayon de la boutique : Gi, No-gi, Ceintures — et tout ce que le club
 * ajoutera ensuite.
 *
 * La grille de tailles appartient à la CATÉGORIE, pas au produit. Un kimono se
 * vend en A1–A4, un rashguard en S–XL, un kimono enfant en M1–M4 : porter la
 * liste ici évite de la ressaisir sur chaque article, et garantit que deux
 * kimonos du même rayon proposent exactement les mêmes tailles.
 *
 * Conséquence assumée : changer la grille d'une catégorie ne renomme pas les
 * stocks déjà saisis. Les tailles retirées cessent simplement d'être proposées
 * (voir `Produit.stock`).
 */
const categorieSchema = new mongoose.Schema(
  {
    nom: { type: String, required: true, trim: true, maxlength: 40 },

    // Dans l'ordre d'affichage voulu : « A1, A2, A3, A4 » et non l'ordre
    // alphabétique, qui placerait A10 avant A2 le jour où il existera.
    tailles: {
      type: [String],
      default: () => ["A1", "A2", "A3", "A4"],
    },

    ordre: { type: Number, default: 0 },
    actif: { type: Boolean, default: true },
  },
  { timestamps: true }
);

categorieSchema.index({ ordre: 1 });

export default mongoose.model("Categorie", categorieSchema);

import mongoose from "mongoose";

const bloc = (champs) => new mongoose.Schema(champs, { _id: false });

/**
 * Le stock d'UNE taille. C'est une quantité et non un simple « disponible » :
 * à zéro, le site barre la taille tout seul, et le gérant voit d'un coup d'œil
 * ce qu'il doit recommander sans tenir un tableau à côté.
 */
const stockSchema = bloc({
  taille: { type: String, required: true, trim: true, maxlength: 12 },
  quantite: { type: Number, default: 0, min: 0 },
});

/** « Toile : perlée 550 g/m² ». Libre, parce que ce qui compte sur un kimono
 *  (le grammage) n'a aucun sens sur une ceinture (le nombre de coutures). */
const caracteristiqueSchema = bloc({
  cle: { type: String, required: true, trim: true, maxlength: 40 },
  valeur: { type: String, default: "", trim: true, maxlength: 80 },
});

/**
 * Un article de la boutique.
 *
 * La boutique est une VITRINE : on montre ce qui existe, à quel prix et dans
 * quelles tailles, et l'achat se fait au club. Pas de panier, pas de commande,
 * pas de paiement — donc pas de CGV ni de droit de rétractation à gérer.
 *
 * `photos` est un tableau ordonné : la première sert de vignette dans la
 * grille, les suivantes composent la galerie de la fiche. L'ordre se change
 * par glissement depuis l'administration.
 */
const produitSchema = new mongoose.Schema(
  {
    nom: { type: String, required: true, trim: true, maxlength: 80 },
    categorie: { type: mongoose.Schema.Types.ObjectId, ref: "Categorie", required: true },

    description: { type: String, default: "", trim: true, maxlength: 600 },

    // En euros. Nombre et non chaîne : c'est ce qui permet de trier et de
    // formater l'affichage sans réinterpréter « 129 € ».
    prix: { type: Number, default: 0, min: 0 },

    caracteristiques: { type: [caracteristiqueSchema], default: () => [] },
    photos: { type: [String], default: () => [] },

    // Une entrée par taille de la catégorie. Une taille absente d'ici n'est
    // pas affichée du tout — ce n'est pas la même chose qu'une taille à zéro,
    // qui existe mais est épuisée.
    stock: { type: [stockSchema], default: () => [] },

    // Sélectionne l'article pour la bande d'aperçu de la page d'accueil.
    misEnAvant: { type: Boolean, default: false },

    ordre: { type: Number, default: 0 },
    actif: { type: Boolean, default: true },
  },
  { timestamps: true }
);

produitSchema.index({ ordre: 1 });
produitSchema.index({ categorie: 1 });

export default mongoose.model("Produit", produitSchema);

import mongoose from "mongoose";

/**
 * Document unique (singleton) : le logo, les coordonnées, les mentions légales
 * et — surtout — LE TEXTE DE CHAQUE SECTION du site public.
 *
 * Le socle dont ce projet est issu ne rendait éditables que l'accroche et les
 * coordonnées ; le reste vivait dans `site.config.js`, donc chaque virgule
 * demandait un déploiement. Ici la règle est absolue : `site.config.js` ne
 * porte plus que la STRUCTURE (quelles sections, dans quel ordre) et des
 * valeurs de repli affichées avant la réponse de l'API. Tout ce qu'un humain
 * peut vouloir réécrire est ci-dessous.
 */

const bloc = (champs) => new mongoose.Schema(champs, { _id: false });

// Chiffre du bandeau « le club en bref ». La valeur est numérique pour que le
// compteur animé puisse l'incrémenter ; le suffixe porte l'unité, qui ne
// s'anime pas — sinon on verrait défiler « ans » avec le nombre.
const chiffreSchema = bloc({
  valeur: { type: Number, default: 0 },
  suffixe: { type: String, default: "" },
  libelle: { type: String, default: "" },
});

// Vidéo d'ambiance d'une section. Le fichier n'est PAS converti au
// téléversement (voir `upload.js`) : on stocke donc le chemin tel quel, plus
// le poster, qui évite le carré noir avant la première image décodée.
//
// Les trois drapeaux sont des booléens et non des chaînes : ils traversent le
// PUT en JSON, pas en multipart, précisément pour ne pas devenir "false".
const videoSchema = bloc({
  fichier: { type: String, default: null },
  poster: { type: String, default: null },
  // Comment la vidéo occupe la section. Voir `ClubSection.vue`.
  mode: {
    type: String,
    enum: ["arriere-plan", "bloc", "bandeau"],
    default: "arriere-plan",
  },
  autoplay: { type: Boolean, default: true },
  // Tentative de son. Le navigateur peut la refuser : le composant retombe
  // alors sur un bouton « activer le son ». Voir `ClubSection.vue`.
  son: { type: Boolean, default: false },
  boucle: { type: Boolean, default: true },
});

const settingSchema = new mongoose.Schema(
  {
    /* ---------- Marque ---------- */
    // Téléversé depuis l'admin. Sert dans l'en-tête, le pied de page et le PDF
    // du planning. Peut être un .svg servi tel quel ou un .webp converti.
    logo: { type: String, default: null },
    nomClub: { type: String, default: "CDK-Team" },
    ville: { type: String, default: "" },

    /* ---------- Coordonnées ---------- */
    telephone: { type: String, default: "" },
    email: { type: String, default: "" },
    whatsapp: { type: String, default: "" },
    adresse: { type: String, default: "" },

    /* ---------- Section 1 : accroche ---------- */
    hero: {
      type: bloc({
        imageFond: { type: String, default: null },
        surtitre: { type: String, default: "Jiu-jitsu brésilien" },
        titre: { type: String, default: "Arte" },
        // Deuxième ligne du titre, affichée dans la couleur d'accent.
        titreAccent: { type: String, default: "Suave" },
        texte: {
          type: String,
          default:
            "L'art doux. Le seul sport de combat où le plus petit gagne — s'il est le plus patient.",
        },
        ctaPrincipal: { type: String, default: "Deux cours d'essai" },
        ctaSecondaire: { type: String, default: "Le planning" },
      }),
      default: () => ({}),
    },

    /* ---------- Section 2 : bandeau défilant ---------- */
    marquee: {
      type: [String],
      default: ["Gi", "No-gi", "Kids dès 6 ans", "Compétition", "Open mat", "Kimono prêté"],
    },

    /* ---------- Section 3 : le club ---------- */
    club: {
      type: bloc({
        surtitre: { type: String, default: "Le club" },
        titre: { type: String, default: "On ne vient pas pour taper." },
        titreAccent: { type: String, default: "On vient pour comprendre." },
        texte: {
          type: String,
          default:
            "Le jiu-jitsu se pratique au sol, sans frappe. On y apprend à rester calme quand quelqu'un de plus lourd vous immobilise — et ça, ça se travaille, ça ne se muscle pas.\n\nChez nous, le débutant partage le tapis avec le compétiteur dès le premier soir. C'est comme ça qu'on progresse.",
        },
        video: { type: videoSchema, default: () => ({}) },
        chiffres: {
          type: [chiffreSchema],
          default: () => [
            { valeur: 12, suffixe: "", libelle: "ans d'existence" },
            { valeur: 180, suffixe: "", libelle: "licenciés" },
            { valeur: 21, suffixe: "", libelle: "cours / semaine" },
          ],
        },
      }),
      default: () => ({}),
    },

    /* ---------- Section 4 : le planning ---------- */
    planning: {
      type: bloc({
        surtitre: { type: String, default: "Le planning" },
        titre: { type: String, default: "Toute la semaine" },
        // « À partir du 2 septembre » : le bandeau de validité.
        badge: { type: String, default: "" },
      }),
      default: () => ({}),
    },

    /* ---------- Section 5 : l'encadrement ---------- */
    coachs: {
      type: bloc({
        surtitre: { type: String, default: "L'encadrement" },
        titre: { type: String, default: "Une ceinture, c'est du temps." },
        // « photo » montre les portraits téléversés, « avatar » les remplace
        // par le nœud de ceinture dessiné à la couleur du grade. Le choix vaut
        // pour toute la rangée : la panacher donnerait une grille dépareillée.
        // Un coach sans photo bascule sur son avatar dans les deux cas.
        affichage: { type: String, enum: ["photo", "avatar"], default: "photo" },
      }),
      default: () => ({}),
    },

    /* ---------- Section 6 : les tarifs ---------- */
    tarifs: {
      type: bloc({
        surtitre: { type: String, default: "Les tarifs" },
        titre: { type: String, default: "L'année entière, pas au cours." },
        note: {
          type: String,
          default:
            "Réduction famille à partir du deuxième inscrit. Paiement en trois fois possible.",
        },
      }),
      default: () => ({}),
    },

    /* ---------- Section 7 : s'inscrire ---------- */
    documents: {
      type: bloc({
        surtitre: { type: String, default: "S'inscrire" },
        titre: { type: String, default: "Trois papiers, et c'est réglé." },
        texte: {
          type: String,
          default:
            "À imprimer, remplir, et nous remettre en main propre au premier cours. On préfère vous rencontrer.",
        },
      }),
      default: () => ({}),
    },

    /* ---------- Section 8 : appel final ---------- */
    appel: {
      type: bloc({
        titre: { type: String, default: "Le premier cours est toujours le plus dur." },
        texte: {
          type: String,
          default: "Venez sans kimono, sans niveau, sans rien. On s'occupe du reste.",
        },
        cta: { type: String, default: "Réserver mon essai" },
      }),
      default: () => ({}),
    },

    /* ---------- Mentions légales ---------- */
    raisonSociale: { type: String, default: "" },
    formeJuridique: { type: String, default: "" },
    siret: { type: String, default: "" },
    numeroAgrement: { type: String, default: "" },
    directeurPublication: { type: String, default: "" },
    hebergeur: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Setting", settingSchema);

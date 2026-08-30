/**
 * Description déclarative du site public.
 *
 * Ce fichier ne porte plus que la STRUCTURE : quelles sections, dans quel
 * ordre, avec quel numéro de chapitre. Absolument tous les textes viennent de
 * l'administration (modèle `Setting`), y compris les surtitres et les
 * libellés de boutons.
 *
 * Les `fallback*` ne servent qu'au premier rendu, avant la réponse de l'API,
 * et de filet quand elle est injoignable — jamais de source de vérité.
 *
 * Types de section disponibles : voir `sections/registry.js`.
 */

export default {
  nav: [
    { label: "Le club", href: "#club" },
    { label: "Planning", href: "#planning" },
    { label: "Coachs", href: "#coachs" },
    { label: "Tarifs", href: "#tarifs" },
  ],

  sections: [
    { type: "hero", id: "accueil" },
    { type: "marquee", duration: 26 },
    { type: "club", id: "club", chapitre: "01" },
    { type: "planning", id: "planning", chapitre: "02" },
    { type: "coachs", id: "coachs", chapitre: "03" },
    { type: "tarifs", id: "tarifs", chapitre: "04" },
    { type: "documents", id: "inscription", chapitre: "05" },
    { type: "appel" },
  ],

  // Vocabulaire des créneaux : la couleur de la case et le libellé de la
  // légende. Les clés DOIVENT correspondre à l'énum `type` du modèle Cours.
  typesCours: [
    { value: "gi", label: "Gi", couleur: "var(--primary)" },
    { value: "nogi", label: "No-gi", couleur: "var(--primary)" },
    { value: "kids", label: "Kids", couleur: "var(--brand-600)" },
    { value: "competition", label: "Compétition", couleur: "var(--neutral-100)" },
    { value: "openmat", label: "Open mat", couleur: "var(--brand-600)" },
  ],

  jours: [
    { numero: 1, court: "LUN", long: "Lundi" },
    { numero: 2, court: "MAR", long: "Mardi" },
    { numero: 3, court: "MER", long: "Mercredi" },
    { numero: 4, court: "JEU", long: "Jeudi" },
    { numero: 5, court: "VEN", long: "Vendredi" },
    { numero: 6, court: "SAM", long: "Samedi" },
    { numero: 7, court: "DIM", long: "Dimanche" },
  ],
};

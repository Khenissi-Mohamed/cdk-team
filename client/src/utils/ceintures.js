/**
 * Vocabulaire des grades, partagé par tout ce qui DESSINE une ceinture :
 * `CeintureBarre.vue` (la barre sous chaque coach) et `CoachAvatar.vue` (le
 * buste en kimono).
 *
 * Ces deux composants portaient la même table de couleurs et la même règle de
 * barrette. Ajouter un grade en n'en corrigeant qu'un seul est une erreur trop
 * facile à commettre : la source est ici, et nulle part ailleurs.
 */

/** Couleurs réelles des ceintures. Ce ne sont pas des couleurs décoratives. */
export const COULEURS_CEINTURE = {
  blanche: "var(--ceinture-blanche)",
  bleue: "var(--ceinture-bleue)",
  violette: "var(--ceinture-violette)",
  marron: "var(--ceinture-marron)",
  noire: "var(--ceinture-noire)",
};

export const CEINTURE_PAR_DEFAUT = "noire";

export function couleurCeinture(ceinture) {
  return COULEURS_CEINTURE[ceinture] ?? COULEURS_CEINTURE[CEINTURE_PAR_DEFAUT];
}

/**
 * La barrette est rouge sur une ceinture noire — comme dans la réalité — et
 * noire sur toutes les autres : sinon elle disparaîtrait sur la sangle.
 */
export function couleurBarrette(ceinture) {
  return ceinture === "noire" ? "var(--primary)" : "var(--ceinture-noire)";
}

/** La fédération compte jusqu'à six degrés. */
export function nombreLiseres(degres) {
  return Math.max(0, Math.min(6, degres || 0));
}

/** « Ceinture noire · 2e degré », pour les lecteurs d'écran. */
export function libelleGrade(ceinture, degres) {
  const base = `Ceinture ${ceinture ?? CEINTURE_PAR_DEFAUT}`;
  const liseres = nombreLiseres(degres);
  if (!liseres) return base;
  return `${base} · ${liseres === 1 ? "1er" : `${liseres}e`} degré`;
}

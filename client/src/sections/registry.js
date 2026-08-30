/**
 * Table des types de section disponibles.
 *
 * Seul point de couplage entre `site.config.js` (déclaratif) et les
 * composants. Ajouter une section = écrire le composant, puis l'inscrire ici.
 * La config n'importe jamais un composant directement.
 *
 * Chaque section reçoit exactement deux props :
 *   - `config` : son entrée dans `site.config.js` (structure, chapitre)
 *   - `data`   : les données live de l'API, partagées par toutes les sections
 */

import HeroSection from "./HeroSection.vue";
import MarqueeSection from "./MarqueeSection.vue";
import ClubSection from "./ClubSection.vue";
import PlanningSection from "./PlanningSection.vue";
import CoachsSection from "./CoachsSection.vue";
import TarifsSection from "./TarifsSection.vue";
import DocumentsSection from "./DocumentsSection.vue";
import AppelSection from "./AppelSection.vue";

export const SECTION_TYPES = {
  hero: HeroSection,
  marquee: MarqueeSection,
  club: ClubSection,
  planning: PlanningSection,
  coachs: CoachsSection,
  tarifs: TarifsSection,
  documents: DocumentsSection,
  appel: AppelSection,
};

/**
 * Renvoie le composant d'un type, ou `null` s'il est inconnu. Une faute de
 * frappe dans la config saute alors la section au lieu de casser la page.
 */
export function resolveSection(type) {
  const component = SECTION_TYPES[type];
  if (!component && import.meta.env.DEV) {
    console.warn(
      `[sections] type inconnu : "${type}". Types disponibles : ${Object.keys(SECTION_TYPES).join(", ")}`
    );
  }
  return component ?? null;
}

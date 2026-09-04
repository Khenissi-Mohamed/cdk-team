const cache = new Map();

function couleurCalculee(couleur) {
  if (typeof document === "undefined") return "";

  const temoin = document.createElement("span");
  temoin.style.color = couleur;
  temoin.style.display = "none";
  document.body.appendChild(temoin);
  const resultat = getComputedStyle(temoin).color;
  temoin.remove();
  return resultat;
}

function composantesRgb(couleur) {
  const rgb = couleurCalculee(couleur).match(
    /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i
  );
  return rgb ? rgb.slice(1, 4).map(Number) : null;
}

function luminanceRelative([rouge, vert, bleu]) {
  const lineariser = (composante) => {
    const valeur = composante / 255;
    return valeur <= 0.04045 ? valeur / 12.92 : ((valeur + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * lineariser(rouge) + 0.7152 * lineariser(vert) + 0.0722 * lineariser(bleu);
}

/** Retourne le noir ou le blanc qui offre le meilleur contraste avec le fond. */
export function couleurTexteContraste(couleurFond) {
  if (cache.has(couleurFond)) return cache.get(couleurFond);

  const rgb = composantesRgb(couleurFond);
  if (!rgb) return "#ffffff";

  const luminance = luminanceRelative(rgb);
  const contrasteNoir = (luminance + 0.05) / 0.05;
  const contrasteBlanc = 1.05 / (luminance + 0.05);
  const couleurTexte = contrasteNoir >= contrasteBlanc ? "#000000" : "#ffffff";

  cache.set(couleurFond, couleurTexte);
  return couleurTexte;
}

const cacheLuminance = new Map();

/**
 * Luminance relative d'une couleur, de 0 (noir) à 1 (blanc).
 *
 * « Noir ou blanc par-dessus ? » ne suffit pas partout : `CoachAvatar` doit
 * savoir si une ceinture est SI sombre qu'elle se confondrait avec le fond du
 * site. La noire est aujourd'hui le seul grade concerné, mais la reconnaître
 * à son nom casserait le jour où un grade s'ajoute — la mesure, elle, tient.
 */
export function luminanceCouleur(couleurFond) {
  if (cacheLuminance.has(couleurFond)) return cacheLuminance.get(couleurFond);

  const rgb = composantesRgb(couleurFond);
  const valeur = rgb ? luminanceRelative(rgb) : 0;

  cacheLuminance.set(couleurFond, valeur);
  return valeur;
}

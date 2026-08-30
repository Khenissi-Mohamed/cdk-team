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

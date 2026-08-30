// L'import des tokens doit précéder toute autre instruction de ce fichier :
// `createVuetify` est appelé à l'évaluation du module, et lit les variables CSS
// ci-dessous. ESM garantit que les imports sont évalués avant le corps du
// module — c'est ce qui rend la lecture fiable, y compris en dev où Vite injecte
// la feuille de style au moment de l'import.
import "../assets/tokens.css";

import "vuetify/styles";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import "@mdi/font/css/materialdesignicons.css";

/**
 * Le thème Vuetify est dérivé de `assets/tokens.css`, qui est la source unique
 * des couleurs du site. Il portait auparavant sa propre copie de la palette :
 * sept valeurs étaient dupliquées, et changer une teinte dans les tokens
 * laissait tous les composants Vuetify — boutons, champs de l'admin, en-têtes
 * de dialogue, icônes du tableau de bord — sur l'ancienne couleur.
 *
 * La lecture fonctionne parce que la valeur *calculée* d'une custom property a
 * déjà ses `var()` substitués : `--primary`, défini comme `var(--brand-500)`,
 * renvoie bien l'hexadécimal final.
 */
const rootStyles = getComputedStyle(document.documentElement);

function token(name) {
  const value = rootStyles.getPropertyValue(name).trim();
  if (!value) {
    // Averti en production aussi : si le cas se produisait un jour, Vuetify
    // recevrait une chaîne vide et échouerait sur un message obscur. Mieux vaut
    // que la console dise d'emblée quel token manque et pourquoi.
    console.warn(
      `[theme] token ${name} introuvable — Vuetify va recevoir une couleur vide. ` +
        `tokens.css doit être chargé avant ce module (voir l'import en tête de ` +
        `plugins/vuetify.js).`
    );
  }
  return value;
}

// Chaque nom ci-dessous est consommé quelque part : `secondary`, `ink` et
// `sauge` par les icônes de AdminDashboard, `error` / `warning` / `success` par
// les variantes de AppDialog. Aucun n'est décoratif, ne pas en retirer sans
// vérifier les usages.
const theme = {
  dark: false,
  colors: {
    // Le thème Vuetify habille l'ADMINISTRATION, pas le site public : celui-ci
    // est en CSS scoped et lit directement les rôles de tokens.css. `surface`
    // et `background` pointent donc vers les neutres clairs (--paper, --sand),
    // pas vers le noir du site — sinon le drawer et les cartes de l'admin se
    // retrouveraient en texte sombre sur fond sombre.
    background: token("--sand"),
    surface: token("--paper"),
    primary: token("--primary"),
    "primary-darken-1": token("--primary-strong"),
    secondary: token("--accent"),
    sauge: token("--support"),
    ink: token("--ink"),
    error: token("--error"),
    success: token("--success"),
    warning: token("--accent"),
  },
};

export default createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: "cdk",
    themes: { cdk: theme },
  },
  defaults: {
    VBtn: { rounded: "sm" },
  },
});

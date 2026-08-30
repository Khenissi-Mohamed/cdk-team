/**
 * Plugin Vue de la couche mouvement. Un seul `app.use(motion)` suffit à rendre
 * `v-reveal` et `v-parallax` disponibles partout, styles compris.
 */

import { vReveal, vParallax } from "./directives";
import "../assets/motion.css";

export default {
  install(app) {
    app.directive("reveal", vReveal);
    app.directive("parallax", vParallax);
  },
};

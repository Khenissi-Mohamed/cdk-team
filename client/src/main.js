import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import vuetify from "./plugins/vuetify";
import motion from "./motion";

// Ordre important : les tokens définissent les variables que `theme.css`
// consomme. `plugins/vuetify` les importe déjà pour en dériver son thème, donc
// ils sont techniquement déjà chargés ici — on les garde explicites parce que
// c'est ce fichier qui déclare les styles globaux, et que `theme.css` ne doit
// pas dépendre d'un import fait ailleurs pour une autre raison.
import "./assets/fonts.css";
import "./assets/tokens.css";
import "./assets/theme.css";

createApp(App).use(router).use(vuetify).use(motion).mount("#app");

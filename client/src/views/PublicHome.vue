<script setup>
/**
 * Page d'accueil.
 *
 * Elle ne connaît aucune section : elle charge les données puis déroule
 * `site.config.js` en résolvant chaque type via le registre. Ajouter, retirer
 * ou réordonner une section ne se fait donc pas ici mais dans la config.
 */
import { ref, computed, onMounted } from "vue";
import api from "../services/api";
import siteConfig from "../site.config";
import { resolveSection } from "../sections/registry";

import ScrollProgress from "../components/motion/ScrollProgress.vue";
import SiteHeader from "../components/public/SiteHeader.vue";
import SiteFooter from "../components/public/SiteFooter.vue";

const settings = ref({});
const cours = ref([]);
const coachs = ref([]);
const tarifs = ref([]);
const documents = ref([]);

// Contexte unique passé à toutes les sections : une section ne fait jamais son
// propre appel réseau, sinon l'ordre des sections changerait le nombre de
// requêtes de la page.
const siteData = computed(() => ({
  settings: settings.value,
  cours: cours.value,
  coachs: coachs.value,
  tarifs: tarifs.value,
  documents: documents.value,
}));

const sections = computed(() =>
  siteConfig.sections
    .map((section, index) => ({
      section,
      component: resolveSection(section.type),
      key: section.id ?? `${section.type}-${index}`,
    }))
    .filter((entry) => entry.component)
);

onMounted(async () => {
  try {
    const [reglages, c, co, t, d] = await Promise.all([
      api.get("/settings"),
      api.get("/cours"),
      api.get("/coachs"),
      api.get("/tarifs"),
      api.get("/documents"),
    ]);
    settings.value = reglages.data;
    cours.value = c.data;
    coachs.value = co.data;
    tarifs.value = t.data;
    documents.value = d.data;
  } catch {
    // API injoignable : les sections vides se masquent d'elles-mêmes plutôt
    // que de laisser une page blanche.
  }
});
</script>

<template>
  <div class="public-page">
    <ScrollProgress />
    <SiteHeader :nav="siteConfig.nav" :settings="settings" />

    <main>
      <component
        :is="entry.component"
        v-for="entry in sections"
        :key="entry.key"
        :config="entry.section"
        :data="siteData"
      />
    </main>

    <SiteFooter :settings="settings" />
  </div>
</template>

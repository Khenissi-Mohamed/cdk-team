<script setup>
/**
 * Tableau de bord : ce que contient le site, puis ce que les visiteurs en
 * font. Les compteurs sont des raccourcis — chaque tuile mène à l'écran
 * correspondant.
 */
import { ref, computed, onMounted } from "vue";
import api from "../../services/api";

const cours = ref([]);
const coachs = ref([]);
const tarifs = ref([]);
const documents = ref([]);
const summary = ref(null);

const CANAUX = {
  telephone: { label: "Téléphone", icon: "mdi-phone", color: "primary" },
  email: { label: "E-mail", icon: "mdi-email-outline", color: "ink" },
  whatsapp: { label: "WhatsApp", icon: "mdi-whatsapp", color: "success" },
  planning: { label: "Planning PDF", icon: "mdi-calendar-arrow-right", color: "warning" },
  document: { label: "Autres PDF", icon: "mdi-file-pdf-box", color: "error" },
};

const coursActifs = computed(() => cours.value.filter((c) => c.actif).length);

onMounted(async () => {
  // `allSettled` : une route qui échoue ne doit pas vider l'écran entier. Une
  // tuile absente vaut mieux qu'une page blanche.
  const reponses = await Promise.allSettled([
    api.get("/cours/admin"),
    api.get("/coachs/admin"),
    api.get("/tarifs/admin"),
    api.get("/documents/admin"),
    api.get("/events/admin/summary"),
  ]);

  const [c, co, t, d, s] = reponses;
  if (c.status === "fulfilled") cours.value = c.value.data;
  if (co.status === "fulfilled") coachs.value = co.value.data;
  if (t.status === "fulfilled") tarifs.value = t.value.data;
  if (d.status === "fulfilled") documents.value = d.value.data;
  if (s.status === "fulfilled") summary.value = s.value.data;
});
</script>

<template>
  <h1 class="text-h5 mb-6">Tableau de bord</h1>

  <v-alert
    v-if="!coursActifs"
    type="warning"
    variant="tonal"
    class="mb-6"
    text="Aucun cours actif : la section planning du site affiche « Le planning sera publié prochainement »."
  />

  <h2 class="text-subtitle-1 font-weight-bold mb-1">Le contenu</h2>
  <p class="text-body-2 text-medium-emphasis mb-4">Ce qui est publié sur le site.</p>

  <v-row class="mb-6">
    <v-col cols="6" md="3">
      <v-card variant="flat" class="carte-kpi pa-5" :to="{ name: 'admin-cours' }">
        <v-icon icon="mdi-calendar-week" color="primary" size="28" class="mb-3" />
        <div class="text-h4 font-weight-bold">{{ coursActifs }}</div>
        <div class="text-body-2 text-medium-emphasis">Cours par semaine</div>
      </v-card>
    </v-col>
    <v-col cols="6" md="3">
      <v-card variant="flat" class="carte-kpi pa-5" :to="{ name: 'admin-coachs' }">
        <v-icon icon="mdi-account-group-outline" color="ink" size="28" class="mb-3" />
        <div class="text-h4 font-weight-bold">{{ coachs.length }}</div>
        <div class="text-body-2 text-medium-emphasis">Coachs</div>
      </v-card>
    </v-col>
    <v-col cols="6" md="3">
      <v-card variant="flat" class="carte-kpi pa-5" :to="{ name: 'admin-tarifs' }">
        <v-icon icon="mdi-cash-multiple" color="success" size="28" class="mb-3" />
        <div class="text-h4 font-weight-bold">{{ tarifs.length }}</div>
        <div class="text-body-2 text-medium-emphasis">Formules</div>
      </v-card>
    </v-col>
    <v-col cols="6" md="3">
      <v-card variant="flat" class="carte-kpi pa-5" :to="{ name: 'admin-documents' }">
        <v-icon icon="mdi-file-pdf-box" color="error" size="28" class="mb-3" />
        <div class="text-h4 font-weight-bold">{{ documents.length }}</div>
        <div class="text-body-2 text-medium-emphasis">Documents</div>
      </v-card>
    </v-col>
  </v-row>

  <h2 class="text-subtitle-1 font-weight-bold mb-1">Les visiteurs</h2>
  <p class="text-body-2 text-medium-emphasis mb-4">
    Contacts et téléchargements, 30 derniers jours. Aucun cookie, aucune donnée
    personnelle : seuls le canal et la page sont enregistrés.
  </p>

  <v-row v-if="summary">
    <v-col v-for="(meta, canal) in CANAUX" :key="canal" cols="6" md="3">
      <v-card variant="flat" class="carte-kpi pa-5">
        <v-icon :icon="meta.icon" :color="meta.color" size="28" class="mb-3" />
        <div class="text-h4 font-weight-bold">{{ summary.parCanal[canal] ?? 0 }}</div>
        <div class="text-body-2 text-medium-emphasis">{{ meta.label }}</div>
      </v-card>
    </v-col>
  </v-row>
  <v-skeleton-loader v-else type="card" />
</template>

<style scoped>
.carte-kpi {
  background: var(--paper);
  border: 1px solid var(--line);
  height: 100%;
}
</style>

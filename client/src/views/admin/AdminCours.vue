<script setup>
/**
 * Le planning : la liste des créneaux hebdomadaires, groupée par jour.
 *
 * Pas de grille éditable en 7 colonnes ici, contrairement au site public : sur
 * un écran d'administration on modifie UN créneau à la fois, et une liste par
 * jour se lit et se corrige bien plus vite qu'une grille où chaque case fait
 * 45 px. La grille est la vue du visiteur, pas l'outil de saisie.
 */
import { ref, reactive, computed, onMounted } from "vue";
import api from "../../services/api";
import siteConfig from "../../site.config";
import AppDialog from "../../components/admin/AppDialog.vue";

const JOURS = siteConfig.jours;
const TYPES = siteConfig.typesCours;

const cours = ref([]);
const coachs = ref([]);
const chargement = ref(true);
const erreur = ref("");

const dialogEdition = ref(false);
const mode = ref("creation");
const enregistrement = ref(false);
const form = reactive({
  id: null,
  jour: 1,
  heureDebut: "19:30",
  duree: 90,
  type: "gi",
  libelle: "",
  niveau: "",
  coach: null,
});

const dialogSuppression = ref(false);
const suppressionEnCours = ref(false);
const aSupprimer = ref(null);

/** « 07:00 » → 420, pour trier les créneaux d'une journée. */
const enMinutes = (heure) => {
  const [h, m] = String(heure).split(":").map(Number);
  return h * 60 + m;
};

const parJour = computed(() =>
  JOURS.map((jour) => ({
    ...jour,
    cours: cours.value
      .filter((c) => c.jour === jour.numero)
      .sort((a, b) => enMinutes(a.heureDebut) - enMinutes(b.heureDebut)),
  }))
);

const total = computed(() => cours.value.length);

async function charger() {
  chargement.value = true;
  erreur.value = "";
  try {
    const [c, co] = await Promise.all([api.get("/cours/admin"), api.get("/coachs/admin")]);
    cours.value = c.data;
    coachs.value = co.data;
  } catch (err) {
    erreur.value = err.response?.data?.message || "Chargement impossible.";
  } finally {
    chargement.value = false;
  }
}

onMounted(charger);

function ouvrirCreation(jour) {
  mode.value = "creation";
  Object.assign(form, {
    id: null,
    jour: jour ?? 1,
    heureDebut: "19:30",
    duree: 90,
    type: "gi",
    libelle: "",
    niveau: "",
    coach: null,
  });
  erreur.value = "";
  dialogEdition.value = true;
}

function ouvrirEdition(c) {
  mode.value = "edition";
  Object.assign(form, {
    id: c._id,
    jour: c.jour,
    heureDebut: c.heureDebut,
    duree: c.duree,
    type: c.type,
    libelle: c.libelle,
    niveau: c.niveau ?? "",
    // Le coach arrive peuplé depuis l'API : on ne garde que son identifiant.
    coach: c.coach?._id ?? null,
  });
  erreur.value = "";
  dialogEdition.value = true;
}

async function soumettre() {
  enregistrement.value = true;
  erreur.value = "";
  try {
    const corps = {
      jour: form.jour,
      heureDebut: form.heureDebut,
      duree: Number(form.duree),
      type: form.type,
      libelle: form.libelle,
      niveau: form.niveau,
      coach: form.coach || "",
    };

    if (mode.value === "creation") await api.post("/cours/admin", corps);
    else await api.put(`/cours/admin/${form.id}`, corps);

    dialogEdition.value = false;
    await charger();
  } catch (err) {
    erreur.value = err.response?.data?.message || "Enregistrement impossible.";
  } finally {
    enregistrement.value = false;
  }
}

async function basculerActif(c, valeur) {
  c.actif = valeur;
  await api.put(`/cours/admin/${c._id}`, { actif: valeur });
}

function demanderSuppression(c) {
  aSupprimer.value = c;
  dialogSuppression.value = true;
}

async function confirmerSuppression() {
  suppressionEnCours.value = true;
  try {
    await api.delete(`/cours/admin/${aSupprimer.value._id}`);
    dialogSuppression.value = false;
    await charger();
  } finally {
    suppressionEnCours.value = false;
  }
}

/** « 07:00 » + 90 min → « 08:30 ». */
function heureFin(heureDebut, duree) {
  const t = enMinutes(heureDebut) + Number(duree || 0);
  return `${String(Math.floor(t / 60) % 24).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

const libelleType = (v) => TYPES.find((t) => t.value === v)?.label ?? v;
</script>

<template>
  <div class="d-flex align-center justify-space-between ga-3 mb-6">
    <div>
      <h1 class="text-h5 mb-1">Planning</h1>
      <p class="text-body-2 text-medium-emphasis mb-0">
        {{ total }} créneau{{ total > 1 ? "x" : "" }} dans la semaine.
      </p>
    </div>
    <v-btn color="success" prepend-icon="mdi-plus" @click="ouvrirCreation(1)">
      Nouveau créneau
    </v-btn>
  </div>

  <v-alert v-if="erreur && !dialogEdition" type="error" variant="tonal" density="compact" class="mb-6">
    {{ erreur }}
  </v-alert>

  <v-skeleton-loader v-if="chargement" type="card" />

  <div v-else class="colonne">
    <v-card v-for="jour in parJour" :key="jour.numero" variant="flat" class="carte-jour">
      <div class="entete-jour">
        <div class="d-flex align-center ga-3">
          <strong class="nom-jour">{{ jour.long }}</strong>
          <span class="text-caption text-medium-emphasis">
            {{ jour.cours.length }} cours
          </span>
        </div>
        <v-btn
          size="small"
          variant="text"
          prepend-icon="mdi-plus"
          @click="ouvrirCreation(jour.numero)"
        >
          Ajouter
        </v-btn>
      </div>

      <p v-if="!jour.cours.length" class="px-4 pb-4 text-body-2 text-medium-emphasis mb-0">
        Aucun cours ce jour-là.
      </p>

      <v-list v-else density="comfortable" class="liste-cours">
        <v-list-item v-for="c in jour.cours" :key="c._id" :class="{ 'est-inactif': !c.actif }">
          <template #prepend>
            <div class="creneau">
              <strong>{{ c.heureDebut }}</strong>
              <span>{{ heureFin(c.heureDebut, c.duree) }}</span>
            </div>
          </template>

          <v-list-item-title>
            {{ c.libelle }}
            <v-chip size="x-small" variant="tonal" class="ml-1">{{ libelleType(c.type) }}</v-chip>
          </v-list-item-title>
          <v-list-item-subtitle>
            {{ c.duree }} min<template v-if="c.niveau"> · {{ c.niveau }}</template>
            <template v-if="c.coach"> · {{ c.coach.nom }}</template>
          </v-list-item-subtitle>

          <template #append>
            <div class="d-flex align-center ga-1">
              <v-switch
                :model-value="c.actif"
                color="success"
                density="compact"
                hide-details
                @update:model-value="(v) => basculerActif(c, v)"
              />
              <v-btn
                icon="mdi-pencil-outline"
                variant="text"
                color="warning"
                size="small"
                aria-label="Modifier"
                @click="ouvrirEdition(c)"
              />
              <v-btn
                icon="mdi-delete-outline"
                variant="text"
                color="error"
                size="small"
                aria-label="Supprimer"
                @click="demanderSuppression(c)"
              />
            </div>
          </template>
        </v-list-item>
      </v-list>
    </v-card>
  </div>

  <AppDialog
    v-model="dialogEdition"
    :variant="mode === 'creation' ? 'success' : 'warning'"
    :title="mode === 'creation' ? 'Nouveau créneau' : 'Modifier le créneau'"
    confirm-text="Enregistrer"
    :loading="enregistrement"
    @confirm="soumettre"
  >
    <div class="grille-form">
      <v-select
        v-model="form.jour"
        :items="JOURS"
        item-title="long"
        item-value="numero"
        label="Jour"
        density="comfortable"
      />
      <v-text-field v-model="form.heureDebut" label="Heure de début" type="time" density="comfortable" />
      <v-text-field
        v-model.number="form.duree"
        label="Durée (min)"
        type="number"
        min="15"
        max="240"
        density="comfortable"
      />
      <v-select
        v-model="form.type"
        :items="TYPES"
        item-title="label"
        item-value="value"
        label="Type"
        density="comfortable"
      />
    </div>

    <v-text-field
      v-model="form.libelle"
      label="Libellé"
      placeholder="Kids 6-9"
      hint="Court : c'est lui qui doit tenir dans une case du planning."
      persistent-hint
      class="mb-4"
    />
    <v-text-field
      v-model="form.niveau"
      label="Précision"
      placeholder="Tous niveaux, sur sélection…"
      class="mb-2"
    />
    <v-select
      v-model="form.coach"
      :items="[{ _id: null, nom: 'Aucun' }, ...coachs]"
      item-title="nom"
      item-value="_id"
      label="Coach"
      density="comfortable"
    />

    <v-alert v-if="erreur" type="error" variant="tonal" density="compact" class="mt-2">
      {{ erreur }}
    </v-alert>
  </AppDialog>

  <AppDialog
    v-model="dialogSuppression"
    variant="danger"
    title="Supprimer le créneau"
    confirm-text="Supprimer"
    :loading="suppressionEnCours"
    @confirm="confirmerSuppression"
  >
    Ce créneau disparaîtra du planning du site et du PDF. Cette action est irréversible.
  </AppDialog>
</template>

<style scoped>
.colonne {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.carte-jour {
  background: var(--paper);
  border: 1px solid var(--line);
}

.entete-jour {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.7rem 1rem;
  border-bottom: 1px solid var(--line);
}

.nom-jour {
  font-size: 1.02rem;
}

.liste-cours :deep(.v-list-item) {
  border-bottom: 1px solid var(--line);
}

.liste-cours :deep(.v-list-item:last-child) {
  border-bottom: none;
}

/* Un créneau désactivé reste visible mais s'efface : il ne doit pas se
   confondre avec ceux qui sont réellement au planning. */
.est-inactif {
  opacity: 0.5;
}

.creneau {
  display: flex;
  flex-direction: column;
  width: 62px;
  margin-right: 0.9rem;
}

.creneau strong {
  font-size: 0.98rem;
}

.creneau span {
  font-size: 0.72rem;
  color: var(--ink-soft);
}

.grille-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 0.8rem;
}
</style>

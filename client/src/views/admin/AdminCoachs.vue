<script setup>
/**
 * Les coachs. Le texte part en JSON, la photo par un appel multipart séparé :
 * en multipart tous les champs arrivent en `String`, et `degres` y deviendrait
 * "2" tandis que `actif` vaudrait la chaîne "false", vraie en JavaScript.
 */
import { ref, reactive, onMounted } from "vue";
import draggable from "vuedraggable";
import api, { assetUrl } from "../../services/api";
import AppDialog from "../../components/admin/AppDialog.vue";

const CEINTURES = [
  { value: "blanche", label: "Blanche" },
  { value: "bleue", label: "Bleue" },
  { value: "violette", label: "Violette" },
  { value: "marron", label: "Marron" },
  { value: "noire", label: "Noire" },
];

const coachs = ref([]);
const erreur = ref("");

const dialogEdition = ref(false);
const mode = ref("creation");
const enregistrement = ref(false);
const form = reactive({ id: null, nom: "", role: "", ceinture: "noire", degres: 0, fichier: null });

const dialogSuppression = ref(false);
const suppressionEnCours = ref(false);
const aSupprimer = ref(null);

async function charger() {
  const { data } = await api.get("/coachs/admin");
  coachs.value = data;
}
onMounted(charger);

function ouvrirCreation() {
  mode.value = "creation";
  Object.assign(form, { id: null, nom: "", role: "", ceinture: "noire", degres: 0, fichier: null });
  erreur.value = "";
  dialogEdition.value = true;
}

function ouvrirEdition(coach) {
  mode.value = "edition";
  Object.assign(form, {
    id: coach._id,
    nom: coach.nom,
    role: coach.role ?? "",
    ceinture: coach.ceinture,
    degres: coach.degres ?? 0,
    fichier: null,
  });
  erreur.value = "";
  dialogEdition.value = true;
}

async function envoyerPhoto(id) {
  const corps = new FormData();
  corps.append("photo", form.fichier);
  await api.put(`/coachs/admin/${id}/photo`, corps, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

async function soumettre() {
  if (!form.nom.trim()) {
    erreur.value = "Le nom est requis.";
    return;
  }
  enregistrement.value = true;
  erreur.value = "";
  try {
    const corps = {
      nom: form.nom,
      role: form.role,
      ceinture: form.ceinture,
      degres: Number(form.degres) || 0,
    };

    let coach;
    if (mode.value === "creation") ({ data: coach } = await api.post("/coachs/admin", corps));
    else ({ data: coach } = await api.put(`/coachs/admin/${form.id}`, corps));

    if (form.fichier) await envoyerPhoto(coach._id);

    dialogEdition.value = false;
    await charger();
  } catch (err) {
    erreur.value = err.response?.data?.message || "Enregistrement impossible.";
  } finally {
    enregistrement.value = false;
  }
}

async function basculerActif(coach, valeur) {
  coach.actif = valeur;
  await api.put(`/coachs/admin/${coach._id}`, { actif: valeur });
}

async function reordonner() {
  await api.patch("/coachs/admin/reorder", { ids: coachs.value.map((c) => c._id) });
}

function demanderSuppression(coach) {
  aSupprimer.value = coach;
  dialogSuppression.value = true;
}

async function confirmerSuppression() {
  suppressionEnCours.value = true;
  try {
    await api.delete(`/coachs/admin/${aSupprimer.value._id}`);
    dialogSuppression.value = false;
    await charger();
  } finally {
    suppressionEnCours.value = false;
  }
}

const libelleGrade = (coach) =>
  coach.degres
    ? `${coach.ceinture} · ${coach.degres === 1 ? "1er" : coach.degres + "e"} degré`
    : coach.ceinture;
</script>

<template>
  <div class="d-flex align-center justify-space-between ga-3 mb-6">
    <div>
      <h1 class="text-h5 mb-1">Coachs</h1>
      <p class="text-body-2 text-medium-emphasis mb-0">
        Glissez la poignée pour changer l'ordre d'affichage sur le site.
      </p>
    </div>
    <v-btn color="success" prepend-icon="mdi-plus" @click="ouvrirCreation">Nouveau coach</v-btn>
  </div>

  <!-- `handle` limite le glissement à la poignée. Sans lui, toute la ligne est
       une zone de glissement et ses boutons deviennent inertes au doigt. -->
  <draggable
    v-model="coachs"
    item-key="_id"
    handle=".poignee"
    class="d-flex flex-column ga-3"
    @end="reordonner"
  >
    <template #item="{ element: coach }">
      <v-card class="ligne pa-4" variant="flat">
        <div class="ligne-info">
          <span class="poignee" aria-label="Glisser pour réordonner">
            <v-icon icon="mdi-drag-vertical" />
          </span>
          <v-avatar rounded size="56">
            <v-img v-if="coach.photo" :src="assetUrl(coach.photo)" cover />
            <v-icon v-else icon="mdi-account-outline" />
          </v-avatar>
          <div class="ligne-texte">
            <div class="font-weight-bold">{{ coach.nom }}</div>
            <div class="text-body-2 text-medium-emphasis">
              Ceinture {{ libelleGrade(coach) }}<template v-if="coach.role"> · {{ coach.role }}</template>
            </div>
          </div>
        </div>

        <div class="ligne-actions">
          <v-switch
            :model-value="coach.actif"
            color="success"
            density="compact"
            hide-details
            label="Visible"
            @update:model-value="(v) => basculerActif(coach, v)"
          />
          <div class="d-flex ga-1">
            <v-btn icon="mdi-pencil-outline" variant="text" color="warning" size="small" aria-label="Modifier" @click="ouvrirEdition(coach)" />
            <v-btn icon="mdi-delete-outline" variant="text" color="error" size="small" aria-label="Supprimer" @click="demanderSuppression(coach)" />
          </div>
        </div>
      </v-card>
    </template>
  </draggable>

  <p v-if="!coachs.length" class="text-medium-emphasis mt-4">Aucun coach pour l'instant.</p>

  <AppDialog
    v-model="dialogEdition"
    :variant="mode === 'creation' ? 'success' : 'warning'"
    :title="mode === 'creation' ? 'Nouveau coach' : 'Modifier le coach'"
    confirm-text="Enregistrer"
    :loading="enregistrement"
    @confirm="soumettre"
  >
    <v-text-field v-model="form.nom" label="Nom" class="mb-2" />
    <v-text-field
      v-model="form.role"
      label="Rôle"
      placeholder="Fondateur, section enfants…"
      class="mb-4"
    />
    <div class="d-flex ga-3">
      <v-select
        v-model="form.ceinture"
        :items="CEINTURES"
        item-title="label"
        item-value="value"
        label="Ceinture"
        class="flex-grow-1"
      />
      <v-text-field
        v-model.number="form.degres"
        label="Degrés"
        type="number"
        min="0"
        max="6"
        style="max-width: 110px"
      />
    </div>
    <v-file-input
      label="Photo"
      accept="image/*"
      prepend-icon="mdi-camera-outline"
      @update:model-value="(f) => (form.fichier = f || null)"
    />

    <v-alert v-if="erreur" type="error" variant="tonal" density="compact" class="mt-2">
      {{ erreur }}
    </v-alert>
  </AppDialog>

  <AppDialog
    v-model="dialogSuppression"
    variant="danger"
    title="Supprimer le coach"
    confirm-text="Supprimer"
    :loading="suppressionEnCours"
    @confirm="confirmerSuppression"
  >
    Sa photo sera supprimée et les créneaux qui lui étaient rattachés n'auront
    plus de coach. Cette action est irréversible.
  </AppDialog>
</template>

<style scoped>
.ligne {
  background: var(--paper);
  border: 1px solid var(--line);
  display: flex;
  align-items: center;
  gap: 1rem;
}

.ligne-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1 1 auto;
  min-width: 0;
}

/* Seule zone de glissement, et seule à porter `touch-action: none` : le reste
   de la ligne reste défilable et cliquable au doigt. */
.poignee {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  flex: none;
  color: var(--ink-soft);
  cursor: grab;
  touch-action: none;
}

.poignee:active {
  cursor: grabbing;
}

.ligne-texte {
  min-width: 0;
}

.ligne-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 0 0 auto;
}

@media (max-width: 600px) {
  .ligne {
    flex-direction: column;
    align-items: stretch;
  }

  .ligne-actions {
    width: 100%;
    justify-content: space-between;
    padding-top: 0.75rem;
    border-top: 1px solid var(--line);
  }
}
</style>

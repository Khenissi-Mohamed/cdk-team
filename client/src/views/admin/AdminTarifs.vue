<script setup>
/**
 * Les formules d'adhésion. Le montant est saisi en nombre, jamais en « 420 € » :
 * c'est lui qui alimente le compteur animé du site, et une chaîne ne
 * s'incrémente pas.
 */
import { ref, reactive, onMounted } from "vue";
import draggable from "vuedraggable";
import api from "../../services/api";
import AppDialog from "../../components/admin/AppDialog.vue";

const tarifs = ref([]);
const erreur = ref("");

const dialogEdition = ref(false);
const mode = ref("creation");
const enregistrement = ref(false);
const form = reactive({ id: null, libelle: "", montant: 0, mention: "", misEnAvant: false });

const dialogSuppression = ref(false);
const suppressionEnCours = ref(false);
const aSupprimer = ref(null);

async function charger() {
  const { data } = await api.get("/tarifs/admin");
  tarifs.value = data;
}
onMounted(charger);

function ouvrirCreation() {
  mode.value = "creation";
  Object.assign(form, { id: null, libelle: "", montant: 0, mention: "", misEnAvant: false });
  erreur.value = "";
  dialogEdition.value = true;
}

function ouvrirEdition(tarif) {
  mode.value = "edition";
  Object.assign(form, {
    id: tarif._id,
    libelle: tarif.libelle,
    montant: tarif.montant ?? 0,
    mention: tarif.mention ?? "",
    misEnAvant: !!tarif.misEnAvant,
  });
  erreur.value = "";
  dialogEdition.value = true;
}

async function soumettre() {
  if (!form.libelle.trim()) {
    erreur.value = "Le libellé est requis.";
    return;
  }
  enregistrement.value = true;
  erreur.value = "";
  try {
    const corps = {
      libelle: form.libelle,
      montant: Number(form.montant) || 0,
      mention: form.mention,
      misEnAvant: form.misEnAvant,
    };

    if (mode.value === "creation") await api.post("/tarifs/admin", corps);
    else await api.put(`/tarifs/admin/${form.id}`, corps);

    dialogEdition.value = false;
    await charger();
  } catch (err) {
    erreur.value = err.response?.data?.message || "Enregistrement impossible.";
  } finally {
    enregistrement.value = false;
  }
}

async function basculerActif(tarif, valeur) {
  tarif.actif = valeur;
  await api.put(`/tarifs/admin/${tarif._id}`, { actif: valeur });
}

async function reordonner() {
  await api.patch("/tarifs/admin/reorder", { ids: tarifs.value.map((t) => t._id) });
}

function demanderSuppression(tarif) {
  aSupprimer.value = tarif;
  dialogSuppression.value = true;
}

async function confirmerSuppression() {
  suppressionEnCours.value = true;
  try {
    await api.delete(`/tarifs/admin/${aSupprimer.value._id}`);
    dialogSuppression.value = false;
    await charger();
  } finally {
    suppressionEnCours.value = false;
  }
}

const enEuros = (montant) =>
  montant ? `${Number(montant).toLocaleString("fr-FR")} €` : "Gratuit";
</script>

<template>
  <div class="d-flex align-center justify-space-between ga-3 mb-6">
    <div>
      <h1 class="text-h5 mb-1">Tarifs</h1>
      <p class="text-body-2 text-medium-emphasis mb-0">
        Glissez la poignée pour changer l'ordre d'affichage sur le site.
      </p>
    </div>
    <v-btn color="success" prepend-icon="mdi-plus" @click="ouvrirCreation">Nouveau tarif</v-btn>
  </div>

  <draggable
    v-model="tarifs"
    item-key="_id"
    handle=".poignee"
    class="d-flex flex-column ga-3"
    @end="reordonner"
  >
    <template #item="{ element: tarif }">
      <v-card class="ligne pa-4" variant="flat">
        <div class="ligne-info">
          <span class="poignee" aria-label="Glisser pour réordonner">
            <v-icon icon="mdi-drag-vertical" />
          </span>
          <div class="ligne-texte">
            <div class="font-weight-bold d-flex align-center ga-2">
              {{ tarif.libelle }}
              <v-chip v-if="tarif.misEnAvant" size="x-small" color="primary" variant="flat">
                Mis en avant
              </v-chip>
            </div>
            <div class="text-body-2 text-medium-emphasis">{{ tarif.mention }}</div>
          </div>
          <strong class="montant">{{ enEuros(tarif.montant) }}</strong>
        </div>

        <div class="ligne-actions">
          <v-switch
            :model-value="tarif.actif"
            color="success"
            density="compact"
            hide-details
            label="Visible"
            @update:model-value="(v) => basculerActif(tarif, v)"
          />
          <div class="d-flex ga-1">
            <v-btn icon="mdi-pencil-outline" variant="text" color="warning" size="small" aria-label="Modifier" @click="ouvrirEdition(tarif)" />
            <v-btn icon="mdi-delete-outline" variant="text" color="error" size="small" aria-label="Supprimer" @click="demanderSuppression(tarif)" />
          </div>
        </div>
      </v-card>
    </template>
  </draggable>

  <p v-if="!tarifs.length" class="text-medium-emphasis mt-4">Aucun tarif pour l'instant.</p>

  <AppDialog
    v-model="dialogEdition"
    :variant="mode === 'creation' ? 'success' : 'warning'"
    :title="mode === 'creation' ? 'Nouveau tarif' : 'Modifier le tarif'"
    confirm-text="Enregistrer"
    :loading="enregistrement"
    @confirm="soumettre"
  >
    <v-text-field v-model="form.libelle" label="Libellé" placeholder="Adulte" class="mb-2" />
    <v-text-field
      v-model.number="form.montant"
      label="Montant en euros"
      type="number"
      min="0"
      hint="0 affiche « Gratuit » sur le site."
      persistent-hint
      class="mb-4"
    />
    <v-text-field
      v-model="form.mention"
      label="Mention"
      placeholder="Saison complète · tous les créneaux"
      class="mb-2"
    />
    <v-switch
      v-model="form.misEnAvant"
      color="primary"
      label="Mettre cette formule en avant"
      hide-details
    />

    <v-alert v-if="erreur" type="error" variant="tonal" density="compact" class="mt-3">
      {{ erreur }}
    </v-alert>
  </AppDialog>

  <AppDialog
    v-model="dialogSuppression"
    variant="danger"
    title="Supprimer le tarif"
    confirm-text="Supprimer"
    :loading="suppressionEnCours"
    @confirm="confirmerSuppression"
  >
    Cette formule disparaîtra du site. Cette action est irréversible.
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
  flex: 1;
  min-width: 0;
}

.montant {
  flex: none;
  font-size: 1.1rem;
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

<script setup>
/**
 * Les PDF téléchargeables : fiche d'inscription, certificat médical, règlement.
 *
 * Le PLANNING n'apparaît pas ici : il est engendré par le serveur à partir des
 * créneaux, et se met donc à jour tout seul. Le téléverser reviendrait à le
 * laisser diverger du planning affiché sur le site dès la première
 * modification d'horaire.
 */
import { ref, reactive, onMounted } from "vue";
import draggable from "vuedraggable";
import api, { assetUrl } from "../../services/api";
import AppDialog from "../../components/admin/AppDialog.vue";

// Doit rester alignée sur `PDF_MAX_SIZE_MB` côté serveur. Vérifier ici évite
// d'attendre la fin d'un transfert pour apprendre qu'il est refusé.
const MAX_MO = 12;

const documents = ref([]);
const erreur = ref("");
const envoi = ref(false);

const dialogAjout = ref(false);
const form = reactive({ titre: "", description: "", fichier: null });

const dialogEdition = ref(false);
const formEdition = reactive({ id: null, titre: "", description: "", fichier: null });
const enregistrement = ref(false);

const dialogSuppression = ref(false);
const suppressionEnCours = ref(false);
const aSupprimer = ref(null);

async function charger() {
  const { data } = await api.get("/documents/admin");
  documents.value = data;
}
onMounted(charger);

/** « 248 Ko », « 1,2 Mo ». */
function poids(octets) {
  if (!octets) return "—";
  const ko = octets / 1024;
  if (ko < 1024) return `${Math.round(ko)} Ko`;
  return `${(ko / 1024).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Mo`;
}

function tropLourd(fichier) {
  if (fichier && fichier.size > MAX_MO * 1024 * 1024) {
    erreur.value = `Fichier trop volumineux : ${Math.round(
      fichier.size / 1024 / 1024
    )} Mo pour un maximum de ${MAX_MO} Mo.`;
    return true;
  }
  return false;
}

function ouvrirAjout() {
  Object.assign(form, { titre: "", description: "", fichier: null });
  erreur.value = "";
  dialogAjout.value = true;
}

async function ajouter() {
  if (!form.fichier) {
    erreur.value = "Choisissez un fichier PDF.";
    return;
  }
  if (tropLourd(form.fichier)) return;

  envoi.value = true;
  erreur.value = "";
  try {
    const corps = new FormData();
    corps.append("fichier", form.fichier);
    corps.append("titre", form.titre);
    corps.append("description", form.description);

    await api.post("/documents/admin", corps, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    dialogAjout.value = false;
    await charger();
  } catch (err) {
    erreur.value = err.response?.data?.message || "L'envoi a échoué.";
  } finally {
    envoi.value = false;
  }
}

function ouvrirEdition(doc) {
  Object.assign(formEdition, {
    id: doc._id,
    titre: doc.titre,
    description: doc.description ?? "",
    fichier: null,
  });
  erreur.value = "";
  dialogEdition.value = true;
}

async function enregistrer() {
  if (!formEdition.titre.trim()) {
    erreur.value = "Le titre est requis.";
    return;
  }
  if (tropLourd(formEdition.fichier)) return;

  enregistrement.value = true;
  erreur.value = "";
  try {
    await api.put(`/documents/admin/${formEdition.id}`, {
      titre: formEdition.titre,
      description: formEdition.description,
    });

    // Le fichier ne part que s'il a été remplacé : la fiche se modifie seule.
    if (formEdition.fichier) {
      const corps = new FormData();
      corps.append("fichier", formEdition.fichier);
      await api.put(`/documents/admin/${formEdition.id}/fichier`, corps, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    }

    dialogEdition.value = false;
    await charger();
  } catch (err) {
    erreur.value = err.response?.data?.message || "Enregistrement impossible.";
  } finally {
    enregistrement.value = false;
  }
}

async function basculerActif(doc, valeur) {
  doc.actif = valeur;
  await api.put(`/documents/admin/${doc._id}`, { actif: valeur });
}

async function reordonner() {
  await api.patch("/documents/admin/reorder", { ids: documents.value.map((d) => d._id) });
}

function demanderSuppression(doc) {
  aSupprimer.value = doc;
  dialogSuppression.value = true;
}

async function confirmerSuppression() {
  suppressionEnCours.value = true;
  try {
    await api.delete(`/documents/admin/${aSupprimer.value._id}`);
    dialogSuppression.value = false;
    await charger();
  } finally {
    suppressionEnCours.value = false;
  }
}
</script>

<template>
  <div class="d-flex align-center justify-space-between ga-3 mb-6">
    <div>
      <h1 class="text-h5 mb-1">Documents</h1>
      <p class="text-body-2 text-medium-emphasis mb-0">
        Les PDF proposés au téléchargement sur le site.
      </p>
    </div>
    <v-btn color="success" prepend-icon="mdi-file-plus-outline" @click="ouvrirAjout">
      Ajouter un PDF
    </v-btn>
  </div>

  <v-alert type="info" variant="tonal" density="compact" class="mb-6">
    Le planning n'est pas dans cette liste : il est fabriqué automatiquement à
    partir des créneaux et reste donc toujours à jour.
  </v-alert>

  <v-alert v-if="erreur && !dialogAjout && !dialogEdition" type="error" variant="tonal" density="compact" class="mb-6">
    {{ erreur }}
  </v-alert>

  <draggable
    v-model="documents"
    item-key="_id"
    handle=".poignee"
    class="d-flex flex-column ga-3"
    @end="reordonner"
  >
    <template #item="{ element: doc }">
      <v-card class="ligne pa-4" variant="flat">
        <div class="ligne-info">
          <span class="poignee" aria-label="Glisser pour réordonner">
            <v-icon icon="mdi-drag-vertical" />
          </span>
          <v-icon icon="mdi-file-pdf-box" size="34" color="error" />
          <div class="ligne-texte">
            <div class="font-weight-bold">{{ doc.titre }}</div>
            <div class="text-body-2 text-medium-emphasis">
              {{ poids(doc.taille) }}<template v-if="doc.description"> · {{ doc.description }}</template>
            </div>
          </div>
        </div>

        <div class="ligne-actions">
          <v-switch
            :model-value="doc.actif"
            color="success"
            density="compact"
            hide-details
            label="Visible"
            @update:model-value="(v) => basculerActif(doc, v)"
          />
          <div class="d-flex ga-1">
            <v-btn
              icon="mdi-open-in-new"
              variant="text"
              size="small"
              aria-label="Ouvrir le PDF"
              :href="assetUrl(doc.url)"
              target="_blank"
              rel="noopener"
            />
            <v-btn icon="mdi-pencil-outline" variant="text" color="warning" size="small" aria-label="Modifier" @click="ouvrirEdition(doc)" />
            <v-btn icon="mdi-delete-outline" variant="text" color="error" size="small" aria-label="Supprimer" @click="demanderSuppression(doc)" />
          </div>
        </div>
      </v-card>
    </template>
  </draggable>

  <p v-if="!documents.length" class="text-medium-emphasis mt-4">Aucun document pour l'instant.</p>

  <AppDialog
    v-model="dialogAjout"
    variant="success"
    title="Ajouter un PDF"
    confirm-text="Envoyer"
    :loading="envoi"
    @confirm="ajouter"
  >
    <v-text-field
      v-model="form.titre"
      label="Titre"
      placeholder="Fiche d'inscription"
      hint="Laissé vide, le nom du fichier est utilisé."
      persistent-hint
      class="mb-4"
    />
    <v-text-field
      v-model="form.description"
      label="Précision"
      placeholder="2 pages, à remettre au premier cours"
      class="mb-2"
    />
    <v-file-input
      label="Fichier PDF"
      accept="application/pdf"
      prepend-icon="mdi-file-pdf-box"
      @update:model-value="(f) => (form.fichier = f || null)"
    />

    <v-alert v-if="erreur" type="error" variant="tonal" density="compact" class="mt-2">
      {{ erreur }}
    </v-alert>
  </AppDialog>

  <AppDialog
    v-model="dialogEdition"
    variant="warning"
    title="Modifier le document"
    confirm-text="Enregistrer"
    :loading="enregistrement"
    @confirm="enregistrer"
  >
    <v-text-field v-model="formEdition.titre" label="Titre" class="mb-4" />
    <v-text-field v-model="formEdition.description" label="Précision" class="mb-2" />
    <v-file-input
      label="Remplacer le fichier"
      accept="application/pdf"
      prepend-icon="mdi-file-pdf-box"
      hint="Facultatif : sans nouveau fichier, seul le texte est modifié."
      persistent-hint
      @update:model-value="(f) => (formEdition.fichier = f || null)"
    />

    <v-alert v-if="erreur" type="error" variant="tonal" density="compact" class="mt-3">
      {{ erreur }}
    </v-alert>
  </AppDialog>

  <AppDialog
    v-model="dialogSuppression"
    variant="danger"
    title="Supprimer le document"
    confirm-text="Supprimer"
    :loading="suppressionEnCours"
    @confirm="confirmerSuppression"
  >
    Le PDF sera définitivement supprimé du serveur. Cette action est irréversible.
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

<script setup>
/**
 * La boutique : les rayons et les articles.
 *
 * Deux niveaux sur le même écran, parce qu'ils ne se comprennent que
 * ensemble : c'est le RAYON qui porte la grille de tailles, et l'article qui
 * porte la quantité pour chacune. Séparer les deux écrans obligerait à faire
 * l'aller-retour à chaque création d'article.
 *
 * Les photos ne s'ajoutent qu'à un article DÉJÀ enregistré : le fichier a
 * besoin d'une fiche à laquelle se rattacher. C'est la même règle que la photo
 * d'un coach, et l'interface le dit plutôt que de griser un bouton sans
 * explication.
 */
import { ref, reactive, computed, onMounted } from "vue";
import draggable from "vuedraggable";
import api, { assetUrl } from "../../services/api";
import AppDialog from "../../components/admin/AppDialog.vue";

const PHOTOS_MAX = 8;

const categories = ref([]);
const produits = ref([]);
const erreur = ref("");
const chargement = ref(true);

const nomCategorie = (id) => categories.value.find((c) => c._id === id)?.nom ?? "—";
const taillesDe = (id) => categories.value.find((c) => c._id === id)?.tailles ?? [];

const totalStock = (p) => (p.stock ?? []).reduce((t, s) => t + (s.quantite || 0), 0);

async function charger() {
  const [c, p] = await Promise.all([
    api.get("/boutique/admin/categories"),
    api.get("/boutique/admin/produits"),
  ]);
  categories.value = c.data;
  produits.value = p.data;
  chargement.value = false;
}
onMounted(charger);

/* ------------------------------------------------------------------ *
 * Rayons
 * ------------------------------------------------------------------ */

const dialogRayon = ref(false);
const modeRayon = ref("creation");
const enregistrementRayon = ref(false);
// Les tailles se saisissent sur une ligne, séparées par des virgules : une
// liste de champs pour « A1, A2, A3, A4 » serait pénible à réordonner.
const formRayon = reactive({ id: null, nom: "", tailles: "" });

function ouvrirCreationRayon() {
  modeRayon.value = "creation";
  Object.assign(formRayon, { id: null, nom: "", tailles: "A1, A2, A3, A4" });
  erreur.value = "";
  dialogRayon.value = true;
}

function ouvrirEditionRayon(c) {
  modeRayon.value = "edition";
  Object.assign(formRayon, { id: c._id, nom: c.nom, tailles: c.tailles.join(", ") });
  erreur.value = "";
  dialogRayon.value = true;
}

async function soumettreRayon() {
  const tailles = formRayon.tailles.split(",").map((t) => t.trim()).filter(Boolean);
  if (!formRayon.nom.trim()) {
    erreur.value = "Le nom du rayon est requis.";
    return;
  }
  if (!tailles.length) {
    erreur.value = "Indiquez au moins une taille.";
    return;
  }

  enregistrementRayon.value = true;
  erreur.value = "";
  try {
    const corps = { nom: formRayon.nom, tailles };
    if (modeRayon.value === "creation") await api.post("/boutique/admin/categories", corps);
    else await api.put(`/boutique/admin/categories/${formRayon.id}`, corps);

    dialogRayon.value = false;
    await charger();
  } catch (err) {
    erreur.value = err.response?.data?.message || "Enregistrement impossible.";
  } finally {
    enregistrementRayon.value = false;
  }
}

async function basculerRayon(c, valeur) {
  c.actif = valeur;
  await api.put(`/boutique/admin/categories/${c._id}`, { actif: valeur });
}

async function reordonnerRayons() {
  await api.patch("/boutique/admin/categories/reorder", {
    ids: categories.value.map((c) => c._id),
  });
}

const dialogSuppressionRayon = ref(false);
const rayonASupprimer = ref(null);

function demanderSuppressionRayon(c) {
  rayonASupprimer.value = c;
  erreur.value = "";
  dialogSuppressionRayon.value = true;
}

async function confirmerSuppressionRayon() {
  try {
    await api.delete(`/boutique/admin/categories/${rayonASupprimer.value._id}`);
    dialogSuppressionRayon.value = false;
    await charger();
  } catch (err) {
    erreur.value = err.response?.data?.message || "Suppression impossible.";
  }
}

/* ------------------------------------------------------------------ *
 * Articles
 * ------------------------------------------------------------------ */

const dialogArticle = ref(false);
const modeArticle = ref("creation");
const enregistrementArticle = ref(false);
const envoiPhotos = ref(false);
const champPhotos = ref(null);

const formArticle = reactive({
  id: null,
  nom: "",
  categorie: null,
  description: "",
  prix: 0,
  caracteristiques: [],
  stock: [],
  photos: [],
  misEnAvant: false,
});

// La grille de tailles suit le rayon choisi : changer de rayon dans le
// formulaire doit refaire les lignes de stock, pas les garder.
const taillesFormulaire = computed(() => taillesDe(formArticle.categorie));

function synchroniserStock() {
  const saisi = new Map(formArticle.stock.map((s) => [s.taille, s.quantite]));
  formArticle.stock = taillesFormulaire.value.map((taille) => ({
    taille,
    quantite: saisi.get(taille) ?? 0,
  }));
}

function ouvrirCreationArticle() {
  modeArticle.value = "creation";
  Object.assign(formArticle, {
    id: null,
    nom: "",
    categorie: categories.value[0]?._id ?? null,
    description: "",
    prix: 0,
    caracteristiques: [],
    stock: [],
    photos: [],
    misEnAvant: false,
  });
  synchroniserStock();
  erreur.value = "";
  dialogArticle.value = true;
}

function ouvrirEditionArticle(p) {
  modeArticle.value = "edition";
  Object.assign(formArticle, {
    id: p._id,
    nom: p.nom,
    categorie: p.categorie,
    description: p.description ?? "",
    prix: p.prix ?? 0,
    caracteristiques: JSON.parse(JSON.stringify(p.caracteristiques ?? [])),
    stock: JSON.parse(JSON.stringify(p.stock ?? [])),
    photos: [...(p.photos ?? [])],
    misEnAvant: Boolean(p.misEnAvant),
  });
  synchroniserStock();
  erreur.value = "";
  dialogArticle.value = true;
}

function ajouterCaracteristique() {
  if (formArticle.caracteristiques.length >= 10) return;
  formArticle.caracteristiques.push({ cle: "", valeur: "" });
}

async function soumettreArticle() {
  if (!formArticle.nom.trim()) {
    erreur.value = "Le nom de l'article est requis.";
    return;
  }
  if (!formArticle.categorie) {
    erreur.value = "Créez d'abord un rayon.";
    return;
  }

  enregistrementArticle.value = true;
  erreur.value = "";
  try {
    const corps = {
      nom: formArticle.nom,
      categorie: formArticle.categorie,
      description: formArticle.description,
      prix: Number(formArticle.prix) || 0,
      caracteristiques: formArticle.caracteristiques.filter((c) => c.cle.trim()),
      stock: formArticle.stock,
      misEnAvant: formArticle.misEnAvant,
    };

    let article;
    if (modeArticle.value === "creation") {
      ({ data: article } = await api.post("/boutique/admin/produits", corps));
      // On reste dans le dialogue, en mode édition : les photos ont besoin
      // d'une fiche enregistrée, autant enchaîner sans rouvrir.
      modeArticle.value = "edition";
      formArticle.id = article._id;
      formArticle.photos = article.photos ?? [];
    } else {
      ({ data: article } = await api.put(`/boutique/admin/produits/${formArticle.id}`, corps));
      dialogArticle.value = false;
    }

    await charger();
  } catch (err) {
    erreur.value = err.response?.data?.message || "Enregistrement impossible.";
  } finally {
    enregistrementArticle.value = false;
  }
}

async function basculerArticle(p, valeur) {
  p.actif = valeur;
  await api.put(`/boutique/admin/produits/${p._id}`, { actif: valeur });
}

async function reordonnerArticles() {
  await api.patch("/boutique/admin/produits/reorder", {
    ids: produits.value.map((p) => p._id),
  });
}

const dialogSuppressionArticle = ref(false);
const articleASupprimer = ref(null);

function demanderSuppressionArticle(p) {
  articleASupprimer.value = p;
  dialogSuppressionArticle.value = true;
}

async function confirmerSuppressionArticle() {
  await api.delete(`/boutique/admin/produits/${articleASupprimer.value._id}`);
  dialogSuppressionArticle.value = false;
  await charger();
}

/* ------------------------------------------------------------------ *
 * Photos
 * ------------------------------------------------------------------ */

function choisirPhotos() {
  champPhotos.value.click();
}

async function surChoixPhotos(event) {
  const fichiers = Array.from(event.target.files ?? []);
  event.target.value = "";
  if (!fichiers.length) return;

  envoiPhotos.value = true;
  erreur.value = "";
  try {
    const corps = new FormData();
    fichiers.forEach((f) => corps.append("photos", f));
    const { data } = await api.post(`/boutique/admin/produits/${formArticle.id}/photos`, corps, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    formArticle.photos = data.photos;
    await charger();
  } catch (err) {
    erreur.value = err.response?.data?.message || "Les photos n'ont pas pu être envoyées.";
  } finally {
    envoiPhotos.value = false;
  }
}

async function retirerPhoto(url) {
  const { data } = await api.delete(`/boutique/admin/produits/${formArticle.id}/photos`, {
    data: { url },
  });
  formArticle.photos = data.photos;
  await charger();
}

async function reordonnerPhotos() {
  const { data } = await api.patch(`/boutique/admin/produits/${formArticle.id}/photos`, {
    urls: formArticle.photos,
  });
  formArticle.photos = data.photos;
  await charger();
}
</script>

<template>
  <div class="d-flex align-center justify-space-between ga-3 mb-2">
    <div>
      <h1 class="text-h5 mb-1">Boutique</h1>
      <p class="text-body-2 text-medium-emphasis mb-0">
        Une vitrine : le visiteur voit les tailles disponibles et vient acheter
        au club. Aucun paiement en ligne.
      </p>
    </div>
  </div>

  <v-skeleton-loader v-if="chargement" type="card" />

  <template v-else>
    <!-- Rayons -->
    <v-card class="pa-6 mb-6" variant="flat">
      <div class="d-flex align-center justify-space-between ga-3 mb-2">
        <h2 class="text-subtitle-1 font-weight-bold mb-0">Rayons</h2>
        <v-btn size="small" variant="outlined" prepend-icon="mdi-plus" @click="ouvrirCreationRayon">
          Nouveau rayon
        </v-btn>
      </div>
      <p class="text-body-2 text-medium-emphasis mb-4">
        C'est le rayon qui porte la grille de tailles : A1–A4 pour les kimonos,
        S–XL pour le no-gi. Tous ses articles proposent donc exactement les
        mêmes tailles.
      </p>

      <draggable
        v-model="categories"
        item-key="_id"
        handle=".poignee"
        class="d-flex flex-column ga-2"
        @end="reordonnerRayons"
      >
        <template #item="{ element: c }">
          <div class="rayon">
            <span class="poignee" aria-label="Glisser pour réordonner">
              <v-icon icon="mdi-drag-vertical" />
            </span>
            <div class="rayon-texte">
              <div class="font-weight-bold">{{ c.nom }}</div>
              <div class="text-body-2 text-medium-emphasis">{{ c.tailles.join(" · ") }}</div>
            </div>
            <v-switch
              :model-value="c.actif"
              color="success"
              density="compact"
              hide-details
              label="Visible"
              @update:model-value="(v) => basculerRayon(c, v)"
            />
            <div class="d-flex ga-1">
              <v-btn icon="mdi-pencil-outline" variant="text" color="warning" size="small" aria-label="Modifier" @click="ouvrirEditionRayon(c)" />
              <v-btn icon="mdi-delete-outline" variant="text" color="error" size="small" aria-label="Supprimer" @click="demanderSuppressionRayon(c)" />
            </div>
          </div>
        </template>
      </draggable>

      <p v-if="!categories.length" class="text-medium-emphasis mt-2 mb-0">
        Aucun rayon. Créez-en un avant d'ajouter des articles.
      </p>
    </v-card>

    <!-- Articles -->
    <div class="d-flex align-center justify-space-between ga-3 mb-4">
      <div>
        <h2 class="text-subtitle-1 font-weight-bold mb-1">Articles</h2>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Glissez la poignée pour changer l'ordre d'affichage sur le site.
        </p>
      </div>
      <v-btn
        color="success"
        prepend-icon="mdi-plus"
        :disabled="!categories.length"
        @click="ouvrirCreationArticle"
      >
        Nouvel article
      </v-btn>
    </div>

    <draggable
      v-model="produits"
      item-key="_id"
      handle=".poignee"
      class="d-flex flex-column ga-3"
      @end="reordonnerArticles"
    >
      <template #item="{ element: p }">
        <v-card class="ligne pa-4" variant="flat">
          <div class="ligne-info">
            <span class="poignee" aria-label="Glisser pour réordonner">
              <v-icon icon="mdi-drag-vertical" />
            </span>
            <v-avatar rounded size="56">
              <v-img v-if="p.photos?.length" :src="assetUrl(p.photos[0])" cover />
              <v-icon v-else icon="mdi-image-outline" />
            </v-avatar>
            <div class="ligne-texte">
              <div class="font-weight-bold">
                {{ p.nom }}
                <v-chip v-if="p.misEnAvant" size="x-small" color="primary" class="ml-1">Accueil</v-chip>
              </div>
              <div class="text-body-2 text-medium-emphasis">
                {{ nomCategorie(p.categorie) }} · {{ p.prix }} €
                <template v-if="totalStock(p)"> · {{ totalStock(p) }} en stock</template>
                <template v-else> · <span class="text-error">épuisé</span></template>
              </div>
            </div>
          </div>

          <div class="ligne-actions">
            <v-switch
              :model-value="p.actif"
              color="success"
              density="compact"
              hide-details
              label="Visible"
              @update:model-value="(v) => basculerArticle(p, v)"
            />
            <div class="d-flex ga-1">
              <v-btn icon="mdi-pencil-outline" variant="text" color="warning" size="small" aria-label="Modifier" @click="ouvrirEditionArticle(p)" />
              <v-btn icon="mdi-delete-outline" variant="text" color="error" size="small" aria-label="Supprimer" @click="demanderSuppressionArticle(p)" />
            </div>
          </div>
        </v-card>
      </template>
    </draggable>

    <p v-if="!produits.length" class="text-medium-emphasis mt-4">Aucun article pour l'instant.</p>
  </template>

  <!-- Dialogue rayon -->
  <AppDialog
    v-model="dialogRayon"
    :variant="modeRayon === 'creation' ? 'success' : 'warning'"
    :title="modeRayon === 'creation' ? 'Nouveau rayon' : 'Modifier le rayon'"
    confirm-text="Enregistrer"
    :loading="enregistrementRayon"
    @confirm="soumettreRayon"
  >
    <v-text-field v-model="formRayon.nom" label="Nom du rayon" placeholder="Gi, No-gi, Ceintures…" class="mb-2" />
    <v-text-field
      v-model="formRayon.tailles"
      label="Tailles"
      hint="Séparées par des virgules, dans l'ordre d'affichage voulu."
      persistent-hint
    />
    <v-alert v-if="modeRayon === 'edition'" type="info" variant="tonal" density="compact" class="mt-4">
      Retirer une taille la fait disparaître des fiches du rayon. Les quantités
      des tailles conservées ne bougent pas.
    </v-alert>
    <v-alert v-if="erreur" type="error" variant="tonal" density="compact" class="mt-2">{{ erreur }}</v-alert>
  </AppDialog>

  <AppDialog
    v-model="dialogSuppressionRayon"
    variant="danger"
    title="Supprimer le rayon"
    confirm-text="Supprimer"
    @confirm="confirmerSuppressionRayon"
  >
    Le rayon disparaîtra des filtres de la boutique. Un rayon qui contient
    encore des articles ne peut pas être supprimé.
    <v-alert v-if="erreur" type="error" variant="tonal" density="compact" class="mt-3">{{ erreur }}</v-alert>
  </AppDialog>

  <!-- Dialogue article -->
  <AppDialog
    v-model="dialogArticle"
    :variant="modeArticle === 'creation' ? 'success' : 'warning'"
    :title="modeArticle === 'creation' ? 'Nouvel article' : 'Modifier l\'article'"
    :confirm-text="modeArticle === 'creation' ? 'Créer et ajouter les photos' : 'Enregistrer'"
    :loading="enregistrementArticle"
    max-width="720"
    @confirm="soumettreArticle"
  >
    <v-text-field v-model="formArticle.nom" label="Nom" class="mb-2" />

    <div class="d-flex ga-3 mb-2">
      <v-select
        v-model="formArticle.categorie"
        :items="categories"
        item-title="nom"
        item-value="_id"
        label="Rayon"
        class="flex-grow-1"
        @update:model-value="synchroniserStock"
      />
      <v-text-field
        v-model.number="formArticle.prix"
        label="Prix"
        type="number"
        min="0"
        suffix="€"
        style="max-width: 140px"
      />
    </div>

    <v-textarea v-model="formArticle.description" label="Description" rows="3" class="mb-2" />

    <v-switch
      v-model="formArticle.misEnAvant"
      color="primary"
      density="compact"
      hide-details
      label="Afficher dans la bande de l'accueil (4 articles au maximum)"
      class="mb-4"
    />

    <!-- Stock -->
    <h3 class="text-subtitle-2 font-weight-bold mb-1">Stock par taille</h3>
    <p class="text-body-2 text-medium-emphasis mb-3">
      À zéro, la taille s'affiche barrée sur le site. Toutes à zéro, l'article
      entier passe en « épuisé » — vous n'avez rien d'autre à basculer.
    </p>
    <div class="grille-stock mb-6">
      <v-text-field
        v-for="s in formArticle.stock"
        :key="s.taille"
        v-model.number="s.quantite"
        :label="s.taille"
        type="number"
        min="0"
        density="compact"
        hide-details
      />
    </div>

    <!-- Caractéristiques -->
    <div class="d-flex align-center justify-space-between ga-3 mb-2">
      <h3 class="text-subtitle-2 font-weight-bold mb-0">Caractéristiques</h3>
      <v-btn size="small" variant="outlined" prepend-icon="mdi-plus" :disabled="formArticle.caracteristiques.length >= 10" @click="ajouterCaracteristique">
        Ajouter
      </v-btn>
    </div>
    <p class="text-body-2 text-medium-emphasis mb-3">
      Libres, parce que ce qui compte sur un kimono (le grammage) n'a aucun sens
      sur une ceinture (le nombre de coutures).
    </p>
    <div v-for="(c, i) in formArticle.caracteristiques" :key="i" class="ligne-carac mb-2">
      <v-text-field v-model="c.cle" label="Intitulé" placeholder="Toile" density="compact" hide-details />
      <v-text-field v-model="c.valeur" label="Valeur" placeholder="Perlée 550 g/m²" density="compact" hide-details />
      <v-btn icon="mdi-close" variant="text" size="small" aria-label="Retirer" @click="formArticle.caracteristiques.splice(i, 1)" />
    </div>

    <!-- Photos -->
    <h3 class="text-subtitle-2 font-weight-bold mt-6 mb-1">Photos</h3>
    <p v-if="modeArticle === 'creation'" class="text-body-2 text-medium-emphasis mb-0">
      Enregistrez d'abord l'article : une photo a besoin d'une fiche à laquelle
      se rattacher. Le formulaire reste ouvert juste après.
    </p>
    <template v-else>
      <p class="text-body-2 text-medium-emphasis mb-3">
        La première sert de vignette dans la grille. Glissez pour changer
        l'ordre. {{ PHOTOS_MAX }} au maximum.
      </p>

      <draggable
        v-model="formArticle.photos"
        item-key="self"
        class="d-flex flex-wrap ga-2 mb-3"
        @end="reordonnerPhotos"
      >
        <template #item="{ element: url }">
          <div class="photo">
            <img :src="assetUrl(url)" alt="" />
            <v-btn
              icon="mdi-close"
              size="x-small"
              color="error"
              variant="flat"
              class="photo-retirer"
              aria-label="Retirer la photo"
              @click="retirerPhoto(url)"
            />
          </div>
        </template>
      </draggable>

      <input
        ref="champPhotos"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        class="d-none"
        @change="surChoixPhotos"
      />
      <v-btn
        variant="outlined"
        prepend-icon="mdi-image-plus"
        :loading="envoiPhotos"
        :disabled="formArticle.photos.length >= PHOTOS_MAX"
        @click="choisirPhotos"
      >
        Ajouter des photos
      </v-btn>
    </template>

    <v-alert v-if="erreur" type="error" variant="tonal" density="compact" class="mt-4">{{ erreur }}</v-alert>
  </AppDialog>

  <AppDialog
    v-model="dialogSuppressionArticle"
    variant="danger"
    title="Supprimer l'article"
    confirm-text="Supprimer"
    @confirm="confirmerSuppressionArticle"
  >
    Ses photos seront supprimées avec lui. Cette action est irréversible.
  </AppDialog>
</template>

<style scoped>
.rayon,
.ligne {
  background: var(--paper);
  border: 1px solid var(--line);
  display: flex;
  align-items: center;
  gap: 1rem;
}

.rayon {
  padding: 0.6rem 0.9rem;
}

.rayon-texte,
.ligne-texte {
  flex: 1 1 auto;
  min-width: 0;
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

.ligne-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 0 0 auto;
}

.grille-stock {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: 0.6rem;
}

.ligne-carac {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  align-items: center;
  gap: 0.6rem;
}

.photo {
  position: relative;
  width: 84px;
  aspect-ratio: 4 / 5;
  border: 1px solid var(--line);
  overflow: hidden;
  cursor: grab;
}

.photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.photo-retirer {
  position: absolute;
  top: 2px;
  right: 2px;
}

@media (max-width: 600px) {
  .rayon,
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

  .ligne-carac {
    grid-template-columns: 1fr auto;
  }
}
</style>

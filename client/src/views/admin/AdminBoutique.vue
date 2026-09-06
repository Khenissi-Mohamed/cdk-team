<script setup>
/**
 * La boutique : les rayons, puis les articles sous DEUX vues au choix.
 *
 *   - « Tableau »  : tout le catalogue en lignes, une colonne par taille, les
 *                    quantités modifiables sur place. C'est la vue du geste
 *                    quotidien — corriger un stock après une vente — qui se
 *                    fait bien plus souvent que créer un article.
 *   - « Fiches »   : la liste à gauche, la fiche complète à droite, toujours
 *                    ouverte. C'est la vue du travail de fond : description,
 *                    caractéristiques, photos.
 *
 * Les deux se complètent au lieu de se doubler : le tableau n'édite QUE le
 * stock et la visibilité, et son bouton « Modifier » bascule vers la fiche.
 * Il n'y a donc plus de fenêtre modale pour les articles — et plus le détour
 * « créez d'abord, ajoutez les photos ensuite » qu'elle imposait.
 *
 * Le choix de vue est retenu dans le navigateur : on ne le repose pas à chaque
 * visite.
 */
import { ref, reactive, computed, watch, onMounted } from "vue";
import draggable from "vuedraggable";
import api, { assetUrl } from "../../services/api";
import AppDialog from "../../components/admin/AppDialog.vue";

const PHOTOS_MAX = 8;
const CLE_VUE = "admin_boutique_vue";

const categories = ref([]);
const produits = ref([]);
const erreur = ref("");
const chargement = ref(true);
const mobileOnglet = ref("catalogue");
const mobileCategorie = ref("tout");
const stockCategorie = ref("tout");
const mobileEdition = ref(false);
const etapeFiche = ref(1);
const stockOuvertId = ref(null);

const vue = ref(localStorage.getItem(CLE_VUE) === "fiches" ? "fiches" : "tableau");
watch(vue, (v) => localStorage.setItem(CLE_VUE, v));

const nomCategorie = (id) => categories.value.find((c) => c._id === id)?.nom ?? "—";
const taillesDe = (id) => categories.value.find((c) => c._id === id)?.tailles ?? [];
const totalStock = (p) => (p.stock ?? []).reduce((t, s) => t + (s.quantite || 0), 0);

/**
 * Le tableau est groupé par rayon, et non d'un seul tenant : c'est le rayon
 * qui porte la grille de tailles, donc un tableau unique aurait des colonnes
 * sans en-tête commun (A1…A4 pour un kimono, S…XL pour un rashguard). Grouper
 * rend cette dépendance évidente — c'est précisément ce que l'écran précédent
 * expliquait mal.
 */
const groupes = ref([]);

function construireGroupes() {
  groupes.value = categories.value.map((categorie) => ({
    categorie,
    items: produits.value.filter((p) => p.categorie === categorie._id),
  }));
}

async function charger() {
  const [c, p] = await Promise.all([
    api.get("/boutique/admin/categories"),
    api.get("/boutique/admin/produits"),
  ]);
  categories.value = c.data;
  produits.value = p.data;
  construireGroupes();
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
    // La grille de tailles a pu changer : la fiche ouverte doit suivre, sinon
    // elle proposerait des tailles que le rayon ne connaît plus.
    if (fiche.id) rouvrirFiche(fiche.id);
  } catch (err) {
    erreur.value = err.response?.data?.message || "Enregistrement impossible.";
  } finally {
    enregistrementRayon.value = false;
  }
}

async function basculerRayon(c, valeur) {
  const precedent = c.actif;
  c.actif = valeur;
  erreur.value = "";
  try {
    await api.put(`/boutique/admin/categories/${c._id}`, { actif: valeur });
  } catch (err) {
    c.actif = precedent;
    erreur.value = err.response?.data?.message || "La visibilité du rayon n'a pas pu être enregistrée.";
  }
}

async function reordonnerRayons() {
  await api.patch("/boutique/admin/categories/reorder", {
    ids: categories.value.map((c) => c._id),
  });
  construireGroupes();
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
 * Vue tableau — stock et visibilité seulement
 * ------------------------------------------------------------------ */

// Les identifiants dont la sauvegarde vient d'aboutir, pour afficher une coche
// un court instant. Sans ce retour, une saisie qui part toute seule laisse
// exactement le même écran qu'une saisie perdue.
const enregistres = ref(new Set());

function signaler(id) {
  enregistres.value = new Set(enregistres.value).add(id);
  setTimeout(() => {
    const copie = new Set(enregistres.value);
    copie.delete(id);
    enregistres.value = copie;
  }, 1800);
}

function quantite(p, taille) {
  return p.stock.find((s) => s.taille === taille)?.quantite ?? 0;
}

async function changerQuantite(p, taille, valeur) {
  const n = Math.max(0, Math.round(Number(valeur) || 0));
  const ligne = p.stock.find((s) => s.taille === taille);
  if (ligne) ligne.quantite = n;
  else p.stock.push({ taille, quantite: n });

  erreur.value = "";
  try {
    await api.put(`/boutique/admin/produits/${p._id}`, { stock: p.stock });
    signaler(p._id);
  } catch (err) {
    erreur.value = err.response?.data?.message || "La quantité n'a pas pu être enregistrée.";
  }
}

/**
 * Réordonnancement à l'intérieur d'un rayon.
 *
 * L'ordre stocké est GLOBAL — c'est lui qui range la grille du site, filtres
 * compris. Un glissement dans un groupe ne doit donc pas envoyer les seuls
 * identifiants du groupe : on réinjecte le nouvel ordre local aux positions
 * que le groupe occupait déjà dans la liste complète.
 */
async function reordonnerGroupe(groupe) {
  const idsGroupe = groupe.items.map((p) => p._id);
  const global = produits.value.map((p) => p._id);
  const positions = [];
  produits.value.forEach((p, i) => {
    if (p.categorie === groupe.categorie._id) positions.push(i);
  });
  positions.forEach((pos, k) => (global[pos] = idsGroupe[k]));

  await api.patch("/boutique/admin/produits/reorder", { ids: global });
  await charger();
}

async function basculerArticle(p, valeur) {
  p.actif = valeur;
  await api.put(`/boutique/admin/produits/${p._id}`, { actif: valeur });
}

/* ------------------------------------------------------------------ *
 * Vue fiches — la liste et le formulaire complet
 * ------------------------------------------------------------------ */

const recherche = ref("");
const enregistrementFiche = ref(false);
const envoiPhotos = ref(false);
const champPhotos = ref(null);
const ficheEnregistree = ref(false);

const fiche = reactive({
  id: null,
  nom: "",
  categorie: null,
  description: "",
  prix: 0,
  caracteristiques: [],
  stock: [],
  photos: [],
  misEnAvant: false,
  actif: true,
});

const listeFiltree = computed(() => {
  const q = recherche.value.trim().toLowerCase();
  if (!q) return produits.value;
  return produits.value.filter(
    (p) =>
      p.nom.toLowerCase().includes(q) ||
      nomCategorie(p.categorie).toLowerCase().includes(q)
  );
});

const produitsMobiles = computed(() =>
  listeFiltree.value.filter(
    (produit) => mobileCategorie.value === "tout" || produit.categorie === mobileCategorie.value
  )
);

const produitsStockMobiles = computed(() =>
  produits.value.filter(
    (produit) => stockCategorie.value === "tout" || produit.categorie === stockCategorie.value
  )
);

const taillesFiche = computed(() => taillesDe(fiche.categorie));

// La grille de tailles suit le rayon : en changer doit refaire les lignes de
// stock, pas les garder.
function synchroniserStockFiche() {
  const saisi = new Map(fiche.stock.map((s) => [s.taille, s.quantite]));
  fiche.stock = taillesFiche.value.map((taille) => ({
    taille,
    quantite: saisi.get(taille) ?? 0,
  }));
}

function remplirFiche(p) {
  Object.assign(fiche, {
    id: p._id,
    nom: p.nom,
    categorie: p.categorie,
    description: p.description ?? "",
    prix: p.prix ?? 0,
    caracteristiques: JSON.parse(JSON.stringify(p.caracteristiques ?? [])),
    stock: JSON.parse(JSON.stringify(p.stock ?? [])),
    photos: [...(p.photos ?? [])],
    misEnAvant: Boolean(p.misEnAvant),
    actif: p.actif !== false,
  });
  synchroniserStockFiche();
  erreur.value = "";
  ficheEnregistree.value = false;
}

function selectionner(p) {
  remplirFiche(p);
}

function rouvrirFiche(id) {
  const p = produits.value.find((x) => x._id === id);
  if (p) remplirFiche(p);
}

function nouvelArticle() {
  Object.assign(fiche, {
    id: null,
    nom: "",
    categorie: categories.value[0]?._id ?? null,
    description: "",
    prix: 0,
    caracteristiques: [],
    stock: [],
    photos: [],
    misEnAvant: false,
    actif: true,
  });
  synchroniserStockFiche();
  erreur.value = "";
  ficheEnregistree.value = false;
  vue.value = "fiches";
}

/** Depuis le tableau : on ouvre la fiche complète plutôt qu'une fenêtre. */
function ouvrirDansFiche(p) {
  selectionner(p);
  vue.value = "fiches";
}

function ouvrirMobile(p, etape = 1) {
  remplirFiche(p);
  etapeFiche.value = etape;
  mobileEdition.value = true;
}

function nouvelArticleMobile() {
  nouvelArticle();
  etapeFiche.value = 1;
  mobileEdition.value = true;
}

function fermerMobile() {
  mobileEdition.value = false;
}

function demanderSuppressionMobile(p) {
  remplirFiche(p);
  dialogSuppressionArticle.value = true;
}

function ajusterStock(p, taille, delta) {
  changerQuantite(p, taille, quantite(p, taille) + delta);
}

const totalArticlesVisibles = computed(() => produits.value.filter((p) => p.actif).length);
const totalRuptures = computed(() => produits.value.filter((p) => totalStock(p) === 0).length);
const totalMasques = computed(() => produits.value.filter((p) => !p.actif).length);

function ajouterCaracteristique() {
  if (fiche.caracteristiques.length >= 10) return;
  fiche.caracteristiques.push({ cle: "", valeur: "" });
}

async function enregistrerFiche() {
  if (!fiche.nom.trim()) {
    erreur.value = "Le nom de l'article est requis.";
    return;
  }
  if (!fiche.categorie) {
    erreur.value = "Créez d'abord un rayon.";
    return;
  }

  enregistrementFiche.value = true;
  erreur.value = "";
  try {
    const corps = {
      nom: fiche.nom,
      categorie: fiche.categorie,
      description: fiche.description,
      prix: Number(fiche.prix) || 0,
      caracteristiques: fiche.caracteristiques.filter((c) => c.cle.trim()),
      stock: fiche.stock,
      misEnAvant: fiche.misEnAvant,
      actif: fiche.actif,
    };

    let article;
    if (fiche.id) ({ data: article } = await api.put(`/boutique/admin/produits/${fiche.id}`, corps));
    else ({ data: article } = await api.post("/boutique/admin/produits", corps));

    await charger();
    remplirFiche(article);
    ficheEnregistree.value = true;
    if (mobileEdition.value) {
      mobileEdition.value = false;
      mobileOnglet.value = "catalogue";
    }
    setTimeout(() => (ficheEnregistree.value = false), 2500);
  } catch (err) {
    erreur.value = err.response?.data?.message || "Enregistrement impossible.";
  } finally {
    enregistrementFiche.value = false;
  }
}

const dialogSuppressionArticle = ref(false);

async function confirmerSuppressionArticle() {
  await api.delete(`/boutique/admin/produits/${fiche.id}`);
  dialogSuppressionArticle.value = false;
  await charger();
  const suivant = produits.value[0];
  if (suivant) remplirFiche(suivant);
  else nouvelArticle();
  mobileEdition.value = false;
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
    const { data } = await api.post(`/boutique/admin/produits/${fiche.id}/photos`, corps, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    fiche.photos = data.photos;
    await charger();
  } catch (err) {
    erreur.value = err.response?.data?.message || "Les photos n'ont pas pu être envoyées.";
  } finally {
    envoiPhotos.value = false;
  }
}

async function retirerPhoto(url) {
  const { data } = await api.delete(`/boutique/admin/produits/${fiche.id}/photos`, {
    data: { url },
  });
  fiche.photos = data.photos;
  await charger();
}

async function reordonnerPhotos() {
  const { data } = await api.patch(`/boutique/admin/produits/${fiche.id}/photos`, {
    urls: fiche.photos,
  });
  fiche.photos = data.photos;
  await charger();
}
</script>

<template>
  <section class="boutique-mobile">
    <header class="mobile-entete">
      <div><span>BOUTIQUE</span><h1>{{ mobileOnglet === 'catalogue' ? 'Catalogue' : mobileOnglet === 'stock' ? 'Stock express' : 'Rayons' }}</h1></div>
      <v-btn icon="mdi-plus" color="primary" size="small" :aria-label="mobileOnglet === 'rayons' ? 'Nouveau rayon' : 'Nouvel article'" @click="mobileOnglet === 'rayons' ? ouvrirCreationRayon() : nouvelArticleMobile()" />
    </header>

    <v-alert v-if="erreur" type="error" variant="tonal" density="compact" class="mx-4 mb-3">{{ erreur }}</v-alert>
    <v-skeleton-loader v-if="chargement" type="list-item-avatar-three-line@4" />

    <template v-else>
      <div v-if="mobileOnglet === 'catalogue'" class="mobile-vue">
        <div class="mobile-indicateurs">
          <span><strong>{{ produits.length }}</strong> articles</span>
          <span class="alerte"><strong>{{ totalRuptures }}</strong> en rupture</span>
          <span><strong>{{ totalMasques }}</strong> masqués</span>
        </div>
        <v-text-field v-model="recherche" density="compact" hide-details variant="outlined" placeholder="Rechercher un article" prepend-inner-icon="mdi-magnify" clearable class="mobile-recherche" />
        <div class="mobile-filtres">
          <button type="button" :class="{ actif: mobileCategorie === 'tout' }" @click="mobileCategorie = 'tout'">Tous</button>
          <button v-for="c in categories" :key="c._id" type="button" :class="{ actif: mobileCategorie === c._id }" @click="mobileCategorie = c._id">{{ c.nom }}</button>
        </div>
        <div class="mobile-liste">
          <article v-for="p in produitsMobiles" :key="p._id" class="mobile-produit">
            <button type="button" class="mobile-produit-contenu" @click="ouvrirMobile(p)">
              <v-avatar rounded="0" size="64"><v-img v-if="p.photos?.length" :src="assetUrl(p.photos[0])" cover /><v-icon v-else icon="mdi-image-outline" /></v-avatar>
              <span class="mobile-produit-texte"><strong>{{ p.nom }}</strong><small>{{ nomCategorie(p.categorie) }} · {{ p.prix }} €</small><em :class="{ rupture: !totalStock(p) }">{{ totalStock(p) ? `${totalStock(p)} en stock` : 'Rupture' }}</em></span>
            </button>
            <div class="mobile-produit-actions">
              <v-btn icon="mdi-pencil-outline" color="primary" variant="text" size="small" :aria-label="`Modifier ${p.nom}`" @click="ouvrirMobile(p)" />
              <v-btn icon="mdi-delete-outline" color="error" variant="text" size="small" :aria-label="`Supprimer ${p.nom}`" @click="demanderSuppressionMobile(p)" />
            </div>
          </article>
          <p v-if="!produitsMobiles.length" class="mobile-vide">Aucun article trouvé.</p>
        </div>
      </div>

      <div v-else-if="mobileOnglet === 'stock'" class="mobile-vue stock-mobile">
        <div class="mobile-filtres categories-stock">
          <button type="button" :class="{ actif: stockCategorie === 'tout' }" @click="stockCategorie = 'tout'">Tous</button>
          <button v-for="c in categories" :key="c._id" type="button" :class="{ actif: stockCategorie === c._id }" @click="stockCategorie = c._id">{{ c.nom }}</button>
        </div>
        <article v-for="p in produitsStockMobiles" :key="p._id" class="stock-produit" :class="{ ouvert: stockOuvertId === p._id }">
          <button type="button" class="stock-produit-tete" @click="stockOuvertId = stockOuvertId === p._id ? null : p._id">
            <v-avatar rounded="0" size="48"><v-img v-if="p.photos?.length" :src="assetUrl(p.photos[0])" cover /><v-icon v-else icon="mdi-image-outline" /></v-avatar>
            <span><strong>{{ p.nom }}</strong><small>{{ totalStock(p) }} unités</small></span>
            <v-icon :icon="stockOuvertId === p._id ? 'mdi-chevron-up' : 'mdi-chevron-down'" />
          </button>
          <div v-if="stockOuvertId === p._id" class="stock-tailles">
            <div v-for="t in taillesDe(p.categorie)" :key="t" class="stock-ligne" :class="{ zero: quantite(p, t) === 0, dernier: quantite(p, t) === 1 }">
              <strong>{{ t }}</strong>
              <v-btn icon="mdi-minus" variant="outlined" size="small" :disabled="quantite(p, t) === 0" @click="ajusterStock(p, t, -1)" />
              <span><input :value="quantite(p, t)" type="number" min="0" inputmode="numeric" :aria-label="`Stock ${p.nom}, taille ${t}`" @change="(e) => changerQuantite(p, t, e.target.value)" /><small>{{ quantite(p, t) === 0 ? 'Rupture' : quantite(p, t) === 1 ? 'Dernier' : '' }}</small></span>
              <v-btn icon="mdi-plus" variant="outlined" size="small" @click="ajusterStock(p, t, 1)" />
            </div>
          </div>
        </article>
      </div>

      <div v-else class="mobile-vue rayons-mobile">
        <p class="mobile-resume">{{ categories.length }} rayons · {{ produits.length }} articles</p>
        <draggable v-model="categories" item-key="_id" handle=".poignee" @end="reordonnerRayons">
          <template #item="{ element: c }">
            <article class="mobile-rayon">
              <span class="poignee"><v-icon icon="mdi-drag-vertical" /></span>
              <button type="button" class="mobile-rayon-contenu" @click="ouvrirEditionRayon(c)"><strong>{{ c.nom }}</strong><small>{{ c.tailles.join(' · ') }} · {{ produits.filter((p) => p.categorie === c._id).length }} articles</small></button>
              <v-btn :icon="c.actif ? 'mdi-eye-outline' : 'mdi-eye-off-outline'" :color="c.actif ? 'success' : undefined" variant="text" size="small" :aria-label="c.actif ? `Masquer ${c.nom}` : `Afficher ${c.nom}`" @click="basculerRayon(c, !c.actif)" />
              <v-btn icon="mdi-dots-vertical" variant="text" size="small" @click="ouvrirEditionRayon(c)" />
            </article>
          </template>
        </draggable>
      </div>
    </template>

    <nav class="mobile-nav" aria-label="Navigation boutique">
      <button v-for="onglet in [{ id: 'catalogue', icon: 'mdi-view-grid-outline', label: 'Catalogue' }, { id: 'stock', icon: 'mdi-archive-outline', label: 'Stock' }, { id: 'rayons', icon: 'mdi-folder-outline', label: 'Rayons' }]" :key="onglet.id" type="button" :class="{ actif: mobileOnglet === onglet.id }" @click="mobileOnglet = onglet.id"><v-icon :icon="onglet.icon" /><span>{{ onglet.label }}</span></button>
    </nav>

    <div v-if="mobileEdition" class="mobile-edition">
      <header><v-btn icon="mdi-arrow-left" variant="text" aria-label="Retour au catalogue" @click="fermerMobile" /><strong>{{ fiche.id ? fiche.nom : 'Nouvel article' }}</strong><v-btn icon="mdi-close" variant="text" aria-label="Fermer le formulaire" @click="fermerMobile" /></header>
      <div class="etapes"><button v-for="(label, index) in ['Infos', 'Stock', 'Photos', 'Publication']" :key="label" type="button" :class="{ actif: etapeFiche === index + 1 }" @click="etapeFiche = index + 1"><b>{{ index + 1 }}</b><span>{{ label }}</span></button></div>
      <main>
        <section v-if="etapeFiche === 1" class="edition-section">
          <h2>Informations de base</h2><v-text-field v-model="fiche.nom" label="Nom de l'article" /><v-select v-model="fiche.categorie" :items="categories" item-title="nom" item-value="_id" label="Rayon" :menu-props="{ zIndex: 2600 }" @update:model-value="synchroniserStockFiche" /><v-text-field v-model.number="fiche.prix" label="Prix" type="number" min="0" suffix="€" /><v-textarea v-model="fiche.description" label="Description" rows="4" />
          <div class="edition-titre"><h3>Caractéristiques</h3><v-btn icon="mdi-plus" variant="outlined" size="small" @click="ajouterCaracteristique" /></div>
          <div v-for="(c, i) in fiche.caracteristiques" :key="i" class="ligne-carac mb-2"><v-text-field v-model="c.cle" label="Intitulé" density="compact" hide-details /><v-text-field v-model="c.valeur" label="Valeur" density="compact" hide-details /><v-btn icon="mdi-close" variant="text" size="small" @click="fiche.caracteristiques.splice(i, 1)" /></div>
        </section>
        <section v-else-if="etapeFiche === 2" class="edition-section"><h2>Stock par taille</h2><div class="stock-tailles"><div v-for="s in fiche.stock" :key="s.taille" class="stock-ligne" :class="{ zero: !s.quantite, dernier: s.quantite === 1 }"><strong>{{ s.taille }}</strong><v-btn icon="mdi-minus" variant="outlined" size="small" :disabled="!s.quantite" @click="s.quantite = Math.max(0, s.quantite - 1)" /><span><input v-model.number="s.quantite" type="number" min="0" inputmode="numeric" :aria-label="`Stock taille ${s.taille}`" @change="s.quantite = Math.max(0, Number(s.quantite) || 0)" /><small>{{ !s.quantite ? 'Rupture' : s.quantite === 1 ? 'Dernier' : '' }}</small></span><v-btn icon="mdi-plus" variant="outlined" size="small" @click="s.quantite += 1" /></div></div></section>
        <section v-else-if="etapeFiche === 3" class="edition-section"><h2>Photos</h2><p v-if="!fiche.id" class="mobile-note">Enregistrez d'abord l'article pour ajouter ses photos.</p><template v-else><draggable v-model="fiche.photos" item-key="self" class="photos-mobile" @end="reordonnerPhotos"><template #item="{ element: url, index }"><div class="photo-mobile"><b>{{ index + 1 }}</b><img :src="assetUrl(url)" alt="" /><v-btn icon="mdi-delete-outline" color="error" variant="text" @click="retirerPhoto(url)" /></div></template></draggable><input ref="champPhotos" type="file" accept="image/png,image/jpeg,image/webp" multiple class="d-none" @change="surChoixPhotos" /><v-btn block variant="outlined" prepend-icon="mdi-image-plus" :loading="envoiPhotos" @click="choisirPhotos">Ajouter des photos</v-btn></template></section>
        <section v-else class="edition-section publication-mobile"><h2>Publication</h2><v-switch v-model="fiche.actif" color="success" label="Visible sur le site" /><v-switch v-model="fiche.misEnAvant" color="success" label="Afficher sur l'accueil" /><div class="apercu-mobile"><v-avatar rounded="0" size="68"><v-img v-if="fiche.photos.length" :src="assetUrl(fiche.photos[0])" cover /></v-avatar><span><strong>{{ fiche.nom || 'Nouvel article' }}</strong><small>{{ fiche.prix }} € · {{ totalStock(fiche) }} en stock</small></span></div><v-btn v-if="fiche.id" block color="error" variant="outlined" prepend-icon="mdi-delete-outline" class="mt-8" @click="dialogSuppressionArticle = true">Supprimer l'article</v-btn></section>
      </main>
      <footer><v-btn v-if="etapeFiche > 1" variant="outlined" @click="etapeFiche -= 1">Précédent</v-btn><span></span><v-btn v-if="etapeFiche < 4" color="primary" @click="etapeFiche += 1">Suivant</v-btn><v-btn v-else color="primary" :loading="enregistrementFiche" @click="enregistrerFiche">Enregistrer</v-btn></footer>
    </div>
  </section>

  <div class="boutique-desktop">
  <div class="tete">
    <div>
      <h1 class="text-h5 mb-1">Boutique</h1>
      <p class="text-body-2 text-medium-emphasis mb-0">
        Une vitrine : le visiteur voit les tailles disponibles et vient acheter
        au club. Aucun paiement en ligne.
      </p>
    </div>

    <!-- Deux vues du même catalogue. Le choix est retenu dans le navigateur :
         on ne le repose pas à chaque visite. -->
    <v-btn-toggle v-model="vue" mandatory density="comfortable" divided variant="outlined">
      <v-btn value="tableau" prepend-icon="mdi-table" size="small">Tableau</v-btn>
      <v-btn value="fiches" prepend-icon="mdi-view-split-vertical" size="small">Fiches</v-btn>
    </v-btn-toggle>
  </div>

  <v-alert v-if="erreur" type="error" variant="tonal" density="compact" class="mb-4">
    {{ erreur }}
  </v-alert>

  <v-skeleton-loader v-if="chargement" type="card" />

  <template v-else>
    <!-- ---------- Rayons ---------- -->
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

    <!-- ---------- Vue tableau ---------- -->
    <template v-if="vue === 'tableau'">
      <div class="d-flex align-center justify-space-between ga-3 mb-4">
        <div>
          <h2 class="text-subtitle-1 font-weight-bold mb-1">Articles</h2>
          <p class="text-body-2 text-medium-emphasis mb-0">
            Corrigez une quantité dans sa case : l'enregistrement part tout
            seul. Le reste — description, photos — se modifie en vue Fiches.
          </p>
        </div>
        <v-btn color="success" prepend-icon="mdi-plus" :disabled="!categories.length" @click="nouvelArticle">
          Nouvel article
        </v-btn>
      </div>

      <div v-for="groupe in groupes" :key="groupe.categorie._id" class="mb-6">
        <div class="groupe-tete">
          <span class="font-weight-bold">{{ groupe.categorie.nom }}</span>
          <span class="text-body-2 text-medium-emphasis">
            Tailles : {{ groupe.categorie.tailles.join(" · ") }}
          </span>
          <v-chip v-if="!groupe.categorie.actif" size="x-small" color="error" variant="tonal">
            Rayon masqué
          </v-chip>
        </div>

        <div class="cadre-tableau">
          <table class="tableau">
            <thead>
              <tr>
                <th class="col-nom">Article</th>
                <th class="col-prix">Prix</th>
                <th v-for="t in groupe.categorie.tailles" :key="t" class="col-taille">{{ t }}</th>
                <th class="col-visible">Visible</th>
                <th class="col-actions"></th>
              </tr>
            </thead>
            <draggable
              v-model="groupe.items"
              item-key="_id"
              handle=".poignee"
              tag="tbody"
              @end="reordonnerGroupe(groupe)"
            >
              <template #item="{ element: p }">
                <tr>
                  <td class="col-nom">
                    <div class="cellule-nom">
                      <span class="poignee" aria-label="Glisser pour réordonner">
                        <v-icon icon="mdi-drag-vertical" size="small" />
                      </span>
                      <v-avatar rounded size="36">
                        <v-img v-if="p.photos?.length" :src="assetUrl(p.photos[0])" cover />
                        <v-icon v-else icon="mdi-image-outline" size="small" />
                      </v-avatar>
                      <span class="nom-texte">
                        {{ p.nom }}
                        <v-chip v-if="p.misEnAvant" size="x-small" color="primary" class="ml-1">Accueil</v-chip>
                        <v-icon
                          v-if="enregistres.has(p._id)"
                          icon="mdi-check-circle"
                          color="success"
                          size="small"
                          class="ml-1"
                          aria-label="Enregistré"
                        />
                        <span v-if="!p.photos?.length" class="d-block text-caption text-medium-emphasis">
                          Aucune photo
                        </span>
                      </span>
                    </div>
                  </td>
                  <td class="col-prix">{{ p.prix }} €</td>
                  <td v-for="t in groupe.categorie.tailles" :key="t" class="col-taille">
                    <input
                      class="case-stock"
                      :class="{ zero: quantite(p, t) === 0, dernier: quantite(p, t) === 1 }"
                      type="number"
                      min="0"
                      :value="quantite(p, t)"
                      :aria-label="`${p.nom}, taille ${t}`"
                      @change="(e) => changerQuantite(p, t, e.target.value)"
                    />
                  </td>
                  <td class="col-visible">
                    <v-switch
                      :model-value="p.actif"
                      color="success"
                      density="compact"
                      hide-details
                      @update:model-value="(v) => basculerArticle(p, v)"
                    />
                  </td>
                  <td class="col-actions">
                    <v-btn size="small" variant="text" color="warning" @click="ouvrirDansFiche(p)">
                      Modifier
                    </v-btn>
                  </td>
                </tr>
              </template>
            </draggable>
          </table>

          <p v-if="!groupe.items.length" class="pa-4 mb-0 text-body-2 text-medium-emphasis">
            Aucun article dans ce rayon.
          </p>
        </div>
      </div>

      <p v-if="!groupes.length" class="text-medium-emphasis">
        Créez un rayon pour commencer.
      </p>
    </template>

    <!-- ---------- Vue fiches ---------- -->
    <div v-else class="duo">
      <v-card class="liste" variant="flat">
        <div class="pa-3">
          <v-text-field
            v-model="recherche"
            density="compact"
            hide-details
            variant="outlined"
            placeholder="Rechercher un article…"
            prepend-inner-icon="mdi-magnify"
            clearable
          />
        </div>

        <draggable
          v-model="produits"
          item-key="_id"
          handle=".poignee"
          @end="async () => { await api.patch('/boutique/admin/produits/reorder', { ids: produits.map((p) => p._id) }); await charger(); }"
        >
          <template #item="{ element: p }">
            <button
              v-show="listeFiltree.includes(p)"
              type="button"
              class="item"
              :class="{ actif: p._id === fiche.id }"
              @click="selectionner(p)"
            >
              <span class="poignee" aria-label="Glisser pour réordonner">
                <v-icon icon="mdi-drag-vertical" size="small" />
              </span>
              <v-avatar rounded size="38">
                <v-img v-if="p.photos?.length" :src="assetUrl(p.photos[0])" cover />
                <v-icon v-else icon="mdi-image-outline" size="small" />
              </v-avatar>
              <span class="item-texte">
                <span class="item-nom">{{ p.nom }}</span>
                <span class="item-meta">
                  {{ nomCategorie(p.categorie) }} · {{ p.prix }} €
                  <template v-if="!totalStock(p)"> · épuisé</template>
                </span>
              </span>
              <v-icon v-if="!p.actif" icon="mdi-eye-off-outline" size="small" class="text-medium-emphasis" />
            </button>
          </template>
        </draggable>

        <div class="pa-3">
          <v-btn block color="success" prepend-icon="mdi-plus" :disabled="!categories.length" @click="nouvelArticle">
            Nouvel article
          </v-btn>
        </div>
      </v-card>

      <v-card class="pa-6" variant="flat">
        <div class="d-flex align-center justify-space-between ga-3 mb-4">
          <h2 class="text-subtitle-1 font-weight-bold mb-0">
            {{ fiche.id ? fiche.nom || "Article" : "Nouvel article" }}
          </h2>
          <div class="d-flex align-center ga-2">
            <v-fade-transition>
              <span v-if="ficheEnregistree" class="text-success text-body-2">Enregistré</span>
            </v-fade-transition>
            <v-btn
              v-if="fiche.id"
              icon="mdi-delete-outline"
              variant="text"
              color="error"
              size="small"
              aria-label="Supprimer l'article"
              @click="dialogSuppressionArticle = true"
            />
            <v-btn color="primary" :loading="enregistrementFiche" @click="enregistrerFiche">
              Enregistrer
            </v-btn>
          </div>
        </div>

        <v-text-field v-model="fiche.nom" label="Nom" class="mb-2" />

        <div class="d-flex ga-3 mb-2">
          <v-select
            v-model="fiche.categorie"
            :items="categories"
            item-title="nom"
            item-value="_id"
            label="Rayon"
            class="flex-grow-1"
            @update:model-value="synchroniserStockFiche"
          />
          <v-text-field
            v-model.number="fiche.prix"
            label="Prix"
            type="number"
            min="0"
            suffix="€"
            style="max-width: 140px"
          />
        </div>

        <v-textarea v-model="fiche.description" label="Description" rows="3" class="mb-2" />

        <div class="d-flex flex-wrap ga-4 mb-4">
          <!-- Vert comme l'autre bascule : « activé » ne peut pas être rouge ici
               et vert juste à côté. Le rouge de la marque reste au signal — la
               pastille « Accueil » dans le tableau. -->
          <v-switch
            v-model="fiche.misEnAvant"
            color="success"
            density="compact"
            hide-details
            label="Afficher sur l'accueil (4 articles au maximum)"
          />
          <v-switch
            v-model="fiche.actif"
            color="success"
            density="compact"
            hide-details
            label="Visible sur le site"
          />
        </div>

        <!-- Stock -->
        <h3 class="text-subtitle-2 font-weight-bold mb-1">Stock par taille</h3>
        <p class="text-body-2 text-medium-emphasis mb-3">
          À zéro, la taille s'affiche barrée sur le site. Toutes à zéro,
          l'article entier passe en « épuisé » — vous n'avez rien d'autre à
          basculer.
        </p>
        <div class="grille-stock mb-6">
          <v-text-field
            v-for="s in fiche.stock"
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
          <v-btn
            size="small"
            variant="outlined"
            prepend-icon="mdi-plus"
            :disabled="fiche.caracteristiques.length >= 10"
            @click="ajouterCaracteristique"
          >
            Ajouter
          </v-btn>
        </div>
        <p class="text-body-2 text-medium-emphasis mb-3">
          Libres, parce que ce qui compte sur un kimono (le grammage) n'a aucun
          sens sur une ceinture (le nombre de coutures).
        </p>
        <div v-for="(c, i) in fiche.caracteristiques" :key="i" class="ligne-carac mb-2">
          <v-text-field v-model="c.cle" label="Intitulé" placeholder="Toile" density="compact" hide-details />
          <v-text-field v-model="c.valeur" label="Valeur" placeholder="Perlée 550 g/m²" density="compact" hide-details />
          <v-btn icon="mdi-close" variant="text" size="small" aria-label="Retirer" @click="fiche.caracteristiques.splice(i, 1)" />
        </div>

        <!-- Photos -->
        <h3 class="text-subtitle-2 font-weight-bold mt-6 mb-1">Photos</h3>
        <p v-if="!fiche.id" class="text-body-2 text-medium-emphasis mb-0">
          Enregistrez d'abord l'article : une photo a besoin d'une fiche à
          laquelle se rattacher. Le formulaire reste ouvert juste après.
        </p>
        <template v-else>
          <p class="text-body-2 text-medium-emphasis mb-3">
            La première sert de vignette dans la grille. Glissez pour changer
            l'ordre. {{ PHOTOS_MAX }} au maximum.
          </p>

          <draggable
            v-model="fiche.photos"
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
            :disabled="fiche.photos.length >= PHOTOS_MAX"
            @click="choisirPhotos"
          >
            Ajouter des photos
          </v-btn>
        </template>
      </v-card>
    </div>
  </template>
  </div>

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
.tete {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
}

.rayon {
  background: var(--paper);
  border: 1px solid var(--line);
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.6rem 0.9rem;
}

.rayon-texte {
  flex: 1 1 auto;
  min-width: 0;
}

/* Seule zone de glissement, et seule à porter `touch-action: none` : le reste
   de la ligne reste défilable et cliquable au doigt. */
.poignee {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  color: var(--ink-soft);
  cursor: grab;
  touch-action: none;
}

.poignee:active {
  cursor: grabbing;
}

/* ---------- Vue tableau ---------- */

.groupe-tete {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0.3rem 0.9rem;
  margin-bottom: 0.5rem;
}

/* Le tableau déborde sur un écran étroit : il défile dans SON cadre, jamais en
   poussant la page entière de côté. */
.cadre-tableau {
  background: var(--paper);
  border: 1px solid var(--line);
  overflow-x: auto;
}

.tableau {
  width: 100%;
  border-collapse: collapse;
}

.tableau th,
.tableau td {
  padding: 0.4rem 0.6rem;
  text-align: left;
  border-bottom: 1px solid var(--line);
  vertical-align: middle;
}

.tableau tbody tr:last-child td {
  border-bottom: 0;
}

.tableau thead th {
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-soft);
  background: var(--sand);
  white-space: nowrap;
}

.col-nom {
  min-width: 240px;
}

.col-prix {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.col-taille {
  width: 74px;
  text-align: center;
}

.col-visible,
.col-actions {
  width: 1%;
  white-space: nowrap;
}

.cellule-nom {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  min-width: 0;
}

.nom-texte {
  min-width: 0;
  font-weight: 600;
  line-height: 1.25;
}

.case-stock {
  width: 62px;
  padding: 0.35rem 0.3rem;
  text-align: center;
  font: inherit;
  font-variant-numeric: tabular-nums;
  color: var(--ink);
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 3px;
}

.case-stock:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 1px;
}

/* Le zéro se signale par la couleur ET par le fond : sur un tableau dense, une
   seule des deux se rate. */
.case-stock.zero {
  color: var(--primary);
  background: #fdf5f6;
  border-color: #f0c2c6;
}

.case-stock.dernier {
  border-color: #e8a33d;
}

/* ---------- Vue fiches ---------- */

.duo {
  display: grid;
  gap: 1.2rem;
}

@media (min-width: 1100px) {
  .duo {
    grid-template-columns: 320px minmax(0, 1fr);
    align-items: start;
  }
}

.liste {
  background: var(--paper);
  border: 1px solid var(--line);
  overflow: hidden;
}

.item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  padding: 0.5rem 0.7rem;
  text-align: left;
  background: none;
  border: 0;
  border-top: 1px solid var(--line);
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.item:hover {
  background: var(--sand);
}

.item.actif {
  background: #fdf5f6;
  box-shadow: inset 3px 0 0 var(--primary);
}

.item-texte {
  flex: 1 1 auto;
  min-width: 0;
}

.item-nom {
  display: block;
  font-weight: 600;
  font-size: 0.9rem;
  line-height: 1.2;
}

.item-meta {
  display: block;
  font-size: 0.76rem;
  color: var(--ink-soft);
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

.boutique-mobile { display: none; }

@media (max-width: 700px) {
  .boutique-desktop { display: none; }
  .boutique-mobile { display: block; min-height: calc(100dvh - 64px); margin: -16px; padding-bottom: 76px; background: #fff; color: #111; }
  .mobile-entete { min-height: 78px; padding: 15px 18px 12px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e3e5e8; }
  .mobile-entete span { color: #c80f1a; font-size: .65rem; font-weight: 800; letter-spacing: .12em; }
  .mobile-entete h1 { margin: 1px 0 0; font: 800 1.65rem/1.05 var(--font-display); }
  .mobile-vue { padding: 14px 16px 20px; }
  .mobile-indicateurs { display: grid; grid-template-columns: repeat(3, 1fr); border: 1px solid #e1e3e6; margin-bottom: 12px; }
  .mobile-indicateurs span { min-width: 0; padding: 10px 6px; display: grid; text-align: center; color: #62666c; font-size: .7rem; border-right: 1px solid #e1e3e6; }
  .mobile-indicateurs span:last-child { border: 0; }.mobile-indicateurs strong { color: #111; font: 800 1.2rem var(--font-display); }.mobile-indicateurs .alerte strong { color: #d17800; }
  .mobile-recherche { margin-bottom: 10px; }.mobile-filtres { display: flex; gap: 7px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: none; }.mobile-filtres button { min-height: 36px; padding: 0 14px; white-space: nowrap; border: 1px solid #d9dce0; border-radius: 18px; background: #fff; font-size: .76rem; }.mobile-filtres button.actif { color: #fff; background: #c80f1a; border-color: #c80f1a; }
  .mobile-liste { margin-top: 10px; border-top: 1px solid #e1e3e6; }.mobile-produit { width: 100%; min-height: 82px; padding: 9px 2px; display: grid; grid-template-columns: minmax(0,1fr) 80px; gap: 6px; align-items: center; color: inherit; background: #fff; border-bottom: 1px solid #e1e3e6; }.mobile-produit-contenu { min-width: 0; display: grid; grid-template-columns: 64px minmax(0,1fr); gap: 10px; align-items: center; color: inherit; text-align: left; background: transparent; border: 0; }.mobile-produit-actions { display: grid; grid-template-columns: repeat(2, 36px); gap: 4px; justify-content: end; }.mobile-produit-texte { min-width: 0; display: grid; gap: 2px; }.mobile-produit-texte strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: .91rem; }.mobile-produit-texte small { color: #6b7077; }.mobile-produit-texte em { width: max-content; padding: 2px 6px; color: #20843a; background: #e6f4e8; font-size: .68rem; font-style: normal; }.mobile-produit-texte em.rupture { color: #c80f1a; background: #fbe8e9; }.mobile-vide,.mobile-note { padding: 24px 4px; color: #6b7077; font-size: .85rem; }
  .mobile-nav { position: fixed; z-index: 20; left: 0; right: 0; bottom: 0; height: calc(66px + env(safe-area-inset-bottom)); padding-bottom: env(safe-area-inset-bottom); display: grid; grid-template-columns: repeat(3,1fr); background: #fff; border-top: 1px solid #dfe1e4; }.mobile-nav button { display: grid; place-content: center; gap: 1px; color: #777b80; background: transparent; border: 0; font-size: .66rem; }.mobile-nav button.actif { color: #c80f1a; }.mobile-nav .v-icon { margin: auto; }
  .categories-stock { display: grid; grid-template-columns: repeat(3,1fr); padding-bottom: 14px; }.categories-stock button { border-radius: 0; }.stock-produit { border: 1px solid #e0e2e5; border-bottom: 0; }.stock-produit:last-child { border-bottom: 1px solid #e0e2e5; }.stock-produit-tete { width: 100%; min-height: 70px; padding: 10px; display: grid; grid-template-columns: 48px 1fr 28px; gap: 10px; align-items: center; text-align: left; background: #fff; border: 0; }.stock-produit-tete span { display: grid; }.stock-produit-tete small { color: #6b7077; }.stock-tailles { border-top: 1px solid #e0e2e5; }.stock-ligne { min-height: 76px; padding: 9px 13px; display: grid; grid-template-columns: 1fr 44px 72px 44px; align-items: center; gap: 8px; border-bottom: 1px solid #e7e8ea; }.stock-ligne:last-child { border-bottom: 0; }.stock-ligne>strong { font-size: 1.05rem; }.stock-ligne>span { display: grid; justify-items: center; text-align: center; }.stock-ligne input { width: 64px; height: 38px; padding: 0 4px; color: #111; background: #fff; border: 1px solid #cfd2d6; border-radius: 3px; font: 800 1.15rem var(--font-display); text-align: center; }.stock-ligne input:focus { outline: 2px solid rgba(200,15,26,.2); border-color: #c80f1a; }.stock-ligne small { min-height: 14px; color: #777; font-size: .62rem; }.stock-ligne.zero input,.stock-ligne.zero small { color: #c80f1a; }.stock-ligne.dernier input,.stock-ligne.dernier small { color: #d17800; }
  .mobile-resume { margin: 0 0 8px; color: #6b7077; }.mobile-rayon { min-height: 76px; display: grid; grid-template-columns: 30px 1fr 26px 36px; align-items: center; border-bottom: 1px solid #e0e2e5; }.mobile-rayon-contenu { display: grid; gap: 3px; text-align: left; color: inherit; background: none; border: 0; }.mobile-rayon-contenu strong { font-size: 1rem; }.mobile-rayon-contenu small { color: #6b7077; }
  .mobile-edition { position: fixed; z-index: 2500; inset: 0; display: grid; grid-template-rows: 58px 68px minmax(0,1fr) 70px; background: #fff; color: #111; }.mobile-edition>header { display: grid; grid-template-columns: 48px 1fr 48px; align-items: center; border-bottom: 1px solid #e1e3e6; }.mobile-edition>header strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 1rem; }.etapes { display: grid; grid-template-columns: repeat(4,1fr); padding: 8px 10px; border-bottom: 1px solid #e1e3e6; }.etapes button { display: grid; justify-items: center; gap: 2px; color: #74787d; background: none; border: 0; font-size: .62rem; }.etapes b { width: 25px; height: 25px; display: grid; place-items: center; border: 1px solid #cfd2d6; border-radius: 50%; }.etapes button.actif { color: #c80f1a; }.etapes button.actif b { color: #fff; background: #c80f1a; border-color: #c80f1a; }.mobile-edition>main { overflow-y: auto; padding: 18px 16px 28px; }.edition-section h2 { margin: 0 0 18px; font: 800 1.25rem var(--font-display); }.edition-titre { margin: 4px 0 12px; display: flex; justify-content: space-between; align-items: center; }.edition-titre h3 { margin: 0; font-size: .9rem; }.mobile-edition .ligne-carac { grid-template-columns: 1fr 1fr 36px; }.mobile-edition>footer { padding: 10px 16px calc(10px + env(safe-area-inset-bottom)); display: grid; grid-template-columns: auto 1fr auto; gap: 10px; border-top: 1px solid #dfe1e4; }.mobile-edition>footer .v-btn { min-width: 126px; height: 48px; }.photos-mobile { display: grid; gap: 8px; margin-bottom: 12px; }.photo-mobile { min-height: 70px; padding: 7px 4px 7px 10px; display: grid; grid-template-columns: 24px 58px 1fr; align-items: center; border: 1px solid #e0e2e5; }.photo-mobile img { width: 58px; height: 58px; object-fit: cover; }.photo-mobile .v-btn { justify-self: end; }.publication-mobile .v-switch { border-bottom: 1px solid #e1e3e6; }.apercu-mobile { margin-top: 20px; padding: 10px; display: flex; gap: 12px; align-items: center; border: 1px solid #e0e2e5; }.apercu-mobile span { display: grid; }.apercu-mobile small { color: #6b7077; }
  .mobile-edition { z-index: 1100; }
}

@media (max-width: 600px) {
  .rayon {
    flex-direction: column;
    align-items: stretch;
  }

  .ligne-carac {
    grid-template-columns: 1fr auto;
  }
}
</style>

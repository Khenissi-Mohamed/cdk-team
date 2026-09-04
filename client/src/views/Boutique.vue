<script setup>
/**
 * La boutique du club : une vitrine, pas un magasin en ligne.
 *
 * On montre ce qui existe, à quel prix et dans quelles tailles ; l'achat se
 * fait au club. Aucun panier, aucune commande, aucun paiement — donc ni CGV,
 * ni droit de rétractation, ni litige de carte à gérer. Pour un kimono, c'est
 * aussi le bon choix : l'essayage évite la moitié des retours.
 *
 * La fiche s'ouvre en panneau par-dessus la grille plutôt que sur sa propre
 * adresse : le visiteur revient à sa position d'un geste, sans recharger la
 * page ni perdre son filtre.
 */
import { ref, computed, onMounted, watch } from "vue";
import api, { assetUrl } from "../services/api";
import { contactUrl } from "../utils/links";
import { trackClick } from "../composables/useTracking";

import SiteHeader from "../components/public/SiteHeader.vue";
import SiteFooter from "../components/public/SiteFooter.vue";
import ProduitCarte from "../components/public/ProduitCarte.vue";
import siteConfig from "../site.config";

const settings = ref({});
const categories = ref([]);
const produits = ref([]);
const chargement = ref(true);

const categorieActive = ref("tout");
const produitOuvert = ref(null);
const photoActive = ref(0);

const bloc = computed(() => settings.value.boutique ?? {});

onMounted(async () => {
  try {
    const [reglages, boutique] = await Promise.all([api.get("/settings"), api.get("/boutique")]);
    settings.value = reglages.data;
    categories.value = boutique.data.categories;
    produits.value = boutique.data.produits;
  } catch {
    // API injoignable : la page reste debout, simplement vide.
  } finally {
    chargement.value = false;
  }
});

const filtres = computed(() => [
  { _id: "tout", nom: "Tout", nombre: produits.value.length },
  ...categories.value.map((c) => ({
    ...c,
    nombre: produits.value.filter((p) => p.categorie === c._id).length,
  })),
]);

const produitsVisibles = computed(() =>
  categorieActive.value === "tout"
    ? produits.value
    : produits.value.filter((p) => p.categorie === categorieActive.value)
);

/* ---------- La fiche ---------- */

const categorieDe = (produit) =>
  categories.value.find((c) => c._id === produit?.categorie)?.nom ?? "";

const photos = computed(() => (produitOuvert.value?.photos ?? []).map(assetUrl));
const photoCourante = computed(() => photos.value[photoActive.value] ?? "");

const stockOuvert = computed(() => produitOuvert.value?.stock ?? []);
const epuiseOuvert = computed(() => stockOuvert.value.every((s) => !s.quantite));

function ouvrir(produit) {
  produitOuvert.value = produit;
  photoActive.value = 0;
}

function fermer() {
  produitOuvert.value = null;
}

// Panneau ouvert : on bloque le défilement derrière, sinon la grille file sous
// la fiche au moindre glissement. Même parti pris que le menu mobile.
watch(produitOuvert, (ouvert) => {
  if (ouvert) document.body.style.setProperty("overflow", "hidden");
  else document.body.style.removeProperty("overflow");
});

function surTouche(event) {
  if (event.key === "Escape") fermer();
}

/* ---------- Contact ---------- */

const telHref = computed(() => contactUrl("telephone", settings.value.telephone));
const waHref = computed(() => contactUrl("whatsapp", settings.value.whatsapp));
</script>

<template>
  <div class="public-page" @keydown="surTouche">
    <SiteHeader :nav="siteConfig.nav" :settings="settings" />

    <main class="boutique">
      <div class="wrap">
        <!-- Pas de numéro de chapitre ici : la page n'est pas une étape du
             déroulé de l'accueil, et « Boutique » à côté de « La boutique »
             ne dirait rien de plus. -->
        <div class="section-head">
          <span class="surtitre">{{ bloc.surtitre }}</span>
          <span class="filet" aria-hidden="true"></span>
        </div>

        <h1 class="section-titre">{{ bloc.titre }}</h1>
        <p v-if="bloc.texte" class="intro">{{ bloc.texte }}</p>

        <div v-if="filtres.length > 1" class="filtres" role="group" aria-label="Filtrer par rayon">
          <button
            v-for="f in filtres"
            :key="f._id"
            type="button"
            class="filtre"
            :aria-pressed="String(f._id === categorieActive)"
            @click="categorieActive = f._id"
          >
            {{ f.nom }}<span class="compte">{{ f.nombre }}</span>
          </button>
        </div>

        <p v-if="chargement" class="vide">Chargement…</p>
        <p v-else-if="!produitsVisibles.length" class="vide">
          Aucun article dans ce rayon pour l'instant.
        </p>

        <div v-else class="grille">
          <button
            v-for="produit in produitsVisibles"
            :key="produit._id"
            type="button"
            class="case"
            @click="ouvrir(produit)"
          >
            <ProduitCarte :produit="produit" />
          </button>
        </div>
      </div>
    </main>

    <SiteFooter :settings="settings" />

    <!-- La fiche -->
    <Teleport to="body">
      <div v-if="produitOuvert" class="fiche-fond" @click.self="fermer">
        <div class="fiche" role="dialog" aria-modal="true" :aria-label="produitOuvert.nom">
          <button type="button" class="fermer" aria-label="Fermer" @click="fermer">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>

          <div class="fiche-corps">
            <div class="galerie">
              <div class="galerie-principale">
                <img v-if="photoCourante" :src="photoCourante" :alt="produitOuvert.nom" />
                <span v-else class="sans-photo" aria-hidden="true"></span>
              </div>
              <div v-if="photos.length > 1" class="vignettes">
                <button
                  v-for="(url, i) in photos"
                  :key="url"
                  type="button"
                  class="vignette"
                  :aria-pressed="String(i === photoActive)"
                  :aria-label="`Photo ${i + 1}`"
                  @click="photoActive = i"
                >
                  <img :src="url" alt="" />
                </button>
              </div>
            </div>

            <div class="fiche-texte">
              <p class="fiche-categorie">{{ categorieDe(produitOuvert) }}</p>
              <h2>{{ produitOuvert.nom }}</h2>
              <p class="fiche-prix">{{ produitOuvert.prix }}&nbsp;€</p>

              <p v-if="produitOuvert.description" class="fiche-desc">
                {{ produitOuvert.description }}
              </p>

              <ul v-if="produitOuvert.caracteristiques?.length" class="caracteristiques">
                <li v-for="c in produitOuvert.caracteristiques" :key="c.cle">
                  <span class="cle">{{ c.cle }}</span><span>{{ c.valeur }}</span>
                </li>
              </ul>

              <template v-if="stockOuvert.length">
                <p class="etiquette">
                  Tailles
                  <span class="rappel">{{
                    epuiseOuvert ? "Réapprovisionnement en cours" : "Le stock réel, taille par taille"
                  }}</span>
                </p>
                <!-- Des états, pas des boutons : rien ne se choisit ici, on
                     affiche ce qui reste. Un bouton cliquable promettrait une
                     réservation qui n'existe pas. -->
                <ul class="tailles">
                  <li
                    v-for="s in stockOuvert"
                    :key="s.taille"
                    class="taille"
                    :class="{ epuise: !s.quantite, dernier: s.quantite === 1 }"
                  >
                    {{ s.taille }}
                    <small>{{
                      !s.quantite ? "Épuisé" : s.quantite === 1 ? "Dernier" : `${s.quantite} en stock`
                    }}</small>
                  </li>
                </ul>
              </template>

              <!-- Sans numéro renseigné, « appelez-nous » promet un lien qui
                   n'existe pas : le bloc entier disparaît alors. -->
              <div v-if="telHref || waHref" class="contact">
                <p class="contact-note">
                  À voir et à essayer au club. Appelez-nous pour qu'on vous le
                  mette de côté.
                </p>
                <div class="contact-liens">
                  <a
                    v-if="telHref"
                    class="bouton-plein"
                    :href="telHref"
                    @click="trackClick('telephone')"
                  >
                    {{ settings.telephone }}
                  </a>
                  <a
                    v-if="waHref"
                    class="bouton-vide"
                    :href="waHref"
                    target="_blank"
                    rel="noopener"
                    @click="trackClick('whatsapp')"
                  >
                    WhatsApp
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.boutique {
  background: var(--surface);
  padding-top: calc(var(--header-height) + var(--space-section));
  padding-bottom: var(--space-section);
}

.intro {
  max-width: var(--content-narrow);
  margin: 0 0 2rem;
  font-size: 1.02rem;
  line-height: 1.65;
  color: var(--neutral-300);
}

/* ---------- Filtres ---------- */

.filtres {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 2rem;
}

.filtre {
  padding: 0.5rem 1rem;
  font: inherit;
  font-size: 0.76rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--neutral-300);
  background: none;
  border: 1px solid var(--border);
  cursor: pointer;
  transition: color 0.2s ease, border-color 0.2s ease, background 0.2s ease;
}

.filtre:hover {
  border-color: var(--border-strong);
}

.filtre[aria-pressed="true"] {
  color: var(--on-primary);
  background: var(--primary);
  border-color: var(--primary);
}

.compte {
  margin-left: 0.4rem;
  opacity: 0.6;
  font-variant-numeric: tabular-nums;
}

/* ---------- Grille ---------- */

.grille {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 1.4rem;
}

.case {
  padding: 0;
  background: none;
  border: 0;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.case:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 3px;
}

.vide {
  color: var(--text-muted);
}

/* ---------- La fiche ---------- */

.fiche-fond {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: clamp(0.6rem, 4vw, 3rem);
  overflow-y: auto;
  background: rgba(10, 10, 11, 0.86);
  backdrop-filter: blur(4px);
}

.fiche {
  position: relative;
  width: 100%;
  max-width: 980px;
  background: var(--surface-alt);
  border: 1px solid var(--border);
}

.fermer {
  position: absolute;
  top: 0.6rem;
  right: 0.6rem;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  color: var(--text);
  background: rgba(10, 10, 11, 0.6);
  border: 1px solid var(--border);
  cursor: pointer;
}

.fermer:hover {
  background: var(--primary);
  border-color: var(--primary);
}

.fiche-corps {
  display: grid;
  gap: clamp(1.2rem, 3vw, 2.4rem);
  padding: clamp(1rem, 3vw, 2rem);
}

@media (min-width: 860px) {
  .fiche-corps {
    grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
  }
}

.galerie {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.galerie-principale {
  position: relative;
  aspect-ratio: 4 / 5;
  background: var(--brand-700);
  border: 1px solid var(--border);
  overflow: hidden;
}

.galerie-principale img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.sans-photo {
  position: absolute;
  inset: 0;
  background: linear-gradient(150deg, var(--brand-600), var(--brand-800));
}

.vignettes {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.vignette {
  width: 66px;
  aspect-ratio: 4 / 5;
  padding: 0;
  background: none;
  border: 1px solid var(--border);
  cursor: pointer;
  overflow: hidden;
}

.vignette img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.vignette[aria-pressed="true"] {
  border-color: var(--primary);
}

.fiche-texte {
  display: flex;
  flex-direction: column;
}

.fiche-categorie {
  margin: 0 0 0.5rem;
  font-size: 0.66rem;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--primary);
}

.fiche-texte h2 {
  margin: 0 0 0.6rem;
  font-size: clamp(1.5rem, 4vw, 2.1rem);
  line-height: 1;
}

.fiche-prix {
  margin: 0 0 1rem;
  font-family: var(--font-display);
  font-size: 1.8rem;
  font-weight: 500;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.fiche-desc {
  margin: 0 0 1rem;
  color: var(--neutral-300);
  line-height: 1.6;
}

.caracteristiques {
  margin: 0 0 1.4rem;
  padding: 0;
  list-style: none;
  border-top: 1px solid var(--border);
}

.caracteristiques li {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.5rem 0;
  font-size: 0.82rem;
  border-bottom: 1px solid var(--border);
}

.caracteristiques .cle {
  color: var(--text-muted);
}

.etiquette {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  margin: 0 0 0.6rem;
  font-size: 0.66rem;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.etiquette .rappel {
  font-weight: 400;
  letter-spacing: 0.04em;
  text-transform: none;
}

.tailles {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0 0 1.6rem;
  padding: 0;
  list-style: none;
}

.taille {
  min-width: 62px;
  padding: 0.5rem 0.7rem;
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 500;
  line-height: 1.1;
  text-align: center;
  border: 1px solid var(--border);
}

.taille small {
  display: block;
  font-family: var(--font-body, inherit);
  font-size: 0.62rem;
  font-weight: 400;
  letter-spacing: 0.04em;
  color: var(--text-muted);
}

/* Épuisé : rature et atténuation. Un rouge d'alerte se battrait avec le rouge
   de la marque, qui sert au signal. */
.taille.epuise {
  color: var(--text-muted);
  opacity: 0.45;
  text-decoration: line-through;
  text-decoration-thickness: 1px;
}

.taille.epuise small {
  text-decoration: none;
}

.taille.dernier small {
  color: var(--primary);
}

.contact {
  padding-top: 1.2rem;
  border-top: 1px solid var(--border);
}

.contact-note {
  margin: 0 0 0.9rem;
  font-size: 0.85rem;
  color: var(--text-muted);
  max-width: 40ch;
}

.contact-liens {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
}
</style>

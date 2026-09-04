<script setup>
/**
 * Vidéo d'ambiance d'une section, lancée quand l'utilisateur scrolle jusqu'à
 * elle et remise en pause quand il la dépasse.
 *
 * ── LE POINT À CONNAÎTRE ──────────────────────────────────────────────────
 * Aucun navigateur n'autorise une lecture AVEC SON tant que l'utilisateur n'a
 * pas interagi avec la page (clic, tap, touche). Ce n'est pas contournable, et
 * ce n'est pas un réglage : c'est la politique d'autoplay de Chrome, Safari et
 * Firefox. Un `play()` non muet lève simplement une promesse rejetée.
 *
 * La stratégie est donc en trois temps :
 *   1. si le gérant a demandé le son, on TENTE la lecture sonore ;
 *   2. si le navigateur la refuse, on retombe sur une lecture muette — celle-là
 *      passe toujours — et le bouton de son apparaît ;
 *   3. un clic sur ce bouton EST le geste qui manquait : le son part.
 *
 * Le visiteur qui a déjà cliqué n'importe où avant d'arriver ici n'aura donc
 * rien à faire : l'étape 1 réussit d'elle-même.
 *
 * Autre conséquence, dans l'autre sens : un son qui démarre seul doit toujours
 * pouvoir être coupé. Le bouton reste donc affiché pendant la lecture sonore.
 * ──────────────────────────────────────────────────────────────────────────
 */
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { assetUrl } from "../../services/api";
import { observeInView, prefersReducedMotion } from "../../motion/observer";

const props = defineProps({
  // Le sous-document `video` d'une section (voir le modèle `Setting`).
  video: { type: Object, required: true },
});

const racine = ref(null);
const lecteur = ref(null);

const enLecture = ref(false);
const sonActif = ref(false);
// Mémorise un refus du navigateur : inutile de retenter la lecture sonore à
// chaque passage, chaque tentative coûte une promesse rejetée et une ligne
// d'avertissement dans la console.
const sonRefuse = ref(false);
// Vrai dès que le visiteur a lui-même demandé le silence : on ne le lui
// réimpose plus au passage suivant.
const sonCoupeParVisiteur = ref(false);

const source = ref(null);
const desabonnements = [];

const poster = computed(() => assetUrl(props.video.poster) || undefined);
const veutSon = computed(() => props.video.son === true);
const veutAutoplay = computed(() => props.video.autoplay !== false);

// Sans mouvement automatique : on affiche le poster et on laisse la main. Un
// visiteur qui a désactivé les animations n'attend pas qu'une vidéo démarre
// toute seule — mais il doit pouvoir la lancer.
const manuel = computed(() => !veutAutoplay.value || prefersReducedMotion());

const libelleBouton = computed(() => {
  if (!enLecture.value) return "Lire la vidéo";
  return sonActif.value ? "Couper le son" : "Activer le son";
});

// Le bouton disparaît quand il n'y a rien à proposer : la vidéo tourne, et le
// gérant l'a voulue muette. Y laisser une icône inerte serait trompeur.
const boutonVisible = computed(() => !enLecture.value || veutSon.value);

/** Charge la source au dernier moment : sinon tout visiteur paie le fichier. */
function armerSource() {
  if (!source.value) source.value = assetUrl(props.video.fichier);
}

async function jouer({ gesteUtilisateur = false } = {}) {
  const el = lecteur.value;
  if (!el) return;

  const tenterSon =
    veutSon.value && !sonCoupeParVisiteur.value && (gesteUtilisateur || !sonRefuse.value);

  if (tenterSon) {
    el.muted = false;
    try {
      await el.play();
      enLecture.value = true;
      sonActif.value = true;
      sonRefuse.value = false;
      return;
    } catch {
      // Refus d'autoplay sonore : on note et on repasse en muet.
      sonRefuse.value = true;
    }
  }

  el.muted = true;
  sonActif.value = false;
  try {
    await el.play();
    enLecture.value = true;
  } catch {
    // Certains navigateurs en mode économie d'énergie refusent même le muet.
    // Le poster reste affiché, et le bouton « Lire » avec lui : rien de cassé.
    enLecture.value = false;
  }
}

function suspendre() {
  const el = lecteur.value;
  if (!el) return;
  el.pause();
  enLecture.value = false;
  // Le son est coupé à la sortie, jamais laissé en fond : le visiteur a quitté
  // la section, il n'a plus rien à entendre.
  el.muted = true;
  sonActif.value = false;
}

/** Le bouton unique : lance, démute, remute. */
function basculer() {
  if (!enLecture.value) {
    armerSource();
    sonCoupeParVisiteur.value = false;
    jouer({ gesteUtilisateur: true });
    return;
  }

  if (sonActif.value) {
    lecteur.value.muted = true;
    sonActif.value = false;
    sonCoupeParVisiteur.value = true;
    return;
  }

  sonCoupeParVisiteur.value = false;
  lecteur.value.muted = false;
  sonActif.value = true;
  // Redemander la lecture : le navigateur peut mettre en pause un média dont
  // l'autorisation ne tenait qu'au silence.
  lecteur.value.play().catch(() => {
    lecteur.value.muted = true;
    sonActif.value = false;
  });
}

onMounted(() => {
  if (!props.video.fichier || !racine.value) return;

  // Deux abonnements de seuils différents : le fichier commence à se charger
  // dès que la section affleure, la lecture n'est demandée qu'une fois la
  // section réellement engagée à l'écran. Les déclencher au même moment ferait
  // débuter la vidéo sur une image encore vide.
  desabonnements.push(observeInView(racine.value, { seuil: 0, onEnter: armerSource }));

  if (manuel.value) return;

  desabonnements.push(
    observeInView(racine.value, {
      seuil: 0.35,
      onEnter: () => {
        armerSource();
        jouer();
      },
      onLeave: suspendre,
    })
  );
});

onBeforeUnmount(() => desabonnements.forEach((stop) => stop()));
</script>

<template>
  <div ref="racine" class="section-video">
    <video
      ref="lecteur"
      class="media"
      :src="source || undefined"
      :poster="poster"
      :loop="video.boucle !== false"
      preload="none"
      playsinline
      disablepictureinpicture
      @ended="enLecture = false"
    ></video>

    <button
      v-if="boutonVisible"
      type="button"
      class="bouton-son"
      :aria-label="libelleBouton"
      :title="libelleBouton"
      @click="basculer"
    >
      <svg v-if="!enLecture" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M8 5.5v13l11-6.5z" />
      </svg>
      <svg v-else-if="sonActif" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M4 9v6h4l5 4V5L8 9H4z" />
        <path d="M16.5 8.5a5 5 0 0 1 0 7" />
        <path d="M19 6a8.5 8.5 0 0 1 0 12" />
      </svg>
      <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M4 9v6h4l5 4V5L8 9H4z" />
        <path d="m17 9 5 6m0-6-5 6" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.section-video {
  position: relative;
  width: 100%;
  height: 100%;
}

.media {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  /* Un fond posé sous la vidéo : entre le poster et la première image décodée,
     l'élément est transparent et laisserait voir la page au travers. */
  background: var(--brand-900);
}

.bouton-son {
  position: absolute;
  right: 0.85rem;
  bottom: 0.85rem;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  padding: 0;
  color: var(--text-invert);
  /* Voile neutre plutôt qu'un aplat de marque : le bouton se pose sur une
     image quelconque, il doit rester lisible sur clair comme sur sombre. */
  background: rgba(10, 10, 11, 0.62);
  border: 1px solid var(--border-strong);
  backdrop-filter: blur(6px);
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.bouton-son:hover,
.bouton-son:focus-visible {
  background: var(--primary);
  border-color: var(--primary);
}
</style>

<script setup>
/**
 * Le manifeste du club, plus trois chiffres qui s'incrémentent.
 *
 * Le texte est un seul champ de l'admin : les paragraphes sont séparés par une
 * ligne vide, comme dans un traitement de texte. On les découpe ici plutôt que
 * d'imposer au gérant un champ par paragraphe.
 *
 * Une vidéo d'ambiance peut s'y ajouter, dans l'un des trois rendus décrits
 * plus bas. Sans vidéo configurée, la section retombe exactement sur son
 * rendu d'origine — c'est volontaire, et c'est ce qui rend le réglage sans
 * risque : le gérant peut retirer sa vidéo à tout moment.
 *
 * Le lancement au scroll et la politique de son sont dans `SectionVideo.vue`.
 */
import { computed } from "vue";
import CountUp from "../components/motion/CountUp.vue";
import SectionVideo from "../components/public/SectionVideo.vue";

const props = defineProps({
  config: { type: Object, required: true },
  data: { type: Object, required: true },
});

const club = computed(() => props.data.settings?.club ?? {});

const paragraphes = computed(() =>
  String(club.value.texte ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
);

const chiffres = computed(() => club.value.chiffres ?? []);

const video = computed(() => club.value.video ?? {});
const aVideo = computed(() => Boolean(video.value.fichier));

/**
 * Trois façons d'occuper la section :
 *   - `arriere-plan` : la vidéo remplit le cadre, le texte passe par-dessus un
 *     voile dégradé ;
 *   - `bloc`         : une colonne de texte, une colonne de vidéo ;
 *   - `bandeau`      : le contenu inchangé, la vidéo en bandeau large dessous.
 *
 * Seul le premier fait passer du texte sur une image : c'est le seul à devoir
 * renforcer les contrastes, d'où la classe `sur-media`.
 */
const mode = computed(() => (aVideo.value ? video.value.mode || "arriere-plan" : "aucun"));
const surMedia = computed(() => mode.value === "arriere-plan");
</script>

<template>
  <section :id="config.id" class="club" :class="[`mode-${mode}`, { 'sur-media': surMedia }]">
    <template v-if="mode === 'arriere-plan'">
      <div class="fond-video">
        <SectionVideo :video="video" />
      </div>
      <!-- Le voile n'est pas décoratif : sans lui, la lisibilité du texte
           dépendrait de ce que le gérant a filmé. Il est assez dense pour
           tenir sur un plan clair, et dégradé pour ne pas éteindre l'image. -->
      <span class="voile" aria-hidden="true"></span>
    </template>

    <div class="wrap">
      <div v-reveal="'fade'" class="section-head">
        <span class="chapitre">{{ config.chapitre }}</span>
        <span class="surtitre">{{ club.surtitre }}</span>
        <span class="filet" aria-hidden="true"></span>
      </div>

      <h2 v-reveal="'up'" class="section-titre">
        {{ club.titre }}<br /><span class="accent">{{ club.titreAccent }}</span>
      </h2>

      <div class="club-corps">
        <div v-reveal="{ variant: 'up', delay: 160 }" class="club-texte">
          <p v-for="(paragraphe, i) in paragraphes" :key="i">{{ paragraphe }}</p>
        </div>

        <div v-if="mode === 'bloc'" v-reveal="{ variant: 'up', delay: 240 }" class="cadre-video">
          <SectionVideo :video="video" />
        </div>
      </div>

      <!-- Trois preuves en ligne, séparées par des filets : lisible d'un coup
           d'oeil, sans ajouter une grille de cartes de plus. -->
      <div v-if="chiffres.length" v-reveal="{ variant: 'up', delay: 280 }" class="chiffres">
        <div v-for="chiffre in chiffres" :key="chiffre.libelle" class="chiffre">
          <span class="chiffre-valeur">
            <CountUp :to="chiffre.valeur" :suffix="chiffre.suffixe ?? ''" />
          </span>
          <span class="chiffre-libelle">{{ chiffre.libelle }}</span>
        </div>
      </div>
    </div>

    <div v-if="mode === 'bandeau'" v-reveal="'fade'" class="bandeau-video">
      <SectionVideo :video="video" />
    </div>
  </section>
</template>

<style scoped>
.club {
  background: var(--surface);
}

.accent {
  color: var(--primary);
}

.club-texte {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: var(--content-narrow);
}

.club-texte p {
  margin: 0;
  font-size: 1.02rem;
  line-height: 1.65;
  color: var(--neutral-300);
}

.chiffres {
  display: flex;
  margin-top: 1.8rem;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}

.chiffre {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.95rem 0.7rem;
}

.chiffre + .chiffre {
  border-left: 1px solid var(--border);
}

.chiffre-valeur {
  font-family: var(--font-display);
  font-size: clamp(1.6rem, 6vw, 2.4rem);
  font-weight: 700;
  line-height: 1;
}

.chiffre-libelle {
  font-size: 0.72rem;
  line-height: 1.3;
  color: var(--text-muted);
}

/* ------------------------------------------------------------------ *
 * Rendu « arrière-plan »
 * ------------------------------------------------------------------ */

.mode-arriere-plan {
  position: relative;
  overflow: hidden;
  /* `isolation` crée le contexte d'empilement : sans lui, les z-index négatifs
     de la vidéo et du voile passeraient DERRIÈRE le fond de la section et
     l'image ne se verrait jamais. */
  isolation: isolate;
}

.fond-video {
  position: absolute;
  inset: 0;
  z-index: -2;
}

.voile {
  position: absolute;
  inset: 0;
  z-index: -1;
  /* Deux couches qui se multiplient : une horizontale qui protège la colonne
     de texte, calée à gauche, une verticale qui raccorde la section à celles
     d'au-dessus et d'en dessous.
     Les valeurs sont dosées pour que le CUMUL atteigne ~0,78 derrière le texte
     — de quoi tenir sur un plan clair — et retombe à ~0,36 à droite, où il n'y
     a rien à lire. Les monter davantage éteindrait la vidéo, ce qui revient à
     ne pas en avoir mis. */
  background:
    linear-gradient(90deg, rgba(10, 10, 11, 0.72) 0%, rgba(10, 10, 11, 0.42) 58%, rgba(10, 10, 11, 0.18) 100%),
    linear-gradient(180deg, rgba(10, 10, 11, 0.5) 0%, rgba(10, 10, 11, 0.22) 40%, rgba(10, 10, 11, 0.6) 100%);
}

/* Sur média, les gris de la maquette perdent leur contraste : on remonte le
   texte à l'encre pleine et les filets au trait fort. */
.sur-media .club-texte p {
  color: var(--text);
}

.sur-media .chiffres {
  border-color: var(--border-strong);
}

.sur-media .chiffre + .chiffre {
  border-left-color: var(--border-strong);
}

.sur-media .chiffre-libelle {
  color: var(--neutral-300);
}

/* ------------------------------------------------------------------ *
 * Rendu « bloc »
 * ------------------------------------------------------------------ */

.cadre-video {
  aspect-ratio: 16 / 9;
  border: 1px solid var(--border);
  overflow: hidden;
}

@media (min-width: 960px) {
  .mode-bloc .club-corps {
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: center;
    gap: 2.4rem;
  }

  /* 4/3 et non un format portrait : le texte du club fait deux paragraphes,
     une vidéo plus haute laisserait une colonne de gauche à moitié vide et
     ferait grimper la section à plus d'un écran et demi. */
  .mode-bloc .cadre-video {
    aspect-ratio: 4 / 3;
  }
}

@media (max-width: 959px) {
  .cadre-video {
    margin-top: 1.6rem;
  }
}

/* ------------------------------------------------------------------ *
 * Rendu « bandeau »
 * ------------------------------------------------------------------ */

.bandeau-video {
  /* Bord à bord et collé au bas de la section : la marge négative annule le
     `padding` de fin que `section` applique à tout le site. Sans elle, le
     bandeau flotterait au milieu d'une bande vide. */
  margin-top: var(--space-section);
  margin-bottom: calc(var(--space-section) * -1);
  aspect-ratio: 16 / 9;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}

@media (min-width: 960px) {
  .bandeau-video {
    aspect-ratio: 21 / 9;
  }
}
</style>

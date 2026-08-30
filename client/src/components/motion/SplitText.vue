<script setup>
/**
 * Révèle un texte mot par mot : chaque mot monte et s'éclaircit avec un
 * décalage croissant, ce qui donne l'impression que le titre s'écrit seul.
 *
 * Accessibilité : le découpage casserait la lecture d'un lecteur d'écran, qui
 * énoncerait chaque mot comme un fragment isolé. La phrase entière est donc
 * exposée une fois en `.sr-only`, et les mots découpés sont `aria-hidden`.
 */
import { computed } from "vue";

const props = defineProps({
  text: { type: String, default: "" },
  // Balise rendue : h1 pour le hero, h2 pour les autres sections.
  as: { type: String, default: "h2" },
  // Retard avant le premier mot, pour enchaîner après une autre animation.
  delay: { type: Number, default: 0 },
});

const words = computed(() => props.text.split(/\s+/).filter(Boolean));
</script>

<template>
  <component :is="as" v-reveal="'trigger'" class="split-text">
    <span class="sr-only">{{ text }}</span>
    <span aria-hidden="true"
      ><span
        v-for="(word, index) in words"
        :key="`${index}-${word}`"
        class="split-word"
        :style="{ '--word-index': index, '--split-delay': `${delay}ms` }"
        >{{ word }}</span
      ></span
    >
  </component>
</template>

<style scoped>
.split-text {
  /* Pas plus lent que --stagger-step : sur un titre de dix mots, un pas trop
     large ferait attendre l'utilisateur près d'une seconde. */
  --word-step: 55ms;
}

.split-word {
  /* `transform` n'a aucun effet sur un inline : il faut inline-block. */
  display: inline-block;
  margin-right: 0.26em;
  opacity: 0;
  transform: translate3d(0, 0.72em, 0);
  transition: opacity var(--motion-base) var(--ease-out),
    transform var(--motion-base) var(--ease-out);
  transition-delay: calc(var(--split-delay, 0ms) + var(--word-index, 0) * var(--word-step));
}

.is-revealed .split-word {
  opacity: 1;
  transform: translate3d(0, 0, 0);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (prefers-reduced-motion: reduce) {
  .split-word {
    opacity: 1;
    transform: none;
    transition: none;
  }
}
</style>

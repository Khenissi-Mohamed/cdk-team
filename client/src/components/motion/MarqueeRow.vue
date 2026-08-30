<script setup>
/**
 * Bandeau qui défile en boucle. La liste est dupliquée une fois : quand la
 * première copie a défilé de 50 % de la largeur du rail, la seconde occupe
 * exactement sa position de départ — le raccord est invisible.
 *
 * C'est l'élément « sans fin » de la page : il tourne indépendamment du scroll
 * et donne le sentiment que le site est vivant même à l'arrêt.
 */
import { computed } from "vue";

const props = defineProps({
  items: { type: Array, default: () => [] },
  // Durée d'un tour complet, en secondes. Plus c'est long, plus c'est calme.
  duration: { type: Number, default: 32 },
  reverse: { type: Boolean, default: false },
});

const looped = computed(() => [...props.items, ...props.items]);
</script>

<template>
  <div class="marquee" :style="{ '--marquee-duration': `${duration}s` }">
    <div class="marquee-track" :class="{ 'is-reverse': reverse }">
      <!-- La seconde moitié n'est qu'un doublon visuel : on la masque aux
           lecteurs d'écran pour ne pas énoncer la liste deux fois. -->
      <span
        v-for="(item, index) in looped"
        :key="index"
        class="marquee-item"
        :aria-hidden="index >= items.length ? 'true' : null"
      >
        {{ item }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.marquee {
  overflow: hidden;
  /* Les extrémités s'estompent : le texte ne se coupe pas net contre le bord.
     Surtout visible sur mobile, où le bandeau touche les deux bords. */
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 7%, #000 93%, transparent);
  mask-image: linear-gradient(90deg, transparent, #000 7%, #000 93%, transparent);
}

.marquee-track {
  display: flex;
  width: max-content;
  animation: marquee-scroll var(--marquee-duration) linear infinite;
}

.marquee-track.is-reverse {
  animation-direction: reverse;
}

/* Confort de lecture au survol, sur les périphériques qui en ont un. Le
   `hover: hover` évite que le tactile fige le bandeau au premier appui. */
@media (hover: hover) {
  .marquee:hover .marquee-track {
    animation-play-state: paused;
  }
}

.marquee-item {
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  padding: 0 1.1rem;
  font-size: var(--size-small);
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--text-muted);
}

.marquee-item::before {
  content: "";
  width: 6px;
  height: 6px;
  margin-right: 1.1rem;
  border-radius: 50%;
  background: var(--primary);
  opacity: 0.55;
  flex: none;
}
</style>

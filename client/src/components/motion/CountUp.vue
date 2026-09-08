<script setup>
/**
 * Compteur qui s'incrémente à l'entrée dans le viewport.
 *
 * Passe par `observeReveal` plutôt que par son propre IntersectionObserver :
 * un seul observer sert toutes les animations de la page.
 */
import { ref, computed, onMounted, onUnmounted } from "vue";
import {
  observeReveal,
  unobserveReveal,
  prefersReducedMotion,
} from "../../motion/observer";

const props = defineProps({
  to: { type: Number, required: true },
  duration: { type: Number, default: 1600 },
  decimals: { type: Number, default: 0 },
  prefix: { type: String, default: "" },
  suffix: { type: String, default: "" },
});

const root = ref(null);
const current = ref(import.meta.env.SSR ? props.to : 0);
let frame = null;

const formatted = computed(() =>
  current.value.toLocaleString("fr-FR", {
    minimumFractionDigits: props.decimals,
    maximumFractionDigits: props.decimals,
  })
);

function animate() {
  if (prefersReducedMotion()) {
    current.value = props.to;
    return;
  }

  const start = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / props.duration);
    // easeOutExpo : part vite puis se pose. Un compteur linéaire paraît mou au
    // début et s'arrête brutalement à l'arrivée.
    const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    current.value = props.to * eased;
    if (t < 1) frame = requestAnimationFrame(step);
  };

  frame = requestAnimationFrame(step);
}

onMounted(() => {
  observeReveal(root.value, { onReveal: animate });
});

onUnmounted(() => {
  if (frame !== null) cancelAnimationFrame(frame);
  if (root.value) unobserveReveal(root.value);
});
</script>

<template>
  <span ref="root" class="count-up">{{ prefix }}{{ formatted }}{{ suffix }}</span>
</template>

<style scoped>
.count-up {
  /* Chiffres à chasse fixe : sans ça la largeur saute à chaque incrément et
     toute la ligne tremble pendant l'animation. */
  font-variant-numeric: tabular-nums;
}
</style>

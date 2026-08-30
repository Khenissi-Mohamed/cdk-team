<script setup>
/**
 * Fine barre de progression de lecture, collée sous l'en-tête.
 *
 * Purement décorative : `aria-hidden`, aucun rôle ARIA. Un `progressbar`
 * annoncerait une tâche en cours à chaque mouvement de scroll, ce qui rend un
 * lecteur d'écran inutilisable sur la page.
 */
import { ref, onMounted, onUnmounted } from "vue";
import { onScrollProgress } from "../../motion/observer";

const progress = ref(0);
let stop = null;

onMounted(() => {
  stop = onScrollProgress((value) => {
    progress.value = value;
  });
});

onUnmounted(() => stop?.());
</script>

<template>
  <div class="scroll-progress" aria-hidden="true">
    <div class="scroll-progress-bar" :style="{ transform: `scaleX(${progress})` }"></div>
  </div>
</template>

<style scoped>
.scroll-progress {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  z-index: var(--z-progress);
  pointer-events: none;
}

.scroll-progress-bar {
  height: 100%;
  /* On anime `scaleX` et non `width` : la mise à l'échelle reste sur le
     compositeur, alors qu'une largeur relance un layout à chaque frame. */
  transform-origin: 0 50%;
  background: linear-gradient(90deg, var(--primary), var(--accent));
  will-change: transform;
}
</style>

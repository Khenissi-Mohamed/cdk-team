<script setup>
/**
 * Bandeau défilant. Les arguments viennent de l'admin : ils changent avec les
 * disciplines et les créneaux proposés. Le repli n'existe que pour le premier
 * rendu — un bandeau vide serait une bande rouge muette.
 */
import { computed } from "vue";
import MarqueeRow from "../components/motion/MarqueeRow.vue";

const props = defineProps({
  config: { type: Object, required: true },
  data: { type: Object, required: true },
});

const items = computed(() => {
  const saisis = props.data.settings?.marquee ?? [];
  return saisis.length ? saisis : ["Gi", "No-gi", "Kids", "Compétition", "Open mat"];
});
</script>

<template>
  <section class="bandeau">
    <MarqueeRow :items="items" :duration="config.duration ?? 26" />
  </section>
</template>

<style scoped>
/* Volontairement hors du rythme vertical des autres sections : c'est une
   bande fine, pas un bloc de contenu. */
.bandeau {
  padding: 0 !important;
  background: var(--primary);
  color: var(--on-primary);
  border-top: 1px solid var(--surface);
  border-bottom: 1px solid var(--surface);
}

/* Le composant partagé ne connaît pas la couleur de son hôte : on la lui
   impose ici plutôt que d'en faire une variante de plus. */
.bandeau :deep(.marquee-item) {
  font-family: var(--font-display);
  font-size: 0.94rem;
  font-weight: 500;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--on-primary);
}

.bandeau :deep(.marquee-item::before) {
  background: var(--surface);
  opacity: 1;
  /* Un losange plutôt qu'un point : même vocabulaire graphique que les
     barrettes de ceinture. */
  border-radius: 0;
  transform: rotate(45deg);
  width: 5px;
  height: 5px;
}
</style>

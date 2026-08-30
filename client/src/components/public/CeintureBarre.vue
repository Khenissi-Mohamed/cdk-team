<script setup>
/**
 * Le grade d'un coach, dessiné comme une VRAIE ceinture : la sangle à sa
 * couleur, la barrette contrastée décalée vers la droite comme sur un kimono,
 * et un liseré blanc par degré.
 *
 * C'est le motif signature du site. Il vaut mieux qu'une ligne de texte parce
 * qu'un pratiquant lit un grade d'un coup d'oeil — et parce qu'aucun autre
 * site de club ne le fait.
 */
import { computed } from "vue";

const props = defineProps({
  ceinture: { type: String, default: "noire" },
  degres: { type: Number, default: 0 },
});

const COULEURS = {
  blanche: "var(--ceinture-blanche)",
  bleue: "var(--ceinture-bleue)",
  violette: "var(--ceinture-violette)",
  marron: "var(--ceinture-marron)",
  noire: "var(--ceinture-noire)",
};

const couleur = computed(() => COULEURS[props.ceinture] ?? COULEURS.noire);

// La barrette est rouge sur une ceinture noire (comme dans la réalité) et
// noire sur toutes les autres : sinon elle disparaîtrait sur la sangle.
const couleurBarrette = computed(() =>
  props.ceinture === "noire" ? "var(--primary)" : "var(--ceinture-noire)"
);

const liseres = computed(() => Math.max(0, Math.min(6, props.degres || 0)));

const libelle = computed(() => {
  const base = `Ceinture ${props.ceinture}`;
  if (!liseres.value) return base;
  const rang = liseres.value === 1 ? "1er" : `${liseres.value}e`;
  return `${base} · ${rang} degré`;
});
</script>

<template>
  <span class="ceinture-barre" :aria-label="libelle" role="img">
    <span class="sangle" :style="{ background: couleur }"></span>
    <span class="barrette" :style="{ background: couleurBarrette }">
      <span v-for="n in liseres" :key="n" class="lisere"></span>
    </span>
    <span class="sangle sangle-courte" :style="{ background: couleur }"></span>
  </span>
</template>

<style scoped>
.ceinture-barre {
  display: flex;
  height: 15px;
  width: 100%;
  /* Le contour évite qu'une ceinture noire disparaisse sur le fond noir du
     site — c'est le seul grade concerné, mais c'est le plus fréquent. */
  border: 1px solid var(--border);
}

.sangle {
  flex: 1;
}

.sangle-courte {
  flex: 0 0 16px;
}

.barrette {
  flex: 0 0 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

.lisere {
  width: 2px;
  height: 9px;
  background: var(--neutral-100);
}
</style>

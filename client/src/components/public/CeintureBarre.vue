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
import {
  couleurCeinture,
  couleurBarrette,
  nombreLiseres,
  libelleGrade,
} from "../../utils/ceintures";

const props = defineProps({
  ceinture: { type: String, default: "noire" },
  degres: { type: Number, default: 0 },
});

const couleur = computed(() => couleurCeinture(props.ceinture));
const couleurBarre = computed(() => couleurBarrette(props.ceinture));
const liseres = computed(() => nombreLiseres(props.degres));
const libelle = computed(() => libelleGrade(props.ceinture, props.degres));
</script>

<template>
  <span class="ceinture-barre" :aria-label="libelle" role="img">
    <span class="sangle" :style="{ background: couleur }"></span>
    <span class="barrette" :style="{ background: couleurBarre }">
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

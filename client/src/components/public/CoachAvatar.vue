<script>
// Compteur de MODULE, hors de `<script setup>` : le corps de `script setup`
// est ré-exécuté pour chaque instance, un compteur déclaré à l'intérieur
// repartirait donc de zéro à chaque avatar et leur donnerait à tous le même
// identifiant. Ils pointeraient alors tous vers le premier dégradé de la page
// — la rangée entière prendrait la teinte du premier coach.
let compteur = 0;

export function prochainIdFond() {
  compteur += 1;
  return `gi-fond-${compteur}`;
}
</script>

<script setup>
/**
 * Le buste en kimono dessiné à la place d'une photo.
 *
 * Même parti pris que `CeintureBarre.vue` : le grade est DESSINÉ, pas écrit.
 * Ici c'est un gi vu de face — revers croisés, ceinture à sa couleur, barrette
 * décalée à droite et un liseré par degré. Les deux composants lisent la même
 * table (`utils/ceintures.js`) : impossible qu'un grade sorte bleu ici et vert
 * là-bas.
 *
 * Pourquoi un dessin plutôt qu'une icône générique : un club a rarement une
 * photo correcte de chacun de ses profs, et un rectangle vide dans la rangée
 * fait plus de dégâts qu'une absence de photo assumée.
 */
import { computed } from "vue";
import { couleurCeinture, couleurBarrette, nombreLiseres, libelleGrade } from "../../utils/ceintures";
import { couleurTexteContraste } from "../../utils/contrast";

const props = defineProps({
  ceinture: { type: String, default: "noire" },
  degres: { type: Number, default: 0 },
  nom: { type: String, default: "" },
});

// Un identifiant de dégradé par instance. Voir le bloc `<script>` ci-dessus.
const idFond = prochainIdFond();

const couleur = computed(() => couleurCeinture(props.ceinture));
const couleurBarre = computed(() => couleurBarrette(props.ceinture));
const liseres = computed(() => nombreLiseres(props.degres));

/**
 * Le contour de la sangle, choisi d'après la luminosité de la ceinture.
 *
 * Un trait clair unique ne pouvait pas marcher : la ceinture BLANCHE et la
 * toile du kimono ne sont séparées que par sept points de luminosité, et le
 * grade le plus courant chez les nouveaux profs disparaissait purement et
 * simplement du dessin. On inverse donc le trait sur les ceintures claires.
 */
const contourSangle = computed(() =>
  couleurTexteContraste(couleur.value) === "#000000"
    ? "rgba(15, 15, 17, 0.55)"
    : "var(--border-strong)"
);

const libelle = computed(() =>
  [props.nom, libelleGrade(props.ceinture, props.degres)].filter(Boolean).join(" — ")
);

// Liserés centrés dans la barrette : 4 px de large, 3 px d'écart. On calcule
// le point de départ pour que le groupe reste centré quel que soit leur
// nombre, plutôt que de les caler à gauche et de voir le motif dériver.
const BARRETTE_CENTRE = 208;
const positionsLisere = computed(() => {
  const total = liseres.value * 4 + (liseres.value - 1) * 3;
  const depart = BARRETTE_CENTRE - total / 2;
  return Array.from({ length: liseres.value }, (_, i) => depart + i * 7);
});
</script>

<template>
  <svg
    class="avatar"
    viewBox="0 0 300 400"
    role="img"
    :aria-label="libelle"
    :style="{
      '--couleur-ceinture': couleur,
      '--couleur-barrette': couleurBarre,
      '--contour-sangle': contourSangle,
    }"
  >
    <defs>
      <radialGradient :id="idFond" cx="50%" cy="26%" r="78%">
        <stop offset="0%" class="teinte-haut" />
        <stop offset="100%" class="teinte-bas" />
      </radialGradient>
    </defs>

    <!-- Le fond prend une nuance de la ceinture : la rangée de coachs devient
         lisible d'un coup d'oeil, avant même de lire les barres de grade. -->
    <rect width="300" height="400" class="fond" />
    <rect width="300" height="400" :fill="`url(#${idFond})`" />

    <!-- Nuque puis tête : dessinées AVANT le gi, qui recouvre le bas du cou. -->
    <rect x="128" y="168" width="44" height="92" rx="16" class="peau" />
    <circle cx="150" cy="132" r="54" class="peau" />

    <path class="toile" d="M42 400 L42 310 C42 258 76 234 108 224 L192 224 C224 234 258 258 258 310 L258 400 Z" />

    <!-- Le col : l'ouverture sombre d'abord, les deux revers par-dessus. Un
         seul tracé épais suffit là où deux quadrilatères demanderaient huit
         points à ajuster à chaque retouche. -->
    <path class="creux" d="M108 224 L150 312 L192 224 Z" />
    <path
      class="revers"
      d="M108 224 L150 312 L192 224"
      fill="none"
      stroke-width="22"
      stroke-linejoin="round"
      stroke-linecap="butt"
    />

    <!-- La ceinture. Le contour reprend le rôle du `border` de CeintureBarre :
         sans lui, une ceinture noire se dissout dans le fond sombre. -->
    <rect x="42" y="326" width="216" height="46" class="sangle" />
    <rect x="186" y="326" width="44" height="46" class="barrette" />
    <rect
      v-for="(x, i) in positionsLisere"
      :key="i"
      :x="x"
      y="338"
      width="4"
      height="22"
      class="lisere"
    />
    <rect x="42" y="326" width="216" height="46" class="contour-sangle" fill="none" />
  </svg>
</template>

<style scoped>
.avatar {
  display: block;
  width: 100%;
  height: 100%;
}

.fond {
  fill: var(--brand-700);
}

.teinte-haut {
  stop-color: var(--couleur-ceinture);
  stop-opacity: 0.5;
}

.teinte-bas {
  stop-color: var(--couleur-ceinture);
  stop-opacity: 0;
}

.peau {
  fill: var(--gi-peau);
}

.toile {
  fill: var(--gi-toile);
}

.creux {
  fill: var(--gi-creux);
}

.revers {
  stroke: var(--gi-revers);
}

.sangle {
  fill: var(--couleur-ceinture);
}

.barrette {
  fill: var(--couleur-barrette);
}

.lisere {
  fill: var(--neutral-100);
}

.contour-sangle {
  stroke: var(--contour-sangle);
  stroke-width: 2;
}
</style>

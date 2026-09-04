<script>
// Compteur de MODULE, hors de `<script setup>` : le corps de `script setup`
// est ré-exécuté pour chaque instance, un compteur déclaré à l'intérieur
// repartirait donc de zéro à chaque avatar et leur donnerait à tous le même
// identifiant. Ils pointeraient alors tous vers le premier dégradé de la page
// — la rangée entière prendrait la teinte du premier coach.
let compteur = 0;

export function prochainIdFond() {
  compteur += 1;
  return `ceinture-halo-${compteur}`;
}
</script>

<script setup>
/**
 * Le nœud de ceinture dessiné à la place d'une photo.
 *
 * Même parti pris que `CeintureBarre.vue` : le grade est DESSINÉ, pas écrit.
 * Ici c'est le nœud carré vu de face — la sangle qui fait le tour, le nœud,
 * les deux pans qui pendent, et la barrette avec un liseré par degré sur le
 * pan le plus long. Les deux composants lisent la même table
 * (`utils/ceintures.js`) : impossible qu'un grade sorte bleu ici et vert
 * là-bas.
 *
 * Pourquoi un objet plutôt qu'une silhouette : un club a rarement une photo
 * correcte de chacun de ses profs, et un rectangle vide dans la rangée fait
 * plus de dégâts qu'une absence de photo assumée. Dessiner la ceinture plutôt
 * qu'un bonhomme évite en plus de suggérer un visage qu'on n'a pas.
 *
 * Conséquence à connaître : deux coachs de même grade donnent exactement le
 * même dessin. C'est le nom, écrit dessous dans `CoachsSection`, qui les
 * sépare.
 */
import { computed } from "vue";
import { couleurCeinture, couleurBarrette, nombreLiseres, libelleGrade } from "../../utils/ceintures";
import { couleurTexteContraste, luminanceCouleur } from "../../utils/contrast";

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
 * Une ceinture noire posée sur le fond noir du site disparaît — exactement le
 * défaut qu'avait la ceinture blanche sur la toile blanche d'un kimono. Ici la
 * ceinture EST tout le dessin : si elle se confond avec son fond, il ne reste
 * rien. Le fond se relève donc d'un cran sous les grades très sombres.
 */
const tresSombre = computed(() => luminanceCouleur(couleur.value) < 0.06);

const fond = computed(() => (tresSombre.value ? "var(--brand-500)" : "var(--brand-700)"));

// Le halo prend la couleur du grade — sauf sur une ceinture noire, où teinter
// du noir avec du noir ne produit rien : on passe alors à un gris de graphite,
// qui donne au moins du relief.
const couleurHalo = computed(() =>
  tresSombre.value ? "var(--neutral-500)" : couleur.value
);

/**
 * Le contour de la sangle, choisi d'après la luminosité de la ceinture : trait
 * sombre sur une ceinture claire, clair sur une ceinture foncée. Sans lui, la
 * blanche et la noire perdent chacune leur bord contre leur propre fond.
 */
const contourSangle = computed(() =>
  couleurTexteContraste(couleur.value) === "#000000"
    ? "rgba(15, 15, 17, 0.55)"
    : "rgba(245, 243, 240, 0.32)"
);

/**
 * Liserés couchés sur la barrette du pan gauche, empilés vers le bas et
 * centrés sur elle : 4 px de haut, 3 px d'écart. Les six degrés de la
 * fédération tiennent dans les 52 px de la barrette (39 px occupés au plus).
 */
const BARRETTE_CENTRE = 314;
const positionsLisere = computed(() => {
  const total = liseres.value * 4 + (liseres.value - 1) * 3;
  const depart = BARRETTE_CENTRE - total / 2;
  return Array.from({ length: liseres.value }, (_, i) => depart + i * 7);
});

const libelle = computed(() =>
  [props.nom, libelleGrade(props.ceinture, props.degres)].filter(Boolean).join(" — ")
);
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
      '--couleur-halo': couleurHalo,
      '--contour-sangle': contourSangle,
      '--fond-avatar': fond,
    }"
  >
    <defs>
      <radialGradient :id="idFond" cx="50%" cy="46%" r="74%">
        <stop offset="0%" class="teinte-haut" />
        <stop offset="100%" class="teinte-bas" />
      </radialGradient>
    </defs>

    <rect width="300" height="400" class="fond" />
    <rect width="300" height="400" :fill="`url(#${idFond})`" />

    <!-- ── LE TRESSAGE ──────────────────────────────────────────────────
         Un nœud ne se lit pas à sa forme mais à son DESSUS-DESSOUS : sans
         brin qui passe sous un autre, on ne voit qu'un bloc posé sur une
         sangle. L'ordre de dessin ci-dessous est donc l'ordre du tressage,
         et il ne se réarrange pas librement.

         Deuxième chose qui le fait lire : la boucle DÉBORDE franchement de la
         sangle, en haut comme sur les côtés. Une boucle à peine plus grande
         que la sangle repasse pour un bouton posé dessus.
         ──────────────────────────────────────────────────────────────── -->

    <!-- 1. La sangle qui fait le tour de la taille, coupée par les bords. -->
    <rect x="0" y="158" width="300" height="56" class="sangle" />
    <line x1="0" y1="158" x2="300" y2="158" class="contour" />
    <line x1="0" y1="214" x2="300" y2="214" class="contour" />

    <!-- 2. Le brin vertical, par-dessus la sangle. Bouts arrondis : c'est de
            la toile, pas de la tôle. -->
    <rect x="130" y="120" width="40" height="148" rx="7" class="sangle" />
    <rect x="130" y="120" width="40" height="148" rx="7" class="contour" fill="none" />

    <!-- 3. Les deux pans, de longueurs inégales et légèrement écartés comme
            sur une ceinture qui vient d'être nouée. Le grade voyage avec le
            pan gauche, dans son repère tourné.

            Attention au SIGNE : l'axe y descend, donc une rotation POSITIVE
            emmène le bas du pan gauche vers la gauche, c'est-à-dire vers
            l'extérieur. Avec les signes intuitifs, les deux pans se croisent. -->
    <g transform="rotate(7 130 252)">
      <rect x="112" y="252" width="36" height="116" rx="4" class="sangle" />
      <rect x="112" y="252" width="36" height="116" rx="4" class="contour" fill="none" />
      <rect x="112" y="288" width="36" height="52" class="barrette" />
      <rect
        v-for="(y, i) in positionsLisere"
        :key="i"
        x="118"
        :y="y"
        width="24"
        height="4"
        class="lisere"
      />
    </g>

    <g transform="rotate(-7 170 252)">
      <rect x="152" y="252" width="36" height="92" rx="4" class="sangle" />
      <rect x="152" y="252" width="36" height="92" rx="4" class="contour" fill="none" />
    </g>

    <!-- 4. La boucle du nœud, par-dessus le brin et par-dessus les pans. -->
    <rect x="86" y="150" width="128" height="76" rx="11" class="sangle" />
    <rect x="86" y="150" width="128" height="76" rx="11" class="contour" fill="none" />

    <!-- 5. Le haut du brin redessiné PAR-DESSUS la boucle : il passe donc
            devant en haut et s'engage dessous à mi-hauteur. Les deux ombres
            marquent les deux passages, celui d'entrée et celui de sortie. -->
    <rect x="130" y="120" width="40" height="60" rx="7" class="sangle" />
    <line x1="130" y1="127" x2="130" y2="180" class="contour" />
    <line x1="170" y1="127" x2="170" y2="180" class="contour" />
    <path d="M130 127 A7 7 0 0 1 137 120 L163 120 A7 7 0 0 1 170 127" class="contour" fill="none" />
    <rect x="130" y="174" width="40" height="8" class="ombre-pli" />
    <rect x="130" y="226" width="40" height="8" class="ombre-pli" />
  </svg>
</template>

<style scoped>
.avatar {
  display: block;
  width: 100%;
  height: 100%;
}

.fond {
  fill: var(--fond-avatar);
}

.teinte-haut {
  stop-color: var(--couleur-halo);
  stop-opacity: 0.42;
}

.teinte-bas {
  stop-color: var(--couleur-halo);
  stop-opacity: 0;
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

/* L'ombre du brin qui s'engage sous la boucle. Un noir transparent plutôt
   qu'une teinte plus foncée calculée : il fonctionne sur les cinq couleurs de
   ceinture sans qu'on ait à en dériver une par grade. */
.ombre-pli {
  fill: #000;
  fill-opacity: 0.28;
}

.contour {
  stroke: var(--contour-sangle);
  stroke-width: 2;
}
</style>

<script setup>
/**
 * Une vignette d'article, partagée par la page `/boutique` et la bande
 * d'aperçu de l'accueil. Un seul composant : sinon les deux grilles finissent
 * par diverger sur le format du prix ou l'affichage de l'épuisé.
 *
 * La disponibilité n'est pas un champ à tenir : elle se déduit du stock. Zéro
 * partout, l'article est épuisé ; une seule pièce, c'est la dernière.
 */
import { computed } from "vue";
import { assetUrl } from "../../services/api";

const props = defineProps({
  produit: { type: Object, required: true },
});

const photo = computed(() => assetUrl(props.produit.photos?.[0]));

const total = computed(() =>
  (props.produit.stock ?? []).reduce((somme, s) => somme + (s.quantite || 0), 0)
);
const epuise = computed(() => total.value === 0);
const dernier = computed(() => total.value === 1);

const taillesDisponibles = computed(
  () => (props.produit.stock ?? []).filter((s) => s.quantite > 0).length
);

const disponibilite = computed(() => {
  if (epuise.value) return "Aucune taille disponible";
  const n = taillesDisponibles.value;
  return `${n} taille${n > 1 ? "s" : ""} en stock`;
});
</script>

<template>
  <article class="carte" :class="{ 'est-epuise': epuise }">
    <div class="visuel">
      <img v-if="photo" :src="photo" :alt="produit.nom" loading="lazy" />
      <span v-else class="sans-photo" aria-hidden="true"></span>

      <!-- Un seul bandeau à la fois : deux pastilles dans le même coin rendent
           la grille illisible. -->
      <span v-if="epuise" class="bandeau epuise">Épuisé</span>
      <span v-else-if="dernier" class="bandeau dernier">Dernier</span>
    </div>

    <div class="pied">
      <h3>{{ produit.nom }}</h3>
      <span class="dispo">{{ disponibilite }}</span>
      <span class="prix">{{ produit.prix }}&nbsp;€</span>
    </div>
  </article>
</template>

<style scoped>
.carte {
  display: flex;
  flex-direction: column;
  text-align: left;
}

.visuel {
  position: relative;
  aspect-ratio: 4 / 5;
  background: var(--brand-700);
  border: 1px solid var(--border);
  overflow: hidden;
  transition: border-color 0.2s ease;
}

.carte:hover .visuel {
  border-color: var(--border-strong);
}

.visuel img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* Sans photo, un aplat plutôt qu'une icône : le gérant voit tout de suite
   qu'il en manque une, et le visiteur ne voit pas un symbole cassé. */
.sans-photo {
  position: absolute;
  inset: 0;
  background: linear-gradient(150deg, var(--brand-600), var(--brand-800));
}

.est-epuise .visuel img {
  opacity: 0.38;
}

.bandeau {
  position: absolute;
  top: 0;
  left: 0;
  padding: 0.28rem 0.55rem;
  font-size: 0.6rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.bandeau.dernier {
  background: var(--primary);
  color: var(--on-primary);
}

.bandeau.epuise {
  background: rgba(10, 10, 11, 0.82);
  color: var(--text-muted);
  border: 1px solid var(--border);
}

.pied {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding-top: 0.7rem;
}

.pied h3 {
  margin: 0;
  font-size: 1.02rem;
  line-height: 1.15;
}

.dispo {
  font-size: 0.74rem;
  color: var(--text-muted);
}

.prix {
  font-family: var(--font-display);
  font-size: 1.05rem;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  margin-top: 0.15rem;
}
</style>

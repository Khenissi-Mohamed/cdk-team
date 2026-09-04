<script setup>
/**
 * La bande d'aperçu de la boutique sur l'accueil.
 *
 * Elle ne montre QUE les articles cochés « mis en avant » dans
 * l'administration, quatre au maximum : l'accueil raconte le club, pas le
 * catalogue. Le reste vit sur `/boutique`.
 *
 * La section disparaît d'elle-même tant qu'aucun article n'est mis en avant —
 * comme les autres sections, un titre au-dessus du vide serait pire que rien.
 */
import { computed } from "vue";
import { RouterLink } from "vue-router";
import ProduitCarte from "../components/public/ProduitCarte.vue";

const props = defineProps({
  config: { type: Object, required: true },
  data: { type: Object, required: true },
});

const MAX = 4;

const bloc = computed(() => props.data.settings?.boutique ?? {});

const produits = computed(() =>
  (props.data.produits ?? []).filter((p) => p.misEnAvant).slice(0, MAX)
);
</script>

<template>
  <section v-if="produits.length" :id="config.id" class="boutique">
    <div class="wrap">
      <div v-reveal="'fade'" class="section-head">
        <span class="chapitre">{{ config.chapitre }}</span>
        <span class="surtitre">{{ bloc.surtitre }}</span>
        <span class="filet" aria-hidden="true"></span>
      </div>

      <h2 v-reveal="'up'" class="section-titre">{{ bloc.titre }}</h2>

      <div v-reveal.stagger class="grille">
        <RouterLink v-for="produit in produits" :key="produit._id" to="/boutique" class="case">
          <ProduitCarte :produit="produit" />
        </RouterLink>
      </div>

      <RouterLink v-reveal="'fade'" to="/boutique" class="lien-tout">
        {{ bloc.lien || "Toute la boutique" }}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14m0 0-5-5m5 5-5 5" /></svg>
      </RouterLink>
    </div>
  </section>
</template>

<style scoped>
.boutique {
  background: var(--surface);
}

.grille {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.2rem;
}

@media (min-width: 760px) {
  .grille {
    grid-template-columns: repeat(4, 1fr);
    gap: 1.6rem;
  }
}

.case {
  display: block;
  color: inherit;
  text-decoration: none;
}

.lien-tout {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1.8rem;
  padding-bottom: 0.25rem;
  font-size: 0.76rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text);
  text-decoration: none;
  border-bottom: 1px solid var(--primary);
}

.lien-tout:hover {
  color: var(--primary);
}
</style>

<script setup>
/**
 * Mentions légales.
 *
 * Les informations d'identité (raison sociale, SIRET, hébergeur…) viennent des
 * paramètres et non du code : une immatriculation qui change ne doit pas
 * demander un déploiement. Les lignes non renseignées disparaissent plutôt
 * que d'afficher un libellé vide.
 */
import { ref, onMounted } from "vue";
import api from "../services/api";

const s = ref({});

onMounted(async () => {
  try {
    const { data } = await api.get("/settings");
    s.value = data;
  } catch {
    // API injoignable : la page reste lisible, réduite à ce qui ne dépend pas
    // des paramètres.
  }
});
</script>

<template>
  <div class="page-legale">
    <v-container style="max-width: 720px" class="py-16">
      <RouterLink to="/" class="retour">← Retour au site</RouterLink>
      <h1 class="mb-8">Mentions légales</h1>

      <h2>Éditeur du site</h2>
      <dl>
        <template v-if="s.raisonSociale">
          <dt>Raison sociale</dt>
          <dd>{{ s.raisonSociale }}</dd>
        </template>
        <template v-if="s.formeJuridique">
          <dt>Forme juridique</dt>
          <dd>{{ s.formeJuridique }}</dd>
        </template>
        <template v-if="s.capital">
          <dt>Capital social</dt>
          <dd>{{ s.capital }}</dd>
        </template>
        <template v-if="s.adresse">
          <dt>Siège social</dt>
          <dd>{{ s.adresse }}</dd>
        </template>
        <template v-if="s.siret">
          <dt>SIRET</dt>
          <dd>{{ s.siret }}</dd>
        </template>
        <template v-if="s.tva">
          <dt>TVA intracommunautaire</dt>
          <dd>{{ s.tva }}</dd>
        </template>
        <template v-if="s.telephone">
          <dt>Téléphone</dt>
          <dd>{{ s.telephone }}</dd>
        </template>
        <template v-if="s.email">
          <dt>E-mail</dt>
          <dd>{{ s.email }}</dd>
        </template>
        <template v-if="s.directeurPublication">
          <dt>Directeur de la publication</dt>
          <dd>{{ s.directeurPublication }}</dd>
        </template>
      </dl>

      <h2>Hébergement</h2>
      <p v-if="s.hebergeur">{{ s.hebergeur }}</p>
      <p v-else class="incomplet">Hébergeur à renseigner depuis l'administration du site.</p>

      <h2>Propriété intellectuelle</h2>
      <p>
        L'ensemble des contenus de ce site — textes, photographies et vidéos de
        chantier — est la propriété de l'éditeur. Toute reproduction ou
        représentation, totale ou partielle, sans autorisation écrite préalable
        est interdite.
      </p>

      <h2>Données personnelles</h2>
      <p>
        Le traitement des informations transmises via le formulaire de demande de
        devis est décrit dans la
        <RouterLink to="/politique-de-confidentialite">politique de confidentialité</RouterLink>.
      </p>
    </v-container>
  </div>
</template>

<style scoped>
.page-legale {
  background: var(--surface);
  color: var(--text);
  min-height: 100vh;
}

.retour {
  display: inline-block;
  margin-bottom: 1.5rem;
  font-size: var(--size-small);
  color: var(--primary);
}

.page-legale h1 {
  font-size: var(--size-h2);
  text-transform: uppercase;
}

.page-legale h2 {
  font-size: var(--size-h3);
  text-transform: uppercase;
  margin: 2.4rem 0 0.8rem;
  padding-bottom: 0.4rem;
  border-bottom: 2px solid var(--primary);
}

.page-legale p {
  color: var(--text-muted);
}

.page-legale a {
  color: var(--primary);
}

dl {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 0.35rem 1.4rem;
  margin: 0;
}

dt {
  color: var(--text-muted);
  font-size: var(--size-small);
}

dd {
  margin: 0;
}

@media (max-width: 560px) {
  dl {
    grid-template-columns: 1fr;
    gap: 0 0;
  }

  dd {
    margin-bottom: 0.7rem;
  }
}

.incomplet {
  font-style: italic;
}
</style>

<script setup>
/**
 * Politique de confidentialité.
 *
 * Le socle dont ce site est issu n'en avait pas besoin : il ne collectait
 * rien. Ici le formulaire de devis enregistre des données personnelles
 * (identité, coordonnées, description du chantier), ce qui impose d'en décrire
 * la finalité, la durée de conservation et les droits associés.
 */
import { ref, onMounted } from "vue";
import api from "../services/api";

const s = ref({});

onMounted(async () => {
  try {
    const { data } = await api.get("/settings");
    s.value = data;
  } catch {
    // API injoignable : la page reste lisible sans les coordonnées de contact.
  }
});
</script>

<template>
  <div class="page-legale">
    <v-container style="max-width: 720px" class="py-16">
      <RouterLink to="/" class="retour">← Retour au site</RouterLink>
      <h1 class="mb-8">Politique de confidentialité</h1>

      <h2>Demande de devis</h2>
      <p>
        Les informations saisies dans le formulaire de demande de devis — nom,
        société, adresse e-mail, téléphone, nature de l'opération, charge, lieu
        et date souhaitée, description du besoin — sont collectées dans un seul
        but : établir un chiffrage et vous recontacter.
      </p>
      <ul>
        <li><strong>Finalité :</strong> traitement de votre demande commerciale.</li>
        <li>
          <strong>Base légale :</strong> mesures précontractuelles prises à votre
          demande.
        </li>
        <li>
          <strong>Destinataires :</strong> uniquement le personnel de l'entreprise
          en charge des devis. Aucune donnée n'est cédée ni revendue.
        </li>
        <li>
          <strong>Conservation :</strong> trois ans à compter du dernier contact,
          puis suppression.
        </li>
      </ul>

      <h2>Vos droits</h2>
      <p>
        Vous disposez d'un droit d'accès, de rectification, d'effacement, de
        limitation et d'opposition sur vos données. Pour l'exercer, écrivez-nous
        <template v-if="s.email">
          à <a :href="`mailto:${s.email}`">{{ s.email }}</a>
        </template>
        <template v-else> à l'adresse de contact indiquée sur le site </template>
        <template v-if="s.telephone"> ou appelez le {{ s.telephone }}</template
        >. Une demande d'effacement est traitée par suppression définitive de la
        demande de devis correspondante.
      </p>

      <h2>Mesure d'audience</h2>
      <p>
        Ce site ne dépose aucun cookie de suivi et ne fait appel à aucun service
        d'analyse tiers. Les clics vers les canaux de contact (téléphone,
        e-mail, WhatsApp) et les envois de formulaire sont comptabilisés de
        façon anonyme : seuls le canal et la page visitée sont enregistrés,
        jamais d'adresse IP ni d'identifiant de visiteur.
      </p>

      <h2>Compte d'administration</h2>
      <p>
        L'adresse e-mail du compte administrateur n'est utilisée que pour la
        réinitialisation du mot de passe en cas d'oubli.
      </p>

      <h2>Hébergement des données</h2>
      <p>
        Les demandes de devis et les médias publiés sont hébergés sur un serveur
        situé dans l'Union européenne
        <template v-if="s.hebergeur"> ({{ s.hebergeur }})</template>.
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

.page-legale p,
.page-legale li {
  color: var(--text-muted);
}

.page-legale a {
  color: var(--primary);
}

.page-legale ul {
  padding-left: 1.2rem;
}

.page-legale li {
  margin-bottom: 0.4rem;
}
</style>

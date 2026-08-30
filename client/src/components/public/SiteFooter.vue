<script setup>
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { assetUrl } from "../../services/api";
import { contactUrl } from "../../utils/links";
import { trackClick } from "../../composables/useTracking";

const props = defineProps({
  settings: { type: Object, default: () => ({}) },
});

const logo = computed(() => (props.settings.logo ? assetUrl(props.settings.logo) : ""));
// La raison sociale, quand elle est renseignée, prime sur le nom commercial :
// c'est elle qui a valeur légale en pied de page.
const societe = computed(() => props.settings.raisonSociale || props.settings.nomClub || "CDK-Team");

const telHref = computed(() => contactUrl("telephone", props.settings.telephone));
const mailHref = computed(() => contactUrl("email", props.settings.email));
</script>

<template>
  <footer class="pied">
    <span class="ceinture" aria-hidden="true"></span>

    <div class="wrap contenu">
      <div class="marque">
        <img v-if="logo" :src="logo" :alt="societe" class="logo" />
        <strong>{{ societe }}</strong>
      </div>

      <div class="coordonnees">
        <span v-if="settings.adresse">{{ settings.adresse }}</span>
        <a v-if="telHref" :href="telHref" @click="trackClick('telephone')">
          {{ settings.telephone }}
        </a>
        <a v-if="mailHref" :href="mailHref" @click="trackClick('email')">
          {{ settings.email }}
        </a>
      </div>

      <div class="legal">
        <RouterLink to="/mentions-legales">Mentions légales</RouterLink>
        <RouterLink to="/politique-de-confidentialite">Confidentialité</RouterLink>
        <span class="annee">© {{ new Date().getFullYear() }}</span>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.pied {
  background: var(--surface-alt);
}

.contenu {
  display: flex;
  flex-direction: column;
  gap: 1.4rem;
  padding-top: 2rem;
  padding-bottom: 2.4rem;
}

@media (min-width: 760px) {
  .contenu {
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-start;
  }
}

.marque {
  display: flex;
  align-items: center;
  gap: 0.7rem;
}

.logo {
  height: 40px;
  width: auto;
  max-width: 130px;
  object-fit: contain;
  display: block;
}

.marque strong {
  font-family: var(--font-display);
  font-size: 1.16rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.coordonnees {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  font-size: var(--size-small);
  color: var(--text-muted);
}

.coordonnees a {
  color: var(--text);
  text-decoration: none;
  border-bottom: 1px solid var(--primary);
  align-self: flex-start;
}

.legal {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  font-size: 0.76rem;
  color: var(--text-muted);
}

.legal :deep(a) {
  color: var(--text-muted);
  text-decoration: none;
  align-self: flex-start;
  border-bottom: 1px solid transparent;
}

.legal :deep(a:hover) {
  color: var(--text);
  border-color: var(--primary);
}
</style>

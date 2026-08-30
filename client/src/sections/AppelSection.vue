<script setup>
/**
 * Appel final, en aplat rouge pleine largeur. C'est le seul bloc entièrement
 * coloré de la page : il ferme le parcours et se voit depuis la fin de
 * n'importe quelle section.
 */
import { computed } from "vue";
import { trackClick } from "../composables/useTracking";
import { contactUrl } from "../utils/links";

const props = defineProps({
  config: { type: Object, required: true },
  data: { type: Object, required: true },
});

const bloc = computed(() => props.data.settings?.appel ?? {});
const telephone = computed(() => props.data.settings?.telephone ?? "");
const telephoneHref = computed(() => contactUrl("telephone", telephone.value));
</script>

<template>
  <section class="appel">
    <div class="wrap contenu">
      <h2 v-reveal="'up'" class="titre">{{ bloc.titre }}</h2>
      <p v-reveal="{ variant: 'up', delay: 140 }" class="texte">{{ bloc.texte }}</p>

      <a
        v-if="telephoneHref"
        v-reveal="{ variant: 'up', delay: 260 }"
        class="bouton"
        :href="telephoneHref"
        @click="trackClick('telephone')"
      >
        {{ bloc.cta }}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 12h14m0 0-5-5m5 5-5 5" /></svg>
      </a>

      <!-- Sans téléphone renseigné, le bouton mènerait nulle part : on renvoie
           vers le dossier d'inscription, qui existe toujours. -->
      <a v-else v-reveal="{ variant: 'up', delay: 260 }" class="bouton" href="#inscription">
        {{ bloc.cta }}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 12h14m0 0-5-5m5 5-5 5" /></svg>
      </a>
    </div>
  </section>
</template>

<style scoped>
.appel {
  background: var(--primary);
  color: var(--on-primary);
}

.contenu {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.titre {
  margin: 0;
  font-size: clamp(2.2rem, 11vw, 4rem);
  line-height: 0.88;
  max-width: 14ch;
}

.texte {
  margin: 0;
  font-size: 1.02rem;
  line-height: 1.5;
  max-width: 32ch;
  opacity: 0.88;
}

.bouton {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-height: 58px;
  margin-top: 0.4rem;
  padding: 0 1.15rem;
  max-width: 340px;
  background: var(--surface);
  color: var(--text);
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  text-decoration: none;
}
</style>

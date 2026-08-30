<script setup>
/**
 * Les téléchargements : le planning (engendré par le serveur) puis les PDF
 * téléversés depuis l'admin.
 *
 * Le planning est en tête et porte l'aplat rouge : c'est le document que le
 * visiteur cherche le plus souvent, et le seul qui soit toujours à jour.
 */
import { computed } from "vue";
import { trackClick } from "../composables/useTracking";
import { assetUrl, API_ORIGIN } from "../services/api";

const props = defineProps({
  config: { type: Object, required: true },
  data: { type: Object, required: true },
});

const bloc = computed(() => props.data.settings?.documents ?? {});
const documents = computed(() => props.data.documents ?? []);

/** « 248 Ko », « 1,2 Mo » — un visiteur en 4G aime savoir ce qu'il déclenche. */
function poids(octets) {
  if (!octets) return "PDF";
  const ko = octets / 1024;
  if (ko < 1024) return `PDF · ${Math.round(ko)} Ko`;
  return `PDF · ${(ko / 1024).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Mo`;
}

const lienPlanning = `${API_ORIGIN}/api/planning/pdf`;
</script>

<template>
  <section :id="config.id" class="documents">
    <div class="wrap">
      <div v-reveal="'fade'" class="section-head">
        <span class="chapitre">{{ config.chapitre }}</span>
        <span class="surtitre">{{ bloc.surtitre }}</span>
        <span class="filet" aria-hidden="true"></span>
      </div>

      <h2 v-reveal="'up'" class="section-titre">{{ bloc.titre }}</h2>
      <p v-if="bloc.texte" v-reveal="{ variant: 'up', delay: 140 }" class="section-intro">
        {{ bloc.texte }}
      </p>

      <div v-reveal.stagger class="liste">
        <a class="document est-principal" :href="lienPlanning" @click="trackClick('planning')">
          <span class="numero">01</span>
          <span class="texte">
            <strong>Le planning</strong>
            <span class="detail">PDF · toujours à jour</span>
          </span>
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 4v11m0 0 4-4m-4 4-4-4M5 19h14" /></svg>
        </a>

        <a
          v-for="(doc, index) in documents"
          :key="doc._id"
          class="document"
          :href="assetUrl(doc.url)"
          target="_blank"
          rel="noopener"
          @click="trackClick('document')"
        >
          <span class="numero">{{ String(index + 2).padStart(2, "0") }}</span>
          <span class="texte">
            <strong>{{ doc.titre }}</strong>
            <span class="detail">{{ doc.description || poids(doc.taille) }}</span>
          </span>
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2.4" stroke-linecap="round"><path d="M12 4v11m0 0 4-4m-4 4-4-4M5 19h14" /></svg>
        </a>
      </div>
    </div>
  </section>
</template>

<style scoped>
.documents {
  background: var(--surface);
}

.liste {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  margin-top: 1.4rem;
}

.document {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  /* 62 px : ce sont les actions principales de la section, on leur donne de
     la place bien au-delà du plancher tactile. */
  min-height: 62px;
  padding: 0 1rem;
  border: 1px solid var(--brand-500);
  color: var(--text);
  text-decoration: none;
  transition: border-color var(--motion-fast) var(--ease-out),
    transform var(--motion-fast) var(--ease-out);
}

.document:hover {
  border-color: var(--primary);
  transform: translateX(3px);
}

.document.est-principal {
  background: var(--primary);
  border-color: var(--primary);
  color: var(--on-primary);
}

.document.est-principal:hover {
  background: var(--primary-strong);
  border-color: var(--primary-strong);
}

.numero {
  flex: none;
  font-family: var(--font-display);
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text-muted);
}

.est-principal .numero {
  color: currentColor;
  opacity: 0.7;
}

.texte {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}

.texte strong {
  font-family: var(--font-display);
  font-size: 1.02rem;
  font-weight: 700;
  text-transform: uppercase;
}

.detail {
  font-size: 0.72rem;
  color: var(--text-muted);
}

.est-principal .detail {
  color: currentColor;
  opacity: 0.85;
}
</style>

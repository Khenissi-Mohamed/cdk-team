<script setup>
/**
 * Le manifeste du club, plus trois chiffres qui s'incrémentent.
 *
 * Le texte est un seul champ de l'admin : les paragraphes sont séparés par une
 * ligne vide, comme dans un traitement de texte. On les découpe ici plutôt que
 * d'imposer au gérant un champ par paragraphe.
 */
import { computed } from "vue";
import CountUp from "../components/motion/CountUp.vue";

const props = defineProps({
  config: { type: Object, required: true },
  data: { type: Object, required: true },
});

const club = computed(() => props.data.settings?.club ?? {});

const paragraphes = computed(() =>
  String(club.value.texte ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
);

const chiffres = computed(() => club.value.chiffres ?? []);
</script>

<template>
  <section :id="config.id" class="club">
    <div class="wrap">
      <div v-reveal="'fade'" class="section-head">
        <span class="chapitre">{{ config.chapitre }}</span>
        <span class="surtitre">{{ club.surtitre }}</span>
        <span class="filet" aria-hidden="true"></span>
      </div>

      <h2 v-reveal="'up'" class="section-titre">
        {{ club.titre }}<br /><span class="accent">{{ club.titreAccent }}</span>
      </h2>

      <div v-reveal="{ variant: 'up', delay: 160 }" class="club-texte">
        <p v-for="(paragraphe, i) in paragraphes" :key="i">{{ paragraphe }}</p>
      </div>

      <!-- Trois preuves en ligne, séparées par des filets : lisible d'un coup
           d'oeil, sans ajouter une grille de cartes de plus. -->
      <div v-if="chiffres.length" v-reveal="{ variant: 'up', delay: 280 }" class="chiffres">
        <div v-for="chiffre in chiffres" :key="chiffre.libelle" class="chiffre">
          <span class="chiffre-valeur">
            <CountUp :to="chiffre.valeur" :suffix="chiffre.suffixe ?? ''" />
          </span>
          <span class="chiffre-libelle">{{ chiffre.libelle }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.club {
  background: var(--surface);
}

.accent {
  color: var(--primary);
}

.club-texte {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: var(--content-narrow);
}

.club-texte p {
  margin: 0;
  font-size: 1.02rem;
  line-height: 1.65;
  color: var(--neutral-300);
}

.chiffres {
  display: flex;
  margin-top: 1.8rem;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}

.chiffre {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.95rem 0.7rem;
}

.chiffre + .chiffre {
  border-left: 1px solid var(--border);
}

.chiffre-valeur {
  font-family: var(--font-display);
  font-size: clamp(1.6rem, 6vw, 2.4rem);
  font-weight: 700;
  line-height: 1;
}

.chiffre-libelle {
  font-size: 0.72rem;
  line-height: 1.3;
  color: var(--text-muted);
}
</style>

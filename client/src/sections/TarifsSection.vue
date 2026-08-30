<script setup>
/**
 * Les formules d'adhésion. Le montant s'incrémente au défilement ; l'unité est
 * affichée à part et ne défile pas avec lui, sinon on verrait « € » gigoter.
 */
import { computed } from "vue";
import CountUp from "../components/motion/CountUp.vue";

const props = defineProps({
  config: { type: Object, required: true },
  data: { type: Object, required: true },
});

const bloc = computed(() => props.data.settings?.tarifs ?? {});
const tarifs = computed(() => props.data.tarifs ?? []);
</script>

<template>
  <section v-if="tarifs.length" :id="config.id" class="tarifs">
    <div class="wrap">
      <div v-reveal="'fade'" class="section-head">
        <span class="chapitre">{{ config.chapitre }}</span>
        <span class="surtitre">{{ bloc.surtitre }}</span>
        <span class="filet" aria-hidden="true"></span>
      </div>

      <h2 v-reveal="'up'" class="section-titre">{{ bloc.titre }}</h2>

      <div v-reveal.stagger class="liste">
        <div
          v-for="tarif in tarifs"
          :key="tarif._id"
          class="ligne"
          :class="{ 'est-mis-en-avant': tarif.misEnAvant }"
        >
          <div class="ligne-texte">
            <strong>{{ tarif.libelle }}</strong>
            <span v-if="tarif.mention" class="mention">{{ tarif.mention }}</span>
          </div>
          <span class="montant">
            <CountUp :to="tarif.montant" /><span class="unite">&nbsp;€</span>
          </span>
        </div>
      </div>

      <p v-if="bloc.note" class="note">{{ bloc.note }}</p>
    </div>
  </section>
</template>

<style scoped>
.tarifs {
  background: var(--surface-alt);
}

.liste {
  display: flex;
  flex-direction: column;
}

.ligne {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.1rem 0;
  border-top: 1px solid var(--border);
}

.ligne:last-child {
  border-bottom: 1px solid var(--border);
}

.ligne-texte {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.ligne-texte strong {
  font-family: var(--font-display);
  font-size: 1.18rem;
  font-weight: 700;
  text-transform: uppercase;
}

.mention {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.montant {
  flex: none;
  display: flex;
  align-items: baseline;
  font-family: var(--font-display);
  font-size: clamp(2.2rem, 11vw, 3.4rem);
  font-weight: 700;
  line-height: 0.85;
  letter-spacing: -0.02em;
}

/* La formule mise en avant — l'essai gratuit, en pratique — prend le rouge :
   c'est la seule de la liste qu'on veut faire remarquer. */
.est-mis-en-avant .montant {
  color: var(--primary);
  font-size: clamp(1.7rem, 8vw, 2.4rem);
}

.unite {
  font-size: 0.45em;
}

.note {
  margin: 0.9rem 0 0;
  font-size: 0.8rem;
  line-height: 1.55;
  color: var(--text-muted);
}
</style>

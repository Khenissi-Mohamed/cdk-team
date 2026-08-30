<script setup>
/**
 * Accroche. Le titre est calé pour REMPLIR la largeur (voir `--size-hero`) :
 * c'est ce remplissage bord à bord qui donne le registre affiche plutôt que
 * bandeau de club.
 *
 * Le second mot porte l'effet de balayage (`.balayage`, dans `theme.css`).
 */
import { computed } from "vue";

const props = defineProps({
  config: { type: Object, required: true },
  data: { type: Object, required: true },
});

const hero = computed(() => props.data.settings?.hero ?? {});
const ville = computed(() => props.data.settings?.ville ?? "");

// Le surtitre porte la ville quand elle est renseignée : c'est la première
// question que se pose un visiteur qui découvre le club.
const surtitre = computed(() =>
  [hero.value.surtitre, ville.value].filter(Boolean).join(" · ")
);
</script>

<template>
  <section :id="config.id" class="hero">
    <span class="halo" aria-hidden="true"></span>

    <div class="wrap hero-contenu">
      <p v-if="surtitre" v-reveal="'fade'" class="hero-surtitre">
        <span class="tiret" aria-hidden="true"></span>{{ surtitre }}
      </p>

      <h1 v-reveal="{ variant: 'up', delay: 120 }" class="hero-titre">
        {{ hero.titre }}<br /><span class="balayage">{{ hero.titreAccent }}</span>
      </h1>

      <p v-reveal="{ variant: 'up', delay: 300 }" class="hero-texte">{{ hero.texte }}</p>

      <div v-reveal="{ variant: 'up', delay: 420 }" class="hero-actions">
        <a class="bouton-plein" href="#inscription">
          {{ hero.ctaPrincipal }}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 12h14m0 0-5-5m5 5-5 5" /></svg>
        </a>
        <a class="bouton-vide" href="#planning">
          {{ hero.ctaSecondaire }}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14m0 0 5-5m-5 5-5-5" /></svg>
        </a>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  overflow: hidden;
  isolation: isolate;
  /* Remonte sous l'en-tête fixe : le halo passe derrière lui. */
  margin-top: calc(var(--header-height) * -1);
  padding-top: calc(var(--header-height) + var(--space-section)) !important;
}

/* Un halo unique et très large, plutôt qu'un dégradé décoratif : donne de la
   profondeur sans le vocabulaire visuel de tous les sites de sport. */
.halo {
  position: absolute;
  left: -40%;
  top: -6%;
  width: 180%;
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(193, 18, 31, 0.16) 0%, rgba(10, 10, 11, 0) 62%);
  pointer-events: none;
  z-index: -1;
}

.hero-contenu {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.hero-surtitre {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  margin: 0;
  font-family: var(--font-display);
  font-size: 0.72rem;
  font-weight: 500;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.tiret {
  width: 26px;
  height: 2px;
  background: var(--primary);
  flex: none;
}

.hero-titre {
  margin: 0;
  font-size: var(--size-hero);
  line-height: 0.82;
  letter-spacing: -0.03em;
}

.hero-texte {
  margin: 0;
  font-size: 1.06rem;
  line-height: 1.5;
  color: var(--neutral-300);
  max-width: 32ch;
}

.hero-actions {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-top: 0.4rem;
}

@media (min-width: 620px) {
  .hero-actions {
    flex-direction: row;
  }

  .hero-actions > * {
    flex: 1;
    max-width: 300px;
  }
}

.bouton-plein,
.bouton-vide {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  /* 56 px : bien au-dessus du plancher tactile de 44 px, parce que ce sont les
     deux seules actions de l'écran. */
  min-height: 56px;
  padding: 0 1.15rem;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  text-decoration: none;
  transition: background var(--motion-fast) var(--ease-out),
    border-color var(--motion-fast) var(--ease-out);
}

.bouton-plein {
  background: var(--primary);
  color: var(--on-primary);
}

.bouton-plein:hover {
  background: var(--primary-strong);
}

.bouton-vide {
  border: 1px solid var(--brand-500);
  color: var(--text);
  font-weight: 500;
}

.bouton-vide:hover {
  border-color: var(--primary);
}
</style>

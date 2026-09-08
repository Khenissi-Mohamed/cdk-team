<script setup>
/**
 * Accroche. Le titre est calé pour REMPLIR la largeur (voir `--size-hero`) :
 * c'est ce remplissage bord à bord qui donne le registre affiche plutôt que
 * bandeau de club.
 *
 * Le second mot porte l'effet de balayage (`.balayage`, dans `theme.css`).
 */
import { computed } from "vue";
import { assetUrl } from "../services/api";

const props = defineProps({
  config: { type: Object, required: true },
  data: { type: Object, required: true },
});

const hero = computed(() => props.data.settings?.hero ?? {});
const ville = computed(() => props.data.settings?.ville ?? "");
const imageFond = computed(() => assetUrl(hero.value.imageFond));
const styleTitre = computed(() => {
  const longueur = Math.max(hero.value.titre?.length ?? 0, hero.value.titreAccent?.length ?? 0, 4);
  return { "--hero-scale": `${Math.min(27, 108 / longueur)}vw` };
});

// Le surtitre porte la ville quand elle est renseignée : c'est la première
// question que se pose un visiteur qui découvre le club.
const surtitre = computed(() =>
  [hero.value.surtitre, ville.value].filter(Boolean).join(" · ")
);
</script>

<template>
  <section :id="config.id" class="hero">
    <div
      v-if="imageFond"
      class="hero-image"
      :style="{ backgroundImage: `url(${imageFond})` }"
      aria-hidden="true"
    ></div>
    <span class="halo" aria-hidden="true"></span>

    <div class="wrap">
      <div class="hero-contenu">
        <p v-if="surtitre" v-reveal="'fade'" class="hero-surtitre">
          <span class="tiret" aria-hidden="true"></span>{{ surtitre }}
        </p>

        <h1 v-reveal="{ variant: 'up', delay: 120 }" class="hero-titre" :style="styleTitre">
          <span class="ligne-titre">{{ hero.titre }}</span>
          <span class="ligne-titre balayage">{{ hero.titreAccent }}</span>
        </h1>

        <p v-reveal="{ variant: 'up', delay: 300 }" class="hero-texte">{{ hero.texte }}</p>
        <p v-if="ville" class="hero-texte">
          Club de jiu-jitsu brésilien (JJB) à {{ ville }}.
          Retrouvez les cours, les horaires et les informations pour vous inscrire ci-dessous.
        </p>

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

.hero-image {
  position: absolute;
  inset: 0;
  z-index: -2;
  background-position: center;
  background-size: cover;
}

.hero-image::after {
  content: "";
  position: absolute;
  inset: 0;
  background: rgba(10, 10, 11, 0.72);
}

.hero > .wrap {
  box-sizing: border-box;
  width: 100%;
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
  align-items: center;
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
  width: 100%;
  padding: 0.04em 0 0.1em;
  font-size: clamp(4rem, var(--hero-scale), 10rem);
  line-height: 0.86;
  letter-spacing: -0.03em;
  text-align: center;
}

.ligne-titre {
  display: block;
  width: 100%;
  max-width: 100%;
  margin: 0;
  text-align: center;
}

.hero-texte {
  margin: 0;
  width: 100%;
  max-width: 32ch;
  font-size: 1.06rem;
  line-height: 1.5;
  color: var(--neutral-300);
  text-align: center;
}

.hero-actions {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-top: 0.4rem;
  align-self: stretch;
  width: 100%;
  max-width: 610px;
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

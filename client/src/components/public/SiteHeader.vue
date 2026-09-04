<script setup>
/**
 * En-tête collant. Le logo vient de l'administration : tant qu'il n'est pas
 * téléversé, seul le nom du club s'affiche — un cadre vide serait pire.
 *
 * Le panneau de navigation mobile est monté sur <body> via <Teleport> et NON à
 * l'intérieur du <header> : `backdrop-filter` fait du header un bloc conteneur
 * pour ses descendants `position: fixed`. Imbriqué, le panneau se calait sur
 * les 60 px de l'en-tête au lieu du viewport, et son contenu était tronqué.
 */
import { ref, watch, onMounted, onUnmounted, computed } from "vue";
import { RouterLink } from "vue-router";
import { assetUrl } from "../../services/api";

const props = defineProps({
  nav: { type: Array, default: () => [] },
  settings: { type: Object, default: () => ({}) },
});

const menuOuvert = ref(false);

// Une entrée de menu vise soit une ancre de la page d'accueil (« #tarifs »),
// soit une page à part (« /boutique »). La seconde doit passer par le routeur :
// un <a href> rechargerait tout le site pour changer de page.
const estRoute = (href) => href.startsWith("/");

const logo = computed(() => (props.settings.logo ? assetUrl(props.settings.logo) : ""));
const nomClub = computed(() => props.settings.nomClub || "CDK-Team");

function surTouche(event) {
  if (event.key === "Escape") menuOuvert.value = false;
}

onMounted(() => window.addEventListener("keydown", surTouche));
onUnmounted(() => {
  window.removeEventListener("keydown", surTouche);
  document.body.style.removeProperty("overflow");
});

// Panneau ouvert : on bloque le défilement derrière, sinon la page continue de
// filer sous le menu au moindre glissement.
watch(menuOuvert, (ouvert) => {
  if (ouvert) document.body.style.setProperty("overflow", "hidden");
  else document.body.style.removeProperty("overflow");
});
</script>

<template>
  <header class="entete">
    <div class="wrap barre">
      <a class="marque" href="#accueil" @click="menuOuvert = false">
        <img v-if="logo" :src="logo" :alt="nomClub" class="logo" />
        <span class="nom">{{ nomClub }}</span>
      </a>

      <nav class="liens" aria-label="Navigation principale">
        <template v-for="item in nav" :key="item.href">
          <RouterLink v-if="estRoute(item.href)" :to="item.href">{{ item.label }}</RouterLink>
          <a v-else :href="item.href">{{ item.label }}</a>
        </template>
      </nav>

      <button
        class="bouton-menu"
        type="button"
        :aria-expanded="menuOuvert"
        aria-controls="menu-mobile"
        :aria-label="menuOuvert ? 'Fermer le menu' : 'Ouvrir le menu'"
        @click="menuOuvert = !menuOuvert"
      >
        <span class="barreau"></span>
        <span class="barreau"></span>
      </button>
    </div>
  </header>

  <Teleport to="body">
    <Transition name="menu">
      <div
        v-if="menuOuvert"
        id="menu-mobile"
        class="panneau"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
      >
        <span class="ceinture" aria-hidden="true"></span>

        <nav class="panneau-nav">
          <component
            :is="estRoute(item.href) ? RouterLink : 'a'"
            v-for="(item, index) in nav"
            :key="item.href"
            v-bind="estRoute(item.href) ? { to: item.href } : { href: item.href }"
            :style="{ '--item-index': index }"
            @click="menuOuvert = false"
          >
            <span class="index">{{ String(index + 1).padStart(2, "0") }}</span>
            <span class="libelle">{{ item.label }}</span>
          </component>
        </nav>

        <a class="panneau-cta" href="#inscription" @click="menuOuvert = false">S'inscrire</a>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.entete {
  position: sticky;
  top: 0;
  z-index: var(--z-header);
  background: rgba(10, 10, 11, 0.86);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--border);
}

.barre {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  height: var(--header-height);
}

.marque {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  color: inherit;
  text-decoration: none;
  min-width: 0;
}

.logo {
  flex: none;
  height: 34px;
  width: auto;
  max-width: 120px;
  object-fit: contain;
  display: block;
}

.nom {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.16rem;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  white-space: nowrap;
}

.liens {
  display: none;
  gap: 1.7rem;
  font-size: 0.88rem;
  font-weight: 600;
}

.liens a {
  color: inherit;
  text-decoration: none;
  opacity: 0.82;
  transition: opacity var(--motion-fast) var(--ease-out);
}

.liens a:hover {
  opacity: 1;
}

.bouton-menu {
  /* 44 px : plancher de cible tactile. */
  width: 44px;
  height: 44px;
  margin-right: -0.6rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: none;
  background: none;
  cursor: pointer;
}

.barreau {
  width: 22px;
  height: 2px;
  background: var(--text);
}

@media (min-width: 900px) {
  .liens {
    display: flex;
  }

  .bouton-menu {
    display: none;
  }
}

/* --- Panneau mobile --- */
.panneau {
  position: fixed;
  inset: 0;
  z-index: calc(var(--z-header) - 1);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow-y: auto;
  overscroll-behavior: contain;
  background: var(--surface);
  padding: calc(var(--header-height) + 2rem) var(--gutter)
    calc(2rem + env(safe-area-inset-bottom));
}

.panneau .ceinture {
  position: absolute;
  top: var(--header-height);
  left: 0;
  right: 0;
}

.panneau-nav {
  display: flex;
  flex-direction: column;
}

.panneau-nav a {
  display: flex;
  align-items: baseline;
  gap: 0.85rem;
  padding: 1.05rem 0;
  border-bottom: 1px solid var(--border);
  color: var(--text);
  text-decoration: none;
  /* Entrée en cascade : le panneau se remplit au lieu d'apparaître d'un bloc. */
  animation: entree-item var(--motion-base) var(--ease-out) backwards;
  animation-delay: calc(120ms + var(--item-index) * 60ms);
}

.index {
  font-family: var(--font-display);
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--primary);
  letter-spacing: 0.1em;
}

.libelle {
  font-family: var(--font-display);
  font-size: clamp(1.9rem, 9vw, 2.6rem);
  font-weight: 700;
  text-transform: uppercase;
  line-height: 1.05;
}

.panneau-cta {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 54px;
  background: var(--primary);
  color: var(--on-primary);
  font-family: var(--font-display);
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  text-decoration: none;
}

@keyframes entree-item {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
}

.menu-enter-active,
.menu-leave-active {
  transition: opacity var(--motion-fast) var(--ease-out);
}

.menu-enter-from,
.menu-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .panneau-nav a {
    animation: none;
  }
}
</style>

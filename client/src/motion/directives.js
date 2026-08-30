/**
 * Directives Vue posées sur le socle de `observer.js`.
 *
 *   <div v-reveal>                    révélation par défaut (fondu + montée)
 *   <div v-reveal="'left'">           variante d'entrée
 *   <div v-reveal.stagger>            cascade sur les enfants directs
 *   <div v-reveal="{ variant: 'scale', delay: 200, once: false }">
 *   <img v-parallax>                  parallax d'amplitude par défaut
 *   <img v-parallax="0.4">            amplitude personnalisée
 *
 * `v-reveal` et `v-parallax` pilotent tous les deux `transform` : ne pas les
 * poser sur le même élément, mettre le parallax sur un enfant.
 */

import {
  observeReveal,
  unobserveReveal,
  observeParallax,
  unobserveParallax,
} from "./observer";

function normalize(value) {
  if (typeof value === "string") return { variant: value };
  if (typeof value === "number") return { delay: value };
  return value ?? {};
}

export const vReveal = {
  mounted(el, binding) {
    const { variant = "up", delay = 0, once = true } = normalize(binding.value);

    // `.stagger` : les enfants directs se révèlent en cascade. Évite de poser
    // une directive et un délai à la main sur chaque carte d'une grille.
    //
    // La cascade est décrite entièrement en CSS (`[data-reveal-group] > *`, avec
    // le décalage par `:nth-child`) et non en parcourant `el.children` ici : les
    // enfants viennent presque toujours d'un appel API et n'existent donc pas
    // encore au montage. Les énumérer maintenant ne staggerait rien du tout.
    if (binding.modifiers.stagger) {
      el.dataset.revealGroup = variant;
      if (delay) el.style.setProperty("--reveal-group-delay", `${delay}ms`);
    } else {
      el.dataset.reveal = variant;
      if (delay) el.style.setProperty("--reveal-delay", `${delay}ms`);
    }

    observeReveal(el, { once });
  },

  unmounted(el) {
    unobserveReveal(el);
  },
};

export const vParallax = {
  mounted(el, binding) {
    const speed = typeof binding.value === "number" ? binding.value : 0.25;
    el.dataset.parallax = "";
    observeParallax(el, speed);
  },

  unmounted(el) {
    unobserveParallax(el);
  },
};

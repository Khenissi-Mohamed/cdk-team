/**
 * Socle d'animation au scroll — sans aucune dépendance externe.
 *
 * Tout le site partage :
 *   - UN IntersectionObserver pour les révélations à l'entrée du viewport
 *   - UN IntersectionObserver + UNE boucle rAF pour le parallax
 *
 * Mutualiser est le point important : avec un observer et un listener de
 * scroll par élément, une page de soixante éléments animés paie soixante
 * callbacks à chaque frame. Ici le coût reste constant, et seuls les éléments
 * réellement visibles sont recalculés.
 *
 * Portabilité : ce fichier n'importe rien de Vue. Il se recopie tel quel dans
 * un projet React, Svelte ou vanilla — seul `directives.js` est spécifique.
 */

const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

export function prefersReducedMotion() {
  return reducedMotionQuery.matches;
}

/* ------------------------------------------------------------------ *
 * Révélation à l'entrée dans le viewport
 * ------------------------------------------------------------------ */

const revealOptions = new WeakMap();
let revealObserver = null;

function handleReveal(entries) {
  for (const entry of entries) {
    const options = revealOptions.get(entry.target);
    if (!options) continue;

    if (entry.isIntersecting) {
      entry.target.classList.add("is-revealed");
      options.onReveal?.();
      // `once` par défaut : une fois vue, la section reste acquise. Rejouer
      // l'animation à chaque passage donne un clignotement désagréable quand
      // l'utilisateur remonte la page.
      if (options.once) unobserveReveal(entry.target);
    } else if (!options.once) {
      entry.target.classList.remove("is-revealed");
    }
  }
}

function getRevealObserver() {
  if (!revealObserver) {
    revealObserver = new IntersectionObserver(handleReveal, {
      // Déclenche quand l'élément a franchi le bas du viewport d'environ 12 %
      // de sa hauteur : l'animation est finie au moment où l'œil arrive.
      rootMargin: "0px 0px -12% 0px",
      threshold: 0,
    });
  }
  return revealObserver;
}

export function observeReveal(el, { once = true, onReveal = null } = {}) {
  // Accessibilité : si l'utilisateur a demandé moins d'animations, on affiche
  // l'état final tout de suite plutôt que de ne rien afficher du tout.
  if (prefersReducedMotion()) {
    el.classList.add("is-revealed");
    onReveal?.();
    return;
  }
  revealOptions.set(el, { once, onReveal });
  getRevealObserver().observe(el);
}

export function unobserveReveal(el) {
  revealOptions.delete(el);
  revealObserver?.unobserve(el);
}

/* ------------------------------------------------------------------ *
 * Présence à l'écran
 * ------------------------------------------------------------------ */

/**
 * Prévient à l'entrée ET à la sortie du viewport, indéfiniment — là où
 * `observeReveal` est un aller simple qui se désabonne après le premier
 * passage.
 *
 * C'est ce dont un média a besoin : une vidéo doit se lancer quand sa section
 * arrive, mais surtout se METTRE EN PAUSE quand elle repart. Sans la sortie,
 * on laisserait tourner un décodeur — et éventuellement du son — sur une
 * section que plus personne ne regarde.
 *
 * Un observer par seuil, partagé par tous les éléments qui le demandent :
 * `threshold` ne peut pas varier d'un élément à l'autre au sein d'un même
 * observer, mais les seuils réellement utilisés se comptent sur une main.
 */
const inViewCallbacks = new WeakMap();
const inViewObservers = new Map();

function handleInView(entries) {
  for (const entry of entries) {
    const callbacks = inViewCallbacks.get(entry.target);
    if (!callbacks) continue;
    if (entry.isIntersecting) callbacks.onEnter?.(entry);
    else callbacks.onLeave?.(entry);
  }
}

function getInViewObserver(seuil) {
  if (!inViewObservers.has(seuil)) {
    inViewObservers.set(seuil, new IntersectionObserver(handleInView, { threshold: seuil }));
  }
  return inViewObservers.get(seuil);
}

/**
 * @param {Element} el
 * @param {{ onEnter?: Function, onLeave?: Function, seuil?: number }} options
 *   `seuil` est la fraction de l'élément qui doit être visible. 0.35 convient
 *   à une section pleine hauteur : elle ne « rentre » qu'une fois vraiment
 *   engagée à l'écran, pas dès que son premier pixel affleure.
 * @returns {() => void} désabonnement
 */
export function observeInView(el, { onEnter = null, onLeave = null, seuil = 0.35 } = {}) {
  const observer = getInViewObserver(seuil);
  inViewCallbacks.set(el, { onEnter, onLeave });
  observer.observe(el);

  return () => {
    inViewCallbacks.delete(el);
    observer.unobserve(el);
  };
}

/* ------------------------------------------------------------------ *
 * Parallax
 * ------------------------------------------------------------------ */

const parallaxSpeeds = new Map();
const parallaxVisible = new Set();
let parallaxObserver = null;
let parallaxFrame = null;
let parallaxListening = false;

/**
 * Mobile d'abord : sur un écran étroit, un décalage de 40 px mange une part
 * énorme de la hauteur visible et donne un rendu brouillon. On divise donc
 * l'amplitude par deux sous 720 px plutôt que de couper l'effet.
 */
function amplitudeFactor() {
  return window.innerWidth < 720 ? 0.5 : 1;
}

function getParallaxObserver() {
  if (!parallaxObserver) {
    parallaxObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) parallaxVisible.add(entry.target);
          else parallaxVisible.delete(entry.target);
        }
        scheduleParallax();
      },
      {
        // Marge large : l'élément doit déjà être décalé correctement avant
        // d'apparaître, sinon on voit un saut au bord du viewport.
        rootMargin: "20% 0px 20% 0px",
        threshold: 0,
      }
    );
  }
  return parallaxObserver;
}

function updateParallax() {
  parallaxFrame = null;
  const viewportH = window.innerHeight;
  const factor = amplitudeFactor();

  for (const el of parallaxVisible) {
    const speed = parallaxSpeeds.get(el);
    if (speed == null) continue;

    const rect = el.getBoundingClientRect();
    // -1 quand l'élément entre par le bas, 0 quand il est centré, +1 quand il
    // sort par le haut.
    const center = rect.top + rect.height / 2;
    const progress = (center - viewportH / 2) / ((viewportH + rect.height) / 2);
    const clamped = Math.max(-1, Math.min(1, progress));

    // On écrit une variable CSS plutôt que `transform` : l'élément reste libre
    // de cumuler d'autres transformations dans sa propre feuille de style.
    const offset = clamped * speed * factor * 100;
    el.style.setProperty("--parallax-y", `${offset.toFixed(2)}px`);
  }
}

function scheduleParallax() {
  if (parallaxFrame === null && parallaxVisible.size > 0) {
    parallaxFrame = requestAnimationFrame(updateParallax);
  }
}

function ensureParallaxListeners() {
  if (parallaxListening) return;
  window.addEventListener("scroll", scheduleParallax, { passive: true });
  window.addEventListener("resize", scheduleParallax, { passive: true });
  parallaxListening = true;
}

export function observeParallax(el, speed = 0.25) {
  if (prefersReducedMotion()) return;
  parallaxSpeeds.set(el, speed);
  ensureParallaxListeners();
  getParallaxObserver().observe(el);
  scheduleParallax();
}

export function unobserveParallax(el) {
  parallaxSpeeds.delete(el);
  parallaxVisible.delete(el);
  parallaxObserver?.unobserve(el);
  el.style.removeProperty("--parallax-y");
}

/* ------------------------------------------------------------------ *
 * Progressions
 * ------------------------------------------------------------------ */

/** Abonnement scroll+resize throttlé par requestAnimationFrame. */
function subscribe(compute) {
  let frame = null;

  const run = () => {
    frame = null;
    compute();
  };
  const request = () => {
    if (frame === null) frame = requestAnimationFrame(run);
  };

  window.addEventListener("scroll", request, { passive: true });
  window.addEventListener("resize", request, { passive: true });
  compute();

  return () => {
    if (frame !== null) cancelAnimationFrame(frame);
    window.removeEventListener("scroll", request);
    window.removeEventListener("resize", request);
  };
}

/** Progression de lecture de la page entière, de 0 à 1. */
export function onScrollProgress(callback) {
  return subscribe(() => {
    const doc = document.documentElement;
    const scrollable = doc.scrollHeight - window.innerHeight;
    callback(scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0);
  });
}

/**
 * Progression d'un élément dans sa propre plage de scroll : 0 quand son haut
 * atteint le haut du viewport, 1 quand son bas l'atteint. C'est ce dont une
 * scène épinglée a besoin pour savoir où elle en est.
 */
export function onElementProgress(el, callback) {
  return subscribe(() => {
    const rect = el.getBoundingClientRect();
    const travel = rect.height - window.innerHeight;
    if (travel <= 0) {
      callback(0);
      return;
    }
    callback(Math.min(1, Math.max(0, -rect.top / travel)));
  });
}

/**
 * Désigne, parmi un groupe d'éléments, celui qui occupe le centre de l'écran.
 * Sert aux scènes épinglées : le visuel doit suivre le paragraphe que
 * l'utilisateur est en train de lire.
 */
export function observeActiveStep(elements, callback) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const index = elements.indexOf(entry.target);
        if (index !== -1) callback(index);
      }
    },
    {
      // Bande étroite au milieu de l'écran : un seul élément peut la couper à
      // la fois, ce qui évite les hésitations entre deux étapes voisines.
      rootMargin: "-45% 0px -45% 0px",
      threshold: 0,
    }
  );

  elements.forEach((el) => observer.observe(el));
  return () => observer.disconnect();
}

<script setup>
/**
 * Le planning de la semaine, en deux temps :
 *   A — la grille des sept jours, tout visible d'un coup ;
 *   C — le jour sélectionné, déplié en grand sous la grille.
 *
 * Les lignes de la grille sont les heures de début RÉELLEMENT utilisées, pas
 * une échelle de 7h à 22h : un club a une quinzaine de créneaux, une grille
 * horaire complète serait vide aux trois quarts et donnerait l'impression d'un
 * club mort.
 */
import { ref, computed, watch } from "vue";
import siteConfig from "../site.config";
import { trackClick } from "../composables/useTracking";
import { API_ORIGIN } from "../services/api";

const props = defineProps({
  config: { type: Object, required: true },
  data: { type: Object, required: true },
});

const bloc = computed(() => props.data.settings?.planning ?? {});
const cours = computed(() => props.data.cours ?? []);

const JOURS = siteConfig.jours;

/** « 07:00 » → 420. Sert au tri des lignes et au partage matin / soir. */
const enMinutes = (heure) => {
  const [h, m] = String(heure).split(":").map(Number);
  return h * 60 + m;
};

// Une ligne par heure de début distincte, dans l'ordre chronologique.
const heures = computed(() =>
  [...new Set(cours.value.map((c) => c.heureDebut))].sort((a, b) => enMinutes(a) - enMinutes(b))
);

/**
 * `grille[heure][jour]` — un tableau, car deux cours peuvent partager le même
 * créneau (deux tapis). La case les empile alors au lieu d'en perdre un.
 */
const grille = computed(() => {
  const map = new Map();
  cours.value.forEach((c) => {
    const cle = `${c.heureDebut}|${c.jour}`;
    if (!map.has(cle)) map.set(cle, []);
    map.get(cle).push(c);
  });
  return map;
});

const casesDe = (heure, jour) => grille.value.get(`${heure}|${jour}`) ?? [];

/** Index de la ligne à partir de laquelle on bascule sur le bloc du soir. */
const premiereLigneSoir = computed(() =>
  heures.value.findIndex((h) => enMinutes(h) >= 14 * 60)
);

/* Jour sélectionné ------------------------------------------------------- */

const jourActif = ref(1);

// Sur le NOMBRE de cours et non sur `onMounted` : les créneaux arrivent de
// l'API après le montage, donc au montage la liste est toujours vide et le
// jour du jour ne serait jamais choisi.
watch(
  () => cours.value.length,
  (total) => {
    if (!total) return;
    // On ouvre sur AUJOURD'HUI : c'est la question que se pose le visiteur.
    // `getDay()` renvoie 0 pour dimanche, la base suit la convention ISO où
    // dimanche vaut 7.
    const aujourdhui = new Date().getDay() || 7;
    // Sauf si le club est fermé ce jour-là : on retombe alors sur le premier
    // jour qui a cours, plutôt que d'afficher « aucun cours » d'entrée.
    jourActif.value = coursDuJour(aujourdhui).length
      ? aujourdhui
      : (JOURS.find((j) => coursDuJour(j.numero).length)?.numero ?? 1);
  },
  { immediate: true }
);

function coursDuJour(jour) {
  return cours.value
    .filter((c) => c.jour === jour)
    .sort((a, b) => enMinutes(a.heureDebut) - enMinutes(b.heureDebut));
}

const coursActifs = computed(() => coursDuJour(jourActif.value));
const nomJourActif = computed(
  () => JOURS.find((j) => j.numero === jourActif.value)?.long ?? ""
);

const compteParJour = computed(() =>
  Object.fromEntries(JOURS.map((j) => [j.numero, coursDuJour(j.numero).length]))
);

/* Affichage -------------------------------------------------------------- */

const TYPES = Object.fromEntries(siteConfig.typesCours.map((t) => [t.value, t]));

const couleurDe = (type) => TYPES[type]?.couleur ?? "var(--brand-600)";

/** La compétition prend l'encre sombre : sa case est claire. */
const encreDe = (type) => (type === "competition" ? "var(--surface)" : "var(--text)");

/** « 07:00 » + 90 min → « 08:30 ». */
function heureFin(heureDebut, duree) {
  const total = enMinutes(heureDebut) + Number(duree || 0);
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Les minutes d'un horaire, affichées en coin de case quand elles ne sont pas
 *  rondes : c'est ce qui permet de lire « 12h15 » dans une case de 45 px. */
function minutesParticulieres(heure) {
  const m = heure.split(":")[1];
  return m === "00" ? "" : m;
}

const lienPdf = `${API_ORIGIN}/api/planning/pdf`;
</script>

<template>
  <section :id="config.id" class="planning">
    <div class="wrap">
      <div v-reveal="'fade'" class="section-head">
        <span class="chapitre">{{ config.chapitre }}</span>
        <span class="surtitre">{{ bloc.surtitre }}</span>
        <span class="filet" aria-hidden="true"></span>
      </div>

      <div class="planning-tete">
        <h2 v-reveal="'up'" class="section-titre">{{ bloc.titre }}</h2>
        <span v-if="bloc.badge" v-reveal="'fade'" class="badge">{{ bloc.badge }}</span>
      </div>

      <p v-if="!cours.length" class="vide">Le planning sera publié prochainement.</p>

      <template v-else>
        <!-- A — la grille des sept jours -->
        <div v-reveal="'up'" class="grille" role="table" aria-label="Planning de la semaine">
          <div class="ligne entete" role="row">
            <span class="cellule-heure" aria-hidden="true"></span>
            <button
              v-for="jour in JOURS"
              :key="jour.numero"
              type="button"
              class="jour"
              :class="{ 'est-actif': jour.numero === jourActif, 'est-vide': !compteParJour[jour.numero] }"
              :aria-pressed="jour.numero === jourActif"
              :aria-label="`${jour.long}, ${compteParJour[jour.numero]} cours`"
              @click="jourActif = jour.numero"
            >
              {{ jour.court }}
            </button>
          </div>

          <template v-for="(heure, index) in heures" :key="heure">
            <!-- Le trait sépare le bloc du matin de celui du soir, comme sur
                 une affiche : c'est ce qui rend la grille lisible d'un coup. -->
            <div v-if="index === premiereLigneSoir && index > 0" class="separateur" aria-hidden="true">
              <span class="cellule-heure"></span>
              <span class="trait"></span>
            </div>

            <div class="ligne" role="row">
              <span class="cellule-heure">{{ heure.split(":")[0] }}h</span>
              <button
                v-for="jour in JOURS"
                :key="jour.numero"
                type="button"
                class="case"
                :class="{ 'est-remplie': casesDe(heure, jour.numero).length }"
                :style="
                  casesDe(heure, jour.numero).length
                    ? {
                        background: couleurDe(casesDe(heure, jour.numero)[0].type),
                        color: encreDe(casesDe(heure, jour.numero)[0].type),
                      }
                    : null
                "
                :aria-label="
                  casesDe(heure, jour.numero).length
                    ? `${jour.long} ${heure} : ${casesDe(heure, jour.numero).map((c) => c.libelle).join(', ')}`
                    : `${jour.long} ${heure} : aucun cours`
                "
                @click="jourActif = jour.numero"
              >
                <span v-if="minutesParticulieres(heure) && casesDe(heure, jour.numero).length" class="minutes">
                  {{ minutesParticulieres(heure) }}
                </span>
                <span class="case-libelle">
                  {{ casesDe(heure, jour.numero).map((c) => c.libelle).join(" / ") }}
                </span>
              </button>
            </div>
          </template>
        </div>

        <div class="legende">
          <span v-for="type in siteConfig.typesCours" :key="type.value" class="legende-item">
            <span class="pastille" :style="{ background: type.couleur }"></span>{{ type.label }}
          </span>
        </div>

        <!-- C — le jour sélectionné, déplié -->
        <div class="jour-detail">
          <div class="jour-tete">
            <h3>{{ nomJourActif }}</h3>
            <!-- « cours » est invariable : pas de s au pluriel. -->
            <span class="compte">{{ coursActifs.length }} cours</span>
          </div>

          <p v-if="!coursActifs.length" class="vide">Pas de cours ce jour-là.</p>

          <div v-else class="jour-liste">
            <div
              v-for="c in coursActifs"
              :key="c._id"
              class="cours"
              :style="{ borderLeftColor: couleurDe(c.type) }"
            >
              <div class="cours-heure">
                <strong>{{ c.heureDebut }}</strong>
                <span>{{ heureFin(c.heureDebut, c.duree) }}</span>
              </div>
              <div class="cours-texte">
                <strong>{{ c.libelle }}<template v-if="c.niveau"> — {{ c.niveau }}</template></strong>
                <span v-if="c.coach" class="cours-coach">
                  {{ c.coach.nom }} · ceinture {{ c.coach.ceinture }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <a class="bouton-pdf" :href="lienPdf" @click="trackClick('planning')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 4v11m0 0 4-4m-4 4-4-4M5 19h14" /></svg>
          Le planning en PDF
        </a>
      </template>
    </div>
  </section>
</template>

<style scoped>
.planning {
  background: var(--surface-alt);
}

.planning-tete {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.badge {
  flex: none;
  padding: 0.35rem 0.6rem;
  background: var(--primary);
  color: var(--on-primary);
  font-size: 0.66rem;
  font-weight: 700;
  line-height: 1.3;
  text-align: center;
  max-width: 8rem;
}

.vide {
  margin: 0;
  color: var(--text-muted);
  font-size: var(--size-small);
}

/* --- A : la grille --- */
.grille {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-top: 0.5rem;
}

.ligne {
  display: grid;
  grid-template-columns: 26px repeat(7, minmax(0, 1fr));
  gap: 3px;
}

.cellule-heure {
  display: flex;
  align-items: center;
  font-size: 0.56rem;
  font-weight: 700;
  color: var(--text-muted);
}

.jour {
  padding: 0.35rem 0;
  border: none;
  background: var(--brand-600);
  color: var(--text);
  font-family: var(--font-display);
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: background var(--motion-fast) var(--ease-out);
}

.jour.est-actif {
  background: var(--primary);
  color: var(--on-primary);
}

.jour.est-vide {
  color: var(--text-muted);
}

.case {
  /* 32 px : les cases sont trop petites pour être une cible tactile à elles
     seules, mais toute la colonne du jour l'est — un appui n'importe où
     sélectionne le jour et ouvre son détail juste en dessous. */
  min-height: 32px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  border: none;
  background: var(--brand-700);
  color: var(--text);
  cursor: pointer;
  overflow: hidden;
}

.case-libelle {
  font-size: 0.5rem;
  font-weight: 700;
  line-height: 1.1;
  text-align: center;
  text-transform: uppercase;
  /* Deux lignes au maximum : au-delà le libellé déborderait de la case. */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.case:not(.est-remplie) .case-libelle {
  display: none;
}

.minutes {
  position: absolute;
  top: 1px;
  left: 2px;
  font-size: 0.42rem;
  font-weight: 700;
  opacity: 0.75;
}

.separateur {
  display: grid;
  grid-template-columns: 26px minmax(0, 1fr);
  gap: 3px;
  margin: 2px 0;
}

.trait {
  border-top: 1px dashed var(--border-strong);
}

.legende {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem 0.9rem;
  margin-top: 0.8rem;
  font-size: 0.7rem;
  color: var(--text-muted);
}

.legende-item {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.pastille {
  width: 10px;
  height: 10px;
  flex: none;
}

/* --- C : le jour déplié --- */
.jour-detail {
  margin-top: 1.6rem;
  padding-top: 1.2rem;
  border-top: 1px solid var(--border);
}

.jour-tete {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 0.7rem;
}

.jour-tete h3 {
  margin: 0;
  font-size: 1.45rem;
}

.compte {
  font-size: 0.78rem;
  color: var(--text-muted);
}

.jour-liste {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.cours {
  display: flex;
  border: 1px solid var(--border);
  border-left: 4px solid var(--primary);
  background: var(--surface);
}

.cours-heure {
  flex: none;
  width: 74px;
  display: flex;
  flex-direction: column;
  padding: 0.7rem 0.6rem;
}

.cours-heure strong {
  font-family: var(--font-display);
  font-size: 1.06rem;
  font-weight: 700;
}

.cours-heure span {
  font-size: 0.68rem;
  color: var(--text-muted);
}

.cours-texte {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.7rem 0.7rem 0.7rem 0;
  min-width: 0;
}

.cours-texte strong {
  font-size: 0.92rem;
}

.cours-coach {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.bouton-pdf {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  min-height: 50px;
  margin-top: 1.2rem;
  background: var(--primary);
  color: var(--on-primary);
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.95rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  text-decoration: none;
  transition: background var(--motion-fast) var(--ease-out);
}

.bouton-pdf:hover {
  background: var(--primary-strong);
}
</style>

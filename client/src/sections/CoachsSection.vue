<script setup>
/**
 * L'encadrement. Le grade n'est pas écrit, il est DESSINÉ — voir
 * `CeintureBarre.vue`.
 *
 * Deux rendus au choix du gérant (« Contenu du site › Coachs ») :
 *   - `photo`  : les portraits téléversés, comme à l'origine ;
 *   - `avatar` : le nœud de ceinture dessiné à la couleur du grade.
 *
 * Le choix vaut pour toute la rangée — la panacher donnerait une grille
 * dépareillée. Un coach sans photo bascule sur son avatar DANS LES DEUX CAS :
 * c'est ce qui fait disparaître le rectangle vide que laissait l'ancien
 * rendu, et c'est la raison principale d'avoir dessiné cet avatar.
 */
import { computed } from "vue";
import { assetUrl } from "../services/api";
import CeintureBarre from "../components/public/CeintureBarre.vue";
import CoachAvatar from "../components/public/CoachAvatar.vue";

const props = defineProps({
  config: { type: Object, required: true },
  data: { type: Object, required: true },
});

const bloc = computed(() => props.data.settings?.coachs ?? {});
const coachs = computed(() => props.data.coachs ?? []);

const modeAvatar = computed(() => bloc.value.affichage === "avatar");

const afficherPhoto = (coach) => !modeAvatar.value && Boolean(coach.photo);
</script>

<template>
  <section v-if="coachs.length" :id="config.id" class="coachs">
    <div class="wrap">
      <div v-reveal="'fade'" class="section-head">
        <span class="chapitre">{{ config.chapitre }}</span>
        <span class="surtitre">{{ bloc.surtitre }}</span>
        <span class="filet" aria-hidden="true"></span>
      </div>

      <h2 v-reveal="'up'" class="section-titre">{{ bloc.titre }}</h2>

      <div v-reveal.stagger class="liste">
        <article v-for="coach in coachs" :key="coach._id" class="coach">
          <div class="portrait">
            <img
              v-if="afficherPhoto(coach)"
              :src="assetUrl(coach.photo)"
              :alt="coach.nom"
              loading="lazy"
            />
            <CoachAvatar
              v-else
              :ceinture="coach.ceinture"
              :degres="coach.degres"
              :nom="coach.nom"
            />
          </div>
          <div class="infos">
            <h3>{{ coach.nom }}</h3>
            <p v-if="coach.role" class="role">{{ coach.role }}</p>
            <CeintureBarre :ceinture="coach.ceinture" :degres="coach.degres" />
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.coachs {
  background: var(--surface);
}

.liste {
  display: flex;
  flex-direction: column;
  gap: 1.4rem;
}

@media (min-width: 760px) {
  .liste {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1.8rem;
  }
}

.coach {
  display: flex;
  align-items: flex-end;
  gap: 0.9rem;
}

@media (min-width: 760px) {
  .coach {
    flex-direction: column;
    align-items: stretch;
  }
}

.portrait {
  flex: none;
  width: 92px;
  aspect-ratio: 3 / 4;
  /* Ne se voit plus que pendant le chargement d'une photo : sans photo, c'est
     l'avatar qui occupe toute la case. */
  background: var(--brand-700);
  border: 1px solid var(--border);
  overflow: hidden;
}

@media (min-width: 760px) {
  .portrait {
    width: 100%;
  }
}

.portrait img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.infos {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
}

.infos h3 {
  margin: 0;
  font-size: 1.28rem;
  line-height: 1;
}

.role {
  margin: 0;
  font-size: 0.8rem;
  color: var(--text-muted);
}
</style>

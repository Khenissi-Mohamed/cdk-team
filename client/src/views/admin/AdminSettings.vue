<script setup>
/**
 * Le contenu du site, section par section.
 *
 * Tout ce que le visiteur lit est ici : chaque surtitre, chaque titre, chaque
 * paragraphe, chaque libellé de bouton. Aucun de ces textes n'existe dans le
 * code — c'est la règle du projet, et c'est ce qui permet de réécrire le site
 * sans déploiement.
 *
 * Le logo se téléverse sur une route à part : mélangé au reste, il aurait
 * imposé un envoi multipart, où la structure imbriquée des sections ne
 * survivrait pas à l'encodage.
 */
import { reactive, ref, computed, onMounted } from "vue";
import api, { assetUrl } from "../../services/api";

const form = reactive({
  nomClub: "",
  ville: "",
  telephone: "",
  email: "",
  whatsapp: "",
  adresse: "",
  hero: {},
  club: {},
  planning: {},
  coachs: {},
  boutique: {},
  tarifs: {},
  documents: {},
  appel: {},
  raisonSociale: "",
  formeJuridique: "",
  siret: "",
  numeroAgrement: "",
  directeurPublication: "",
  hebergeur: "",
});

const logo = ref(null);
const imageHero = ref(null);
const chiffres = ref([]);
// Saisi comme une seule zone de texte, une ligne par argument : six champs
// séparés pour un bandeau défilant seraient pénibles à réordonner.
const marqueeTexte = ref("");

const chargement = ref(true);
const enregistrement = ref(false);
const enregistre = ref(false);
const erreur = ref("");
const envoiLogo = ref(false);
const champLogo = ref(null);
const envoiImageHero = ref(false);
const champImageHero = ref(null);

const videoClub = ref(null);
const posterClub = ref(null);
const champVideoClub = ref(null);
const champPosterClub = ref(null);
const envoiVideoClub = ref(false);
const envoiPosterClub = ref(false);
// Une vidéo peut peser des dizaines de mégaoctets : sans pourcentage, le
// gérant reste une minute devant un bouton qui tourne, sans savoir si ça
// avance ou si c'est bloqué.
const progressionVideo = ref(0);

const apercuLogo = computed(() => (logo.value ? assetUrl(logo.value) : ""));
const apercuImageHero = computed(() => (imageHero.value ? assetUrl(imageHero.value) : ""));
const apercuVideoClub = computed(() => (videoClub.value ? assetUrl(videoClub.value) : ""));
const apercuPosterClub = computed(() => (posterClub.value ? assetUrl(posterClub.value) : ""));

const MODES_VIDEO = [
  { value: "arriere-plan", label: "Arrière-plan plein cadre" },
  { value: "bloc", label: "Bloc à côté du texte" },
  { value: "bandeau", label: "Bandeau large sous le texte" },
];

// Le modèle stocke « photo » ou « avatar », le composant Vuetify manipule un
// booléen. Un `v-switch` branché directement sur la chaîne enverrait `true`
// au serveur, qui rejetterait la valeur sans rien dire.
const coachsEnAvatar = computed({
  get: () => form.coachs.affichage === "avatar",
  set: (valeur) => {
    form.coachs.affichage = valeur ? "avatar" : "photo";
  },
});

function hydrater(data) {
  Object.keys(form).forEach((cle) => {
    if (data[cle] === undefined) return;
    if (typeof form[cle] === "object" && form[cle] !== null && !Array.isArray(form[cle])) {
      // Les sous-documents Mongoose arrivent avec leurs méthodes : on ne
      // recopie que les valeurs.
      form[cle] = { ...JSON.parse(JSON.stringify(data[cle] ?? {})) };
    } else {
      form[cle] = data[cle];
    }
  });
  logo.value = data.logo ?? null;
  imageHero.value = data.hero?.imageFond ?? null;
  videoClub.value = data.club?.video?.fichier ?? null;
  posterClub.value = data.club?.video?.poster ?? null;

  // Un document enregistré avant l'ajout de la vidéo n'a pas ce sous-objet :
  // sans ce garde-fou, les `v-model` du bloc vidéo écriraient dans `undefined`.
  if (!form.club.video) form.club.video = {};
  if (!form.coachs.affichage) form.coachs.affichage = "photo";
  chiffres.value = JSON.parse(JSON.stringify(data.club?.chiffres ?? []));
  marqueeTexte.value = (data.marquee ?? []).join("\n");
}

onMounted(async () => {
  try {
    const { data } = await api.get("/settings");
    hydrater(data);
  } catch (err) {
    erreur.value = err.response?.data?.message || "Chargement impossible.";
  } finally {
    chargement.value = false;
  }
});

function ajouterChiffre() {
  if (chiffres.value.length >= 4) return;
  chiffres.value.push({ valeur: 0, suffixe: "", libelle: "" });
}

function retirerChiffre(index) {
  chiffres.value.splice(index, 1);
}

async function enregistrer() {
  enregistrement.value = true;
  enregistre.value = false;
  erreur.value = "";
  try {
    const { data } = await api.put("/settings/admin", {
      ...form,
      club: {
        ...form.club,
        chiffres: chiffres.value.map((c) => ({ ...c, valeur: Number(c.valeur) || 0 })),
      },
      marquee: marqueeTexte.value.split("\n"),
    });
    hydrater(data);
    enregistre.value = true;
    setTimeout(() => (enregistre.value = false), 3000);
  } catch (err) {
    erreur.value = err.response?.data?.message || "Enregistrement impossible.";
  } finally {
    enregistrement.value = false;
  }
}

function choisirLogo() {
  champLogo.value.click();
}

async function surChoixLogo(event) {
  const fichier = event.target.files[0];
  event.target.value = "";
  if (!fichier) return;

  envoiLogo.value = true;
  erreur.value = "";
  try {
    const corps = new FormData();
    corps.append("logo", fichier);
    const { data } = await api.put("/settings/admin/logo", corps, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    logo.value = data.logo;
  } catch (err) {
    erreur.value = err.response?.data?.message || "Le logo n'a pas pu être envoyé.";
  } finally {
    envoiLogo.value = false;
  }
}

async function retirerLogo() {
  const { data } = await api.delete("/settings/admin/logo");
  logo.value = data.logo;
}

function choisirImageHero() {
  champImageHero.value.click();
}

async function surChoixImageHero(event) {
  const fichier = event.target.files[0];
  event.target.value = "";
  if (!fichier) return;

  envoiImageHero.value = true;
  erreur.value = "";
  try {
    const corps = new FormData();
    corps.append("image", fichier);
    const { data } = await api.put("/settings/admin/hero-image", corps, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    imageHero.value = data.hero?.imageFond ?? null;
  } catch (err) {
    erreur.value = err.response?.data?.message || "L'image de fond n'a pas pu être envoyée.";
  } finally {
    envoiImageHero.value = false;
  }
}

async function retirerImageHero() {
  const { data } = await api.delete("/settings/admin/hero-image");
  imageHero.value = data.hero?.imageFond ?? null;
}

/* --- Vidéo de la section « Le club » --- */

function choisirVideoClub() {
  champVideoClub.value.click();
}

async function surChoixVideoClub(event) {
  const fichier = event.target.files[0];
  // Vidé tout de suite : sans ça, resélectionner le MÊME fichier après une
  // erreur ne déclenche aucun `change` et le bouton paraît mort.
  event.target.value = "";
  if (!fichier) return;

  envoiVideoClub.value = true;
  progressionVideo.value = 0;
  erreur.value = "";
  try {
    const corps = new FormData();
    corps.append("video", fichier);
    const { data } = await api.put("/settings/admin/club-video", corps, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (e) => {
        if (e.total) progressionVideo.value = Math.round((e.loaded / e.total) * 100);
      },
    });
    videoClub.value = data.club?.video?.fichier ?? null;
  } catch (err) {
    erreur.value = err.response?.data?.message || "La vidéo n'a pas pu être envoyée.";
  } finally {
    envoiVideoClub.value = false;
  }
}

async function retirerVideoClub() {
  const { data } = await api.delete("/settings/admin/club-video");
  videoClub.value = data.club?.video?.fichier ?? null;
}

function choisirPosterClub() {
  champPosterClub.value.click();
}

async function surChoixPosterClub(event) {
  const fichier = event.target.files[0];
  event.target.value = "";
  if (!fichier) return;

  envoiPosterClub.value = true;
  erreur.value = "";
  try {
    const corps = new FormData();
    corps.append("image", fichier);
    const { data } = await api.put("/settings/admin/club-poster", corps, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    posterClub.value = data.club?.video?.poster ?? null;
  } catch (err) {
    erreur.value = err.response?.data?.message || "L'image d'attente n'a pas pu être envoyée.";
  } finally {
    envoiPosterClub.value = false;
  }
}

async function retirerPosterClub() {
  const { data } = await api.delete("/settings/admin/club-poster");
  posterClub.value = data.club?.video?.poster ?? null;
}
</script>

<template>
  <h1 class="text-h5 mb-1">Contenu du site</h1>
  <p class="text-body-2 text-medium-emphasis mb-6">
    Tous les textes affichés sur le site public se modifient ici.
  </p>

  <v-skeleton-loader v-if="chargement" type="card" />

  <div v-else class="colonne">
    <!-- Logo -->
    <v-card class="pa-6" variant="flat">
      <h2 class="text-subtitle-1 font-weight-bold mb-2">Logo du club</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Utilisé dans l'en-tête, le pied de page et le PDF du planning. Un PNG ou
        un SVG à fond transparent : le site est sombre, un logo sur fond blanc y
        ferait une tache. Un SVG est conservé tel quel, sans perte.
      </p>

      <div class="bloc-logo">
        <div class="apercu">
          <img v-if="apercuLogo" :src="apercuLogo" alt="Logo du club" />
          <span v-else class="apercu-vide">Aucun logo</span>
        </div>
        <div class="d-flex flex-column ga-2">
          <input
            ref="champLogo"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            class="d-none"
            @change="surChoixLogo"
          />
          <v-btn
            color="primary"
            prepend-icon="mdi-upload"
            :loading="envoiLogo"
            @click="choisirLogo"
          >
            {{ logo ? "Remplacer" : "Téléverser" }}
          </v-btn>
          <v-btn v-if="logo" variant="text" color="error" size="small" @click="retirerLogo">
            Retirer
          </v-btn>
        </div>
      </div>
    </v-card>

    <!-- Identité -->
    <v-card class="pa-6" variant="flat">
      <h2 class="text-subtitle-1 font-weight-bold mb-4">Identité</h2>
      <v-text-field v-model="form.nomClub" label="Nom du club" class="mb-2" />
      <v-text-field
        v-model="form.ville"
        label="Ville"
        hint="Affichée dans le surtitre de l'accroche."
        persistent-hint
      />
    </v-card>

    <!-- Section 1 : accroche -->
    <v-card class="pa-6" variant="flat">
      <h2 class="text-subtitle-1 font-weight-bold mb-1">Accroche</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Le titre est affiché sur deux lignes, la seconde en rouge avec l'effet
        de balayage. Deux mots courts fonctionnent mieux qu'une phrase.
      </p>
      <div class="bloc-image-hero mb-6">
        <div class="apercu-hero">
          <img v-if="apercuImageHero" :src="apercuImageHero" alt="Image de fond actuelle" />
          <span v-else class="apercu-vide">Aucune image de fond</span>
        </div>
        <div class="d-flex flex-wrap ga-2 mt-3">
          <input
            ref="champImageHero"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            class="d-none"
            @change="surChoixImageHero"
          />
          <v-btn
            color="primary"
            prepend-icon="mdi-image-plus"
            :loading="envoiImageHero"
            @click="choisirImageHero"
          >
            {{ imageHero ? "Remplacer l'image" : "Ajouter une image" }}
          </v-btn>
          <v-btn
            v-if="imageHero"
            variant="text"
            color="error"
            prepend-icon="mdi-delete-outline"
            @click="retirerImageHero"
          >
            Retirer
          </v-btn>
        </div>
      </div>
      <v-text-field v-model="form.hero.surtitre" label="Surtitre" class="mb-2" />
      <div class="d-flex ga-3">
        <v-text-field v-model="form.hero.titre" label="Titre — 1re ligne" class="flex-grow-1" />
        <v-text-field v-model="form.hero.titreAccent" label="2e ligne (en rouge)" class="flex-grow-1" />
      </div>
      <v-textarea v-model="form.hero.texte" label="Texte" rows="2" class="mb-2" />
      <div class="d-flex ga-3">
        <v-text-field v-model="form.hero.ctaPrincipal" label="Bouton principal" class="flex-grow-1" />
        <v-text-field v-model="form.hero.ctaSecondaire" label="Bouton secondaire" class="flex-grow-1" />
      </div>
    </v-card>

    <!-- Bandeau défilant -->
    <v-card class="pa-6" variant="flat">
      <h2 class="text-subtitle-1 font-weight-bold mb-2">Bandeau défilant</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Un argument par ligne, douze au maximum. Les lignes vides sont ignorées.
      </p>
      <v-textarea v-model="marqueeTexte" label="Arguments" rows="6" hide-details />
    </v-card>

    <!-- Section 2 : le club -->
    <v-card class="pa-6" variant="flat">
      <h2 class="text-subtitle-1 font-weight-bold mb-4">Le club</h2>
      <v-text-field v-model="form.club.surtitre" label="Surtitre" class="mb-2" />
      <v-text-field v-model="form.club.titre" label="Titre — 1re partie" class="mb-2" />
      <v-text-field
        v-model="form.club.titreAccent"
        label="Titre — 2e partie (en rouge)"
        class="mb-2"
      />
      <v-textarea
        v-model="form.club.texte"
        label="Texte"
        rows="6"
        hint="Séparez vos paragraphes par une ligne vide."
        persistent-hint
      />

      <div class="d-flex align-center justify-space-between ga-3 mt-6 mb-2">
        <h3 class="text-subtitle-2 font-weight-bold mb-0">Chiffres clés</h3>
        <v-btn
          size="small"
          variant="outlined"
          prepend-icon="mdi-plus"
          :disabled="chiffres.length >= 4"
          @click="ajouterChiffre"
        >
          Ajouter
        </v-btn>
      </div>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Ils s'incrémentent à l'affichage. L'unité va dans le suffixe, sinon elle
        défilerait avec le chiffre.
      </p>

      <div v-for="(chiffre, index) in chiffres" :key="index" class="ligne-chiffre">
        <v-text-field v-model.number="chiffre.valeur" label="Valeur" type="number" density="compact" hide-details />
        <v-text-field v-model="chiffre.suffixe" label="Suffixe" density="compact" hide-details />
        <v-text-field v-model="chiffre.libelle" label="Libellé" density="compact" hide-details />
        <v-btn icon="mdi-close" variant="text" size="small" aria-label="Retirer" @click="retirerChiffre(index)" />
      </div>

      <v-divider class="my-6" />

      <h3 class="text-subtitle-2 font-weight-bold mb-2">Vidéo d'ambiance</h3>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Elle se lance toute seule quand le visiteur arrive sur la section, et se
        met en pause dès qu'il la dépasse.
        <strong>Le son, lui, ne peut pas toujours démarrer seul</strong> : les
        navigateurs l'interdisent tant que le visiteur n'a pas cliqué quelque
        part sur la page. Dans ce cas la vidéo démarre en silence et un bouton
        « activer le son » s'affiche dessus. Il n'y a aucun moyen de contourner
        cette règle, elle vient du navigateur.
      </p>

      <div class="bloc-media mb-4">
        <div class="apercu-video">
          <video v-if="apercuVideoClub" :src="apercuVideoClub" :poster="apercuPosterClub" controls muted />
          <span v-else class="apercu-vide">Aucune vidéo</span>
        </div>
        <div class="d-flex flex-wrap ga-2 mt-3">
          <input
            ref="champVideoClub"
            type="file"
            accept="video/mp4,video/webm"
            class="d-none"
            @change="surChoixVideoClub"
          />
          <v-btn
            color="primary"
            prepend-icon="mdi-video-plus-outline"
            :loading="envoiVideoClub"
            @click="choisirVideoClub"
          >
            {{ videoClub ? "Remplacer la vidéo" : "Ajouter une vidéo" }}
          </v-btn>
          <v-btn
            v-if="videoClub"
            variant="text"
            color="error"
            prepend-icon="mdi-delete-outline"
            @click="retirerVideoClub"
          >
            Retirer
          </v-btn>
        </div>
        <v-progress-linear
          v-if="envoiVideoClub"
          :model-value="progressionVideo"
          color="primary"
          height="6"
          class="mt-3"
        />
        <p class="text-caption text-medium-emphasis mt-2 mb-0">
          MP4 ou WebM, 80 Mo maximum. Le fichier est servi tel quel : exportez-le
          déjà compressé, en 1080p au plus. Une vidéo lourde ralentit la page
          pour tout le monde, y compris sur mobile.
        </p>
      </div>

      <div class="bloc-media mb-4">
        <div class="apercu-poster">
          <img v-if="apercuPosterClub" :src="apercuPosterClub" alt="Image d'attente actuelle" />
          <span v-else class="apercu-vide">Aucune image d'attente</span>
        </div>
        <div class="d-flex flex-wrap ga-2 mt-3">
          <input
            ref="champPosterClub"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            class="d-none"
            @change="surChoixPosterClub"
          />
          <v-btn
            variant="outlined"
            prepend-icon="mdi-image-outline"
            :loading="envoiPosterClub"
            @click="choisirPosterClub"
          >
            {{ posterClub ? "Remplacer l'image d'attente" : "Ajouter une image d'attente" }}
          </v-btn>
          <v-btn
            v-if="posterClub"
            variant="text"
            color="error"
            prepend-icon="mdi-delete-outline"
            @click="retirerPosterClub"
          >
            Retirer
          </v-btn>
        </div>
        <p class="text-caption text-medium-emphasis mt-2 mb-0">
          Affichée le temps que la vidéo se charge. Sans elle, le visiteur voit
          un rectangle noir pendant une seconde ou deux.
        </p>
      </div>

      <v-select
        v-model="form.club.video.mode"
        :items="MODES_VIDEO"
        item-title="label"
        item-value="value"
        label="Rendu de la vidéo"
        hint="En arrière-plan, le texte passe par-dessus la vidéo avec un voile sombre."
        persistent-hint
        class="mb-4"
      />

      <!-- La vidéo et l'image partent dès qu'on les choisit, ces trois
           réglages non : ils suivent le formulaire. Sans cet avertissement on
           bascule « Lire avec le son », on quitte la page, et rien n'a changé
           sur le site — c'est exactement ce qui s'est produit. -->
      <v-alert
        type="info"
        variant="tonal"
        density="compact"
        class="mb-4"
        text="Les trois réglages ci-dessous ne s'appliquent qu'après un clic sur « Enregistrer », tout en bas de la page. La vidéo et l'image d'attente, elles, sont envoyées immédiatement."
      />

      <v-switch
        v-model="form.club.video.autoplay"
        color="success"
        density="compact"
        hide-details
        label="Lancer la vidéo automatiquement au scroll"
      />
      <v-switch
        v-model="form.club.video.son"
        color="success"
        density="compact"
        hide-details
        label="Lire avec le son"
      />
      <v-switch
        v-model="form.club.video.boucle"
        color="success"
        density="compact"
        hide-details
        label="Lire en boucle"
      />
    </v-card>

    <!-- Sections courtes -->
    <v-card class="pa-6" variant="flat">
      <h2 class="text-subtitle-1 font-weight-bold mb-4">Planning</h2>
      <v-text-field v-model="form.planning.surtitre" label="Surtitre" class="mb-2" />
      <v-text-field v-model="form.planning.titre" label="Titre" class="mb-2" />
      <v-text-field
        v-model="form.planning.badge"
        label="Bandeau de validité"
        placeholder="À partir du 2 septembre"
        hint="Laissé vide, le bandeau n'apparaît pas."
        persistent-hint
      />
    </v-card>

    <v-card class="pa-6" variant="flat">
      <h2 class="text-subtitle-1 font-weight-bold mb-4">Coachs</h2>
      <v-text-field v-model="form.coachs.surtitre" label="Surtitre" class="mb-2" />
      <v-text-field v-model="form.coachs.titre" label="Titre" class="mb-6" />

      <h3 class="text-subtitle-2 font-weight-bold mb-2">Affichage des coachs</h3>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Le grade reste affiché sous chaque coach dans les deux cas. Un coach
        sans photo prend de toute façon son avatar : c'est ce qui évite le
        cadre vide dans la rangée.
      </p>

      <div class="choix-affichage mb-4">
        <figure class="vignette" :class="{ actif: !coachsEnAvatar }">
          <span class="vignette-photo"><v-icon icon="mdi-image-outline" size="28" /></span>
          <figcaption>Photos</figcaption>
        </figure>
        <figure class="vignette" :class="{ actif: coachsEnAvatar }">
          <span class="vignette-avatar"><v-icon icon="mdi-account-tie-outline" size="28" /></span>
          <figcaption>Avatars</figcaption>
        </figure>
      </div>

      <v-switch
        v-model="coachsEnAvatar"
        color="success"
        density="compact"
        hide-details
        :label="coachsEnAvatar ? 'Avatars dessinés à la couleur de ceinture' : 'Photos téléversées'"
      />
    </v-card>

    <v-card class="pa-6" variant="flat">
      <h2 class="text-subtitle-1 font-weight-bold mb-1">Boutique</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Ces textes servent à la fois l'en-tête de la page /boutique et la bande
        d'aperçu de l'accueil : ils ne peuvent pas se contredire. Les articles
        eux-mêmes se gèrent dans « Boutique ».
      </p>
      <v-text-field v-model="form.boutique.surtitre" label="Surtitre" class="mb-2" />
      <v-text-field v-model="form.boutique.titre" label="Titre" class="mb-2" />
      <v-textarea v-model="form.boutique.texte" label="Texte d'introduction" rows="3" class="mb-2" />
      <v-text-field
        v-model="form.boutique.lien"
        label="Libellé du lien depuis l'accueil"
        placeholder="Toute la boutique"
      />
    </v-card>

    <v-card class="pa-6" variant="flat">
      <h2 class="text-subtitle-1 font-weight-bold mb-4">Tarifs</h2>
      <v-text-field v-model="form.tarifs.surtitre" label="Surtitre" class="mb-2" />
      <v-text-field v-model="form.tarifs.titre" label="Titre" class="mb-2" />
      <v-textarea v-model="form.tarifs.note" label="Note sous les tarifs" rows="2" />
    </v-card>

    <v-card class="pa-6" variant="flat">
      <h2 class="text-subtitle-1 font-weight-bold mb-4">Inscription</h2>
      <v-text-field v-model="form.documents.surtitre" label="Surtitre" class="mb-2" />
      <v-text-field v-model="form.documents.titre" label="Titre" class="mb-2" />
      <v-textarea v-model="form.documents.texte" label="Texte" rows="3" />
    </v-card>

    <v-card class="pa-6" variant="flat">
      <h2 class="text-subtitle-1 font-weight-bold mb-4">Appel final</h2>
      <v-text-field v-model="form.appel.titre" label="Titre" class="mb-2" />
      <v-textarea v-model="form.appel.texte" label="Texte" rows="2" class="mb-2" />
      <v-text-field v-model="form.appel.cta" label="Bouton" />
    </v-card>

    <!-- Coordonnées -->
    <v-card class="pa-6" variant="flat">
      <h2 class="text-subtitle-1 font-weight-bold mb-4">Coordonnées</h2>
      <v-text-field
        v-model="form.telephone"
        label="Téléphone"
        prepend-inner-icon="mdi-phone"
        hint="Affiché tel quel et rendu cliquable automatiquement."
        persistent-hint
        class="mb-4"
      />
      <v-text-field v-model="form.email" label="E-mail" prepend-inner-icon="mdi-email-outline" class="mb-2" />
      <v-text-field
        v-model="form.whatsapp"
        label="WhatsApp"
        prepend-inner-icon="mdi-whatsapp"
        hint="Ou simplement le numéro."
        persistent-hint
        class="mb-4"
      />
      <v-text-field v-model="form.adresse" label="Adresse de la salle" prepend-inner-icon="mdi-map-marker-outline" />
    </v-card>

    <!-- Mentions légales -->
    <v-card class="pa-6" variant="flat">
      <h2 class="text-subtitle-1 font-weight-bold mb-4">Mentions légales</h2>
      <v-text-field v-model="form.raisonSociale" label="Raison sociale" class="mb-2" />
      <v-text-field v-model="form.formeJuridique" label="Forme juridique" placeholder="Association loi 1901" class="mb-2" />
      <v-text-field v-model="form.siret" label="SIRET / RNA" class="mb-2" />
      <v-text-field v-model="form.numeroAgrement" label="Numéro d'agrément sport" class="mb-2" />
      <v-text-field v-model="form.directeurPublication" label="Directeur de la publication" class="mb-2" />
      <v-text-field v-model="form.hebergeur" label="Hébergeur" />
    </v-card>

    <v-alert v-if="enregistre" type="success" density="compact">Contenu enregistré.</v-alert>
    <v-alert v-if="erreur" type="error" variant="tonal" density="compact">{{ erreur }}</v-alert>

    <div>
      <v-btn color="primary" size="large" :loading="enregistrement" @click="enregistrer">
        Enregistrer
      </v-btn>
    </div>
  </div>
</template>

<style scoped>
.colonne {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  max-width: 760px;
}

.colonne :deep(.v-card) {
  background: var(--paper);
  border: 1px solid var(--line);
}

.bloc-logo {
  display: flex;
  align-items: center;
  gap: 1.4rem;
}

/* Fond sombre volontaire : c'est sur ce fond-là que le logo apparaîtra
   réellement, autant le voir tout de suite. */
.apercu {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 150px;
  height: 96px;
  padding: 0.6rem;
  background: var(--ink);
  border: 1px solid var(--line);
}

.apercu img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.apercu-vide {
  font-size: 0.76rem;
  color: #8b8d93;
}

.apercu-hero {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  aspect-ratio: 16 / 7;
  overflow: hidden;
  background: var(--ink);
  border: 1px solid var(--line);
}

.apercu-hero img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Aperçus de la vidéo et de son image d'attente. Même fond sombre que le
   logo : c'est celui du site public, autant juger le cadrage dessus. */
.apercu-video,
.apercu-poster {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: var(--ink);
  border: 1px solid var(--line);
}

.apercu-video video,
.apercu-poster img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.apercu-poster {
  aspect-ratio: 16 / 7;
}

.apercu-poster img {
  object-fit: cover;
}

/* Deux vignettes côte à côte : le gérant voit ce que le switch change avant
   de le basculer, plutôt que de deviner d'après un libellé. */
.choix-affichage {
  display: flex;
  gap: 0.8rem;
}

.vignette {
  flex: 1;
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 0.9rem 0.5rem;
  border: 1px solid var(--line);
  font-size: 0.78rem;
  color: #8b8d93;
  transition: border-color 0.2s ease, color 0.2s ease;
}

.vignette.actif {
  border-color: var(--primary);
  color: var(--ink);
}

.vignette-photo,
.vignette-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  aspect-ratio: 3 / 4;
  color: #8b8d93;
  background: var(--ink);
}

/* La vignette « avatars » emprunte le rouge de la marque plutôt qu'une
   couleur de ceinture : celle-ci change d'un coach à l'autre, en figer une
   ici laisserait croire que le réglage l'impose à tout le monde. */
.vignette-avatar {
  color: var(--admin-100);
  background: linear-gradient(160deg, var(--primary), var(--ink));
}

.vignette.actif .vignette-photo {
  color: var(--admin-100);
}

.ligne-chiffre {
  display: grid;
  grid-template-columns: 96px 96px 1fr auto;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.7rem;
}

/* Sous cette largeur les quatre colonnes deviennent illisibles : valeur,
   suffixe et bouton tiennent la première ligne, le libellé prend la seconde.
   Les placements sont explicites, sinon le placement automatique suivrait
   l'ordre du DOM et renverrait le bouton sous le libellé. */
@media (max-width: 620px) {
  .ligne-chiffre {
    grid-template-columns: 1fr 1fr auto;
    margin-bottom: 1.1rem;
  }

  .ligne-chiffre > :nth-child(1) {
    grid-area: 1 / 1;
  }

  .ligne-chiffre > :nth-child(2) {
    grid-area: 1 / 2;
  }

  .ligne-chiffre > :nth-child(4) {
    grid-area: 1 / 3;
  }

  .ligne-chiffre > :nth-child(3) {
    grid-area: 2 / 1 / 3 / -1;
  }
}
</style>

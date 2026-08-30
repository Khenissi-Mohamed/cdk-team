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

const apercuLogo = computed(() => (logo.value ? assetUrl(logo.value) : ""));

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
      <v-text-field v-model="form.coachs.titre" label="Titre" />
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

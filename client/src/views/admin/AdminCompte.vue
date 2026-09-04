<script setup>
/**
 * Le compte administrateur : l'identifiant de connexion et le mot de passe.
 *
 * Les deux formulaires exigent le mot de passe actuel, en plus d'être
 * connecté. Ce n'est pas une formalité : sans lui, une session laissée ouverte
 * sur un poste partagé suffirait à changer les accès et à exclure le gérant de
 * son propre site. L'identifiant est le cas le plus sensible des deux — c'est
 * l'adresse qui reçoit les liens de réinitialisation.
 */
import { ref, reactive, computed, onMounted } from "vue";
import api from "../../services/api";
import { useAuth } from "../../composables/useAuth";

const MOT_DE_PASSE_MIN = 8;
// Même contrôle permissif que le serveur : attraper la faute de frappe, pas
// rejouer la RFC.
const FORMAT_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const { state, setIdentifiant } = useAuth();

const identifiant = ref(state.identifiant ?? "");

/* ---------- Identifiant ---------- */

const formId = reactive({ nouveau: "", motDePasse: "" });
const envoiId = ref(false);
const erreurId = ref("");
const succesId = ref("");

const emailInvalide = computed(
  () => formId.nouveau.length > 0 && !FORMAT_EMAIL.test(formId.nouveau.trim())
);
// Sorti en computed plutot qu'ecrit dans l'attribut : une apostrophe au
// milieu d'une expression de template s'y echappe mal.
const messageEmail = computed(() =>
  emailInvalide.value ? "Ce n'est pas une adresse e-mail valide." : []
);

const identifiantInchange = computed(
  () => formId.nouveau.trim().toLowerCase() === identifiant.value.toLowerCase()
);
const idPret = computed(
  () =>
    FORMAT_EMAIL.test(formId.nouveau.trim()) &&
    !identifiantInchange.value &&
    formId.motDePasse.length > 0
);

/* ---------- Mot de passe ---------- */

const formMdp = reactive({ actuel: "", nouveau: "", confirmation: "" });
const envoiMdp = ref(false);
const erreurMdp = ref("");
const succesMdp = ref(false);

// Les champs sont masqués par défaut, avec un œil pour les révéler : sur un
// mot de passe qu'on saisit deux fois, taper à l'aveugle est la première cause
// de « ça ne marche pas ».
const visible = ref(false);
const typeChamp = computed(() => (visible.value ? "text" : "password"));

const tropCourt = computed(
  () => formMdp.nouveau.length > 0 && formMdp.nouveau.length < MOT_DE_PASSE_MIN
);
const discordance = computed(
  () => formMdp.confirmation.length > 0 && formMdp.nouveau !== formMdp.confirmation
);
const mdpPret = computed(
  () =>
    formMdp.actuel.length > 0 &&
    formMdp.nouveau.length >= MOT_DE_PASSE_MIN &&
    formMdp.nouveau === formMdp.confirmation
);

onMounted(async () => {
  // L'identifiant est déjà en localStorage, mais il peut dater d'une session
  // précédente : on prend celui que le serveur reconnaît.
  try {
    const { data } = await api.get("/auth/me");
    identifiant.value = data.identifiant;
  } catch {
    // Sans réponse, l'identifiant local fait l'affaire pour un simple rappel.
  }
});

async function changerIdentifiant() {
  if (!idPret.value) return;

  envoiId.value = true;
  erreurId.value = "";
  succesId.value = "";
  try {
    const { data } = await api.put("/auth/identifiant", {
      identifiant: formId.nouveau.trim(),
      motDePasse: formId.motDePasse,
    });
    const ancien = identifiant.value;
    identifiant.value = data.identifiant;
    // Sans ça, l'écran de connexion reproposerait l'ancienne adresse à la
    // prochaine session.
    setIdentifiant(data.identifiant);
    Object.assign(formId, { nouveau: "", motDePasse: "" });
    succesId.value = `Identifiant changé. Un e-mail d'avertissement est parti sur ${ancien}.`;
  } catch (err) {
    erreurId.value = err.response?.data?.message || "L'identifiant n'a pas pu être changé.";
  } finally {
    envoiId.value = false;
  }
}

async function changerMotDePasse() {
  if (!mdpPret.value) return;

  envoiMdp.value = true;
  erreurMdp.value = "";
  succesMdp.value = false;
  try {
    await api.put("/auth/password", {
      motDePasseActuel: formMdp.actuel,
      motDePasse: formMdp.nouveau,
    });
    Object.assign(formMdp, { actuel: "", nouveau: "", confirmation: "" });
    visible.value = false;
    succesMdp.value = true;
  } catch (err) {
    erreurMdp.value = err.response?.data?.message || "Le mot de passe n'a pas pu être changé.";
  } finally {
    envoiMdp.value = false;
  }
}
</script>

<template>
  <h1 class="text-h5 mb-1">Mon compte</h1>
  <p class="text-body-2 text-medium-emphasis mb-6">L'accès à l'administration du site.</p>

  <div class="colonne">
    <!-- Identifiant -->
    <v-card class="pa-6" variant="flat">
      <h2 class="text-subtitle-1 font-weight-bold mb-1">Identifiant de connexion</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        C'est aussi l'adresse qui reçoit le lien en cas de mot de passe oublié :
        elle doit rester une boîte que vous relevez. L'ancienne adresse est
        prévenue par e-mail du changement.
      </p>

      <v-text-field
        :model-value="identifiant"
        label="Identifiant actuel"
        prepend-inner-icon="mdi-email-outline"
        readonly
        class="mb-4"
      />

      <v-form @submit.prevent="changerIdentifiant">
        <v-text-field
          v-model="formId.nouveau"
          label="Nouvel identifiant"
          type="email"
          autocomplete="username"
          prepend-inner-icon="mdi-email-edit-outline"
          :error="emailInvalide"
          :error-messages="messageEmail"
          class="mb-2"
        />
        <v-text-field
          v-model="formId.motDePasse"
          label="Votre mot de passe"
          type="password"
          autocomplete="current-password"
          prepend-inner-icon="mdi-lock-outline"
          hint="Demandé pour confirmer que c'est bien vous."
          persistent-hint
          class="mb-4"
        />

        <v-alert v-if="succesId" type="success" density="compact" class="mb-4">
          {{ succesId }}
        </v-alert>
        <v-alert v-if="erreurId" type="error" variant="tonal" density="compact" class="mb-4">
          {{ erreurId }}
        </v-alert>

        <v-btn type="submit" color="primary" :loading="envoiId" :disabled="!idPret">
          Changer l'identifiant
        </v-btn>
      </v-form>
    </v-card>

    <!-- Mot de passe -->
    <v-card class="pa-6" variant="flat">
      <h2 class="text-subtitle-1 font-weight-bold mb-1">Changer le mot de passe</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        {{ MOT_DE_PASSE_MIN }} caractères au minimum. Le mot de passe actuel est
        demandé pour qu'une session oubliée sur un ordinateur partagé ne
        permette pas de vous verrouiller dehors.
      </p>

      <v-form @submit.prevent="changerMotDePasse">
        <v-text-field
          v-model="formMdp.actuel"
          label="Mot de passe actuel"
          :type="typeChamp"
          autocomplete="current-password"
          prepend-inner-icon="mdi-lock-outline"
          class="mb-2"
        />
        <v-text-field
          v-model="formMdp.nouveau"
          label="Nouveau mot de passe"
          :type="typeChamp"
          autocomplete="new-password"
          prepend-inner-icon="mdi-lock-reset"
          :error="tropCourt"
          :error-messages="tropCourt ? `Au moins ${MOT_DE_PASSE_MIN} caractères.` : []"
          :append-inner-icon="visible ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
          class="mb-2"
          @click:append-inner="visible = !visible"
        />
        <v-text-field
          v-model="formMdp.confirmation"
          label="Confirmer le nouveau mot de passe"
          :type="typeChamp"
          autocomplete="new-password"
          prepend-inner-icon="mdi-lock-check-outline"
          :error="discordance"
          :error-messages="discordance ? 'Les deux saisies ne correspondent pas.' : []"
          class="mb-4"
        />

        <v-alert v-if="succesMdp" type="success" density="compact" class="mb-4">
          Mot de passe mis à jour. Il servira à votre prochaine connexion.
        </v-alert>
        <v-alert v-if="erreurMdp" type="error" variant="tonal" density="compact" class="mb-4">
          {{ erreurMdp }}
        </v-alert>

        <v-btn type="submit" color="primary" :loading="envoiMdp" :disabled="!mdpPret">
          Changer le mot de passe
        </v-btn>
      </v-form>
    </v-card>

    <!-- Le gérant qui arrive ici sans se souvenir de son mot de passe est
         bloqué par les deux formulaires : autant lui rappeler la sortie de
         secours plutôt que de le laisser se déconnecter pour la trouver. -->
    <v-card class="pa-6" variant="flat">
      <h2 class="text-subtitle-1 font-weight-bold mb-2">Mot de passe oublié ?</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Si vous ne connaissez plus votre mot de passe, demandez un lien de
        réinitialisation : il arrive sur <strong>{{ identifiant }}</strong> et
        reste valable une heure.
      </p>
      <v-btn
        :to="{ name: 'admin-forgot-password' }"
        variant="outlined"
        prepend-icon="mdi-email-arrow-right-outline"
      >
        Recevoir un lien par e-mail
      </v-btn>
    </v-card>
  </div>
</template>

<style scoped>
.colonne {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  max-width: 560px;
}

.colonne :deep(.v-card) {
  background: var(--paper);
  border: 1px solid var(--line);
}
</style>

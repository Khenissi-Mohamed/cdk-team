<script setup>
/**
 * Le compte administrateur : l'identifiant, et le changement de mot de passe.
 *
 * Le mot de passe actuel est demandé en plus d'être connecté. Ce n'est pas une
 * formalité : sans lui, une session laissée ouverte sur un poste partagé
 * suffirait à changer le mot de passe et à exclure le gérant de son propre
 * site.
 */
import { ref, reactive, computed, onMounted } from "vue";
import api from "../../services/api";
import { useAuth } from "../../composables/useAuth";

const MOT_DE_PASSE_MIN = 8;

const { state } = useAuth();

const identifiant = ref(state.identifiant ?? "");
const form = reactive({ actuel: "", nouveau: "", confirmation: "" });

const enregistrement = ref(false);
const erreur = ref("");
const succes = ref(false);

// Les trois champs sont masqués par défaut, avec un œil pour les révéler : sur
// un mot de passe qu'on saisit deux fois, taper à l'aveugle est la première
// cause de « ça ne marche pas ».
const visible = ref(false);
const typeChamp = computed(() => (visible.value ? "text" : "password"));

const troporCourt = computed(
  () => form.nouveau.length > 0 && form.nouveau.length < MOT_DE_PASSE_MIN
);
const discordance = computed(
  () => form.confirmation.length > 0 && form.nouveau !== form.confirmation
);
const pretAEnvoyer = computed(
  () =>
    form.actuel.length > 0 &&
    form.nouveau.length >= MOT_DE_PASSE_MIN &&
    form.nouveau === form.confirmation
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

async function soumettre() {
  if (!pretAEnvoyer.value) return;

  enregistrement.value = true;
  erreur.value = "";
  succes.value = false;
  try {
    await api.put("/auth/password", {
      motDePasseActuel: form.actuel,
      motDePasse: form.nouveau,
    });
    Object.assign(form, { actuel: "", nouveau: "", confirmation: "" });
    visible.value = false;
    succes.value = true;
  } catch (err) {
    erreur.value = err.response?.data?.message || "Le mot de passe n'a pas pu être changé.";
  } finally {
    enregistrement.value = false;
  }
}
</script>

<template>
  <h1 class="text-h5 mb-1">Mon compte</h1>
  <p class="text-body-2 text-medium-emphasis mb-6">
    L'accès à l'administration du site.
  </p>

  <div class="colonne">
    <v-card class="pa-6" variant="flat">
      <h2 class="text-subtitle-1 font-weight-bold mb-4">Identifiant</h2>
      <v-text-field
        :model-value="identifiant"
        label="Identifiant de connexion"
        prepend-inner-icon="mdi-email-outline"
        readonly
        hint="C'est aussi l'adresse qui reçoit le lien en cas de mot de passe oublié. Pour en changer, dites-le-moi."
        persistent-hint
      />
    </v-card>

    <v-card class="pa-6" variant="flat">
      <h2 class="text-subtitle-1 font-weight-bold mb-1">Changer le mot de passe</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        {{ MOT_DE_PASSE_MIN }} caractères au minimum. Le mot de passe actuel est
        demandé pour qu'une session oubliée sur un ordinateur partagé ne
        permette pas de vous verrouiller dehors.
      </p>

      <v-form @submit.prevent="soumettre">
        <v-text-field
          v-model="form.actuel"
          label="Mot de passe actuel"
          :type="typeChamp"
          autocomplete="current-password"
          prepend-inner-icon="mdi-lock-outline"
          class="mb-2"
        />
        <v-text-field
          v-model="form.nouveau"
          label="Nouveau mot de passe"
          :type="typeChamp"
          autocomplete="new-password"
          prepend-inner-icon="mdi-lock-reset"
          :error="troporCourt"
          :error-messages="troporCourt ? `Au moins ${MOT_DE_PASSE_MIN} caractères.` : []"
          :append-inner-icon="visible ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
          class="mb-2"
          @click:append-inner="visible = !visible"
        />
        <v-text-field
          v-model="form.confirmation"
          label="Confirmer le nouveau mot de passe"
          :type="typeChamp"
          autocomplete="new-password"
          prepend-inner-icon="mdi-lock-check-outline"
          :error="discordance"
          :error-messages="discordance ? 'Les deux saisies ne correspondent pas.' : []"
          class="mb-4"
        />

        <v-alert v-if="succes" type="success" density="compact" class="mb-4">
          Mot de passe mis à jour. Il servira à votre prochaine connexion.
        </v-alert>
        <v-alert v-if="erreur" type="error" variant="tonal" density="compact" class="mb-4">
          {{ erreur }}
        </v-alert>

        <v-btn
          type="submit"
          color="primary"
          size="large"
          :loading="enregistrement"
          :disabled="!pretAEnvoyer"
        >
          Changer le mot de passe
        </v-btn>
      </v-form>
    </v-card>

    <!-- Le gérant qui arrive ici sans se souvenir de son mot de passe actuel
         est bloqué par le formulaire ci-dessus : autant lui rappeler la sortie
         de secours plutôt que de le laisser se déconnecter pour la trouver. -->
    <v-card class="pa-6" variant="flat">
      <h2 class="text-subtitle-1 font-weight-bold mb-2">Mot de passe oublié ?</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Si vous ne connaissez plus le mot de passe actuel, demandez un lien de
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

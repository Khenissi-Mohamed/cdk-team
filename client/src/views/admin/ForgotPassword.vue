<script setup>
import { ref } from "vue";
import { RouterLink } from "vue-router";
import api from "../../services/api";

const identifiant = ref("");
const message = ref("");
const loading = ref(false);

async function submit() {
  loading.value = true;
  try {
    const { data } = await api.post("/auth/forgot-password", { identifiant: identifiant.value });
    message.value = data.message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="admin-auth-page">
    <v-card class="pa-8" max-width="420" width="100%" elevation="4">
      <h1 class="text-h5 mb-2">Mot de passe oublié</h1>
      <p class="text-body-2 text-medium-emphasis mb-6">
        Indiquez votre identifiant, un lien de réinitialisation vous sera envoyé par email.
      </p>

      <v-form @submit.prevent="submit">
        <v-text-field
          v-model="identifiant"
          label="Identifiant"
          type="email"
          class="mb-2"
          required
        />

        <v-alert v-if="message" type="info" density="compact" class="mb-4">{{ message }}</v-alert>

        <v-btn type="submit" color="primary" block size="large" :loading="loading">
          Envoyer le lien
        </v-btn>
      </v-form>

      <RouterLink class="d-block text-center mt-5 text-body-2" to="/admin/connexion">
        ← Retour à la connexion
      </RouterLink>
    </v-card>
  </div>
</template>

<style scoped>
.admin-auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--sand);
  padding: 1.5rem;
}
</style>

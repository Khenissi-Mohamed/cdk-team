<script setup>
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "../../services/api";

const route = useRoute();
const router = useRouter();

const motDePasse = ref("");
const confirmation = ref("");
const error = ref("");
const success = ref(false);
const loading = ref(false);

async function submit() {
  error.value = "";
  if (motDePasse.value !== confirmation.value) {
    error.value = "Les deux mots de passe ne correspondent pas.";
    return;
  }

  loading.value = true;
  try {
    await api.post("/auth/reset-password", {
      token: route.query.token,
      motDePasse: motDePasse.value,
    });
    success.value = true;
    setTimeout(() => router.push({ name: "admin-login" }), 2000);
  } catch (e) {
    error.value = e.response?.data?.message || "Une erreur est survenue.";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="admin-auth-page">
    <v-card class="pa-8" max-width="420" width="100%" elevation="4">
      <h1 class="text-h5 mb-6">Nouveau mot de passe</h1>

      <v-alert v-if="success" type="success" density="compact" class="mb-4">
        Mot de passe mis à jour, redirection vers la connexion…
      </v-alert>

      <v-form v-else @submit.prevent="submit">
        <v-text-field
          v-model="motDePasse"
          label="Nouveau mot de passe"
          type="password"
          class="mb-2"
          required
        />
        <v-text-field
          v-model="confirmation"
          label="Confirmer le mot de passe"
          type="password"
          class="mb-2"
          required
        />

        <v-alert v-if="error" type="error" density="compact" class="mb-4">{{ error }}</v-alert>

        <v-btn type="submit" color="primary" block size="large" :loading="loading">
          Mettre à jour
        </v-btn>
      </v-form>
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

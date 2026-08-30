<script setup>
import { ref } from "vue";
import { useRouter, useRoute, RouterLink } from "vue-router";
import { useAuth } from "../../composables/useAuth";

const router = useRouter();
const route = useRoute();
const { login } = useAuth();

const identifiant = ref("");
const motDePasse = ref("");
const error = ref("");
const loading = ref(false);

async function submit() {
  error.value = "";
  loading.value = true;
  try {
    await login(identifiant.value, motDePasse.value);
    router.push(route.query.redirect || { name: "admin-dashboard" });
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
      <h1 class="text-h5 mb-6">Espace administrateur</h1>

      <v-form @submit.prevent="submit">
        <v-text-field
          v-model="identifiant"
          label="Identifiant"
          type="email"
          autocomplete="username"
          class="mb-2"
          required
        />
        <v-text-field
          v-model="motDePasse"
          label="Mot de passe"
          type="password"
          autocomplete="current-password"
          class="mb-2"
          required
        />

        <v-alert v-if="error" type="error" density="compact" class="mb-4">{{ error }}</v-alert>

        <v-btn type="submit" color="primary" block size="large" :loading="loading">
          Se connecter
        </v-btn>
      </v-form>

      <RouterLink class="d-block text-center mt-5 text-body-2" to="/admin/mot-de-passe-oublie">
        Mot de passe oublié ?
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

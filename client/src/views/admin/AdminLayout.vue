<script setup>
import { ref } from "vue";
import { useDisplay } from "vuetify";
import { useRouter, RouterView } from "vue-router";
import { useAuth } from "../../composables/useAuth";

const router = useRouter();
const { logout } = useAuth();
const { mobile } = useDisplay();

const drawer = ref(!mobile.value);

function handleLogout() {
  logout();
  router.push({ name: "admin-login" });
}

function closeOnMobile() {
  if (mobile.value) drawer.value = false;
}
</script>

<template>
  <v-app-bar v-if="mobile" color="surface" density="comfortable" :elevation="0" class="border-b">
    <v-app-bar-nav-icon @click="drawer = !drawer" />
    <span class="font-display text-subtitle-1">CDK-Team</span>
  </v-app-bar>

  <v-navigation-drawer
    v-model="drawer"
    :permanent="!mobile"
    :temporary="mobile"
    color="surface"
    width="240"
  >
    <div class="pa-5 d-none d-md-block">
      <span class="font-display text-h6">CDK-Team</span>
      <div class="text-caption text-medium-emphasis">Administration</div>
    </div>

    <v-list nav density="comfortable">
      <v-list-item
        :to="{ name: 'admin-dashboard' }"
        prepend-icon="mdi-view-dashboard"
        title="Tableau de bord"
        @click="closeOnMobile"
      />
      <v-list-item
        :to="{ name: 'admin-cours' }"
        prepend-icon="mdi-calendar-week"
        title="Planning"
        @click="closeOnMobile"
      />
      <v-list-item
        :to="{ name: 'admin-coachs' }"
        prepend-icon="mdi-account-group-outline"
        title="Coachs"
        @click="closeOnMobile"
      />
      <v-list-item
        :to="{ name: 'admin-tarifs' }"
        prepend-icon="mdi-cash-multiple"
        title="Tarifs"
        @click="closeOnMobile"
      />
      <v-list-item
        :to="{ name: 'admin-documents' }"
        prepend-icon="mdi-file-pdf-box"
        title="Documents"
        @click="closeOnMobile"
      />
      <v-list-item
        :to="{ name: 'admin-settings' }"
        prepend-icon="mdi-text-box-edit-outline"
        title="Contenu du site"
        @click="closeOnMobile"
      />
    </v-list>

    <template #append>
      <div class="pa-3">
        <v-btn variant="text" block prepend-icon="mdi-logout" @click="handleLogout">
          Déconnexion
        </v-btn>
      </div>
    </template>
  </v-navigation-drawer>

  <v-main class="bg-background">
    <v-container fluid class="pa-4 pa-md-6">
      <RouterView />
    </v-container>
  </v-main>
</template>

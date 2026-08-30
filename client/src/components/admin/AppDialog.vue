<script setup>
import { computed } from "vue";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  variant: {
    type: String,
    default: "brand",
    validator: (v) => ["success", "warning", "danger", "brand"].includes(v),
  },
  title: { type: String, required: true },
  confirmText: { type: String, default: "Valider" },
  loading: { type: Boolean, default: false },
  maxWidth: { type: [String, Number], default: 520 },
  hideActions: { type: Boolean, default: false },
});

const emit = defineEmits(["update:modelValue", "confirm", "cancel"]);

const colorMap = {
  success: "success",
  warning: "warning",
  danger: "error",
  brand: "primary",
};

const headerColor = computed(() => colorMap[props.variant]);

/**
 * Encre du bandeau. Le socle écrivait `text-white` en dur, ce qui marchait avec
 * une teinte de marque sombre. Avec le jaune haute visibilité de RRTM (et
 * l'orange de la variante « édition »), du blanc tombe sous le seuil AA :
 * 1,7:1 sur le jaune. Les deux teintes claires prennent donc une encre sombre.
 */
const headerInk = computed(() =>
  ["brand", "warning"].includes(props.variant) ? "var(--ink)" : "#ffffff"
);

function close() {
  emit("update:modelValue", false);
  emit("cancel");
}

function confirm() {
  emit("confirm");
}
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    :max-width="maxWidth"
    @update:model-value="(v) => emit('update:modelValue', v)"
  >
    <v-card class="app-dialog">
      <v-card-title class="app-dialog-header" :class="`bg-${headerColor}`">
        <span :style="{ color: headerInk }">{{ title }}</span>
      </v-card-title>

      <v-card-text class="app-dialog-content">
        <slot />
      </v-card-text>

      <v-card-actions v-if="!hideActions" class="app-dialog-footer">
        <v-spacer />
        <v-btn variant="text" @click="close">Annuler</v-btn>
        <v-btn :color="headerColor" :loading="loading" @click="confirm">{{ confirmText }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.app-dialog {
  display: flex;
  flex-direction: column;
  max-height: 85vh;
}
.app-dialog-header {
  flex: none;
  padding: 1.1rem 1.4rem;
}
.app-dialog-content {
  flex: 1 1 auto;
  overflow-y: auto;
  padding-top: 1.4rem !important;
}
.app-dialog-footer {
  flex: none;
  padding: 0.9rem 1.1rem;
}
</style>

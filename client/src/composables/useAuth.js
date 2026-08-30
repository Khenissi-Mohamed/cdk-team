import { reactive, readonly } from "vue";
import api from "../services/api";

const state = reactive({
  token: localStorage.getItem("admin_token"),
  identifiant: localStorage.getItem("admin_identifiant"),
});

async function login(identifiant, motDePasse) {
  const { data } = await api.post("/auth/login", { identifiant, motDePasse });
  state.token = data.token;
  state.identifiant = data.identifiant;
  localStorage.setItem("admin_token", data.token);
  localStorage.setItem("admin_identifiant", data.identifiant);
}

function logout() {
  state.token = null;
  state.identifiant = null;
  localStorage.removeItem("admin_token");
  localStorage.removeItem("admin_identifiant");
}

function isAuthenticated() {
  return Boolean(state.token);
}

export function useAuth() {
  return { state: readonly(state), login, logout, isAuthenticated };
}

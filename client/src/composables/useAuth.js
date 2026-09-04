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

/**
 * Met à jour l'identifiant après un changement depuis « Mon compte ».
 *
 * Le jeton, lui, reste valide : il porte l'identifiant technique du compte
 * (`sub`), pas l'adresse. Inutile donc de reconnecter le gérant — mais le
 * stockage local doit suivre, sinon l'écran de connexion lui repropose son
 * ANCIENNE adresse à la prochaine session.
 */
function setIdentifiant(identifiant) {
  state.identifiant = identifiant;
  localStorage.setItem("admin_identifiant", identifiant);
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
  return { state: readonly(state), login, logout, setIdentifiant, isAuthenticated };
}

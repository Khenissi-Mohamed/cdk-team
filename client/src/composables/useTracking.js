import api from "../services/api";

// Compte les clics vers les canaux de contact, sans cookie ni donnée personnelle.
export function trackClick(canal) {
  api.post("/events", { canal, page: window.location.pathname }).catch(() => {
    // silencieux : le tracking ne doit jamais bloquer la navigation de l'utilisateur
  });
}

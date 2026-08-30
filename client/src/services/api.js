import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4003/api";

// Origine du serveur (sans le /api final), pour résoudre les chemins d'image
// renvoyés par l'API (ex: /uploads/hero/xxx.webp) qui sont relatifs au serveur,
// pas au front — sinon le navigateur les cherche sur l'origine du client.
export const API_ORIGIN = API_URL.replace(/\/api\/?$/, "");

export function assetUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//.test(path)) return path;
  return `${API_ORIGIN}${path}`;
}

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("admin_token");
    }
    return Promise.reject(error);
  }
);

export default api;

import "dotenv/config";
// Doit être importé avant la déclaration des routes : ce paquet patche la
// couche de routage d'Express 4 pour que le rejet d'une promesse dans un
// handler `async` remonte au middleware d'erreur. Sans lui, une exception
// asynchrone n'est jamais interceptée : la requête reste pendante jusqu'au
// timeout du client et le process finit par tomber sur un unhandledRejection.
import "express-async-errors";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "node:path";
import { connectDb } from "./config/db.js";

import authRoutes from "./routes/auth.routes.js";
import settingsRoutes from "./routes/settings.routes.js";
import coursRoutes from "./routes/cours.routes.js";
import coachsRoutes from "./routes/coachs.routes.js";
import tarifsRoutes from "./routes/tarifs.routes.js";
import documentsRoutes from "./routes/documents.routes.js";
import planningRoutes from "./routes/planning.routes.js";
import eventsRoutes from "./routes/events.routes.js";
import boutiqueRoutes from "./routes/boutique.routes.js";

const app = express();

// Derrière le Nginx du VPS : sans cette confiance explicite, req.ip vaut
// toujours 127.0.0.1 et la limitation de débit compte toutes les requêtes du
// monde dans le même seau.
app.set("trust proxy", 1);

app.use(
  helmet({
    // Ce process ne sert aucune page HTML (le site est servi par Nginx), une
    // CSP ici ne protégerait rien.
    contentSecurityPolicy: false,
    // Les médias sont chargés depuis une origine différente de celle du site
    // en développement (5173 -> 4003). La politique same-origin par défaut de
    // helmet les ferait échouer silencieusement dans le navigateur.
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
/**
 * CORS.
 *
 * En production : une seule origine, celle du site, déclarée dans CLIENT_URL.
 *
 * En développement : le port de Vite n'est PAS garanti. Il se rabat sur 5174,
 * 5175, 5176… dès que 5173 est occupé — un serveur de dev oublié suffit, et
 * ils s'empilent vite. Avec une origine figée, tous les appels échouent alors
 * sur un message CORS qui ne dit rien du vrai problème : le port a glissé.
 * Hors production on accepte donc n'importe quel port de localhost, et rien
 * d'autre.
 *
 * `NODE_ENV` vaut « production » dans l'image Docker (voir le Dockerfile) ;
 * hors conteneur il est absent, ce qui vaut développement.
 */
const EN_PRODUCTION = process.env.NODE_ENV === "production";
const ORIGINE_LOCALE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

function origineAutorisee(origine, repondre) {
  // Pas d'en-tête Origin : appel serveur à serveur, curl, sonde de santé. Ce
  // ne sont pas des requêtes de navigateur, CORS ne les concerne pas.
  if (!origine) return repondre(null, true);

  if (process.env.CLIENT_URL && origine === process.env.CLIENT_URL) {
    return repondre(null, true);
  }
  if (!EN_PRODUCTION && ORIGINE_LOCALE.test(origine)) {
    return repondre(null, true);
  }

  // `false` plutôt qu'une erreur : on n'envoie simplement pas l'en-tête et le
  // navigateur bloque de lui-même. Lever ici transformerait un refus normal en
  // 500 dans les journaux, et masquerait les vraies pannes.
  console.warn(`[cors] origine refusée : ${origine}`);
  repondre(null, false);
}

app.use(cors({ origin: origineAutorisee }));
app.use(express.json());
app.use("/uploads", express.static(path.resolve("uploads")));

// Permet de vérifier un déploiement sans ouvrir de navigateur.
app.get("/api/health", (req, res) => {
  res.json({ statut: "ok", heure: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/cours", coursRoutes);
app.use("/api/coachs", coachsRoutes);
app.use("/api/tarifs", tarifsRoutes);
app.use("/api/documents", documentsRoutes);
app.use("/api/planning", planningRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/boutique", boutiqueRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || "Erreur serveur." });
});

const port = process.env.PORT || 4003;

connectDb().then(() => {
  app.listen(port, () => console.log(`[server] en écoute sur http://localhost:${port}`));
});

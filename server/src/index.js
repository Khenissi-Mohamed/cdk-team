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
app.use(cors({ origin: process.env.CLIENT_URL || true }));
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

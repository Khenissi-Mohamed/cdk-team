import { readFile, writeFile } from "node:fs/promises";
import { createServer, loadEnv } from "vite";

const env = loadEnv("production", process.cwd(), "VITE_");
const api = process.env.VITE_API_URL || env.VITE_API_URL;
if (!api) {
  console.log("Prérendu ignoré : VITE_API_URL absent (build local).");
  process.exit(0);
}

// Échouer avant publication si les données publiques ne sont pas disponibles.
const names = ["settings", "cours", "coachs", "tarifs", "documents", "boutique"];
const responses = await Promise.all(names.map(async (name) => {
  const response = await fetch(`${api.replace(/\/$/, "")}/${name}`, {
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`Prérendu : ${name} HTTP ${response.status}`);
  return response.json();
}));
const data = Object.fromEntries(names.map((name, index) => [name, responses[index]]));
data.produits = data.boutique.produits;
delete data.boutique;
if (!data.settings.hero?.titre || !Array.isArray(data.cours)) {
  throw new Error("Prérendu : contenu public incomplet.");
}

const server = await createServer({ mode: "production", server: { middlewareMode: true }, appType: "custom" });
try {
  const { renderHome } = await server.ssrLoadModule("/src/prerender.js");
  const content = await renderHome(data);
  const template = await readFile("dist/index.html", "utf8");
  const manifest = JSON.parse(await readFile("dist/.vite/manifest.json", "utf8"));
  const styles = new Set();
  const visited = new Set();
  function collect(key) {
    if (visited.has(key)) return;
    visited.add(key);
    const entry = manifest[key];
    for (const css of entry?.css || []) styles.add(css);
    for (const dependency of entry?.imports || []) collect(dependency);
  }
  collect("src/views/PublicHome.vue");
  const cssLinks = [...styles].filter((css) => !template.includes(`/${css}`))
    .map((css) => `<link rel="stylesheet" href="/${css}">`).join("\n");
  const snapshot = JSON.stringify(data).replace(/</g, "\\u003c");
  const html = template.replace("</head>", `${cssLinks}\n<link rel="canonical" href="https://team-cdk.fr/">\n</head>`)
    .replace('<div id="app"></div>', `<div id="app">${content}</div>\n<script id="home-data" type="application/json">${snapshot}</script>`);
  await writeFile("dist/home.html", html);
  console.log(`Accueil prérendu : ${content.length} caractères de HTML, ${data.cours.length} cours.`);
} finally {
  await server.close();
}

const origin = "https://team-cdk.fr";
const pages = {
  "/": {
    title: "CDK Team – JJB à Sevran | Jiu-jitsu brésilien",
    description: "Découvrez CDK Team à Sevran : jiu-jitsu brésilien, gi et no-gi, adultes et enfants. Consultez les horaires, tarifs et modalités d'inscription.",
  },
  "/boutique": {
    title: "Boutique du club – CDK Team Sevran",
    description: "Découvrez les produits de la boutique du club CDK Team, club de jiu-jitsu brésilien à Sevran.",
  },
  "/mentions-legales": {
    title: "Mentions légales – CDK Team Sevran",
    description: "Mentions légales et informations sur l'éditeur du site du club CDK Team à Sevran.",
  },
  "/politique-de-confidentialite": {
    title: "Politique de confidentialité – CDK Team Sevran",
    description: "Informations sur la protection des données personnelles sur le site du club CDK Team à Sevran.",
  },
};

function setMeta(attribute, name, content) {
  let element = document.head.querySelector(`meta[${attribute}="${name}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, name);
    document.head.appendChild(element);
  }
  element.content = content;
}

export function updateSeo(route) {
  const path = route.path.replace(/\/+$/, "") || "/";
  const page = pages[path];
  const title = page?.title ?? "Espace privé – CDK Team Sevran";
  const description = page?.description ?? "Espace d'administration du club CDK Team.";
  document.title = title;
  setMeta("name", "description", description);
  setMeta("name", "robots", page ? "index, follow" : "noindex, nofollow");
  setMeta("property", "og:title", title);
  setMeta("property", "og:description", description);
  setMeta("property", "og:url", `${origin}${path}`);

  // Le HTML commun à toutes les routes ne doit pas imposer la canonique de l'accueil.
  let canonical = document.head.querySelector('link[rel="canonical"]');
  if (!page) {
    canonical?.remove();
    return;
  }
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }
  canonical.href = `${origin}${path}`;
}

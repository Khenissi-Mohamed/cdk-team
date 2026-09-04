import rateLimit from "express-rate-limit";

/**
 * Limitation de débit sur les trois routes publiques non authentifiées.
 *
 * Le socle n'en avait aucune : `POST /api/events` et `POST /api/auth/login`
 * étaient ouverts et illimités dans les projets dont RRTM est issu. Ici s'y
 * ajoute le formulaire de devis, qui écrit en base ET déclenche deux envois
 * SMTP — sans plafond, un seul script suffit à saturer le quota du serveur mail
 * et à noyer les vraies demandes.
 *
 * `standardHeaders` renvoie les en-têtes RateLimit-* pour que le front puisse
 * afficher un message honnête plutôt qu'une erreur générique.
 */
function limiteur({ windowMs, limit, message }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { message },
  });
}

// Le formulaire de devis : 5 envois par quart d'heure. Un prospect honnête en
// envoie un, éventuellement deux s'il s'est trompé.
export const limiteurContact = limiteur({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: "Trop de demandes envoyées. Réessayez dans quelques minutes ou appelez-nous.",
});

// Connexion admin : freine le bourrage d'identifiants sans gêner le gérant qui
// se trompe de mot de passe deux fois.
export const limiteurLogin = limiteur({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: "Trop de tentatives de connexion. Réessayez dans quelques minutes.",
});

// Changement de mot de passe : il faut déjà être connecté, mais c'est le mot
// de passe ACTUEL qu'on y vérifie — sans plafond, une session laissée ouverte
// servirait à le deviner tranquillement. Seau séparé de celui du login pour
// qu'une faute de frappe ici ne mange pas les tentatives de connexion.
export const limiteurMotDePasse = limiteur({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: "Trop de tentatives. Réessayez dans quelques minutes.",
});

// Tracking de clics : généreux, un visiteur légitime peut cliquer plusieurs
// canaux. Il s'agit seulement d'empêcher qu'on gonfle les statistiques.
export const limiteurEvents = limiteur({
  windowMs: 60 * 1000,
  limit: 30,
  message: "Trop de requêtes.",
});

/**
 * Normalisation des liens de contact saisis depuis l'admin.
 *
 * Le formulaire des paramètres suggère des URL complètes mais ne les impose
 * pas. Une saisie du type « wa.me/21612345678 », « @daramana.djerba » ou d'un
 * simple numéro produit un href SANS protocole, que le navigateur interprète
 * alors comme un chemin relatif : le clic mène vers `/wa.me/21612345678` sur le
 * site au lieu d'ouvrir WhatsApp.
 *
 * On rattrape donc ici les formes de saisie courantes, plutôt que de parier sur
 * une saisie parfaite par le client.
 */

// `https:`, `mailto:`, `tel:`… — une URL déjà complète est laissée intacte.
const HAS_PROTOCOL = /^[a-z][a-z0-9+.-]*:/i;

// Un numéro de téléphone et rien d'autre : chiffres, espaces, points, tirets,
// parenthèses, avec un + éventuel en tête.
const LOOKS_LIKE_PHONE = /^\+?[\d\s().-]+$/;

const SOCIAL_HOSTS = {
  // TikTok garde l'arobase dans l'URL du profil, pas Instagram.
  instagram: { host: "instagram.com", keepAt: false },
  tiktok: { host: "tiktok.com", keepAt: true },
  facebook: { host: "facebook.com", keepAt: false },
};

/** Ne conserve que les chiffres, avec un + éventuel en tête. */
function digitsOnly(value) {
  const raw = String(value ?? "").trim();
  const plus = raw.startsWith("+");
  const digits = raw.replace(/\D/g, "");
  return digits ? `${plus ? "+" : ""}${digits}` : "";
}

/** Complète une URL sans protocole. Renvoie "" si la valeur est vide. */
export function externalUrl(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (HAS_PROTOCOL.test(raw)) return raw;
  // `//exemple.com` ou `/exemple.com` : on retire les slashs de tête avant de
  // préfixer, sinon on obtiendrait `https:///exemple.com`.
  return `https://${raw.replace(/^\/+/, "")}`;
}

/**
 * Accepte aussi bien un lien wa.me complet qu'un numéro de téléphone brut.
 * wa.me n'accepte que des chiffres : ni +, ni espaces, ni tirets.
 */
export function whatsappUrl(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (LOOKS_LIKE_PHONE.test(raw)) {
    const number = digitsOnly(raw).replace(/^\+/, "");
    return number ? `https://wa.me/${number}` : "";
  }
  return externalUrl(raw);
}

/** Accepte une URL de profil complète ou un simple pseudo (« @compte »). */
export function socialUrl(value, platform) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  const config = SOCIAL_HOSTS[platform];
  // Un pseudo ne contient pas de slash : sa présence signale une URL, même
  // amputée de son protocole.
  if (!config || HAS_PROTOCOL.test(raw) || raw.includes("/")) return externalUrl(raw);

  const handle = raw.replace(/^@+/, "");
  return `https://${config.host}/${config.keepAt ? "@" : ""}${handle}`;
}

/** Lien `tel:` débarrassé des espaces, que certains clients mobiles avalent mal. */
export function telUrl(value) {
  const number = digitsOnly(value);
  return number ? `tel:${number}` : "";
}

/** Lien `mailto:` — accepte une adresse nue ou un `mailto:` déjà formé. */
export function mailUrl(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (HAS_PROTOCOL.test(raw)) return raw;
  return `mailto:${raw}`;
}

/**
 * Canaux de contact reconnus, dans l'ordre où on les normalise. Ajouter un
 * canal au site = ajouter son nom ici et, s'il a une URL de profil, une entrée
 * dans SOCIAL_HOSTS. Rien d'autre à toucher côté sections.
 */
export const CONTACT_CHANNELS = [
  "email",
  "telephone",
  "whatsapp",
  "instagram",
  "tiktok",
  "facebook",
];

/**
 * Point d'entrée unique : résout un lien à partir du nom du canal, tel qu'il
 * est nommé dans `site.config.js` et dans le modèle `Setting`.
 */
export function contactUrl(channel, value) {
  if (channel === "email") return mailUrl(value);
  if (channel === "whatsapp") return whatsappUrl(value);
  if (channel === "telephone") return telUrl(value);
  if (SOCIAL_HOSTS[channel]) return socialUrl(value, channel);
  return externalUrl(value);
}

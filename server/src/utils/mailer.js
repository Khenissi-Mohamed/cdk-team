import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: process.env.SMTP_USER
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
    : undefined,
});

/**
 * Un envoi qui échoue ne doit jamais faire échouer l'action qui l'a déclenché.
 * On journalise et on renvoie `false`.
 *
 * Le site du club n'a pas de formulaire public : le SEUL courriel émis est la
 * réinitialisation du mot de passe administrateur. Le reste du gabarit hérité
 * du socle a été retiré plutôt que laissé en place « au cas où ».
 */
async function envoyer(message) {
  try {
    await transporter.sendMail({ from: process.env.SMTP_FROM, ...message });
    return true;
  } catch (err) {
    console.error("[mail] envoi impossible :", message.subject, "—", err.message);
    return false;
  }
}

/** Indispensable : l'URL vient d'une variable d'environnement, pas d'un formulaire,
 *  mais l'échappement coûte une ligne et supprime toute question. */
const echapperHtml = (texte) =>
  String(texte ?? "").replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]
  );

export async function sendResetPasswordEmail(to, resetUrl) {
  return envoyer({
    to,
    subject: "Réinitialisation de votre mot de passe — CDK-Team",
    text: `Pour réinitialiser votre mot de passe, ouvrez ce lien (valable 1h) :\n${resetUrl}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet email.`,
    html: `<div style="font-family:-apple-system,Segoe UI,sans-serif;line-height:1.6;color:#0a0a0b;max-width:520px">
  <div style="height:5px;background:#c1121f;margin:0 0 20px"></div>
  <h2 style="font-size:19px;margin:0 0 16px">Réinitialisation de votre mot de passe</h2>
  <p>Ce lien est valable une heure :</p>
  <p><a href="${resetUrl}">${echapperHtml(resetUrl)}</a></p>
  <p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.</p>
  <p style="font-size:12px;color:#7d7f85;margin-top:28px">CDK-Team — jiu-jitsu brésilien</p>
</div>`,
  });
}

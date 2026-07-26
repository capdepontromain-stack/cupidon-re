// =====================================================================
// CUPIDON RENCONTRES — Fonction d'envoi des e-mails
// (mail de bienvenue, notification d'inscription à l'équipe,
//  confirmation de changement de mot de passe, demande de suppression)
//
// Déploiement : Supabase Dashboard → Edge Functions → Deploy new function
//   Nom : cupidon-mails   →  coller ce fichier  →  Deploy.
// Secrets à créer (Edge Functions → Secrets) :
//   RESEND_API_KEY   = clé API du compte Resend (resend.com, gratuit)
//   MAIL_EXPEDITEUR  = "Cupidon.re <bonjour@cupidon.re>" (domaine vérifié
//                      dans Resend) — ou onboarding@resend.dev pour tester.
//   MAIL_ADMIN       = contact@pullup.re
// =====================================================================

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const EXPEDITEUR = Deno.env.get("MAIL_EXPEDITEUR") ?? "Cupidon.re <onboarding@resend.dev>";
const ADMIN = Deno.env.get("MAIL_ADMIN") ?? "contact@pullup.re";

async function envoyer(destinataire: string, sujet: string, html: string) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_KEY}` },
    body: JSON.stringify({ from: EXPEDITEUR, to: [destinataire], subject: sujet, html }),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
}

/* Habillage commun des e-mails (charte Cupidon : bleu, rouge, or) */
function gabarit(contenu: string): string {
  return `<!doctype html><body style="margin:0;background:#F4F1EA;font-family:Georgia,serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:30px 14px">
  <table role="presentation" width="560" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden">
    <tr><td style="background:#0E2A6B;padding:26px;text-align:center">
      <div style="font-size:30px;line-height:1">💘</div>
      <div style="color:#ffffff;font-size:22px;font-weight:bold;margin-top:6px">cupidon<span style="color:#F60100">.</span>re</div>
      <div style="color:#AAB9E3;font-size:13px;font-family:Arial,sans-serif">L'appli de rencontres 100 % La Réunion</div>
    </td></tr>
    <tr><td style="padding:30px 32px;color:#22315E;font-size:15.5px;line-height:1.65;font-family:Arial,sans-serif">${contenu}</td></tr>
    <tr><td style="background:#FBF9F3;padding:18px;text-align:center;color:#6B7A9E;font-size:12px;font-family:Arial,sans-serif">
      Cupidon Rencontres — un service Pull Up Événements, Le Tampon, La Réunion<br>
      <a href="https://cupidon.re/app/" style="color:#0E7E96">cupidon.re/app</a>
    </td></tr>
  </table></td></tr></table></body>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const corps = await req.json();
    const action = corps.action as string;

    if (action === "bienvenue") {
      const prenom = (corps.prenom || "").toString().slice(0, 60) || "et bienvenue";
      await envoyer(corps.email, "Bienvenue sur PullUpCupidon.re ❤️", gabarit(`
        <p>Bonjour <b>${prenom}</b>,</p>
        <p>Bienvenue sur <b>PullUpCupidon.re</b>, l'application de rencontres dédiée à La Réunion.</p>
        <p>Nous sommes heureux de vous compter parmi les premiers membres.
        Vous faites partie des <b>membres fondateurs</b> de l'application et nous vous remercions de votre confiance.</p>
        <p style="margin:18px 0 6px"><b>Quelques règles simples :</b></p>
        <p style="margin:0">❤️ Respecter chaque membre.<br>
        ❤️ Rester bienveillant.<br>
        ❤️ Faire preuve de politesse.<br>
        ❤️ Signaler tout comportement inapproprié.<br>
        ❤️ Prendre du plaisir à faire de nouvelles rencontres.</p>
        <p style="margin-top:18px">Toute l'équipe Cupidon vous souhaite de très belles rencontres.</p>
        <p>À très bientôt !<br><b>L'équipe PullUpCupidon.re</b></p>`));
    }

    else if (action === "nouvelle-inscription") {
      const i = corps.inscription || {};
      await envoyer(ADMIN, "Nouvelle inscription PullUpCupidon.re", gabarit(`
        <p><b>Nouvelle inscription :</b></p>
        <p style="margin:0">Prénom : <b>${i.prenom || "—"}</b><br>
        Âge : ${i.age || "—"}<br>
        Genre : ${i.genre || "—"}<br>
        Ville : ${i.ville || "—"}<br>
        Statut : ${i.statut || "—"}<br>
        Recherche : ${i.recherche || "—"}<br>
        Profil : ${i.profil || "—"}<br>
        Date : ${i.date || "—"}</p>`));
    }

    else if (action === "mdp-change") {
      const prenom = (corps.prenom || "").toString().slice(0, 60);
      await envoyer(corps.email, "Votre mot de passe Cupidon.re a été modifié", gabarit(`
        <p>Bonjour ${prenom ? "<b>" + prenom + "</b>" : ""},</p>
        <p>Le mot de passe de votre compte Cupidon.re vient d'être <b>modifié avec succès</b>.
        Par sécurité, vos autres appareils ont été déconnectés.</p>
        <p>Si vous n'êtes pas à l'origine de ce changement, réinitialisez immédiatement votre mot de passe
        depuis la page « Mot de passe oublié ? » et écrivez-nous à ${ADMIN}.</p>
        <p><b>L'équipe PullUpCupidon.re</b></p>`));
    }

    else if (action === "suppression-compte") {
      await envoyer(ADMIN, "Demande de suppression de compte PullUpCupidon.re", gabarit(`
        <p><b>Un membre demande la suppression définitive de son compte :</b></p>
        <p>E-mail : <b>${corps.email || "—"}</b><br>Prénom : ${corps.prenom || "—"}<br>
        Date de la demande : ${new Date().toLocaleString("fr-FR", { timeZone: "Indian/Reunion" })}</p>
        <p>À faire sous 30 jours : Dashboard Supabase → Authentication → Users →
        rechercher cet e-mail → Delete user (les données du profil et les photos suivent automatiquement).</p>`));
    }

    else {
      return new Response(JSON.stringify({ erreur: "action inconnue" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...CORS, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ erreur: String(e) }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
  }
});

/* =====================================================================
   CUPIDON RENCONTRES — Configuration commune
   Client Supabase, listes (intérêts, profils types), calcul du profil
   automatique, description auto, validation du mot de passe.
   ===================================================================== */

'use strict';

/* ───────── Supabase ─────────
   Même projet que Pull Up Hub. La clé « anon » est publique par
   conception : toutes les données sont protégées par les règles RLS
   (voir sql/cupidon-auth.sql). Ne JAMAIS mettre de clé service_role ici. */
const SB_URL = 'https://vincxrmtfjbenlzhjwby.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpbmN4cm10ZmpiZW5semhqd2J5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyOTI1MTksImV4cCI6MjA5Nzg2ODUxOX0.M9_ChGDlOIUKKZtbBHs1xn4cdy4FwUAQKN0aYyXefQY';

/* « Se souvenir de moi » : si coché (par défaut), la session est gardée
   dans localStorage (persistante). Sinon sessionStorage : elle disparaît
   à la fermeture du navigateur. Le mot de passe, lui, n'est JAMAIS stocké. */
function cupidonRemember() { return localStorage.getItem('cupidon_remember') !== 'non'; }
const cupidonStorage = {
  getItem: (k) => localStorage.getItem(k) ?? sessionStorage.getItem(k),
  setItem: (k, v) => { (cupidonRemember() ? localStorage : sessionStorage).setItem(k, v); },
  removeItem: (k) => { localStorage.removeItem(k); sessionStorage.removeItem(k); }
};

const sb = supabase.createClient(SB_URL, SB_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,        // nécessaire pour les liens e-mail (confirmation, reset)
    flowType: 'pkce',
    storage: cupidonStorage,
    storageKey: 'cupidon-auth'       // séparé de Pull Up Hub
  }
});

/* URL de base de l'appli (fonctionne en local et en ligne) */
const APP_BASE = location.origin + location.pathname.replace(/[^/]*$/, '');

/* ───────── Centres d'intérêt ─────────
   Pour ajouter un hobby : ajouter simplement une ligne ici. */
const INTERETS = [
  { id: 'randonnee',      label: 'Randonnée',       emoji: '🥾' },
  { id: 'plage',          label: 'Plage',            emoji: '🏖️' },
  { id: 'voyage',         label: 'Voyage',           emoji: '✈️' },
  { id: 'cuisine',        label: 'Cuisine',          emoji: '👨‍🍳' },
  { id: 'cinema',         label: 'Cinéma',           emoji: '🎬' },
  { id: 'musique',        label: 'Musique',          emoji: '🎵' },
  { id: 'danse',          label: 'Danse',            emoji: '💃' },
  { id: 'sport',          label: 'Sport',            emoji: '🏋️' },
  { id: 'gaming',         label: 'Gaming',           emoji: '🎮' },
  { id: 'lecture',        label: 'Lecture',          emoji: '📚' },
  { id: 'animaux',        label: 'Animaux',          emoji: '🐶' },
  { id: 'moto',           label: 'Moto',             emoji: '🏍️' },
  { id: 'voiture',        label: 'Voiture',          emoji: '🚗' },
  { id: 'nature',         label: 'Nature',           emoji: '🌿' },
  { id: 'restaurants',    label: 'Restaurants',      emoji: '🍽️' },
  { id: 'soirees',        label: 'Soirées',          emoji: '🎉' },
  { id: 'camping',        label: 'Camping',          emoji: '⛺' },
  { id: 'photographie',   label: 'Photographie',     emoji: '📸' },
  { id: 'dessin',         label: 'Dessin',           emoji: '🎨' },
  { id: 'benevolat',      label: 'Bénévolat',        emoji: '🤝' },
  { id: 'entrepreneuriat',label: 'Entrepreneuriat',  emoji: '🚀' }
];

/* ───────── Profils types ───────── */
const PROFILS_TYPES = {
  aventurier: { label: 'Aventurier', emoji: '🌋', phrase: "toujours partant·e pour explorer et vivre de nouvelles expériences" },
  romantique: { label: 'Romantique', emoji: '💘', phrase: "attaché·e aux vraies histoires et aux petites attentions" },
  epicurien:  { label: 'Épicurien',  emoji: '🍽️', phrase: "amoureux·se des bons moments, des saveurs et de la convivialité" },
  sportif:    { label: 'Sportif',    emoji: '🏃', phrase: "toujours en mouvement, l'énergie avant tout" },
  artiste:    { label: 'Artiste',    emoji: '🎭', phrase: "sensible à la beauté des choses, la tête pleine d'idées" },
  geek:       { label: 'Geek',       emoji: '🎮', phrase: "passionné·e d'univers, de jeux et de découvertes numériques" },
  voyageur:   { label: 'Voyageur',   emoji: '✈️', phrase: "curieux·se du monde, valise jamais bien loin" },
  fetard:     { label: 'Fêtard',     emoji: '🎉', phrase: "l'ambiance, la musique et les rires avant tout" },
  calme:      { label: 'Calme',      emoji: '🌿', phrase: "bien dans ses baskets, adepte des moments simples et vrais" },
  ambitieux:  { label: 'Ambitieux',  emoji: '🚀', phrase: "des projets plein la tête et l'envie d'avancer" },
  creatif:    { label: 'Créatif',    emoji: '✨', phrase: "imagination débordante et envie de créer au quotidien" },
  nature:     { label: 'Nature',     emoji: '🌱', phrase: "ressourcé·e par les grands espaces et le grand air" }
};

/* Points attribués par centre d'intérêt (modifiable facilement) */
const POINTS_INTERETS = {
  randonnee:      { aventurier: 2, nature: 2, sportif: 1 },
  plage:          { nature: 1, calme: 1, epicurien: 1 },
  voyage:         { voyageur: 3, aventurier: 1 },
  cuisine:        { epicurien: 2, creatif: 1 },
  cinema:         { artiste: 1, calme: 1 },
  musique:        { artiste: 2, fetard: 1 },
  danse:          { fetard: 2, artiste: 1, sportif: 1 },
  sport:          { sportif: 3 },
  gaming:         { geek: 3, calme: 1 },
  lecture:        { calme: 2, artiste: 1 },
  animaux:        { nature: 2, calme: 1 },
  moto:           { aventurier: 2 },
  voiture:        { aventurier: 1, geek: 1 },
  nature:         { nature: 3, calme: 1 },
  restaurants:    { epicurien: 2, fetard: 1 },
  soirees:        { fetard: 3 },
  camping:        { nature: 2, aventurier: 2 },
  photographie:   { creatif: 2, artiste: 1, voyageur: 1 },
  dessin:         { artiste: 2, creatif: 2 },
  benevolat:      { calme: 1, romantique: 1 },
  entrepreneuriat:{ ambitieux: 3, creatif: 1 }
};

/* ───────── Calcul automatique du profil ───────── */
function calculerProfil(rep) {
  const score = {};
  Object.keys(PROFILS_TYPES).forEach(k => score[k] = 0);
  const ajouter = (pts) => { for (const k in pts) score[k] += pts[k]; };

  (rep.interets || []).forEach(id => { if (POINTS_INTERETS[id]) ajouter(POINTS_INTERETS[id]); });

  if (rep.personnalite === 'maison') ajouter({ calme: 2, geek: 1 });
  if (rep.personnalite === 'mixte')  ajouter({ epicurien: 1, calme: 1 });
  if (rep.personnalite === 'sortir') ajouter({ aventurier: 2, fetard: 1 });

  if (rep.premier_rdv === 'rapide')   ajouter({ aventurier: 1, fetard: 1 });
  if (rep.premier_rdv === 'semaines') ajouter({ romantique: 2, calme: 1 });

  if ((rep.recherche || []).includes('serieuse')) ajouter({ romantique: 2 });
  if ((rep.recherche || []).includes('amicale'))  ajouter({ fetard: 1, epicurien: 1 });
  if ((rep.recherche || []).includes('hasard'))   ajouter({ aventurier: 1 });

  /* départage stable si égalité */
  const ordre = ['aventurier','romantique','epicurien','sportif','nature','voyageur','fetard','geek','artiste','creatif','ambitieux','calme'];
  let meilleur = ordre[0];
  for (const k of ordre) if (score[k] > score[meilleur]) meilleur = k;
  return meilleur;
}

/* ───────── Description automatique ───────── */
function genererDescription(rep) {
  const type = PROFILS_TYPES[rep.profil_type] || PROFILS_TYPES.calme;
  const situations = {
    resident: "Je vis à La Réunion",
    vacances: "Actuellement en vacances à La Réunion",
    bientot:  "J'arrive bientôt à La Réunion"
  };
  const weekends = {
    maison: "le week-end, j'aime surtout les moments cocooning",
    mixte:  "le week-end, j'alterne entre sorties et moments tranquilles",
    sortir: "le week-end, il me faut bouger, sortir, découvrir"
  };
  const recherches = [];
  if ((rep.recherche || []).includes('serieuse')) recherches.push("une belle histoire sérieuse");
  if ((rep.recherche || []).includes('amicale'))  recherches.push("de nouvelles amitiés");
  if ((rep.recherche || []).includes('hasard'))   recherches.push("ce que le hasard voudra bien m'offrir");
  const rechercheTxt = recherches.length ? "Ici pour " + recherches.join(" et ") + "." : "";

  const passions = (rep.interets || []).slice(0, 4)
    .map(id => { const i = INTERETS.find(x => x.id === id); return i ? i.label.toLowerCase() : null; })
    .filter(Boolean);

  return `${type.label} dans l'âme, ${type.phrase}. ${situations[rep.situation] || ''}${rep.ville ? ', côté ' + rep.ville : ''} — et ${weekends[rep.personnalite] || ''}. ${rechercheTxt}${passions.length ? ' Mes passions : ' + passions.join(', ') + '.' : ''}`.replace(/\s+/g, ' ').trim();
}

/* ───────── Validation du mot de passe ───────── */
const REGLES_MDP = [
  { id: 'longueur',  label: '8 caractères minimum',      test: (v) => v.length >= 8 },
  { id: 'majuscule', label: 'Une lettre majuscule',       test: (v) => /[A-ZÀ-Ý]/.test(v) },
  { id: 'minuscule', label: 'Une lettre minuscule',       test: (v) => /[a-zà-ÿ]/.test(v) },
  { id: 'chiffre',   label: 'Un chiffre',                 test: (v) => /\d/.test(v) },
  { id: 'special',   label: 'Un caractère spécial (!@#…)',test: (v) => /[^A-Za-z0-9À-ÿ]/.test(v) }
];
function motDePasseValide(v) { return REGLES_MDP.every(r => r.test(v)); }

/* ───────── Helpers communs ───────── */
function toast(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 3200);
}

function calculerAge(dateNaissance) {
  const d = new Date(dateNaissance), now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

/* Session obligatoire : renvoie l'utilisateur ou redirige vers la connexion.
   Mode aperçu (?apercu) : permet de VOIR le questionnaire sans compte —
   rien ne peut être enregistré (les règles RLS côté serveur l'empêchent). */
async function exigerSession() {
  if (new URLSearchParams(location.search).has('apercu')) {
    return { id: 'apercu', email: 'apercu@exemple.re', user_metadata: { prenom: 'Aperçu' } };
  }
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { location.href = 'connexion.html'; return null; }
  return session.user;
}

/* Récupère le profil Cupidon de l'utilisateur connecté (ou null) */
async function chargerProfil(userId) {
  const { data, error } = await sb.from('profils_cupidon').select('*').eq('user_id', userId).maybeSingle();
  if (error) { console.warn('profil:', error.message); return null; }
  return data;
}

/* Journalise une connexion (best effort, n'échoue jamais côté interface) */
async function journaliserConnexion(userId) {
  try {
    await sb.from('journal_connexions_cupidon').insert({
      user_id: userId,
      appareil: navigator.userAgent.slice(0, 250)
    });
  } catch (e) { /* silencieux */ }
}

/* Appel de la fonction d'envoi d'e-mails (bienvenue, notif admin).
   Best effort : si la fonction n'est pas encore déployée, on n'affiche
   aucune erreur à l'utilisateur. */
async function envoyerMailCupidon(action, donnees) {
  try {
    const { data: { session } } = await sb.auth.getSession();
    const res = await fetch(SB_URL + '/functions/v1/cupidon-mails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SB_KEY,
        'Authorization': 'Bearer ' + (session ? session.access_token : SB_KEY)
      },
      body: JSON.stringify({ action, ...donnees })
    });
    return res.ok;
  } catch (e) { return false; }
}

/* =====================================================================
   CUPIDON RENCONTRES — Moteur de données réelles
   Remplace les profils fictifs et les conversations simulées du
   prototype. Tout passe désormais par Supabase, avec des règles de
   sécurité côté serveur (voir sql/cupidon-rencontres.sql) :
   - on ne voit que les profils actifs des autres membres ;
   - on ne peut écrire qu'à une personne avec qui on a matché ;
   - personne ne peut lire les messages d'autrui, même en trafiquant
     l'application depuis son navigateur.
   ===================================================================== */

'use strict';

/* Membre connecté : { id, profil } — renseigné au démarrage. */
let MOI = null;

/* ───────── Habillage des cartes ─────────
   Les profils n'ont pas de couleur en base : on en dérive une, toujours
   la même pour une personne donnée, à partir de son identifiant. */
const DEGRADES = [
  'linear-gradient(160deg,#F0699B,#B0336B)',
  'linear-gradient(160deg,#3B7BD4,#153E8A)',
  'linear-gradient(160deg,#9A6BD4,#5B2E9E)',
  'linear-gradient(160deg,#2FA37A,#14614A)',
  'linear-gradient(160deg,#F2A03D,#C55A11)',
  'linear-gradient(160deg,#E14848,#8F1616)',
  'linear-gradient(160deg,#43B8C9,#1A6E7E)',
  'linear-gradient(160deg,#6B7ED9,#2C3E8F)'
];

function degradePour(id) {
  let somme = 0;
  for (let i = 0; i < id.length; i++) somme += id.charCodeAt(i);
  return DEGRADES[somme % DEGRADES.length];
}

/* Transforme une ligne de profils_cupidon en carte affichable. */
function versCarte(p) {
  const type = (typeof PROFILS_TYPES !== 'undefined' && PROFILS_TYPES[p.profil_type]) || null;
  const tags = (p.interets || []).slice(0, 3).map(id => {
    const i = (typeof INTERETS !== 'undefined') ? INTERETS.find(x => x.id === id) : null;
    return i ? i.label : id;
  });
  return {
    id: p.user_id,
    n:  p.prenom || 'Membre',
    a:  p.date_naissance ? calculerAge(p.date_naissance) : '',
    v:  p.ville || 'La Réunion',
    e:  type ? type.emoji : '💛',
    g:  degradePour(p.user_id),
    t:  tags,
    b:  p.description || '',
    avatar: p.avatar || null,
    photos: p.photos || []
  };
}

/* ───────── Profils à découvrir ─────────
   Les autres membres actifs, moins ceux que j'ai déjà vus ou bloqués. */
async function chargerProfilsADecouvrir() {
  if (!MOI) return [];

  const [vus, bloques] = await Promise.all([
    sb.from('likes_cupidon').select('cible_id').eq('auteur_id', MOI.id),
    sb.from('blocages_cupidon').select('cible_id').eq('auteur_id', MOI.id)
  ]);

  const exclus = new Set([MOI.id]);
  (vus.data    || []).forEach(l => exclus.add(l.cible_id));
  (bloques.data || []).forEach(b => exclus.add(b.cible_id));

  const { data, error } = await sb
    .from('profils_cupidon')
    .select('*')
    .eq('statut', 'actif')
    .order('cree_le', { ascending: false })
    .limit(100);

  if (error) { console.warn('profils:', error.message); return []; }
  return (data || []).filter(p => !exclus.has(p.user_id)).map(versCarte);
}

/* ───────── J'aime / je passe ─────────
   Renvoie true si la décision crée un match (l'autre m'avait déjà aimé). */
async function enregistrerDecision(cibleId, decision) {
  if (!MOI) return false;

  const { error } = await sb.from('likes_cupidon')
    .upsert({ auteur_id: MOI.id, cible_id: cibleId, decision },
            { onConflict: 'auteur_id,cible_id' });
  if (error) { console.warn('decision:', error.message); return false; }

  if (decision === 'passe') return false;

  /* Match si la personne m'avait déjà aimé de son côté. */
  const { data } = await sb.from('likes_cupidon')
    .select('decision')
    .eq('auteur_id', cibleId)
    .eq('cible_id', MOI.id)
    .maybeSingle();

  return !!data && (data.decision === 'aime' || data.decision === 'superlike');
}

/* ───────── Mes matchs ───────── */
async function chargerMatchs() {
  if (!MOI) return [];

  const { data, error } = await sb.from('matchs_cupidon')
    .select('autre_id, depuis_le')
    .eq('user_id', MOI.id)
    .order('depuis_le', { ascending: false });

  if (error || !data || !data.length) {
    if (error) console.warn('matchs:', error.message);
    return [];
  }

  const ids = data.map(m => m.autre_id);
  const { data: profils } = await sb.from('profils_cupidon')
    .select('*').in('user_id', ids).eq('statut', 'actif');

  /* On garde l'ordre des matchs les plus récents. */
  const parId = {};
  (profils || []).forEach(p => { parId[p.user_id] = versCarte(p); });
  return ids.map(id => parId[id]).filter(Boolean);
}

/* ───────── Messages privés ───────── */
async function chargerMessages(autreId) {
  if (!MOI) return [];

  const { data, error } = await sb.from('messages_cupidon')
    .select('id, expediteur_id, texte, cree_le')
    .or(`and(expediteur_id.eq.${MOI.id},destinataire_id.eq.${autreId}),` +
        `and(expediteur_id.eq.${autreId},destinataire_id.eq.${MOI.id})`)
    .order('cree_le', { ascending: true })
    .limit(500);

  if (error) { console.warn('messages:', error.message); return []; }

  /* Les messages reçus sont marqués comme lus. */
  const aMarquer = (data || []).filter(m => m.expediteur_id === autreId).map(m => m.id);
  if (aMarquer.length) {
    sb.from('messages_cupidon').update({ lu: true }).in('id', aMarquer).then(() => {}, () => {});
  }

  return (data || []).map(m => ({ me: m.expediteur_id === MOI.id, t: m.texte, le: m.cree_le }));
}

async function envoyerMessage(autreId, texte) {
  if (!MOI) return false;
  const { error } = await sb.from('messages_cupidon')
    .insert({ expediteur_id: MOI.id, destinataire_id: autreId, texte: texte });
  if (error) {
    console.warn('envoi:', error.message);
    return false;
  }
  return true;
}

/* Nombre de messages non lus, par expéditeur. */
async function compterNonLus() {
  if (!MOI) return {};
  const { data } = await sb.from('messages_cupidon')
    .select('expediteur_id')
    .eq('destinataire_id', MOI.id)
    .eq('lu', false);
  const parPersonne = {};
  (data || []).forEach(m => { parPersonne[m.expediteur_id] = (parPersonne[m.expediteur_id] || 0) + 1; });
  return parPersonne;
}

/* ───────── Salons de discussion ───────── */
async function chargerMessagesSalon(salon) {
  const { data, error } = await sb.from('messages_salon_cupidon')
    .select('id, auteur_id, texte, cree_le')
    .eq('salon', salon)
    .order('cree_le', { ascending: false })
    .limit(80);

  if (error) { console.warn('salon:', error.message); return []; }
  const messages = (data || []).slice().reverse();
  if (!messages.length) return [];

  /* Prénoms des auteurs */
  const ids = [...new Set(messages.map(m => m.auteur_id))];
  const { data: profils } = await sb.from('profils_cupidon')
    .select('user_id, prenom, date_naissance').in('user_id', ids);

  const parId = {};
  (profils || []).forEach(p => { parId[p.user_id] = p; });

  return messages.map(m => {
    const p = parId[m.auteur_id];
    return {
      id: m.auteur_id,
      a: (m.auteur_id === (MOI && MOI.id)) ? 'Moi' : (p ? p.prenom : 'Membre'),
      age: p && p.date_naissance ? calculerAge(p.date_naissance) : '',
      t: m.texte
    };
  });
}

async function envoyerMessageSalon(salon, texte) {
  if (!MOI) return false;
  const { error } = await sb.from('messages_salon_cupidon')
    .insert({ salon: salon, auteur_id: MOI.id, texte: texte });
  if (error) { console.warn('salon envoi:', error.message); return false; }
  return true;
}

/* Nombre de membres actifs — chiffre réel, jamais inventé. */
async function compterMembres() {
  const { count, error } = await sb.from('profils_cupidon')
    .select('user_id', { count: 'exact', head: true })
    .eq('statut', 'actif');
  return error ? null : (count || 0);
}

/* ───────── Blocage et signalement ───────── */
async function bloquerMembre(cibleId) {
  if (!MOI) return false;
  const { error } = await sb.from('blocages_cupidon')
    .upsert({ auteur_id: MOI.id, cible_id: cibleId }, { onConflict: 'auteur_id,cible_id' });
  return !error;
}

async function signalerMembre(cibleId, motif, details) {
  if (!MOI) return false;
  const { error } = await sb.from('signalements_cupidon')
    .insert({ auteur_id: MOI.id, cible_id: cibleId || null, motif: motif, details: details || null });
  return !error;
}

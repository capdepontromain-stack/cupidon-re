/* =====================================================================
   CUPIDON.RE — Alerte visites & ouvertures de l'appli
   ---------------------------------------------------------------------
   But : Romain est prévenu par e-mail quand quelqu'un vient sur le site
   et quand quelqu'un ouvre l'application, même si l'appli n'est pas
   encore finie.

   Ce qui est mesuré : la page visitée, la provenance (Google, Facebook,
   lien direct…), le type d'appareil et l'heure de La Réunion.
   Ce qui n'est JAMAIS collecté : ni nom, ni e-mail, ni adresse IP, ni
   position. Un petit identifiant tiré au hasard est gardé dans le
   navigateur du visiteur, uniquement pour ne pas envoyer 20 fois le
   même e-mail à la même personne.

   Deux destinations, toutes les deux « best effort » (si l'une échoue,
   le site continue de fonctionner normalement) :
     1. la table Supabase « visites_cupidon » (l'historique complet,
        consultable dans Table Editor — voir sql/visites-cupidon.sql) ;
     2. un e-mail à contact@pullup.re via FormSubmit.

   Mode test : ajouter ?testnotif à l'URL → rien n'est envoyé, tout est
   affiché dans la console du navigateur.
   ===================================================================== */

(function () {
  'use strict';

  /* Canaux d'envoi, essayés dans l'ordre. Le premier est la clé anonyme
     fournie par FormSubmit : elle évite d'écrire l'adresse contact@pullup.re
     en clair dans le code de la page (donc à l'abri des robots à spam).
     Le second sert de secours si la clé ne répond pas. */
  var CANAUX_MAIL = [
    'https://formsubmit.co/ajax/a25833b0726786def63fa51e651d059a',
    'https://formsubmit.co/ajax/contact@pullup.re'
  ];

  var SB_URL = 'https://vincxrmtfjbenlzhjwby.supabase.co';
  var SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpbmN4cm10ZmpiZW5semhqd2J5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyOTI1MTksImV4cCI6MjA5Nzg2ODUxOX0.M9_ChGDlOIUKKZtbBHs1xn4cdy4FwUAQKN0aYyXefQY';

  /* Fréquence maximale des e-mails, par visiteur (en minutes) */
  var DELAI_VISITE = 12 * 60;   // une visite du site : 1 e-mail toutes les 12 h
  var DELAI_APPLI  = 60;        // ouverture de l'appli : 1 e-mail par heure

  var TEST = location.search.indexOf('testnotif') !== -1;

  /* ───────── Petits utilitaires ───────── */

  function memoire(cle, valeur) {
    try {
      if (valeur === undefined) return localStorage.getItem(cle);
      localStorage.setItem(cle, valeur);
    } catch (e) { /* navigation privée : on continue sans mémoire */ }
    return null;
  }

  function visiteur() {
    var v = memoire('cupidon_visiteur');
    if (!v) { v = Math.random().toString(36).slice(2, 10); memoire('cupidon_visiteur', v); }
    return v;
  }

  /* Vrai si le délai est écoulé depuis le dernier envoi (et note l'envoi) */
  function autorise(cle, minutes) {
    var dernier = parseInt(memoire(cle) || '0', 10);
    if (dernier && (Date.now() - dernier) < minutes * 60000) return false;
    memoire(cle, String(Date.now()));
    return true;
  }

  function heureReunion() {
    try {
      return new Intl.DateTimeFormat('fr-FR', {
        timeZone: 'Indian/Reunion', dateStyle: 'full', timeStyle: 'short'
      }).format(new Date()) + ' (heure de La Réunion)';
    } catch (e) { return new Date().toString(); }
  }

  function provenance() {
    var r = document.referrer;
    if (!r) return 'Arrivée directe (lien enregistré, favori, adresse tapée, réseau social ou message privé)';
    try {
      var h = new URL(r).hostname.replace(/^www\./, '');
      if (h === location.hostname) return 'Navigation à l\'intérieur du site';
      if (/google/.test(h))    return 'Recherche Google';
      if (/bing|duckduck|yahoo|ecosia|qwant/.test(h)) return 'Moteur de recherche (' + h + ')';
      if (/facebook|fb\./.test(h)) return 'Facebook';
      if (/instagram/.test(h)) return 'Instagram';
      if (/tiktok/.test(h))    return 'TikTok';
      if (/linkedin|lnkd/.test(h)) return 'LinkedIn';
      if (/youtube|youtu\.be/.test(h)) return 'YouTube';
      if (/whatsapp|wa\.me/.test(h)) return 'WhatsApp';
      if (/pullup|teambuilding974|hotesse-reunion|arbredenoel974|animationenfant974|seminaire974/.test(h))
        return 'Un site Pull Up (' + h + ')';
      return h;
    } catch (e) { return 'Provenance inconnue'; }
  }

  function appareil() {
    var ua = navigator.userAgent;
    var type = /iPad|Tablet/i.test(ua) ? 'Tablette'
             : /Mobi|Android|iPhone/i.test(ua) ? 'Téléphone' : 'Ordinateur';
    var nav = /Edg\//.test(ua) ? 'Edge'
            : /OPR\//.test(ua) ? 'Opera'
            : /Chrome\//.test(ua) ? 'Chrome'
            : /Safari\//.test(ua) ? 'Safari'
            : /Firefox\//.test(ua) ? 'Firefox' : 'autre navigateur';
    var systeme = /iPhone|iPad|iOS/i.test(ua) ? 'iPhone/iPad'
                : /Android/i.test(ua) ? 'Android'
                : /Mac OS/i.test(ua) ? 'Mac'
                : /Windows/i.test(ua) ? 'Windows' : '';
    return type + ' · ' + nav + (systeme ? ' · ' + systeme : '');
  }

  function pageLisible() {
    var p = location.pathname;
    if (/\/app\//.test(p)) return 'L\'APPLICATION (cupidon.re/app)';
    if (p === '/' || /index\.html$/.test(p)) return 'Page d\'accueil de cupidon.re';
    if (/\/blog\//.test(p)) return 'Blog : ' + p.split('/').pop().replace('.html', '');
    if (/test\.html$/.test(p)) return 'Le test Cupidon';
    return p;
  }

  /* ───────── Enregistrement dans Supabase (historique complet) ───────── */
  function enregistrer(evenement) {
    var corps = JSON.stringify({
      evenement: evenement,
      page: location.pathname,
      provenance: provenance(),
      appareil: appareil(),
      visiteur: visiteur()
    });
    if (TEST) { console.log('[notif-visites] TEST — Supabase :', corps); return; }
    try {
      fetch(SB_URL + '/rest/v1/visites_cupidon', {
        method: 'POST', keepalive: true,
        headers: { 'Content-Type': 'application/json', 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY, 'Prefer': 'return=minimal' },
        body: corps
      }).catch(function () {});
    } catch (e) { /* silencieux */ }
  }

  /* ───────── E-mail à Romain ───────── */
  function prevenir(sujet, complement) {
    var donnees = {
      _subject: sujet,
      _template: 'table',
      '1_Quoi': complement,
      '2_Page': pageLisible(),
      '3_Provenance': provenance(),
      '4_Appareil': appareil(),
      '5_Quand': heureReunion(),
      '6_Adresse_complete': location.href,
      '7_Info': 'Aucune donnée personnelle n\'est collectée (ni nom, ni e-mail, ni adresse IP). Visiteur anonyme n°' + visiteur() + '.'
    };
    if (TEST) { console.log('[notif-visites] TEST — e-mail :', sujet, donnees); return; }
    envoyer(0, JSON.stringify(donnees));
  }

  /* Essaie les canaux l'un après l'autre, sans jamais envoyer deux fois */
  function envoyer(i, corps) {
    if (i >= CANAUX_MAIL.length) return;
    try {
      fetch(CANAUX_MAIL[i], {
        method: 'POST', keepalive: true,
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: corps
      }).then(function (res) {
        if (res.ok) return res.json().catch(function () { return { success: 'true' }; });
        return { success: 'false' };
      }).then(function (rep) {
        if (rep && String(rep.success) === 'false') envoyer(i + 1, corps);
      }).catch(function () { envoyer(i + 1, corps); });
    } catch (e) { /* silencieux */ }
  }

  /* ───────── 1. Toute visite de page ───────── */
  var surAppli = /\/app\//.test(location.pathname);

  enregistrer(surAppli ? 'ouverture_appli' : 'visite');

  if (surAppli) {
    /* Quelqu'un est dans l'appli. Si le clic vient d'être signalé depuis
       l'accueil (il y a moins de 3 minutes), on n'envoie pas deux fois. */
    var dejaSignale = parseInt(memoire('cupidon_clic_appli_signale') || '0', 10);
    if (!(dejaSignale && Date.now() - dejaSignale < 3 * 60000) && autorise('cupidon_notif_appli', DELAI_APPLI)) {
      prevenir('🔥 Quelqu\'un vient d\'ouvrir l\'appli Cupidon !',
               'Une personne est en train d\'utiliser l\'application de rencontre.');
    }
  } else if (autorise('cupidon_notif_visite', DELAI_VISITE)) {
    prevenir('👀 Une visite sur cupidon.re à l\'instant',
             'Quelqu\'un vient d\'arriver sur le site cupidon.re.');
  }

  /* ───────── 2. Clic sur un lien vers l'application ───────── */
  document.addEventListener('click', function (ev) {
    var lien = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
    if (!lien) return;
    var href = lien.getAttribute('href') || '';
    if (!/(^|\/)app\/?($|[?#])/.test(href)) return;      // uniquement les liens vers l'appli

    enregistrer('clic_appli');
    if (autorise('cupidon_notif_appli', DELAI_APPLI)) {
      memoire('cupidon_clic_appli_signale', String(Date.now()));
      prevenir('🔥 Quelqu\'un vient de cliquer sur l\'application Cupidon !',
               'Une personne a cliqué sur « Ouvrir l\'application » depuis le site. Elle arrive sur l\'appli.');
    }
  }, true);
})();

/* ═══════════════════════════════════════════════════════════════
   SUIVI D'AUDIENCE — Google Analytics 4 + bandeau cookies
   Une seule chose à remplir : l'identifiant ci-dessous, entre les
   guillemets, au format "G-" suivi de 10 lettres/chiffres.
   Où le trouver : analytics.google.com > Admin > Flux de données.
   Tant qu'il est vide, RIEN n'est chargé et AUCUN cookie n'est posé.
   Avec l'identifiant : un bandeau propose Accepter / Continuer sans
   accepter ; Google n'est chargé qu'après un « Accepter ». Le choix
   du visiteur (oui ou non) est retenu 6 mois.
   Ce fichier est appelé par toutes les pages du site.
   ═══════════════════════════════════════════════════════════════ */
var ID_GA4 = "G-ZSKGKZVN57";

var SITE_PULLUP = "cupidon";

(function () {
  if (!ID_GA4) return;                    /* pas configuré : on ne charge rien */

  var CLE = 'pu_consent';
  var SIX_MOIS = 6 * 30 * 24 * 3600 * 1000;

  function lireChoix() {
    try {
      var d = JSON.parse(localStorage.getItem(CLE) || 'null');
      if (d && d.date && (Date.now() - d.date) < SIX_MOIS) return d.choix;
    } catch (e) {}
    return null;
  }

  function retenir(choix) {
    try { localStorage.setItem(CLE, JSON.stringify({ choix: choix, date: Date.now() })); } catch (e) {}
  }

  /* Charge Google Analytics — appelé UNIQUEMENT après consentement */
  function charger() {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { dataLayer.push(arguments); };
    gtag('js', new Date());

    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + ID_GA4;
    document.head.appendChild(s);

    gtag('config', ID_GA4, { site_pullup: SITE_PULLUP });

    /* Ce qui compte vraiment : les gestes qui mènent à un client */
    document.addEventListener('click', function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a') : null;
      if (!a) return;
      var h = (a.getAttribute('href') || '').toLowerCase();
      if (h.indexOf('tel:') === 0) {
        gtag('event', 'clic_telephone', { site_pullup: SITE_PULLUP });
      } else if (h.indexOf('wa.me') > -1 || h.indexOf('whatsapp') > -1) {
        gtag('event', 'clic_whatsapp', { site_pullup: SITE_PULLUP });
      } else if (h.indexOf('mailto:') === 0) {
        gtag('event', 'clic_email', { site_pullup: SITE_PULLUP });
      }
    });

    document.addEventListener('submit', function () {
      gtag('event', 'demande_devis', { site_pullup: SITE_PULLUP });
    });
  }

  /* Petit bandeau discret en bas de l'écran */
  function bandeau() {
    if (document.getElementById('pu-cookies')) return;

    var st = document.createElement('style');
    st.textContent =
      '#pu-cookies{position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483000;' +
      'max-width:540px;margin:0 auto;background:#14141d;color:#fff;padding:16px 18px;' +
      'border-radius:14px;box-shadow:0 8px 30px rgba(0,0,0,.35);' +
      'font:14px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}' +
      '#pu-cookies p{margin:0 0 12px;color:#fff}' +
      '#pu-cookies .pu-ck-btns{display:flex;gap:10px;flex-wrap:wrap}' +
      '#pu-cookies button{cursor:pointer;border:0;border-radius:9px;padding:10px 16px;' +
      'font:600 14px system-ui,-apple-system,Segoe UI,sans-serif;flex:1 1 auto}' +
      '#pu-ck-oui{background:#f5c04e;color:#14141d}' +
      '#pu-ck-non{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.45)}';
    document.head.appendChild(st);

    var b = document.createElement('div');
    b.id = 'pu-cookies';
    b.setAttribute('role', 'dialog');
    b.setAttribute('aria-label', 'Cookies');
    b.innerHTML =
      '<p>🍪 Ce site mesure sa fréquentation avec Google Analytics (cookies), ' +
      'uniquement pour savoir quelles pages vous intéressent.</p>' +
      '<div class="pu-ck-btns">' +
      '<button id="pu-ck-oui" type="button">Accepter</button>' +
      '<button id="pu-ck-non" type="button">Continuer sans accepter</button>' +
      '</div>';
    document.body.appendChild(b);

    document.getElementById('pu-ck-oui').addEventListener('click', function () {
      retenir('oui'); b.remove(); charger();
    });
    document.getElementById('pu-ck-non').addEventListener('click', function () {
      retenir('non'); b.remove();
    });
  }

  var choix = lireChoix();
  if (choix === 'oui') {
    charger();
  } else if (choix !== 'non') {
    if (document.body) bandeau();
    else document.addEventListener('DOMContentLoaded', bandeau);
  }
})();

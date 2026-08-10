/* ═══════════════════════════════════════════════════════════════
   SUIVI D'AUDIENCE — Google Analytics 4
   Une seule chose à remplir : l'identifiant ci-dessous, entre les
   guillemets, au format "G-XXXXXXXXXX".
   Où le trouver : analytics.google.com > Admin > Flux de données.
   Tant qu'il est vide, RIEN n'est chargé et AUCUN cookie n'est posé.
   Ce fichier est appelé par toutes les pages du site.
   ═══════════════════════════════════════════════════════════════ */
var ID_GA4 = "";

var SITE_PULLUP = "cupidon";

(function () {
  if (!ID_GA4) return;                    /* pas configuré : on ne charge rien */

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
})();

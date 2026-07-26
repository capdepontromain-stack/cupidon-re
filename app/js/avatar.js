/* =====================================================================
   CUPIDON RENCONTRES — Générateur d'avatar
   Buste stylisé moderne (dégradés doux, style cartoon élégant).
   La configuration est un simple objet JSON stocké dans le profil ;
   renderAvatar(cfg) renvoie le code SVG correspondant.
   ===================================================================== */

'use strict';

/* ───────── Options proposées dans l'éditeur ───────── */
const AVATAR_OPTIONS = {
  peau: { label: 'Couleur de peau', type: 'couleur', valeurs: [
    { id: 'claire',   hex: '#FFDFC4' }, { id: 'doree',    hex: '#F1C27D' },
    { id: 'halee',    hex: '#E0AC69' }, { id: 'mate',     hex: '#C68642' },
    { id: 'brune',    hex: '#8D5524' }, { id: 'ebene',    hex: '#5C3A21' }
  ]},
  cheveuxCouleur: { label: 'Couleur des cheveux', type: 'couleur', valeurs: [
    { id: 'noir',    hex: '#23201F' }, { id: 'brun',     hex: '#4A3120' },
    { id: 'chatain', hex: '#6E4B2A' }, { id: 'blond',    hex: '#D9A65A' },
    { id: 'roux',    hex: '#B4551D' }, { id: 'gris',     hex: '#9A9A9A' },
    { id: 'blanc',   hex: '#E8E4DC' }, { id: 'coloree',  hex: '#8A4FBE' }
  ]},
  coiffure: { label: 'Coupe de cheveux', type: 'choix', valeurs: [
    { id: 'rase',    label: 'Rasé' },      { id: 'court',   label: 'Court' },
    { id: 'meche',   label: 'Mèche' },     { id: 'boucle',  label: 'Bouclé' },
    { id: 'afro',    label: 'Afro' },      { id: 'milong',  label: 'Mi-long' },
    { id: 'long',    label: 'Long' },      { id: 'chignon', label: 'Chignon' },
    { id: 'queue',   label: 'Queue' },     { id: 'tresses', label: 'Tresses' },
    { id: 'chauve',  label: 'Sans cheveux' }
  ]},
  barbe: { label: 'Barbe', type: 'choix', valeurs: [
    { id: 'aucune', label: 'Aucune' },       { id: 'trois',    label: '3 jours' },
    { id: 'bouc',   label: 'Bouc' },          { id: 'courte',   label: 'Courte' },
    { id: 'pleine', label: 'Complète' }
  ]},
  moustache: { label: 'Moustache', type: 'choix', valeurs: [
    { id: 'aucune', label: 'Aucune' }, { id: 'fine', label: 'Fine' }, { id: 'epaisse', label: 'Épaisse' }
  ]},
  yeux: { label: 'Couleur des yeux', type: 'couleur', valeurs: [
    { id: 'marron',  hex: '#5B3A1E' }, { id: 'noisette', hex: '#8A6230' },
    { id: 'vert',    hex: '#3E7C4F' }, { id: 'bleu',     hex: '#3B6FA8' },
    { id: 'gris',    hex: '#7C8794' }, { id: 'noir',     hex: '#2A2320' }
  ]},
  lunettes: { label: 'Lunettes', type: 'choix', valeurs: [
    { id: 'aucune', label: 'Aucune' },  { id: 'rondes', label: 'Rondes' },
    { id: 'rect',   label: 'Carrées' }, { id: 'soleil', label: 'Soleil' }
  ]},
  taille: { label: 'Taille', type: 'choix', valeurs: [
    { id: 'petite', label: 'Petite' }, { id: 'moyenne', label: 'Moyenne' }, { id: 'grande', label: 'Grande' }
  ]},
  corpulence: { label: 'Corpulence', type: 'choix', valeurs: [
    { id: 'mince', label: 'Mince' }, { id: 'moyenne', label: 'Moyenne' }, { id: 'ronde', label: 'Ronde' }
  ]},
  silhouette: { label: 'Silhouette', type: 'choix', valeurs: [
    { id: 'fine', label: 'Fine' }, { id: 'athletique', label: 'Athlétique' }, { id: 'large', label: 'Carrure large' }
  ]},
  style: { label: 'Style vestimentaire', type: 'choix', valeurs: [
    { id: 'tshirt',  label: 'T-shirt' },  { id: 'chemise', label: 'Chemise' },
    { id: 'hoodie',  label: 'Hoodie' },   { id: 'veste',   label: 'Veste' },
    { id: 'top',     label: 'Top' },      { id: 'polo',    label: 'Polo' }
  ]},
  vetementCouleur: { label: 'Couleur du vêtement', type: 'couleur', valeurs: [
    { id: 'bleu',   hex: '#2C5FAB' }, { id: 'lagon', hex: '#1AA7C4' },
    { id: 'rouge',  hex: '#C6362C' }, { id: 'jaune', hex: '#E8B722' },
    { id: 'vert',   hex: '#3E7C4F' }, { id: 'noir',  hex: '#2E2E33' },
    { id: 'blanc',  hex: '#F2EFE8' }, { id: 'rose',  hex: '#D96C8E' }
  ]},
  accessoire: { label: 'Accessoire', type: 'choix', valeurs: [
    { id: 'aucun',     label: 'Aucun' },     { id: 'collier',  label: 'Collier' },
    { id: 'foulard',   label: 'Foulard' },   { id: 'casquette',label: 'Casquette' },
    { id: 'fleur',     label: 'Fleur' },     { id: 'chapeau',  label: 'Chapeau' }
  ]},
  boucles:   { label: "Boucles d'oreilles", type: 'onoff' },
  piercing:  { label: 'Piercing',            type: 'onoff' },
  tatouage:  { label: 'Tatouage',            type: 'onoff' },
  fond: { label: 'Fond', type: 'couleur', valeurs: [
    { id: 'lagon',  hex: '#BFE7F0' }, { id: 'sable', hex: '#F6E7C8' },
    { id: 'corail', hex: '#FAD8CF' }, { id: 'ciel',  hex: '#D4E1F9' },
    { id: 'palmes', hex: '#D3EDD8' }, { id: 'volcan',hex: '#E7D9F2' }
  ]}
};

const AVATAR_DEFAUT = {
  peau: 'doree', cheveuxCouleur: 'brun', coiffure: 'court',
  barbe: 'aucune', moustache: 'aucune', yeux: 'marron', lunettes: 'aucune',
  taille: 'moyenne', corpulence: 'moyenne', silhouette: 'athletique',
  style: 'tshirt', vetementCouleur: 'lagon', accessoire: 'aucun',
  boucles: false, piercing: false, tatouage: false, fond: 'lagon'
};

/* Petites aides couleur */
function _hex(groupe, id) {
  const v = AVATAR_OPTIONS[groupe].valeurs.find(x => x.id === id);
  return v ? v.hex : AVATAR_OPTIONS[groupe].valeurs[0].hex;
}
function _assombrir(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * f), g = Math.round(((n >> 8) & 255) * f), b = Math.round((n & 255) * f);
  return `rgb(${r},${g},${b})`;
}

/* ───────── Rendu SVG ───────── */
function renderAvatar(cfgIn) {
  const cfg = Object.assign({}, AVATAR_DEFAUT, cfgIn || {});
  const peau = _hex('peau', cfg.peau);
  const peauOmbre = _assombrir(peau, 0.86);
  const chev = _hex('cheveuxCouleur', cfg.cheveuxCouleur);
  const chevFonce = _assombrir(chev, 0.8);
  const iris = _hex('yeux', cfg.yeux);
  const habit = _hex('vetementCouleur', cfg.vetementCouleur);
  const habitFonce = _assombrir(habit, 0.82);
  const fond = _hex('fond', cfg.fond);
  const fondFonce = _assombrir(fond, 0.9);

  /* Morphologie */
  const dy = cfg.taille === 'petite' ? 8 : cfg.taille === 'grande' ? -7 : 0;   // position du buste
  const carrure = { fine: 46, athletique: 54, large: 62 }[cfg.silhouette] || 54;
  const corp = { mince: -4, moyenne: 2, ronde: 10 }[cfg.corpulence] || 2;
  const sw = carrure + corp;                                                   // demi-largeur d'épaules
  const joues = { mince: -2, moyenne: 0, ronde: 4 }[cfg.corpulence] || 0;      // largeur du visage

  const S = [];
  S.push(`<svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Avatar">`);
  S.push(`<defs>
    <clipPath id="cadre"><circle cx="120" cy="120" r="120"/></clipPath>
    <linearGradient id="gFond" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${fond}"/><stop offset="1" stop-color="${fondFonce}"/></linearGradient>
    <linearGradient id="gPeau" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${peau}"/><stop offset="1" stop-color="${peauOmbre}"/></linearGradient>
    <linearGradient id="gChev" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${chev}"/><stop offset="1" stop-color="${chevFonce}"/></linearGradient>
    <linearGradient id="gHabit" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${habit}"/><stop offset="1" stop-color="${habitFonce}"/></linearGradient>
  </defs>`);
  S.push(`<g clip-path="url(#cadre)">`);
  S.push(`<rect width="240" height="240" fill="url(#gFond)"/>`);
  S.push(`<circle cx="120" cy="248" r="118" fill="rgba(255,255,255,.22)"/>`);
  S.push(`<g transform="translate(0 ${dy})">`);

  /* Cheveux longs / arrière (derrière le buste et la tête) */
  const arriere = {
    long:    `<path d="M ${72 - joues} 96 Q 66 78 78 62 Q 96 40 120 40 Q 144 40 162 62 Q 174 78 ${168 + joues} 96 L ${172 + joues} 178 Q 150 190 120 190 Q 90 190 ${68 - joues} 178 Z" fill="url(#gChev)"/>`,
    milong:  `<path d="M ${74 - joues} 94 Q 70 74 82 60 Q 98 42 120 42 Q 142 42 158 60 Q 170 74 ${166 + joues} 94 L ${168 + joues} 148 Q 146 160 120 160 Q 94 160 ${72 - joues} 148 Z" fill="url(#gChev)"/>`,
    tresses: `<path d="M ${76 - joues} 92 Q 72 70 86 56 Q 100 44 120 44 Q 140 44 154 56 Q 168 70 ${164 + joues} 92 L ${164 + joues} 120 L ${76 - joues} 120 Z" fill="url(#gChev)"/>
              <g fill="${chev}" stroke="${chevFonce}" stroke-width="1.4">
              <circle cx="${73 - joues}" cy="124" r="7"/><circle cx="${71 - joues}" cy="138" r="7"/><circle cx="${70 - joues}" cy="152" r="7"/><circle cx="${69 - joues}" cy="166" r="6"/>
              <circle cx="${167 + joues}" cy="124" r="7"/><circle cx="${169 + joues}" cy="138" r="7"/><circle cx="${170 + joues}" cy="152" r="7"/><circle cx="${171 + joues}" cy="166" r="6"/></g>`,
    queue:   `<path d="M 156 60 Q 178 70 176 100 Q 175 128 166 150 Q 162 158 156 154 Q 162 128 160 104 Q 158 78 148 64 Z" fill="url(#gChev)"/>`
  };
  if (arriere[cfg.coiffure]) S.push(arriere[cfg.coiffure]);

  /* Buste / vêtement */
  S.push(`<path d="M ${120 - sw} 246 V 200 Q ${120 - sw} 168 ${120 - sw + 28} 163 L ${120 + sw - 28} 163 Q ${120 + sw} 168 ${120 + sw} 200 V 246 Z" fill="url(#gHabit)"/>`);

  /* Détails du vêtement selon le style */
  if (cfg.style === 'chemise') {
    S.push(`<path d="M 104 163 L 120 180 L 136 163 L 128 161 L 120 170 L 112 161 Z" fill="#fff" opacity=".92"/>
            <line x1="120" y1="182" x2="120" y2="244" stroke="${habitFonce}" stroke-width="2.5"/>
            <circle cx="120" cy="196" r="2.2" fill="#fff"/><circle cx="120" cy="214" r="2.2" fill="#fff"/><circle cx="120" cy="232" r="2.2" fill="#fff"/>`);
  } else if (cfg.style === 'hoodie') {
    S.push(`<path d="M ${120 - sw + 16} 176 Q 120 200 ${120 + sw - 16} 176 Q ${120 + sw - 24} 162 120 160 Q ${120 - sw + 24} 162 ${120 - sw + 16} 176 Z" fill="${habitFonce}"/>
            <line x1="108" y1="186" x2="108" y2="212" stroke="#fff" stroke-width="3.4" stroke-linecap="round" opacity=".85"/>
            <line x1="132" y1="186" x2="132" y2="212" stroke="#fff" stroke-width="3.4" stroke-linecap="round" opacity=".85"/>`);
  } else if (cfg.style === 'veste') {
    S.push(`<path d="M 104 163 L 120 246 L 100 246 Q ${120 - sw + 6} 210 ${120 - sw + 10} 176 Z" fill="${habitFonce}"/>
            <path d="M 136 163 L 120 246 L 140 246 Q ${120 + sw - 6} 210 ${120 + sw - 10} 176 Z" fill="${habitFonce}"/>
            <path d="M 112 164 L 120 176 L 128 164 L 128 246 L 112 246 Z" fill="#fff" opacity=".9"/>`);
  } else if (cfg.style === 'top') {
    S.push(`<path d="M ${120 - sw} 246 V 214 Q ${120 - sw + 4} 190 ${120 - 26} 178 L 96 166 Z M ${120 + sw} 246 V 214 Q ${120 + sw - 4} 190 ${120 + 26} 178 L 144 166 Z" fill="${fondFonce}"/>
            <path d="M 98 168 Q 120 186 142 168 L 138 163 L 102 163 Z" fill="${habitFonce}" opacity=".55"/>`);
  } else if (cfg.style === 'polo') {
    S.push(`<path d="M 106 162 L 120 176 L 134 162 L 138 168 L 120 184 L 102 168 Z" fill="${habitFonce}"/>
            <line x1="120" y1="184" x2="120" y2="206" stroke="${habitFonce}" stroke-width="2.4"/><circle cx="120" cy="192" r="2" fill="#fff"/>`);
  } else { /* t-shirt : encolure simple */
    S.push(`<path d="M 102 163 Q 120 178 138 163 L 136 160 Q 120 172 104 160 Z" fill="${habitFonce}" opacity=".7"/>`);
  }

  /* Cou */
  S.push(`<path d="M 107 128 H 133 V 152 Q 133 164 120 164 Q 107 164 107 152 Z" fill="url(#gPeau)"/>`);
  S.push(`<path d="M 107 128 H 133 V 140 Q 120 148 107 140 Z" fill="${peauOmbre}" opacity=".55"/>`);

  /* Tatouage (petit motif sur le côté du cou / épaule) */
  if (cfg.tatouage) {
    S.push(`<g stroke="${_assombrir(peau, 0.55)}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".8">
      <path d="M ${120 + sw - 22} 178 q 6 -8 12 0 q -6 8 -12 0"/>
      <path d="M ${120 + sw - 20} 186 q 4 -5 8 0"/></g>`);
  }

  /* Oreilles + boucles */
  S.push(`<circle cx="${75 - joues}" cy="106" r="9" fill="url(#gPeau)"/><circle cx="${165 + joues}" cy="106" r="9" fill="url(#gPeau)"/>`);
  if (cfg.boucles) {
    S.push(`<circle cx="${75 - joues}" cy="115" r="3.6" fill="none" stroke="#E8B722" stroke-width="2.2"/>
            <circle cx="${165 + joues}" cy="115" r="3.6" fill="none" stroke="#E8B722" stroke-width="2.2"/>`);
  }

  /* Tête */
  S.push(`<ellipse cx="120" cy="102" rx="${45 + joues}" ry="50" fill="url(#gPeau)"/>`);
  /* joues légères */
  S.push(`<ellipse cx="97" cy="118" rx="7" ry="4.4" fill="#E2745C" opacity=".2"/><ellipse cx="143" cy="118" rx="7" ry="4.4" fill="#E2745C" opacity=".2"/>`);

  /* Barbe (sous la bouche, avant les cheveux avant) */
  const barbes = {
    trois:  `<path d="M ${79 - joues} 104 Q 82 146 120 150 Q 158 146 ${161 + joues} 104 Q 158 138 120 142 Q 82 138 ${79 - joues} 104 Z" fill="${chev}" opacity=".35"/>`,
    bouc:   `<path d="M 108 132 Q 120 128 132 132 Q 132 148 120 149 Q 108 148 108 132 Z" fill="url(#gChev)"/><path d="M 113 135 Q 120 138 127 135 L 127 131 Q 120 134 113 131 Z" fill="${peau}"/>`,
    courte: `<path d="M ${78 - joues} 100 Q 80 148 120 151 Q 160 148 ${162 + joues} 100 Q 160 128 146 136 Q 134 143 120 143 Q 106 143 94 136 Q 80 128 ${78 - joues} 100 Z" fill="url(#gChev)"/>`,
    pleine: `<path d="M ${77 - joues} 96 Q 78 152 120 156 Q 162 152 ${163 + joues} 96 Q 162 124 150 134 Q 138 141 120 141 Q 102 141 90 134 Q 78 124 ${77 - joues} 96 Z" fill="url(#gChev)"/>`
  };
  if (barbes[cfg.barbe]) S.push(barbes[cfg.barbe]);

  /* Bouche (sourire) */
  S.push(`<path d="M 108 129 Q 120 138 132 129" fill="none" stroke="${_assombrir(peau, 0.55)}" stroke-width="3" stroke-linecap="round"/>`);

  /* Moustache */
  if (cfg.moustache === 'fine') S.push(`<path d="M 106 124 Q 120 119 134 124 Q 120 124 106 124 Z" fill="${chevFonce}"/>`);
  if (cfg.moustache === 'epaisse') S.push(`<path d="M 103 125 Q 111 117 120 121 Q 129 117 137 125 Q 128 129 120 127 Q 112 129 103 125 Z" fill="url(#gChev)"/>`);

  /* Nez + piercing */
  S.push(`<path d="M 120 104 Q 116 114 121 117" fill="none" stroke="${peauOmbre}" stroke-width="3" stroke-linecap="round"/>`);
  if (cfg.piercing) S.push(`<circle cx="126" cy="116" r="2" fill="#E8B722"/>`);

  /* Yeux + sourcils */
  S.push(`<g>
    <ellipse cx="100" cy="100" rx="8.6" ry="6.6" fill="#fff"/><ellipse cx="140" cy="100" rx="8.6" ry="6.6" fill="#fff"/>
    <circle cx="101" cy="101" r="4.6" fill="${iris}"/><circle cx="141" cy="101" r="4.6" fill="${iris}"/>
    <circle cx="101" cy="101" r="2" fill="#1E1712"/><circle cx="141" cy="101" r="2" fill="#1E1712"/>
    <circle cx="102.6" cy="99" r="1.2" fill="#fff"/><circle cx="142.6" cy="99" r="1.2" fill="#fff"/>
    <path d="M 90 88 Q 100 83 110 88" fill="none" stroke="${chevFonce}" stroke-width="3.4" stroke-linecap="round"/>
    <path d="M 130 88 Q 140 83 150 88" fill="none" stroke="${chevFonce}" stroke-width="3.4" stroke-linecap="round"/>
  </g>`);

  /* Lunettes */
  if (cfg.lunettes === 'rondes') {
    S.push(`<g fill="none" stroke="#2E2E33" stroke-width="3"><circle cx="100" cy="101" r="13"/><circle cx="140" cy="101" r="13"/><path d="M 113 100 Q 120 96 127 100"/><path d="M 87 99 L ${77 - joues} 97 M 153 99 L ${163 + joues} 97"/></g>`);
  } else if (cfg.lunettes === 'rect') {
    S.push(`<g fill="none" stroke="#2E2E33" stroke-width="3"><rect x="87" y="90" width="26" height="20" rx="6"/><rect x="127" y="90" width="26" height="20" rx="6"/><path d="M 113 98 Q 120 95 127 98"/><path d="M 87 97 L ${77 - joues} 95 M 153 97 L ${163 + joues} 95"/></g>`);
  } else if (cfg.lunettes === 'soleil') {
    S.push(`<g><rect x="86" y="90" width="28" height="21" rx="8" fill="#23252E"/><rect x="126" y="90" width="28" height="21" rx="8" fill="#23252E"/>
      <rect x="89" y="93" width="10" height="6" rx="3" fill="#fff" opacity=".28"/><rect x="129" y="93" width="10" height="6" rx="3" fill="#fff" opacity=".28"/>
      <path d="M 114 98 Q 120 95 126 98" fill="none" stroke="#23252E" stroke-width="3.4"/><path d="M 86 97 L ${77 - joues} 95 M 154 97 L ${163 + joues} 95" stroke="#23252E" stroke-width="3.4"/></g>`);
  }

  /* Cheveux (partie avant) */
  const avant = {
    rase:   `<path d="M ${78 - joues} 92 Q 80 52 120 50 Q 160 52 ${162 + joues} 92 Q 150 66 120 64 Q 90 66 ${78 - joues} 92 Z" fill="${chev}" opacity=".4"/>`,
    court:  `<path d="M ${76 - joues} 96 Q 76 48 120 46 Q 164 48 ${164 + joues} 96 Q 160 72 138 68 Q 148 78 144 86 Q 132 68 104 70 Q 84 74 ${76 - joues} 96 Z" fill="url(#gChev)"/>`,
    meche:  `<path d="M ${76 - joues} 96 Q 76 46 120 44 Q 164 46 ${164 + joues} 96 Q 162 70 142 66 Q 150 80 140 88 Q 136 70 112 72 Q 118 80 108 88 Q 100 72 ${76 - joues} 96 Z" fill="url(#gChev)"/>`,
    boucle: `<g fill="url(#gChev)"><circle cx="88" cy="78" r="15"/><circle cx="104" cy="64" r="16"/><circle cx="122" cy="58" r="17"/><circle cx="140" cy="64" r="16"/><circle cx="154" cy="78" r="15"/><circle cx="${162 + joues}" cy="94" r="12"/><circle cx="${78 - joues}" cy="94" r="12"/></g>`,
    afro:   `<circle cx="120" cy="52" r="42" fill="url(#gChev)"/><circle cx="${84 - joues}" cy="76" r="16" fill="url(#gChev)"/><circle cx="${156 + joues}" cy="76" r="16" fill="url(#gChev)"/>`,
    milong: `<path d="M ${75 - joues} 100 Q 74 48 120 46 Q 166 48 ${165 + joues} 100 Q 162 74 140 68 Q 148 80 142 88 Q 134 70 106 72 Q 86 76 ${75 - joues} 100 Z" fill="url(#gChev)"/>`,
    long:   `<path d="M ${75 - joues} 100 Q 74 46 120 44 Q 166 46 ${165 + joues} 100 Q 162 72 138 66 Q 146 78 140 86 Q 130 68 104 70 Q 84 74 ${75 - joues} 100 Z" fill="url(#gChev)"/>`,
    chignon:`<circle cx="120" cy="40" r="16" fill="url(#gChev)"/><path d="M ${77 - joues} 96 Q 78 50 120 48 Q 162 50 ${163 + joues} 96 Q 156 70 120 66 Q 84 70 ${77 - joues} 96 Z" fill="url(#gChev)"/>`,
    queue:  `<path d="M ${77 - joues} 96 Q 78 50 120 48 Q 162 50 ${163 + joues} 96 Q 156 70 120 66 Q 84 70 ${77 - joues} 96 Z" fill="url(#gChev)"/>`,
    tresses:`<path d="M ${77 - joues} 96 Q 78 50 120 48 Q 162 50 ${163 + joues} 96 Q 154 72 120 68 Q 86 72 ${77 - joues} 96 Z" fill="url(#gChev)"/>
             <path d="M 96 58 L 104 70 M 116 54 L 120 68 M 136 56 L 132 69" stroke="${chevFonce}" stroke-width="2" opacity=".7"/>`,
    chauve: ``
  };
  if (avant[cfg.coiffure] !== undefined) S.push(avant[cfg.coiffure]);

  /* Accessoires (par-dessus tout) */
  if (cfg.accessoire === 'collier') {
    S.push(`<path d="M 102 168 Q 120 186 138 168" fill="none" stroke="#E8B722" stroke-width="2.6"/><circle cx="120" cy="184" r="4" fill="#E8B722"/>`);
  } else if (cfg.accessoire === 'foulard') {
    S.push(`<path d="M 98 160 Q 120 178 142 160 L 146 172 Q 120 190 94 172 Z" fill="${_hex('vetementCouleur','rouge')}" opacity=".92"/><path d="M 132 174 L 140 200 L 128 198 Z" fill="${_hex('vetementCouleur','rouge')}" opacity=".92"/>`);
  } else if (cfg.accessoire === 'casquette') {
    S.push(`<path d="M ${80 - joues} 84 Q 82 44 120 42 Q 158 44 ${160 + joues} 84 Q 120 72 ${80 - joues} 84 Z" fill="${habitFonce}"/>
            <path d="M ${74 - joues} 84 Q 120 70 ${166 + joues} 84 L ${168 + joues} 90 Q 120 78 ${72 - joues} 90 Z" fill="${_assombrir(habit,0.7)}"/>
            <circle cx="120" cy="44" r="4" fill="${_assombrir(habit,0.7)}"/>`);
  } else if (cfg.accessoire === 'fleur') {
    S.push(`<g transform="translate(${158 + joues} 74)"><circle r="4.2" fill="#F2C200"/><g fill="#FF6F91"><circle cx="0" cy="-7.5" r="4.4"/><circle cx="7" cy="-2.5" r="4.4"/><circle cx="4.5" cy="6" r="4.4"/><circle cx="-4.5" cy="6" r="4.4"/><circle cx="-7" cy="-2.5" r="4.4"/></g><circle r="3.4" fill="#F2C200"/></g>`);
  } else if (cfg.accessoire === 'chapeau') {
    S.push(`<path d="M ${70 - joues} 86 Q 120 74 ${170 + joues} 86 L ${174 + joues} 92 Q 120 80 ${66 - joues} 92 Z" fill="#C9A15A"/>
            <path d="M ${86 - joues} 84 Q 88 46 120 44 Q 152 46 ${154 + joues} 84 Q 120 74 ${86 - joues} 84 Z" fill="#D9B26B"/>
            <path d="M ${86 - joues} 76 Q 120 66 ${154 + joues} 76 L ${154 + joues} 82 Q 120 72 ${86 - joues} 82 Z" fill="#8A5A2B"/>`);
  }

  S.push(`</g></g></svg>`);
  return S.join('\n');
}

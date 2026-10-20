/*
 * Catalogue des services connus.
 *
 * Aucun identifiant d'application n'est codé en dur : les identifiants Tizen
 * varient selon l'année du téléviseur, la région et la version de l'app.
 * Chaque service est reconnu au démarrage en comparant le NOM des applications
 * réellement installées (tizen.application.getAppsInfo) aux motifs ci-dessous.
 * Un service non trouvé n'est jamais présenté comme lançable.
 */
(function (root) {
  'use strict';

  var SERVICES = [
    // --- Jeux ---------------------------------------------------------------
    {
      key: 'luna', label: 'Amazon Luna', section: 'games', accent: '#7b5cff',
      match: [/\bluna\b/i],
      missing: 'Luna n’apparaît pas comme application installée. Sur les TV Samsung, ' +
        'Luna est proposé dans Samsung Gaming Hub (touche manette de l’accueil Samsung). ' +
        'Ouvrez Gaming Hub puis Luna.'
    },
    {
      key: 'xbox', label: 'Xbox', section: 'games', accent: '#3fb950',
      match: [/\bxbox\b/i],
      missing: 'L’application Xbox n’est pas détectée. Sur les TV Samsung 2022, ' +
        'Xbox Cloud Gaming est proposé dans Samsung Gaming Hub. Ouvrez Gaming Hub puis Xbox.'
    },
    {
      key: 'gaminghub', label: 'Gaming Hub', section: 'games', accent: '#4f8cff',
      match: [/gaming\s*hub/i],
      missing: 'Samsung Gaming Hub est une section du système Samsung et n’apparaît pas ' +
        'forcément comme application lançable. Utilisez l’icône manette de l’accueil Samsung.'
    },
    { key: 'geforcenow', label: 'GeForce NOW', section: 'games', accent: '#76b900', optional: true,
      match: [/geforce\s*now/i] },
    { key: 'twitch', label: 'Twitch', section: 'games', accent: '#9146ff', optional: true,
      match: [/^twitch$/i] },

    // --- Streaming ----------------------------------------------------------
    { key: 'netflix', label: 'Netflix', section: 'streaming', accent: '#e50914',
      match: [/^netflix$/i] },
    { key: 'youtube', label: 'YouTube', section: 'streaming', accent: '#ff3d3d',
      match: [/^youtube$/i] },
    { key: 'prime', label: 'Prime Video', section: 'streaming', accent: '#1aa3ff', optional: true,
      match: [/prime\s*video/i] },
    { key: 'disney', label: 'Disney+', section: 'streaming', accent: '#2f6bff', optional: true,
      match: [/^disney\s*\+/i] },
    { key: 'canal', label: 'CANAL+', section: 'streaming', accent: '#d9d9d9', optional: true,
      match: [/canal\s*\+/i, /mycanal/i] },
    { key: 'crunchyroll', label: 'Crunchyroll', section: 'streaming', accent: '#f47521', optional: true,
      match: [/crunchyroll/i] },
    { key: 'appletv', label: 'Apple TV', section: 'streaming', accent: '#bfbfbf', optional: true,
      match: [/^apple\s*tv$/i] },
    { key: 'spotify', label: 'Spotify', section: 'streaming', accent: '#1ed760', optional: true,
      match: [/^spotify/i] },
    { key: 'plex', label: 'Plex', section: 'streaming', accent: '#e5a00d', optional: true,
      match: [/^plex$/i] }
  ];

  /* Présentation (textes neutres, sans promesse sur l'offre de chaque service). */
  var DETAILS = {
    luna: { meta: ['Cloud gaming', 'Manette conseillée'], blurb: 'Des jeux en streaming, sans console. Branchez une manette Bluetooth et jouez.' },
    xbox: { meta: ['Cloud gaming', 'Manette conseillée'], blurb: 'Les jeux Xbox en streaming depuis le cloud.' },
    gaminghub: { meta: ['Samsung', 'Tous les services'], blurb: 'Le point d\u2019entrée Samsung vers les services de jeu du téléviseur.' },
    geforcenow: { meta: ['Cloud gaming'], blurb: 'Vos jeux PC en streaming.' },
    twitch: { meta: ['Direct', 'Jeux vidéo'], blurb: 'Les streams en direct.' },
    netflix: { meta: ['Séries', 'Films'], blurb: 'Séries, films et documentaires.' },
    youtube: { meta: ['Vidéos', 'Musique', 'Direct'], blurb: 'Vos abonnements, la musique et les directs.' },
    prime: { meta: ['Films', 'Séries'], blurb: 'Films et séries Prime Video.' },
    disney: { meta: ['Films', 'Séries'], blurb: 'Films et séries Disney+.' },
    canal: { meta: ['Chaînes', 'Replay'], blurb: 'Les chaînes CANAL+ en direct et en replay.' },
    crunchyroll: { meta: ['Anime'], blurb: 'Les séries d\u2019anime.' },
    appletv: { meta: ['Films', 'Séries'], blurb: 'Films et séries Apple TV.' },
    spotify: { meta: ['Musique', 'Podcasts'], blurb: 'Musique et podcasts.' },
    plex: { meta: ['Médiathèque'], blurb: 'Votre médiathèque personnelle.' }
  };

  /**
   * Associe chaque service connu aux applications installées.
   * @param {Array<{id:string,name:string}>} installed
   * @returns {Array} services enrichis de `app` (ou null si absent)
   */
  function resolve(installed) {
    return SERVICES.map(function (svc) {
      var found = null;
      for (var i = 0; i < installed.length && !found; i++) {
        var name = (installed[i].name || '').trim();
        for (var j = 0; j < svc.match.length; j++) {
          if (svc.match[j].test(name)) { found = installed[i]; break; }
        }
      }
      return {
        key: svc.key, label: svc.label, section: svc.section, accent: svc.accent,
        optional: !!svc.optional, missing: svc.missing || null, app: found,
        meta: (DETAILS[svc.key] || {}).meta || [], blurb: (DETAILS[svc.key] || {}).blurb || ''
      };
    });
  }

  var api = { SERVICES: SERVICES, resolve: resolve };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TVCatalog = api;
})(this);

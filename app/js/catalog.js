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
    { key: 'boosteroid', label: 'Boosteroid', section: 'games', accent: '#ff6a00', optional: true,
      match: [/boosteroid/i] },
    { key: 'utomik', label: 'Utomik', section: 'games', accent: '#25c2a0', optional: true,
      match: [/^utomik/i] },

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
      match: [/^plex$/i] },
    { key: 'tf1', label: 'TF1+', section: 'streaming', accent: '#1f6bff', optional: true,
      match: [/^tf1\+?/i] },
    { key: 'm6', label: 'M6+', section: 'streaming', accent: '#7a2cff', optional: true,
      match: [/^m6\+?/i] },
    { key: 'francetv', label: 'france.tv', section: 'streaming', accent: '#2b6cff', optional: true,
      match: [/^france\.?tv/i] },
    { key: 'arte', label: 'ARTE', section: 'streaming', accent: '#ff5a1f', optional: true,
      match: [/^arte\b/i] },
    { key: 'molotov', label: 'Molotov', section: 'streaming', accent: '#ff2d55', optional: true,
      match: [/^molotov/i] },
    { key: 'rakuten', label: 'Rakuten TV', section: 'streaming', accent: '#bf0000', optional: true,
      match: [/rakuten/i] },
    { key: 'pathe', label: 'Pathé Home', section: 'streaming', accent: '#f5b300', optional: true,
      match: [/path[eé]\s*home/i] },
    { key: 'ocs', label: 'CINÉ+ OCS', section: 'streaming', accent: '#ff7a00', optional: true,
      match: [/\bocs\b/i] },
    { key: 'rmcsport', label: 'RMC Sport', section: 'streaming', accent: '#00a3e0', optional: true,
      match: [/^rmc sport/i] },
    { key: 'freetv', label: 'Free TV', section: 'streaming', accent: '#cd1e25', optional: true,
      match: [/^free tv/i] },
    { key: 'orangetv', label: 'Orange TV', section: 'streaming', accent: '#ff7900', optional: true,
      match: [/^orange tv/i] }
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
    plex: { meta: ['Médiathèque'], blurb: 'Votre médiathèque personnelle.' },
    boosteroid: { meta: ['Cloud gaming'], blurb: 'Jeux PC en streaming.' },
    utomik: { meta: ['Cloud gaming'], blurb: 'Une bibliothèque de jeux en streaming.' }
  };

  /*
   * Quelles applications montrer ? Celles que la TV présente elle-même dans son panneau
   * Applications, pas ses dizaines d'applications internes.
   *  - Apps du Samsung Store : identifiant « XXXXXXXXXX.Nom » (paquet de 10 caractères).
   *  - Apps préinstallées visibles dans le panneau, relevées sur le QE55Q70BATXXC le
   *    20/10/2026 (`sdb shell 0 vd_applist`) — identifiants constatés, pas supposés.
   *  - Utilitaires Samsung écartés (manuel, sécurité, services publics, assistant).
   */
  var STORE_ID = /^[A-Za-z0-9]{10}\.[A-Za-z0-9_-]+$/;
  var VISIBLE_PREINSTALLED = ['org.tizen.netflix-app', 'org.tizen.primevideo', 'org.tizen.browser', 'com.samsung.tv.ariavideo'];
  var UTILITY_NAMES = [/^e-?manual$/i, /security center/i, /services d.int[ée]r[êe]t g[ée]n[ée]ral/i, /^bixby$/i];

  /** Nom reconnu comme un service du catalogue (identifiant quelconque : varie selon le modèle). */
  function isKnownService(name) {
    for (var i = 0; i < SERVICES.length; i++) {
      for (var j = 0; j < SERVICES[i].match.length; j++) if (SERVICES[i].match[j].test(name)) return true;
    }
    return false;
  }

  function isUserApp(app) {
    if (!app || !app.id || !app.name) return false;
    var name = app.name.trim();
    for (var i = 0; i < UTILITY_NAMES.length; i++) if (UTILITY_NAMES[i].test(name)) return false;
    // Toutes les TV Samsung : apps du Store, préinstallées relevées, ou tout service connu
    // reconnu par son nom (les identifiants préinstallés changent d'un modèle à l'autre).
    return STORE_ID.test(app.id) || VISIBLE_PREINSTALLED.indexOf(app.id) !== -1 || isKnownService(name);
  }

  /** Filtre les apps (Samsung) et retire les doublons de nom (ex. deux paquets « CANAL+ »). */
  function userApps(apps, platform) {
    var seen = {};
    return apps.filter(function (a) {
      // Le filtre par identifiant est propre à Samsung ; sur LG, toute app visible est gardée.
      if (platform === 'webos' ? !(a && a.id && a.name) : !isUserApp(a)) return false;
      var k = a.name.trim().toLowerCase();
      if (seen[k]) return false;
      seen[k] = true;
      return true;
    });
  }

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

  /*
   * LG webOS : la liste des applications installées est souvent refusée aux apps tierces.
   * En repli seulement, identifiants publics LG Content Store des grandes applications
   * (non garantis selon le modèle). Ils sont marqués « non vérifiés » : un lancement refusé
   * par la TV affiche « non détectée », jamais un faux succès.
   */
  var LG_FALLBACK = {
    netflix: 'netflix', prime: 'amazon', youtube: 'youtube.leanback.v4',
    disney: 'com.disney.disneyplus-prod', appletv: 'com.apple.appletv', spotify: 'spotify-beehive'
  };

  /** Applications « supposées » pour LG quand la liste est refusée. */
  function lgFallbackApps() {
    return SERVICES.filter(function (s) { return LG_FALLBACK[s.key]; }).map(function (s) {
      return { id: LG_FALLBACK[s.key], name: s.label, iconPath: '', unverified: true };
    });
  }

  var api = { SERVICES: SERVICES, resolve: resolve, isUserApp: isUserApp, userApps: userApps,
    isKnownService: isKnownService, lgFallbackApps: lgFallbackApps, LG_FALLBACK: LG_FALLBACK };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TVCatalog = api;
})(this);

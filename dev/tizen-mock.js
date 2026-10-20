/*
 * SIMULATION DE DÉVELOPPEMENT UNIQUEMENT — jamais incluse dans le paquet .wgt.
 * Imite le sous-ensemble de l'API Tizen utilisé par TV Hub, avec des
 * applications FICTIVES (identifiants « mock.* ») pour tester l'interface
 * dans un navigateur de bureau. Ne reflète pas le contenu réel du téléviseur.
 *
 * Paramètres d'URL :
 *   ?scenario=default  (défaut) apps fictives (identifiants au format Store), Luna et Gaming Hub absents
 *   ?scenario=full     toutes les apps du catalogue présentes
 *   ?scenario=listfail getAppsInfo renvoie une erreur
 *   ?scenario=notizen  pas d'objet tizen (comme un navigateur classique)
 */
(function () {
  'use strict';
  var q = (location.search.match(/scenario=(\w+)/) || [])[1] || 'default';
  if (q === 'notizen' || /[?&]platform=webos/.test(location.search)) return; // LG : voir webos-mock.js

  // Icône FACTICE (lettre sur pastille) pour tester l'affichage des icônes ; ce ne sont pas les vraies.
  function fakeIcon(letter, color) {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect x="10" y="10" width="180" height="180" rx="44" fill="#fff"/>' +
      '<text x="100" y="130" font-family="Helvetica" font-weight="700" font-size="96" text-anchor="middle" fill="' + color + '">' + letter + '</text></svg>');
  }
  // [id, nom, visible (show), icône]
  var base = [
    ['org.tizen.netflix-app', 'Netflix'], ['MockYouTub.YouTube', 'YouTube', true, fakeIcon('Y', '#e62117')],
    ['MockXboxGP.Xbox', 'Xbox', true, '/introuvable/icone.png'], // icône illisible → secours
    ['org.tizen.primevideo', 'Prime Video'], ['MockCanal1.CanalPlus', 'CANAL+'], ['MockCanal2.CanalPlus', 'CANAL+'],
    ['MockCrunch.Crunchyroll', 'Crunchyroll', true, fakeIcon('C', '#f47521')],
    ['MockSpotif.Spotify', 'Spotify', true, fakeIcon('S', '#1db954')],
    ['org.tizen.browser', 'Internet'], ['MockBroken.Broken', 'App en panne (test)'],
    ['MockServic.Service', 'Service caché', false],
    ['com.samsung.tv.settings', 'Paramètres système'], // app interne : doit être filtrée
    ['MockManual.emanual', 'eManual']                  // utilitaire : doit être filtré
  ];
  if (q === 'full') base = base.concat([['MockLunaWb.Luna', 'Luna'], ['MockGHub00.Hub', 'Gaming Hub'], ['MockDisney.Disney', 'Disney+']]);
  for (var i = 1; i <= 14; i++) {
    var n = ('0' + i).slice(-2);
    base.push(['MockExtr' + n + '.App', 'Application ' + i, true, i <= 5 ? fakeIcon(String(i), '#5b3df5') : '']);
  }

  // Données FICTIVES des widgets (la simulation ne contacte aucun service réseau).
  window.__widgetsMock = {
    place: 'Paris (simulation)',
    weather: { temp: 14, code: 2, days: [
      { date: '2026-10-20', code: 2, max: 16, min: 9 }, { date: '2026-10-21', code: 0, max: 15, min: 8 },
      { date: '2026-10-22', code: 63, max: 12, min: 9 }, { date: '2026-10-23', code: 3, max: 13, min: 8 },
      { date: '2026-10-24', code: 0, max: 16, min: 7 }] },
    news: [
      { title: 'Titre d\u2019exemple n°1 (simulation)', category: 'Sport', time: Date.now() - 20 * 60000 },
      { title: 'Titre d\u2019exemple n°2 (simulation)', category: 'Culture', time: Date.now() - 65 * 60000 },
      { title: 'Titre d\u2019exemple n°3 (simulation)', category: 'France', time: Date.now() - 130 * 60000 },
      { title: 'Titre d\u2019exemple n°4 (simulation)', category: 'Tech', time: Date.now() - 200 * 60000 }]
  };

  window.__launches = [];
  window.tizen = {
    __mock: true,
    application: {
      getCurrentApplication: function () {
        return { appInfo: { id: 'tvhubPerso.TVHub' }, exit: function () { window.__exited = true; } };
      },
      getAppsInfo: function (ok, err) {
        setTimeout(function () {
          if (q === 'listfail') { err({ name: 'UnknownError', message: 'simulé' }); return; }
          ok(base.map(function (a) { return { id: a[0], name: a[1], iconPath: a[3] || '', show: a[2] !== false }; })
            .concat([{ id: 'tvhubPerso.TVHub', name: 'TV Hub', show: true }]));
        }, 120);
      },
      launch: function (id, ok, err) {
        window.__launches.push(id);
        setTimeout(function () {
          if (id === 'MockBroken.Broken') err({ name: 'NotFoundError', message: 'simulé' });
          else ok();
        }, 150);
      }
    },
    tvinputdevice: { registerKey: function () {} }
  };
})();

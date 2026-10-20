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
  if (q === 'notizen') return;

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

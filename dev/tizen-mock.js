/*
 * SIMULATION DE DÉVELOPPEMENT UNIQUEMENT — jamais incluse dans le paquet .wgt.
 * Imite le sous-ensemble de l'API Tizen utilisé par TV Hub, avec des
 * applications FICTIVES (identifiants « mock.* ») pour tester l'interface
 * dans un navigateur de bureau. Ne reflète pas le contenu réel du téléviseur.
 *
 * Paramètres d'URL :
 *   ?scenario=default  (défaut) quelques apps fictives, Luna et Gaming Hub absents
 *   ?scenario=full     toutes les apps du catalogue présentes
 *   ?scenario=listfail getAppsInfo renvoie une erreur
 *   ?scenario=notizen  pas d'objet tizen (comme un navigateur classique)
 */
(function () {
  'use strict';
  var q = (location.search.match(/scenario=(\w+)/) || [])[1] || 'default';
  if (q === 'notizen') return;

  var base = [
    ['mock.netflix', 'Netflix'], ['mock.youtube', 'YouTube'], ['mock.xbox', 'Xbox'],
    ['mock.prime', 'Prime Video'], ['mock.canal', 'CANAL+'], ['mock.crunchyroll', 'Crunchyroll'],
    ['mock.spotify', 'Spotify'], ['mock.browser', 'Internet'], ['mock.broken', 'App en panne (test)'],
    ['mock.service', 'Service caché', false]
  ];
  if (q === 'full') base = base.concat([['mock.luna', 'Luna'], ['mock.hub', 'Gaming Hub'], ['mock.disney', 'Disney+']]);
  for (var i = 1; i <= 14; i++) base.push(['mock.extra' + i, 'Application ' + i]);

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
          ok(base.map(function (a) { return { id: a[0], name: a[1], iconPath: '', show: a[2] !== false }; })
            .concat([{ id: 'tvhubPerso.TVHub', name: 'TV Hub', show: true }]));
        }, 120);
      },
      launch: function (id, ok, err) {
        window.__launches.push(id);
        setTimeout(function () {
          if (id === 'mock.broken') err({ name: 'NotFoundError', message: 'simulé' });
          else ok();
        }, 150);
      }
    },
    tvinputdevice: { registerKey: function () {} }
  };
})();

/*
 * SIMULATION DE DÉVELOPPEMENT UNIQUEMENT — jamais incluse dans un paquet.
 * Imite le sous-ensemble webOS (LG) utilisé par Accueil+ : PalmServiceBridge + PalmSystem,
 * avec des applications FICTIVES. Ne reflète pas le contenu réel d'une TV LG.
 *
 *   ?platform=webos              liste des apps REFUSÉE (cas le plus courant pour une app tierce)
 *   ?platform=webos&lglist=1     liste des apps autorisée
 * Apps « installées » : Netflix, Prime Video (amazon), YouTube. Disney+ etc. : lancement refusé.
 */
(function () {
  'use strict';
  if (!/[?&]platform=webos/.test(location.search)) return;
  var listAllowed = /[?&]lglist=1/.test(location.search);
  var installed = { netflix: 'Netflix', amazon: 'Prime Video', 'youtube.leanback.v4': 'YouTube', 'com.example.xbox': 'Xbox' };

  window.__webosMock = true;
  window.__launches = [];
  window.PalmSystem = { platformBack: function () { window.__exited = true; } };
  window.PalmServiceBridge = function () {};
  window.PalmServiceBridge.prototype.call = function (uri, params) {
    var self = this, p = JSON.parse(params || '{}'), r;
    if (/\/listApps$/.test(uri)) {
      r = listAllowed
        ? { returnValue: true, apps: Object.keys(installed).map(function (id) { return { id: id, title: installed[id], visible: true }; }) }
        : { returnValue: false, errorCode: -1, errorText: 'Denied method call "listApps" (simulé)' };
    } else if (/\/launch$/.test(uri)) {
      window.__launches.push(p.id);
      r = installed[p.id] ? { returnValue: true } : { returnValue: false, errorCode: -101, errorText: 'The application cannot be found (simulé)' };
    } else r = { returnValue: false, errorText: 'inconnu' };
    setTimeout(function () { self.onservicecallback(JSON.stringify(r)); }, 120);
  };
})();

/*
 * Couche d'accès à la plateforme Tizen.
 * N'utilise que des API Web Tizen publiques documentées :
 *   - tizen.application.getAppsInfo / launch / getCurrentApplication().exit
 *   - tizen.tvinputdevice.registerKey
 * Hors TV (navigateur de bureau), `window.tizen` est absent : l'interface
 * fonctionne mais aucune application n'est lançable.
 */
(function (root) {
  'use strict';

  var KEYS = {
    LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, ENTER: 13,
    BACK: 10009, ESC: 27, BACKSPACE: 8,
    RED: 403, GREEN: 404, YELLOW: 405, BLUE: 406
  };

  function hasTizen() {
    return !!(root.tizen && root.tizen.application && typeof root.tizen.application.launch === 'function');
  }

  function selfAppId() {
    try { return root.tizen.application.getCurrentApplication().appInfo.id; } catch (e) { return null; }
  }

  /** Liste les applications visibles dans le lanceur Samsung (hors TV Hub). */
  function listApps(done) {
    if (!hasTizen() || typeof root.tizen.application.getAppsInfo !== 'function') {
      done({ ok: false, reason: 'no-tizen', apps: [] });
      return;
    }
    var self = selfAppId();
    try {
      root.tizen.application.getAppsInfo(function (infos) {
        var apps = [];
        (infos || []).forEach(function (a) {
          if (!a || !a.id || a.id === self) return;
          if (a.show === false) return; // applications de service / masquées
          if (!a.name) return;
          apps.push({ id: a.id, name: String(a.name), iconPath: a.iconPath || '' });
        });
        apps.sort(function (x, y) { return x.name.localeCompare(y.name, 'fr'); });
        done({ ok: true, apps: apps });
      }, function (err) {
        done({ ok: false, reason: (err && err.name) || 'UnknownError', apps: [] });
      });
    } catch (e) {
      done({ ok: false, reason: e.name || 'Exception', apps: [] });
    }
  }

  /** Demande le lancement d'une application par son identifiant découvert. */
  function launch(appId, onOk, onErr) {
    if (!hasTizen()) { onErr({ name: 'NotSupported', message: 'API Tizen absente (hors TV).' }); return; }
    var settled = false;
    var timer = null;
    function finish(ok, err) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      root.document.removeEventListener('visibilitychange', onHidden);
      if (ok) onOk(); else onErr(err);
    }
    // Si TV Hub passe en arrière-plan, l'autre application s'est ouverte.
    function onHidden() { if (root.document.hidden) finish(true); }
    root.document.addEventListener('visibilitychange', onHidden);
    timer = setTimeout(function () {
      finish(false, { name: 'Timeout', message: 'Aucune réponse du système.' });
    }, 8000);
    try {
      root.tizen.application.launch(appId, function () { finish(true); }, function (err) {
        finish(false, { name: (err && err.name) || 'UnknownError', message: (err && err.message) || '' });
      });
    } catch (e) {
      finish(false, { name: e.name || 'Exception', message: e.message || '' });
    }
  }

  /** Quitte TV Hub : le téléviseur revient à l'interface Samsung. */
  function exit() {
    try { root.tizen.application.getCurrentApplication().exit(); return true; } catch (e) { return false; }
  }

  /** Enregistre les touches de couleur (les flèches, OK et Retour sont reçues sans enregistrement). */
  function registerKeys() {
    if (!root.tizen || !root.tizen.tvinputdevice) return false;
    ['ColorF0Red', 'ColorF1Green', 'ColorF2Yellow', 'ColorF3Blue'].forEach(function (k) {
      try { root.tizen.tvinputdevice.registerKey(k); } catch (e) { /* touche non disponible */ }
    });
    return true;
  }

  var api = {
    KEYS: KEYS, hasTizen: hasTizen, listApps: listApps, launch: launch,
    exit: exit, registerKeys: registerKeys,
    isMock: function () { return !!(root.tizen && root.tizen.__mock); }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TVPlatform = api;
})(this);

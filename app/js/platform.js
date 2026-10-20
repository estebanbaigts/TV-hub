/*
 * Couche d'accès à la plateforme : Samsung Tizen ou LG webOS (détection automatique).
 *
 * Tizen (TV Samsung 2017+) — API Web Tizen publiques :
 *   tizen.application.getAppsInfo / launch / getCurrentApplication().exit, tizen.tvinputdevice.registerKey
 * webOS (TV LG) — service public Application Manager via PalmServiceBridge (ce qu'utilise webOSTV.js) :
 *   luna://com.webos.applicationManager/launch      (public, documenté)
 *   luna://com.webos.applicationManager/listApps    (souvent refusé aux apps tierces → repli géré par l'appelant)
 * Hors TV (navigateur de bureau) : aucune application lançable.
 */
(function (root) {
  'use strict';

  var KEYS = {
    LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, ENTER: 13,
    BACK: 10009, BACK_LG: 461, ESC: 27, BACKSPACE: 8,
    RED: 403, GREEN: 404, YELLOW: 405, BLUE: 406
  };

  function hasTizen() {
    return !!(root.tizen && root.tizen.application && typeof root.tizen.application.launch === 'function');
  }
  function hasWebOS() { return typeof root.PalmServiceBridge === 'function'; }

  function name() { return hasTizen() ? 'tizen' : hasWebOS() ? 'webos' : 'none'; }

  /** Touche Retour. Dans un champ de saisie, Retour arrière efface un caractère : ce n'est pas un retour. */
  function isBack(k, inInput) {
    return k === KEYS.BACK || k === KEYS.BACK_LG || k === KEYS.ESC || (!inInput && k === KEYS.BACKSPACE);
  }

  // ---------------------------------------------------------------------------
  // Tizen
  // ---------------------------------------------------------------------------

  function selfAppId() {
    try { return root.tizen.application.getCurrentApplication().appInfo.id; } catch (e) { return null; }
  }

  function tizenList(done) {
    if (typeof root.tizen.application.getAppsInfo !== 'function') { done({ ok: false, reason: 'no-list', apps: [] }); return; }
    var self = selfAppId();
    try {
      root.tizen.application.getAppsInfo(function (infos) {
        var apps = [];
        (infos || []).forEach(function (a) {
          if (!a || !a.id || a.id === self || a.show === false || !a.name) return;
          apps.push({ id: a.id, name: String(a.name), iconPath: a.iconPath || '' });
        });
        done({ ok: true, apps: sortByName(apps) });
      }, function (err) {
        done({ ok: false, reason: (err && err.name) || 'UnknownError', apps: [] });
      });
    } catch (e) {
      done({ ok: false, reason: e.name || 'Exception', apps: [] });
    }
  }

  function tizenLaunch(appId, ok, fail) {
    root.tizen.application.launch(appId, ok, function (err) {
      fail({ name: (err && err.name) || 'UnknownError', message: (err && err.message) || '' });
    });
  }

  // ---------------------------------------------------------------------------
  // webOS
  // ---------------------------------------------------------------------------

  var pending = []; // garde une référence aux ponts tant que la réponse n'est pas arrivée

  function luna(uri, params, cb) {
    var bridge = new root.PalmServiceBridge();
    pending.push(bridge);
    bridge.onservicecallback = function (msg) {
      var i = pending.indexOf(bridge); if (i >= 0) pending.splice(i, 1);
      var r;
      try { r = typeof msg === 'string' ? JSON.parse(msg) : msg; } catch (e) { r = { returnValue: false, errorText: 'Réponse illisible' }; }
      cb(r || { returnValue: false });
    };
    bridge.call(uri, JSON.stringify(params || {}));
  }

  function webosList(done) {
    try {
      luna('luna://com.webos.applicationManager/listApps', {}, function (r) {
        if (!r.returnValue || !r.apps) { done({ ok: false, reason: r.errorText || 'denied', apps: [] }); return; }
        var apps = [];
        r.apps.forEach(function (a) {
          if (!a || !a.id || a.visible === false || !a.title) return;
          apps.push({ id: a.id, name: String(a.title), iconPath: a.icon || '' });
        });
        done({ ok: true, apps: sortByName(apps) });
      });
    } catch (e) {
      done({ ok: false, reason: e.name || 'Exception', apps: [] });
    }
  }

  function webosLaunch(appId, ok, fail) {
    luna('luna://com.webos.applicationManager/launch', { id: appId }, function (r) {
      if (r.returnValue) ok();
      else fail({ name: r.errorCode ? 'Erreur ' + r.errorCode : 'LaunchError', message: r.errorText || '' });
    });
  }

  // ---------------------------------------------------------------------------
  // Interface commune
  // ---------------------------------------------------------------------------

  function sortByName(apps) {
    return apps.sort(function (x, y) { return x.name.localeCompare(y.name, 'fr'); });
  }

  /** Liste les applications visibles (hors Accueil+). reason : 'no-tizen' hors TV. */
  function listApps(done) {
    var p = name();
    if (p === 'tizen') return tizenList(done);
    if (p === 'webos') return webosList(done);
    done({ ok: false, reason: 'no-tizen', apps: [] });
  }

  /** Demande le lancement d'une application. Succès uniquement sur confirmation du système. */
  function launch(appId, onOk, onErr) {
    var p = name();
    if (p === 'none') { onErr({ name: 'NotSupported', message: 'Aucune TV détectée (navigateur de bureau).' }); return; }
    var settled = false;
    var timer = null;
    function finish(ok, err) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      root.document.removeEventListener('visibilitychange', onHidden);
      if (ok) onOk(); else onErr(err);
    }
    // Si Accueil+ passe en arrière-plan, l'autre application s'est ouverte.
    function onHidden() { if (root.document.hidden) finish(true); }
    root.document.addEventListener('visibilitychange', onHidden);
    timer = setTimeout(function () { finish(false, { name: 'Timeout', message: 'Aucune réponse du système.' }); }, 8000);
    try {
      (p === 'tizen' ? tizenLaunch : webosLaunch)(appId, function () { finish(true); }, function (e) { finish(false, e); });
    } catch (e) {
      finish(false, { name: e.name || 'Exception', message: e.message || '' });
    }
  }

  /** Quitte Accueil+ : la TV revient à son accueil. */
  function exit() {
    var p = name();
    try {
      if (p === 'tizen') { root.tizen.application.getCurrentApplication().exit(); return true; }
      if (p === 'webos') {
        if (root.PalmSystem && typeof root.PalmSystem.platformBack === 'function') root.PalmSystem.platformBack();
        else root.close();
        return true;
      }
    } catch (e) { /* ignore */ }
    return false;
  }

  /** Tizen : enregistre les touches de couleur. webOS : rien à faire. */
  function registerKeys() {
    if (!root.tizen || !root.tizen.tvinputdevice) return false;
    ['ColorF0Red', 'ColorF1Green', 'ColorF2Yellow', 'ColorF3Blue'].forEach(function (k) {
      try { root.tizen.tvinputdevice.registerKey(k); } catch (e) { /* touche non disponible */ }
    });
    return true;
  }

  var LABELS = {
    tizen: { home: 'l’accueil Samsung', store: 'Samsung Apps' },
    webos: { home: 'l’accueil LG', store: 'LG Content Store' },
    none: { home: 'l’accueil de la TV', store: 'la boutique d’applications de la TV' }
  };

  var api = {
    KEYS: KEYS, name: name, hasTizen: hasTizen, hasWebOS: hasWebOS, isBack: isBack,
    available: function () { return name() !== 'none'; },
    labels: function () { return LABELS[name()]; },
    listApps: listApps, launch: launch, exit: exit, registerKeys: registerKeys,
    isMock: function () { return !!((root.tizen && root.tizen.__mock) || root.__webosMock); }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TVPlatform = api;
})(this);

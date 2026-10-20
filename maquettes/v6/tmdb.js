/*
 * TV-hub V6 — accès TMDB (lecture seule).
 *
 *  - Clé : window.TMDB_KEY, fournie par key.js (ignoré par git). Sans clé, TMDB est
 *    simplement désactivé et l'interface affiche les services sans images.
 *    Attention : une clé v3 utilisée côté client reste lisible sur l'appareil ; pour
 *    une diffusion, passer par un petit proxy qui garde la clé côté serveur.
 *  - Données : /discover filtré par fournisseur (watch_region=FR, abonnement) =
 *    disponibilité fournie par JustWatch via TMDB, non garantie.
 *  - Cache local 6 h (métadonnées et chemins de logos, pas les images), délai
 *    maximal 8 s par requête, au plus 2 requêtes discover par service.
 *  - Aucune donnée personnelle envoyée (credentials: 'omit').
 */
(function (root) {
  'use strict';

  var BASE = 'https://api.themoviedb.org/3';
  var IMG = 'https://image.tmdb.org/t/p/';
  var CACHE_KEY = 'tvhub.v6.tmdb';
  var TTL = 6 * 60 * 60 * 1000;
  var PROVIDERS = [8, 119, 337, 350, 381, 283];

  var cache = load();
  var states = {};
  var logoReq = {};

  function load() {
    try {
      var c = JSON.parse(root.localStorage.getItem(CACHE_KEY));
      if (c && c.v === 1 && Date.now() - c.ts < TTL) return c;
    } catch (e) { /* ignore */ }
    return { v: 1, ts: Date.now(), p: {}, logos: {} };
  }
  function save() { try { root.localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch (e) { /* plein ou indisponible */ } }

  function enabled() { return !!root.TMDB_KEY; }

  function fetchJSON(url) {
    var ctl = root.AbortController ? new root.AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 8000);
    return root.fetch(url, { credentials: 'omit', signal: ctl ? ctl.signal : undefined }).then(function (r) {
      clearTimeout(timer);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }, function (e) { clearTimeout(timer); throw e; });
  }

  function api(path) {
    return fetchJSON(BASE + path + (path.indexOf('?') < 0 ? '?' : '&') + 'api_key=' + encodeURIComponent(root.TMDB_KEY));
  }

  function norm(x, kind) {
    var d = kind === 'tv' ? x.first_air_date : x.release_date;
    return { id: x.id, kind: kind, name: kind === 'tv' ? x.name : x.title, year: (d || '').slice(0, 4),
      overview: x.overview || '', backdrop: x.backdrop_path, pop: x.popularity || 0 };
  }

  function loadProvider(p) {
    if (cache.p[p]) { states[p] = 'ok'; return Promise.resolve(); }
    states[p] = 'loading';
    var common = '&watch_region=FR&with_watch_providers=' + p + '&with_watch_monetization_types=flatrate&language=fr-FR&sort_by=popularity.desc&vote_count.gte=50&include_adult=false';
    var since = (new Date().getFullYear() - 2) + '-01-01';
    return Promise.all([
      api('/discover/tv?first_air_date.gte=' + since + common).catch(function () { return null; }),
      api('/discover/movie?primary_release_date.gte=' + since + common).catch(function () { return null; })
    ]).then(function (res) {
      if (!res[0] && !res[1]) { states[p] = 'error'; return; }
      var list = [];
      (res[0] && res[0].results || []).forEach(function (x) { if (x.backdrop_path) list.push(norm(x, 'tv')); });
      (res[1] && res[1].results || []).forEach(function (x) { if (x.backdrop_path) list.push(norm(x, 'movie')); });
      list.sort(function (a, b) { return b.pop - a.pop; });
      cache.p[p] = list.slice(0, 8);
      states[p] = 'ok';
      save();
    });
  }

  /** Charge tous les services, un par un (respect des limites de l'API), et notifie. */
  var busy = false;
  function loadAll(cb) {
    if (!enabled() || busy) return; // un seul chargement à la fois
    busy = true;
    var i = 0;
    (function next() {
      if (i >= PROVIDERS.length) { busy = false; return; }
      loadProvider(PROVIDERS[i++]).then(function () { cb(); next(); }, function () { cb(); next(); });
    })();
  }

  function titles(p) { return cache.p[p] || []; }
  function state(p) { return cache.p[p] ? 'ok' : (states[p] || (enabled() ? 'loading' : 'off')); }

  /** Titre mis en avant pour un service, sans reprendre celui d'un service précédent. */
  function heroFor(p, order) {
    var used = {};
    for (var i = 0; i < order.length; i++) {
      var list = titles(order[i]), pick = null;
      for (var j = 0; j < list.length && !pick; j++) if (!used[list[j].kind + list[j].id]) pick = list[j];
      if (pick) used[pick.kind + pick.id] = 1;
      if (order[i] === p) return pick;
    }
    return titles(p)[0] || null;
  }

  function img(path, size) { return path ? IMG + size + path : ''; }

  function logoCached(t) { var v = cache.logos[t.kind + t.id]; return v ? img(v, 'w500') : null; }

  function logo(t) {
    var k = t.kind + t.id;
    if (k in cache.logos) return Promise.resolve(logoCached(t));
    if (logoReq[k]) return logoReq[k];
    logoReq[k] = api('/' + t.kind + '/' + t.id + '/images?include_image_language=fr,en,null').then(function (j) {
      var ls = (j.logos || []).filter(function (l) { return l.file_path && !/\.svg$/.test(l.file_path); });
      var pick = ls.filter(function (l) { return l.iso_639_1 === 'fr'; })[0] || ls.filter(function (l) { return l.iso_639_1 === 'en'; })[0] || ls[0];
      cache.logos[k] = pick ? pick.file_path : '';
      save();
      return logoCached(t);
    }).catch(function () { delete logoReq[k]; return null; });
    return logoReq[k];
  }

  function clear() {
    cache = { v: 1, ts: Date.now(), p: {}, logos: {} }; states = {}; logoReq = {};
    try { root.localStorage.removeItem(CACHE_KEY); } catch (e) { /* ignore */ }
  }

  root.V6TMDB = { enabled: enabled, loadAll: loadAll, titles: titles, state: state, heroFor: heroFor, img: img,
    logo: logo, logoCached: logoCached, clear: clear, fetchJSON: fetchJSON };
})(this);

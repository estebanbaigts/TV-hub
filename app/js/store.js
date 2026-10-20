/*
 * Préférences locales (ordre des tuiles, favoris, dernier focus).
 * Stockage : localStorage de l'application uniquement. Rien n'est envoyé.
 */
(function (root) {
  'use strict';

  var KEY = 'tvhub.prefs.v1';

  function defaults() {
    return { order: {}, favorites: [], hidden: [], lastFocus: null, theme: null };
  }

  function load() {
    try {
      var raw = root.localStorage && root.localStorage.getItem(KEY);
      if (!raw) return defaults();
      var p = JSON.parse(raw);
      return {
        order: p && typeof p.order === 'object' && p.order ? p.order : {},
        favorites: p && Array.isArray(p.favorites) ? p.favorites : [],
        hidden: p && Array.isArray(p.hidden) ? p.hidden : [],
        lastFocus: p && p.lastFocus ? p.lastFocus : null,
        theme: p && typeof p.theme === 'string' ? p.theme : null
      };
    } catch (e) {
      return defaults();
    }
  }

  function save(prefs) {
    try { root.localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) { /* stockage indisponible */ }
  }

  function reset() {
    try { root.localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
  }

  /** Trie `items` (avec .tid) selon `savedOrder`; les nouveaux restent à la fin, dans leur ordre. */
  function applyOrder(items, savedOrder) {
    if (!savedOrder || !savedOrder.length) return items.slice();
    var rank = {};
    savedOrder.forEach(function (tid, i) { rank[tid] = i; });
    return items
      .map(function (it, i) { return { it: it, i: i }; })
      .sort(function (a, b) {
        var ra = a.it.tid in rank ? rank[a.it.tid] : 1e6 + a.i;
        var rb = b.it.tid in rank ? rank[b.it.tid] : 1e6 + b.i;
        return ra - rb;
      })
      .map(function (x) { return x.it; });
  }

  var api = { load: load, save: save, reset: reset, applyOrder: applyOrder };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TVStore = api;
})(this);

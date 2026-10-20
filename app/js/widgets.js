/*
 * Widgets Météo et Actualités.
 *
 * Réseau (seuls ces sites sont autorisés dans config.xml et la CSP) :
 *  - geocoding-api.open-meteo.com : ville → coordonnées (une fois, puis mis en cache) ;
 *  - api.open-meteo.com           : météo actuelle + 4 jours, toutes les 30 min au plus ;
 *  - www.franceinfo.fr          : flux RSS « Les titres », toutes les 60 min au plus.
 * Aucune clé, aucun compte, aucun identifiant envoyé. Requêtes faites seulement quand
 * l'app est ouverte. Dernières données gardées en cache local pour un affichage immédiat.
 *
 * Position : déduite du fuseau horaire de la TV (ex. Europe/Paris → Paris), sans
 * géolocalisation ni service de localisation par adresse IP.
 */
(function (root) {
  'use strict';

  var CACHE_KEY = 'tvhub.widgets.v1';
  var WEATHER_TTL = 30 * 60 * 1000;
  var NEWS_TTL = 60 * 60 * 1000;
  var NEWS_URL = 'https://www.franceinfo.fr/titres.rss';
  var DEFAULT_CITY = 'Paris';

  // Codes météo WMO (Open-Meteo) → libellé et icône.
  function describe(code) {
    if (code === 0) return { text: 'Ensoleillé', icon: 'sun' };
    if (code === 1 || code === 2) return { text: 'Éclaircies', icon: 'partly' };
    if (code === 3) return { text: 'Couvert', icon: 'cloud' };
    if (code === 45 || code === 48) return { text: 'Brouillard', icon: 'fog' };
    if (code >= 51 && code <= 57) return { text: 'Bruine', icon: 'rain' };
    if (code >= 61 && code <= 67) return { text: 'Pluie', icon: 'rain' };
    if (code >= 71 && code <= 77) return { text: 'Neige', icon: 'snow' };
    if (code >= 80 && code <= 82) return { text: 'Averses', icon: 'rain' };
    if (code === 85 || code === 86) return { text: 'Averses de neige', icon: 'snow' };
    if (code >= 95) return { text: 'Orage', icon: 'storm' };
    return { text: '—', icon: 'cloud' };
  }

  /** Ville déduite d'un fuseau IANA : « Europe/Paris » → « Paris ». */
  function cityFromTimezone(tz) {
    if (!tz || tz.indexOf('/') === -1 || /^Etc\//.test(tz)) return null;
    return tz.split('/').pop().replace(/_/g, ' ');
  }

  /** « il y a 20 min », « il y a 3 h », « hier »… */
  function ago(ms, now) {
    var d = Math.max(0, (now || Date.now()) - ms) / 60000;
    if (d < 1) return 'à l’instant';
    if (d < 60) return 'il y a ' + Math.round(d) + ' min';
    if (d < 24 * 60) return 'il y a ' + Math.round(d / 60) + ' h';
    return 'il y a ' + Math.round(d / 1440) + ' j';
  }

  var ICONS = {
    sun: '<circle cx="32" cy="32" r="12" fill="#ffd34d"/><g stroke="#ffd34d" stroke-width="4" stroke-linecap="round"><path d="M32 6v7M32 51v7M6 32h7M51 32h7M13.6 13.6l5 5M45.4 45.4l5 5M13.6 50.4l5-5M45.4 18.6l5-5"/></g>',
    partly: '<circle cx="24" cy="24" r="10" fill="#ffd34d"/><g stroke="#ffd34d" stroke-width="3.5" stroke-linecap="round"><path d="M24 4v6M4 24h6M9.8 9.8l4.2 4.2M38.2 9.8l-4.2 4.2"/></g><path d="M24 52h24a10 10 0 0 0 1.4-19.9A13.5 13.5 0 0 0 23.6 30 11 11 0 0 0 24 52z" fill="#f1f3ff"/>',
    cloud: '<path d="M20 48h26a11 11 0 0 0 1.6-21.9A15 15 0 0 0 19 24a12 12 0 0 0 1 24z" fill="#e9ecff"/>',
    fog: '<path d="M20 36h26a11 11 0 0 0 1.6-21.9A15 15 0 0 0 19 12a12 12 0 0 0 1 24z" fill="#dfe3f5"/><g stroke="#c9cfe8" stroke-width="4" stroke-linecap="round"><path d="M12 44h40M18 52h28"/></g>',
    rain: '<path d="M20 40h26a11 11 0 0 0 1.6-21.9A15 15 0 0 0 19 16a12 12 0 0 0 1 24z" fill="#dfe4ff"/><g stroke="#7fd0ff" stroke-width="4" stroke-linecap="round"><path d="M24 46l-3 8M34 46l-3 8M44 46l-3 8"/></g>',
    snow: '<path d="M20 40h26a11 11 0 0 0 1.6-21.9A15 15 0 0 0 19 16a12 12 0 0 0 1 24z" fill="#eef1ff"/><g fill="#ffffff"><circle cx="22" cy="50" r="3"/><circle cx="33" cy="54" r="3"/><circle cx="44" cy="50" r="3"/></g>',
    storm: '<path d="M20 38h26a11 11 0 0 0 1.6-21.9A15 15 0 0 0 19 14a12 12 0 0 0 1 24z" fill="#cfd5f0"/><path d="M33 40l-7 12h7l-4 10 12-15h-7l4-7z" fill="#ffd34d"/>'
  };
  function icon(name) { return '<svg viewBox="0 0 64 64" width="1em" height="1em" aria-hidden="true">' + (ICONS[name] || ICONS.cloud) + '</svg>'; }

  // ---------------------------------------------------------------------------
  // Cache et réseau
  // ---------------------------------------------------------------------------

  function loadCache() {
    try { return JSON.parse(root.localStorage.getItem(CACHE_KEY)) || {}; } catch (e) { return {}; }
  }
  function saveCache(c) {
    try { root.localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch (e) { /* stockage indisponible */ }
  }

  function getJSON(url) {
    return root.fetch(url, { credentials: 'omit', cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }
  function getText(url) {
    return root.fetch(url, { credentials: 'omit', cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    });
  }

  function timezone() {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { return null; }
  }

  function locate(cache) {
    var city = cityFromTimezone(timezone()) || DEFAULT_CITY;
    if (cache.place && cache.place.query === city) return Promise.resolve(cache.place);
    var url = 'https://geocoding-api.open-meteo.com/v1/search?count=1&language=fr&format=json&name=' + encodeURIComponent(city);
    return getJSON(url).then(function (j) {
      var r = j && j.results && j.results[0];
      if (!r) throw new Error('ville introuvable');
      cache.place = { query: city, name: r.name, lat: r.latitude, lon: r.longitude };
      saveCache(cache);
      return cache.place;
    });
  }

  function fetchWeather(place) {
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + place.lat.toFixed(3) + '&longitude=' + place.lon.toFixed(3) +
      '&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=5';
    return getJSON(url).then(function (j) {
      return {
        temp: Math.round(j.current.temperature_2m), code: j.current.weather_code,
        days: j.daily.time.map(function (t, i) {
          return { date: t, code: j.daily.weather_code[i], max: Math.round(j.daily.temperature_2m_max[i]), min: Math.round(j.daily.temperature_2m_min[i]) };
        })
      };
    });
  }

  function parseRss(xml) {
    var doc = new root.DOMParser().parseFromString(xml, 'text/xml');
    return Array.prototype.slice.call(doc.getElementsByTagName('item'), 0, 6).map(function (it) {
      function tx(tag) { var n = it.getElementsByTagName(tag)[0]; return n ? n.textContent.trim() : ''; }
      var cat = tx('category');
      var t = Date.parse(tx('pubDate'));
      return { title: tx('title'), category: cat, time: isNaN(t) ? null : t };
    }).filter(function (x) { return x.title; });
  }

  // ---------------------------------------------------------------------------
  // Affichage
  // ---------------------------------------------------------------------------

  var el = {};
  function $(id) { return root.document.getElementById(id); }

  function renderWeather(place, w, ts) {
    var d = describe(w.code);
    el.icon.innerHTML = icon(d.icon);
    el.temp.textContent = w.temp + '°';
    el.cond.textContent = d.text;
    el.place.textContent = place ? place.name : '';
    var today = w.days[0];
    el.range.textContent = today ? 'Min ' + today.min + '° · Max ' + today.max + '°' : '';
    el.forecast.innerHTML = '';
    w.days.slice(1, 5).forEach(function (day) {
      var box = root.document.createElement('div');
      box.className = 'w-day';
      var name = new Date(day.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '');
      box.innerHTML = '<b>' + name.charAt(0).toUpperCase() + name.slice(1) + '</b><div class="w-dico">' + icon(describe(day.code).icon) +
        '</div><span>' + day.max + '°</span>';
      el.forecast.appendChild(box);
    });
    el.wUpdated.textContent = 'Mis à jour ' + ago(ts);
  }

  function renderNews(items, ts) {
    el.list.innerHTML = '';
    if (!items.length) { el.list.innerHTML = '<p class="w-empty">Aucun titre pour le moment.</p>'; return; }
    items.slice(0, +(el.list.getAttribute('data-max') || 4)).forEach(function (n) {
      var row = root.document.createElement('div');
      row.className = 'w-item';
      var src = root.document.createElement('span');
      src.className = 'w-cat';
      src.textContent = n.category || 'Info';
      var body = root.document.createElement('div');
      var t = root.document.createElement('div');
      t.className = 'w-title';
      t.textContent = n.title;
      var when = root.document.createElement('div');
      when.className = 'w-when';
      when.textContent = n.time ? ago(n.time) : '';
      body.appendChild(t);
      body.appendChild(when);
      row.appendChild(src);
      row.appendChild(body);
      el.list.appendChild(row);
    });
    el.nUpdated.textContent = 'Mis à jour ' + ago(ts);
  }

  function weatherError() {
    if (el.temp.textContent === '--°') el.cond.textContent = 'Météo indisponible (pas de connexion ?)';
  }
  function newsError() {
    if (!el.list.querySelector('.w-item')) el.list.innerHTML = '<p class="w-empty">Actualités indisponibles (pas de connexion ?)</p>';
  }

  // ---------------------------------------------------------------------------
  // Cycle
  // ---------------------------------------------------------------------------

  var timers = [];
  var mock = null;

  function refresh(force) {
    var cache = loadCache();
    var now = Date.now();

    if (mock) { // simulation de développement : données fixes, aucun réseau
      renderWeather({ name: mock.place }, mock.weather, now);
      renderNews(mock.news, now);
      return;
    }

    if (cache.weather) renderWeather(cache.place, cache.weather.data, cache.weather.ts);
    if (force || !cache.weather || now - cache.weather.ts > WEATHER_TTL) {
      locate(cache).then(function (place) { return fetchWeather(place).then(function (w) { return [place, w]; }); })
        .then(function (r) { cache.weather = { ts: Date.now(), data: r[1] }; saveCache(cache); renderWeather(r[0], r[1], cache.weather.ts); })
        .catch(weatherError);
    }

    if (cache.news) renderNews(cache.news.items, cache.news.ts);
    if (force || !cache.news || now - cache.news.ts > NEWS_TTL) {
      getText(NEWS_URL).then(parseRss)
        .then(function (items) { cache.news = { ts: Date.now(), items: items }; saveCache(cache); renderNews(items, cache.news.ts); })
        .catch(newsError);
    }
  }

  function start() {
    el = {
      icon: $('wIcon'), temp: $('wTemp'), cond: $('wCond'), place: $('wPlace'), range: $('wRange'),
      forecast: $('wForecast'), wUpdated: $('wWeatherUpdated'), list: $('wNewsList'), nUpdated: $('wNewsUpdated')
    };
    if (!el.temp) return;
    $('wWeatherLabelIco').innerHTML = icon('partly');
    $('wNewsLabelIco').innerHTML = '<svg viewBox="0 0 24 24" width="1em" height="1em"><rect x="3" y="5" width="18" height="14" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M7 9h10M7 12.5h10M7 16h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
    mock = root.__widgetsMock || null;
    refresh(false);
    // Vérification toutes les 5 min : une requête ne part que si la donnée a dépassé sa durée de vie.
    timers.push(root.setInterval(function () { if (!root.document.hidden) refresh(false); }, 5 * 60 * 1000));
    root.document.addEventListener('visibilitychange', function () { if (!root.document.hidden) refresh(false); });
  }

  var api = { start: start, describe: describe, cityFromTimezone: cityFromTimezone, ago: ago, NEWS_URL: NEWS_URL };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TVWidgets = api;
})(this);

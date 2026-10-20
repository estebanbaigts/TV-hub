/* Maquettes v2 : icônes météo (SVG) et DONNÉES D'EXEMPLE des widgets (rien n'est récupéré en ligne). */
(function () {
  'use strict';

  var WX = {
    sun: '<circle cx="32" cy="32" r="12" fill="#ffd34d"/><g stroke="#ffd34d" stroke-width="4" stroke-linecap="round">' +
      '<path d="M32 6v7M32 51v7M6 32h7M51 32h7M13.6 13.6l5 5M45.4 45.4l5 5M13.6 50.4l5-5M45.4 18.6l5-5"/></g>',
    cloud: '<path d="M20 48h26a11 11 0 0 0 1.6-21.9A15 15 0 0 0 19 24a12 12 0 0 0 1 24z" fill="#e9ecff"/>',
    partly: '<circle cx="24" cy="24" r="10" fill="#ffd34d"/><g stroke="#ffd34d" stroke-width="3.5" stroke-linecap="round"><path d="M24 4v6M4 24h6M9.8 9.8l4.2 4.2M38.2 9.8l-4.2 4.2"/></g>' +
      '<path d="M24 52h24a10 10 0 0 0 1.4-19.9A13.5 13.5 0 0 0 23.6 30 11 11 0 0 0 24 52z" fill="#f1f3ff"/>',
    rain: '<path d="M20 40h26a11 11 0 0 0 1.6-21.9A15 15 0 0 0 19 16a12 12 0 0 0 1 24z" fill="#dfe4ff"/>' +
      '<g stroke="#7fd0ff" stroke-width="4" stroke-linecap="round"><path d="M24 46l-3 8M34 46l-3 8M44 46l-3 8"/></g>'
  };

  var DATA = {
    weather: {
      city: 'Paris (exemple)', temp: '14°', cond: 'Éclaircies', icon: 'partly', range: 'Min 9° · Max 16°',
      days: [['Mer', 'sun', '15°'], ['Jeu', 'rain', '12°'], ['Ven', 'partly', '13°'], ['Sam', 'sun', '16°']]
    },
    news: [
      ['Sport', 'Football : le résumé de la journée de championnat', 'il y a 20 min'],
      ['Culture', 'Cinéma : les sorties à ne pas manquer cette semaine', 'il y a 1 h'],
      ['France', 'Météo : un week-end doux attendu sur la moitié nord', 'il y a 2 h'],
      ['Tech', 'Jeux vidéo : les nouveautés du cloud gaming cet automne', 'il y a 3 h']
    ]
  };

  function svg(kind) { return '<svg viewBox="0 0 64 64" width="1em" height="1em" aria-hidden="true">' + (WX[kind] || '') + '</svg>'; }
  var NEWS_ICON = '<svg viewBox="0 0 24 24" width="1em" height="1em"><rect x="3" y="5" width="18" height="14" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M7 9h10M7 12.5h10M7 16h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

  function each(sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); }

  each('[data-wx]', function (n) { n.innerHTML = svg(n.getAttribute('data-wx')); });
  each('[data-w="temp"]', function (n) { n.textContent = DATA.weather.temp; });
  each('[data-w="cond"]', function (n) { n.textContent = DATA.weather.cond; });
  each('[data-w="city"]', function (n) { n.textContent = DATA.weather.city; });
  each('[data-w="range"]', function (n) { n.textContent = DATA.weather.range; });
  each('[data-w="icon"]', function (n) { n.innerHTML = svg(DATA.weather.icon); });
  each('[data-w="forecast"]', function (n) {
    n.innerHTML = DATA.weather.days.map(function (d) {
      return '<div class="day"><b>' + d[0] + '</b><div class="wx">' + svg(d[1]) + '</div><span>' + d[2] + '</span></div>';
    }).join('');
  });
  each('[data-w="news"]', function (n) {
    var max = +(n.getAttribute('data-max') || 4);
    n.innerHTML = DATA.news.slice(0, max).map(function (x) {
      return '<div class="news-item" data-f data-keep data-title="' + x[1].replace(/"/g, '') + '"><span class="src">' + x[0] +
        '</span><div><div class="t">' + x[1] + '</div><div class="when">' + x[2] + '</div></div></div>';
    }).join('');
  });
  each('[data-w="headline"]', function (n) { n.textContent = DATA.news[0][1]; });
  each('[data-icon-news]', function (n) { n.innerHTML = NEWS_ICON; });
})();

/*
 * Illustrations abstraites originales (aucun logo officiel) et icônes de l'interface.
 * SVG statique, généré localement, sans réseau ni filtre ; dessiné une fois par tuile.
 */
(function (root) {
  'use strict';
  var n = 0;

  function wrap(id, defs, body) {
    return '<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">' +
      '<defs>' + defs + '</defs>' + body + '</svg>';
  }
  function lin(id, a, b, x2, y2) {
    return '<linearGradient id="' + id + '" x1="0" y1="0" x2="' + (x2 || 1) + '" y2="' + (y2 || 1) + '">' +
      '<stop offset="0" stop-color="' + a + '"/><stop offset="1" stop-color="' + b + '"/></linearGradient>';
  }
  function rad(id, a, b, cx, cy, r) {
    return '<radialGradient id="' + id + '" cx="' + (cx || 0.5) + '" cy="' + (cy || 0.5) + '" r="' + (r || 0.6) + '">' +
      '<stop offset="0" stop-color="' + a + '"/><stop offset="1" stop-color="' + b + '"/></radialGradient>';
  }

  var ART = {
    luna: function (u) {
      var stars = '';
      var pts = [[180, 140], [420, 90], [640, 210], [260, 380], [120, 620], [520, 700], [760, 120], [1460, 760], [1380, 140], [980, 820]];
      pts.forEach(function (p, i) { stars += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + (i % 3 ? 2.5 : 4) + '" fill="#fff" opacity="' + (i % 2 ? 0.5 : 0.8) + '"/>'; });
      return wrap(u, lin('b' + u, '#0b0726', '#4a2ad8') + rad('m' + u, '#f4efff', '#b9a6ff', 0.35, 0.3, 0.8),
        '<rect width="1600" height="900" fill="url(#b' + u + ')"/>' + stars +
        '<ellipse cx="1080" cy="450" rx="560" ry="150" fill="none" stroke="#fff" stroke-opacity="0.18" stroke-width="3" transform="rotate(-18 1080 450)"/>' +
        '<ellipse cx="1080" cy="450" rx="700" ry="210" fill="none" stroke="#fff" stroke-opacity="0.08" stroke-width="2" transform="rotate(-18 1080 450)"/>' +
        '<circle cx="1080" cy="450" r="250" fill="url(#m' + u + ')"/>' +
        '<circle cx="1180" cy="390" r="230" fill="#2a1780"/>' +
        '<circle cx="1180" cy="390" r="230" fill="url(#b' + u + ')" opacity="0.6"/>');
    },
    xbox: function (u) {
      return wrap(u, rad('b' + u, '#2fd158', '#04140a', 0.65, 0.45, 0.75) + rad('s' + u, '#eafff0', '#1d8f3a', 0.4, 0.35, 0.7),
        '<rect width="1600" height="900" fill="url(#b' + u + ')"/>' +
        '<circle cx="1060" cy="450" r="300" fill="url(#s' + u + ')" opacity="0.95"/>' +
        '<path d="M700 900 C 900 600, 1150 520, 1600 420 L1600 520 C 1180 600, 960 700, 840 900 Z" fill="#04140a" opacity="0.55"/>' +
        '<path d="M520 0 C 760 260, 1000 330, 1600 300 L1600 360 C 1000 400, 720 320, 440 0 Z" fill="#ffffff" opacity="0.10"/>' +
        '<circle cx="1060" cy="450" r="380" fill="none" stroke="#b7ffc9" stroke-opacity="0.15" stroke-width="2"/>');
    },
    gaminghub: function (u) {
      var cells = '';
      for (var r = 0; r < 4; r++) for (var c = 0; c < 6; c++) {
        var x = 640 + c * 160, y = 120 + r * 170, hot = (r === 1 && c === 2);
        var op = hot ? 1 : 0.12 + ((r * 7 + c * 3) % 5) * 0.07;
        cells += '<rect x="' + x + '" y="' + y + '" width="132" height="142" rx="30" fill="' + (hot ? 'url(#h' + u + ')' : '#9cc0ff') + '" opacity="' + op.toFixed(2) + '"/>';
      }
      return wrap(u, lin('b' + u, '#06122e', '#1f4fc2') + lin('h' + u, '#ffffff', '#8fb4ff'),
        '<rect width="1600" height="900" fill="url(#b' + u + ')"/>' + cells);
    },
    geforce: function (u) {
      var l = '';
      for (var i = 0; i < 9; i++) {
        var o = i * 70;
        l += '<path d="M' + (700 + o) + ' 900 L' + (1150 + o) + ' 450 L' + (700 + o) + ' 0" fill="none" stroke="#c6ff4d" stroke-width="10" stroke-opacity="' + (0.9 - i * 0.09).toFixed(2) + '"/>';
      }
      return wrap(u, lin('b' + u, '#0a1200', '#3d6b00'), '<rect width="1600" height="900" fill="url(#b' + u + ')"/>' + l);
    },
    netflix: function (u) {
      var rib = '';
      for (var i = 0; i < 14; i++) {
        var x = 560 + i * 74, h = 900 - Math.abs(7 - i) * 38;
        rib += '<rect x="' + x + '" y="' + (900 - h) + '" width="58" height="' + h + '" rx="29" fill="url(#r' + u + ')" opacity="' + (0.35 + (i % 4) * 0.15).toFixed(2) + '"/>';
      }
      return wrap(u, lin('b' + u, '#0b0000', '#3a0004') + lin('r' + u, '#ff2a36', '#5a0007', 0, 1),
        '<rect width="1600" height="900" fill="url(#b' + u + ')"/>' + rib +
        '<ellipse cx="1080" cy="930" rx="620" ry="160" fill="#ff3b45" opacity="0.35"/>');
    },
    youtube: function (u) {
      var frames = '';
      for (var i = 0; i < 4; i++) {
        frames += '<rect x="' + (760 + i * 60) + '" y="' + (190 + i * 60) + '" width="560" height="340" rx="48" fill="#fff" opacity="' + (0.06 + i * 0.07).toFixed(2) + '"/>';
      }
      return wrap(u, lin('b' + u, '#1a0303', '#c81e1e'),
        '<rect width="1600" height="900" fill="url(#b' + u + ')"/>' + frames +
        '<circle cx="1220" cy="550" r="96" fill="#fff" opacity="0.95"/>' +
        '<path d="M1196 505 L1270 550 L1196 595 Z" fill="#c81e1e"/>');
    },
    canal: function (u) {
      var sq = '';
      for (var i = 0; i < 6; i++) {
        var s = 160 + i * 110;
        sq += '<rect x="' + (1100 - s / 2) + '" y="' + (450 - s / 2) + '" width="' + s + '" height="' + s + '" rx="' + (24 + i * 6) + '" fill="none" stroke="#fff" stroke-opacity="' + (0.5 - i * 0.07).toFixed(2) + '" stroke-width="3"/>';
      }
      return wrap(u, lin('b' + u, '#050505', '#3a3a3a'),
        '<rect width="1600" height="900" fill="url(#b' + u + ')"/>' + sq +
        '<rect x="1086" y="390" width="28" height="120" rx="6" fill="#fff"/><rect x="1040" y="436" width="120" height="28" rx="6" fill="#fff"/>');
    },
    crunchyroll: function (u) {
      var rays = '';
      for (var i = 0; i < 18; i++) {
        var a = -Math.PI + i * (Math.PI / 17), x = 1250 + Math.cos(a) * 1400, y = 760 + Math.sin(a) * 1400;
        rays += '<line x1="1250" y1="760" x2="' + x.toFixed(0) + '" y2="' + y.toFixed(0) + '" stroke="#ffd2a8" stroke-opacity="' + (i % 2 ? 0.08 : 0.16) + '" stroke-width="' + (i % 2 ? 30 : 60) + '"/>';
      }
      return wrap(u, lin('b' + u, '#2a0d00', '#f47521') + rad('s' + u, '#fff3e6', '#ff9a4a', 0.4, 0.4, 0.7),
        '<rect width="1600" height="900" fill="url(#b' + u + ')"/>' + rays +
        '<circle cx="1250" cy="760" r="210" fill="url(#s' + u + ')"/>');
    },
    prime: function (u) {
      var w = '';
      for (var i = 0; i < 8; i++) {
        var y = 300 + i * 70;
        w += '<path d="M500 ' + y + ' C 800 ' + (y - 160) + ', 1100 ' + (y + 160) + ', 1600 ' + (y - 40) + '" fill="none" stroke="#7fd0ff" stroke-width="' + (4 + i) + '" stroke-opacity="' + (0.12 + i * 0.08).toFixed(2) + '"/>';
      }
      return wrap(u, lin('b' + u, '#00101f', '#0a5aa8'), '<rect width="1600" height="900" fill="url(#b' + u + ')"/>' + w);
    },
    apps: function (u) {
      var d = '';
      for (var r = 0; r < 5; r++) for (var c = 0; c < 8; c++) {
        d += '<rect x="' + (620 + c * 120) + '" y="' + (150 + r * 130) + '" width="84" height="84" rx="22" fill="#fff" opacity="' + (0.05 + ((r + c) % 4) * 0.05).toFixed(2) + '"/>';
      }
      return wrap(u, lin('b' + u, '#0c0c0e', '#2c2c32'), '<rect width="1600" height="900" fill="url(#b' + u + ')"/>' + d);
    },
    home: function (u) {
      var r = '';
      for (var i = 0; i < 5; i++) {
        r += '<rect x="' + (840 + i * 40) + '" y="' + (190 + i * 40) + '" width="' + (520 - i * 80) + '" height="' + (520 - i * 80) + '" rx="' + (90 - i * 12) + '" fill="none" stroke="#9fb6ff" stroke-opacity="' + (0.15 + i * 0.12).toFixed(2) + '" stroke-width="3"/>';
      }
      return wrap(u, lin('b' + u, '#05070f', '#1b2340'), '<rect width="1600" height="900" fill="url(#b' + u + ')"/>' + r);
    },
    // Illustration générique, teintée à la couleur du service.
    tint: function (u, accent) {
      var c = accent || '#8e8e93', r = '';
      for (var i = 0; i < 6; i++) {
        r += '<circle cx="1180" cy="450" r="' + (120 + i * 90) + '" fill="none" stroke="' + c + '" stroke-opacity="' + (0.5 - i * 0.07).toFixed(2) + '" stroke-width="3"/>';
      }
      return wrap(u, lin('b' + u, '#0a0a0c', '#26262c') + rad('g' + u, c, '#0a0a0c', 0.74, 0.5, 0.5),
        '<rect width="1600" height="900" fill="url(#b' + u + ')"/><rect width="1600" height="900" fill="url(#g' + u + ')" opacity="0.55"/>' + r);
    }
  };
  var ALIAS = { geforcenow: 'geforce' };

  /** SVG d'un service ; `accent` sert à l'illustration générique si le service n'en a pas. */
  function svg(key, accent, align) {
    var k = ALIAS[key] || key;
    var s = ART[k] && k !== 'tint' ? ART[k]('a' + (n++)) : ART.tint('a' + (n++), accent);
    return align ? s.replace('xMidYMid slice', align + ' slice') : s;
  }
  function has(key) { return !!ART[ALIAS[key] || key]; }

  var ICON = {
    play: '<path d="M7 5l12 7-12 7z" fill="currentColor"/>',
    plus: '<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
    pad: '<path d="M7 8h10a4 4 0 014 4.5l-.6 3A2.5 2.5 0 0116 16.5L14.5 15h-5L8 16.5a2.5 2.5 0 01-4.4-1l-.6-3A4 4 0 017 8z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M8 11v3M6.5 12.5h3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="15.5" cy="11.5" r="1" fill="currentColor"/><circle cx="17.5" cy="13.5" r="1" fill="currentColor"/>',
    tv: '<rect x="3" y="5" width="18" height="12" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M9 20h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    star: '<path d="M12 4l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.4 7.2 18.9l.9-5.4L4.2 9.7l5.4-.8z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
    grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.8" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.8" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.8" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.8" fill="none" stroke="currentColor" stroke-width="1.8"/>',
    home: '<path d="M4 11l8-6.5 8 6.5V19a1 1 0 01-1 1h-4.5v-5h-5v5H5a1 1 0 01-1-1z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
    gear: '<circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4L18 18M6 18l1.6-1.6M16.4 7.6L18 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    cloud: '<path d="M7.5 18h9a4 4 0 00.6-7.95A5.5 5.5 0 006.6 9.1 4.5 4.5 0 007.5 18z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>'
  };
  function icon(name) {
    return '<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true">' + (ICON[name] || '') + '</svg>';
  }

  var api = { svg: svg, has: has, icon: icon };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TVArt = api;
})(this);

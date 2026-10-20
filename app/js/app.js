/*
 * Accueil+ — contrôleur de l'interface (design « Verre »).
 * Zones : 'content' (rangées) et 'rail' (raccourcis de section, à gauche).
 * Une carte « à la une » montre en grand l'app focalisée ; les widgets sont gérés par widgets.js.
 * Modes : 'browse' (OK = ouvrir), 'edit' (OK = options de tuile), 'move' (←/→ déplacent la tuile).
 */
(function () {
  'use strict';

  var P = window.TVPlatform, S = window.TVStore, C = window.TVCatalog, N = window.TVNav, A = window.TVArt;
  var K = P.KEYS;

  var ROW_DEFS = [
    // Rangées en carrousel horizontal. (Option `cols: n` : grille qui passe à la ligne.)
    { id: 'games', title: 'Jouer', size: 'md', orderable: true },
    { id: 'streaming', title: 'Regarder', size: 'md', orderable: true },
    { id: 'favorites', title: 'Mes applications', size: 'md', orderable: true },
    { id: 'all', title: 'Toutes les applications', size: 'sm', orderable: false },
    { id: 'system', title: 'Réglages', size: 'pill', orderable: false }
  ];

  // Rail : une entrée par rangée, plus le retour à l'accueil Samsung.
  var RAIL = [
    { row: 'games', icon: 'pad', label: 'Jouer' },
    { row: 'streaming', icon: 'tv', label: 'Regarder' },
    { row: 'favorites', icon: 'star', label: 'Mes applications' },
    { row: 'all', icon: 'grid', label: 'Toutes les applications' },
    { row: 'system', icon: 'gear', label: 'Réglages' },
    { action: 'samsung', icon: 'home', label: 'Accueil Samsung' }
  ];

  var THEMES = [
    { id: 'nuit', label: 'Nuit' },
    { id: 'graphite', label: 'Graphite' },
    { id: 'aube', label: 'Aube' }
  ];

  // Zone des rangées : de 710 px (après les widgets) à 1810 px (marge droite).
  var VIEW_W = 1920 - 710 - 110;
  var PEEK = 90; // part visible de la carte voisine quand la rangée défile

  var state = {
    prefs: S.load(),
    discovery: { ok: false, reason: 'pending', apps: [] },
    services: [],
    rows: [],
    nav: null,
    zone: 'content',
    railIndex: 0,
    mode: 'browse',
    moving: null,
    sheet: null,
    launching: false,
    scrollX: {}
  };

  var el = {
    rows: document.getElementById('rows'),
    sections: null,   // conteneur des rangées (après la carte « à la une »)
    hero: null,
    rail: document.getElementById('rail'),
    hints: document.getElementById('hints'),
    badge: document.getElementById('modeBadge'),
    hello: document.getElementById('clockHello'),
    time: document.getElementById('clockTime'),
    date: document.getElementById('clockDate'),
    toast: document.getElementById('toast'),
    backdrop: document.getElementById('sheetBackdrop'),
    sheetTitle: document.getElementById('sheetTitle'),
    sheetBody: document.getElementById('sheetBody'),
    sheetActions: document.getElementById('sheetActions')
  };

  // ---------------------------------------------------------------------------
  // Modèle
  // ---------------------------------------------------------------------------

  function serviceTile(svc) {
    return {
      tid: 'svc:' + svc.key, kind: 'service', label: svc.label, accent: svc.accent, art: svc.key,
      appId: svc.app ? svc.app.id : null, iconPath: svc.app ? svc.app.iconPath : '',
      status: svc.app ? 'ready' : 'missing', svc: svc
    };
  }

  function appTile(app) {
    return {
      tid: 'app:' + app.id, kind: 'app', label: app.name, accent: '#8e8e93', art: null,
      appId: app.id, iconPath: app.iconPath, status: 'ready'
    };
  }

  function actionTile(id, label, icon, run) {
    return { tid: 'act:' + id, kind: 'action', label: label, icon: icon, accent: '#8e8e93', status: 'ready', run: run };
  }

  function buildRows() {
    var apps = state.discovery.apps;
    var byTid = {};
    apps.forEach(function (a) { byTid['app:' + a.id] = appTile(a); });

    function sectionTiles(section) {
      return state.services
        .filter(function (s) { return s.section === section && (s.app || !s.optional); })
        .map(serviceTile);
    }

    var order = state.prefs.order;
    var hidden = state.prefs.hidden;
    function visible(t) { return hidden.indexOf(t.tid) === -1; }
    var rows = {
      games: S.applyOrder(sectionTiles('games'), order.games).filter(visible),
      streaming: S.applyOrder(sectionTiles('streaming'), order.streaming).filter(visible),
      favorites: state.prefs.favorites
        .filter(function (tid) { return byTid[tid] && hidden.indexOf(tid) === -1; })
        .map(function (tid) { return byTid[tid]; }),
      all: apps.map(appTile).filter(visible),
      system: [
        actionTile('edit', state.mode === 'browse' ? 'Personnaliser' : 'Terminer', 'star', toggleEdit),
        actionTile('theme', 'Thème : ' + currentTheme().label, 'tv', cycleTheme),
        actionTile('status', 'État des services', 'grid', showStatus),
        actionTile('samsung', 'Accueil Samsung', 'home', quitToSamsung),
        hidden.length ? actionTile('unhide', 'Réafficher les apps masquées (' + hidden.length + ')', 'grid', unhideAll) : null,
        actionTile('reset', 'Réinitialiser', 'gear', confirmReset)
      ].filter(Boolean)
    };
    // Une section en grille devient plusieurs lignes de navigation (même def, `first`/`last`).
    state.rows = [];
    ROW_DEFS.forEach(function (def) {
      var items = rows[def.id];
      if (!def.cols || items.length <= def.cols) {
        state.rows.push({ def: def, items: items, first: true, last: true });
        return;
      }
      for (var i = 0; i < items.length; i += def.cols) {
        state.rows.push({ def: def, items: items.slice(i, i + def.cols), first: i === 0, last: i + def.cols >= items.length });
      }
    });
  }

  function isFavorite(tid) { return state.prefs.favorites.indexOf(tid) !== -1; }

  function currentTile() {
    var p = state.nav.get();
    if (p.r < 0) return null;
    return state.rows[p.r].items[p.c] || null;
  }

  function findTile(tid) {
    for (var r = 0; r < state.rows.length; r++) {
      for (var c = 0; c < state.rows[r].items.length; c++) {
        if (state.rows[r].items[c].tid === tid) return { r: r, c: c };
      }
    }
    return null;
  }

  function rowIndex(id) {
    for (var i = 0; i < state.rows.length; i++) if (state.rows[i].def.id === id) return i;
    return -1;
  }

  function firstReadyTid() {
    for (var r = 0; r < state.rows.length; r++) {
      for (var c = 0; c < state.rows[r].items.length; c++) {
        var t = state.rows[r].items[c];
        if (t.status === 'ready' && t.kind !== 'action') return t.tid;
      }
    }
    return null;
  }

  /** Toutes les tuiles d'une section, toutes lignes confondues. */
  function sectionItems(id) {
    var out = [];
    state.rows.forEach(function (r) { if (r.def.id === id) out = out.concat(r.items); });
    return out;
  }

  function saveSectionOrder(id, list) {
    var tids = list.map(function (t) { return t.tid; });
    if (id === 'favorites') state.prefs.favorites = tids;
    else state.prefs.order[id] = tids;
    S.save(state.prefs);
  }

  // ---------------------------------------------------------------------------
  // Rendu
  // ---------------------------------------------------------------------------

  function h(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }

  function monogram(label) {
    var words = label.replace(/[^A-Za-z0-9+ ]/g, ' ').trim().split(/\s+/);
    if (!words[0]) return '?';
    return words.length > 1 ? (words[0][0] + words[1][0]).toUpperCase() : label.slice(0, 2).toUpperCase();
  }

  var badIcons = {}; // icônes déjà en échec : on ne les redemande pas à chaque rendu
  function iconSrc(path) {
    if (!path || /^https?:/.test(path) || badIcons[path]) return ''; // jamais de réseau
    if (/^(file:|data:)/.test(path)) return path;
    return path.charAt(0) === '/' ? 'file://' + path : '';
  }

  /** #rrggbb → rgba(r,g,b,a) */
  function hexA(hex, a) {
    var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || '');
    if (!m) return 'rgba(255,255,255,' + a + ')';
    return 'rgba(' + parseInt(m[1], 16) + ',' + parseInt(m[2], 16) + ',' + parseInt(m[3], 16) + ',' + a + ')';
  }

  /** Teinte vive et stable pour une app sans illustration (dérivée de son nom). */
  function hueOf(label) {
    var x = 2166136261; // FNV-1a : deux noms voisins donnent des teintes éloignées
    for (var i = 0; i < label.length; i++) { x ^= label.charCodeAt(i); x = Math.imul(x, 16777619); }
    return Math.round(((x >>> 0) * 137.508) % 360);
  }

  /** Variables de couleur posées une seule fois sur la tuile : fond, halo de focus. */
  function paint(node, tile) {
    if (tile.art) {
      node.style.setProperty('--ring', hexA(tile.accent, 0.45));
      node.style.setProperty('--tint', tile.accent);
      node.style.setProperty('--tint-a', tile.accent);
      node.style.setProperty('--tint-b', hexA(tile.accent, 0.35));
    } else {
      var hue = hueOf(tile.label);
      node.style.setProperty('--tint-a', 'hsl(' + hue + ',85%,62%)');
      node.style.setProperty('--tint-b', 'hsl(' + ((hue + 40) % 360) + ',72%,40%)');
      node.style.setProperty('--ring', 'hsla(' + hue + ',90%,70%,0.45)');
    }
  }

  /**
   * Couleur dominante d'une icône chargée (moyenne des pixels opaques, ravivée).
   * Peut échouer si le navigateur interdit la lecture de l'image : on garde alors la teinte par défaut.
   */
  var colorCache = {};
  function dominant(img) {
    if (colorCache[img.src] !== undefined) return colorCache[img.src];
    var out = null;
    try {
      var c = document.createElement('canvas');
      c.width = c.height = 12;
      var g = c.getContext('2d');
      g.drawImage(img, 0, 0, 12, 12);
      var d = g.getImageData(0, 0, 12, 12).data, r = 0, gr = 0, b = 0, n = 0;
      for (var i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 128) continue;
        var mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]);
        if (mx > 235 && mn > 235) continue; // blanc (souvent le pictogramme) : ignoré
        r += d[i]; gr += d[i + 1]; b += d[i + 2]; n++;
      }
      if (n) out = [Math.round(r / n), Math.round(gr / n), Math.round(b / n)];
    } catch (e) { out = null; }
    colorCache[img.src] = out;
    return out;
  }

  function tintFromIcon(node, img) {
    var c = dominant(img);
    if (!c) return;
    node.style.setProperty('--tint-a', 'rgb(' + c.join(',') + ')');
    node.style.setProperty('--tint-b', 'rgb(' + c.map(function (v) { return Math.round(v * 0.35); }).join(',') + ')');
    node.style.setProperty('--ring', 'rgba(' + c.join(',') + ',0.5)');
  }

  /**
   * Visuel d'une tuile : l'icône fournie par la TV (fichier local) si elle existe,
   * sinon l'illustration du service, sinon un monogramme. En cas d'erreur de chargement
   * de l'icône, on bascule sur le secours.
   */
  function visual(container, tile, align, tintNode) {
    var src = iconSrc(tile.iconPath);
    function fallback() {
      container.classList.remove('has-icon');
      container.insertBefore(artNode(tile, align), container.firstChild);
      if (!tile.art) container.insertBefore(h('div', 'mono', monogram(tile.label)), container.children[1] || null);
    }
    if (!src) { fallback(); return; }
    container.classList.add('has-icon');
    var img = document.createElement('img');
    img.className = 'icon';
    img.alt = '';
    img.onerror = function () { badIcons[tile.iconPath] = true; img.remove(); fallback(); };
    if (tintNode) img.onload = function () { tintFromIcon(tintNode, img); };
    img.src = src;
    container.insertBefore(img, container.firstChild);
  }

  function artNode(tile, align) {
    var art = h('div', 'art');
    if (tile.art) art.innerHTML = A.svg(tile.art, tile.accent, align);
    else art.className = 'art plain';
    return art;
  }

  function chips(list, warn) {
    var box = h('div', 'chips');
    list.forEach(function (m) { box.appendChild(h('span', '', m)); });
    if (warn) box.appendChild(h('span', 'warn', warn));
    return box;
  }

  function renderCardTile(tile, def) {
    var node = h('div', 'tile tile-' + def.size + ' is-' + tile.status + ' kind-' + tile.kind);
    node.setAttribute('data-tid', tile.tid);
    paint(node, tile);
    var card = h('div', 'card');
    var pic = h('div', 'pic');
    visual(pic, tile, null, node);
    card.appendChild(pic);
    card.appendChild(h('div', 'name', tile.label));

    if (tile.status === 'missing') card.appendChild(h('div', 'tag', 'Non détectée'));
    else if (state.mode !== 'browse' && def.id !== 'favorites' && isFavorite(tile.tid)) card.appendChild(h('div', 'tag tag-fav', 'Favori'));
    node.appendChild(card);
    return node;
  }

  // ---------------------------------------------------------------------------
  // Carte « à la une »
  // ---------------------------------------------------------------------------

  function renderHero() {
    var hero = h('section', 'hero');
    hero.innerHTML = '<div class="hero-pic"></div><div class="hero-text"><div class="hero-kind"></div>' +
      '<div class="hero-title"></div><div class="hero-sub"></div><div class="hero-ok"><b>OK</b><span></span></div></div>';
    el.hero = {
      root: hero, pic: hero.querySelector('.hero-pic'), kind: hero.querySelector('.hero-kind'),
      title: hero.querySelector('.hero-title'), sub: hero.querySelector('.hero-sub'), ok: hero.querySelector('.hero-ok span'),
      tid: null
    };
    return hero;
  }

  var heroTimer = null;
  function setHero(tile, instant) {
    if (!el.hero || !tile || tile.kind === 'action') return;
    clearTimeout(heroTimer);
    function apply() {
      if (el.hero.tid === tile.tid) return;
      el.hero.tid = tile.tid;
      var H = el.hero, svc = tile.svc || {};
      paint(H.root, tile);
      H.pic.innerHTML = '';
      var src = iconSrc(tile.iconPath);
      if (tile.art) H.pic.appendChild(artNode(tile));
      if (src) {
        var img = document.createElement('img');
        img.className = 'hero-icon';
        img.alt = '';
        img.onload = function () { if (!tile.art) tintFromIcon(H.root, img); };
        img.onerror = function () { badIcons[tile.iconPath] = true; img.remove(); };
        img.src = src;
        H.pic.appendChild(img);
      } else if (!tile.art) {
        H.pic.appendChild(h('div', 'mono', monogram(tile.label)));
      }
      var section = svc.section === 'games' ? 'Jouer' : svc.section === 'streaming' ? 'Regarder' : 'Application';
      H.kind.textContent = tile.status === 'missing' ? section + ' · non détectée' : section;
      H.title.textContent = tile.label;
      H.sub.textContent = tile.status === 'missing' ? 'Non trouvée parmi les applications installées.' : (svc.blurb || 'Votre application.');
      H.ok.textContent = tile.status === 'missing' ? 'En savoir plus' : (state.mode === 'browse' ? 'Ouvrir' : 'Options');
    }
    if (instant) apply(); else heroTimer = setTimeout(apply, 120); // navigation rapide : une seule mise à jour
  }

  function renderPill(tile) {
    var node = h('div', 'tile tile-pill');
    node.setAttribute('data-tid', tile.tid);
    node.innerHTML = A.icon(tile.icon);
    node.appendChild(document.createTextNode(tile.label));
    return node;
  }

  function render() {
    var frag = document.createDocumentFragment();
    var heroTid = el.hero && el.hero.tid;
    el.rows.innerHTML = '';
    el.rows.appendChild(renderHero());
    el.sections = h('div', 'sections');
    el.rows.appendChild(el.sections);
    state.rows.forEach(function (row, r) {
      var section = h('section', 'row row-' + row.def.id + (row.first ? '' : ' is-cont') + (row.last ? '' : ' is-notlast'));
      section.setAttribute('data-row', r);
      if (!row.items.length) section.classList.add('is-empty');

      if (row.first) {
        var title = h('h2', 'row-title', row.def.title);
        if (row.def.sub) title.appendChild(h('span', '', ' · ' + row.def.sub));
        section.appendChild(title);
      }

      if (!row.items.length) section.appendChild(h('p', 'row-empty', emptyMessage(row.def.id)));

      var track = h('div', 'track');
      row.items.forEach(function (tile) {
        var n = row.def.size === 'pill' ? renderPill(tile) : renderCardTile(tile, row.def);
        track.appendChild(n);
      });
      section.appendChild(track);
      frag.appendChild(section);
    });
    el.sections.appendChild(frag);
    state.scrollX = {};
    lastFocused = null;
    var keep = heroTid && findTile(heroTid);
    var first = keep ? state.rows[keep.r].items[keep.c] : (state.rows[0].items[0] || null);
    if (first) setHero(first, true);

    renderRail();
    updateFocus(true);
    renderChrome();
  }

  function renderRail() {
    el.rail.innerHTML = '';
    RAIL.forEach(function (item) {
      var n = h('div', 'ri');
      n.innerHTML = A.icon(item.icon);
      n.appendChild(h('span', 'tip', item.label));
      el.rail.appendChild(n);
    });
  }

  function emptyMessage(id) {
    if (id === 'favorites') {
      return state.mode === 'browse'
        ? 'Ajoutez vos applications avec « Personnaliser ».'
        : 'Dans « Toutes les applications », appuyez sur OK pour ajouter un favori.';
    }
    if (id === 'all') {
      if (state.discovery.reason === 'pending') return 'Recherche des applications…';
      if (!state.discovery.ok && state.discovery.reason === 'no-tizen') {
        return 'Aperçu hors TV : la liste des applications n’est disponible que sur le téléviseur.';
      }
      if (!state.discovery.ok) return 'Le système n’a pas fourni la liste des applications (' + state.discovery.reason + ').';
      return 'Aucune application listée par le système.';
    }
    return '';
  }

  function renderChrome() {
    el.badge.hidden = state.mode === 'browse';
    el.badge.textContent = state.mode === 'move' ? 'Déplacement' : 'Personnalisation';
    document.body.classList.toggle('mode-edit', state.mode !== 'browse');
    document.body.classList.toggle('mode-move', state.mode === 'move');

    var hints;
    if (state.sheet) hints = [['←  →', 'Choisir'], ['OK', 'Valider'], ['Retour', 'Fermer']];
    else if (state.mode === 'move') hints = [['←  →', 'Déplacer'], ['OK', 'Terminer']];
    else if (state.mode === 'edit') hints = [['OK', 'Options'], ['A', 'Terminer'], ['Retour', 'Terminer']];
    else hints = null; // en navigation, l'aide reste masquée (elle recouvrirait les rangées)
    el.hints.hidden = !hints;
    if (!hints) return;

    el.hints.innerHTML = '';
    hints.forEach(function (x) {
      var s = h('span', 'hint');
      s.appendChild(h('kbd', '', x[0]));
      s.appendChild(document.createTextNode(x[1]));
      el.hints.appendChild(s);
    });
  }

  var lastFocused = null;

  function updateFocus(instant) {
    var p = state.nav.get();
    if (lastFocused) lastFocused.classList.remove('is-focused');
    lastFocused = null;

    // Rail
    var activeRow = p.r;
    Array.prototype.forEach.call(el.rail.children, function (n, i) {
      n.classList.toggle('is-focused', state.zone === 'rail' && i === state.railIndex);
      n.classList.toggle('is-current', RAIL[i].row !== undefined && !!state.rows[activeRow] && state.rows[activeRow].def.id === RAIL[i].row);
    });
    if (p.r < 0) return;

    var section = el.sections.children[p.r];
    var track = section.querySelector('.track');
    var node = track.children[p.c];
    var tile = state.rows[p.r].items[p.c];
    Array.prototype.forEach.call(el.sections.children, function (s, i) { s.classList.toggle('is-active', i === p.r); });

    if (state.zone === 'content' && node) {
      node.classList.add('is-focused');
      lastFocused = node;
      setHero(tile, instant);
      // Le focus provisoire d'avant la détection ne doit pas écraser le focus mémorisé.
      if (state.discovery.reason !== 'pending') state.prefs.lastFocus = tile.tid;
    }

    // Défilement horizontal : les premières cartes sortent à gauche pour révéler les suivantes.
    // Positions mesurées depuis le début de la rangée ; une carte voisine dépasse toujours un peu (PEEK).
    if (node) {
      var x = state.scrollX[p.r] || 0;
      var n = state.rows[p.r].items.length;
      var left = node.offsetLeft - track.children[0].offsetLeft;
      var right = left + node.offsetWidth;
      var last = track.children[n - 1].offsetLeft - track.children[0].offsetLeft + track.children[n - 1].offsetWidth;
      var peekL = p.c > 0 ? PEEK : 0, peekR = p.c < n - 1 ? PEEK : 0;
      if (left - peekL - x < 0) x = left - peekL;
      else if (right + peekR - x > VIEW_W) x = right + peekR - VIEW_W;
      x = Math.max(0, Math.min(x, Math.max(0, last - VIEW_W)));
      state.scrollX[p.r] = x;
      track.style.transform = 'translate3d(' + (-x) + 'px,0,0)';
    }

    // Défilement vertical : 1re rangée → la carte « à la une » reste visible ;
    // ensuite, la rangée active passe en haut de la zone (les rangées au-dessus sortent entièrement).
    var y = p.r === 0 ? 0 : Math.max(0, section.offsetTop - 18);
    el.rows.style.transform = 'translate3d(0,' + (-y) + 'px,0)';
    if (instant) {
      el.rows.classList.add('no-anim');
      if (track) track.classList.add('no-anim');
      void el.rows.offsetWidth;
      el.rows.classList.remove('no-anim');
      if (track) track.classList.remove('no-anim');
    }

  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  var toastTimer = null;
  function toast(msg, kind) {
    el.toast.textContent = msg;
    el.toast.className = 'toast is-visible' + (kind ? ' toast-' + kind : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.toast.className = 'toast'; }, 3200);
  }

  function launchTile(tile) {
    if (state.launching) return;
    if (!tile.appId) {
      openSheet(tile.label + ' — non disponible ici',
        tile.svc && tile.svc.missing ? tile.svc.missing : 'Cette application n’a pas été trouvée sur le téléviseur.',
        missingActions(tile));
      return;
    }
    state.launching = true;
    var node = lastFocused;
    if (node) node.classList.add('is-launching');
    toast('Ouverture de ' + tile.label + '…');
    S.save(state.prefs);
    P.launch(tile.appId, function () {
      state.launching = false;
      if (node) node.classList.remove('is-launching');
    }, function (err) {
      state.launching = false;
      if (node) node.classList.remove('is-launching');
      toast('Impossible d’ouvrir ' + tile.label + ' (' + err.name + ').', 'error');
    });
  }

  function missingActions(tile) {
    var actions = [];
    var hub = state.services.filter(function (s) { return s.key === 'gaminghub' && s.app; })[0];
    if (hub && tile.svc && tile.svc.section === 'games' && tile.svc.key !== 'gaminghub') {
      actions.push({ label: 'Ouvrir Gaming Hub', run: function () { closeSheet(); launchTile(serviceTile(hub)); } });
    }
    actions.push({ label: 'Fermer', run: closeSheet });
    return actions;
  }

  function currentTheme() {
    for (var i = 0; i < THEMES.length; i++) if (THEMES[i].id === state.prefs.theme) return THEMES[i];
    return THEMES[0];
  }

  function applyTheme() {
    var t = currentTheme();
    THEMES.forEach(function (x) { document.body.classList.toggle('theme-' + x.id, x.id === t.id); });
  }

  function cycleTheme() {
    var i = THEMES.indexOf(currentTheme());
    state.prefs.theme = THEMES[(i + 1) % THEMES.length].id;
    S.save(state.prefs);
    applyTheme();
    rebuild();
    toast('Thème : ' + currentTheme().label);
  }

  function quitToSamsung() {
    S.save(state.prefs);
    if (!P.exit()) toast('Aperçu hors TV : sur le téléviseur, cette action revient à l’accueil Samsung.');
  }

  function toggleEdit() {
    state.mode = state.mode === 'browse' ? 'edit' : 'browse';
    state.moving = null;
    rebuild();
    toast(state.mode === 'edit' ? 'Personnalisation : OK sur une tuile pour la déplacer ou l’ajouter aux favoris.' : 'Personnalisation enregistrée.');
  }

  function editTile(tile) {
    var p = state.nav.get();
    var row = state.rows[p.r];
    var actions = [];
    if (row.def.orderable && sectionItems(row.def.id).length > 1) {
      actions.push({ label: 'Déplacer', run: function () { closeSheet(); startMove(p.r); } });
    }
    if (tile.appId && tile.kind === 'app') {
      actions.push({
        label: isFavorite(tile.tid) ? 'Retirer des favoris' : 'Ajouter aux favoris',
        run: function () { closeSheet(); toggleFavorite(tile); }
      });
    }
    if (tile.kind !== 'action') {
      actions.push({ label: 'Masquer', run: function () { closeSheet(); hideTile(tile); } });
    }
    if (!actions.length) { toast('Aucune option pour cette tuile.'); return; }
    actions.push({ label: 'Annuler', run: closeSheet });
    openSheet(tile.label, null, actions);
  }

  function toggleFavorite(tile) {
    var i = state.prefs.favorites.indexOf(tile.tid);
    if (i === -1) state.prefs.favorites.push(tile.tid);
    else state.prefs.favorites.splice(i, 1);
    S.save(state.prefs);
    rebuild();
    toast(i === -1 ? tile.label + ' ajoutée aux favoris.' : tile.label + ' retirée des favoris.');
  }

  function hideTile(tile) {
    if (state.prefs.hidden.indexOf(tile.tid) === -1) state.prefs.hidden.push(tile.tid);
    S.save(state.prefs);
    rebuild();
    toast(tile.label + ' masquée. Réglages → « Réafficher » pour la remettre.');
  }

  function unhideAll() {
    var n = state.prefs.hidden.length;
    state.prefs.hidden = [];
    S.save(state.prefs);
    rebuild();
    toast(n + ' app(s) réaffichée(s).');
  }

  function startMove(r) {
    state.mode = 'move';
    state.moving = { section: state.rows[r].def.id };
    renderChrome();
    if (lastFocused) lastFocused.classList.add('is-moving');
  }

  // Déplacement sur toute la section : la tuile peut changer de ligne dans une grille.
  function moveBy(delta) {
    var t = currentTile();
    var list = sectionItems(state.moving.section);
    var i = list.indexOf(t);
    if (N.shift(list, i, delta) === i) return;
    saveSectionOrder(state.moving.section, list);
    rebuild(t.tid);
    if (lastFocused) lastFocused.classList.add('is-moving');
  }

  function endMove() {
    saveSectionOrder(state.moving.section, sectionItems(state.moving.section));
    state.mode = 'edit';
    state.moving = null;
    if (lastFocused) lastFocused.classList.remove('is-moving');
    renderChrome();
  }

  function showStatus() {
    var d = state.discovery;
    var lines = [];
    if (P.isMock()) lines.push('⚠ Mode simulation (données fictives de test, pas un téléviseur).');
    lines.push(d.ok ? 'Applications : ' + d.apps.length + ' affichées sur ' + d.rawCount + ' listées par le système'
      : 'Liste des applications indisponible : ' + d.reason);
    state.services.forEach(function (s) {
      if (s.optional && !s.app) return;
      lines.push((s.app ? '✓ ' : '✕ ') + s.label + (s.app ? '  —  ' + s.app.id : '  —  non détectée'));
    });
    openSheet('État des services', lines.join('\n'), [{ label: 'Fermer', run: closeSheet }]);
  }

  function confirmReset() {
    openSheet('Réinitialiser Accueil+ ?', 'L’ordre des tuiles, les favoris et les apps masquées d’Accueil+ seront effacés. Rien d’autre n’est modifié sur le téléviseur.', [
      { label: 'Annuler', run: closeSheet },
      { label: 'Réinitialiser', run: function () {
        closeSheet();
        S.reset();
        state.prefs = S.load();
        state.mode = 'browse';
        buildRows();
        rebuild(firstReadyTid());
        toast('Préférences d’Accueil+ réinitialisées.');
      } }
    ]);
  }

  // ---------------------------------------------------------------------------
  // Feuille modale
  // ---------------------------------------------------------------------------

  function openSheet(title, body, actions) {
    state.sheet = { actions: actions, index: 0 };
    el.sheetTitle.textContent = title;
    el.sheetBody.textContent = body || '';
    el.sheetBody.hidden = !body;
    el.sheetActions.innerHTML = '';
    actions.forEach(function (a, i) {
      el.sheetActions.appendChild(h('div', 'sheet-btn' + (i === 0 ? ' is-focused' : ''), a.label));
    });
    el.backdrop.hidden = false;
    renderChrome();
  }

  function closeSheet() {
    state.sheet = null;
    el.backdrop.hidden = true;
    renderChrome();
  }

  function sheetKey(code) {
    var s = state.sheet;
    if (code === K.LEFT || code === K.RIGHT) {
      var n = s.index + (code === K.LEFT ? -1 : 1);
      if (n < 0 || n >= s.actions.length) return;
      el.sheetActions.children[s.index].classList.remove('is-focused');
      s.index = n;
      el.sheetActions.children[s.index].classList.add('is-focused');
    } else if (code === K.ENTER) {
      s.actions[s.index].run();
    } else if (isBack(code)) {
      closeSheet();
    }
  }

  // ---------------------------------------------------------------------------
  // Rail
  // ---------------------------------------------------------------------------

  function railIndexForRow(r) {
    var id = state.rows[r] && state.rows[r].def.id;
    for (var i = 0; i < RAIL.length; i++) if (RAIL[i].row === id) return i;
    return 0;
  }

  function enterRail() {
    state.zone = 'rail';
    state.railIndex = railIndexForRow(state.nav.get().r);
    updateFocus(false);
  }

  function leaveRail() {
    var item = RAIL[state.railIndex];
    var r = item.row ? rowIndex(item.row) : state.nav.get().r;
    if (item.row && !state.rows[r].items.length) return false;
    if (item.row) state.nav.focusRow(r);
    state.zone = 'content';
    updateFocus(false);
    return true;
  }

  function railKey(code) {
    var item = RAIL[state.railIndex];
    if (code === K.UP || code === K.DOWN) {
      var n = state.railIndex + (code === K.UP ? -1 : 1);
      if (n < 0 || n >= RAIL.length) return;
      state.railIndex = n;
      // Aperçu : la page défile jusqu'à la rangée correspondante.
      if (RAIL[n].row) state.nav.focusRow(rowIndex(RAIL[n].row));
      updateFocus(false);
    } else if (code === K.RIGHT) {
      leaveRail();
    } else if (code === K.ENTER) {
      if (item.action === 'samsung') quitToSamsung();
      else if (!leaveRail()) toast('Cette section est vide pour l’instant.');
    } else if (code === K.RED) {
      toggleEdit();
    } else if (isBack(code)) {
      if (state.mode !== 'browse') toggleEdit();
      else quitToSamsung();
    }
  }

  // ---------------------------------------------------------------------------
  // Télécommande
  // ---------------------------------------------------------------------------

  function isBack(code) { return code === K.BACK || code === K.ESC || code === K.BACKSPACE; }

  var DIRS = {};
  DIRS[K.LEFT] = 'left'; DIRS[K.RIGHT] = 'right'; DIRS[K.UP] = 'up'; DIRS[K.DOWN] = 'down';

  function onKey(e) {
    var code = e.keyCode;
    var handled = true;

    if (state.sheet) sheetKey(code);
    else if (state.mode === 'move') {
      if (code === K.LEFT) moveBy(-1);
      else if (code === K.RIGHT) moveBy(1);
      else if (code === K.ENTER || isBack(code)) endMove();
    } else if (state.zone === 'rail') {
      if (DIRS[code] || code === K.ENTER || code === K.RED || isBack(code)) railKey(code);
      else handled = false;
    } else if (DIRS[code]) {
      if (state.nav.move(DIRS[code])) updateFocus(false);
      else if (code === K.LEFT) enterRail(); // bord gauche d'une rangée → rail
    } else if (code === K.ENTER) {
      var t = currentTile();
      if (!t) handled = false;
      else if (t.kind === 'action') t.run();
      else if (state.mode === 'edit') editTile(t);
      else launchTile(t);
    } else if (code === K.RED) {
      toggleEdit();
    } else if (isBack(code)) {
      if (state.mode !== 'browse') toggleEdit();
      else quitToSamsung();
    } else handled = false;

    if (handled) e.preventDefault();
  }

  // ---------------------------------------------------------------------------
  // Cycle de vie
  // ---------------------------------------------------------------------------

  function rebuild(focusTid) {
    var keep = focusTid || (currentTile() && currentTile().tid);
    buildRows();
    state.nav.setLengths(state.rows.map(function (r) { return r.items.length; }));
    var at = keep && findTile(keep);
    if (at) state.nav.focus(at.r, at.c);
    render();
  }

  function discover(focusTid) {
    P.listApps(function (res) {
      res.rawCount = res.apps.length;
      res.apps = C.userApps(res.apps); // seulement les apps du panneau Applications de la TV
      state.discovery = res;
      state.services = C.resolve(res.apps);
      buildRows();
      if (!focusTid || !findTile(focusTid)) focusTid = firstReadyTid();
      rebuild(focusTid);
    });
  }

  function tickClock() {
    var now = new Date();
    el.time.textContent = ('0' + now.getHours()).slice(-2) + ':' + ('0' + now.getMinutes()).slice(-2);
    var d = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    el.date.textContent = d.charAt(0).toUpperCase() + d.slice(1);
    var hr = now.getHours();
    el.hello.textContent = hr < 5 ? 'Bonne nuit' : hr < 18 ? 'Bonjour' : 'Bonsoir';
    setTimeout(tickClock, 60000 - (now.getSeconds() * 1000 + now.getMilliseconds()) + 50);
  }

  // L'écran est conçu en 1920×1080 (la TV). Dans une fenêtre plus petite (aperçu sur le Mac),
  // la scène entière est réduite pour rester visible ; sur la TV l'échelle vaut 1.
  function fitStage() {
    var stage = document.getElementById('stage');
    var s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    if (!s || Math.abs(s - 1) < 0.01) { stage.style.transform = ''; return; }
    stage.style.transform = 'translate(' + Math.round((window.innerWidth - 1920 * s) / 2) + 'px,' +
      Math.round((window.innerHeight - 1080 * s) / 2) + 'px) scale(' + s + ')';
  }

  function init() {
    fitStage();
    window.addEventListener('resize', fitStage);
    var savedFocus = state.prefs.lastFocus; // le premier rendu (avant découverte) l'écraserait
    applyTheme();
    state.services = C.resolve([]);
    buildRows();
    state.nav = N.createNav(state.rows.map(function (r) { return r.items.length; }));
    render();
    tickClock();
    P.registerKeys();
    document.addEventListener('keydown', onKey);
    // Le défilement est entièrement piloté par transform : on neutralise tout défilement natif.
    var vp = document.getElementById('viewport');
    vp.addEventListener('scroll', function () { vp.scrollTop = 0; vp.scrollLeft = 0; });
    window.addEventListener('scroll', function () { window.scrollTo(0, 0); });

    // Retour depuis une autre application : focus restauré, liste rafraîchie (local, sans réseau).
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { S.save(state.prefs); return; }
      // Avant la fin de la 1re détection, le focus n'est que provisoire : la détection en cours s'en charge.
      if (state.discovery.reason === 'pending') return;
      state.launching = false;
      if (lastFocused) lastFocused.classList.remove('is-launching');
      discover(currentTile() && currentTile().tid);
    });

    discover(savedFocus);
    if (window.TVWidgets) window.TVWidgets.start();
    window.__tvhub = state; // inspection pendant les tests
  }

  init();
})();

/*
 * TV Hub — contrôleur de l'interface (style « Console »).
 * Zones : 'content' (rangées) et 'rail' (raccourcis de section, à gauche).
 * Modes : 'browse' (OK = ouvrir), 'edit' (OK = options de tuile), 'move' (←/→ déplacent la tuile).
 */
(function () {
  'use strict';

  var P = window.TVPlatform, S = window.TVStore, C = window.TVCatalog, N = window.TVNav, A = window.TVArt;
  var K = P.KEYS;

  var ROW_DEFS = [
    { id: 'games', title: 'Jeux', sub: 'Cloud gaming', size: 'carousel', orderable: true },
    // Rangées en carrousel horizontal. (Option `cols: n` : grille qui passe à la ligne.)
    { id: 'streaming', title: 'Streaming', size: 'md', orderable: true },
    { id: 'favorites', title: 'Mes applications', size: 'md', orderable: true },
    { id: 'all', title: 'Toutes les applications', size: 'sm', orderable: false },
    { id: 'system', title: 'Réglages TV Hub', size: 'pill', orderable: false }
  ];

  // Rail : une entrée par rangée, plus le retour à l'accueil Samsung.
  var RAIL = [
    { row: 'games', icon: 'pad', label: 'Jeux' },
    { row: 'streaming', icon: 'tv', label: 'Streaming' },
    { row: 'favorites', icon: 'star', label: 'Mes applications' },
    { row: 'all', icon: 'grid', label: 'Toutes les applications' },
    { row: 'system', icon: 'gear', label: 'Réglages TV Hub' },
    { action: 'samsung', icon: 'home', label: 'Accueil Samsung' }
  ];

  var CAROUSEL = { w: 250, open: 720, gap: 24 };
  var VIEW_W = 1920 - 240 - 110;
  var PEEK = 110; // part visible de la carte voisine quand la rangée défile // zone de contenu : 240 px à gauche (rail + respiration), 110 px à droite

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
    openGame: null,    // tid de la carte de jeu dépliée
    scrollX: {}
  };

  var el = {
    rows: document.getElementById('rows'),
    rail: document.getElementById('rail'),
    ambient: document.getElementById('ambient'),
    hints: document.getElementById('hints'),
    badge: document.getElementById('modeBadge'),
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
    var rows = {
      games: S.applyOrder(sectionTiles('games'), order.games),
      streaming: S.applyOrder(sectionTiles('streaming'), order.streaming),
      favorites: state.prefs.favorites
        .filter(function (tid) { return byTid[tid]; })
        .map(function (tid) { return byTid[tid]; }),
      all: apps.map(appTile),
      system: [
        actionTile('edit', state.mode === 'browse' ? 'Personnaliser' : 'Terminer', 'star', toggleEdit),
        actionTile('status', 'État des services', 'grid', showStatus),
        actionTile('samsung', 'Accueil Samsung', 'home', quitToSamsung),
        actionTile('reset', 'Réinitialiser', 'gear', confirmReset)
      ]
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

  function iconSrc(path) {
    if (!path || /^https?:/.test(path)) return ''; // jamais de réseau
    if (/^(file:|data:)/.test(path)) return path;
    return path.charAt(0) === '/' ? 'file://' + path : '';
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

  function renderCarouselTile(tile) {
    var node = h('div', 'tile tile-carousel is-' + tile.status);
    node.setAttribute('data-tid', tile.tid);
    node.appendChild(artNode(tile, 'xMaxYMid'));
    node.appendChild(h('div', 'shade'));
    if (tile.status === 'missing') node.appendChild(h('div', 'tag', 'Non détectée'));

    var info = h('div', 'info');
    info.appendChild(h('div', 'n', tile.label));
    var more = h('div', 'more');
    var svc = tile.svc || {};
    more.appendChild(chips(svc.meta || [], tile.status === 'missing' ? 'Via Gaming Hub' : ''));
    more.appendChild(h('div', 's', tile.status === 'missing'
      ? 'Non trouvée parmi les applications installées. OK pour savoir comment y accéder.'
      : svc.blurb || ''));
    var cta = h('div', 'cta');
    cta.innerHTML = A.icon(tile.status === 'missing' ? 'grid' : 'play');
    cta.appendChild(document.createTextNode(tile.status === 'missing' ? 'En savoir plus' : 'Jouer'));
    more.appendChild(cta);
    info.appendChild(more);
    node.appendChild(info);
    return node;
  }

  function renderCardTile(tile, def) {
    var node = h('div', 'tile tile-' + def.size + ' is-' + tile.status + ' kind-' + tile.kind);
    node.setAttribute('data-tid', tile.tid);
    var card = h('div', 'card');
    card.appendChild(artNode(tile));

    var src = iconSrc(tile.iconPath);
    if (src && !tile.art) {
      var img = document.createElement('img');
      img.alt = '';
      img.src = src;
      img.onerror = function () { img.remove(); card.classList.remove('has-icon'); };
      card.classList.add('has-icon');
      card.appendChild(img);
    }
    if (!tile.art) card.appendChild(h('div', 'mono', monogram(tile.label)));
    card.appendChild(h('div', 'shade'));
    card.appendChild(h('div', 'name', tile.label));

    if (tile.status === 'missing') card.appendChild(h('div', 'tag', 'Non détectée'));
    else if (state.mode !== 'browse' && def.id !== 'favorites' && isFavorite(tile.tid)) card.appendChild(h('div', 'tag tag-fav', 'Favori'));
    node.appendChild(card);
    return node;
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
        var n = row.def.size === 'carousel' ? renderCarouselTile(tile)
          : row.def.size === 'pill' ? renderPill(tile)
          : renderCardTile(tile, row.def);
        track.appendChild(n);
      });
      section.appendChild(track);
      frag.appendChild(section);
    });
    el.rows.innerHTML = '';
    el.rows.appendChild(frag);
    state.scrollX = {};
    lastFocused = null;

    // Carte de jeu dépliée : la dernière visitée, sinon la première.
    var g = state.rows[rowIndex('games')];
    if (!state.openGame || !findTile(state.openGame)) state.openGame = g.items.length ? g.items[0].tid : null;
    setOpenGame(state.openGame);

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
    else hints = [['OK', 'Ouvrir'], ['A', 'Personnaliser'], ['Retour', 'Accueil Samsung']];

    el.hints.innerHTML = '';
    hints.forEach(function (x) {
      var s = h('span', 'hint');
      s.appendChild(h('kbd', '', x[0]));
      s.appendChild(document.createTextNode(x[1]));
      el.hints.appendChild(s);
    });
  }

  function setOpenGame(tid) {
    state.openGame = tid;
    var g = rowIndex('games');
    var track = el.rows.children[g] && el.rows.children[g].querySelector('.track');
    if (!track) return;
    Array.prototype.forEach.call(track.children, function (n) {
      n.classList.toggle('is-open', n.getAttribute('data-tid') === tid);
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

    var section = el.rows.children[p.r];
    var track = section.querySelector('.track');
    var node = track.children[p.c];
    var tile = state.rows[p.r].items[p.c];
    Array.prototype.forEach.call(el.rows.children, function (s, i) { s.classList.toggle('is-active', i === p.r); });

    if (state.zone === 'content' && node) {
      node.classList.add('is-focused');
      lastFocused = node;
      if (state.rows[p.r].def.size === 'carousel') setOpenGame(tile.tid);
      // Le focus provisoire d'avant la détection ne doit pas écraser le focus mémorisé.
      if (state.discovery.reason !== 'pending') state.prefs.lastFocus = tile.tid;
    }

    // Défilement horizontal : les premières cartes sortent à gauche pour révéler les suivantes.
    // Positions mesurées depuis le début de la rangée (le carrousel de jeux sur sa disposition finale).
    // Une carte voisine dépasse toujours un peu (PEEK) pour montrer qu'il en reste.
    if (node) {
      var x = state.scrollX[p.r] || 0, left, right, last;
      var n = state.rows[p.r].items.length;
      if (state.rows[p.r].def.size === 'carousel') {
        left = p.c * (CAROUSEL.w + CAROUSEL.gap);
        right = left + CAROUSEL.open;
        last = (n - 1) * (CAROUSEL.w + CAROUSEL.gap) + CAROUSEL.open;
      } else {
        left = node.offsetLeft - track.children[0].offsetLeft;
        right = left + node.offsetWidth;
        last = track.children[n - 1].offsetLeft - track.children[0].offsetLeft + track.children[n - 1].offsetWidth;
      }
      var peekL = p.c > 0 ? PEEK : 0, peekR = p.c < n - 1 ? PEEK : 0;
      if (left - peekL - x < 0) x = left - peekL;
      else if (right + peekR - x > VIEW_W) x = right + peekR - VIEW_W;
      x = Math.max(0, Math.min(x, Math.max(0, last - VIEW_W)));
      state.scrollX[p.r] = x;
      track.style.transform = 'translate3d(' + (-x) + 'px,0,0)';
    }

    // Défilement vertical : la rangée active sous l'horloge (la 1re rangée reste en place).
    var y = Math.max(0, section.offsetTop - 160);
    document.body.classList.toggle('is-scrolled', y > 0);
    el.rows.style.transform = 'translate3d(0,' + (-y) + 'px,0)';
    if (instant) {
      el.rows.classList.add('no-anim');
      if (track) track.classList.add('no-anim');
      void el.rows.offsetWidth;
      el.rows.classList.remove('no-anim');
      if (track) track.classList.remove('no-anim');
    }

    if (tile) setAmbient(tile);
  }

  // Ambiance : fondu entre deux calques, déclenché après une courte pause (navigation rapide = pas de travail).
  var ambientTimer = null, ambientKey = null;
  function setAmbient(tile) {
    var key = tile.art ? tile.art + '|' + tile.accent : 'none';
    document.documentElement.style.setProperty('--accent', tile.accent);
    if (key === ambientKey) return;
    clearTimeout(ambientTimer);
    ambientTimer = setTimeout(function () {
      ambientKey = key;
      var layer = h('div', 'amb-layer');
      if (tile.art) layer.innerHTML = A.svg(tile.art, tile.accent);
      el.ambient.appendChild(layer);
      void layer.offsetWidth;
      layer.classList.add('is-in');
      var olds = Array.prototype.slice.call(el.ambient.children, 0, -1);
      setTimeout(function () { olds.forEach(function (o) { if (o.parentNode) o.parentNode.removeChild(o); }); }, 750);
    }, 140);
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
    lines.push(d.ok ? 'Applications listées par le système : ' + d.apps.length
      : 'Liste des applications indisponible : ' + d.reason);
    state.services.forEach(function (s) {
      if (s.optional && !s.app) return;
      lines.push((s.app ? '✓ ' : '✕ ') + s.label + (s.app ? '  —  ' + s.app.id : '  —  non détectée'));
    });
    openSheet('État des services', lines.join('\n'), [{ label: 'Fermer', run: closeSheet }]);
  }

  function confirmReset() {
    openSheet('Réinitialiser TV Hub ?', 'L’ordre des tuiles et les favoris de TV Hub seront effacés. Rien d’autre n’est modifié sur le téléviseur.', [
      { label: 'Annuler', run: closeSheet },
      { label: 'Réinitialiser', run: function () {
        closeSheet();
        S.reset();
        state.prefs = S.load();
        state.mode = 'browse';
        state.openGame = null;
        buildRows();
        rebuild(firstReadyTid());
        toast('Préférences de TV Hub réinitialisées.');
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
      state.launching = false;
      if (lastFocused) lastFocused.classList.remove('is-launching');
      discover(currentTile() && currentTile().tid);
    });

    discover(savedFocus);
    window.__tvhub = state; // inspection pendant les tests
  }

  init();
})();

/*
 * TV-hub V6 — hub d'accueil (maquette fonctionnelle).
 *
 * Réutilise la couche éprouvée de l'application :
 *   app/js/platform.js  lancement réel (tizen.application.launch) et découverte des apps
 *   app/js/catalog.js   reconnaissance des services par NOM d'application installée
 *   app/js/nav.js       navigation D-pad déterministe (mémoire de colonne par rangée)
 *   app/js/widgets.js   libellés météo + ville déduite du fuseau horaire
 *
 * Principes : aucune action déclenchée par un simple déplacement du focus, aucun
 * lancement simulé, aucune mesure de mise en page pendant la navigation (positions
 * calculées), ES5 uniquement (Chromium M85 de Tizen 6.5).
 */
(function () {
  'use strict';

  var P = window.TVPlatform, C = window.TVCatalog, N = window.TVNav, W = window.TVWidgets, T = window.V6TMDB;
  var KEYS = P.KEYS;
  var PREFS_KEY = 'tvhub.v6.prefs';
  var WX_KEY = 'tvhub.v6.weather';
  var WX_TTL = 30 * 60 * 1000;
  var PIN_MAX = 40;

  // ---------------------------------------------------------------------------
  // Données statiques
  // ---------------------------------------------------------------------------

  /* Rendu typographique des services (le projet n'embarque aucun logo officiel). */
  var BRAND = {
    netflix: { bg: '#000', fg: '#e50914', p: 8 }, prime: { bg: '#0f171e', fg: '#00a8e1', p: 119 },
    disney: { bg: '#0a1b4d', fg: '#fff', p: 337 }, appletv: { bg: '#000', fg: '#fff', p: 350 },
    canal: { bg: '#000', fg: '#fff', p: 381 }, crunchyroll: { bg: '#f47521', fg: '#fff', p: 283 },
    luna: { bg: '#25195e', fg: '#fff' }, xbox: { bg: '#107c10', fg: '#fff' },
    geforcenow: { bg: '#141414', fg: '#76b900' }, gaminghub: { bg: '#1428a0', fg: '#fff' },
    twitch: { bg: '#9146ff', fg: '#fff' }, spotify: { bg: '#121212', fg: '#1ed760' }
  };
  var GROUPS = {
    streaming: ['netflix', 'prime', 'disney', 'appletv', 'canal', 'crunchyroll'],
    games: ['luna', 'xbox', 'geforcenow', 'gaminghub'],
    fun: ['spotify', 'twitch']
  };
  var GAME_NOTE = {
    luna: 'Sur les TV Samsung, Luna est souvent proposé dans Samsung Gaming Hub plutôt qu’en application séparée.',
    xbox: 'Sur les TV Samsung 2022, Xbox Cloud Gaming passe par Samsung Gaming Hub.',
    geforcenow: 'Selon le modèle, GeForce NOW est proposé dans Samsung Gaming Hub ou en application.',
    gaminghub: 'Gaming Hub est une section du système Samsung : elle n’est pas toujours lançable par une application tierce.'
  };
  var SECTIONS = [
    { id: 'home', label: 'Accueil' }, { id: 'streaming', label: 'Streaming' }, { id: 'games', label: 'Jeux' },
    { id: 'fun', label: 'Musique et divertissement' }, { id: 'all', label: 'Toutes les applications' }, { id: 'settings', label: 'Réglages' }
  ];
  var SIZES = { svc: { w: 250, h: 150 }, title: { w: 384, h: 216 }, app: { w: 232, h: 176 }, opt: { w: 460, h: 150 } };
  var GAP = 34, VIEW_W = 1680, ROW_GAP = 44, LABEL_H = 44;

  // ---------------------------------------------------------------------------
  // État
  // ---------------------------------------------------------------------------

  var S = {
    tizen: P.hasTizen(), detect: 'pending', detectErr: null, installed: [], svc: {},
    section: 'home', area: 'rows', tab: 0, mem: {}, nav: null, rows: [],
    modal: null, launching: false, history: [], booting: true
  };
  var prefs = loadPrefs();
  var $ = function (id) { return document.getElementById(id); };
  var el = {};

  function loadPrefs() {
    var d = { start: 'home', last: 'home', lastGame: null, pins: {} };
    try {
      var p = JSON.parse(localStorage.getItem(PREFS_KEY));
      if (!p || typeof p !== 'object') return d;
      d.start = p.start === 'last' ? 'last' : 'home';
      d.last = p.last || 'home';
      if (p.lastGame && GROUPS.games.indexOf(p.lastGame.key) >= 0 && +p.lastGame.ts) d.lastGame = { key: p.lastGame.key, ts: +p.lastGame.ts };
      if (p.pins && typeof p.pins === 'object') GROUPS.games.forEach(function (k) {
        if (typeof p.pins[k] === 'string' && p.pins[k]) d.pins[k] = p.pins[k].slice(0, PIN_MAX);
      });
    } catch (e) { /* ignore */ }
    return d;
  }
  function savePrefs() { try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (e) { /* stockage indisponible */ } }

  // ---------------------------------------------------------------------------
  // Services : découverte réelle des applications installées
  // ---------------------------------------------------------------------------

  function buildServices(installed) {
    var map = {};
    C.resolve(installed).forEach(function (s) { map[s.key] = s; });
    S.svc = map;
  }

  function detect(done) {
    P.listApps(function (res) {
      if (res.ok) {
        S.installed = C.userApps(res.apps);
        buildServices(S.installed);
        S.detect = 'ok';
      } else {
        S.detect = res.reason === 'no-tizen' ? 'no-tizen' : 'error';
        S.detectErr = res.reason;
      }
      done();
    });
  }

  function svcState(s) {
    if (s.app) return 'ready';
    if (S.detect === 'no-tizen') return 'desktop';
    if (S.detect === 'error') return 'unknown';
    if (S.detect === 'pending') return 'pending';
    return 'missing';
  }

  // ---------------------------------------------------------------------------
  // Construction des rangées par section
  // ---------------------------------------------------------------------------

  function svcItems(keys) { return keys.map(function (k) { return { type: 'svc', key: k }; }); }

  /* « Reprendre » : dernier service de jeu ouvert depuis TV-hub (seule donnée fiable). */
  function gameItems() {
    var items = svcItems(GROUPS.games);
    if (prefs.lastGame) items.unshift({ type: 'resume', key: prefs.lastGame.key });
    return items;
  }

  function titleItems(limit) {
    var out = [];
    GROUPS.streaming.forEach(function (k) {
      T.titles(BRAND[k].p).slice(0, 2).forEach(function (t) { if (out.length < limit) out.push({ type: 'title', key: k, t: t }); });
    });
    return out;
  }

  function rowsFor(id) {
    if (id === 'home') return [
      { title: 'Streaming', kind: 'svc', items: svcItems(GROUPS.streaming) },
      { title: 'Jeux', kind: 'svc', items: gameItems() },
      { title: 'Musique et divertissement', kind: 'svc', items: svcItems(GROUPS.fun).concat([{ type: 'more' }]) }
    ];
    if (id === 'streaming') {
      var r = [{ title: 'Vos services', kind: 'svc', items: svcItems(GROUPS.streaming) }];
      var t = titleItems(12);
      if (t.length) r.push({ title: 'Populaire en France sur ces services', kind: 'title', items: t });
      return r;
    }
    if (id === 'games') return [
      { title: 'Cloud gaming', kind: 'svc', items: gameItems() },
      { title: 'Jeu du moment (noté par vous, affiché en rappel)', kind: 'opt', items: GROUPS.games.slice(0, 3).map(function (k) {
        return { type: 'opt', id: 'pin', key: k, label: S.svc[k].label, sub: prefs.pins[k] ? '« ' + prefs.pins[k] + ' »' : 'Aucun — OK pour l’indiquer' };
      }) }
    ];
    if (id === 'fun') return [{ title: 'Musique et direct', kind: 'svc', items: svcItems(GROUPS.fun) }];
    if (id === 'all') {
      var rows = [];
      for (var i = 0; i < S.installed.length; i += 6) {
        rows.push({ title: i ? '' : S.installed.length + ' applications sur ce téléviseur', kind: 'app',
          items: S.installed.slice(i, i + 6).map(function (a) { return { type: 'app', app: a }; }) });
      }
      return rows;
    }
    if (id === 'settings') return [
      { title: 'Au démarrage de Accueil+', kind: 'opt', items: [
        { type: 'opt', id: 'start-home', label: 'Ouvrir l’accueil', sub: 'Toujours commencer ici' },
        { type: 'opt', id: 'start-last', label: 'Dernière section', sub: 'Reprendre où vous étiez' }] },
      { title: 'Données', kind: 'opt', items: [
        { type: 'opt', id: 'status', label: 'État des services', sub: 'Applications détectées sur la TV' },
        { type: 'opt', id: 'refresh', label: 'Actualiser les images', sub: 'Vide le cache TMDB local' }] }
    ];
    return [];
  }

  // ---------------------------------------------------------------------------
  // Rendu des rangées (DOM reconstruit seulement au changement de section)
  // ---------------------------------------------------------------------------

  function layoutFor(id) { return id === 'settings' ? { y: 600, flat: true } : id === 'all' ? { y: 540, flat: true } : { y: 744, flat: false }; }

  function rowHeight(row) { return LABEL_H + SIZES[row.kind].h + LABEL_H + ROW_GAP; }

  function tileEl(it, kind) {
    var d = document.createElement('div');
    var sz = SIZES[kind];
    d.className = 'tile';
    d.style.width = sz.w + 'px'; d.style.height = sz.h + 'px';
    if (it.type === 'svc') {
      var s = S.svc[it.key], b = BRAND[it.key];
      d.style.background = b.bg;
      var n = document.createElement('div'); n.className = 'name'; n.style.color = b.fg; n.textContent = s.label;
      if (s.label.length > 9) d.className += ' sm';
      d.appendChild(n);
      var st = svcState(s);
      if (st === 'missing') { d.className += ' missing'; it.below = 'Non détectée'; }
    } else if (it.type === 'resume') {
      var rs = S.svc[it.key], rb = BRAND[it.key];
      d.style.background = rb.bg;
      var rn = document.createElement('div'); rn.className = 'name'; rn.style.color = rb.fg; rn.textContent = rs.label;
      if (rs.label.length > 9) d.className += ' sm';
      var rbadge = document.createElement('div'); rbadge.className = 'badge'; rbadge.textContent = '▶ Reprendre';
      d.appendChild(rn); d.appendChild(rbadge);
      it.below = W.ago(prefs.lastGame.ts);
    } else if (it.type === 'more') {
      d.style.background = '#2c2c30';
      var m = document.createElement('div'); m.className = 'name'; m.style.fontSize = '28px'; m.textContent = 'Toutes les apps';
      d.appendChild(m);
    } else if (it.type === 'title') {
      var cap = document.createElement('div'); cap.className = 'cap'; cap.textContent = it.t.name;
      var badge = document.createElement('div'); badge.className = 'badge'; badge.textContent = S.svc[it.key].label;
      var img = document.createElement('img'); img.alt = '';
      img.onload = function () { img.className = 'ok'; };
      img.onerror = function () { img.parentNode && img.parentNode.removeChild(img); };
      img.src = T.img(it.t.backdrop, 'w780');
      d.appendChild(img); d.appendChild(cap); d.appendChild(badge);
    } else if (it.type === 'app') {
      d.className += ' icon';
      var ph = document.createElement('div'); ph.className = 'ph'; ph.textContent = (it.app.name.charAt(0) || '?').toUpperCase();
      d.appendChild(ph);
      if (it.app.iconPath) {
        var ic = document.createElement('img'); ic.alt = '';
        ic.onload = function () { ic.className = 'ok'; d.className += ' hasimg'; };
        ic.onerror = function () { ic.parentNode && ic.parentNode.removeChild(ic); };
        ic.src = it.app.iconPath;
        d.appendChild(ic);
      }
      var an = document.createElement('div'); an.className = 'name'; an.textContent = it.app.name; d.appendChild(an);
    } else if (it.type === 'opt') {
      d.className += ' opt';
      var on = document.createElement('div'); on.className = 'name'; on.textContent = it.label;
      var sub = document.createElement('div'); sub.className = 'sub'; sub.textContent = it.sub;
      d.appendChild(on); d.appendChild(sub);
      if ((it.id === 'start-home' && prefs.start === 'home') || (it.id === 'start-last' && prefs.start === 'last')) d.className += ' checked';
    }
    return d;
  }

  function renderRows() {
    var host = el.rows;
    host.innerHTML = '';
    var y = 0;
    S.rows.forEach(function (row, r) {
      var re = document.createElement('div'); re.className = 'row'; re.style.top = y + 'px';
      row.top = y;
      if (row.title) { var t = document.createElement('div'); t.className = 'rtitle'; t.textContent = row.title; re.appendChild(t); }
      var tr = document.createElement('div'); tr.className = 'track';
      var sz = SIZES[row.kind];
      row.tiles = [];
      row.items.forEach(function (it, c) {
        var te = tileEl(it, row.kind);
        te.style.left = c * (sz.w + GAP) + 'px';
        tr.appendChild(te); row.tiles.push(te);
        if (it.below) {
          var bl = document.createElement('div'); bl.className = 'below-label';
          bl.style.left = c * (sz.w + GAP) + 'px'; bl.style.width = sz.w + 'px'; bl.style.top = (sz.h + 12) + 'px';
          bl.textContent = it.below; tr.appendChild(bl);
        }
      });
      row.total = row.items.length * (sz.w + GAP) - GAP;
      re.appendChild(tr);
      row.el = re; row.track = tr;
      host.appendChild(re);
      y += rowHeight(row);
    });
    if (S.section === 'all' && !S.rows.length) {
      var msg = document.createElement('div'); msg.className = 'empty'; msg.style.top = '0px';
      msg.textContent = S.detect === 'no-tizen'
        ? 'La liste des applications n’est disponible que sur le téléviseur (API Tizen absente dans ce navigateur).'
        : S.detect === 'error' ? 'Le téléviseur n’a pas fourni la liste des applications (' + S.detectErr + ').'
          : S.detect === 'pending' ? 'Recherche des applications…' : 'Aucune application trouvée.';
      host.appendChild(msg);
    }
  }

  // ---------------------------------------------------------------------------
  // Focus et positionnement (calculé, sans lecture du DOM)
  // ---------------------------------------------------------------------------

  var lastTile = null;

  function trackOffset(row, c) {
    var sz = SIZES[row.kind], step = sz.w + GAP;
    var visible = Math.floor((VIEW_W + GAP) / step);
    if (c <= visible - 2) return 0;
    return Math.max(0, Math.min((c - (visible - 2)) * step, row.total - VIEW_W + 40));
  }

  function applyFocus() {
    var pos = S.nav ? S.nav.get() : { r: -1, c: -1 };
    var lay = layoutFor(S.section);
    var fr = pos.r < 0 ? 0 : pos.r;
    var base = S.rows[fr] ? S.rows[fr].top : 0;
    el.rows.style.transform = 'translateY(' + (lay.y - base) + 'px)';
    S.rows.forEach(function (row, r) {
      row.el.className = 'row' + (r < fr ? ' above' : r > fr ? ' below' : '');
      var c = r === fr ? pos.c : (S.mem[S.section + ':' + r] || 0);
      row.track.style.transform = 'translateX(' + (-trackOffset(row, Math.max(0, c))) + 'px)';
    });
    if (lastTile) lastTile.className = lastTile.className.replace(/ focus/g, '');
    lastTile = null;
    if (S.area === 'rows' && pos.r >= 0) {
      lastTile = S.rows[pos.r].tiles[pos.c];
      lastTile.className += ' focus';
      S.mem[S.section + ':' + pos.r] = pos.c;
    }
    for (var i = 0; i < el.tabs.children.length; i++) {
      var t = el.tabs.children[i];
      t.className = 'tab' + (SECTIONS[i].id === S.section ? ' cur' : '') + (S.area === 'tabs' && i === S.tab ? ' focus' : '');
    }
    scheduleHero();
  }

  function current() {
    if (S.area !== 'rows' || !S.nav) return null;
    var p = S.nav.get();
    return p.r < 0 ? null : S.rows[p.r].items[p.c];
  }

  function openSection(id, opts) {
    opts = opts || {};
    if (S.nav && S.section) S.mem[S.section] = S.nav.get();
    if (!opts.noHistory && id !== S.section) S.history.push(S.section);
    S.section = id;
    for (var i = 0; i < SECTIONS.length; i++) if (SECTIONS[i].id === id) S.tab = i;
    // Mention TMDB/JustWatch (obligatoire) affichée seulement dans Réglages.
    el.stage.className = (layoutFor(id).flat ? 'flat' : '') + (id === 'settings' ? ' credits' : '') + (S.booting ? ' boot' : '');
    S.rows = rowsFor(id);
    renderRows();
    var saved = S.mem[id];
    S.nav = N.createNav(S.rows.map(function (r) { return r.items.length; }), saved || opts.start);
    S.area = opts.area || (S.rows.length ? 'rows' : 'tabs');
    if (id !== 'settings') { prefs.last = id; savePrefs(); }
    applyFocus();
  }

  /* Rafraîchit une section sans perdre le focus (données arrivées en arrière-plan). */
  function itemId(it) { return it ? [it.type, it.key || '', it.id || '', it.app ? it.app.id : '', it.t ? it.t.kind + it.t.id : ''].join('|') : ''; }

  function refreshSection() {
    var keep = S.nav ? S.nav.get() : null, area = S.area, was = itemId(current());
    S.rows = rowsFor(S.section);
    renderRows();
    // Focus conservé sur la même tuile même si une tuile apparaît avant elle.
    if (was) S.rows.forEach(function (row, r) { row.items.forEach(function (it, c) { if (itemId(it) === was) keep = { r: r, c: c }; }); });
    S.nav = N.createNav(S.rows.map(function (r) { return r.items.length; }), keep);
    S.area = S.rows.length ? area : 'tabs';
    lastTile = null;
    applyFocus();
  }

  // ---------------------------------------------------------------------------
  // Zone mise en avant
  // ---------------------------------------------------------------------------

  var heroTimer = null, heroSeq = 0, front = 'A', bgKey = null;

  function scheduleHero() {
    clearTimeout(heroTimer);
    heroTimer = setTimeout(renderHero, 110); // évite les requêtes/fondus pendant un appui maintenu
  }

  function setBg(key, css) {
    if (key === bgKey) return;
    bgKey = key;
    var nb = front === 'A' ? 'B' : 'A';
    var a = $('bd' + front), b = $('bd' + nb);
    b.style.backgroundImage = css;
    b.className = 'bd on'; a.className = 'bd';
    front = nb;
  }
  function setImageBg(url, fallbackCss, seq) {
    if (bgKey === url) return;
    var img = new Image();
    img.onload = function () { if (seq === heroSeq) setBg(url, 'url("' + url + '")'); };
    img.onerror = function () { if (seq === heroSeq) { setBg('fb:' + fallbackCss, fallbackCss); setText(el.note, 'Image indisponible.'); } };
    img.src = url;
  }
  function plainBg(accent) {
    return 'radial-gradient(ellipse 1300px 760px at 78% 18%, ' + hexA(accent, 0.38) + ', rgba(5,5,6,0) 70%), linear-gradient(#0b0b0d, #050506)';
  }
  function hexA(hex, a) {
    var h = hex.replace('#', ''); if (h.length === 3) h = h.replace(/(.)/g, '$1$1');
    var n = parseInt(h, 16); return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function setText(node, s) { node.textContent = s || ''; }

  function setTitle(t, logo) {
    el.htitle.innerHTML = '';
    if (logo) {
      var img = document.createElement('img'); img.alt = t;
      img.onerror = function () { el.htitle.innerHTML = ''; var x = document.createElement('div'); x.className = 'txt'; x.textContent = t; el.htitle.appendChild(x); };
      img.src = logo; el.htitle.appendChild(img);
    } else {
      var d = document.createElement('div'); d.className = 'txt'; d.textContent = t; el.htitle.appendChild(d);
    }
  }

  function actionFor(s) {
    var st = svcState(s);
    if (st === 'ready') return { on: true, text: 'Ouvrir ' + s.label };
    if (st === 'desktop') return { on: false, text: 'Aperçu sur ordinateur : lancement possible uniquement sur la TV' };
    if (st === 'pending') return { on: false, text: 'Recherche de ' + s.label + ' sur la TV…' };
    if (st === 'unknown') return { on: false, text: 'Liste des applications indisponible · OK pour les détails' };
    return { on: false, text: s.label + ' non détectée · OK pour savoir comment y accéder' };
  }
  function setAction(a) {
    el.action.className = 'action' + (a.on ? '' : ' off');
    el.actOk.textContent = a.on ? 'OK' : 'i';
    setText(el.actText, a.text);
  }

  function heroSection(title, kicker, text) {
    setBg('flat', plainBg('#3a3a40'));
    setText(el.kicker, kicker); setTitle(title, null); setText(el.meta, ''); setText(el.overview, text); setText(el.note, '');
    el.action.style.display = 'none';
  }

  function renderHero() {
    var seq = ++heroSeq;
    var it = current();
    el.action.style.display = '';
    if (S.section === 'all') {
      return heroSection('Toutes les applications', 'Accueil+', S.detect === 'ok' ? 'Applications installées, par ordre alphabétique. OK pour ouvrir.' : '');
    }
    if (S.section === 'settings') {
      heroSection('Réglages', 'Accueil+', 'Accueil+ ne remplace pas l’accueil Samsung et ne démarre pas seul à l’allumage : aucune API publique ne le permet.');
      return setText(el.note, 'Accès le plus rapide : épinglez Accueil+ en tête de l’accueil Samsung, puis Home → OK.');
    }
    if (!it) {
      var sec = SECTIONS[S.tab];
      setBg('tab', plainBg('#3a3a40'));
      setText(el.kicker, 'Section'); setTitle(sec.label, null); setText(el.meta, ''); setText(el.overview, ''); setText(el.note, '');
      setAction({ on: true, text: 'Ouvrir ' + sec.label });
      return;
    }
    if (it.type === 'more') {
      setBg('more', plainBg('#5a5a64'));
      setText(el.kicker, 'Accueil+'); setTitle('Toutes les applications', null); setText(el.meta, S.detect === 'ok' ? S.installed.length + ' applications détectées' : '');
      setText(el.overview, 'Toutes les applications installées sur le téléviseur, au même endroit.'); setText(el.note, '');
      return setAction({ on: true, text: 'Afficher la liste' });
    }
    if (it.type === 'app') {
      setBg('app', plainBg('#3a3a40'));
      setText(el.kicker, 'Application'); setTitle(it.app.name, null); setText(el.meta, ''); setText(el.overview, ''); setText(el.note, '');
      return setAction({ on: true, text: 'Ouvrir ' + it.app.name });
    }
    if (it.type === 'opt' && it.id !== 'pin') return;
    if (it.type === 'resume') return heroResume(S.svc[it.key], BRAND[it.key]);

    var s = S.svc[it.key], b = BRAND[it.key];
    if (it.type === 'title' || (b.p && T.enabled())) {
      var t = it.type === 'title' ? it.t : T.heroFor(b.p, GROUPS.streaming.map(function (k) { return BRAND[k].p; }));
      if (t) return heroTitle(t, s, seq);
      if (T.state(b.p) === 'loading') {
        setText(el.note, 'Chargement des images…');
      } else if (T.state(b.p) === 'error') {
        heroService(s, b, 'Images TMDB indisponibles (réseau ou service).');
        return;
      }
    }
    heroService(s, b, b.p && !T.enabled() ? 'Images TMDB désactivées (clé absente).' : '');
  }

  function heroResume(s, b) {
    setBg('svc:' + s.key, plainBg(b.fg === '#fff' ? b.bg : b.fg));
    var pin = prefs.pins[s.key];
    setText(el.kicker, 'Reprendre');
    setTitle(pin || s.label, null);
    setText(el.meta, s.label + ' · ouvert depuis Accueil+ ' + W.ago(prefs.lastGame.ts));
    setText(el.overview, pin ? 'Votre jeu du moment sur ' + s.label + '. Accueil+ ouvre l’application ; le jeu se choisit ensuite dans ' + s.label + '.'
      : 'Le dernier service de jeu que vous avez ouvert. Accueil+ ne peut pas lire l’historique de jeu des applications.');
    setText(el.note, '');
    var a = actionFor(s);
    if (a.on && pin) a.text = 'Ouvrir ' + s.label + ', puis lancez « ' + pin + ' »';
    setAction(a);
  }

  function heroService(s, b, note) {
    var pin = GROUPS.games.indexOf(s.key) >= 0 ? prefs.pins[s.key] : null;
    if (pin) {
      heroResume(s, b);
      setText(el.kicker, 'Jeu du moment · ' + s.label);
      setText(el.meta, prefs.lastGame && prefs.lastGame.key === s.key ? s.label + ' · ouvert ' + W.ago(prefs.lastGame.ts) : s.label + ' · ' + s.meta.join(' · '));
      return;
    }
    setBg('svc:' + s.key, plainBg(b.fg === '#fff' ? b.bg : b.fg));
    var kind = GROUPS.games.indexOf(s.key) >= 0 ? 'Jeux · Cloud gaming' : GROUPS.fun.indexOf(s.key) >= 0 ? 'Musique et divertissement' : 'Streaming';
    setText(el.kicker, kind);
    setTitle(s.label, null);
    setText(el.meta, s.meta.join(' · '));
    setText(el.overview, s.blurb + (GAME_NOTE[s.key] && svcState(s) !== 'ready' ? ' ' + GAME_NOTE[s.key] : ''));
    setText(el.note, note || '');
    setAction(actionFor(s));
  }

  function heroTitle(t, s, seq) {
    setImageBg(T.img(t.backdrop, 'w1280'), plainBg(BRAND[s.key].fg === '#fff' ? BRAND[s.key].bg : BRAND[s.key].fg), seq);
    setText(el.kicker, 'Populaire sur ' + s.label + ' en France');
    setTitle(t.name, T.logoCached(t));
    setText(el.meta, (t.kind === 'tv' ? 'Série' : 'Film') + (t.year ? ' · ' + t.year : ''));
    setText(el.overview, t.overview || 'Résumé non disponible.');
    setText(el.note, 'Disponibilité selon TMDB / JustWatch, susceptible d’évoluer.');
    var a = actionFor(s);
    if (a.on) a.text = 'Ouvrir ' + s.label + ' (recherchez le titre dans l’application)';
    setAction(a);
    if (!T.logoCached(t)) T.logo(t).then(function (url) { if (url && seq === heroSeq) setTitle(t.name, url); });
  }

  // ---------------------------------------------------------------------------
  // Actions (uniquement sur OK)
  // ---------------------------------------------------------------------------

  function toast(msg, err, ms) {
    el.toast.textContent = msg;
    el.toast.className = 'toast on' + (err ? ' err' : '');
    clearTimeout(toast.t);
    toast.t = setTimeout(function () { el.toast.className = 'toast' + (err ? ' err' : ''); }, ms || 2600);
  }

  function sheet(title, body) {
    S.modal = true;
    setText(el.shTitle, title); setText(el.shBody, body);
    el.veil.className = 'veil on';
  }
  function closeSheet() {
    S.modal = null; S.pinKey = null; el.veil.className = 'veil';
    el.shInput.hidden = true; el.shInput.blur();
  }

  /* Saisie du jeu du moment : champ texte (clavier virtuel de la TV). Vide = effacer. */
  function pinSheet(key) {
    var s = S.svc[key];
    sheet('Jeu du moment sur ' + s.label, 'Tapez le nom du jeu, puis OK. Laissez vide pour l’effacer.\nC’est un simple rappel : le jeu se lance ensuite dans ' + s.label + '.');
    S.modal = 'input'; S.pinKey = key;
    el.shInput.value = prefs.pins[key] || '';
    el.shInput.hidden = false;
    el.shInput.focus();
  }
  function savePin() {
    var v = el.shInput.value.replace(/\s+/g, ' ').trim().slice(0, PIN_MAX), key = S.pinKey;
    if (v) prefs.pins[key] = v; else delete prefs.pins[key];
    savePrefs(); closeSheet(); refreshSection();
    toast(v ? 'Jeu du moment : ' + v : 'Jeu du moment effacé');
  }

  function launchApp(id, label, key) {
    if (S.launching) return;
    S.launching = true;
    toast('Ouverture de ' + label + '…', false, 9000);
    P.launch(id, function () {
      S.launching = false;
      toast(label + ' ouverte', false, 1500);
      if (key && GROUPS.games.indexOf(key) >= 0) {
        prefs.lastGame = { key: key, ts: Date.now() }; savePrefs();
        if (document.hidden) S.dirty = true; else refreshSection(); // sur la TV : au retour dans Accueil+
      }
    }, function (err) {
      S.launching = false;
      toast('Impossible d’ouvrir ' + label, true, 3200);
      sheet('Impossible d’ouvrir ' + label, 'Le téléviseur a refusé le lancement (' + err.name + (err.message ? ' : ' + err.message : '') + ').\n' +
        'Vérifiez que l’application est à jour dans Samsung Apps, puis réessayez.');
    });
  }

  function activateService(s) {
    var st = svcState(s);
    if (st === 'ready') return launchApp(s.app.id, s.label, s.key);
    if (st === 'desktop') return sheet(s.label, 'Aperçu sur ordinateur : l’API Tizen n’existe pas dans ce navigateur, rien ne peut être lancé.\n' +
      'Sur le téléviseur, ' + s.label + ' s’ouvrira si elle est installée.');
    if (st === 'pending') return toast('Recherche des applications en cours…');
    if (st === 'unknown') return sheet(s.label, 'Le téléviseur n’a pas fourni la liste des applications (' + S.detectErr + ').\nAccueil+ ne lance donc rien à l’aveugle.');
    sheet(s.label + ' non détectée', s.missing || (s.label + ' n’apparaît pas parmi les applications installées.\nInstallez-la depuis Samsung Apps, puis relancez Accueil+.'));
  }

  function activate() {
    if (S.area === 'tabs') { openSection(SECTIONS[S.tab].id); return; }
    var it = current();
    if (!it) return;
    if (it.type === 'svc' || it.type === 'title' || it.type === 'resume') return activateService(S.svc[it.key]);
    if (it.type === 'more') return openSection('all');
    if (it.type === 'app') return launchApp(it.app.id, it.app.name);
    if (it.type === 'opt') {
      if (it.id === 'start-home' || it.id === 'start-last') {
        prefs.start = it.id === 'start-home' ? 'home' : 'last'; savePrefs();
        refreshSection(); toast(prefs.start === 'home' ? 'Démarrage sur l’accueil' : 'Démarrage sur la dernière section');
      } else if (it.id === 'refresh') {
        T.clear(); toast('Cache d’images vidé — rechargement…'); T.loadAll(onTmdb);
      } else if (it.id === 'pin') {
        pinSheet(it.key);
      } else if (it.id === 'status') {
        sheet('État des services', statusText());
      }
    }
  }

  function statusText() {
    if (S.detect === 'no-tizen') return 'Aperçu sur ordinateur : API Tizen absente, aucune application détectable.';
    if (S.detect === 'error') return 'Liste des applications indisponible (' + S.detectErr + ').';
    var lines = [];
    Object.keys(BRAND).forEach(function (k) { var s = S.svc[k]; lines.push((s.app ? '✓ ' : '— ') + s.label + (s.app ? '  (' + s.app.id + ')' : '  non détectée')); });
    return lines.join('\n');
  }

  function back() {
    if (S.modal) return closeSheet();
    if (S.area === 'rows' && S.section !== 'home') {
      var prev = S.history.pop() || 'home';
      return openSection(prev, { noHistory: true });
    }
    if (S.area === 'rows') { S.area = 'tabs'; S.tab = 0; return applyFocus(); }
    if (S.section !== 'home') return openSection('home', { noHistory: true });
    // Accueil, focus sur les onglets : quitter → l'accueil Samsung reprend la main.
    if (!P.exit()) toast('Sur la TV, Retour ici revient à l’accueil Samsung');
  }

  // ---------------------------------------------------------------------------
  // Clavier / télécommande
  // ---------------------------------------------------------------------------

  function onKey(e) {
    var k = e.keyCode;
    var handled = true;
    if (S.modal === 'input') {
      if (k === KEYS.ENTER && !e.repeat) { savePin(); e.preventDefault(); }
      else if (k === KEYS.BACK || k === KEYS.ESC) { closeSheet(); e.preventDefault(); }
      return; // les autres touches vont au champ de saisie
    }
    if (S.modal) {
      if (k === KEYS.ENTER && !e.repeat) closeSheet();
      else if (k === KEYS.BACK || k === KEYS.ESC || k === KEYS.BACKSPACE) closeSheet();
      e.preventDefault();
      return;
    }
    if (k === KEYS.LEFT || k === KEYS.RIGHT) {
      if (S.area === 'tabs') {
        var n = S.tab + (k === KEYS.RIGHT ? 1 : -1);
        if (n >= 0 && n < SECTIONS.length) { S.tab = n; applyFocus(); }
      } else if (S.nav.move(k === KEYS.RIGHT ? 'right' : 'left')) applyFocus();
    } else if (k === KEYS.UP) {
      if (S.area === 'rows' && !S.nav.move('up')) { S.area = 'tabs'; applyFocus(); }
      else if (S.area === 'rows') applyFocus();
    } else if (k === KEYS.DOWN) {
      if (S.area === 'tabs') {
        if (SECTIONS[S.tab].id !== S.section) openSection(SECTIONS[S.tab].id);
        else if (S.rows.length) { S.area = 'rows'; applyFocus(); }
      } else if (S.nav.move('down')) applyFocus();
    } else if (k === KEYS.ENTER) {
      if (!e.repeat) activate();
    } else if (k === KEYS.BACK || k === KEYS.ESC || k === KEYS.BACKSPACE) {
      back();
    } else handled = false;
    if (handled) e.preventDefault(); // pas de défilement natif de la page
  }

  // ---------------------------------------------------------------------------
  // Heure, date, météo (Open-Meteo, mis en cache 30 min ; indisponibilité affichée)
  // ---------------------------------------------------------------------------

  function tick() {
    var d = new Date();
    el.clock.textContent = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
    var day = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '');
    el.date.textContent = day.charAt(0).toUpperCase() + day.slice(1);
    setTimeout(tick, (60 - d.getSeconds()) * 1000 + 50);
  }

  function weather() {
    var cache = null;
    try { cache = JSON.parse(localStorage.getItem(WX_KEY)); } catch (e) { /* ignore */ }
    if (cache && cache.ts) showWx(cache);
    if (cache && Date.now() - cache.ts < WX_TTL) return;
    var city = W.cityFromTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone) || 'Paris';
    fetchJSON('https://geocoding-api.open-meteo.com/v1/search?count=1&language=fr&format=json&name=' + encodeURIComponent(city))
      .then(function (g) {
        var r = g && g.results && g.results[0]; if (!r) throw new Error('ville');
        return fetchJSON('https://api.open-meteo.com/v1/forecast?latitude=' + r.latitude.toFixed(3) + '&longitude=' + r.longitude.toFixed(3) + '&current=temperature_2m,weather_code&timezone=auto')
          .then(function (j) { return { ts: Date.now(), city: r.name, temp: Math.round(j.current.temperature_2m), code: j.current.weather_code }; });
      })
      .then(function (w) { try { localStorage.setItem(WX_KEY, JSON.stringify(w)); } catch (e) { /* ignore */ } showWx(w); })
      .catch(function () { if (!cache) el.wx.textContent = 'Météo indisponible'; });
  }
  function showWx(w) {
    var stale = Date.now() - w.ts > 3 * WX_TTL;
    el.wx.textContent = w.temp + '° ' + w.city + (stale ? ' (ancienne donnée)' : '');
    el.wx.title = W.describe(w.code).text;
  }
  function fetchJSON(url) { return T.fetchJSON(url); }

  // ---------------------------------------------------------------------------
  // Démarrage
  // ---------------------------------------------------------------------------

  function onTmdb() {
    if (S.section === 'streaming') refreshSection(); else scheduleHero();
  }

  function fit() {
    var s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    el.stage.style.transform = s < 0.999 || s > 1.001 ? 'scale(' + s + ')' : '';
  }

  function init() {
    el = {
      stage: $('stage'), rows: $('rows'), tabs: $('tabs'), kicker: $('kicker'), htitle: $('htitle'), meta: $('meta'),
      overview: $('overview'), action: $('action'), actOk: $('actOk'), actText: $('actText'), note: $('note'),
      toast: $('toast'), veil: $('veil'), shInput: $('shInput'), shTitle: $('shTitle'), shBody: $('shBody'), clock: $('clock'), date: $('date'), wx: $('wx')
    };
    SECTIONS.forEach(function (s) { var t = document.createElement('div'); t.className = 'tab'; t.textContent = s.label; el.tabs.appendChild(t); });
    P.registerKeys();
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', fit); fit();
    tick(); weather();
    setInterval(function () { if (!document.hidden) weather(); }, 5 * 60 * 1000);
    // Retour dans TV-hub après un jeu : afficher la tuile « Reprendre » à jour, focus conservé.
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && S.dirty) { S.dirty = false; refreshSection(); }
    });

    buildServices([]); // services connus, « non détectés » tant que la TV n'a pas répondu
    var q = location.search.match(/[?&]i=(\d+)/);
    var startSec = prefs.start === 'last' && prefs.last ? prefs.last : 'home';
    if (q) startSec = 'home';
    openSection(startSec, { noHistory: true, start: q ? { r: 0, c: Math.min(+q[1], GROUPS.streaming.length - 1) } : null });
    // ?capture=1 : transitions désactivées (captures d'écran stables).
    var unboot = function () { if (!S.booting || /[?&]capture=1/.test(location.search)) return; S.booting = false; el.stage.className = el.stage.className.replace(' boot', ''); };
    requestAnimationFrame(function () { requestAnimationFrame(unboot); });
    setTimeout(unboot, 300); // si rAF est suspendu (page en arrière-plan)
    detect(refreshSection); // après le focus initial : la détection ne le remplace pas
    T.loadAll(onTmdb);
    var press = function (code) { onKey({ keyCode: code, preventDefault: function () {} }); };
    window.__v6 = { S: S, key: press, prefs: prefs };
    // Captures/tests : ?keys=L,R,U,D,OK,B rejoue une séquence (même convention que scripts/capture.sh).
    var ks = location.search.match(/[?&]keys=([A-Z,]+)/);
    if (ks) setTimeout(function () {
      var map = { L: 37, U: 38, R: 39, D: 40, OK: 13, B: 10009 };
      ks[1].split(',').forEach(function (k) { if (map[k]) press(map[k]); });
    }, 600);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

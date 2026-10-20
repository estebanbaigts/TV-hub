/*
 * Test de bout en bout dans le navigateur, contre la SIMULATION (dev/tizen-mock.js).
 * Actif uniquement avec ?e2e=1 (?fresh=1 : démarre seulement avec des préférences vides). Résultats : window.__e2e = { done, passed, failed, log }.
 */
(function () {
  'use strict';
  if (/[?&](e2e|fresh)=1/.test(location.search)) {
    try { localStorage.clear(); } catch (e) {}
    // En quittant, l'app enregistre ses préférences ; une page de test ne doit rien laisser derrière
    // elle (sinon la page suivante démarre avec un focus mémorisé). Écouteur posé après celui de l'app.
    window.addEventListener('load', function () {
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) { try { localStorage.clear(); } catch (e) {} }
      });
    });
  }

  // ?keys=L,L,D,OK,RED… : rejoue une séquence de touches après la détection (captures d'écran).
  var seq = (location.search.match(/[?&]keys=([A-Z,]+)/) || [])[1];
  if (seq) {
    var CODES = { L: 37, U: 38, R: 39, D: 40, OK: 13, BACK: 10009, RED: 403 };
    window.addEventListener('load', function () {
      var list = seq.split(','), i = 0;
      (function next() {
        if (!(window.__tvhub && window.__tvhub.discovery.reason !== 'pending')) { setTimeout(next, 50); return; }
        if (i >= list.length) return;
        var ev = new KeyboardEvent('keydown', { bubbles: true });
        Object.defineProperty(ev, 'keyCode', { get: function () { return CODES[list[i]]; } });
        document.dispatchEvent(ev);
        i++;
        setTimeout(next, 250);
      })();
    });
  }

  if (!/[?&]e2e=1/.test(location.search)) return;

  var R = window.__e2e = { done: false, passed: 0, failed: 0, log: [], perf: null, trace: [] };
  function snap(label) { try { R.trace.push(label + ': ' + localStorage.getItem('tvhub.prefs.v1')); } catch (e) {} }
  snap('début e2e.js');
  window.addEventListener('storage', function () { snap('événement storage'); });
  window.addEventListener('load', function () { snap('load (prefs app = ' + JSON.stringify(window.__tvhub && window.__tvhub.prefs.lastFocus) + ')'); });
  var KEY = { L: 37, U: 38, R: 39, D: 40, OK: 13, BACK: 10009, RED: 403 };
  function press(code) { document.dispatchEvent(new KeyboardEvent('keydown', { keyCode: code, bubbles: true })); }
  // keyCode n'est pas initialisable via le constructeur dans tous les moteurs : on le force.
  var orig = window.KeyboardEvent;
  window.KeyboardEvent = function (type, init) {
    var ev = new orig(type, init);
    Object.defineProperty(ev, 'keyCode', { get: function () { return init.keyCode; } });
    return ev;
  };
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function focused() { var n = document.querySelector('.tile.is-focused'); return n && n.getAttribute('data-tid'); }
  function check(name, cond, extra) {
    if (cond) R.passed++; else R.failed++;
    R.log.push((cond ? 'ok   ' : 'FAIL ') + name + (cond || !extra ? '' : '  [' + extra + ']'));
  }
  function rowTids(id) {
    return Array.prototype.map.call(document.querySelectorAll('.row-' + id + ' .tile'), function (n) { return n.getAttribute('data-tid'); });
  }

  async function run() {
    // Attend la fin de la détection des applications (et non un délai fixe).
    for (var t = 0; t < 60 && !(window.__tvhub && window.__tvhub.discovery.reason !== 'pending'); t++) await wait(50);
    await wait(100);
    check('focus initial sur la première app disponible (Xbox)', focused() === 'svc:xbox', focused());
    check('Luna absente affichée « Non détectée »', !!document.querySelector('[data-tid="svc:luna"].is-missing'));
    var all = rowTids('all');
    check('app de service masquée exclue', all.indexOf('app:mock.service') === -1);
    check('TV Hub ne se liste pas lui-même', all.indexOf('app:tvhubPerso.TVHub') === -1);
    check('Disney+ (optionnelle, absente) non affichée', !document.querySelector('[data-tid="svc:disney"]'));

    press(KEY.R); check('droite', focused() === 'svc:gaminghub', focused());
    press(KEY.R); check('droite en bout de rangée : reste', focused() === 'svc:gaminghub', focused());
    press(KEY.L); press(KEY.L); check('gauche', focused() === 'svc:luna', focused());
    press(KEY.D); check('bas -> Streaming', focused() === 'svc:netflix', focused());
    press(KEY.U); check('haut -> retour même colonne', focused() === 'svc:luna', focused());
    press(KEY.U); check('haut en première rangée : reste', focused() === 'svc:luna', focused());

    // Rail : ← au bord gauche, aperçu de section, retour dans les rangées.
    function railIdx() { return Array.prototype.indexOf.call(document.querySelectorAll('.ri'), document.querySelector('.ri.is-focused')); }
    press(KEY.L);
    check('← au bord gauche : rail (Jeux)', railIdx() === 0 && !focused(), railIdx() + '/' + focused());
    press(KEY.D);
    check('rail ↓ : aperçu de Streaming', railIdx() === 1 && !!document.querySelector('.row-streaming.is-active'));
    press(KEY.R);
    check('rail → : entre dans Streaming', focused() === 'svc:netflix', focused());
    press(KEY.L); press(KEY.U); press(KEY.R);
    check('rail ↑ puis → : retour sur la carte de jeu mémorisée', focused() === 'svc:luna', focused());
    check('la carte de jeu focalisée est dépliée', !!document.querySelector('[data-tid="svc:luna"].is-open'));

    // Service absent : explication, aucun lancement.
    var before = window.__launches.length;
    press(KEY.OK); await wait(50);
    check('Luna absente : feuille explicative ouverte', !document.getElementById('sheetBackdrop').hidden);
    check('Luna absente : aucun lancement tenté', window.__launches.length === before);
    press(KEY.BACK);
    check('Retour ferme la feuille', document.getElementById('sheetBackdrop').hidden);

    // Lancement réussi + restauration du focus.
    press(KEY.D); press(KEY.OK); await wait(300);
    check('Netflix : lancement demandé avec l’id découvert', window.__launches[window.__launches.length - 1] === 'mock.netflix');
    document.dispatchEvent(new Event('visibilitychange')); await wait(300);
    check('retour d’app : focus restauré sur Netflix', focused() === 'svc:netflix', focused());

    // Échec de lancement.
    press(KEY.D); // Favoris vide -> sautée : « Toutes les applications »
    check('rangée vide sautée', rowTids('all').indexOf(focused()) !== -1, focused());

    // Carrousel horizontal : la dernière carte devient visible, la première sort à gauche, et retour.
    function sx(n) { // position finale dans le repère 1920×1080 : mise en page + décalage demandé
      var tr = n.parentNode;           // (indépendant de l'avancement de l'animation)
      var x = -parseFloat((tr.style.transform.match(/translate3d\((-?[\d.]+)px/) || [0, '0'])[1]);
      var left = 240 + n.offsetLeft - tr.children[0].offsetLeft - x;
      return { left: left, right: left + n.offsetWidth };
    }
    var allNodes = document.querySelectorAll('.row-all .tile');
    var firstN = allNodes[0], lastN = allNodes[allNodes.length - 1];
    check('« Toutes les apps » : une seule rangée (carrousel)', document.querySelectorAll('.row-all').length === 1);
    var g4 = 0;
    while (focused() !== lastN.getAttribute('data-tid') && g4++ < 60) press(KEY.R);
    check('carrousel : la dernière carte est atteinte et entièrement visible', focused() === lastN.getAttribute('data-tid') && sx(lastN).right <= 1920 - 100, Math.round(sx(lastN).right));
    check('carrousel : la première carte est sortie à gauche', sx(firstN).right < 200, Math.round(sx(firstN).right));
    var g5 = 0;
    while (focused() !== firstN.getAttribute('data-tid') && g5++ < 60) press(KEY.L);
    check('carrousel : retour au début, première carte à sa place', Math.abs(sx(firstN).left - 240) < 4, Math.round(sx(firstN).left));

    press(KEY.OK); await wait(300);
    var t = document.getElementById('toast');
    check('échec de lancement signalé', /toast-error/.test(t.className) && /NotFoundError/.test(t.textContent), t.textContent);

    // Personnalisation : ajout aux favoris.
    press(KEY.RED);
    check('Rouge : mode personnalisation', document.body.classList.contains('mode-edit'));
    press(KEY.OK); await wait(20);
    var btns = Array.prototype.map.call(document.querySelectorAll('.sheet-btn'), function (b) { return b.textContent; });
    check('options : Ajouter aux favoris', btns[0] === 'Ajouter aux favoris', btns.join('|'));
    press(KEY.OK); await wait(20);
    check('favori ajouté', rowTids('favorites').indexOf('app:mock.broken') !== -1);

    // Déplacement dans Streaming et persistance.
    var g3 = 0;
    while (rowTids('streaming').indexOf(focused()) === -1 && g3++ < 6) press(KEY.U);
    var guard2 = 0;
    while (focused() !== 'svc:netflix' && guard2++ < 10) press(KEY.L);
    press(KEY.OK); await wait(20);
    press(KEY.OK); // « Déplacer »
    check('mode déplacement', document.body.classList.contains('mode-move'));
    press(KEY.R); press(KEY.OK);
    var order = rowTids('streaming');
    check('Netflix déplacée en 2e position', order[1] === 'svc:netflix', order.join(','));
    var saved = JSON.parse(localStorage.getItem('tvhub.prefs.v1'));
    check('ordre enregistré localement', saved.order.streaming[1] === 'svc:netflix');
    press(KEY.BACK);
    check('Retour quitte la personnalisation', !document.body.classList.contains('mode-edit'));

    // Performance : 3000 appuis.
    var t0 = performance.now();
    var dirs = [KEY.R, KEY.R, KEY.D, KEY.L, KEY.U, KEY.R, KEY.D, KEY.D, KEY.U, KEY.L];
    for (var i = 0; i < 3000; i++) press(dirs[i % dirs.length]);
    var dt = performance.now() - t0;
    R.perf = { keys: 3000, totalMs: Math.round(dt), msPerKey: +(dt / 3000).toFixed(3),
      heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null,
      domNodes: document.getElementsByTagName('*').length };
    check('3000 appuis traités < 2 ms/appui en moyenne', dt / 3000 < 2, R.perf.msPerKey);
    check('un seul élément focalisé (rangées + rail)', document.querySelectorAll('.tile.is-focused, .ri.is-focused').length === 1);

    // Retour à l'accueil Samsung.
    press(KEY.BACK);
    check('Retour (accueil) appelle exit()', window.__exited === true);

    R.done = true;
  }
  window.addEventListener('load', function () { run().catch(function (e) { R.log.push('ERREUR ' + e.message); R.failed++; R.done = true; }); });
})();

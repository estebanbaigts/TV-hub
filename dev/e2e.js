/*
 * Test de bout en bout dans le navigateur, contre la SIMULATION (dev/tizen-mock.js).
 * ?fresh=1 : démarre avec des préférences vides. ?e2e=1 : lance le test.
 * Résultats : window.__e2e = { done, passed, failed, log }.
 * (La relecture de touches ?keys=… est gérée par l'application elle-même.)
 */
(function () {
  'use strict';
  if (/[?&](e2e|fresh)=1/.test(location.search)) { try { localStorage.clear(); } catch (e) { /* ignore */ } }
  if (!/[?&]e2e=1/.test(location.search)) return;

  var R = window.__e2e = { done: false, passed: 0, failed: 0, log: [] };
  var K = { L: 37, U: 38, R: 39, D: 40, OK: 13, B: 10009 };
  function press(s) { s.split(',').forEach(function (k) { window.__v6.key(K[k]); }); }
  function focused() { var t = document.querySelector('.tile.focus'); return t ? t.textContent : ''; }
  function check(name, ok) { R[ok ? 'passed' : 'failed']++; R.log.push((ok ? 'ok   ' : 'FAIL ') + name); }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  window.addEventListener('load', function () {
    var S;
    wait(500).then(function () {
      S = window.__v6.S;
      check('démarrage sur l’accueil, focus sur la 1re tuile', S.section === 'home' && S.area === 'rows' && /Netflix/.test(focused()));
      check('services détectés par nom', S.detect === 'ok' && !!S.svc.netflix.app);
      press('L');
      check('pas de bouclage à gauche', /Netflix/.test(focused()));
      press('OK,OK');
      check('un seul lancement malgré deux OK', window.__launches.length === 1 && window.__launches[0] === 'org.tizen.netflix-app');
      return wait(400);
    }).then(function () {
      press('R,R,R,OK');
      var appletv = S.svc.appletv.app;
      check('service absent : explication, aucun lancement', appletv || (S.modal === true && window.__launches.length === 1));
      press('B');
      check('Retour ferme la fenêtre', !S.modal);
      press('D,L,L,OK');
      return wait(400);
    }).then(function () {
      check('lancement Xbox', window.__launches.indexOf('MockXboxGP.Xbox') >= 0);
      check('tuile Reprendre ajoutée, focus conservé sur Xbox', S.rows[1].items[0].type === 'resume' && /^Xbox$/.test(focused()));
      press('U');
      var before = focused();
      press('U,R,R,D');
      check('onglet Jeux ouvert par ↓', S.section === 'games');
      press('B');
      check('Retour → accueil, dernière tuile visitée restaurée', S.section === 'home' && S.area === 'rows' && focused() === before);
      press('B,B');
      check('Retour depuis les onglets de l’accueil → quitte vers Samsung', window.__exited === true);
      check('aucun défilement de la page', document.scrollingElement.scrollTop === 0);
      R.done = true;
      try { localStorage.clear(); } catch (e) { /* ignore */ }
      console.log('[e2e] ' + R.passed + ' réussis, ' + R.failed + ' échoués\n' + R.log.join('\n'));
    }).catch(function (e) { check('exception : ' + e.message, false); R.done = true; });
  });
})();

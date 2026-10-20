/* Tests sans dépendance : node tests/run-tests.js */
'use strict';
var fs = require('fs');
var path = require('path');
var assert = require('assert');

var ROOT = path.join(__dirname, '..');
var APP = path.join(ROOT, 'app');
var Nav = require(path.join(APP, 'js/nav.js'));
var Store = require(path.join(APP, 'js/store.js'));
var Catalog = require(path.join(APP, 'js/catalog.js'));
var Widgets = require(path.join(APP, 'js/widgets.js'));

var passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ok   ' + name); }
  catch (e) { failed++; console.log('  FAIL ' + name + '\n       ' + e.message); }
}

console.log('Navigation');
test('gauche/droite bornées, sans bouclage', function () {
  var n = Nav.createNav([3]);
  assert.strictEqual(n.move('left'), false);
  n.move('right'); n.move('right');
  assert.deepStrictEqual(n.get(), { r: 0, c: 2 });
  assert.strictEqual(n.move('right'), false);
});
test('haut/bas bornés', function () {
  var n = Nav.createNav([2, 2]);
  assert.strictEqual(n.move('up'), false);
  n.move('down');
  assert.strictEqual(n.move('down'), false);
  assert.deepStrictEqual(n.get(), { r: 1, c: 0 });
});
test('colonne bornée vers une rangée plus courte', function () {
  var n = Nav.createNav([5, 2]);
  n.focus(0, 4); n.move('down');
  assert.deepStrictEqual(n.get(), { r: 1, c: 1 });
});
test('mémoire de colonne par rangée', function () {
  var n = Nav.createNav([5, 5]);
  n.focus(0, 3); n.move('down'); n.move('left'); n.move('up');
  assert.deepStrictEqual(n.get(), { r: 0, c: 3 });
  n.move('down');
  assert.deepStrictEqual(n.get(), { r: 1, c: 2 });
});
test('les rangées vides sont sautées', function () {
  var n = Nav.createNav([2, 0, 3]);
  n.move('down');
  assert.deepStrictEqual(n.get(), { r: 2, c: 0 });
  n.move('up');
  assert.deepStrictEqual(n.get(), { r: 0, c: 0 });
});
test('déterminisme sur 10 000 touches aléatoires reproductibles', function () {
  function run() {
    var seed = 42, n = Nav.createNav([3, 6, 0, 20, 4]), dirs = ['up', 'down', 'left', 'right'], trace = [];
    for (var i = 0; i < 10000; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      n.move(dirs[seed % 4]);
      var p = n.get();
      assert.ok(p.r >= 0 && p.c >= 0, 'position valide');
      trace.push(p.r + ':' + p.c);
    }
    return trace.join(',');
  }
  assert.strictEqual(run(), run());
});
test('setLengths garde une position valide', function () {
  var n = Nav.createNav([4, 4]);
  n.focus(1, 3); n.setLengths([4, 0]);
  assert.deepStrictEqual(n.get(), { r: 0, c: 3 });
  n.setLengths([0, 0]);
  assert.deepStrictEqual(n.get(), { r: -1, c: -1 });
  assert.strictEqual(n.move('down'), false);
});
test('focusRow restaure la colonne mémorisée et refuse une rangée vide', function () {
  var n = Nav.createNav([5, 0, 5]);
  n.focus(2, 3); n.move('up');
  assert.deepStrictEqual(n.get(), { r: 0, c: 3 });
  assert.strictEqual(n.focusRow(1), false);
  assert.strictEqual(n.focusRow(2), true);
  assert.deepStrictEqual(n.get(), { r: 2, c: 3 });
  n.focusRow(0);
  assert.deepStrictEqual(n.get(), { r: 0, c: 3 });
});
test('shift échange et reste borné', function () {
  var l = ['a', 'b', 'c'];
  assert.strictEqual(Nav.shift(l, 0, -1), 0);
  assert.strictEqual(Nav.shift(l, 0, 1), 1);
  assert.deepStrictEqual(l, ['b', 'a', 'c']);
});

console.log('Préférences');
test('applyOrder respecte l’ordre enregistré, nouveaux à la fin', function () {
  var items = [{ tid: 'a' }, { tid: 'b' }, { tid: 'c' }, { tid: 'd' }];
  var out = Store.applyOrder(items, ['c', 'x', 'a']).map(function (i) { return i.tid; });
  assert.deepStrictEqual(out, ['c', 'a', 'b', 'd']);
});

console.log('Catalogue');
test('aucun identifiant d’application codé en dur', function () {
  Catalog.SERVICES.forEach(function (s) {
    assert.ok(!('id' in s) && !('appId' in s), s.key);
  });
});
test('correspondance par nom, sans faux positifs évidents', function () {
  var r = Catalog.resolve([
    { id: 'x1', name: 'YouTube Kids' }, { id: 'x2', name: 'YouTube' },
    { id: 'x3', name: 'Netflix' }, { id: 'x4', name: 'Lunar Calendar' }, { id: 'x5', name: 'Xbox' }
  ]);
  function get(k) { return r.filter(function (s) { return s.key === k; })[0]; }
  assert.strictEqual(get('youtube').app.id, 'x2');
  assert.strictEqual(get('netflix').app.id, 'x3');
  assert.strictEqual(get('luna').app, null);
  assert.strictEqual(get('xbox').app.id, 'x5');
});
test('les services de jeu absents ont une explication', function () {
  Catalog.resolve([]).filter(function (s) { return s.section === 'games' && !s.optional; })
    .forEach(function (s) { assert.ok(s.missing && s.missing.length > 20, s.key); });
});

test('filtre : apps du Store et préinstallées visibles gardées, apps internes et utilitaires écartés', function () {
  var keep = [
    { id: 'org.tizen.netflix-app', name: 'Netflix' }, { id: 'Jz7aUrV2Q4.Twitch', name: 'Twitch' },
    { id: 'E0P3lRI4H7.MYTF1', name: 'TF1+ : Streaming, TV en Direct' }, { id: 'com.samsung.tv.ariavideo', name: 'Apple TV' }
  ];
  var drop = [
    { id: 'org.tizen.settings', name: 'Paramètres' }, { id: 'com.samsung.tv.bixbypromotion', name: 'Bixby' },
    { id: 'g0l3ad0res.emanual', name: 'eManual' }, { id: 'J9fZJDMi1v.SecurityCenter', name: 'Security Center' },
    { id: 'P6mKfXI3eC.FRPublicValueApp', name: 'Services d\u2019intérêt général' }
  ];
  keep.forEach(function (a) { assert.ok(Catalog.isUserApp(a), 'devrait garder ' + a.name); });
  drop.forEach(function (a) { assert.ok(!Catalog.isUserApp(a), 'devrait écarter ' + a.name); });
});
test('filtre : doublons de nom fusionnés (deux paquets CANAL+)', function () {
  var out = Catalog.userApps([{ id: 'QmpwflxWdt.CanalPlusLauncher', name: 'CANAL+' }, { id: 'guMmq95nKK.CanalPlusLauncher', name: 'CANAL+' }]);
  assert.strictEqual(out.length, 1);
});
test('catalogue : TF1+, M6+, france.tv reconnus', function () {
  var r = Catalog.resolve([{ id: 'a', name: 'TF1+ : Streaming, TV en Direct' }, { id: 'b', name: 'M6+ : Streaming et Tv Replay' }, { id: 'c', name: 'france.tv' }]);
  ['tf1', 'm6', 'francetv'].forEach(function (k) { assert.ok(r.filter(function (s) { return s.key === k; })[0].app, k); });
});

console.log('Widgets');
test('codes météo WMO → libellés', function () {
  assert.strictEqual(Widgets.describe(0).text, 'Ensoleillé');
  assert.strictEqual(Widgets.describe(2).icon, 'partly');
  assert.strictEqual(Widgets.describe(63).text, 'Pluie');
  assert.strictEqual(Widgets.describe(95).icon, 'storm');
});
test('ville déduite du fuseau horaire', function () {
  assert.strictEqual(Widgets.cityFromTimezone('Europe/Paris'), 'Paris');
  assert.strictEqual(Widgets.cityFromTimezone('America/New_York'), 'New York');
  assert.strictEqual(Widgets.cityFromTimezone('Etc/UTC'), null);
  assert.strictEqual(Widgets.cityFromTimezone(''), null);
});
test('durées relatives en français', function () {
  var now = 1e12;
  assert.strictEqual(Widgets.ago(now - 20 * 60000, now), 'il y a 20 min');
  assert.strictEqual(Widgets.ago(now - 3 * 3600000, now), 'il y a 3 h');
});

console.log('Contrôles statiques du paquet');
function walk(dir) {
  return fs.readdirSync(dir).reduce(function (acc, f) {
    var p = path.join(dir, f);
    return acc.concat(fs.statSync(p).isDirectory() ? walk(p) : [p]);
  }, []);
}
var files = walk(APP);
var text = files.filter(function (f) { return /\.(js|css|html|xml)$/.test(f); });
// Seuls sites autorisés : ceux des widgets (météo, actualités), plus les espaces de noms XML.
var NET_ORIGINS = ['https://api.open-meteo.com', 'https://geocoding-api.open-meteo.com', 'https://www.franceinfo.fr'];
test('aucune URL réseau hors des 3 sources des widgets', function () {
  var allowed = /^https?:\/\/(www\.w3\.org|tizen\.org|local\/tvhub|api\.open-meteo\.com|geocoding-api\.open-meteo\.com|www\.franceinfo\.fr)/;
  text.forEach(function (f) {
    var urls = fs.readFileSync(f, 'utf8').match(/https?:\/\/[^\s"'<>)]+/g) || [];
    urls.forEach(function (u) { assert.ok(allowed.test(u), path.relative(ROOT, f) + ' -> ' + u); });
  });
});
test('aucune simulation incluse dans app/', function () {
  text.forEach(function (f) {
    assert.ok(fs.readFileSync(f, 'utf8').indexOf('tizen-mock') === -1, path.relative(ROOT, f));
  });
});
test('config.xml : privilèges publics attendus, accès réseau limité aux 3 sources', function () {
  var x = fs.readFileSync(path.join(APP, 'config.xml'), 'utf8');
  var privs = (x.match(/privilege name="([^"]+)"/g) || []).map(function (m) { return m.split('"')[1]; }).sort();
  assert.deepStrictEqual(privs, [
    'http://tizen.org/privilege/application.info',
    'http://tizen.org/privilege/application.launch',
    'http://tizen.org/privilege/internet',
    'http://tizen.org/privilege/tv.inputdevice'
  ]);
  var origins = (x.match(/<access origin="([^"]+)"/g) || []).map(function (m) { return m.split('"')[1]; }).sort();
  assert.deepStrictEqual(origins, NET_ORIGINS.slice().sort());
  assert.ok(!/origin="\*"/.test(x), 'accès réseau ouvert à tous les sites');
  var csp = fs.readFileSync(path.join(APP, 'index.html'), 'utf8').match(/connect-src ([^;]+);/)[1].trim().split(/\s+/).sort();
  assert.deepStrictEqual(csp, NET_ORIGINS.slice().sort());
  assert.ok(/<tizen:profile name="tv-samsung"\/>/.test(x));
});
test('compatibilité moteur Chromium M85 (Tizen 6.5)', function () {
  text.forEach(function (f) {
    var s = fs.readFileSync(f, 'utf8');
    if (/\.css$/.test(f)) {
      assert.ok(!/(^|[;{\s])inset\s*:/.test(s), 'inset: (Chromium 87+) dans ' + f);
      assert.ok(!/aspect-ratio|:has\(|color-mix|backdrop-filter|filter:\s*blur/.test(s), 'CSS non supporté/coûteux dans ' + f);
    }
    if (/\.js$/.test(f)) {
      assert.ok(!/\?\.|\?\?|\bimport\s|\bexport\s/.test(s), 'syntaxe JS non souhaitée dans ' + f);
    }
  });
});
test('icône présente', function () {
  assert.ok(fs.statSync(path.join(APP, 'icon.png')).size > 1000);
});
test('la page de dev a les mêmes éléments que index.html', function () {
  function ids(f) { return (fs.readFileSync(f, 'utf8').match(/id="[^"]+"/g) || []).sort().join(); }
  assert.strictEqual(ids(path.join(ROOT, 'dev/index.html')), ids(path.join(APP, 'index.html')));
});

console.log('\n' + passed + ' réussis, ' + failed + ' échoués');
process.exit(failed ? 1 : 0);

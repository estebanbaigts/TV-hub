/*
 * Moteur commun des maquettes : navigation spatiale D-pad, liaison des données
 * de la tuile focalisée, horloge. Maquettes uniquement (pas de lancement réel).
 *
 * Tuile focalisable : [data-f], avec data-title / data-sub / data-accent / data-kind.
 * Éléments liés : [data-bind="title|sub|kind"] reçoivent le texte de la tuile focalisée,
 * et la variable CSS --accent du <body> prend sa couleur.
 */
(function () {
  'use strict';

  var focused = null;

  function rect(n) { return n.getBoundingClientRect(); }
  function center(r) { return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }

  function focus(n) {
    if (!n || n === focused) return;
    if (focused) focused.classList.remove('is-focused');
    focused = n;
    n.classList.add('is-focused');
    var d = n.dataset;
    if (n.hasAttribute('data-keep')) { scrollInto(n); document.dispatchEvent(new CustomEvent('maquette:focus', { detail: n })); return; }
    if (d.accent) document.body.style.setProperty('--accent', d.accent);
    ['title', 'sub', 'kind'].forEach(function (k) {
      Array.prototype.forEach.call(document.querySelectorAll('[data-bind="' + k + '"]'), function (el) {
        el.textContent = d[k] || '';
      });
    });
    // Pastilles de métadonnées : data-meta="Jeux|Cloud|Manette"
    Array.prototype.forEach.call(document.querySelectorAll('[data-bind="meta"]'), function (el) {
      el.innerHTML = '';
      (d.meta || '').split('|').filter(Boolean).forEach(function (m) {
        var s = document.createElement('span');
        s.textContent = m;
        el.appendChild(s);
      });
    });
    // Illustration en fondu enchaîné (deux calques, opacité seulement).
    if (d.art && window.TVArt) {
      Array.prototype.forEach.call(document.querySelectorAll('[data-bind="art"]'), function (el) {
        if (el.getAttribute('data-current') === d.art) return;
        el.setAttribute('data-current', d.art);
        var layer = document.createElement('div');
        layer.className = 'art-layer';
        layer.innerHTML = window.TVArt.svg(d.art);
        if (el.getAttribute('data-align')) layer.firstChild.setAttribute('preserveAspectRatio', el.getAttribute('data-align') + ' slice');
        el.appendChild(layer);
        void layer.offsetWidth;
        layer.classList.add('is-in');
        var olds = Array.prototype.slice.call(el.children, 0, -1);
        setTimeout(function () { olds.forEach(function (o) { if (o.parentNode) o.parentNode.removeChild(o); }); }, 650);
      });
    }
    scrollInto(n);
    document.dispatchEvent(new CustomEvent('maquette:focus', { detail: n }));
  }

  // Groupes défilants : la tuile reste visible.
  function scrollInto(n) {
    var track = n.closest('[data-scroll]');
    if (track) {
      var axis = track.getAttribute('data-scroll');
      var pad = +(track.getAttribute('data-pad') || 0);
      var cur = +(track.getAttribute('data-off') || 0);
      var view = track.parentNode.getBoundingClientRect();
      var r = rect(n);
      if (axis === 'x') {
        var left = r.left - view.left, right = r.right - view.left, w = view.width;
        if (left < pad) cur += pad - left; else if (right > w - pad) cur -= right - (w - pad);
        cur = Math.min(0, cur);
        track.style.transform = 'translate3d(' + cur + 'px,0,0)';
      } else {
        var top = r.top - view.top, bottom = r.bottom - view.top, h = view.height;
        if (top < pad) cur += pad - top; else if (bottom > h - pad) cur -= bottom - (h - pad);
        cur = Math.min(0, cur);
        track.style.transform = 'translate3d(0,' + cur + 'px,0)';
      }
      track.setAttribute('data-off', cur);
    }
  }

  // Cherche la tuile la plus proche dans la direction, en privilégiant l'alignement.
  function move(dir) {
    if (!focused) return;
    var from = center(rect(focused));
    var best = null, bestScore = Infinity;
    Array.prototype.forEach.call(document.querySelectorAll('[data-f]'), function (n) {
      if (n === focused || n.offsetParent === null) return;
      var c = center(rect(n));
      var dx = c.x - from.x, dy = c.y - from.y;
      var main, cross;
      if (dir === 'left') { main = -dx; cross = Math.abs(dy); }
      else if (dir === 'right') { main = dx; cross = Math.abs(dy); }
      else if (dir === 'up') { main = -dy; cross = Math.abs(dx); }
      else { main = dy; cross = Math.abs(dx); }
      if (main <= 4) return;
      var score = main + cross * 2.5;
      if (score < bestScore) { bestScore = score; best = n; }
    });
    if (best) focus(best);
  }

  var toastTimer;
  function toast(msg) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('is-visible'); }, 2200);
  }

  document.addEventListener('keydown', function (e) {
    var map = { 37: 'left', 38: 'up', 39: 'right', 40: 'down' };
    if (map[e.keyCode]) { move(map[e.keyCode]); e.preventDefault(); }
    else if (e.keyCode === 13 && focused) {
      toast('Maquette : « ' + (focused.dataset.title || '') + ' » s’ouvrirait ici');
      e.preventDefault();
    }
  });

  function clock() {
    var now = new Date();
    var hm = ('0' + now.getHours()).slice(-2) + ':' + ('0' + now.getMinutes()).slice(-2);
    var d = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    d = d.charAt(0).toUpperCase() + d.slice(1);
    Array.prototype.forEach.call(document.querySelectorAll('[data-clock="time"]'), function (n) { n.textContent = hm; });
    Array.prototype.forEach.call(document.querySelectorAll('[data-clock="date"]'), function (n) { n.textContent = d; });
    var h = now.getHours();
    var hello = h < 5 ? 'Bonne nuit' : h < 18 ? 'Bonjour' : 'Bonsoir';
    Array.prototype.forEach.call(document.querySelectorAll('[data-clock="hello"]'), function (n) { n.textContent = hello; });
    setTimeout(clock, 60000 - now.getSeconds() * 1000);
  }

  window.addEventListener('load', function () {
    clock();
    var start = document.querySelector('[data-start]') || document.querySelector('[data-f]');
    focus(start);
  });
})();

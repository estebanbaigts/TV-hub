/*
 * Navigation D-pad déterministe, sans dépendance au DOM (testable sous Node).
 *
 * Règles :
 *  - Gauche/droite : tuile voisine dans la rangée, arrêt aux extrémités (pas de bouclage).
 *  - Haut/bas : rangée non vide adjacente ; la colonne restaurée est la dernière
 *    colonne visitée dans cette rangée, sinon la colonne courante bornée.
 *  - Une même séquence de touches produit toujours le même résultat.
 */
(function (root) {
  'use strict';

  function createNav(lengths, start) {
    var rows = lengths.slice();
    var memory = {};
    var pos = { r: 0, c: 0 };

    function clampPos() {
      if (!rows.some(function (n) { return n > 0; })) { pos = { r: -1, c: -1 }; return; }
      if (pos.r < 0 || pos.r >= rows.length || rows[pos.r] === 0) {
        var r = 0;
        while (rows[r] === 0) r++;
        pos.r = r;
      }
      pos.c = Math.max(0, Math.min(pos.c, rows[pos.r] - 1));
    }

    function setLengths(next) {
      rows = next.slice();
      Object.keys(memory).forEach(function (k) {
        if (+k >= rows.length || memory[k] >= rows[k]) delete memory[k];
      });
      clampPos();
    }

    function move(dir) {
      if (pos.r < 0) return false;
      var before = pos.r + ':' + pos.c;
      if (dir === 'left' && pos.c > 0) pos.c--;
      else if (dir === 'right' && pos.c < rows[pos.r] - 1) pos.c++;
      else if (dir === 'up' || dir === 'down') {
        var step = dir === 'up' ? -1 : 1;
        var r = pos.r + step;
        while (r >= 0 && r < rows.length && rows[r] === 0) r += step;
        if (r >= 0 && r < rows.length) {
          memory[pos.r] = pos.c;
          var c = memory[r] !== undefined ? memory[r] : pos.c;
          pos = { r: r, c: Math.min(c, rows[r] - 1) };
        }
      }
      return before !== pos.r + ':' + pos.c;
    }

    /** Saute à la rangée r (rail) en restaurant sa dernière colonne visitée. */
    function focusRow(r) {
      if (r < 0 || r >= rows.length || rows[r] === 0) return false;
      if (pos.r >= 0) memory[pos.r] = pos.c;
      pos = { r: r, c: memory[r] !== undefined ? Math.min(memory[r], rows[r] - 1) : 0 };
      return true;
    }

    function focus(r, c) {
      pos = { r: r, c: c };
      clampPos();
    }

    if (start) pos = { r: start.r, c: start.c };
    clampPos();

    return {
      move: move,
      focus: focus,
      focusRow: focusRow,
      setLengths: setLengths,
      get: function () { return { r: pos.r, c: pos.c }; }
    };
  }

  /** Déplace l'élément d'indice `from` d'un pas (-1 ou +1). Retourne le nouvel indice. */
  function shift(list, from, delta) {
    var to = from + delta;
    if (to < 0 || to >= list.length) return from;
    var tmp = list[from];
    list[from] = list[to];
    list[to] = tmp;
    return to;
  }

  var api = { createNav: createNav, shift: shift };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TVNav = api;
})(this);

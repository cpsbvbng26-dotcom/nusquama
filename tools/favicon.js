/* 国章から、正方形のファビコン（SVG）を作る。Google の検索結果はファビコンを正方形で求めるため、
 * 縦長の国章を紺の正方形の中央に置く。PNG のアイコン（tools/icons.js）と同じ置き方（高さの 86%）。
 *
 *   node tools/favicon.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const A = path.join(__dirname, '..', 'assets');
const NAVY = '#14213d';
const SIDE = 720;
const SCALE = 0.86;

/* 純粋：国章の SVG（viewBox 0 0 600 720）から、正方形の SVG を作る。 */
function square(emblem) {
  const inner = emblem.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/<title[^>]*>[\s\S]*?<\/title>/, '');
  const h = SIDE * SCALE, w = h * 600 / 720;
  const r = (n) => Math.round(n * 10) / 10;
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + SIDE + ' ' + SIDE + '" role="img" aria-labelledby="t">\n'
    + '<title id="t">ヌスクァマ騎士王国の国章（創作）</title>\n'
    + '<rect width="' + SIDE + '" height="' + SIDE + '" fill="' + NAVY + '"/>\n'
    + '<svg x="' + r((SIDE - w) / 2) + '" y="' + r((SIDE - h) / 2) + '" width="' + r(w) + '" height="' + r(h) + '" viewBox="0 0 600 720">' + inner + '</svg>\n'
    + '</svg>\n';
}

if (require.main === module) {
  fs.writeFileSync(path.join(A, 'favicon.svg'), square(fs.readFileSync(path.join(A, 'emblem.svg'), 'utf8')));
  console.log('assets/favicon.svg を描きました。');
}

module.exports = { square, SIDE };

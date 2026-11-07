/* 国章から、アイコンと共有用の画像を描く。手で走らせ、出力を assets/ に置く（生成物ではなく、置いたもの）。
 *
 *   node tools/icons.js      要: playwright と Chromium
 *
 * 文字の書体を使わない。紺の正方形の上に国章を置くだけである。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const A = path.join(__dirname, '..', 'assets');
const svg = fs.readFileSync(path.join(A, 'emblem.svg'), 'utf8');
const NAVY = '#14213d';

async function draw(page, w, h, scale) {
  const html = `<!doctype html><html><body style="margin:0;background:${NAVY};width:${w}px;height:${h}px;display:flex;align-items:center;justify-content:center">`
    + `<div style="height:${Math.round(h * scale)}px;aspect-ratio:600/720">${svg.replace('<svg ', '<svg width="100%" height="100%" ')}</div></body></html>`;
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(html);
  return page.screenshot({ type: 'png' });
}

/* ICO は、PNG をそのまま収めた形で組む（16・32・48 px）。 */
function ico(pngs) {
  const head = Buffer.alloc(6 + 16 * pngs.length);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(pngs.length, 4);
  let offset = head.length;
  pngs.forEach(([size, buf], i) => {
    const o = 6 + 16 * i;
    head.writeUInt8(size % 256, o); head.writeUInt8(size % 256, o + 1); head.writeUInt8(0, o + 2); head.writeUInt8(0, o + 3);
    head.writeUInt16LE(1, o + 4); head.writeUInt16LE(32, o + 6); head.writeUInt32LE(buf.length, o + 8); head.writeUInt32LE(offset, o + 12);
    offset += buf.length;
  });
  return Buffer.concat([head, ...pngs.map(([, b]) => b)]);
}

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ deviceScaleFactor: 1 });
  fs.writeFileSync(path.join(A, 'apple-touch-icon.png'), await draw(p, 180, 180, 0.86));
  fs.writeFileSync(path.join(A, 'icon-192.png'), await draw(p, 192, 192, 0.86));
  fs.writeFileSync(path.join(A, 'icon-512.png'), await draw(p, 512, 512, 0.86));
  fs.writeFileSync(path.join(A, 'og.png'), await draw(p, 1200, 630, 0.84));
  const small = [];
  for (const s of [16, 32, 48]) small.push([s, await draw(p, s, s, 0.94)]);
  fs.writeFileSync(path.join(A, 'favicon.ico'), ico(small));
  await b.close();
  console.log('assets/ に描きました');
})();

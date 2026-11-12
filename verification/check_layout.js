#!/usr/bin/env node
/* どの頁も、狭い画面と拡大したときに、横にはみ出さないか。
 *
 *   node verification/check_layout.js
 *
 * check.js は HTML を文字として読む。はみ出しは描いてみないと分からないので、これはブラウザを立てる。
 * 幅は 1280・640・390・360・320 px。640 px は、1280 px の窓を 200% に拡大したときの幅である。
 * 320 px は 1280 px を 400% にしたときの幅で、WCAG 2.2 の 1.4.10（リフロー）が求める幅である。
 * 表は .table の中で横に送るので、頁そのものは横に送らない。
 * トップの頁は、最初の画面（スクロールする前に見える範囲）に、国旗と版図の地図と、創作の断りの始まりが収まるかも見る。
 *
 * 要: playwright と Chromium。どちらもないときは 1 で止まる（走らなかった検査は、通った検査ではない）。
 * CI では、ブラウザの故障を頁の誤りと取り違えないよう、別の job で走らせる（.github/workflows/check.yml）。
 */
'use strict';
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

const SITE = path.resolve(__dirname, '..', 'site');
const WIDTHS = [1280, 640, 390, 360, 320];

function pages(dir = SITE, rel = '') {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const r = rel ? rel + '/' + e.name : e.name;
    if (e.isDirectory()) return pages(path.join(dir, e.name), r);
    return e.name.endsWith('.html') ? [r] : [];
  }).sort();
}

function loadPlaywright() {
  try { return require('playwright'); } catch (e) { /* 全体に入れたものを探す */ }
  for (const dir of ['/opt/node22/lib/node_modules', '/usr/lib/node_modules', '/usr/local/lib/node_modules']) {
    try { return require(path.join(dir, 'playwright')); } catch (e) { /* 次へ */ }
  }
  return null;
}

function findChromium() {
  if (process.env.PLAYWRIGHT_CHROMIUM) return process.env.PLAYWRIGHT_CHROMIUM;
  for (const base of [process.env.PLAYWRIGHT_BROWSERS_PATH, '/opt/pw-browsers', path.join(os.homedir(), '.cache', 'ms-playwright')].filter(Boolean)) {
    if (!fs.existsSync(base)) continue;
    for (const d of fs.readdirSync(base).filter((x) => /^chromium-/.test(x)).sort().reverse()) {
      const exe = path.join(base, d, 'chrome-linux', 'chrome');
      if (fs.existsSync(exe)) return exe;
    }
  }
  return null;
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8' };
function serve() {
  return new Promise((res) => {
    const s = http.createServer((req, rep) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const f = path.join(SITE, p);
      if (!f.startsWith(SITE) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rep.writeHead(404); return rep.end('not found'); }
      rep.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
      rep.end(fs.readFileSync(f));
    });
    s.listen(0, '127.0.0.1', () => res(s));
  });
}

async function main() {
  const pw = loadPlaywright();
  if (!pw) { console.log('playwright が見つからない。検査は走らなかった。'); process.exit(1); }
  const exe = findChromium();
  let browser;
  try { browser = await pw.chromium.launch(exe ? { executablePath: exe, args: ['--no-sandbox'] } : { args: ['--no-sandbox'] }); }
  catch (e) { browser = await pw.chromium.launch({ args: ['--no-sandbox'] }); }
  const server = await serve();
  const base = 'http://127.0.0.1:' + server.address().port + '/';
  const list = pages();
  const bad = [];
  let n = 0;
  for (const w of WIDTHS) {
    for (const scheme of ['light', 'dark']) {
      const ctx = await browser.newContext({ viewport: { width: w, height: 800 }, colorScheme: scheme });
      const page = await ctx.newPage();
      for (const p of list) {
        await page.goto(base + p);
        const r = await page.evaluate(() => {
          const vw = document.documentElement.clientWidth;
          const over = document.documentElement.scrollWidth - vw;
          let widest = '';
          if (over > 0) {
            for (const el of document.body.querySelectorAll('*')) {
              const b = el.getBoundingClientRect();
              if (b.right > vw + 0.5 && !el.closest('.table')) { widest = el.tagName.toLowerCase() + (el.className ? '.' + el.className : ''); break; }
            }
          }
          return { over, widest };
        });
        n++;
        if (r.over > 0) bad.push(p + ' @' + w + 'px ' + scheme + '：' + r.over + ' px はみ出す（' + r.widest + '）');
      }
      await ctx.close();
    }
  }
  /* トップの最初の画面（スクロールする前に見える範囲）に、国旗と版図の地図が読み込まれて収まり、創作の断りも始まっていること。
   * 幅と高さは、狭い電話（360×640）、よくある電話（390×844）、拡大した窓（640×400、1280×800 の 200%）、広い窓（1280×800）。 */
  const SCREENS = [[360, 640], [390, 844], [640, 400], [1280, 800]];
  for (const [w, h] of SCREENS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    await page.goto(base + 'index.html', { waitUntil: 'load' });
    const r = await page.evaluate(() => {
      const imgs = [...document.querySelectorAll('figure.first img')];
      const quote = document.querySelector('main blockquote');
      return { n: imgs.length, out: imgs.filter((i) => !i.complete || !i.naturalWidth || i.getBoundingClientRect().bottom > innerHeight || i.getBoundingClientRect().top < 0).map((i) => i.getAttribute('src')),
        quoteTop: quote ? quote.getBoundingClientRect().top : Infinity };
    });
    n++;
    if (r.n !== 2 || r.out.length || r.quoteTop >= h) bad.push('index.html @' + w + '×' + h + '：最初の画面に、国旗と地図（' + r.n + '、外れたもの ' + (r.out.join('・') || 'なし') + '）と、断りの始まり（上から ' + Math.round(r.quoteTop) + ' px）が収まらない');
    await ctx.close();
  }
  await browser.close();
  server.close();
  console.log('頁 ' + list.length + '、幅 ' + WIDTHS.join('・') + ' px、明るい配色と暗い配色で描き、トップの最初の画面を ' + SCREENS.length + ' つの大きさで見て、' + n + ' 通りを確かめた。');
  if (bad.length) { console.log('通らなかった（' + bad.length + ' 通り）：\n  ' + bad.slice(0, 30).join('\n  ')); process.exit(1); }
  console.log('どれも横にはみ出さず、トップの最初の画面に国旗と地図と断りの始まりが収まった。');
}

main().catch((e) => { console.error(e); process.exit(1); });

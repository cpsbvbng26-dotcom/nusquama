#!/usr/bin/env node
/* Fetches the foreign primary sources that the legality page quotes, and keeps the plain text around each
 * passage in verification/sources-raw.json, with the address, the HTTP status and the day it was fetched.
 * The quotations on the page are taken word for word from these windows, and verification/check.js
 * confirms that each quotation occurs in the window it names.
 *
 * Run from GitHub Actions (the hosts are not reachable from every machine):
 *   node tools/sources.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'verification', 'sources-raw.json');

const Q = (q) => 'https://html.duckduckgo.com/html/?q=' + encodeURIComponent(q);
const B = (q) => 'https://www.bing.com/search?q=' + encodeURIComponent(q);
const A = 'https://web.archive.org/web/2026/';
const NC = (a) => 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:regio.decreto:1930-10-19;1398:1~art' + a;
const GU = (f, a) => 'https://www.gazzettaufficiale.it/atto/serie_generale/caricaArticolo?art.versione=1&art.idGruppo=0&art.flagTipoArticolo=' + f + '&art.codiceRedazionale=16G00011&art.idArticolo=' + a + '&art.idSottoArticolo=1&art.idSottoArticolo1=10&art.dataPubblicazioneGazzetta=2016-01-22&art.progressivo=0';
const SOURCES = [
  { key: 'soumu-gaibu', url: 'https://www.soumu.go.jp/main_sosiki/joho_tsusin/d_syohi/gaibusoushin_kiritsu.html', full: true },
  { key: 'soumu-gaibu2', url: 'https://www.soumu.go.jp/main_sosiki/joho_tsusin/d_syohi/gaibusoushin_kiritsu_00002.html', full: true },
  { key: 'soumu-news', url: 'https://www.soumu.go.jp/menu_news/s-news/01kiban04_02000229.html', full: true, links: /pdf|kokuji|告示/ },
  { key: 'soumu-ihoyugai', url: 'https://www.soumu.go.jp/main_sosiki/joho_tsusin/d_syohi/ihoyugai.html', full: true, links: /pdf/ },
  { key: 'pres-faq', url: 'https://presidenza.governo.it/onorificenze_araldica/onorificenze/faq.html', full: true },
  { key: 'bunka-q', url: 'https://www.bunka.go.jp/seisaku/chosakuken/seidokaisetsu/gaiyo/chosakubutsu_jiyu.html', full: true },
];

const plain = (h) => h.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
  .replace(/&#39;|&rsquo;|&#8217;/g, '’').replace(/&ldquo;|&#8220;/g, '“').replace(/&rdquo;|&#8221;/g, '”')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&#x([0-9a-f]+);/gi, (m, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(+d))
  .replace(/&([aeiou])(grave|acute);/gi, (m, v, k) => v + (k.toLowerCase() === 'grave' ? '\u0300' : '\u0301')).normalize('NFC')
  .replace(/\s+/g, ' ').trim();

async function main() {
  const out = { fetched: new Date().toISOString().slice(0, 10), sources: {} };
  for (const s of SOURCES) {
    const r = { url: s.url };
    try {
      const res = await fetch(s.url, { headers: { 'User-Agent': 'nusquama (https://github.com/cpsbvbng26-dotcom/nusquama)', 'Accept-Language': s.lang || 'en,ja,it', ...(s.accept ? { Accept: s.accept } : {}) }, redirect: 'follow', signal: AbortSignal.timeout(90000) });
      r.status = res.status;
      let text;
      if (s.pdf) {
        const buf = Buffer.from(await res.arrayBuffer());
        r.bytes = buf.length;
        r.b64 = buf.toString('base64'); text = '';
      } else {
        const bytes = Buffer.from(await res.arrayBuffer());
        const head = bytes.subarray(0, 4096).toString('latin1');
        const cs = ((/charset=["']?([\w-]+)/i.exec(res.headers.get('content-type') || '') || /<meta[^>]+charset=["']?([\w-]+)/i.exec(head) || [])[1] || 'utf-8').toLowerCase();
        const html = new TextDecoder(cs === 'x-sjis' || cs === 'sjis' ? 'shift_jis' : cs).decode(bytes);
        if (s.links) r.links = [...new Set([...html.matchAll(/href=["']([^"']+)["']/g)].map((m) => m[1]).filter((h) => s.links.test(h)))].slice(0, 400);
        text = plain(html);
      }
      if (s.full) r.text = text;
      r.length = text.length;
      r.windows = [];
      for (const n of (s.needles || [])) {
        let at = 0, k = 0;
        while (k < 3 && (at = text.indexOf(n, at)) !== -1) { r.windows.push(text.slice(Math.max(0, at - 300), at + 2500)); at += n.length; k++; }
      }
      if (!r.windows.length) r.head = text.slice(0, 3000);
    } catch (e) { r.error = String(e.message || e); }
    out.sources[s.key] = r;
    console.log(s.key, r.status || r.error, (r.windows || []).length);
  }
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
}
main();

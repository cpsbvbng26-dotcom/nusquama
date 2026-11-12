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
  { key: 'cp6', url: NC(6), full: true },
  { key: 'cp9', url: NC(9), full: true },
  { key: 'gu-all', url: GU(1, 1), full: true },
  { key: 'gu-art1', url: GU(0, 1), full: true },
  { key: 'pres-uso', url: 'https://presidenza.governo.it/onorificenze_araldica/onorificenze/uso.html', full: true, links: /./ },
  { key: 'pres-uso-a', url: A + 'https://presidenza.governo.it/onorificenze_araldica/onorificenze/uso.html', full: true, links: /onorific|araldic/ },
  { key: 'pres-art7-a', url: A + 'https://presidenza.governo.it/onorificenze_araldica/araldica/normativa/art7_030551.html', full: true, links: /onorific|araldic/ },
  { key: 'pres-norm-a', url: A + 'https://presidenza.governo.it/onorificenze_araldica/onorificenze/normativa.html', full: true, links: /onorific|araldic/ },
  { key: 'difesa', url: 'https://www.difesa.it/sgd-dna/staff/dg/persomil/circolari/direttiva-autorizzazione-a-fregiarsi-di-ordini-cavallereschibenemerenze-non-nazionali/47116.html', full: true, links: /pdf|allegat/ },
  { key: 'ppc-us', url: 'https://www.ppc.go.jp/enforcement/infoprovision/laws/offshore_report_america/', full: true, links: /./ },
  { key: 'soumu-gaibu', url: 'https://www.soumu.go.jp/main_sosiki/joho_tsusin/d_syohi/gaibusoushin_kiritsu.html', full: true, links: /./ },
  { key: 'soumu-gaibu2', url: 'https://www.soumu.go.jp/main_sosiki/joho_tsusin/d_syohi/gaibusoushin_kiritsu_00002.html', full: true, links: /./ },
  { key: 'soumu-news', url: 'https://www.soumu.go.jp/menu_news/s-news/01kiban04_02000229.html', full: true, links: /./ },
  { key: 'soumu-ihoyugai', url: 'https://www.soumu.go.jp/main_sosiki/joho_tsusin/d_syohi/ihoyugai.html', full: true, links: /./ },
  { key: 'soumu-entry', url: 'https://www.soumu.go.jp/menu_kyotsuu/important/kinkyu02_000495.html', full: true, links: /./ },
  { key: 'soumu-manual', url: 'https://www.soumu.go.jp/main_content/000477428.pdf', pdf: true },
  { key: 'bunka', url: 'https://www.bunka.go.jp/seisaku/chosakuken/', full: true, links: /./ },
  { key: 'caa', url: 'https://www.caa.go.jp/policies/policy/consumer_system/consumer_contract_act/annotations/', full: true, links: /./ },
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
        const html = await res.text();
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

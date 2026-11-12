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
const SOURCES = [
  { key: 'cp-export', url: 'https://www.normattiva.it/esporta/attoCompleto?atto.dataPubblicazioneGazzetta=1930-10-26&atto.codiceRedazionale=030U1398', full: true },
  { key: 'cp-akn', url: 'https://www.normattiva.it/do/atto/caricaAKN?dataGU=19301026&codiceRedaz=030U1398&dataVigenza=20261112', full: true },
  { key: 'cp-art', url: 'https://www.normattiva.it/atto/caricaArticolo?art.versione=5&art.idGruppo=1&art.flagTipoArticolo=1&art.codiceRedazionale=030U1398&art.idArticolo=10&art.idSottoArticolo=1&art.idSottoArticolo1=10&art.dataPubblicazioneGazzetta=1930-10-26&art.progressivo=0', full: true },
  { key: 'dlgs8-export', url: 'https://www.normattiva.it/esporta/attoCompleto?atto.dataPubblicazioneGazzetta=2016-01-22&atto.codiceRedazionale=16G00011', full: true },
  { key: 'dlgs8-akn', url: 'https://www.normattiva.it/do/atto/caricaAKN?dataGU=20160122&codiceRedaz=16G00011&dataVigenza=20261112', full: true },
  { key: 'gu-dlgs8', url: 'https://www.gazzettaufficiale.it/atto/vediMenuHTML?atto.dataPubblicazioneGazzetta=2016-01-22&atto.codiceRedazionale=16G00011&tipoSerie=serie_generale&tipoVigenza=originario', full: true, links: /./ },
  { key: 'l178-export', url: 'https://www.normattiva.it/esporta/attoCompleto?atto.dataPubblicazioneGazzetta=1951-03-30&atto.codiceRedazionale=051U0178', full: true },
  { key: 'gov-it-art7', url: 'https://presidenza.governo.it/onorificenze_araldica/araldica/normativa/art7_030551.html', full: true, links: /./ },
  { key: 'gov-it-norm', url: 'https://presidenza.governo.it/onorificenze_araldica/onorificenze/normativa.html', full: true, links: /./ },
  { key: 'ppc-kaisei', url: 'https://www.ppc.go.jp/personalinfo/legal/kaiseihogohou/', full: true, links: /./ },
  { key: 'vercel-aup', url: 'https://vercel.com/legal/acceptable-use-policy', full: true },
  { key: 'd1', url: Q('presidenza.governo.it ordini cavallereschi non nazionali uso vietato'), links: /uddg/ },
  { key: 'd2', url: Q('esteri.it autorizzazione uso onorificenze estere legge 178 1951'), links: /uddg/ },
  { key: 'd3', url: Q('総務省 外部送信規律 FAQ'), links: /uddg/ },
  { key: 'd4', url: Q('総務省 電気通信事業参入マニュアル 追補版 PDF'), links: /uddg/ },
  { key: 'd5', url: Q('総務省 媒介相当電気通信役務 指定 告示'), links: /uddg/ },
  { key: 'd6', url: Q('文化庁 著作物が自由に使える場合 引用'), links: /uddg/ },
  { key: 'd7', url: Q('消費者庁 消費者契約法 逐条解説'), links: /uddg/ },
  { key: 'd8', url: Q('個人情報保護委員会 外国における個人情報の保護に関する制度等の調査 米国'), links: /uddg/ },
  { key: 'd9', url: Q('総務省 情報流通プラットフォーム対処法 逐条解説'), links: /uddg/ },
  { key: 'd10', url: Q('総務省 電気通信事業 届出 不要 ブログ 掲示板 事業 該当性'), links: /uddg/ },
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
        const tmp = require('os').tmpdir() + '/x.pdf';
        fs.writeFileSync(tmp, buf);
        try { text = require('child_process').execFileSync('sh', ['-c', 'command -v pdftotext && pdftotext -layout ' + tmp + ' - || echo NO_PDFTOTEXT'], { encoding: 'utf8', maxBuffer: 1 << 28 }); } catch (e) { r.pdferr = String(e.message); text = ''; }
        if (0) try { text = require('child_process').execFileSync('pdftotext', ['-layout', tmp, '-'], { encoding: 'utf8', maxBuffer: 1 << 28 }); } catch (e) { r.pdferr = String(e.message); text = ''; }
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

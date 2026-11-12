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
  { key: 'cp10-a', url: 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:regio.decreto:1930-10-19;1398:1~art10', full: true, links: /caricaArticolo|art10|1398/ },
  { key: 'cp10-b', url: 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:codice.penale:1930-10-19;1398~art10', full: true },
  { key: 'cp10-c', url: 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:regio.decreto:1930-10-19;1398~art10', links: /caricaArticolo|atto\/|art/ },
  { key: 'dlgs8-act', url: 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2016-01-15;8', full: true, links: /./ },
  { key: 'dlgs8-all', url: 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2016-01-15;8~all1', full: true },
  { key: 'gu-dlgs8', url: 'https://www.gazzettaufficiale.it/eli/id/2016/01/22/16G00011/sg', full: true, links: /./ },
  { key: 'l178-art7', url: 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:1951-03-03;178~art7', full: true },
  { key: 'l178', url: 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:1951-03-03;178', full: true, links: /./ },
  { key: 's-it1', url: Q('governo.it ordini cavallereschi non nazionali legge 178 1951'), links: /./ },
  { key: 's-it2', url: B('site:governo.it onorificenze ordini non nazionali legge 3 marzo 1951 n. 178'), links: /./ },
  { key: 's-it3', url: B('site:quirinale.it ordini cavallereschi non nazionali'), links: /./ },
  { key: 'ppc-qa', url: 'https://www.ppc.go.jp/personalinfo/faq/APPI_QA/', full: true, links: /\.pdf|guideline/ },
  { key: 'ppc-legal', url: 'https://www.ppc.go.jp/personalinfo/legal/', full: true, links: /./ },
  { key: 'ppc-tsusoku', url: 'https://www.ppc.go.jp/personalinfo/legal/guidelines_tsusoku/', full: true, links: /./ },
  { key: 'ppc-offshore', url: 'https://www.ppc.go.jp/personalinfo/legal/guidelines_offshore/', full: true, links: /./ },
  { key: 'ppc-thirdparty', url: 'https://www.ppc.go.jp/personalinfo/legal/guidelines_thirdparty/', full: true, links: /./ },
  { key: 'ccpa-leg', url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.140', full: true },
  { key: 'ccpa-arch', url: 'https://web.archive.org/web/2026/https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.140', full: true },
  { key: 'cppa', url: 'https://cppa.ca.gov/regulations/', full: true, links: /./ },
  { key: 'cppa-pdf', url: 'https://cppa.ca.gov/regulations/pdf/ccpa_statute.pdf', pdf: true },
  { key: 'oas', url: 'https://www.oas.org/juridico/english/sigs/a-40.html', full: true },
  { key: 'vercel-terms', url: 'https://vercel.com/legal/terms', full: true },
  { key: 'egov-kisoku', url: 'https://laws.e-gov.go.jp/api/1/lawdata/360M50001000025', full: true },
  { key: 'egov-v2', url: 'https://laws.e-gov.go.jp/api/2/laws?law_title=' + encodeURIComponent('電気通信事業法施行規則'), full: true },
  { key: 'egov-v2b', url: 'https://laws.e-gov.go.jp/api/2/laws?law_title=' + encodeURIComponent('情報流通プラットフォーム対処法'), full: true },
  { key: 's-soumu1', url: B('site:soumu.go.jp 電気通信事業参入マニュアル 追補版'), links: /./ },
  { key: 's-soumu2', url: B('site:soumu.go.jp 媒介相当電気通信役務 指定'), links: /./ },
  { key: 's-soumu3', url: B('site:soumu.go.jp 外部送信規律 FAQ'), links: /./ },
  { key: 's-soumu4', url: B('site:soumu.go.jp 情報流通プラットフォーム対処法 大規模特定電気通信役務提供者 指定'), links: /./ },
  { key: 's-bunka', url: B('site:bunka.go.jp 著作物が自由に使える場合 引用'), links: /./ },
  { key: 's-caa', url: B('site:caa.go.jp 消費者契約法 逐条解説'), links: /./ },
  { key: 's-ppc', url: B('site:ppc.go.jp ガイドライン 外国にある第三者への提供編'), links: /./ },
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

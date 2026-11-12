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

const SOURCES = [
  { key: 'montevideo', url: 'https://avalon.law.yale.edu/20th_century/intam03.asp', needles: ['ARTICLE 1', 'ARTICLE 3'] },
  { key: 'gdpr', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32016R0679', needles: ['Territorial scope'] },
  { key: 'gdpr-cellar', url: 'https://publications.europa.eu/resource/celex/32016R0679', accept: 'application/xhtml+xml, text/html;q=0.9', lang: 'eng', needles: ['Territorial scope'] },
  { key: 'ccpa-oag', url: 'https://oag.ca.gov/privacy/ccpa', needles: ['for-profit', 'nonprofit', 'non-profit'] },
  { key: 'italy', url: 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:1951-03-03;178~art8', needles: ['Art. 8', 'cavaliere', 'onorificenz'] },
  { key: 'ccpa', url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.140', needles: ['Business'] },
  { key: 'vercel', url: 'https://vercel.com/docs/limits/fair-use-guidelines', needles: ['commercial'] },
  { key: 'gdpr-art27', url: 'https://publications.europa.eu/resource/celex/32016R0679', accept: 'application/xhtml+xml, text/html;q=0.9', lang: 'eng', needles: ['Representatives of controllers or processors not established in the Union'] },
  { key: 'vercel-terms', url: 'https://vercel.com/legal/terms', needles: ['Hobby', 'train', 'arbitration', 'AS IS'] },
  { key: 'ppc-qa', url: 'https://www.ppc.go.jp/personalinfo/faq/APPI_QA/', needles: ['Q1-62', 'Q13-', 'Q12-'] },
  { key: 'italy-cp-10', url: 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:regio.decreto:1930-10-19;1398~art10', needles: ['Art. 10', 'straniero'] },
  { key: 'italy-depenalizzazione', url: 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2016-01-15;8~art1', needles: ['Art. 1', 'pena della multa o dell'] },
  { key: 'egov', url: 'https://laws.e-gov.go.jp/law/140AC0000000045', needles: ['刑法'] },
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
      const text = plain(await res.text());
      r.length = text.length;
      r.windows = [];
      for (const n of s.needles) {
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

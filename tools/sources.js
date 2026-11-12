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
const { pdfText } = require('./pdftext.js');

const SOURCES = [
  { key: 'montevideo', url: 'https://avalon.law.yale.edu/20th_century/intam03.asp', needles: ['ARTICLE 1', 'ARTICLE 3'] },
  { key: 'gdpr', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32016R0679', needles: ['Territorial scope'] },
  { key: 'gdpr-cellar', url: 'https://publications.europa.eu/resource/celex/32016R0679', accept: 'application/xhtml+xml, text/html;q=0.9', lang: 'eng', needles: ['Territorial scope'] },
  { key: 'ccpa-oag', url: 'https://oag.ca.gov/privacy/ccpa', needles: ['for-profit', 'nonprofit', 'non-profit'] },
  { key: 'italy', url: 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:1951-03-03;178~art8', needles: ['Art. 8', 'cavaliere', 'onorificenz'] },
  { key: 'ccpa', url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.140', needles: ['Business'] },
  { key: 'vercel', url: 'https://vercel.com/docs/limits/fair-use-guidelines', needles: ['commercial'] },
  { key: 'gdpr-art27', url: 'https://publications.europa.eu/resource/celex/32016R0679', accept: 'application/xhtml+xml, text/html;q=0.9', lang: 'eng', needles: ['Representatives of controllers or processors not established in the Union'] },
  { key: 'vercel-terms', url: 'https://vercel.com/legal/terms', needles: ['Hobby', 'train', 'arbitration', 'AS IS', '8. Acceptable Use', '10.1 General'] },
  /* The Q&A numbers its questions in full-width characters (Ａ１－62). The answers are taken, not the table of contents. */
  { key: 'ppc-qa', url: 'https://www.ppc.go.jp/personalinfo/faq/APPI_QA/', needles: ['Ａ１－62 ', 'Ａ12－３ ', 'Ａ12－10 ', 'Ａ13－２ '] },
  /* The Penal Code is the annex of Royal Decree No. 1398 of 1930; its articles answer only under the annex's URN (…;1398:1~artN). */
  { key: 'italy-cp-10', url: 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:regio.decreto:1930-10-19;1398:1~art10', needles: ['Art. 10.'] },
  { key: 'italy-depenalizzazione', url: 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2016-01-15;8~art1', needles: ['Art. 1', 'pena della multa o dell'] },
  { key: 'egov', url: 'https://laws.e-gov.go.jp/law/140AC0000000045', needles: ['刑法'] },
  /* 2026-11-12, the texts the legal review could not fetch, and the official guidance on the articles it relies on. */
  { key: 'italy-cp-6', url: 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:regio.decreto:1930-10-19;1398:1~art6', needles: ['Art. 6.'] },
  { key: 'italy-cp-9', url: 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:regio.decreto:1930-10-19;1398:1~art9', needles: ['Art. 9.'] },
  { key: 'italy-178-art7', url: 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:1951-03-03;178~art7', needles: ['Art. 7 I cittadini'] },
  /* The annex of Legislative Decree No. 8 of 2016 (the laws excluded from decriminalisation), as published in the Gazzetta Ufficiale. */
  { key: 'italy-depenalizzazione-allegato', url: 'https://www.gazzettaufficiale.it/atto/serie_generale/caricaArticolo?art.versione=1&art.idGruppo=0&art.flagTipoArticolo=1&art.codiceRedazionale=16G00011&art.idArticolo=1&art.idSottoArticolo=1&art.idSottoArticolo1=10&art.dataPubblicazioneGazzetta=2016-01-22&art.progressivo=0', needles: ['ELENCO DELLE LEGGI'], span: 8000 },
  { key: 'italy-pcm-uso', url: 'https://presidenza.governo.it/onorificenze_araldica/onorificenze/uso.html', needles: ['Uso delle onorificenze I cittadini'] },
  { key: 'italy-pcm-uso-archive', url: 'https://web.archive.org/web/2026/https://presidenza.governo.it/onorificenze_araldica/onorificenze/uso.html', needles: ['Uso delle onorificenze I cittadini'] },
  { key: 'montevideo-parties', url: 'https://www.oas.org/juridico/english/sigs/a-40.html', needles: ['DEPOSITORY:', 'COUNTRY SIGNATURE'] },
  /* leginfo answers machines with a challenge page (HTTP 403); the Internet Archive keeps the same page. */
  { key: 'ccpa-archive', url: 'https://web.archive.org/web/2026/https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.140', needles: ['“Business” means'] },
  { key: 'vercel-aup', url: 'https://vercel.com/legal/acceptable-use-policy', needles: ['Last Updated', '2. Prohibited Activities'] },
  { key: 'ppc-guideline-general', url: 'https://www.ppc.go.jp/personalinfo/legal/guidelines_tsusoku/', needles: ['ここでいう「事業の用に供している」の「事業」とは'] },
  { key: 'ppc-guideline-offshore', url: 'https://www.ppc.go.jp/personalinfo/legal/guidelines_offshore/', needles: ['5-1情報提供の方法', '（イ）当該外国の個人情報の保護に関する制度についての指標となり得る情報の存在', '5-3-2 提供先の第三者が講ずる個人情報の保護のための措置に関する情報が提供できない場合（規則第17条第4項関係） 規則第17条（第4項）'] },
  { key: 'ppc-guideline-records', url: 'https://www.ppc.go.jp/personalinfo/legal/guidelines_thirdparty/', needles: ['2-2-1-1 「提供者」の考え方 次の', '2-2-1-3 「提供」行為の考え方 不特定多数', '4-2-1-2 本人の同意による第三者提供をする場合（規則第20条第1項第2号関係） 規則'] },
  { key: 'ppc-us', url: 'https://www.ppc.go.jp/enforcement/infoprovision/laws/offshore_report_america/', needles: ['連邦政府の個人情報の保護に関する法律についての調査報告'] },
  /* Shift_JIS. The answer is taken, not the table of contents. */
  { key: 'soumu-gaibu-faq', url: 'https://www.soumu.go.jp/main_sosiki/joho_tsusin/d_syohi/gaibusoushin_kiritsu_00002.html', needles: ['問1-8 ：外部送信規律に従わなければならない事業者はどのような事業者ですか。 答'] },
  /* A PDF, read by tools/pdftext.js. */
  { key: 'soumu-entry-manual', url: 'https://www.soumu.go.jp/main_content/000477428.pdf', pdf: true, needles: ['営利目的があることは、事業性があることの判断要素', '個人や企業によるWebサイトの開設', '電子掲示板 インターネット経由で不特定多数'] },
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
      /* Some official hosts drop a connection now and then; a failed connection is tried three times. */
      let res;
      for (let k = 0; k < 3 && !res; k++) {
        try { res = await fetch(s.url, { headers: { 'User-Agent': 'nusquama (https://github.com/cpsbvbng26-dotcom/nusquama)', 'Accept-Language': s.lang || 'en,ja,it', ...(s.accept ? { Accept: s.accept } : {}) }, redirect: 'follow', signal: AbortSignal.timeout(90000) }); } catch (e) { if (k === 2) throw new Error(String(e.message || e) + (e.cause ? ' (' + (e.cause.code || e.cause.message) + ')' : '')); await new Promise((ok) => setTimeout(ok, 5000)); }
      }
      r.status = res.status;
      if (res.redirected) r.final = res.url; // e.g. the dated snapshot the Internet Archive chose
      const bytes = Buffer.from(await res.arrayBuffer());
      let text;
      if (s.pdf) text = pdfText(bytes);
      else {
        /* Some official pages are in Shift_JIS; the charset comes from the header or the page's own meta element. */
        const cs = ((/charset=["']?([\w-]+)/i.exec(res.headers.get('content-type') || '') || /<meta[^>]+charset=["']?([\w-]+)/i.exec(bytes.subarray(0, 4096).toString('latin1')) || [])[1] || 'utf-8').toLowerCase();
        text = plain(new TextDecoder(['sjis', 'x-sjis'].includes(cs) ? 'shift_jis' : cs).decode(bytes));
      }
      r.length = text.length;
      r.windows = [];
      for (const n of s.needles) {
        let at = 0, k = 0;
        while (k < 3 && (at = text.indexOf(n, at)) !== -1) { r.windows.push(text.slice(Math.max(0, at - 300), at + (s.span || 2500))); at += n.length; k++; }
      }
      if (!r.windows.length) r.head = text.slice(0, 3000);
    } catch (e) { r.error = String(e.message || e); }
    out.sources[s.key] = r;
    console.log(s.key, r.status || r.error, (r.windows || []).length);
  }
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
}
main();

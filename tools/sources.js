#!/usr/bin/env node
/* Fetches the foreign primary sources that the legality page and the legal review quote, and records in
 * verification/sources-raw.json the address, the HTTP status, the day, the length and the SHA-256 of the whole
 * fetched text (the plain text this tool makes of the page).
 *
 * What is committed depends on who made the text (2026-11-12 に Claude が決めました):
 * - whole: true marks a law, a treaty or an official text of a state organ (Copyright Act, Article 13). Its windows
 *   around the needles are kept, as before.
 * - Any other text (terms of service, guidance and explanations, lists made by other bodies) keeps only the passages
 *   that verification/sources.json quotes from it ("spans"), and the passages a check relies on ("keep": from one
 *   needle to the next). Its whole text is not committed.
 * The whole text of every source and the windows around every needle are written to sources-full/, which the
 * workflow keeps as an artifact of the run (.github/workflows/sources.yml), not in git.
 * verification/check.js confirms that each quotation occurs in a window or a span, and that the SHA-256 recorded with
 * the quotation in verification/sources.json is the SHA-256 of the text fetched now: a text that has changed fails.
 *
 * Run from GitHub Actions (the hosts are not reachable from every machine):
 *   node tools/sources.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'verification', 'sources-raw.json');
const FULL = process.env.SOURCES_FULL || path.join(ROOT, 'sources-full');
const QUOTES = path.join(ROOT, 'verification', 'sources.json');
const { pdfText } = require('./pdftext.js');

const SOURCES = [
  { key: 'montevideo', whole: true, url: 'https://avalon.law.yale.edu/20th_century/intam03.asp', needles: ['ARTICLE 1', 'ARTICLE 3'] },
  { key: 'gdpr', whole: true, url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32016R0679', needles: ['Territorial scope'] },
  { key: 'gdpr-cellar', whole: true, url: 'https://publications.europa.eu/resource/celex/32016R0679', accept: 'application/xhtml+xml, text/html;q=0.9', lang: 'eng', needles: ['Territorial scope'] },
  { key: 'ccpa-oag', url: 'https://oag.ca.gov/privacy/ccpa', needles: ['for-profit', 'nonprofit', 'non-profit'] },
  { key: 'italy', whole: true, url: 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:1951-03-03;178~art8', needles: ['Art. 8', 'cavaliere', 'onorificenz'] },
  { key: 'ccpa', whole: true, url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.140', needles: ['Business'] },
  { key: 'vercel', url: 'https://vercel.com/docs/limits/fair-use-guidelines', needles: ['On this page', 'Vercel usage is subject'] },
  { key: 'gdpr-art27', whole: true, url: 'https://publications.europa.eu/resource/celex/32016R0679', accept: 'application/xhtml+xml, text/html;q=0.9', lang: 'eng', needles: ['Representatives of controllers or processors not established in the Union'] },
  { key: 'vercel-terms', url: 'https://vercel.com/legal/terms', needles: ['Hobby', 'train', 'arbitration', 'AS IS'] },
  /* Short windows: section 10.1 goes on to a contact address, which the scan of the repository (tools/scan.js) does not let in.
   * The windows now go only to the artifact; the span kept in git is the quotation. */
  { key: 'vercel-terms-sections', url: 'https://vercel.com/legal/terms', needles: ['8. Acceptable Use', '10.1 General'], span: 600 },
  /* The Q&A numbers its questions in full-width characters (Ａ１－62). The answers are taken, not the table of contents. */
  { key: 'ppc-qa', url: 'https://www.ppc.go.jp/personalinfo/faq/APPI_QA/', needles: ['Ａ１－62 ', 'Ａ12－３ ', 'Ａ12－10 ', 'Ａ13－２ '] },
  /* The Penal Code is the annex of Royal Decree No. 1398 of 1930; its articles answer only under the annex's URN (…;1398:1~artN). */
  { key: 'italy-cp-10', whole: true, url: 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:regio.decreto:1930-10-19;1398:1~art10', needles: ['Art. 10.'] },
  { key: 'italy-depenalizzazione', whole: true, url: 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2016-01-15;8~art1', needles: ['Art. 1', 'pena della multa o dell'] },
  { key: 'egov', whole: true, url: 'https://laws.e-gov.go.jp/law/140AC0000000045', needles: ['刑法'] },
  /* 2026-11-12, the texts the legal review could not fetch, and the official guidance on the articles it relies on. */
  { key: 'italy-cp-6', whole: true, url: 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:regio.decreto:1930-10-19;1398:1~art6', needles: ['Art. 6.'] },
  { key: 'italy-cp-9', whole: true, url: 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:regio.decreto:1930-10-19;1398:1~art9', needles: ['Art. 9.'] },
  { key: 'italy-178-art7', whole: true, url: 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:1951-03-03;178~art7', needles: ['Art. 7 I cittadini'] },
  /* The annex of Legislative Decree No. 8 of 2016 (the laws excluded from decriminalisation), as published in the Gazzetta Ufficiale. */
  { key: 'italy-depenalizzazione-allegato', whole: true, url: 'https://www.gazzettaufficiale.it/atto/serie_generale/caricaArticolo?art.versione=1&art.idGruppo=0&art.flagTipoArticolo=1&art.codiceRedazionale=16G00011&art.idArticolo=1&art.idSottoArticolo=1&art.idSottoArticolo1=10&art.dataPubblicazioneGazzetta=2016-01-22&art.progressivo=0', needles: ['ELENCO DELLE LEGGI'], span: 8000 },
  { key: 'italy-pcm-uso', url: 'https://presidenza.governo.it/onorificenze_araldica/onorificenze/uso.html', needles: ['Uso delle onorificenze I cittadini'] },
  { key: 'italy-pcm-uso-archive', url: 'https://web.archive.org/web/2026/https://presidenza.governo.it/onorificenze_araldica/onorificenze/uso.html', needles: ['Uso delle onorificenze I cittadini'] },
  /* A list made by the OAS, not by a state organ: the table of signatures and ratifications is kept, because a check
   * relies on the whole table (Japan is not in it). */
  { key: 'montevideo-parties', url: 'https://www.oas.org/juridico/english/sigs/a-40.html', needles: ['DEPOSITORY:', 'COUNTRY SIGNATURE'], keep: [['COUNTRY SIGNATURE', '*DECLARATIONS']] },
  /* leginfo answers machines with a challenge page (HTTP 403); the Internet Archive keeps the same page. */
  { key: 'ccpa-archive', whole: true, url: 'https://web.archive.org/web/2026/https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.140', needles: ['“Business” means'] },
  { key: 'vercel-aup', url: 'https://vercel.com/legal/acceptable-use-policy', needles: ['Last Updated', '2. Prohibited Activities'] },
  { key: 'ppc-guideline-general', url: 'https://www.ppc.go.jp/personalinfo/legal/guidelines_tsusoku/', needles: ['ここでいう「事業の用に供している」の「事業」とは'] },
  { key: 'ppc-guideline-offshore', url: 'https://www.ppc.go.jp/personalinfo/legal/guidelines_offshore/', needles: ['5-1情報提供の方法', '（イ）当該外国の個人情報の保護に関する制度についての指標となり得る情報の存在', '5-3-2 提供先の第三者が講ずる個人情報の保護のための措置に関する情報が提供できない場合（規則第17条第4項関係） 規則第17条（第4項）'] },
  { key: 'ppc-guideline-records', url: 'https://www.ppc.go.jp/personalinfo/legal/guidelines_thirdparty/', needles: ['2-2-1-1 「提供者」の考え方 次の', '2-2-1-3 「提供」行為の考え方 不特定多数', '4-2-1-2 本人の同意による第三者提供をする場合（規則第20条第1項第2号関係） 規則'] },
  { key: 'ppc-us', url: 'https://www.ppc.go.jp/enforcement/infoprovision/laws/offshore_report_america/', needles: ['連邦政府の個人情報の保護に関する法律についての調査報告'], span: 6000 },
  /* Shift_JIS. The answer is taken, not the table of contents. */
  { key: 'soumu-gaibu-faq', url: 'https://www.soumu.go.jp/main_sosiki/joho_tsusin/d_syohi/gaibusoushin_kiritsu_00002.html', needles: ['問1-8 ：外部送信規律に従わなければならない事業者はどのような事業者ですか。 答'] },
  /* PDFs, read by tools/pdftext.js. */
  { key: 'caa-annotation-2', url: 'https://www.caa.go.jp/policies/policy/consumer_system/consumer_contract_act/annotations/assets/consumer_system_cms203_230915_04.pdf', pdf: true, needles: ['「事業」とは'] },
  { key: 'soumu-entry-manual', url: 'https://www.soumu.go.jp/main_content/000477428.pdf', pdf: true, needles: ['営利目的があることは、事業性があることの判断要素', '個人や企業によるWebサイトの開設', '電子掲示板 インターネット経由で不特定多数'] },
  /* 2026-11-13 (the eighth pass): the GitHub Terms of Service and the GitHub Terms for Additional Products and Features, at the
   * commit the weekly watch recorded (verification/statutes.json). Section I of the first incorporates the second, whose
   * section on Actions limits what the workflows may be used for. GitHub's site-policy repository is under CC0 1.0. */
  { key: 'github-terms', url: 'https://raw.githubusercontent.com/github/site-policy/' + JSON.parse(fs.readFileSync(path.join(ROOT, 'verification', 'statutes.json'), 'utf8')).policies.find((p) => p.path === 'Policies/github-terms/github-terms-of-service.md').commit + '/Policies/github-terms/github-terms-of-service.md', needles: ['## I. GitHub Additional Product Terms'] },
  { key: 'github-additional-terms', url: 'https://raw.githubusercontent.com/github/site-policy/' + JSON.parse(fs.readFileSync(path.join(ROOT, 'verification', 'statutes.json'), 'utf8')).policies.find((p) => p.path === 'Policies/github-terms/github-terms-for-additional-products-and-features.md').commit + '/Policies/github-terms/github-terms-for-additional-products-and-features.md', needles: ['## Actions'] },
  /* 2026-11-13 (the eleventh pass): the Internet Archive's terms of use, which govern the two pages above read from its copies.
   * The page itself, and its copies of 2025 and 2026, ask for a script; this copy, made on 2024-01-01, holds the Terms of Use of
   * 31 Dec 2014. Pinned to its timestamp, so that every run reads the same copy. */
  { key: 'ia-terms-archived', url: 'https://web.archive.org/web/20240101002842id_/https://archive.org/about/terms.php', needles: ['Terms of Use 31 Dec 2014'] },
];

const plain = (h) => h.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
  .replace(/&#39;|&rsquo;|&#8217;/g, '’').replace(/&ldquo;|&#8220;/g, '“').replace(/&rdquo;|&#8221;/g, '”')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&#x([0-9a-f]+);/gi, (m, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(+d))
  .replace(/&([aeiou])(grave|acute);/gi, (m, v, k) => v + (k.toLowerCase() === 'grave' ? '\u0300' : '\u0301')).normalize('NFC')
  .replace(/\s+/g, ' ').trim();

const sha = (x) => crypto.createHash('sha256').update(x, 'utf8').digest('hex');
/* The same squeezing as the check: the space before a closing bracket or a punctuation mark is taken out. */
const squeeze = (x) => x.replace(/ ([).,;])/g, '$1');

async function main() {
  const quotes = JSON.parse(fs.readFileSync(QUOTES, 'utf8')).sources;
  fs.mkdirSync(FULL, { recursive: true });
  const out = { fetched: new Date().toISOString().slice(0, 10), sources: {} };
  const windows = {};
  for (const s of SOURCES) {
    const r = { url: s.url, whole: !!s.whole };
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
      r.sha256_full = sha(text);
      fs.writeFileSync(path.join(FULL, s.key + '.txt'), text);
      const ws = [];
      for (const n of s.needles) {
        let at = 0, k = 0;
        while (k < 3 && (at = text.indexOf(n, at)) !== -1) { ws.push(text.slice(Math.max(0, at - 300), at + (s.span || 2500))); at += n.length; k++; }
      }
      windows[s.key] = ws;
      if (s.whole) r.windows = ws;
      else {
        /* Only what is quoted, and what a check relies on. */
        const sq = squeeze(text);
        const mine = Object.entries(quotes).filter(([, v]) => v.from === s.key);
        r.spans = [];
        for (const [, v] of mine) if (sq.includes(v.quote) && !r.spans.includes(v.quote)) r.spans.push(v.quote);
        for (const [a, b] of s.keep || []) { const i = sq.indexOf(a), j = i < 0 ? -1 : sq.indexOf(b, i); if (i >= 0 && j > i) r.spans.push(sq.slice(i, j).trim()); }
        const missing = mine.filter(([, v]) => !sq.includes(v.quote)).map(([k]) => k);
        if (missing.length) r.missing = missing;
      }
      /* A page that answered with something else (a challenge page, an empty body): the start of it, short. */
      if (!ws.length) r.head = text.slice(0, 300);
    } catch (e) { r.error = String(e.message || e); }
    out.sources[s.key] = r;
    console.log(s.key, r.status || r.error, (windows[s.key] || []).length, r.whole ? 'whole' : 'spans ' + (r.spans || []).length + (r.missing ? ' missing ' + r.missing.length : ''));
  }
  fs.writeFileSync(path.join(FULL, 'windows.json'), JSON.stringify(windows, null, 2) + '\n');
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
}
main();

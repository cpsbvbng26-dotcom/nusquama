#!/usr/bin/env node
/* A survey of every country's constitution and of the provisions of its codes that Nusquama or Sophaxis could touch.
 *
 * It fetches each text named in verification/world/sources.json (and every constitution in force that the Constitute
 * Project publishes), splits it into articles, searches each article with the keyword sets of its language, and keeps
 * only the articles (or, for a long article, the paragraphs) that a keyword matched. Whole codes are not kept.
 * Each kept provision carries its country, instrument, article, language, text, source address, the day it was
 * fetched and the SHA-256 of its text. verification/world/check.js confirms the hashes and the coverage table.
 *
 * The hosts are not reachable from every machine; the fetches run on GitHub Actions (.github/workflows/world.yml),
 * one batch (a region, Japan, or the instruments shared by several countries) at a time, one request after another.
 *
 *   WORLD_BATCH=europe node tools/world.js           fetch a batch and write verification/world/data/
 *   WORLD_BATCH=europe:DEU,FRA node tools/world.js   only these countries of the batch
 *   WORLD_BATCH=src:GBR-honours node tools/world.js  only these sources
 *   node tools/world.js coverage                     rebuild verification/world/coverage.json from data/ (no fetch)
 *   WORLD_BATCH=probe node tools/world.js            print what each address of request.json answers
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { pdfText } = require('./pdftext.js');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'verification', 'world');
const DATA = path.join(DIR, 'data');
const UA = 'nusquama-world-law-survey (+https://github.com/cpsbvbng26-dotcom/nusquama)';
const DELAY = 2500;
const TODAY = new Date().toISOString().slice(0, 10);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sha = (x) => crypto.createHash('sha256').update(x, 'utf8').digest('hex');
const readJSON = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const COUNTRIES = readJSON(path.join(DIR, 'countries.json')).countries;
const CONF = readJSON(path.join(DIR, 'sources.json'));
const TOPICS = Object.keys(CONF.topics);

/* ---- fetching ---- */

let lastHost = '';
async function get(url, opt = {}) {
  const host = new URL(url).host;
  await sleep(host === lastHost ? DELAY + 1000 : DELAY);
  lastHost = host;
  let res, err;
  for (let k = 0; k < 3 && !res; k++) {
    try {
      res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': opt.lang || 'en', ...(opt.accept ? { Accept: opt.accept } : {}) }, redirect: 'follow', signal: AbortSignal.timeout(120000) });
      if (res.status >= 500 || res.status === 429) { err = 'HTTP ' + res.status; res = undefined; await sleep(8000 * (k + 1)); }
    } catch (e) { err = String(e.message || e) + (e.cause ? ' (' + (e.cause.code || e.cause.message) + ')' : ''); await sleep(8000 * (k + 1)); }
  }
  if (!res) return { error: err };
  const bytes = Buffer.from(await res.arrayBuffer());
  return { status: res.status, type: res.headers.get('content-type') || '', final: res.url, bytes };
}

function decode(r) {
  if (/pdf/i.test(r.type) || r.bytes.subarray(0, 5).toString('latin1') === '%PDF-') return { pdf: true, text: pdfText(r.bytes) };
  const head = r.bytes.subarray(0, 4096).toString('latin1');
  const cs = ((/charset=["']?([\w-]+)/i.exec(r.type) || /<meta[^>]+charset=["']?([\w-]+)/i.exec(head) || /encoding=["']([\w-]+)/i.exec(head.slice(0, 200)) || [])[1] || 'utf-8').toLowerCase();
  let text;
  try { text = new TextDecoder(['sjis', 'x-sjis'].includes(cs) ? 'shift_jis' : cs).decode(r.bytes); } catch (e) { text = r.bytes.toString('utf8'); }
  return { pdf: false, text };
}

/* ---- text ---- */

const ENT = { nbsp: ' ', amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', ndash: '–', mdash: '—', hellip: '…', laquo: '«', raquo: '»', sect: '§', ordm: 'º', ordf: 'ª', deg: '°', shy: '', szlig: 'ß', aelig: 'æ', AElig: 'Æ', oslash: 'ø', Oslash: 'Ø', eth: 'ð', thorn: 'þ', iexcl: '¡', iquest: '¿' };
const ACC = { acute: '́', grave: '̀', circ: '̂', tilde: '̃', uml: '̈', ring: '̊', cedil: '̧', caron: '̌' };
function entities(s) {
  return s.replace(/&#x([0-9a-f]+);/gi, (m, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(+d))
    .replace(/&([A-Za-z])(acute|grave|circ|tilde|uml|ring|cedil|caron);/g, (m, v, k) => v + ACC[k])
    .replace(/&([A-Za-z]+);/g, (m, k) => (k in ENT ? ENT[k] : m));
}
/* HTML to lines: block elements end a line; everything else is joined; white space inside a line is collapsed. */
function lines(html) {
  const t = html.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<(script|style|noscript|head)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n').replace(/<\/?(p|div|li|tr|h[1-6]|table|ul|ol|section|article|blockquote|dd|dt|td|th|pre|header|footer|nav|title)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
  return entities(t).normalize('NFC').split('\n').map((l) => l.replace(/[\s ​]+/g, ' ').trim()).filter(Boolean);
}
const flat = (x) => entities(x.replace(/<[^>]+>/g, ' ')).normalize('NFC').replace(/[\s ​]+/g, ' ').trim();

/* A heading that opens an article, in the languages the survey reads. Group 2 is the number. */
const HEADS = 'Article|ARTICLE|Art\\.|ART\\.|Art(?=\\s+\\d)|ART(?=\\s+\\d)|Sec(?=\\s+\\d)|Artículo|ARTÍCULO|Articulo|ARTICULO|Artigo|ARTIGO|Articolo|ARTICOLO|Artikel|ARTIKEL|Section|SECTION|Sec\\.|SEC\\.|§|Статья|Článek|Čl\\.';
const NUM = '(\\d+[A-Za-z]?(?:[.\\-–]\\d+[A-Za-z]?)*(?:\\s?(?:bis|ter|quater|quinquies|sexies|septies|octies|novies|decies)\\b)?)';
const HEAD = new RegExp('^(' + HEADS + ')\\s*' + NUM + '(?=[\\s.:º°ª\\-–)]|$)');
/* Swedish and Danish write the number first: "1 §". */
const HEAD_SV = /^(\d+\s?[a-z]?\s?§)(?=\s|$)/;
/* Japanese: 第十四条, 第五百四十八条の二. */
const HEAD_JA = /^(第[〇一二三四五六七八九十百千]+条(?:の[〇一二三四五六七八九十]+)*)/;
const PART = /^(?:(?:Erster|Zweiter|Dritter|Vierter|Fünfter|Sechster|Siebenter|Achter|Neunter|Zehnter|Elfter|Zwölfter|Dreizehnter|Vierzehnter|Fünfzehnter) (?:Titel|Abschnitt|Unterabschnitt)|Besonderer Teil|Allgemeiner Teil|Nichtamtliches Inhaltsverzeichnis|Titel [IVXLC]+[A-Z]?\b|(?:Eerste|Tweede|Derde|Vierde) Boek)|^(CHAPTER|Chapter|PART|Part|Division|Subdivision|Schedule|SCHEDULE|TITLE|Title|TÍTULO|Título|CAPÍTULO|Capítulo|TITRE|Titre|CHAPITRE|Chapitre|TITOLO|Titolo|CAPO|Capo|Kapitel|KAPITEL|Abschnitt|ABSCHNITT|Hoofdstuk|HOOFDSTUK|Afdeling|Kapittel|Глава|Раздел)\b|^第[〇一二三四五六七八九十百]+[編章節款]/;

/* Splits a run of lines into articles. A line that is only a chapter or part heading closes the article before it. */
function splitLines(ls, lang) {
  const arts = [];
  let cur = null;
  const close = () => { if (cur && cur.paras.join('').length > cur.label.length + 2) arts.push(cur); cur = null; };
  for (const l of ls) {
    let m;
    if ((m = HEAD.exec(l)) || ((lang === 'sv' || lang === 'da') && (m = HEAD_SV.exec(l))) || (lang === 'ja' && (m = HEAD_JA.exec(l)))) {
      close();
      cur = { label: (m[2] ? m[1] + ' ' + m[2] : m[1]).replace(/\s+/g, ' '), paras: [l] };
      continue;
    }
    if (PART.test(l) && l.length < 160) { close(); continue; }
    if (cur) cur.paras.push(l);
  }
  close();
  return arts;
}

/* Acts that number their sections without a word (Australia, New Zealand): a short line that is a number followed by a
 * heading in capitals ("51 Legislative powers of the Parliament") opens a section. */
function splitNumbered(ls) {
  const arts = [];
  let cur = null;
  for (const l0 of ls) {
    const l = l0.replace(/^(Collapse|Expand)\s+/, '');
    const m = /^(\d{1,4}(?:\.\d{1,4})?[A-Z]{0,3})\s+([A-Z][^.;:]{2,140})$/.exec(l);
    if (m && !/^\d{4}\s+(No|c)\b/.test(l)) { if (cur && cur.paras.length) arts.push(cur); cur = { label: 'Section ' + m[1], caption: m[2], paras: [] }; continue; }
    if (PART.test(l) && l.length < 160) { if (cur && cur.paras.length) arts.push(cur); cur = null; continue; }
    if (cur) cur.paras.push(l);
  }
  if (cur && cur.paras.length) arts.push(cur);
  return arts;
}

/* PDF text has no line ends: an article heading is taken only where it follows the end of a sentence or the number of a
 * page, and is followed by a full stop, a colon, a dash, an ordinal sign or a capital letter. A reference inside a
 * sentence ("under Article 5 of") is not taken. */
function splitInline(text) {
  const re = new RegExp('(?:^|(?<=[.;:!?)\\]”"»]\\s{0,3})|(?<=\\s\\d{1,4}\\s))(' + HEADS + ')\\s*' + NUM + '(?=\\s*[.:º°ª\\-–]|\\s+[A-ZÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÄÖÜÇÑА-Я(])', 'g');
  const cuts = [];
  let m;
  while ((m = re.exec(text))) cuts.push({ at: m.index, label: (m[1] + ' ' + m[2]).replace(/\s+/g, ' ') });
  return cuts.map((c, i) => ({ label: c.label, paras: [text.slice(c.at, i + 1 < cuts.length ? cuts[i + 1].at : Math.min(text.length, c.at + 20000)).trim()] }));
}

/* e-Gov law XML: <Article Num="…"><ArticleCaption>…<ArticleTitle>第…条</ArticleTitle><Paragraph>… */
function splitEgov(xml) {
  const main = (/<MainProvision[\s\S]*?<\/MainProvision>/.exec(xml) || [''])[0];
  const clean = (x) => flat(x.replace(/<Rt>[^<]*<\/Rt>/g, ''));
  const arts = [];
  for (const a of main.matchAll(/<Article\s[^>]*Num="([^"]+)"[^>]*>([\s\S]*?)<\/Article>/g)) {
    const title = clean((/<ArticleTitle>([\s\S]*?)<\/ArticleTitle>/.exec(a[2]) || [, ''])[1]);
    const caption = clean((/<ArticleCaption>([\s\S]*?)<\/ArticleCaption>/.exec(a[2]) || [, ''])[1]);
    const paras = [...a[2].matchAll(/<Paragraph\s[^>]*>([\s\S]*?)<\/Paragraph>/g)].map((p) => clean(p[1]));
    arts.push({ label: title, caption, paras: paras.length ? paras : [clean(a[2])] });
  }
  return arts;
}

/* legislation.gov.uk (CLML): a section is a <P1group> with a <Title> and one or more <P1> with a <Pnumber>. */
function splitClml(xml, prefix) {
  const arts = [];
  for (const g of xml.matchAll(/<P1group\b[^>]*>([\s\S]*?)<\/P1group>/g)) {
    const title = flat((/<Title>([\s\S]*?)<\/Title>/.exec(g[1]) || [, ''])[1]);
    for (const p of g[1].matchAll(/<P1\b[^>]*>([\s\S]*?)<\/P1>/g)) {
      const num = flat((/<Pnumber[^>]*>([\s\S]*?)<\/Pnumber>/.exec(p[1]) || [, ''])[1]);
      const paras = [...p[1].matchAll(/<P2\b[^>]*>([\s\S]*?)<\/P2>/g)].map((q) => flat(q[1]));
      arts.push({ label: (prefix || 'Section') + ' ' + num, caption: title, paras: paras.length ? paras : [flat(p[1].replace(/<Pnumber[^>]*>[\s\S]*?<\/Pnumber>/, ''))] });
    }
  }
  return arts;
}

/* Justice Laws (Canada) XML: <Section><MarginalNote>…</MarginalNote><Label>419</Label>… */
function splitCanada(xml) {
  const arts = [];
  for (const s of xml.matchAll(/<Section\b[^>]*>([\s\S]*?)<\/Section>/g)) {
    const label = flat((/<Label>([\s\S]*?)<\/Label>/.exec(s[1]) || [, ''])[1]);
    const caption = flat((/<MarginalNote[^>]*>([\s\S]*?)<\/MarginalNote>/.exec(s[1]) || [, ''])[1]);
    const inner = s[1].replace(/<HistoricalNote>[\s\S]*?<\/HistoricalNote>/g, '').replace(/<MarginalNote[^>]*>[\s\S]*?<\/MarginalNote>/g, '');
    const subs = [...inner.matchAll(/<Subsection\b[^>]*>([\s\S]*?)<\/Subsection>/g)].map((q) => flat(q[1]));
    arts.push({ label: 'Section ' + label, caption, paras: subs.length ? subs : [flat(inner.replace(/^\s*<Label>[\s\S]*?<\/Label>/, ''))] });
  }
  return arts;
}

/* Constitute: each unit has a title (an h2–h6, or a <p> without a class: "Article 1", "Section 2", "1. Short title")
 * and a body (<p class="content">, list items). An article opens at a title that is an article heading, a numbered title
 * or the preamble; any other title (a part or a chapter) closes it. A section under an article ("Article I", then
 * "Section 9") is labelled with both. */
function splitConstitute(html) {
  const arts = [];
  let cur = null, lastArticle = null;
  const re = /<(h[1-6])\b[^>]*>([\s\S]*?)<\/\1>|<p(\s[^>]*)?>([\s\S]*?)<\/p>|<li\b[^>]*>([\s\S]*?)<\/li>/g;
  for (const m of html.matchAll(re)) {
    const attrs = m[3] || '';
    if (/class="(copyright|translator)"/.test(attrs)) continue;
    const t = flat(m[2] || m[4] || m[5] || '');
    if (!t) continue;
    const title = !!m[1] || (m[4] !== undefined && !/class=/.test(attrs));
    if (!title) { if (cur) cur.paras.push(t); continue; }
    if (cur && cur.paras.length) arts.push(cur);
    const short = t.length > 80 ? t.slice(0, 80) : t;
    /* "Article 14", "ART 2", "Article IV", and the numbers in words of some translations ("Article Twenty-One:"). */
    const isArticle = /^(Article|ARTICLE|Art\.?|ART\.?)\s+[IVXLCDM\d]+[A-Za-z]?\b/.test(t) || (/^(Article|ARTICLE)\s+[A-Z][a-z]+(?:[- ][A-Za-z]+){0,3}:?$/.test(t) && t.length < 60);
    const isSection = /^(Section|SECTION|Sec\.?|§)\s*\d/.test(t) || /^\d+[A-Z]?\.?(\s|$)/.test(t);
    if (isArticle) { lastArticle = short; cur = { label: short, paras: [] }; continue; }
    if (isSection) { cur = { label: lastArticle ? lastArticle + ', ' + short : short, paras: [] }; continue; }
    if (HEAD.test(t) || /^preamble$/i.test(t)) { cur = { label: short, paras: [] }; continue; }
    lastArticle = null;
    cur = null;
  }
  if (cur && cur.paras.length) arts.push(cur);
  /* Some texts put the article headings inside the body paragraphs ("Article 2: …"). When the titles gave almost no
   * articles, every paragraph that opens with an article heading opens an article. */
  if (arts.length < 10) {
    const alt = [];
    let c2 = null;
    for (const m of html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>|<(h[1-6])\b[^>]*>([\s\S]*?)<\/\2>/g)) {
      const t = flat(m[1] || m[3] || '');
      if (!t) continue;
      const h = /^(Article|ARTICLE|Art\.?)\s+(\d+[A-Za-z]?)\b[\s.:\-–]*/.exec(t);
      if (h) { if (c2 && c2.paras.length) alt.push(c2); c2 = { label: 'Article ' + h[2], paras: t.slice(h[0].length) ? [t.slice(h[0].length)] : [] }; continue; }
      if (c2) c2.paras.push(t);
    }
    if (c2 && c2.paras.length) alt.push(c2);
    if (alt.length > arts.length) return alt;
  }
  return arts;
}

/* A page that holds one section (the United States Code): the text from the section's heading (s.start) to the first
 * mark of the notes that follow it (s.end), as one article. */
function splitSection(text, s) {
  const m = new RegExp(s.start, 'u').exec(text);
  if (!m) return [];
  const rest = text.slice(m.index);
  const e = s.end ? new RegExp(s.end, 'u').exec(rest.slice(m[0].length)) : null;
  return [{ label: s.article, paras: [rest.slice(0, e ? m[0].length + e.index : Math.min(rest.length, 8000)).trim()] }];
}

/* ---- searching ---- */

const RX = {};
/* The keyword set of a topic for a source: the source's own (kw), the narrower set for a general data protection law
 * (keywords_dp: scope, representative, transfer abroad, minors, registration, exemptions), or the topic's set. */
function rx(topic, lang, s = {}) {
  const src = (s.kw || {})[topic] || (s.dp && topic === 'data' ? (CONF.keywords_dp || {})[lang] : null) || (CONF.keywords[topic] || {})[lang];
  if (!src) return null;
  const k = src + ':' + lang;
  if (!(k in RX)) RX[k] = new RegExp(src, lang === 'de' ? 'u' : 'iu');
  return RX[k];
}
const searchable = (topic, lang, s) => !!rx(topic, lang, s);

/* The kept text: the whole article if it is short, otherwise each paragraph a keyword matched. */
/* At most PCAP paragraphs of one article are kept; an article with more matches is a page that the splitter could not
 * divide, and the rest of it is not kept. */
const LONG = 2500, CAP = 6000, PCAP = 12;
function search(arts, lang, topics, s = {}) {
  const out = [];
  const R = (t) => rx(t, lang, s);
  for (const a of arts) {
    const whole = [a.caption, ...a.paras].filter(Boolean).join(' ');
    const hit = topics.filter((t) => R(t).test(whole));
    if (!hit.length) continue;
    if (whole.length <= LONG) { out.push({ article: a.label, caption: a.caption, part: 'article', topics: hit, text: whole }); continue; }
    let kept = 0;
    a.paras.forEach((p, i) => {
      if (kept >= PCAP) return;
      /* A keyword in the caption alone keeps the first paragraph, so that the article is not lost. */
      const tp = topics.filter((t) => R(t).test(p) || (i === 0 && a.caption && R(t).test(a.caption)));
      if (tp.length) { kept++; out.push({ article: a.label, caption: a.caption, part: 'paragraph ' + (i + 1), topics: tp, text: p.length > CAP ? p.slice(0, CAP) : p, cut: p.length > CAP || undefined }); }
    });
  }
  return out;
}

/* ---- one source ---- */

function split(s, text, pdf) {
  if (s.format === 'egov') return splitEgov(text);
  if (s.format === 'clml') return splitClml(text, s.label);
  if (s.format === 'canada') return splitCanada(text);
  if (s.format === 'constitute') return splitConstitute(text);
  if (s.format === 'section') return splitSection(lines(text).join(' '), s);
  if (s.format === 'numbered') return splitNumbered(lines(text));
  if (pdf || s.format === 'inline') return splitInline(flat(text));
  return splitLines(lines(text), s.lang);
}

async function fetchSource(s) {
  const urls = Array.isArray(s.url) ? s.url : [s.url];
  const rec = { instrument: s.instrument, kind: s.kind || 'code', lang: s.lang, url: s.url, fetched: TODAY, topics: s.topics || TOPICS };
  if (s.official) rec.official = s.official;
  const tries = [urls];
  if (s.archive !== false) tries.push(urls.map((u) => 'https://web.archive.org/web/2026/' + u));
  const notes = [];
  for (const us of tries) {
    const via = us === urls ? 'direct' : 'archive';
    const texts = [], finals = [];
    let pdf = false, failed = null;
    for (const u of us) {
      const r = await get(u, { lang: s.accept_lang || s.lang, accept: s.accept });
      if (r.error) { failed = r.error; break; }
      if (r.status !== 200) { failed = 'HTTP ' + r.status; break; }
      const d = decode(r);
      pdf = pdf || d.pdf;
      let t = d.text;
      if (s.format === 'constitute') { try { t = JSON.parse(t).html || ''; } catch (e) { failed = 'JSON でない応答'; break; } }
      texts.push(t);
      finals.push(r.final);
    }
    if (failed) { notes.push(via + '：' + failed); continue; }
    const text = texts.join('\n');
    const plain = flat(text);
    if (plain.length < 300) { notes.push(via + '：本文がない（JavaScript で描く頁か、拒む応答）'); continue; }
    if (s.title && !new RegExp(s.title, 'iu').test(plain)) { notes.push(via + '：題「' + s.title + '」が見つからない（別の頁か、拒む応答。冒頭は「' + plain.slice(0, 80) + '」）'); continue; }
    let arts = split(s, text, pdf);
    /* A page that repeats an article after the law (notes, concordances, a consolidated table) keeps the first. */
    if (!['egov', 'clml', 'canada', 'constitute', 'section'].includes(s.format)) {
      const seen = new Set();
      const norm = (x) => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/(\d)\s*(o|º|°|ª|\.)$/, '$1').replace(/\s+/g, ' ');
      /* Acts numbered without a word list their sections twice (contents, then text): the longer one is the text. */
      if (s.format === 'numbered') {
        const best = new Map();
        for (const a of arts) { const k = norm(a.label), n = a.paras.join(' ').length; if (!best.has(k) || n > best.get(k).n) best.set(k, { a, n }); }
        arts = arts.filter((a) => best.get(norm(a.label)).a === a);
      } else {
        /* Otherwise the first occurrence that has a text of its own; a line of a table of contents ("§ 132a Mißbrauch von
         * Titeln") has none, and the text comes later. */
        const body = (a) => a.paras.join(' ').length - a.label.length;
        const pick = new Map();
        for (const a of arts) { const k = norm(a.label), cur = pick.get(k); if (!cur || (body(cur) < 80 && body(a) > body(cur))) pick.set(k, a); }
        arts = arts.filter((a) => { const k = norm(a.label); if (seen.has(k) || pick.get(k) !== a) return false; seen.add(k); return true; });
      }
    }
    if (!arts.length) { notes.push(via + '：条に分けられない'); continue; }
    const topics = rec.topics.filter((t) => searchable(t, s.lang, s));
    Object.assign(rec, { via, final: finals.length === 1 ? finals[0] : finals, status: 200, length: plain.length, sha256_full: sha(plain), articles: arts.length, searched: topics });
    if (topics.length < rec.topics.length) rec.unsearchable = rec.topics.filter((t) => !topics.includes(t));
    if (notes.length) rec.notes = notes;
    return { rec, found: search(arts, s.lang, topics, s) };
  }
  rec.error = notes.join(' / ');
  return { rec, found: [] };
}

/* ---- data files ---- */

function load(iso) {
  const f = path.join(DATA, iso + '.json');
  return fs.existsSync(f) ? readJSON(f) : { country: iso, sources: {}, provisions: [] };
}
/* One provision or source to a line, so that a difference shows which provision changed. */
function save(d) {
  fs.mkdirSync(DATA, { recursive: true });
  d.provisions.sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));
  const src = Object.keys(d.sources).sort().map((k) => '  ' + JSON.stringify(k) + ': ' + JSON.stringify(d.sources[k]));
  const out = '{\n "country": ' + JSON.stringify(d.country) + ',\n "sources": {\n' + src.join(',\n') + '\n },\n "provisions": [\n' + d.provisions.map((p) => '  ' + JSON.stringify(p)).join(',\n') + '\n ]\n}\n';
  fs.writeFileSync(path.join(DATA, d.country + '.json'), out);
}
function store(owner, id, s, rec, found) {
  const d = load(owner);
  d.sources[id] = rec;
  d.provisions = d.provisions.filter((p) => p.source !== id);
  const seen = new Map();
  const url = Array.isArray(rec.final) ? rec.final[0] : rec.final;
  for (const f of found) {
    let pid = id + ' ' + f.article + (f.part === 'article' ? '' : ' ¶' + f.part.split(' ')[1]);
    const n = (seen.get(pid) || 0) + 1; seen.set(pid, n); if (n > 1) pid += ' (' + n + ')';
    d.provisions.push({ id: pid, source: id, country: owner, instrument: s.instrument, kind: rec.kind, article: f.article, ...(f.caption ? { caption: f.caption } : {}), part: f.part, lang: s.lang, topics: f.topics, text: f.text, ...(f.cut ? { cut: true } : {}), url, fetched: TODAY, sha256: sha(f.text) });
  }
  save(d);
}

/* ---- batches ---- */

async function constitutions(list) {
  const r = await get('https://www.constituteproject.org/service/constitutions?lang=en');
  if (r.error || r.status !== 200) {
    for (const c of list) { const d = load(c.iso3); d.sources.constitute = { kind: 'constitution', instrument: 'Constitution', error: 'Constitute の一覧を取れない：' + (r.error || 'HTTP ' + r.status), fetched: TODAY }; save(d); }
    return;
  }
  const all = JSON.parse(decode(r).text);
  /* What Constitute lists (drafts left out), kept for the record of which text was matched to which country. */
  const index = all.filter((x) => !x.is_draft).map((x) => ({ id: x.id, country_id: x.country_id, title: x.title, year_enacted: x.year_enacted, year_updated: x.year_updated, in_force: x.in_force, is_historic: x.is_historic }));
  fs.writeFileSync(path.join(DIR, 'constitute-index.json'), '{\n "_": "Constitute Project の一覧（草案を除く）。tools/world.js が ' + TODAY + ' に取り寄せた。",\n "constitutions": [\n' + index.map((x) => '  ' + JSON.stringify(x)).join(',\n') + '\n ]\n}\n');
  const norm = (x) => String(x || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]+/g, ' ').trim().replace(/^the /, '').replace(/ the$/, '');
  for (const c of list) {
    const o = (CONF.constitute.overrides || {})[c.iso3];
    let e = null;
    if (typeof o === 'string') e = all.find((x) => x.id === o) || null;
    else if (o !== null) {
      const names = [c.name, ...((CONF.constitute.names || {})[c.iso3] || [])].map(norm);
      const mine = all.filter((x) => !x.is_draft && names.includes(norm(x.country_id)));
      const newest = (xs) => xs.sort((a, b) => (+(b.year_updated || b.year_enacted || 0)) - (+(a.year_updated || a.year_enacted || 0)))[0] || null;
      /* The newest text Constitute marks as in force; if it marks none, the newest it has, with that fact recorded. */
      e = newest(mine.filter((x) => x.in_force !== false && !x.is_historic)) || newest(mine.slice());
    }
    const d = load(c.iso3);
    if (!e) {
      d.sources.constitute = { kind: 'constitution', instrument: 'Constitution', error: (CONF.constitute.missing || {})[c.iso3] || 'Constitute の一覧に、この国の効力のある憲法の英文が見当たらない', fetched: TODAY };
      d.provisions = d.provisions.filter((p) => p.source !== 'constitute');
      save(d);
      console.log(c.iso3, 'constitute: none');
      continue;
    }
    const s = { instrument: e.title || e.id, kind: 'constitution', lang: 'en', format: 'constitute', archive: false, official: 'Constitute Project（英訳）', url: 'https://www.constituteproject.org/service/html?cons_id=' + encodeURIComponent(e.id) + '&lang=en' };
    const { rec, found } = await fetchSource(s);
    Object.assign(rec, { constitute_id: e.id, title: e.title, year_enacted: e.year_enacted, year_updated: e.year_updated, ...(e.in_force === false || e.is_historic ? { constitute_not_in_force: true } : {}), page: 'https://www.constituteproject.org/constitution/' + e.id + '?lang=en' });
    store(c.iso3, 'constitute', s, rec, found);
    console.log(c.iso3, 'constitute', e.id, rec.error || rec.articles + ' articles, ' + found.length + ' kept');
  }
}

async function codes(sources) {
  for (const s of sources) {
    const { rec, found } = await fetchSource(s);
    /* An instrument shared by several countries (GDPR, a treaty) is kept once, under its group (data/_EU.json). */
    const owner = s.countries.length > 1 ? '_' + s.group : s.countries[0];
    if (s.countries.length > 1) rec.countries = s.countries;
    store(owner, s.id, s, rec, found);
    console.log(s.id, rec.error || (rec.via + ' ' + rec.articles + ' articles, ' + found.length + ' kept'));
  }
}

async function probe(urls) {
  for (const u of urls) {
    const r = await get(u);
    if (r.error) { console.log('PROBE', u, 'ERROR', r.error); continue; }
    const t = decode(r).text;
    console.log('PROBE', u, r.status, r.type, r.final === u ? '' : '-> ' + r.final, 'bytes=' + r.bytes.length);
    if (process.env.PROBE_SPLIT) {
      const h = JSON.parse(t).html || '';
      const arts = splitConstitute(h);
      console.log('  ARTS ' + arts.length + ' ' + arts.slice(0, 15).map((a) => a.label).join(' | '));
      const tags = [...h.matchAll(/<(h[1-6]|p)(\s[^>]*)?>([\s\S]{0,60})/g)].slice(0, 40).map((m) => m[1] + (m[2] || '').slice(0, 25) + ':' + flat(m[3]).slice(0, 30));
      console.log('  TAGS ' + tags.join(' || '));
      continue;
    }
    const body = process.env.RAW ? t.replace(/\s+/g, ' ') : flat(t);
    const from = process.env.RAW_FIND ? Math.max(0, body.indexOf(process.env.RAW_FIND) - 300) : +(process.env.RAW_FROM || 0);
    console.log('  HEAD ' + body.slice(from, from + +(process.env.RAW_LEN || 400)));
  }
}

/* ---- coverage ---- */

/* The coverage table, as text, from the list of countries, the settings and the data files (a pure function, so that
 * verification/world/check.js can confirm that coverage.json is what this makes). */
function coverageText(countries, conf, data) {
  const topics = Object.keys(conf.topics);
  const shared = Object.entries(data).filter(([f]) => f.startsWith('_')).map(([, d]) => d);
  const rows = [];
  for (const c of countries) {
    const d = data[c.iso3 + '.json'] || { sources: {}, provisions: [] };
    const srcs = Object.entries(d.sources).map(([id, r]) => ({ id, r, provs: d.provisions.filter((p) => p.source === id) }));
    for (const sh of shared) for (const [id, r] of Object.entries(sh.sources)) if ((r.countries || []).includes(c.iso3)) srcs.push({ id, r, provs: sh.provisions.filter((p) => p.source === id) });
    const cons = srcs.filter((x) => x.r.kind === 'constitution');
    const row = {
      country: c.iso3, name: c.name, name_ja: c.name_ja,
      constitution: cons.length ? cons.map((x) => (x.r.error ? { source: x.id, fetched: false, reason: x.r.error }
        : { source: x.id, fetched: true, title: x.r.title || x.r.instrument, version: x.r.year_updated || x.r.year_enacted || null, date: x.r.fetched, url: x.r.page || (Array.isArray(x.r.final) ? x.r.final[0] : x.r.final), via: x.r.via }))
        : [{ source: null, fetched: false, reason: 'まだ取り寄せていない' }],
      constitution_articles: [...new Set(cons.flatMap((x) => x.provs.map((p) => x.id + ' ' + p.article)))],
      topics: {},
    };
    for (const t of topics) {
      const cs = srcs.filter((x) => x.r.kind !== 'constitution' && (x.r.topics || topics).includes(t));
      const ok = cs.filter((x) => !x.r.error && (x.r.searched || []).includes(t));
      if (ok.length) {
        const ps = ok.flatMap((x) => x.provs.filter((p) => p.topics.includes(t)).map((p) => p.id));
        row.topics[t] = ps.length ? { state: 'found', provisions: ps } : { state: 'none', searched: ok.map((x) => x.id) };
      } else if (cs.length) {
        row.topics[t] = { state: 'not fetched', reason: cs.map((x) => x.id + '：' + (x.r.error || 'この言語の検索語の組がない')).join(' / ') };
      } else {
        const u = conf.unsourced[c.iso3] || {};
        row.topics[t] = { state: 'not fetched', reason: u[t] || u['*'] || (conf.unsourced_topic || {})[t] || conf.unsourced_default };
      }
    }
    rows.push(row);
  }
  return '{\n "_": "tools/world.js coverage が data/ から作る。手で直さない。",\n "countries": [\n' + rows.map((r) => '  ' + JSON.stringify(r)).join(',\n') + '\n ]\n}\n';
}
function coverage() {
  const data = {};
  for (const f of fs.readdirSync(DATA).sort()) data[f] = readJSON(path.join(DATA, f));
  const text = coverageText(COUNTRIES, CONF, data);
  fs.writeFileSync(path.join(DIR, 'coverage.json'), text);
  return JSON.parse(text).countries;
}

/* ---- classification ---- */

/* Each kept provision is classified for the two projects: "applies", "could apply" or "does not apply", with a reason
 * tied to the projects' facts. A provision read one by one has its decision in decisions.json (with the SHA-256 of the
 * text it was made on); the rest fall to the first rule of decisions.json whose conditions all hold. A provision that
 * neither reaches is left out of classes.json, and verification/world/check.js fails until it is read. */
function classifyAll(data, D) {
  const out = {}, left = [];
  const EX = new Set(D.sophaxis_excluded || []);
  for (const d of Object.values(data)) for (const p of d.provisions) {
    const text = (p.caption ? p.caption + ' ' : '') + p.text;
    const dec = (D.provisions || {})[p.id];
    if (dec && dec.sha256 === p.sha256) { const { reason, sha256, ...rest } = dec; out[p.id] = { by: 'read', ...rest }; continue; }
    const r = (D.rules || []).find((x) => (!x.kind || x.kind === p.kind) && (!x.topic || p.topics.includes(x.topic))
      && (!x.topics_only || p.topics.every((t) => x.topics_only.includes(t))) && (!x.sources || new RegExp(x.sources).test(p.source))
      && (!x.lang || x.lang === p.lang) && (!x.test || new RegExp(x.test, 'iu').test(text)) && (!x.not || !new RegExp(x.not, 'iu').test(text)));
    if (!r) { left.push(p.id); continue; }
    /* The reason stays in decisions.json (the rule's); classes.json names the rule. */
    const c = { by: r.id, class: r.class };
    if (r.class !== 'does not apply') {
      const excluded = p.country.startsWith('_') || EX.has(p.country);
      Object.assign(c, { project: r.project, severity: excluded && r.severity_excluded ? r.severity_excluded : r.severity, action: excluded && r.action_excluded ? r.action_excluded : r.action });
    }
    out[p.id] = c;
  }
  return { out, left };
}
function classify() {
  const data = {};
  for (const f of fs.readdirSync(DATA).sort()) data[f] = readJSON(path.join(DATA, f));
  const D = readJSON(path.join(DIR, 'decisions.json'));
  const { out, left } = classifyAll(data, D);
  const keys = Object.keys(out).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  fs.writeFileSync(path.join(DIR, 'classes.json'), '{\n "_": "tools/world.js classify が data/ と decisions.json から作る。手で直さない。",\n "provisions": {\n' + keys.map((k) => '  ' + JSON.stringify(k) + ': ' + JSON.stringify(out[k])).join(',\n') + '\n }\n}\n');
  return left;
}

/* ---- main ---- */

async function main() {
  if (process.argv[2] === 'coverage') { console.log(coverage().length + ' rows'); return; }
  if (process.argv[2] === 'classify') { const left = classify(); console.log(left.length + ' provisions without a classification'); if (process.argv[3]) fs.writeFileSync(process.argv[3], left.join('\n') + '\n'); return; }
  const req = readJSON(path.join(DIR, 'request.json'));
  const spec = process.env.WORLD_BATCH || req.batch;
  const [batch, only] = spec.split(':');
  const pick = only ? only.split(',') : null;
  const single = (s) => s.countries.length === 1;
  if (batch === 'probe') return probe(req.probe || []);
  if (batch === 'src') return codes(CONF.codes.filter((s) => pick.includes(s.id)));
  if (batch === 'shared') return codes(CONF.codes.filter((s) => !single(s) && (!pick || pick.includes(s.id))));
  if (batch === 'japan') return codes(CONF.codes.filter((s) => single(s) && s.countries[0] === 'JPN' && (!pick || pick.includes(s.id))));
  /* "codes-europe": the codes of a region, without fetching its constitutions again. */
  /* "cons-europe": the constitutions of a region only. */
  const codesOnly = batch.startsWith('codes-'), consOnly = batch.startsWith('cons-');
  const region = codesOnly ? batch.slice(6) : consOnly ? batch.slice(5) : batch;
  const list = COUNTRIES.filter((c) => c.batch === region && (!pick || pick.includes(c.iso3)));
  if (!list.length) throw new Error('組がない：' + spec);
  const isos = list.map((c) => c.iso3);
  if (!codesOnly) await constitutions(list);
  if (!consOnly) await codes(CONF.codes.filter((s) => single(s) && s.countries[0] !== 'JPN' && isos.includes(s.countries[0])));
}

module.exports = { lines, splitLines, splitInline, splitEgov, splitClml, splitCanada, splitConstitute, splitSection, search, sha, coverage, coverageText, classifyAll, TOPICS };
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });

#!/usr/bin/env node
/* ヌスクァマのサイトを、リポジトリの Markdown から生成する。
 *
 *   node build.js            site/ に書き出す
 *
 * GitHub で読む文とサイトで読む文を同じにするため、サイトの頁はすべて Markdown から作る。
 * site/ は生成物で、手で直さない。依存は Node.js だけ。頁はほかのサーバーへ何も要求しない。
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'site');
const BASE = 'https://nusquama.vercel.app/';
const REPO = 'https://github.com/cpsbvbng26-dotcom/nusquama';
const NAME = '無何有騎士王国ヌスクァマ';
/* Google Search Console の所有者の確認（URL プレフィックスのプロパティ、HTML タグの方法）。値は王から受け取ったもの。 */
const GOOGLE_SITE_VERIFICATION = 'UEPpX5mfnLlhOBTBTETu-PmRO_Y4L2SmjEiaq_U1Zf8';

/* 頁の元。README がトップ、名簿、王の正誤表、規程。 */
const POLICIES = ['terms', 'disclaimer', 'privacy', 'knighting', 'requests', 'names', 'legality', 'exchange'];
/* 英語の訳がある規程。日本語の版を正とする。 */
const EN = ['terms', 'disclaimer', 'privacy', 'knighting', 'requests', 'names', 'legality', 'exchange'];
/* 英語の訳がある、トップ以外の頁。KNIGHTS.md には KNIGHTS.en.md が対になる。 */
const ROOT_EN = [['KNIGHTS', 'knights'], ['ERRATA', 'errata'], ['SYMBOLS', 'symbols'], ['CALENDAR', 'calendar'], ['GAZETTE', 'gazette'],
  ['STORY', 'story'], ['LEXICON', 'lexicon'], ['INSTITUTIONS', 'institutions'], ['PRESS', 'press'], ['PLAY', 'play']];
/* 日本語の頁の下の欄に並べる短い名。 */
const SHORT = { knights: '騎士の名簿', errata: '王の正誤表', symbols: '国のしるし', calendar: '暦と祝日', gazette: '官報', story: '建国の物語', lexicon: '国の言葉', institutions: '国の仕組み', press: '紹介する人へ', play: '遊び' };
const SOURCES = [['README.md', 'index.html']].concat(ROOT_EN.map(([f, h]) => [f + '.md', h + '.html']))
  .concat(POLICIES.map((p) => ['policies/' + p + '.md', 'policies/' + p + '.html']))
  .concat(EN.map((p) => ['policies/' + p + '.en.md', 'policies/' + p + '.en.html']), [['founding.en.md', 'founding.en.html']], ROOT_EN.map(([f, h]) => [f + '.en.md', h + '.en.html']));
const ASSETS = ['emblem.svg', 'favicon.svg', 'favicon.ico', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'og.png', 'flag.svg'];
/* build.js が描く画像。版図の地図は正誤表から。 */
const DRAWN = ['territory.svg'];

/* どの頁にも先頭に出す断り。README の冒頭と同じ内容である。 */
const NOTICE = 'これは創作であり、遊びです。ヌスクァマは国家ではなく、いかなる実在の国家・王室・騎士団・叙勲・称号とも関係がありません。ここで授ける称号に、法的な効力はありません。';
const NOTICE_EN = 'This is a work of fiction, written for fun. Nusquama is not a state and is not related to any real state, royal house, order of knighthood, honour or title. The titles it gives have no legal effect.';

/* 文書の安全のヘッダー。<meta> では出せない frame-ancestors などを Vercel に出させる。 */
const HEADERS = [{
  source: '/(.*)',
  headers: [
    { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'no-referrer' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()' },
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
    { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
  ],
}];

const STYLE = `
:root { --bg: #f7f3ea; --fg: #1d1a16; --muted: #5d564b; --line: #d8cfbd; --accent: #14213d; --gold: #8a6d12; --notice: #efe6d2; color-scheme: light; }
@media (prefers-color-scheme: dark) { :root { --bg: #0e1626; --fg: #ece6d8; --muted: #b5ad9c; --line: #2c3a55; --accent: #e8cf74; --gold: #e8cf74; --notice: #17223a; color-scheme: dark; } }
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body { margin: 0; background: var(--bg); color: var(--fg); font-family: "Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif; line-height: 1.9; font-size: 17px; }
a { color: var(--accent); text-underline-offset: 3px; }
a:focus-visible { outline: 3px solid var(--gold); outline-offset: 2px; }
.skip { position: absolute; left: -9999px; top: 0; background: var(--bg); padding: 8px 12px; }
.skip:focus { left: 16px; z-index: 10; }
header, main, footer { max-width: 44rem; margin: 0 auto; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }
header { padding-top: 20px; padding-bottom: 8px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
header img { width: 40px; height: 48px; }
header a.home { font-weight: 600; text-decoration: none; color: var(--fg); }
.notice { background: var(--notice); border-left: 4px solid var(--gold); padding: 10px 14px; margin: 12px 0 24px; font-size: 15px; color: var(--fg); }
main { padding-bottom: 32px; }
h1 { font-size: 1.6rem; line-height: 1.4; text-wrap: balance; margin: 0.5em 0; }
h2 { font-size: 1.25rem; line-height: 1.5; margin: 2em 0 0.6em; border-bottom: 1px solid var(--line); padding-bottom: 4px; }
h3 { font-size: 1.05rem; }
p, li { overflow-wrap: anywhere; }
blockquote { margin: 1em 0; padding: 4px 16px; border-left: 4px solid var(--line); color: var(--muted); }
hr { border: 0; border-top: 1px solid var(--line); margin: 2em 0; }
code { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 0.9em; }
.emblem { display: block; width: 180px; max-width: 60%; height: auto; margin: 16px auto; }
.table { overflow-x: auto; }
table { border-collapse: collapse; width: 100%; font-size: 15px; }
th, td { border: 1px solid var(--line); padding: 6px 8px; text-align: left; vertical-align: top; }
th:first-child, td:first-child { white-space: nowrap; }
footer { border-top: 1px solid var(--line); padding-top: 16px; padding-bottom: 40px; font-size: 14px; color: var(--muted); }
footer ul { list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: 4px 16px; }
.map svg { display: block; width: 100%; max-width: 420px; height: auto; margin: 16px auto; }
.pager { display: flex; flex-wrap: wrap; gap: 4px 16px; }
@media print { .skip, footer ul, .pager { display: none; } body { font-size: 12pt; } header, main, footer { max-width: none; } a { text-decoration: none; } main a[href^="http"]::after { content: " <" attr(href) ">"; font-size: 0.85em; } .table { overflow: visible; } }
`.trim();
const STYLE_HASH = 'sha256-' + crypto.createHash('sha256').update(STYLE, 'utf8').digest('base64');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* 元の Markdown の中のリンクを、生成した頁どうしのリンクに直す。 */
function mapHref(href, srcRel, outRel) {
  if (/^(https?:|mailto:|#)/.test(href)) return href;
  const [p, hash] = href.split('#');
  const abs = path.posix.normalize(path.posix.join(path.posix.dirname(srcRel), p));
  let target = null;
  const hit = SOURCES.find(([s]) => s === abs);
  if (hit) target = hit[1];
  else if (abs === 'LICENSE') return REPO + '/blob/main/LICENSE';
  else if (abs.startsWith('assets/') && ASSETS.includes(abs.slice(7))) target = abs.slice(7);
  else if (DRAWN.includes(abs) || /^territory-\d{4}\.svg$/.test(abs) || abs === 'calendar.ics' || /^(errata|gazette)\/\d+(\.en)?\.html$/.test(abs)) target = abs;
  else return REPO + '/blob/main/' + abs;
  const rel = path.posix.relative(path.posix.dirname(outRel), target) || path.posix.basename(target);
  return rel + (hash ? '#' + hash : '');
}

function inline(text, srcRel, outRel) {
  let s = esc(text);
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (m, alt, src) => `<img class="emblem" src="${esc(mapHref(src.replace(/&amp;/g, '&'), srcRel, outRel))}" alt="${alt}">`);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, href) => `<a href="${esc(mapHref(href.replace(/&amp;/g, '&'), srcRel, outRel))}">${t}</a>`);
  s = s.replace(/&lt;(https?:\/\/[^\s&]+)&gt;/g, (m, u) => `<a href="${u}">${u}</a>`);
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  return s;
}

/* この頁群が使う分だけの Markdown：見出し・段落・引用・箇条・番号付き・表・区切り・画像。 */
/* 段落の中の行をつなぐ。英字どうしが接するときだけ空白を挟む（日本語の行の境には空白を入れない）。 */
function joinLines(parts) {
  const text = (h) => h.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/g, 'x');
  return parts.reduce((acc, t, i) => (i && /[\x21-\x7e]$/.test(text(parts[i - 1])) && /^[\x21-\x7e]/.test(text(t)) ? acc + ' ' + t : acc + t), '');
}

function markdown(md, srcRel, outRel) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let i = 0;
  const il = (t) => inline(t, srcRel, outRel);
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) { i++; continue; }
    let m;
    if ((m = /^(#{1,3}) (.*)$/.exec(l))) { out.push(`<h${m[1].length}>${il(m[2])}</h${m[1].length}>`); i++; continue; }
    if (/^---+$/.test(l.trim())) { out.push('<hr>'); i++; continue; }
    if (l.startsWith('>')) {
      const block = [];
      while (i < lines.length && lines[i].startsWith('>')) { block.push(lines[i].replace(/^> ?/, '')); i++; }
      const paras = block.join('\n').split(/\n\s*\n/).map((p) => '<p>' + joinLines(p.split('\n').map(il)) + '</p>');
      out.push('<blockquote>' + paras.join('') + '</blockquote>');
      continue;
    }
    if (/^\|/.test(l)) {
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) { rows.push(lines[i]); i++; }
      const cells = (r) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const head = cells(rows[0]);
      const body = rows.slice(2).map(cells);
      out.push('<div class="table"><table><tr>' + head.map((c) => `<th scope="col">${il(c)}</th>`).join('') + '</tr>'
        + body.map((r) => '<tr>' + r.map((c) => `<td>${il(c)}</td>`).join('') + '</tr>').join('') + '</table></div>');
      continue;
    }
    if (/^- /.test(l)) {
      const items = [];
      while (i < lines.length && /^- /.test(lines[i])) { items.push(lines[i].slice(2)); i++; }
      out.push('<ul>' + items.map((t) => `<li>${il(t)}</li>`).join('') + '</ul>');
      continue;
    }
    if (/^\d+\. /.test(l)) {
      const items = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) { items.push(lines[i].replace(/^\d+\. /, '')); i++; }
      out.push('<ol>' + items.map((t) => `<li>${il(t)}</li>`).join('') + '</ol>');
      continue;
    }
    if (/^!\[/.test(l)) { out.push(il(l)); i++; continue; }
    const para = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,3} |>|\||- |\d+\. |---+$|!\[)/.test(lines[i])) { para.push(lines[i]); i++; }
    out.push('<p>' + joinLines(para.map(il)) + '</p>');
  }
  return out.join('\n');
}

/* 王の正誤表の行と、騎士の名簿の行。表の「番」の列が数字の行だけを数える。 */
function tableRows(rel) {
  const cells = (r) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
  return fs.readFileSync(path.join(ROOT, rel), 'utf8').split('\n').filter((l) => /^\| \d+ \|/.test(l)).map(cells);
}
/* 版図（基本法第三条）：王が認めて正誤表に記した誤りの数。誤りを一つ認めるたびに広がる。 */
const domain = () => tableRows('ERRATA.md').length;
const DOMAIN_LINE = () => '版図のうち、王の正誤表に記した誤りは ' + domain() + ' 件です。基本法第三条により、版図は、王が誤りを一つ認めるたびに広がります。';

/* 王の正誤表と騎士の名簿の新着の配信（Atom）。どちらも表から作り、手で書かない。 */
function atom(kind) {
  const rows = tableRows(kind === 'errata' ? 'ERRATA.md' : 'KNIGHTS.md');
  const title = kind === 'errata' ? NAME + '：王の正誤表' : NAME + '：正誤表騎士団 名簿';
  const page = kind === 'errata' ? 'errata.html' : 'knights.html';
  const entries = rows.map((r) => {
    const [n, date] = r;
    const text = kind === 'errata' ? r[2] + '。正：' + r[4] : '騎士 ' + r[1] + '、正した誤り：' + r[3];
    return `  <entry>\n    <id>${BASE}${page}#${kind}-${esc(n)}</id>\n    <title>${esc(kind === 'errata' ? '第 ' + n + ' 件：' + r[2] : '第 ' + n + ' 番の騎士：' + r[1])}</title>\n    <link href="${BASE}${page}"/>\n    <updated>${esc(date)}T00:00:00+09:00</updated>\n    <summary>${esc(text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'))}</summary>\n  </entry>`;
  });
  const updated = rows.map((r) => r[1]).sort().pop() || '2026-11-07';
  return `<?xml version="1.0" encoding="utf-8"?>\n<feed xmlns="http://www.w3.org/2005/Atom">\n  <title>${esc(title)}</title>\n  <subtitle>${esc(NOTICE)}</subtitle>\n  <id>${BASE}${kind}.xml</id>\n  <link rel="self" href="${BASE}${kind}.xml"/>\n  <link href="${BASE}${page}"/>\n  <updated>${updated}T00:00:00+09:00</updated>\n  <author><name>騎士王ネモ一世（創作の中の王）</name></author>\n${entries.join('\n')}${entries.length ? '\n' : ''}</feed>\n`;
}

/* 正誤の分類。色は国章の三色に限るので、分類は区画の形で分ける。島の名は、分類のラテン語の属格と、
 * その分類の中での順のローマ数字で決まる（Insula Facti I など）。手で名付けない。 */
const KINDS = [
  { ja: '事実', en: 'Fact', la: 'Facti', shape: 'square', shapeJa: '正方形', shapeEn: 'square' },
  { ja: '語', en: 'Word', la: 'Verbi', shape: 'diamond', shapeJa: '菱形', shapeEn: 'diamond' },
  { ja: '法', en: 'Law', la: 'Legis', shape: 'triangle', shapeJa: '三角形', shapeEn: 'triangle' },
  { ja: '範囲', en: 'Scope', la: 'Finis', shape: 'hexagon', shapeJa: '六角形', shapeEn: 'hexagon' },
  { ja: '誤字', en: 'Typo', la: 'Litterae', shape: 'bar', shapeJa: '横長の長方形', shapeEn: 'wide rectangle' },
  { ja: '数', en: 'Number', la: 'Numeri', shape: 'pentagon', shapeJa: '五角形', shapeEn: 'pentagon' },
];
function roman(n) {
  const t = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let out = '';
  for (const [v, r] of t) while (n >= v) { out += r; n -= v; }
  return out;
}
/* 正誤表の行（日本語と英語）を、分類と島の名とともに返す。 */
function errataEntries() {
  const ja = tableRows('ERRATA.md'), en = tableRows('ERRATA.en.md');
  const seen = {};
  return ja.map((r, i) => {
    const kind = KINDS.find((k) => k.ja === r[6]);
    if (!kind) throw new Error('王の正誤表の第 ' + r[0] + ' 件の分類「' + r[6] + '」が KINDS にない');
    seen[kind.ja] = (seen[kind.ja] || 0) + 1;
    return { n: Number(r[0]), date: r[1], where: r[2], wrong: r[3], right: r[4], source: r[5], kind, written: r[7], place: 'Insula ' + kind.la + ' ' + roman(seen[kind.ja]), en: en[i] || [] };
  });
}

/* 区画の形。どれも金一色の一つの図形で、文字を描かない。 */
function tileShape(shape, x, y) {
  const f = (v) => v.toFixed(1);
  const poly = (k, r, rot) => Array.from({ length: k }, (_, j) => { const a = rot + (2 * Math.PI * j) / k; return f(x + r * Math.cos(a)) + ',' + f(y + r * Math.sin(a)); }).join(' ');
  if (shape === 'diamond') return `<polygon points="${poly(4, 16, -Math.PI / 2)}" fill="#c9a227"/>`;
  if (shape === 'triangle') return `<polygon points="${poly(3, 16, -Math.PI / 2)}" fill="#c9a227"/>`;
  if (shape === 'hexagon') return `<polygon points="${poly(6, 15, 0)}" fill="#c9a227"/>`;
  if (shape === 'pentagon') return `<polygon points="${poly(5, 15, -Math.PI / 2)}" fill="#c9a227"/>`;
  if (shape === 'bar') return `<rect x="${f(x - 15)}" y="${f(y - 8)}" width="30" height="16" fill="#c9a227"/>`;
  return `<rect x="${f(x - 13)}" y="${f(y - 13)}" width="26" height="26" fill="#c9a227"/>`;
}

/* 版図の地図（基本法第三条）。中央に王の本棚（三本の柱）、そのまわりに正誤表の誤り一件ごとの区画を、
 * ひまわりの種の並び（黄金角）で置く。区画が増えても重ならず、島は丸く広がる。書体を使わない。
 * 区画の形は分類による。links を渡すと、区画ごとにその正誤の頁へつなぐ（正誤表の頁に埋め込む地図）。 */
function territorySvg(n = domain(), opts = {}) {
  const entries = opts.entries || null;
  const step = 34, golden = Math.PI * (3 - Math.sqrt(5));
  const reach = step * Math.sqrt(n + 4) + 50;
  const size = Math.ceil(2 * reach), c = size / 2;
  const tiles = Array.from({ length: n }, (_, i) => {
    const r = step * Math.sqrt(i + 4), a = (i + 4) * golden;
    const e = entries && entries[i];
    const t = tileShape(e ? e.kind.shape : 'square', c + r * Math.cos(a), c + r * Math.sin(a));
    return opts.links && e ? `<a href="${opts.links(e)}" aria-label="${esc(opts.label(e))}">${t}</a>` : t;
  });
  const shelf = [-22, -4, 14].map((x) => `<rect x="${(c + x).toFixed(1)}" y="${(c - 30).toFixed(1)}" width="8" height="60" fill="#e8cf74"/>`);
  const title = opts.title || '版図の地図（創作）：中央に王の本棚、まわりに王の正誤表の誤り ' + n + ' 件の区画';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" role="img" aria-labelledby="t">
<title id="t">${esc(title)}</title>
<rect width="${size}" height="${size}" fill="#14213d"/>
${shelf.join('\n')}
${tiles.join('\n')}
</svg>
`;
}
/* 年ごとの版図：その年の終わりまでに記した誤りで描く。 */
const errataYears = () => [...new Set(tableRows('ERRATA.md').map((r) => r[1].slice(0, 4)))].sort();
const DRAWN_YEARS = () => errataYears().map((y) => 'territory-' + y + '.svg');

/* 正誤表の頁に埋める三つ：区画ごとにつながる地図、日ごとの累計、年ごとの版図。 */
function errataMap(en = false) {
  const entries = errataEntries();
  const svg = territorySvg(entries.length, {
    entries, links: (e) => 'errata/' + e.n + (en ? '.en' : '') + '.html',
    label: (e) => (en ? 'Entry ' + e.n + ': ' : '第 ' + e.n + ' 件：') + e.place,
    title: en ? 'Map of the domain (fiction): the King\'s bookshelf in the centre, and around it one parcel for each of the ' + entries.length + ' mistakes in the errata. Each parcel links to its entry.'
      : '版図の地図（創作）：中央に王の本棚、まわりに王の正誤表の誤り ' + entries.length + ' 件の区画。区画ごとに、その正誤の頁へつながる',
  }).replace('aria-labelledby="t"', 'aria-labelledby="tm"').replace('<title id="t">', '<title id="tm">');
  return '<div class="map">' + svg.trim() + '</div>';
}
function errataGrowth(en = false) {
  const rows = tableRows('ERRATA.md');
  const days = [...new Set(rows.map((r) => r[1]))].sort();
  let total = 0;
  const pts = days.map((d) => { const k = rows.filter((r) => r[1] === d).length; total += k; return [d, k, total]; });
  const W = 420, H = 140, bw = Math.min(48, Math.floor((W - 20) / Math.max(1, pts.length)) - 8);
  const max = Math.max(1, total);
  const bars = pts.map(([, , t], i) => { const h = Math.round((H - 20) * t / max); return `<rect x="${10 + i * (bw + 8)}" y="${H - 10 - h}" width="${bw}" height="${h}" fill="#c9a227"/>`; });
  const svg = `<div class="map"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="tg"><title id="tg">${esc(en ? 'Cumulative number of mistakes recorded, by day (the table below gives the numbers)' : '記した誤りの累計の推移（数は下の表）')}</title><rect width="${W}" height="${H}" fill="#14213d"/>${bars.join('')}</svg></div>`;
  const head = en ? '<th scope="col">Day</th><th scope="col">Recorded that day</th><th scope="col">Total</th>' : '<th scope="col">日</th><th scope="col">その日に記した件数</th><th scope="col">累計</th>';
  return svg + '\n<div class="table"><table><tr>' + head + '</tr>' + pts.map(([d, k, t]) => `<tr><td>${d}</td><td>${k}</td><td>${t}</td></tr>`).join('') + '</table></div>';
}
function errataYearTable(en = false) {
  const rows = tableRows('ERRATA.md');
  const head = en ? '<th scope="col">Year</th><th scope="col">Recorded that year</th><th scope="col">Total at the end of the year</th><th scope="col">Map</th>'
    : '<th scope="col">年</th><th scope="col">その年に記した件数</th><th scope="col">年末の累計</th><th scope="col">地図</th>';
  return '<div class="table"><table><tr>' + head + '</tr>' + errataYears().map((y) => {
    const k = rows.filter((r) => r[1].startsWith(y)).length, t = rows.filter((r) => r[1].slice(0, 4) <= y).length;
    return `<tr><td>${y}</td><td>${k}</td><td>${t}</td><td><a href="territory-${y}.svg">territory-${y}.svg</a></td></tr>`;
  }).join('') + '</table></div>';
}

/* 一件ごとの頁の Markdown。前後の区画と正誤表へつなぐ。 */
function errataEntryMd(e, total, en = false) {
  const nav = (k, t) => (k >= 1 && k <= total ? `[${t}](errata/${k}${en ? '.en' : ''}.html)` : null);
  const pager = [nav(e.n - 1, en ? 'Previous parcel' : '前の区画'), en ? '[The King\'s errata](ERRATA.en.md)' : '[王の正誤表](ERRATA.md)', nav(e.n + 1, en ? 'Next parcel' : '次の区画')].filter(Boolean);
  if (en) {
    const r = e.en;
    return `# The King's errata, entry ${e.n}: ${e.place}\n\nThis is an English translation. The [Japanese version](errata/${e.n}.html) governs.\n\n| Item | Entry |\n| --- | --- |\n| Place name | ${e.place} |\n| Category | ${e.kind.en} (${e.kind.shapeEn} on the map) |\n| Recorded | ${r[1] || e.date} |\n| Where | ${r[2] || ''} |\n| Wrong | ${r[3] || ''} |\n| Right | ${r[4] || ''} |\n| Checked against | ${r[5] || ''} |\n\n${pager.join(' / ')}\n`;
  }
  return `# 王の正誤表 第 ${e.n} 件：${e.place}\n\n| 項目 | 記したこと |\n| --- | --- |\n| 地名 | ${e.place} |\n| 分類 | ${e.kind.ja}（地図では${e.kind.shapeJa}） |\n| 記した日 | ${e.date} |\n| 場所 | ${e.where} |\n| 誤 | ${e.wrong} |\n| 正 | ${e.right} |\n| 確かめた先 | ${e.source} |\n\n${pager.join(' / ')}\n`;
}

const plainText = (t) => String(t).replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*`]/g, '');

/* 官報。トップの頁の年表、王の正誤表、騎士の名簿から、日付の新しい順に作る。手で書かない。 */
function timelineRows() {
  const md = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  const i = md.indexOf('\n## 年表\n');
  const part = md.slice(i, md.indexOf('\n## ', i + 5));
  return part.split('\n').filter((l) => /^\| \d{4}-\d{2}-\d{2}/.test(l)).map((l) => l.replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
}
function gazetteItems() {
  const items = timelineRows().map(([d, what, en]) => ({ date: d.slice(0, 10), kind: '年表', kindEn: 'Timeline', text: plainText(what), textEn: plainText(en || ''), from: 'README.md', fromEn: 'founding.en.md' }))
    .concat(tableRows('ERRATA.md').map((r) => ({ date: r[1], kind: '王の正誤表', kindEn: "King's errata", text: '第 ' + r[0] + ' 件を記す（' + plainText(r[2]) + '）', textEn: 'Entry ' + r[0] + ' is recorded', from: 'errata/' + r[0] + '.html', fromEn: 'errata/' + r[0] + '.en.html' })))
    .concat(tableRows('KNIGHTS.md').map((r) => ({ date: r[2], kind: '騎士の名簿', kindEn: 'Roll of knights', text: '第 ' + r[0] + ' 番の騎士 ' + plainText(r[1]) + ' を叙任する', textEn: plainText(r[1]) + ' is knighted as knight no. ' + r[0], from: 'KNIGHTS.md', fromEn: 'KNIGHTS.en.md' })));
  const sorted = items.map((x, k) => Object.assign(x, { k })).sort((a, b) => (a.date === b.date ? b.k - a.k : a.date < b.date ? 1 : -1));
  /* 号は古い順に 1 から振る。布告の番号（法令番号）は、この号である。 */
  return sorted.map((x, i) => Object.assign(x, { no: sorted.length - i }));
}
/* 官報の表。年ごとに区切る（年代記）。 */
function gazetteTable(en = false) {
  const items = gazetteItems();
  const years = [...new Set(items.map((x) => x.date.slice(0, 4)))];
  const head = en ? '<th scope="col">Date</th><th scope="col">Issue</th><th scope="col">From</th><th scope="col">Proclamation</th>' : '<th scope="col">日付</th><th scope="col">号</th><th scope="col">もと</th><th scope="col">布告</th>';
  return years.map((y) => {
    const its = items.filter((x) => x.date.startsWith(y));
    return `<h2 id="y${y}">${en ? y + ' (' + its.length + ' issues)' : y + ' 年（' + its.length + ' 号）'}</h2>\n<div class="table"><table><tr>` + head + '</tr>'
      + its.map((x) => `<tr><td>${esc(x.date)}</td><td><a href="gazette/${x.no}${en ? '.en' : ''}.html">${en ? 'No. ' + x.no : '第 ' + x.no + ' 号'}</a></td><td>${esc(en ? x.kindEn : x.kind)}</td><td>${esc(en ? x.textEn : x.text)}</td></tr>`).join('') + '</table></div>';
  }).join('\n');
}
function gazetteAtom() {
  const items = gazetteItems();
  return `<?xml version="1.0" encoding="utf-8"?>\n<feed xmlns="http://www.w3.org/2005/Atom">\n  <title>${esc(NAME)}：官報</title>\n  <subtitle>${esc(NOTICE)}</subtitle>\n  <id>${BASE}gazette.xml</id>\n  <link rel="self" href="${BASE}gazette.xml"/>\n  <link href="${BASE}gazette.html"/>\n  <updated>${(items[0] || { date: '2026-11-07' }).date}T00:00:00+09:00</updated>\n  <author><name>騎士王ネモ一世（創作の中の王）</name></author>\n`
    + items.map((x) => `  <entry>\n    <id>${BASE}gazette.html#g${x.no}</id>\n    <title>${esc('第 ' + x.no + ' 号　' + x.kind + '：' + x.text)}</title>\n    <link href="${BASE}gazette/${x.no}.html"/>\n    <updated>${x.date}T00:00:00+09:00</updated>\n  </entry>\n`).join('') + '</feed>\n';
}
/* 一号ごとの頁の Markdown。 */
function gazetteIssueMd(x, total, en = false) {
  const nav = (k, t) => (k >= 1 && k <= total ? `[${t}](gazette/${k}${en ? '.en' : ''}.html)` : null);
  const pager = [nav(x.no - 1, en ? 'Previous issue' : '前の号'), en ? '[Gazette](GAZETTE.en.md)' : '[官報](GAZETTE.md)', nav(x.no + 1, en ? 'Next issue' : '次の号')].filter(Boolean);
  if (en) return `# Gazette, No. ${x.no}\n\nThis is an English translation. The [Japanese version](gazette/${x.no}.html) governs.\n\n| Item | Entry |\n| --- | --- |\n| Issue | No. ${x.no} |\n| Date | ${x.date} |\n| From | [${x.kindEn}](${x.fromEn}) |\n| Proclamation | ${x.textEn} |\n\n${pager.join(' / ')}\n`;
  return `# 官報 第 ${x.no} 号\n\n| 項目 | 記したこと |\n| --- | --- |\n| 号 | 第 ${x.no} 号 |\n| 日付 | ${x.date} |\n| もと | [${x.kind}](${x.from}) |\n| 布告 | ${x.text} |\n\n${pager.join(' / ')}\n`;
}

/* 紹介する人のための事実と、年ごとの国勢。どれも正誤表・名簿・官報・頁の元から数え、手で書かない。 */
const FOUNDED = '2026-11-07';
function factsTable(en = false) {
  const knights = tableRows('KNIGHTS.md').length, issues = gazetteItems().length;
  const rows = en ? [['Founded', FOUNDED], ['Domain (mistakes in the King\'s errata)', domain() + ''], ['Population (knights of the Ordo Erratorum)', knights + ''], ['Gazette', issues + ' issues'],
    ['Pages (Japanese and English)', SOURCES.length + ''], ['Rules', POLICIES.length + ' (each with an English translation)'], ['Fees', 'None. Titles are not sold and no donations are taken']]
    : [['建国の日', FOUNDED], ['版図（王の正誤表の誤り）', domain() + ' 件'], ['人口（正誤表騎士団の騎士）', knights + ' 人'], ['官報', issues + ' 号'],
      ['頁（日本語と英語）', SOURCES.length + ''], ['規程', POLICIES.length + '（どれにも英語の訳がある）'], ['費用', 'なし。称号を売らず、寄付を受けない']];
  return '<div class="table"><table><tr>' + (en ? '<th scope="col">Fact</th><th scope="col">Value</th>' : '<th scope="col">事柄</th><th scope="col">値</th>') + '</tr>'
    + rows.map(([a, b]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join('') + '</table></div>';
}
function censusTable(en = false) {
  const errata = tableRows('ERRATA.md'), knights = tableRows('KNIGHTS.md'), items = gazetteItems();
  const years = [...new Set([FOUNDED.slice(0, 4)].concat(errata.map((r) => r[1].slice(0, 4)), knights.map((r) => r[2].slice(0, 4)), items.map((x) => x.date.slice(0, 4))))].sort();
  const head = en ? '<th scope="col">Year</th><th scope="col">Mistakes recorded</th><th scope="col">Knights dubbed</th><th scope="col">Gazette issues</th><th scope="col">Population at the end of the year</th>'
    : '<th scope="col">年</th><th scope="col">記した誤り</th><th scope="col">叙任した騎士</th><th scope="col">官報の号</th><th scope="col">年末の人口</th>';
  return '<div class="table"><table><tr>' + head + '</tr>' + years.map((y) => {
    const e = errata.filter((r) => r[1].startsWith(y)).length, k = knights.filter((r) => r[2].startsWith(y)).length, g = items.filter((x) => x.date.startsWith(y)).length;
    const pop = knights.filter((r) => r[2].slice(0, 4) <= y).length;
    return `<tr><td>${y}</td><td>${e}</td><td>${k}</td><td>${g}</td><td>${pop}</td></tr>`;
  }).join('') + '</table></div>';
}

/* 暦の iCalendar（RFC 5545）。暦の表から作る。毎年くり返す終日の記念日で、予定を塞がない（TRANSP:TRANSPARENT）。
 * 行は 75 オクテットで折る。中身が変わらない限り同じファイルになるよう、DTSTAMP は建国の日に固定する。 */
function calendarIcs() {
  const md = fs.readFileSync(path.join(ROOT, 'CALENDAR.md'), 'utf8');
  const rows = md.split('\n').filter((l) => /^\| \d+ 月 \d+ 日 \|/.test(l)).map((l) => l.replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
  const fold = (line) => {
    const out = []; let cur = '';
    for (const ch of line) { if (Buffer.byteLength(cur + ch) > (out.length ? 74 : 75)) { out.push(cur); cur = ''; } cur += ch; }
    out.push(cur);
    return out.map((x, i) => (i ? ' ' : '') + x).join('\r\n');
  };
  const txt = (t) => plainText(t).replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,');
  const events = rows.map(([day, name, why]) => {
    const [, m, d] = /^(\d+) 月 (\d+) 日$/.exec(day);
    const mm = m.padStart(2, '0'), dd = d.padStart(2, '0');
    return ['BEGIN:VEVENT', 'UID:' + mm + dd + '@nusquama.vercel.app', 'DTSTAMP:20261107T000000Z', 'DTSTART;VALUE=DATE:2026' + mm + dd, 'RRULE:FREQ=YEARLY',
      'SUMMARY:' + txt(name + '（ヌスクァマの創作の記念日）'), 'DESCRIPTION:' + txt(why + '。' + NOTICE + ' 実在の祝日ではありません。'), 'TRANSP:TRANSPARENT', 'END:VEVENT'];
  });
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Regnum Nusquamae//Calendar//JA', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:' + txt('ヌスクァマの暦（創作）')].concat(...events, ['END:VCALENDAR']);
  return lines.map(fold).join('\r\n') + '\r\n';
}

function firstParagraph(md) {
  const p = md.split('\n').find((l) => l.trim() && !/^(#|>|\||-|!|\d+\.)/.test(l));
  return (p || '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*`]/g, '').slice(0, 120);
}

/* Markdown の中の印（<!-- map --> など）を、表や図に置き換える。GitHub で読むときは印は見えない。 */
const FILLERS = { map: errataMap, growth: errataGrowth, years: errataYearTable, facts: (en) => factsTable(en), census: (en) => censusTable(en) };
function fill(html, en) {
  return html.replace(/<p>&lt;!-- (\w+) --&gt;<\/p>/g, (m, k) => {
    if (!FILLERS[k]) throw new Error('印 ' + k + ' を置き換えるものがない');
    return FILLERS[k](en);
  });
}

/* opts.md：ファイルではなく、この関数に渡した Markdown から頁を作る（正誤一件・官報一号の頁）。
 * opts.en：英語の頁として作る。opts.twin：対になる頁。リンクの解き方は srcRel の位置による。 */
function page(srcRel, outRel, opts = {}) {
  const md = opts.md || fs.readFileSync(path.join(ROOT, srcRel), 'utf8');
  const h1 = (/^# (.*)$/m.exec(md) || [, NAME])[1];
  const up = path.posix.relative(path.posix.dirname(outRel), '.') ;
  const pre = up ? up + '/' : './';
  const title = outRel === 'index.html' ? NAME : h1 + ' | ' + NAME;
  const url = BASE + (outRel === 'index.html' ? '' : outRel);
  const desc = outRel === 'index.html' ? 'どこにもない国の、誰でもない王。誤りは守り、己を治める。創作であり、遊びです。' : firstParagraph(md.replace(/^# .*$/m, '').replace(/^最終更新.*$/m, '')) || h1;
  const csp = `default-src 'none'; style-src '${STYLE_HASH}'; img-src 'self'; base-uri 'none'; form-action 'none'`;
  const en = opts.md ? !!opts.en : srcRel.endsWith('.en.md');
  const h1of = (rel) => (/^# (.*)$/m.exec(fs.readFileSync(path.join(ROOT, rel), 'utf8')) || [])[1];
  const slug = (/^policies\/(\w+)(?:\.en)?\.md$/.exec(srcRel) || [])[1];
  const root = ROOT_EN.find(([f]) => srcRel === f + '.md' || srcRel === f + '.en.md');
  const twin = opts.md ? opts.twin : slug && EN.includes(slug) ? 'policies/' + slug + (en ? '.html' : '.en.html') : root ? root[1] + (en ? '.html' : '.en.html') : null;
  const links = en
    ? [['index.html', 'Top (Japanese)'], ['founding.en.html', h1of('founding.en.md')]].concat(ROOT_EN.map(([f, h]) => [h + '.en.html', h1of(f + '.en.md')]), EN.map((p) => ['policies/' + p + '.en.html', h1of('policies/' + p + '.en.md')]), twin ? [[twin, '日本語']] : [])
    : [['index.html', 'トップ']].concat(ROOT_EN.map(([, h]) => [h + '.html', SHORT[h]]), POLICIES.map((p) => ['policies/' + p + '.html', h1of('policies/' + p + '.md')]), twin ? [[twin, 'English']] : []);
  const alternate = twin ? `<link rel="alternate" hreflang="${en ? 'ja' : 'en'}" href="${BASE + twin}">\n` : '';
  return `<!doctype html>
<html lang="${en ? 'en' : 'ja'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="google-site-verification" content="${GOOGLE_SITE_VERIFICATION}">
<link rel="canonical" href="${url}">
${alternate}${en ? '' : `<link rel="alternate" type="application/atom+xml" title="王の正誤表" href="${BASE}errata.xml">\n<link rel="alternate" type="application/atom+xml" title="騎士の名簿" href="${BASE}knights.xml">\n`}<link rel="icon" href="${pre}favicon.svg" type="image/svg+xml">
<link rel="icon" href="${pre}favicon.ico" sizes="16x16 32x32 48x48">
<link rel="icon" href="${pre}icon-192.png" sizes="192x192" type="image/png">
<link rel="apple-touch-icon" href="${pre}apple-touch-icon.png">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${en ? 'Regnum Nusquamae' : NAME}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${BASE}og.png">
<meta name="twitter:card" content="summary">
<style>${STYLE}</style>
</head>
<body>
<a class="skip" href="#main">${en ? 'Skip to content' : '本文へ'}</a>
<header><img src="${pre}emblem.svg" alt=""><a class="home" href="${pre}index.html">${NAME}</a></header>
<main id="main">
${outRel === 'index.html' ? '' : `<p class="notice">${esc(en ? NOTICE_EN : NOTICE)}</p>\n`}${fill(markdown(md, srcRel, outRel), en).replace(/(<\/blockquote>)/, outRel === 'index.html' ? '$1\n<p class="notice">' + esc(DOMAIN_LINE()) + ' <a href="errata.html">王の正誤表</a></p>' : '$1')}${outRel === 'errata.html' || outRel === 'knights.html' || outRel === 'gazette.html' ? `\n<p><a href="${outRel.replace('.html', '')}.xml">新着の配信（Atom）</a></p>` : ''}${outRel === 'gazette.html' ? '\n' + gazetteTable() : outRel === 'gazette.en.html' ? '\n' + gazetteTable(true) : ''}
</main>
<footer>
<ul>${links.map(([h, t]) => `<li><a href="${pre}${h}">${esc(t)}</a></li>`).join('')}<li><a href="${REPO}">GitHub</a></li></ul>
${en ? `<p>Text and emblem: CC BY 4.0. This page is generated from ${esc(srcRel)} in the repository. The Japanese version governs.</p>
<p>Written with Claude Code (Anthropic). The operator checked it and is responsible for it. Claude is neither a knight nor a king.</p>` : `<p>文と国章は CC BY 4.0 です。この頁は、リポジトリの ${esc(srcRel)} から生成しています。</p>
<p>Claude Code（Anthropic）で書きました。運営者が確かめ、責任を負います。Claude は騎士でも王でもありません。</p>`}
</footer>
</body>
</html>
`;
}

function notFound() {
  const html = page('README.md', 'index.html');
  const main = '<main id="main">\n<p class="notice">' + esc(NOTICE) + '</p>\n<h1>どこにもない頁</h1>\n<p>この頁はありません。ヌスクァマは、どこにもない国です。</p>\n<p><a href="/">トップへ</a></p>\n</main>';
  return html.replace(/<main id="main">[\s\S]*<\/main>/, main).replace(/<title>[^<]*<\/title>/, '<title>どこにもない頁 | ' + NAME + '</title>')
    .replace(/href="\.\//g, 'href="/').replace(/src="\.\//g, 'src="/').replace(/<link rel="canonical"[^>]*>\n/, '').replace('<meta name="description"', '<meta name="robots" content="noindex">\n<meta name="description"');
}

/* llms.txt と llms-full.txt（llms.txt の提案、https://llmstxt.org/）。言語モデルを通して調べる人に、規程を
 * そのままの言葉で渡す。llms.txt は断りと、願い出ることができる人・費用・称号の扱い・求め方の節（規程から一字一句そのまま）と、
 * すべての頁へのリンク。llms-full.txt は、すべての頁の元の Markdown を一字一句そのまま収める。どちらも手で書かない。 */
const h1 = (rel) => (/^# (.*)$/m.exec(fs.readFileSync(path.join(ROOT, rel), 'utf8')) || [])[1];
function section(rel, heading) {
  const md = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const i = md.indexOf('\n## ' + heading + '\n');
  if (i < 0) throw new Error(rel + ' に「' + heading + '」の節がない');
  const rest = md.slice(i + 1);
  const j = rest.indexOf('\n## ', 1);
  return absLinks((j < 0 ? rest : rest.slice(0, j)).trim(), rel);
}
/* 節の中の相対リンクを、サイトの頁の所在に直す。節だけを取り出しても、リンクが切れないように。 */
function absLinks(md, rel) {
  return md.replace(/\]\(([^)]+)\)/g, (m, href) => {
    if (/^(https?:|mailto:|#)/.test(href)) return m;
    const [p, hash] = href.split('#');
    const abs = path.posix.normalize(path.posix.join(path.posix.dirname(rel), p));
    const hit = SOURCES.find(([src]) => src === abs);
    if (!hit) throw new Error(rel + ' のリンク ' + href + ' がサイトの頁に当たらない');
    return '](' + BASE + (hit[1] === 'index.html' ? '' : hit[1]) + (hash ? '#' + hash : '') + ')';
  });
}
function llmsTxt() {
  const link = (d, t) => '- [' + t + '](' + BASE + (d === 'index.html' ? '' : d) + ')\n';
  return '# ' + NAME + '（Regnum Nusquamae）\n\n> ' + NOTICE + '\n\n'
    + 'English: ' + NOTICE_EN + '\n\n'
    + DOMAIN_LINE() + '\n\n'
    + '規程が決まりです。このファイルと規程が食い違うときは、規程に従います。日本語の版が正で、英語の頁は訳です。すべての頁の全文は [llms-full.txt](' + BASE + 'llms-full.txt) にあります。\n\n'
    + section('policies/knighting.md', '願い出ることができる人') + '\n\n'
    + section('policies/terms.md', '費用') + '\n\n'
    + section('policies/terms.md', '称号の扱い') + '\n\n'
    + section('policies/requests.md', '求め方') + '\n\n'
    + '## 頁\n\n'
    + link('index.html', 'トップ（建国の宣言と基本法）') + ROOT_EN.map(([f, h]) => link(h + '.html', h1(f + '.md'))).join('')
    + '\n## 規程\n\n' + POLICIES.map((x) => link('policies/' + x + '.html', h1('policies/' + x + '.md'))).join('')
    + '\n## English (translations; the Japanese version governs)\n\n' + link('founding.en.html', h1('founding.en.md')) + ROOT_EN.map(([f, h]) => link(h + '.en.html', h1(f + '.en.md'))).join('') + EN.map((x) => link('policies/' + x + '.en.html', h1('policies/' + x + '.en.md'))).join('')
    + '\n## その他\n\n- [サイトの元とすべての履歴](' + REPO + ')\n- [サイトマップ](' + BASE + 'sitemap.xml)\n- [王の正誤表の新着（Atom）](' + BASE + 'errata.xml)\n- [騎士の名簿の新着（Atom）](' + BASE + 'knights.xml)\n- [官報の新着（Atom）](' + BASE + 'gazette.xml)\n- [暦（iCalendar）](' + BASE + 'calendar.ics)\n';
}
function llmsFull() {
  return '# ' + NAME + '：すべての頁の全文\n\n> ' + NOTICE + '\n\n下の各部は、その所在の頁を作る元の Markdown を、一字一句そのまま収めたものです。\n\n'
    + SOURCES.map(([src, dst]) => '---\n\nSource: ' + BASE + (dst === 'index.html' ? '' : dst) + '\n\n' + fs.readFileSync(path.join(ROOT, src), 'utf8').trim() + '\n\n').join('');
}

function build(out = OUT) {
  const files = {};
  for (const [src, dst] of SOURCES) files[dst] = page(src, dst);
  files['404.html'] = notFound();
  files['robots.txt'] = 'User-agent: *\nAllow: /\n\nSitemap: ' + BASE + 'sitemap.xml\n';
  files['errata.xml'] = atom('errata');
  files['knights.xml'] = atom('knights');
  files['gazette.xml'] = gazetteAtom();
  const entries = errataEntries();
  files['territory.svg'] = territorySvg(entries.length, { entries });
  for (const y of errataYears()) {
    const upTo = entries.filter((e) => e.date.slice(0, 4) <= y);
    files['territory-' + y + '.svg'] = territorySvg(upTo.length, { entries: upTo, title: '版図の地図（創作）：' + y + ' 年の終わりの版図。王の正誤表の誤り ' + upTo.length + ' 件の区画' });
  }
  for (const e of entries) {
    files['errata/' + e.n + '.html'] = page('ERRATA.md', 'errata/' + e.n + '.html', { md: errataEntryMd(e, entries.length), twin: 'errata/' + e.n + '.en.html' });
    files['errata/' + e.n + '.en.html'] = page('ERRATA.en.md', 'errata/' + e.n + '.en.html', { md: errataEntryMd(e, entries.length, true), en: true, twin: 'errata/' + e.n + '.html' });
  }
  const issues = gazetteItems();
  for (const x of issues) {
    files['gazette/' + x.no + '.html'] = page('GAZETTE.md', 'gazette/' + x.no + '.html', { md: gazetteIssueMd(x, issues.length), twin: 'gazette/' + x.no + '.en.html' });
    files['gazette/' + x.no + '.en.html'] = page('GAZETTE.en.md', 'gazette/' + x.no + '.en.html', { md: gazetteIssueMd(x, issues.length, true), en: true, twin: 'gazette/' + x.no + '.html' });
  }
  files['calendar.ics'] = calendarIcs();
  files['llms.txt'] = llmsTxt();
  files['llms-full.txt'] = llmsFull();
  files['sitemap.xml'] = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + SOURCES.map(([, d]) => d).concat(Object.keys(files).filter((f) => /^(errata|gazette)\/\d+(\.en)?\.html$/.test(f)).sort((a, b) => a.localeCompare(b, 'en', { numeric: true })))
      .map((d) => '  <url><loc>' + BASE + (d === 'index.html' ? '' : d) + '</loc></url>').join('\n') + '\n</urlset>\n';
  /* 配信するのは main だけ。無料の枠はアカウント全体で一日 100 回で、2026-11-08 に作業の枝の配信で使い切り、
   * main を配信できなかった。枝が複数の決まりに当たるときは、どれか一つが許せば配信される。 */
  /* llms の二つは日本語を含む文字の文書。読む側が文字コードを取り違えないよう、UTF-8 と示す。 */
  const text = { source: '/(llms|llms-full)\\.txt', headers: [{ key: 'Content-Type', value: 'text/plain; charset=utf-8' }] };
  const ics = { source: '/calendar.ics', headers: [{ key: 'Content-Type', value: 'text/calendar; charset=utf-8' }] };
  files['vercel.json'] = JSON.stringify({ headers: HEADERS.concat([text, ics]), git: { deploymentEnabled: { '**': false, main: true } } }, null, 2) + '\n';
  for (const a of ASSETS) files[a] = fs.readFileSync(path.join(ROOT, 'assets', a));
  fs.rmSync(out, { recursive: true, force: true });
  for (const [rel, content] of Object.entries(files)) {
    const f = path.join(out, rel);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, content);
  }
  return Object.keys(files).length;
}

module.exports = { KINDS, roman, errataEntries, errataYears, calendarIcs, factsTable, censusTable, gazetteIssueMd, errataEntryMd, FOUNDED, SHORT, ROOT_EN, territorySvg, gazetteItems, timelineRows, DRAWN, tableRows, domain, DOMAIN_LINE, atom, GOOGLE_SITE_VERIFICATION, build, llmsTxt, llmsFull, section, SOURCES, POLICIES, EN, ASSETS, NOTICE, NOTICE_EN, HEADERS, STYLE_HASH, BASE, REPO };

if (require.main === module) {
  const out = process.argv[2] ? path.resolve(process.argv[2]) : OUT;
  console.log('生成しました: ' + path.relative(ROOT, out) + '/ (' + build(out) + ' ファイル)');
}

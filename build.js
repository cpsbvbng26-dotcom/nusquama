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
const POLICIES = ['terms', 'disclaimer', 'privacy', 'knighting', 'requests', 'names', 'legality'];
const SOURCES = [['README.md', 'index.html'], ['KNIGHTS.md', 'knights.html'], ['ERRATA.md', 'errata.html']]
  .concat(POLICIES.map((p) => ['policies/' + p + '.md', 'policies/' + p + '.html']));
const ASSETS = ['emblem.svg', 'favicon.svg', 'favicon.ico', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'og.png'];

/* どの頁にも先頭に出す断り。README の冒頭と同じ内容である。 */
const NOTICE = 'これは創作であり、遊びです。ヌスクァマは国家ではなく、いかなる実在の国家・王室・騎士団・叙勲・称号とも関係がありません。ここで授ける称号に、法的な効力はありません。';

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
footer { border-top: 1px solid var(--line); padding-top: 16px; padding-bottom: 40px; font-size: 14px; color: var(--muted); }
footer ul { list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: 4px 16px; }
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
      const paras = block.join('\n').split(/\n\s*\n/).map((p) => '<p>' + p.split('\n').map(il).join('') + '</p>');
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
    out.push('<p>' + para.map(il).join('') + '</p>');
  }
  return out.join('\n');
}

function firstParagraph(md) {
  const p = md.split('\n').find((l) => l.trim() && !/^(#|>|\||-|!|\d+\.)/.test(l));
  return (p || '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*`]/g, '').slice(0, 120);
}

function page(srcRel, outRel) {
  const md = fs.readFileSync(path.join(ROOT, srcRel), 'utf8');
  const h1 = (/^# (.*)$/m.exec(md) || [, NAME])[1];
  const up = path.posix.relative(path.posix.dirname(outRel), '.') ;
  const pre = up ? up + '/' : './';
  const title = outRel === 'index.html' ? NAME : h1 + ' | ' + NAME;
  const url = BASE + (outRel === 'index.html' ? '' : outRel);
  const desc = outRel === 'index.html' ? 'どこにもない国の、誰でもない王。誤りは守り、己を治める。創作であり、遊びです。' : firstParagraph(md.replace(/^# .*$/m, '').replace(/^最終更新.*$/m, '')) || h1;
  const csp = `default-src 'none'; style-src '${STYLE_HASH}'; img-src 'self'; base-uri 'none'; form-action 'none'`;
  const links = [['index.html', 'トップ'], ['knights.html', '騎士の名簿'], ['errata.html', '王の正誤表']].concat(POLICIES.map((p) => ['policies/' + p + '.html', (/^# (.*)$/m.exec(fs.readFileSync(path.join(ROOT, 'policies', p + '.md'), 'utf8')) || [])[1]]));
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="google-site-verification" content="${GOOGLE_SITE_VERIFICATION}">
<link rel="canonical" href="${url}">
<link rel="icon" href="${pre}favicon.svg" type="image/svg+xml">
<link rel="icon" href="${pre}favicon.ico" sizes="16x16 32x32 48x48">
<link rel="apple-touch-icon" href="${pre}apple-touch-icon.png">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${BASE}og.png">
<meta name="twitter:card" content="summary">
<style>${STYLE}</style>
</head>
<body>
<a class="skip" href="#main">本文へ</a>
<header><img src="${pre}emblem.svg" alt=""><a class="home" href="${pre}index.html">${NAME}</a></header>
<main id="main">
${outRel === 'index.html' ? '' : `<p class="notice">${esc(NOTICE)}</p>\n`}${markdown(md, srcRel, outRel)}
</main>
<footer>
<ul>${links.map(([h, t]) => `<li><a href="${pre}${h}">${esc(t)}</a></li>`).join('')}<li><a href="${REPO}">GitHub</a></li></ul>
<p>文と国章は CC BY 4.0 です。この頁は、リポジトリの ${esc(srcRel)} から生成しています。</p>
<p>Claude Code（Anthropic）で書きました。運営者が確かめ、責任を負います。Claude は騎士でも王でもありません。</p>
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

function build(out = OUT) {
  const files = {};
  for (const [src, dst] of SOURCES) files[dst] = page(src, dst);
  files['404.html'] = notFound();
  files['robots.txt'] = 'User-agent: *\nAllow: /\n\nSitemap: ' + BASE + 'sitemap.xml\n';
  files['sitemap.xml'] = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + SOURCES.map(([, d]) => '  <url><loc>' + BASE + (d === 'index.html' ? '' : d) + '</loc></url>').join('\n') + '\n</urlset>\n';
  files['vercel.json'] = JSON.stringify({ headers: HEADERS }, null, 2) + '\n';
  for (const a of ASSETS) files[a] = fs.readFileSync(path.join(ROOT, 'assets', a));
  fs.rmSync(out, { recursive: true, force: true });
  for (const [rel, content] of Object.entries(files)) {
    const f = path.join(out, rel);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, content);
  }
  return Object.keys(files).length;
}

module.exports = { GOOGLE_SITE_VERIFICATION, build, SOURCES, POLICIES, ASSETS, NOTICE, HEADERS, STYLE_HASH, BASE, REPO };

if (require.main === module) {
  const out = process.argv[2] ? path.resolve(process.argv[2]) : OUT;
  console.log('生成しました: ' + path.relative(ROOT, out) + '/ (' + build(out) + ' ファイル)');
}

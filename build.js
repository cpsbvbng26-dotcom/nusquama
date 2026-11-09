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
/* 英語の訳がある規程。日本語の版を正とする。 */
const EN = ['terms', 'disclaimer', 'legality'];
const SOURCES = [['README.md', 'index.html'], ['KNIGHTS.md', 'knights.html'], ['ERRATA.md', 'errata.html']]
  .concat(POLICIES.map((p) => ['policies/' + p + '.md', 'policies/' + p + '.html']))
  .concat(EN.map((p) => ['policies/' + p + '.en.md', 'policies/' + p + '.en.html']));
const ASSETS = ['emblem.svg', 'favicon.svg', 'favicon.ico', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'og.png'];

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
  const en = srcRel.endsWith('.en.md');
  const h1of = (rel) => (/^# (.*)$/m.exec(fs.readFileSync(path.join(ROOT, rel), 'utf8')) || [])[1];
  const slug = (/^policies\/(\w+)(?:\.en)?\.md$/.exec(srcRel) || [])[1];
  const twin = slug && EN.includes(slug) ? 'policies/' + slug + (en ? '.html' : '.en.html') : null;
  const links = en
    ? [['index.html', 'Top (Japanese)']].concat(EN.map((p) => ['policies/' + p + '.en.html', h1of('policies/' + p + '.en.md')]), [[twin, '日本語']])
    : [['index.html', 'トップ'], ['knights.html', '騎士の名簿'], ['errata.html', '王の正誤表']].concat(POLICIES.map((p) => ['policies/' + p + '.html', h1of('policies/' + p + '.md')]), twin ? [[twin, 'English']] : []);
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
${outRel === 'index.html' ? '' : `<p class="notice">${esc(en ? NOTICE_EN : NOTICE)}</p>\n`}${markdown(md, srcRel, outRel).replace(/(<\/blockquote>)/, outRel === 'index.html' ? '$1\n<p class="notice">' + esc(DOMAIN_LINE()) + ' <a href="errata.html">王の正誤表</a></p>' : '$1')}${outRel === 'errata.html' || outRel === 'knights.html' ? `\n<p><a href="${outRel === 'errata.html' ? 'errata' : 'knights'}.xml">新着の配信（Atom）</a></p>` : ''}
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
    + link('index.html', 'トップ（建国の宣言と基本法）') + link('knights.html', h1('KNIGHTS.md') || '騎士の名簿') + link('errata.html', h1('ERRATA.md') || '王の正誤表')
    + '\n## 規程\n\n' + POLICIES.map((x) => link('policies/' + x + '.html', h1('policies/' + x + '.md'))).join('')
    + '\n## English (translations; the Japanese version governs)\n\n' + EN.map((x) => link('policies/' + x + '.en.html', h1('policies/' + x + '.en.md'))).join('')
    + '\n## その他\n\n- [サイトの元とすべての履歴](' + REPO + ')\n- [サイトマップ](' + BASE + 'sitemap.xml)\n- [王の正誤表の新着（Atom）](' + BASE + 'errata.xml)\n- [騎士の名簿の新着（Atom）](' + BASE + 'knights.xml)\n';
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
  files['llms.txt'] = llmsTxt();
  files['llms-full.txt'] = llmsFull();
  files['sitemap.xml'] = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + SOURCES.map(([, d]) => '  <url><loc>' + BASE + (d === 'index.html' ? '' : d) + '</loc></url>').join('\n') + '\n</urlset>\n';
  /* 配信するのは main だけ。無料の枠はアカウント全体で一日 100 回で、2026-11-08 に作業の枝の配信で使い切り、
   * main を配信できなかった。枝が複数の決まりに当たるときは、どれか一つが許せば配信される。 */
  /* llms の二つは日本語を含む文字の文書。読む側が文字コードを取り違えないよう、UTF-8 と示す。 */
  const text = { source: '/(llms|llms-full)\\.txt', headers: [{ key: 'Content-Type', value: 'text/plain; charset=utf-8' }] };
  files['vercel.json'] = JSON.stringify({ headers: HEADERS.concat([text]), git: { deploymentEnabled: { '**': false, main: true } } }, null, 2) + '\n';
  for (const a of ASSETS) files[a] = fs.readFileSync(path.join(ROOT, 'assets', a));
  fs.rmSync(out, { recursive: true, force: true });
  for (const [rel, content] of Object.entries(files)) {
    const f = path.join(out, rel);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, content);
  }
  return Object.keys(files).length;
}

module.exports = { tableRows, domain, DOMAIN_LINE, atom, GOOGLE_SITE_VERIFICATION, build, llmsTxt, llmsFull, section, SOURCES, POLICIES, EN, ASSETS, NOTICE, NOTICE_EN, HEADERS, STYLE_HASH, BASE, REPO };

if (require.main === module) {
  const out = process.argv[2] ? path.resolve(process.argv[2]) : OUT;
  console.log('生成しました: ' + path.relative(ROOT, out) + '/ (' + build(out) + ' ファイル)');
}

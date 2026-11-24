#!/usr/bin/env node
/* Internet Archive の Save Page Now に、サイトの頁の写しを頼み、その日の写しがあることを確かめる。
 *
 *   node tools/wayback.js            # 頼む（.github/workflows/wayback.yml が、手で起こしたときだけ走らせる）
 *   node tools/wayback.js --dry-run  # 頼まずに、頼む頁と外す頁と理由を出す
 *   OFFSET=<n> LIMIT=<n>             # 頼む頁の並びの n 番目から n 件だけ（並びは site/sitemap.xml の順）
 *
 * 写しは、こちらから消せない。だから、頼む頁を許す側で決める（tools/wayback.json）。
 * - read：運営者の側で全文を読み、ほかの人の個人データも、求めで外せる記載もないと確かめた頁と、そのときの見える文の SHA-256。
 *   文が変わった頁は、読み直して値を改めるまで頼まない。
 * - exclude：読んで、頼まないと決めた頁と理由。騎士の名簿（辞退で名を外す頁）と、存命かもしれない個人の名を挙げる頁。
 * - names：見える文に一つでもあれば頼まない名。
 * read にあっても、次のどれかに当たる頁は頼まない：サイトマップに無い、robots.txt が閉じる、exclude にある、
 * 名簿の騎士の欄の名・names の名・運営者のほかの GitHub のアカウントへのリンク・メールアドレスの形を、見える文かリンクに持つ。
 * Save Page Now は、名を名乗らない求めを詰めると 429 で断る。断られたら 60 秒、180 秒と待って頼み直し、一件ごとに 20 秒あける。
 * 一度の実行は 40 分で新しい頁を頼むのをやめ、次の OFFSET を出す。終わりに、見えなかった頁を三度見直す（一度は頼み直す）。検査 98 が形を見る。 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const SITE = path.join(ROOT, 'site');
const BASE = 'https://nusquama.vercel.app/';
const SAVE = 'https://web.archive.org/save/';
const AVAILABLE = 'https://archive.org/wayback/available';
const OWNER = 'cpsbvbng26-dotcom';
const CONF = JSON.parse(fs.readFileSync(path.join(__dirname, 'wayback.json'), 'utf8'));
const BACKOFF_S = [0, 60, 180];
const GAP_S = 20;
const BUDGET_MIN = 40;
/* 写しが見えるまでには、頼んでから数分かかることがある。終わりに、見えなかった頁を 1 分・2 分・3 分あけて三度見直し、二度目の前に一度だけ頼み直す。 */
const RECHECK_S = [60, 120, 180];

/* 頁の見える文：style と head と札を除き、空白を一つにつめる。read の SHA-256 はこの文から取る。 */
function text(html) {
  return String(html).replace(/<style[\s\S]*?<\/style>/g, '').replace(/<head>[\s\S]*?<\/head>/, '').replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
}
const sha = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');

/* 名簿の騎士の欄の名（日本語と英語の名簿）。辞退した行は「辞退（日付）」になり、名は残らない。 */
function knights(root = ROOT) {
  return ['KNIGHTS.md', 'KNIGHTS.en.md'].flatMap((f) => {
    const t = fs.readFileSync(path.join(root, f), 'utf8');
    const head = t.split('\n').findIndex((l) => /^\| (番|No\.) \|/.test(l));
    if (head < 0) return [];
    return t.split('\n').slice(head + 2).filter((l) => l.startsWith('| ')).map((l) => l.split(' | ')[1]).filter((n) => n && !/^(辞退|Withdrawn)/.test(n));
  });
}

/* robots.txt の User-agent: * の Disallow。 */
function disallowed(robots) {
  const out = [];
  let star = false;
  for (const l of String(robots).split('\n')) {
    const m = /^\s*([A-Za-z-]+)\s*:\s*(.*?)\s*$/.exec(l);
    if (!m) continue;
    if (/^user-agent$/i.test(m[1])) star = m[2] === '*';
    else if (star && /^disallow$/i.test(m[1]) && m[2]) out.push(m[2]);
  }
  return out;
}

/* 頁ごとに、頼むか、頼まないならその理由。 */
function plan(x) {
  const locs = [...x.sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const shut = disallowed(x.robots);
  const names = (x.conf.names || []).concat(x.knights);
  return locs.map((u) => {
    const f = u.slice(BASE.length) || 'index.html';
    const why = [];
    if (!u.startsWith(BASE)) why.push('このサイトの外');
    if (shut.some((p) => ('/' + (u.slice(BASE.length))).startsWith(p))) why.push('robots.txt が閉じる');
    if ((x.conf.exclude || {})[f]) why.push('外すと決めた：' + x.conf.exclude[f]);
    const html = x.pages[f];
    if (html == null) why.push('ファイルが無い');
    else {
      const t = text(html);
      if (!(f in (x.conf.read || {}))) why.push('全文を読んで確かめていない');
      else if (x.conf.read[f] !== sha(t)) why.push('読んだときから文が変わった');
      const hit = names.filter((n) => t.includes(n) || html.includes(n));
      if (hit.length) why.push('人の名を持つ：' + hit.join('、'));
      if (new RegExp('github\\.com/(?!' + OWNER + '\\b|en\\b)[A-Za-z0-9-]+', 'i').test(html)) why.push('ほかの GitHub のアカウントを指す');
      if (/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/.test(t)) why.push('メールアドレスの形を持つ');
    }
    return { url: u, file: f, why };
  });
}

function real() {
  const sitemap = fs.readFileSync(path.join(SITE, 'sitemap.xml'), 'utf8');
  const pages = {};
  for (const m of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const f = m[1].slice(BASE.length) || 'index.html';
    const p = path.join(SITE, f);
    pages[f] = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
  }
  return { sitemap, robots: fs.readFileSync(path.join(SITE, 'robots.txt'), 'utf8'), conf: CONF, knights: knights(), pages };
}

const pause = (s) => new Promise((ok) => setTimeout(ok, s * 1000));

async function get(url, s) {
  return fetch(url, { headers: { 'User-Agent': 'nusquama wayback workflow' }, signal: AbortSignal.timeout(s * 1000), redirect: 'follow' });
}

/* その日（協定世界時）の写しがあれば、その所在。 */
async function snapshot(u, day) {
  try {
    const r = await get(AVAILABLE + '?timestamp=' + day + '&url=' + encodeURIComponent(u), 60);
    const c = ((await r.json()).archived_snapshots || {}).closest;
    return c && c.available && String(c.timestamp).startsWith(day) ? c.url : null;
  } catch (e) {
    return null;
  }
}

async function run() {
  const all = plan(real());
  const go = all.filter((p) => !p.why.length);
  const off = Number(process.env.OFFSET || 0), lim = Number(process.env.LIMIT || go.length);
  if (!Number.isInteger(off) || off < 0 || !Number.isInteger(lim) || lim < 1) throw new Error('OFFSET は 0 以上、LIMIT は 1 以上の整数');
  const batch = go.slice(off, off + lim);
  console.log('サイトマップの頁 ' + all.length + '、頼める頁 ' + go.length + '、今回 ' + off + ' 番目から ' + batch.length + ' 件');
  for (const p of all.filter((y) => y.why.length)) console.log('  外す ' + p.file + '：' + p.why.join(' / '));
  batch.forEach((p) => console.log('  頼む ' + p.url));
  if (process.argv.includes('--dry-run')) return;
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const start = Date.now(), done = [], missing = [];
  let next = off;
  const save = async (u) => {
    let code = '答えなし';
    for (const w of BACKOFF_S) {
      await pause(w);
      const r = await get(SAVE + u, 120).catch(() => null);
      code = r ? 'HTTP ' + r.status : '答えなし';
      if (!r || r.status !== 429) break;
    }
    return code;
  };
  let wait = [];
  for (const p of batch) {
    if (Date.now() - start > BUDGET_MIN * 60000) break;
    const code = await save(p.url);
    await pause(GAP_S);
    const s = await snapshot(p.url, day);
    (s ? done : wait).push([p.url, s]);
    console.log((s ? '残った   ' : 'まだ見えない ') + p.url + '（頼んだ答え ' + code + '）');
    next++;
  }
  for (let i = 0; i < RECHECK_S.length && wait.length; i++) {
    await pause(RECHECK_S[i]);
    const still = [];
    for (const [u] of wait) {
      if (i === 1) console.log('頼み直す ' + u + '（答え ' + (await save(u)) + '）');
      const s = await snapshot(u, day);
      (s ? done : still).push([u, s]);
      if (s) console.log('残った（見直し ' + (i + 1) + ' 度目） ' + u);
    }
    wait = still;
  }
  missing.push(...wait);
  const left = off + batch.length - next;
  const lines = ['残ったもの ' + done.length + ' / 頼んだもの ' + (done.length + missing.length) + '（頼める頁 ' + go.length + '、今回の範囲 ' + off + ' 番目から ' + batch.length + ' 件）', ''];
  for (const [u, s] of done) lines.push('- ' + u + '\n  ' + s);
  if (missing.length) lines.push('', '今日の写しが見えなかったもの（取り込みが遅れているだけのこともある）', '', ...missing.map(([u]) => '- ' + u));
  if (left > 0 || next < go.length) lines.push('', '続きは OFFSET=' + next + ' から（頼める頁は ' + go.length + '）');
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n') + '\n');
  console.log(lines.join('\n'));
  /* 今日の写しが見えないものが一つでもあれば落とす。成功に見せないため。横断の見張りが最後の実行を見る。 */
  if (missing.length) throw new Error('今日の写しが見えないもの ' + missing.length + ' / 頼んだもの ' + (done.length + missing.length));
}

if (require.main === module) run().catch((e) => { console.error(e.message); process.exit(1); });

module.exports = { BASE, SAVE, AVAILABLE, BACKOFF_S, GAP_S, BUDGET_MIN, RECHECK_S, text, sha, knights, disallowed, plan, real };

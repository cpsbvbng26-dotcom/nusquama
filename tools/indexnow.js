#!/usr/bin/env node
/* IndexNow に、変わった頁と消えた頁を知らせる。cpsbvbng26-dotcom の verification/indexnow.js と同じ形の、小さい道具。
 *
 *   node tools/indexnow.js            # BEFORE の site/sitemap.xml と比べて、変わった頁と消えた頁を送る
 *   node tools/indexnow.js --dry-run  # 送らずに、送るものを出す
 *   BEFORE=<コミット>                  # 比べる相手（push の前の先）。無いか 0 だけなら、すべての頁を送る
 *   ALL=yes                           # サイトマップのすべての頁を送る
 *
 * 鍵は build.js の INDEXNOW_KEY で、build.js が site/<鍵>.txt に中身も鍵そのものとして書き出す（IndexNow の決まり）。鍵は秘密ではない。
 * Google は IndexNow を読まない。robots.txt が名指すサイトマップを読む。
 * 配備が済むまで待ってから送る。配っているサイトマップがこのコミットのものになり、鍵のファイルが読めるまで、最大 10 分待つ。
 * .github/workflows/indexnow.yml が、site/sitemap.xml を変えた main への push のあとに走らせる。検査 97 が形を確かめる。 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SITE = path.join(ROOT, 'site');
const BASE = 'https://nusquama.vercel.app/';
const ENDPOINT = 'https://api.indexnow.org/indexnow';
/* IndexNow は一度に 10,000 件まで受ける。超えれば分けて送る。 */
const MAX = 10000;
const WAITS = 20;
const GAP_MS = 30 * 1000;

/* 鍵：site/ の根にある、32 桁の 16 進の名の .txt。中身が名と同じものだけを鍵と読む。 */
function key(dir = SITE) {
  const k = fs.readdirSync(dir).map((f) => /^([0-9a-f]{32})\.txt$/.exec(f)).filter(Boolean).map((m) => m[1]);
  return k.length === 1 && fs.readFileSync(path.join(dir, k[0] + '.txt'), 'utf8') === k[0] ? k[0] : null;
}

const entries = (xml) => new Map([...String(xml || '').matchAll(/<loc>([^<]+)<\/loc>\s*(?:<lastmod>([^<]+)<\/lastmod>)?/g)].map((m) => [m[1], m[2] || '']));

/* 送る頁：ALL ならすべて。そうでなければ、新しい頁と日付の変わった頁に、消えた頁を足す。 */
function urls(now, was, all) {
  const a = entries(now), b = entries(was);
  return [...a].filter(([u, d]) => all || b.get(u) !== d).map(([u]) => u).concat(all ? [] : [...b.keys()].filter((u) => !a.has(u)));
}

/* IndexNow の求める形。MAX 件ずつに分ける。 */
function requests(list, k) {
  const out = [];
  for (let i = 0; i < list.length; i += MAX) out.push({ host: new URL(BASE).host, key: k, keyLocation: BASE + k + '.txt', urlList: list.slice(i, i + MAX) });
  return out;
}

function before(at) {
  try { return execFileSync('git', ['show', at + ':site/sitemap.xml'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch (e) { return ''; }
}

async function text(url) {
  const r = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(20000) }).catch(() => null);
  return r && r.ok ? r.text() : null;
}

async function run() {
  const k = key();
  if (!k) throw new Error('site/ に鍵のファイルが無いか、中身が鍵と違う');
  const now = fs.readFileSync(path.join(SITE, 'sitemap.xml'), 'utf8');
  const at = process.env.BEFORE || '';
  if (at && !/^[0-9a-f]{7,40}$/.test(at)) throw new Error('BEFORE はコミットの値で渡す');
  const all = process.env.ALL === 'yes' || !at || /^0+$/.test(at);
  const list = urls(now, all ? '' : before(at), all);
  console.log((all ? 'すべての頁' : at.slice(0, 7) + ' から変わった頁と消えた頁') + '：' + list.length + ' 件');
  list.forEach((u) => console.log('  ' + u));
  if (process.argv.includes('--dry-run') || !list.length) return;
  let live = false;
  for (let i = 0; i < WAITS && !live; i++) {
    if (i) await new Promise((ok) => setTimeout(ok, GAP_MS));
    live = (await text(BASE + 'sitemap.xml')) === now && (await text(BASE + k + '.txt')) === k;
  }
  if (!live) throw new Error('10 分待っても、配っているサイトマップか鍵のファイルが、このコミットのものにならない。何も送っていない');
  for (const body of requests(list, k)) {
    const r = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(body) });
    console.log('IndexNow の答え：HTTP ' + r.status + '（' + body.urlList.length + ' 件）');
    if (r.status !== 200 && r.status !== 202) throw new Error('IndexNow が受け取らなかった：' + (await r.text()).slice(0, 300));
  }
}

if (require.main === module) run().catch((e) => { console.error(e.message); process.exit(1); });

module.exports = { BASE, ENDPOINT, MAX, key, entries, urls, requests };

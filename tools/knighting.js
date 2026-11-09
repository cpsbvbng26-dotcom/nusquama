#!/usr/bin/env node
/* 叙任の願い出の issue を確かめ、結果をコメントする。叙任を決めるのは運営者であり、この確認は何も決めない。
 *
 * GitHub Actions（.github/workflows/knighting.yml）で動く：
 *   ISSUE_NUMBER, ISSUE_BODY, ISSUE_CREATED_AT, GITHUB_TOKEN, GITHUB_REPOSITORY
 *
 * 確かめるのは四つだけ：
 *   - 様式の誓いのうち、必ず印を付けるものすべてに印があること
 *   - 2026-11-22 から（日本時間で issue を開いた日）、日本に住み、いま日本にいる印があること
 *   - 訂正へのリンクが https で、開けること（応答の状態だけを見る。中身は読まず、残さない）
 *   - 何を誤り、どう正したかが書かれていること
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MARK = '<!-- nusquama-knighting -->';
const PRESENCE_FROM = '2026-11-22';
const PRESENCE = '日本に住んでいて、いま日本にいます';

/* 純：様式の定義から、必ず印を付ける誓いの文を取り出す。 */
function requiredOaths(yml = fs.readFileSync(path.join(ROOT, '.github', 'ISSUE_TEMPLATE', 'knighting.yml'), 'utf8')) {
  const out = [];
  const re = /- label: (.+)\n\s+required: (true|false)/g;
  let m;
  while ((m = re.exec(yml))) if (m[2] === 'true') out.push(m[1].trim());
  return out;
}

/* 純：GitHub が様式を issue に書いた形（### 見出し、空行、答え）を読む。 */
function parse(body) {
  const out = {};
  const parts = String(body || '').replace(/\r\n/g, '\n').split(/^### /m).slice(1);
  for (const p of parts) {
    const nl = p.indexOf('\n');
    out[p.slice(0, nl).trim()] = p.slice(nl + 1).trim();
  }
  return out;
}

const jstDay = (t) => new Date(Date.parse(t) + 9 * 3600 * 1000).toISOString().slice(0, 10);

/* 純：確かめた結果の行。linkStatus は訂正へのリンクの応答の状態（数）か、開けなかったときは null。 */
function check(form, opened, linkStatus, oaths = requiredOaths()) {
  const rows = [];
  const add = (label, pass, detail) => rows.push([label, !!pass, detail || '']);
  const oath = form['誓い'] || '';
  const ticked = (label) => oath.split('\n').some((l) => /^- \[[xX]\] /.test(l) && l.replace(/^- \[[xX]\] /, '').trim() === label);
  const missing = oaths.filter((o) => !ticked(o));
  add('必ず印を付ける誓いのすべてに印がある', missing.length === 0, missing.length ? missing.length + ' 件に印がない' : oaths.length + ' 件');
  if (jstDay(opened) >= PRESENCE_FROM) {
    const here = oath.split('\n').some((l) => /^- \[[xX]\] /.test(l) && l.includes(PRESENCE));
    add('日本に住み、いま日本にいる印がある', here, here ? '' : PRESENCE_FROM + ' から、この印のない願い出は受けません');
  }
  const link = (form['訂正への公開のリンク'] || '').trim();
  const https = /^https:\/\/[^\s]+$/.test(link);
  add('訂正へのリンクが https で、開ける', https && linkStatus !== null && linkStatus < 400,
    !https ? 'https で始まるリンクではない' : linkStatus === null ? '開けなかった' : '応答 ' + linkStatus);
  const what = (form['何を誤り、どう正したか'] || '').trim();
  add('何を誤り、どう正したかが書かれている', what.length >= 10 && what !== '_No response_');
  return { ok: rows.every((r) => r[1]), rows };
}

/* 純：コメントの本文。 */
function comment(result) {
  const rows = result.rows.map(([label, pass, detail]) => `| ${pass ? '通' : '**不**'} | ${label} | ${String(detail).replace(/[|<>`]/g, '')} |`).join('\n');
  return `${MARK}
**自動の確認**（この issue を直すたびに、もう一度動きます）

| | 確かめたこと | 詳しく |
| --- | --- | --- |
${rows}

${result.ok ? '様式は整っています。' : '通らなかったところを直し、この issue を編集してください。'}
この確認は何も決めません。叙任を決めるのは運営者です。運営者は、リンク先が願い出た人自身の誤りの訂正であると読めるかを確かめます（叙任の規程「運営者が確かめること」）。
これは創作であり、遊びです。称号に法的な効力はありません。
`;
}

/* 訂正へのリンクを一度開き、応答の状態だけを見る。中身は読まず、残さない。 */
async function status(url) {
  const opts = { redirect: 'follow', signal: AbortSignal.timeout(15000), headers: { 'User-Agent': 'nusquama-knighting (https://github.com/cpsbvbng26-dotcom/nusquama)' } };
  try {
    let r = await fetch(url, Object.assign({ method: 'HEAD' }, opts));
    if (r.status === 405 || r.status === 403) { r = await fetch(url, Object.assign({ method: 'GET' }, opts)); if (r.body) await r.body.cancel(); }
    return r.status;
  } catch (e) { return null; }
}

async function github(method, p, body) {
  const r = await fetch('https://api.github.com/repos/' + process.env.GITHUB_REPOSITORY + p, {
    method, headers: { Authorization: 'Bearer ' + process.env.GITHUB_TOKEN, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json', 'User-Agent': 'nusquama-knighting' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(method + ' ' + p + ': HTTP ' + r.status);
  return r.status === 204 ? null : r.json();
}

async function main() {
  const n = process.env.ISSUE_NUMBER;
  const form = parse(process.env.ISSUE_BODY);
  const link = (form['訂正への公開のリンク'] || '').trim();
  const result = check(form, process.env.ISSUE_CREATED_AT || new Date().toISOString(), /^https:\/\/[^\s]+$/.test(link) ? await status(link) : null);
  const body = comment(result);
  const mine = ((await github('GET', '/issues/' + n + '/comments?per_page=100')) || []).find((c) => c.user.type === 'Bot' && c.body.startsWith(MARK));
  if (mine) await github('PATCH', '/issues/comments/' + mine.id, { body });
  else await github('POST', '/issues/' + n + '/comments', { body });
  console.log(result.ok ? '整っている' : '整っていない');
}

module.exports = { MARK, PRESENCE_FROM, PRESENCE, requiredOaths, parse, check, comment, jstDay };

if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });

#!/usr/bin/env node
/* 叙任の願い出の issue を確かめ、結果をコメントする。叙任を決めるのは運営者であり、この確認は何も決めない。
 *
 * GitHub Actions（.github/workflows/knighting.yml）で動く：
 *   ISSUE_NUMBER, ISSUE_BODY, ISSUE_CREATED_AT, GITHUB_TOKEN, GITHUB_REPOSITORY
 *
 * 確かめるのは六つだけ：
 *   - 様式の誓いのうち、必ず印を付けるものすべてに印があること
 *   - 2026-11-22 から（日本時間で issue を開いた日）、日本に住み、いま日本にいる印があること
 *   - 2026-11-22 から、イタリアの国籍を持っていない印があること（ほかの国籍と重ねて持つ場合も含む）
 *   - 2026-11-22 から、称号を遊びとして扱い、規程の禁じる使い方をしない印（良識の前提）があること
 *   - 訂正へのリンクが https で、開けること（応答の状態だけを見る。中身は読まず、残さない）
 *   - 何を誤り、どう正したかが書かれていること
 *
 * 受付の停止（2026-11-12 に利用者が決めた）：2026-11-12 から 2026-11-22 0 時（日本時間）より前に開かれた願い出は、
 * 上の確認をせずに、受付を止めていることをコメントし、issue を閉じる。日付だけで決まり、人の手を待たない。
 * 2026-11-22 0 時からは、ひとりでに受付に戻り、その日から求める印（日本にいる・イタリアの国籍・良識の前提）で確かめる。
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MARK = '<!-- nusquama-knighting -->';
const PRESENCE_FROM = '2026-11-22';
const PRESENCE = '日本に住んでいて、いま日本にいます';
const NATIONALITY_FROM = '2026-11-22';
const NATIONALITY = 'イタリアの国籍を持っていません';
const PREMISE_FROM = '2026-11-22';
const PREMISE = '称号を遊びとして扱い、規程の禁じる使い方をしません';
const PAUSE_FROM = '2026-11-12T00:00:00+09:00';
const PAUSE_UNTIL = '2026-11-22T00:00:00+09:00';
const PAUSE_TEXT = '2026-11-12 から 2026-11-22 0 時（日本時間）より前は、叙任の願い出の受付を止めています（叙任の規程「受付の停止」）。この願い出は受けず、この issue を閉じます。2026-11-22 から、改めた規程（日本に住み日本にいる人に限ること、イタリアの国籍を持つ人を除くこと、良識の前提）で、新しい issue を開いて願い出ることができます。';
const PAUSE_TEXT_EN = 'From 2026-11-12 until 00:00 on 2026-11-22 (Japan time), applications for knighting are not received (Rules on Knighting, "Pause in receiving applications"). This application is not accepted, and this issue is closed. From 2026-11-22, a new issue may be opened to apply under the revised rules (only people who live and are in Japan; people who hold Italian nationality excluded; the premise of good sense).';

/* 純：issue を開いた時が受付の停止のあいだか。opened は ISO の時刻。 */
function paused(opened) {
  const t = Date.parse(opened);
  return Number.isFinite(t) && t >= Date.parse(PAUSE_FROM) && t < Date.parse(PAUSE_UNTIL);
}

/* 純：受付の停止のあいだに開かれた願い出へのコメント。 */
function pauseComment() {
  return `${MARK}
**受付の停止**

${PAUSE_TEXT}

${PAUSE_TEXT_EN}

これは創作であり、遊びです。称号に法的な効力はありません。
`;
}

/* 日付から見る印。様式では必須にせず（その日より前の願い出を止めないため）、ここで日付を見て求める。 */
const DATED = [
  { from: PRESENCE_FROM, text: PRESENCE, label: '日本に住み、いま日本にいる印がある' },
  { from: NATIONALITY_FROM, text: NATIONALITY, label: 'イタリアの国籍を持っていない印がある' },
  { from: PREMISE_FROM, text: PREMISE, label: '称号を遊びとして扱う印（良識の前提）がある' },
];

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
  for (const d of DATED) {
    if (jstDay(opened) < d.from) continue;
    const has = oath.split('\n').some((l) => /^- \[[xX]\] /.test(l) && l.includes(d.text));
    add(d.label, has, has ? '' : d.from + ' から、この印のない願い出は受けません');
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
  const opened = process.env.ISSUE_CREATED_AT || new Date().toISOString();
  const mine0 = ((await github('GET', '/issues/' + n + '/comments?per_page=100')) || []).find((c) => c.user.type === 'Bot' && c.body.startsWith(MARK));
  if (paused(opened)) {
    /* 受付の停止のあいだに開かれた願い出：訂正へのリンクも開かず、停止を書いて閉じる（完了ではなく、受けないものとして）。 */
    const body = pauseComment();
    if (mine0) await github('PATCH', '/issues/comments/' + mine0.id, { body });
    else await github('POST', '/issues/' + n + '/comments', { body });
    await github('PATCH', '/issues/' + n, { state: 'closed', state_reason: 'not_planned' });
    console.log('受付の停止のあいだ');
    return;
  }
  const form = parse(process.env.ISSUE_BODY);
  const link = (form['訂正への公開のリンク'] || '').trim();
  const result = check(form, opened, /^https:\/\/[^\s]+$/.test(link) ? await status(link) : null);
  const body = comment(result);
  const mine = mine0;
  if (mine) await github('PATCH', '/issues/comments/' + mine.id, { body });
  else await github('POST', '/issues/' + n + '/comments', { body });
  console.log(result.ok ? '整っている' : '整っていない');
}

module.exports = { PAUSE_FROM, PAUSE_UNTIL, PAUSE_TEXT, PAUSE_TEXT_EN, paused, pauseComment, MARK, PRESENCE_FROM, PRESENCE, NATIONALITY_FROM, NATIONALITY, PREMISE_FROM, PREMISE, DATED, requiredOaths, parse, check, comment, jstDay };

if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });

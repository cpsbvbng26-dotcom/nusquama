#!/usr/bin/env node
/* 叙任の願い出の issue を確かめ、結果をコメントする。叙任を決めるのは運営者であり、この確認は何も決めない。
 *
 * GitHub Actions（.github/workflows/knighting.yml）で動く：
 *   ISSUE_NUMBER, ISSUE_BODY, ISSUE_CREATED_AT, GITHUB_TOKEN, GITHUB_REPOSITORY
 *
 * 確かめるのは七つだけ：
 *   - 様式の誓いのうち、必ず印を付けるものすべてに印があること
 *   - 2026-11-22 から（日本時間で issue を開いた日）、日本に住み、いま日本にいる印があること
 *   - 2026-11-22 から、イタリアの国籍を持っていない印があること（ほかの国籍と重ねて持つ場合も含む）
 *   - 2026-11-22 から、外国の称号を縛る国（叙任の規程「外国の称号を縛る国」）の国籍を持っていない印があること
 *   - 2026-11-22 から、称号を遊びとして扱い、規程の禁じる使い方をしない印（良識の前提）があること
 *   - 訂正へのリンクが https の URL で、受けない先（CLOSED）を指さないこと（文字の上だけで見る。リンクは開かない）
 *   - 何を誤り、どう正したかが書かれていること
 *
 * 受付の停止（2026-11-12 に利用者が決めた）：2026-11-12 0 時（日本時間）から後に開かれた願い出は、
 * 上の確認をせずに、受付を止めていることをコメントし、issue を閉じる。
 * 停止は日付ではひとりでに終わらない（2026-11-13 に Claude が決めた。点検の記録「2026-11-13：十三度目の見落とし」）。
 * 終わるのは、点検の記録に記した決めを REOPEN が指したときだけである。
 *
 * 訂正へのリンクは開かない（2026-11-12 に Claude が決めた。王の正誤表 30）。先のサイトは願い出ごとに違い、
 * 機械による取得を禁じる規約かどうかを前もって読めないため。外へ出す要求は GitHub の API への読み書きだけで、
 * リンク先を開いて読むのは運営者である（叙任の規程「運営者が確かめること」）。
 * 受付に戻ったあとは、2026-11-22 から求める印（日本にいる・イタリアの国籍・外国の称号を縛る国の国籍・良識の前提）で確かめる。
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
const FOREIGN_FROM = '2026-11-22';
const FOREIGN = '次の国の国籍を持っていません：';
const PREMISE = '称号を遊びとして扱い、規程の禁じる使い方をしません';
const PAUSE_FROM = '2026-11-12T00:00:00+09:00';
/* 受付に戻す決め。null のあいだは受付を閉じており、どの日に開かれた願い出も受けない（日付では終わらない）。
 * 2026-11-13 に利用者が法的リスクを限りなく小さくするよう求め、Claude が決めた：受付に戻る日を置かない。
 * 戻すときは { at: '<受付に戻る時刻（日本時間、+09:00）>', record: '<点検の記録で停止を解く行の「箇所」の欄の文>' } を書く。
 * 検査 63 が確かめる：at は改めた規程の効力の日（2026-11-22 0 時）より前でない。record の行が点検の記録の表にあり、
 * その行が at の日付と「受付に戻す」を書いている。2026-11-13 に Claude が決めた。 */
const REOPEN = null;
const PAUSE_TEXT = '2026-11-12 から、叙任の願い出の受付を止めています（叙任の規程「受付の停止」）。授けることに関わるイタリアの法令の一点が、条文からは決まらないためです。受付に戻る日は決めていません。この願い出は受けず、この issue を閉じます。';
const PAUSE_TEXT_EN = 'Since 2026-11-12, applications for knighting are not received (Rules on Knighting, "Pause in receiving applications"), because a point of Italian law concerning conferral is not settled by the texts. No date for reopening has been set. This application is not accepted, and this issue is closed.';

/* 純：受付に戻す決めが、点検の記録の行に拠っているか。拠っていれば null、いなければ理由。
 * record は点検の記録の文（docs/legal-audit-2026-11-12.md）。 */
function reopenProblem(reopen, record) {
  if (reopen === null) return null;
  if (!reopen || typeof reopen.at !== 'string' || typeof reopen.record !== 'string' || !reopen.record.trim()) return '決めの形が違う';
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+09:00$/.test(reopen.at) || !Number.isFinite(Date.parse(reopen.at))) return '時刻が日本時間の形でない';
  if (Date.parse(reopen.at) < Date.parse(PRESENCE_FROM + 'T00:00:00+09:00')) return '改めた規程の効力の日より前に戻す';
  const row = String(record || '').split('\n').find((l) => l.startsWith('| ' + reopen.record + ' |'));
  if (!row) return '記録に行がない';
  if (!row.includes(reopen.at.slice(0, 10)) || !row.includes('受付に戻す')) return '記録の行が、その日に受付に戻すと書いていない';
  return null;
}

/* 純：issue を開いた時が受付の停止のあいだか。opened は ISO の時刻。reopen は受付に戻す決め（既定は REOPEN）。 */
function paused(opened, reopen = REOPEN) {
  const t = Date.parse(opened);
  if (!Number.isFinite(t) || t < Date.parse(PAUSE_FROM)) return false;
  return !(reopen && Number.isFinite(Date.parse(reopen.at)) && t >= Date.parse(reopen.at));
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
  { from: FOREIGN_FROM, text: FOREIGN, label: '外国の称号を縛る国の国籍を持っていない印がある' },
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

/* 訂正へのリンクの先として受けないもの。どれも公開の頁を指さず、運営者が開けば運営者の手元の機械や網に届きうる。
 * 2026-11-12 に Claude が決めた。一覧は docs/legal-audit-2026-11-12.md「2026-11-12 の続き：三度目の見落とし」に記し、検査 68 が照らし合わせる。 */
const CLOSED = {
  hosts: ['localhost'],
  suffixes: ['.localhost', '.local', '.internal', '.home.arpa', '.test', '.example', '.invalid', '.onion'],
  ip: true, /* 数で書いた先（IPv4・IPv6） */
  singleLabel: true, /* 点を含まない名（社内の網の名など） */
  userinfo: true, /* 名や合言葉を含む URL */
};

/* 純：訂正へのリンクを、開かずに文字の上だけで見る。受けられるなら null、受けられないなら理由。 */
function linkProblem(link) {
  if (!/^https:\/\/[^\s]+$/.test(link)) return 'https で始まる URL ではない';
  let u;
  try { u = new URL(link); } catch (e) { return 'URL として読めない'; }
  if (u.protocol !== 'https:') return 'https で始まる URL ではない';
  if (CLOSED.userinfo && (u.username || u.password)) return '名や合言葉を含む URL は受けない';
  const h = u.hostname.toLowerCase().replace(/\.$/, '');
  if (CLOSED.ip && (/^\[.*\]$/.test(h) || /^[0-9.]+$/.test(h))) return '数で書いた先は受けない';
  if (CLOSED.hosts.includes(h) || CLOSED.suffixes.some((x) => h.endsWith(x))) return '受けない先（' + h + '）';
  if (CLOSED.singleLabel && !h.includes('.')) return '点を含まない名の先は受けない';
  return null;
}

/* 純：確かめた結果の行。訂正へのリンクは開かず、linkProblem で文字の上だけを見る。 */
function check(form, opened, oaths = requiredOaths()) {
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
  const problem = linkProblem(link);
  add('訂正へのリンクが https の URL で、受けない先を指さない', problem === null, problem || '開いていない。リンク先は運営者が読む');
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
この確認は何も決めません。叙任を決めるのは運営者です。この確認は、訂正へのリンクを開きません。運営者は、リンク先が願い出た人自身の誤りの訂正であると読めるかを確かめます（叙任の規程「運営者が確かめること」）。
これは創作であり、遊びです。称号に法的な効力はありません。
`;
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
  /* 受付に戻す決めが点検の記録の行に拠っていなければ、戻さない（止めたままにする）。 */
  const record = fs.readFileSync(path.join(ROOT, 'docs', 'legal-audit-2026-11-12.md'), 'utf8');
  const reopen = reopenProblem(REOPEN, record) === null ? REOPEN : null;
  if (paused(opened, reopen)) {
    /* 受付の停止のあいだに開かれた願い出：訂正へのリンクも開かず、停止を書いて閉じる（完了ではなく、受けないものとして）。 */
    const body = pauseComment();
    if (mine0) await github('PATCH', '/issues/comments/' + mine0.id, { body });
    else await github('POST', '/issues/' + n + '/comments', { body });
    await github('PATCH', '/issues/' + n, { state: 'closed', state_reason: 'not_planned' });
    console.log('受付の停止のあいだ');
    return;
  }
  const form = parse(process.env.ISSUE_BODY);
  const result = check(form, opened);
  const body = comment(result);
  const mine = mine0;
  if (mine) await github('PATCH', '/issues/comments/' + mine.id, { body });
  else await github('POST', '/issues/' + n + '/comments', { body });
  console.log(result.ok ? '整っている' : '整っていない');
}

module.exports = { PAUSE_FROM, REOPEN, reopenProblem, PAUSE_TEXT, PAUSE_TEXT_EN, paused, pauseComment, MARK, PRESENCE_FROM, PRESENCE, NATIONALITY_FROM, NATIONALITY, PREMISE_FROM, PREMISE, FOREIGN_FROM, FOREIGN, DATED, CLOSED, linkProblem, requiredOaths, parse, check, comment, jstDay };

if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });

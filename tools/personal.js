#!/usr/bin/env node
/* issue と issue へのコメントに書かれた、連絡先の形の文字を数え、運営者のもののほかは伏せる。言語モデルも外のサービスも使わない。
 *
 * GitHub Actions（.github/workflows/personal.yml）で動く：GITHUB_EVENT_PATH, GITHUB_TOKEN, GITHUB_REPOSITORY
 * issue が開かれ・直され・開き直されたとき、コメントが書かれ・直されたときに動く。
 *
 * 見る形（決まった正規表現だけ。意味は読まない）：
 *   メールアドレス（許した noreply のほか）、電話番号（日本の形と、+ で始まる国の番号の形）、郵便番号の形、
 *   4 桁の組を四つ並べた番号（カードの番号の形）、4 桁の組を三つ並べた番号（個人番号の形）。
 * 見つけたとき（2026-11-14 に Claude が決めた。点検の記録「2026-11-14：形を保って詰める」）：
 *   - 書いたのが運営者（リポジトリの持ち主）か bot なら、何もしない。
 *   - 叙任の願い出として tools/knighting.js が題と本文を断りに替えるもの（受付の停止のあいだ）は、そちらに任せ、何もしない。
 *   - ほかは、見つけた文字だけを決まった語「［伏せた］」に替え、ラベル「伏せた」を付け、種類ごとの数だけを書いたコメントを置く。
 *     issue を閉じず、書き込みも止めない。外すのは、その記載だけである（削除・訂正・辞退の求め「求めを受けた後」、
 *     情報流通プラットフォーム対処法第3条第2項の「必要な限度」）。
 * 見つけた文字は、コメントにも実行の記録（Actions のログ）にも書かない。記録に出すのは、決まった語と数だけである。
 * 替える前の文は、GitHub が編集の履歴に残す（個人情報の取り扱い「保存の期間」）。
 * PR の会話は扱わない（権限に pull-requests を足さないため）。運営者が読む。
 * 2026-11-15 から、どの実行も、出来事の issue の題と本文と、bot と運営者のほかが書いたすべてのコメントを読み直し、残っている形を
 * すべて伏せる。同じ issue の実行が取り消されても、次の実行がその分を伏せる（同時実行の組で待っている実行は、あとの実行に替わりうる）。
 * 形は、NFKC で正規化し、幅のない文字と書字方向の印を除いた文で探し、見つけた所を元の文の位置に戻して伏せる。全角の数字や
 * ＠・〒、間に挟んだ幅のない文字、空白で区切った電話番号も拾う。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const K = require('./knighting.js');
const { ALLOWED_MAIL } = require('./scan.js');

const ROOT = path.join(__dirname, '..');
const MARK = '<!-- nusquama-personal -->';
const LABEL = '伏せた';
const MASK = '［伏せた］';
/* 順に当てる。先の形が取った文字は MASK に替わり、後の形には掛からない。MASK は数字も @ も含まない。 */
const KINDS = [
  { ja: 'メールアドレス', en: 'e-mail addresses', re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g, allow: ALLOWED_MAIL },
  { ja: 'カードの番号の形', en: 'card-number-like strings', re: /(?<![\w-])\d{4}(?:[ -]\d{4}){3}(?![\w-])/g },
  { ja: '個人番号の形', en: 'individual-number-like strings', re: /(?<![\w-])\d{4}[ -]\d{4}[ -]\d{4}(?![\w-])/g },
  { ja: '電話番号', en: 'phone numbers', re: /(?<![\w+-])(?:\+\d{1,3}[ -]?\d{1,4}[ -]?\d{1,4}[ -]?\d{3,4}|0\d{1,4}[ -]\d{1,4}[ -]\d{4}|0\d{9,10})(?![\w-])/g },
  { ja: '郵便番号の形', en: 'postal-code-like strings', re: /〒\s?\d{3}-?\d{4}(?![\w-])|(?<![\w-])\d{3}-\d{4}(?![\w-])/g },
];

/* 幅のない文字（U+200B〜U+200D・U+2060・U+FEFF）と書字方向の印（U+200E・U+200F・U+202A〜U+202E・U+2066〜U+2069）。 */
const HIDDEN = /[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/;
/* 純：探すための文（NFKC、隠れた文字を除く）と、その一文字ごとの元の文の位置。 */
function normalised(text) {
  const chars = Array.from(String(text));
  let s = '';
  const at = [];
  let pos = 0;
  for (const c of chars) {
    if (!HIDDEN.test(c)) { const n = c.normalize('NFKC'); for (let i = 0; i < n.length; i++) at.push([pos, pos + c.length]); s += n; }
    pos += c.length;
  }
  return { s, at };
}

/* 純：一つの文から形を探し、伏せた文と種類ごとの数を返す。見つけた文字そのものは返さない。 */
function mask(text) {
  let out = String(text == null ? '' : text);
  const counts = {};
  for (const k of KINDS) {
    counts[k.ja] = 0;
    const { s, at } = normalised(out);
    const hits = [];
    for (const m of s.matchAll(k.re)) {
      if (k.allow && k.allow.includes(m[0])) continue;
      hits.push([at[m.index][0], at[m.index + m[0].length - 1][1]]);
    }
    for (const [a, b] of hits.reverse()) { out = out.slice(0, a) + MASK + out.slice(b); counts[k.ja]++; }
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return { text: out, counts, total };
}

/* 純：数の並び（決まった語と数だけ）。 */
const tally = (counts, en) => KINDS.map((k) => (en ? k.en : k.ja) + (en ? ': ' : ' ') + (counts[k.ja] || 0)).join(en ? ', ' : '、');

/* 純：置くコメント。数だけを書く。 */
function note(counts, where) {
  return `${MARK}
**連絡先の形の文字を伏せました**（自動の確認。この${where === 'comment' ? 'コメント' : ' issue'}を直すたびに、もう一度動きます）

伏せた数：${tally(counts)}

連絡先の形をした文字を、決まった語「${MASK}」に替えました。見つけた文字は、このコメントにも実行の記録にも書いていません。
替える前の文は、GitHub が編集の履歴に残します。その削除は、削除の求めに応じて行います（[個人情報の取り扱い](https://nusquama.vercel.app/policies/privacy.html)「保存の期間」）。
連絡を受けたい人は、自分の GitHub のプロフィールに連絡先を公開します（[削除・訂正・辞退の求め](https://nusquama.vercel.app/policies/requests.html)「公開できない求め」）。
この確認は形だけを見て、何も決めません。

Strings shaped like contact details were replaced with the fixed word "${MASK}" (automatic check). Counts: ${tally(counts, true)}. The strings themselves are written neither here nor in the run log. GitHub keeps the earlier text in the edit history; it is deleted from there on a request for deletion (Privacy, "How long data is kept").

これは創作であり、遊びです。
`;
}

/* 純：この出来事で何をするか。event は GitHub の出来事、cur は API から読んだいまの issue かコメント（題と本文）。
 * 返すのは { act: 'none'|'skip'|'mask', why, kind, counts, title?, body? }。why と counts のほかは記録に出さない。 */
function decide(event, cur, reopen = K.REOPEN) {
  const issue = event.issue || {};
  const owner = ((event.repository || {}).owner || {}).login || '';
  const isComment = !!event.comment;
  if (issue.pull_request) return { act: 'skip', why: 'PR の会話は扱わない' };
  const author = isComment ? event.comment.user || {} : issue.user || {};
  if (author.type === 'Bot') return { act: 'skip', why: 'bot の書いたもの' };
  if (!isComment && K.target(issue, issue.created_at, reopen) && K.paused(issue.created_at, reopen)) return { act: 'skip', why: '叙任の願い出の確認が断りに替える' };
  const t = isComment ? { text: '', counts: {}, total: 0 } : mask(cur.title);
  const b = mask(cur.body);
  const counts = Object.fromEntries(KINDS.map((k) => [k.ja, (t.counts[k.ja] || 0) + (b.counts[k.ja] || 0)]));
  const total = t.total + b.total;
  if (!total) return { act: 'none', why: '見つからない', counts };
  if (author.login && author.login === owner) return { act: 'skip', why: '運営者の書いたもの', counts };
  return { act: 'mask', why: '伏せる', kind: isComment ? 'comment' : 'issue', counts, title: isComment ? undefined : t.text, body: b.text };
}

/* すべてのコメント。頁を終わりまで読み、読めなければ落ちる（2026-11-15）。 */
async function allComments(github, n) {
  const out = [];
  for (let page = 1; ; page++) {
    const list = await github('GET', '/issues/' + n + '/comments?per_page=100&page=' + page);
    if (!Array.isArray(list)) throw new Error('コメントを読めない');
    out.push(...list);
    if (list.length < 100) return out;
  }
}

async function run(event, github, log = console.log, reopen) {
  const issue = event.issue || {};
  const n = issue.number;
  const cur = event.comment ? await github('GET', '/issues/comments/' + event.comment.id) : await github('GET', '/issues/' + n);
  const d = decide(event, cur || {}, reopen);
  log(d.why + (d.counts ? '：' + tally(d.counts) : ''));
  const sum = Object.fromEntries(KINDS.map((k) => [k.ja, 0]));
  const add = (c) => { for (const k of KINDS) sum[k.ja] += (c && c[k.ja]) || 0; };
  if (d.act === 'mask') {
    if (d.kind === 'comment') await github('PATCH', '/issues/comments/' + event.comment.id, { body: d.body });
    else await github('PATCH', '/issues/' + n, { title: d.title, body: d.body });
    add(d.counts);
  }
  /* 読み直し：出来事のもののほかに、issue の題と本文と、すべてのコメント。取り消された実行の分も、ここで伏せる。 */
  const comments = await allComments(github, n);
  const repo = { repository: event.repository };
  const others = [];
  if (event.comment) {
    const now = await github('GET', '/issues/' + n);
    others.push([Object.assign({}, repo, { issue: Object.assign({}, issue, now ? { title: now.title, body: now.body } : {}) }), now || {}, 'issue']);
  }
  for (const c of comments) {
    if (event.comment && c.id === event.comment.id) continue;
    others.push([Object.assign({}, repo, { issue, comment: { id: c.id, user: c.user } }), c, 'comment']);
  }
  for (const [ev, item] of others) {
    const e = decide(ev, item || {}, reopen);
    if (e.act !== 'mask') continue;
    log(e.why + '：' + tally(e.counts));
    if (e.kind === 'comment') await github('PATCH', '/issues/comments/' + ev.comment.id, { body: e.body });
    else await github('PATCH', '/issues/' + n, { title: e.title, body: e.body });
    add(e.counts);
  }
  if (!Object.values(sum).some(Boolean)) return d;
  await github('POST', '/issues/' + n + '/labels', { labels: [LABEL] });
  const mine = comments.find((c) => c.user && c.user.type === 'Bot' && String(c.body).startsWith(MARK));
  const body = note(sum, d.kind || (event.comment ? 'comment' : 'issue'));
  if (mine) await github('PATCH', '/issues/comments/' + mine.id, { body });
  else await github('POST', '/issues/' + n + '/comments', { body });
  return d;
}

async function main() {
  const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  const record = fs.readFileSync(path.join(ROOT, 'docs', 'legal-audit-2026-11-12.md'), 'utf8');
  const reopen = K.reopenProblem(K.REOPEN, record) === null ? K.REOPEN : null;
  await run(event, K.github, console.log, reopen);
}

module.exports = { MARK, LABEL, MASK, KINDS, HIDDEN, normalised, mask, tally, note, decide, run, allComments };
if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });

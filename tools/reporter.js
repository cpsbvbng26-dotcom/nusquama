#!/usr/bin/env node
/* 誤りの知らせを、日本にいる人からだけ受ける（2026-12-01 から。利用者が 2026-11-15 に決めた）。
 *
 * 誤りの知らせの issue（ラベル「誤り」）が開かれたか直されたとき、.github/workflows/reporter.yml が動かす。
 * 知らせる人が様式に書いた ORCID iD の、公開の記録だけを読む。読むのは次のものだけである。
 *   - researcher-urls：issue を開いた GitHub のアカウント（https://github.com/<アカウント>）へのリンク
 *   - address：公開の住所の国の符号（ISO）と、足した日
 *   - employments・educations：終わりの日のない、いまの勤め先と在学先の組織の国の符号と、足した日
 * 国籍は読まない。GitHub のプロフィールは読まない。
 * 決め：リンクがあり、日本（JP）を指す項目が issue を開いた日（日本時間）の 30 日以上前に足されていて、ほかの国を指す項目が
 * ないときに限り、日本にいると確かめたとする。叙任の規程「受付に戻すときの場所の確かめ」と同じ決めである。
 * 確かめられないときは、ラベル PLACE_LABEL と決まった文のコメントを付ける。issue は閉じず、鍵も掛けない。誤りかどうかは王が読んで決める。
 * 削除・訂正・辞退・権利・個人の情報・同意の求めと読める issue（突き合わせの受付の語、LEGAL）と、ラベル「needs a person」の issue と、
 * リポジトリの持ち主が起こした出来事は、何もしない。求めはどの国の人からも受ける（削除・訂正・辞退の求め）。
 * 読んだ国も組織も、保存せず、コメントにも実行の記録にも書かない。記録に出すのは、決まった語と issue の番号だけである。
 * issue の本文は出来事のファイル（GITHUB_EVENT_PATH）から読む。環境変数にもシェルにも入れない。
 *
 * 参加のハードル（2026-12-15 から。2026-11-19 に利用者がハードルを最大限に上げると決め、Claude が条件を選んだ）：
 *   - LONG_FROM 以後に開かれた知らせでは、日本を指す項目は issue を開く LONG_DAYS 日以上前に足されたものでなければならない（読む項目は変えない）
 *   - SOURCE_FROM 以後に開かれた知らせは、様式の「確かめた先」に空白を除いて SOURCE_MIN 文字以上がなければ受け付けず、
 *     ラベル SOURCE_LABEL と決まった文のコメントを付ける。issue は閉じない。この欄は前から様式にあり、新しく集めるものはない
 *   - 直して通るようになった issue からは、通らなかったときのラベル（PLACE_LABEL・SOURCE_LABEL）を外す。ORCID を読めなかったときは、場所のラベルを
 *     変えず、確かめた先の決めは当てる（2026-11-19 の点検で改めた）
 *
 * 同じアカウントから 30 日に一件まで（2026-12-15 から。2026-11-23 に利用者が採ると決め、細かな定めは Claude が決めた。
 * 点検の記録「2026-11-24：参加の条件を七つ厳しくする」）：
 *   - ONCE_FROM 以後に開かれた知らせは、同じアカウントが前に開いた誤りの知らせ（ラベル「誤り」の issue。受け付けなかったものも数える）を開いた日を
 *     数えずに ONCE_DAYS 日が過ぎるまで（日の差が ONCE_DAYS 以下のあいだ）は受け付けず、ラベル ONCE_LABEL と決まった文のコメントを付ける。issue は閉じない
 *   - GitHub の API の一覧は issue の全体を返すが、使うのは番号（いまの issue を除くため）と開いた時刻だけで、ほかは捨てる。前の issue の番号は書かない
 *   - 受け付けない知らせでは、ORCID の記録を読まない（場所のラベルは変えない）。確かめた先の決めは当てる
 *   - 削除・訂正・辞退の求め、権利者の知らせ、安全の問題の知らせは、ここに来ない（applies が除く）ので縛らない
 *   - 突き合わせの受付（.github/checked-intake/verify.js）のコメントは、新しい issue で出し直せると書く。その道具はどのリポジトリでも同じファイルなので、
 *     この国だけでは変えない。30 日のあいだは、新しい issue ではなく、同じ issue を直す（様式と規程に書いた）
 */
'use strict';
const fs = require('fs');
const V = require('../.github/checked-intake/verify.js');

const FROM = '2026-12-01';
const DAYS = 30;
const DAY = 24 * 3600 * 1000;
const PLACE_LABEL = 'place not verified';
const PLACE_OK = 'place verified';
const MARK = '<!-- reporter-place -->';
/* 参加のハードル（2026-12-15 から）。 */
const LONG_FROM = '2026-12-15';
const LONG_DAYS = 365;
const SOURCE_FROM = '2026-12-15';
const SOURCE_MIN = 6;
const SOURCE_LABEL = 'source not given';
const SOURCE_MARK = '<!-- reporter-source -->';
/* 同じアカウントから 30 日に一件まで（2026-12-15 から）。 */
const ONCE_FROM = '2026-12-15';
const ONCE_DAYS = 30;
const ONCE_LABEL = 'one per 30 days';
const ONCE_MARK = '<!-- reporter-once -->';
const UA = 'nusquama (https://github.com/cpsbvbng26-dotcom/nusquama)';

/* 純：ORCID の公開の記録の答えから、強い印（国の符号と足した日）を取る。終わりの日のある所属は数えない。 */
function signals({ address, employments, educations } = {}) {
  const out = [];
  for (const a of (address && address.address) || []) {
    const c = a.country && a.country.value;
    if (c) out.push({ country: String(c).toUpperCase(), created: (a['created-date'] || {}).value || null });
  }
  for (const [json, key] of [[employments, 'employment-summary'], [educations, 'education-summary']]) {
    for (const g of (json && json['affiliation-group']) || []) {
      for (const s of g.summaries || []) {
        const e = s[key];
        if (!e || e['end-date']) continue;
        const c = e.organization && e.organization.address && e.organization.address.country;
        if (c) out.push({ country: String(c).toUpperCase(), created: (e['created-date'] || {}).value || null });
      }
    }
  }
  return out;
}

/* 純：日本にいると確かめられるか。opened は issue を開いた日（日本時間、YYYY-MM-DD）。理由は返すが、書かない。 */
function inJapan({ linked, signals: s = [], opened, days = DAYS }) {
  if (!linked) return { ok: false, reason: 'unlinked' };
  if (s.some((x) => x.country !== 'JP')) return { ok: false, reason: 'conflict' };
  const limit = Date.parse(opened + 'T00:00:00+09:00') - days * DAY;
  return s.some((x) => x.country === 'JP' && Number.isFinite(x.created) && x.created <= limit) ? { ok: true, reason: 'placed' } : { ok: false, reason: 'unplaced' };
}

/* 純：issue を開いた日（日本時間、YYYY-MM-DD）に当てる日数。 */
function daysFor(day) {
  return day >= LONG_FROM ? LONG_DAYS : DAYS;
}

/* 純：「確かめた先」が書かれているか（空白を除いて SOURCE_MIN 文字以上）。GitHub が空の欄に書く「_No response_」は書かれていないものとする。 */
/* 文字は Unicode の符号位置で数える（UTF-16 の単位では数えない。2026-11-19 の点検で改めた）。 */
function sourceGiven(text) {
  const t = String(text || '').trim();
  return t !== '_No response_' && [...t.replace(/\s+/g, '')].length >= SOURCE_MIN;
}

/* 純：日本時間の日（YYYY-MM-DD）の通し番号。 */
const dayNo = (day) => Math.round(Date.parse(day + 'T00:00:00Z') / DAY);

/* 純：同じアカウントの前の誤りの知らせから ONCE_DAYS 日が過ぎたか。過ぎていれば null、いなければ理由（前の issue の番号は書かない）。
 * previous は、そのアカウントが開いたラベル「誤り」の issue の、番号と開いた時刻の一覧。null は読めなかったことを表す。
 * いまの issue と、いまの issue より後に開いたものは数えない。初めの日を数えないので、日の差が ONCE_DAYS 以下のあいだは受け付けない。 */
function onceProblem(previous, opened, number) {
  if (previous === null || previous === undefined) return 'previous reports not read';
  const t = Date.parse(opened);
  for (const p of previous) {
    if (!p || p.number === number) continue;
    const s = Date.parse(p.created_at);
    if (!Number.isFinite(s) || s > t) continue;
    if (dayNo(V.jstDay(opened)) - dayNo(V.jstDay(p.created_at)) <= ONCE_DAYS) return 'within ' + ONCE_DAYS + ' days';
  }
  return null;
}

/* 純：この issue に手を出すか。誤りの知らせで、FROM 以後に開かれ、求めと読めず、人に渡すラベルがなく、持ち主の出来事でないもの。 */
function applies(event) {
  const i = event && event.issue;
  if (!i || i.pull_request) return false;
  const names = (i.labels || []).map((l) => (typeof l === 'string' ? l : l.name));
  if (!names.includes('誤り') || names.includes('needs a person') || names.includes('求め')) return false;
  if (V.byOwner(event)) return false;
  if (V.jstDay(i.created_at) < FROM) return false;
  if (V.legalRequest(i.title) || V.legalRequest(i.body)) return false;
  return true;
}

const note = (days) => MARK + `
**誤りの知らせは、日本にいる人からだけ受けます（2026-12-01 から）。** この知らせは、ORCID の公開の記録から、日本にいると確かめられなかったので、受け付けません。issue は閉じず、人が読みます。
確かめるのは、様式に書いた ORCID iD の公開の記録の、この issue を開いた GitHub のアカウントへのリンクと、公開の住所の国、いまの勤め先と在学先の組織の国だけです。国籍は読まず、読んだものは残さず、どの項目かも書きません。日本を指す項目が issue を開く ${days} 日以上前からあり、ほかの国を指す項目が無いとき、確かめられます。そのあと、新しい issue で知らせ直すか、この issue を直せます。2026-12-15 から、新しい issue で知らせ直せるのは、前の知らせを開いた日を数えずに 30 日が過ぎてからです。
削除・訂正・辞退・権利・個人の情報・同意の求めは、「削除・訂正・辞退の求め」の様式で、どの国の人からも受けます。

**Error reports are received only from people in Japan (from 2026-12-01).** This report could not be checked, from the public ORCID record, as coming from someone in Japan, so it is not accepted. The issue is not closed; a person reads it.
Only these are read in the public ORCID record of the iD given: the link to the GitHub account that opened this issue, and the countries of the public addresses and of the current employments and educations. No nationality is read, nothing read is kept, and no entry is named. The check passes when an entry naming Japan was added at least ${days} days before the issue was opened and no entry names another country. The issue can then be edited, or the report made again in a new issue. From 2026-12-15, a report can be made again in a new issue only after 30 days, not counting the day the previous report was opened.
Requests about removal, correction, withdrawal, rights, personal data or consent are received from people in every country, with the request form.
`;

const NOTE = note(DAYS);

const NOTE_ONCE = ONCE_MARK + `
**誤りの知らせは、同じ GitHub のアカウントから 30 日に一件までです（2026-12-15 から）。** このアカウントが前に開いた誤りの知らせから、その日を数えずに 30 日が過ぎていないので、この知らせは受け付けません。issue は閉じず、人が読みます。この issue を直しても変わりません。
前の知らせ（受け付けなかったものも数えます）を開いた日を数えずに 30 日が過ぎてから、新しい issue で知らせることができます。前の知らせの issue は、いつでも直せます。ヌスクァマは個人で運営しているため、参加のハードルを極端に高くしています。
数えるのは、このアカウントが開いた、ラベル「誤り」の付いた issue の、番号と開いた時刻だけです。題や本文は使わず、前の issue の番号も書きません。この知らせでは、ORCID の記録を読みません。
削除・訂正・辞退・権利・個人の情報・同意の求めと、安全の問題の知らせには、この限りは掛かりません。

**An error report is received at most once in 30 days from the same GitHub account (from 2026-12-15).** 30 days, not counting the day itself, have not passed since this account opened its previous error report, so this report is not accepted. The issue is not closed; a person reads it. Editing this issue does not change this.
A new issue can be opened after 30 days, not counting the day the previous report (including one that was not accepted) was opened. The issue of the previous report can be edited at any time. Because Nusquama is run by one individual, its barriers to participation are set extremely high.
Only the issue number and the time of opening of the issues with the label 誤り (error) opened by this account are used. No title or body is used, and the number of the earlier issue is not given. The ORCID record is not read for this report.
Requests about removal, correction, withdrawal, rights, personal data or consent, and reports of security problems, are not limited in this way.
`;

const NOTE_SOURCE = SOURCE_MARK + `
**誤りの知らせには、「確かめた先」が要ります（2026-12-15 から）。** この知らせの「確かめた先」には、空白を除いて ${SOURCE_MIN} 文字以上が書かれていないので、受け付けません。issue は閉じず、人が読みます。
書名・資料の名・条文の名など、何で確かめたかが分かるように（「辞書」や「条文」だけでなく）書いて、この issue を直すか、新しい issue で知らせ直せます。新しい issue で知らせ直せるのは、前の知らせを開いた日を数えずに 30 日が過ぎてからです。ヌスクァマは個人で運営しているため、参加のハードルを極端に高くしています。
削除・訂正・辞退・権利・個人の情報・同意の求めは、「削除・訂正・辞退の求め」の様式で、どの国の人からも受けます。

**An error report needs the field 確かめた先 (Checked against) (from 2026-12-15).** At least ${SOURCE_MIN} characters, not counting spaces, are not written in that field of this report, so it is not accepted. The issue is not closed; a person reads it.
Write what the mistake was checked against, naming the book, source or statute so that it can be found (not just "a dictionary"), and edit this issue, or make the report again in a new issue. A new issue can be opened only after 30 days, not counting the day the previous report was opened. Because Nusquama is run by one individual, its barriers to participation are set extremely high.
Requests about removal, correction, withdrawal, rights, personal data or consent are received from people in every country, with the request form.
`;

async function get(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(60000) });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}
async function gh(method, url, body) {
  const r = await fetch('https://api.github.com/repos/' + process.env.GITHUB_REPOSITORY + url, {
    method, headers: { 'User-Agent': UA, Authorization: 'Bearer ' + process.env.GITHUB_TOKEN, Accept: 'application/vnd.github+json' }, body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(method + ' ' + url + ': HTTP ' + r.status);
  return r.status === 204 ? null : r.json();
}

/* 同じアカウントが開いたラベル「誤り」の issue の、番号と開いた時刻。GitHub の API は issue の全体を返すが、この二つのほかは捨てる。
 * 一覧は終わりの頁まで読む。読めなければ throw する（実行が落ち、何も書かない）。 */
async function previousReports(login, api = gh) {
  if (!login) return null;
  const out = [];
  for (let page = 1; page <= 50; page++) {
    const list = await api('GET', '/issues?creator=' + encodeURIComponent(login) + '&labels=' + encodeURIComponent('誤り') + '&state=all&per_page=100&page=' + page);
    if (!Array.isArray(list)) throw new Error('not a list');
    for (const x of list) out.push({ number: x.number, created_at: x.created_at });
    if (list.length < 100) return out;
  }
  throw new Error('list too long');
}

async function main() {
  const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  if (!applies(event)) { console.log('reporter: left alone'); return; }
  const i = event.issue;
  const form = V.parseForm(i.body);
  const id = (String(V.field(form, ['ORCID iD']) || '').match(/\d{4}-\d{4}-\d{4}-\d{3}[\dX]/) || [''])[0];
  /* 同じアカウントから 30 日に一件まで（ONCE_FROM から）。受け付けない知らせでは、ORCID の記録を読まない。 */
  const once = V.jstDay(i.created_at) < ONCE_FROM || onceProblem(await previousReports(i.user && i.user.login), i.created_at, i.number) === null;
  /* 場所：'yes'（確かめた）、'no'（確かめられない）、'unchecked'（ORCID を読めなかったか、読まなかった）。読めなかったときも、確かめた先の決めは当てる（2026-11-19 の点検で改めた）。 */
  let place = once ? 'no' : 'unchecked';
  if (once && V.orcidOk(id)) {
    try {
      const base = 'https://pub.orcid.org/v3.0/' + id;
      const urls = await get(base + '/researcher-urls');
      const linked = V.linksGithub(V.orcidUrls(urls), i.user.login);
      const s = signals({ address: await get(base + '/address'), employments: await get(base + '/employments'), educations: await get(base + '/educations') });
      place = inJapan({ linked, signals: s, opened: V.jstDay(i.created_at), days: daysFor(V.jstDay(i.created_at)) }).ok ? 'yes' : 'no';
    } catch (e) { place = 'unchecked'; console.log('reporter: place not checked'); }
  }
  const n = i.number;
  const day = V.jstDay(i.created_at);
  const sourced = day < SOURCE_FROM || sourceGiven(V.field(form, ['確かめた先']));
  /* 直して通るようになった issue からは、通らなかったときのラベルを外す（2026-11-19 の点検で改めた）。付いていないラベルは外さない。 */
  const has = (name) => (i.labels || []).some((l) => (typeof l === 'string' ? l : l && l.name) === name);
  const drop = async (name) => {
    if (!has(name)) return;
    try { await gh('DELETE', '/issues/' + n + '/labels/' + encodeURIComponent(name)); } catch (e) { if (!/HTTP 404$/.test(e.message)) throw e; }
  };
  const cs = place === 'no' || !sourced || !once ? ((await gh('GET', '/issues/' + n + '/comments?per_page=100')) || []) : [];
  const posted = (mark) => cs.some((c) => c.user && c.user.type === 'Bot' && String(c.body).startsWith(mark));
  if (place === 'yes') {
    await drop(PLACE_LABEL);
    await gh('POST', '/issues/' + n + '/labels', { labels: [PLACE_OK] });
  } else if (place === 'no') {
    await drop(PLACE_OK);
    await gh('POST', '/issues/' + n + '/labels', { labels: [PLACE_LABEL] });
    if (!posted(MARK)) await gh('POST', '/issues/' + n + '/comments', { body: note(daysFor(day)) });
  }
  if (once) await drop(ONCE_LABEL);
  else {
    await gh('POST', '/issues/' + n + '/labels', { labels: [ONCE_LABEL] });
    if (!posted(ONCE_MARK)) await gh('POST', '/issues/' + n + '/comments', { body: NOTE_ONCE });
  }
  if (sourced) await drop(SOURCE_LABEL);
  else {
    await gh('POST', '/issues/' + n + '/labels', { labels: [SOURCE_LABEL] });
    if (!posted(SOURCE_MARK)) await gh('POST', '/issues/' + n + '/comments', { body: NOTE_SOURCE });
  }
  console.log('reporter: issue ' + n + ' ' + ({ yes: 'place verified', no: 'place not verified', unchecked: 'place not checked' })[place] + (sourced ? '' : ', source not given') + (once ? '' : ', ' + ONCE_LABEL));
}

module.exports = { ONCE_FROM, ONCE_DAYS, ONCE_LABEL, ONCE_MARK, NOTE_ONCE, onceProblem, previousReports, FROM, DAYS, PLACE_LABEL, PLACE_OK, MARK, NOTE, note, LONG_FROM, LONG_DAYS, SOURCE_FROM, SOURCE_MIN, SOURCE_LABEL, SOURCE_MARK, NOTE_SOURCE, daysFor, sourceGiven, signals, inJapan, applies, main };
if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });

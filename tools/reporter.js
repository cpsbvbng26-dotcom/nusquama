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

const NOTE = MARK + `
**誤りの知らせは、日本にいる人からだけ受けます（2026-12-01 から）。** この知らせは、ORCID の公開の記録から、日本にいると確かめられなかったので、受け付けません。issue は閉じず、人が読みます。
確かめるのは、様式に書いた ORCID iD の公開の記録の、この issue を開いた GitHub のアカウントへのリンクと、公開の住所の国、いまの勤め先と在学先の組織の国だけです。国籍は読まず、読んだものは残さず、どの項目かも書きません。日本を指す項目が issue を開く ${DAYS} 日以上前からあり、ほかの国を指す項目が無いとき、確かめられます。そのあと、新しい issue で知らせ直すか、この issue を直せます。
削除・訂正・辞退・権利・個人の情報・同意の求めは、「削除・訂正・辞退の求め」の様式で、どの国の人からも受けます。

**Error reports are received only from people in Japan (from 2026-12-01).** This report could not be checked, from the public ORCID record, as coming from someone in Japan, so it is not accepted. The issue is not closed; a person reads it.
Only these are read in the public ORCID record of the iD given: the link to the GitHub account that opened this issue, and the countries of the public addresses and of the current employments and educations. No nationality is read, nothing read is kept, and no entry is named. The check passes when an entry naming Japan was added at least ${DAYS} days before the issue was opened and no entry names another country. The issue can then be edited, or the report made again in a new issue.
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

async function main() {
  const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  if (!applies(event)) { console.log('reporter: left alone'); return; }
  const i = event.issue;
  const form = V.parseForm(i.body);
  const id = (String(V.field(form, ['ORCID iD']) || '').match(/\d{4}-\d{4}-\d{4}-\d{3}[\dX]/) || [''])[0];
  let ok = false;
  if (V.orcidOk(id)) {
    try {
      const base = 'https://pub.orcid.org/v3.0/' + id;
      const urls = await get(base + '/researcher-urls');
      const linked = V.linksGithub(V.orcidUrls(urls), i.user.login);
      const s = signals({ address: await get(base + '/address'), employments: await get(base + '/employments'), educations: await get(base + '/educations') });
      ok = inJapan({ linked, signals: s, opened: V.jstDay(i.created_at) }).ok;
    } catch (e) { console.log('reporter: not checked'); return; }
  }
  const n = i.number;
  if (ok) await gh('POST', '/issues/' + n + '/labels', { labels: [PLACE_OK] });
  else {
    await gh('POST', '/issues/' + n + '/labels', { labels: [PLACE_LABEL] });
    const cs = (await gh('GET', '/issues/' + n + '/comments?per_page=100')) || [];
    if (!cs.some((c) => c.user && c.user.type === 'Bot' && String(c.body).startsWith(MARK))) await gh('POST', '/issues/' + n + '/comments', { body: NOTE });
  }
  console.log('reporter: issue ' + n + ' ' + (ok ? 'place verified' : 'place not verified'));
}

module.exports = { FROM, DAYS, PLACE_LABEL, PLACE_OK, MARK, NOTE, signals, inJapan, applies };
if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });

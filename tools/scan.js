#!/usr/bin/env node
/* 秘密情報と個人の連絡先が、リポジトリのファイルに入っていないかを走査する。外のパッケージを使わない。
 *
 *   node tools/scan.js          見つかれば 1 で止まる
 *
 * 見るもの：秘密鍵の塊、よく知られた形の鍵や token、引用符で囲んだ鍵らしい値の代入、
 * 許したもののほかのメールアドレス、日本の電話番号と郵便番号の形。
 * メールアドレスの拾い方は、10 リポジトリの横断検査（許すメールアドレスの表と突き合わせる形）にならう。
 * check.js がこれを呼び、CI では週に一度も走る（.github/workflows/check.yml）。
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SKIPDIR = new Set(['.git', 'node_modules']);
const BINARY = /\.(png|ico|jpg|jpeg|gif|webp|pdf)$/i;
/* 許すメールアドレス。GitHub Actions の bot の noreply と、コミットの開示の noreply だけ。 */
const ALLOWED_MAIL = ['41898282+github-actions[bot]@users.noreply.github.com', 'noreply@anthropic.com'];
const MAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
const SECRETS = [
  ['秘密鍵', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['GitHub の token', /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{22,})\b/],
  ['AWS の鍵', /\bAKIA[0-9A-Z]{16}\b/],
  ['Slack の token', /\bxox[abprs]-[A-Za-z0-9-]{10,}/],
  ['Google の API の鍵', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['言語モデルの API の鍵', /\bsk-(?:ant-)?[A-Za-z0-9_-]{20,}/],
  ['鍵らしい値の代入', /\b(?:api[_-]?key|secret|password|passwd|token)\b["']?\s*[:=]\s*["'][^"'\s$]{12,}["']/i],
];
const CONTACT = [
  ['電話番号', /(?<![\d-])0\d{1,4}-\d{1,4}-\d{4}(?![\d-])/],
  ['郵便番号', /〒\s?\d{3}-\d{4}/],
];

function files(dir = ROOT, rel = '') {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (SKIPDIR.has(e.name)) return [];
    const r = rel ? rel + '/' + e.name : e.name;
    if (e.isDirectory()) return files(path.join(dir, e.name), r);
    return BINARY.test(e.name) ? [] : [r];
  }).sort();
}

/* 一つの文を走査する。見つけたものを [種類, 見つけた文字列] で返す。 */
function scanText(text) {
  const hits = [];
  for (const [kind, re] of SECRETS.concat(CONTACT)) { const m = re.exec(text); if (m) hits.push([kind, m[0]]); }
  /* iCalendar の UID（記念日の識別子。月と日の四桁に、サイトの所在を添えた形）は宛先ではないので除く。 */
  const mailText = text.split(/\r?\n/).filter((l) => !/^UID:\d{4}@nusquama\.vercel\.app$/.test(l)).join('\n');
  for (const m of mailText.match(MAIL) || []) if (!ALLOWED_MAIL.includes(m)) hits.push(['メールアドレス', m]);
  return hits;
}

function scan(root = ROOT) {
  const list = files(root);
  const hits = [];
  for (const f of list) for (const [kind, s] of scanText(fs.readFileSync(path.join(root, f), 'utf8'))) hits.push(f + '：' + kind + '（' + s.slice(0, 12) + '…）');
  return { files: list.length, hits };
}

module.exports = { scan, scanText, ALLOWED_MAIL };
if (require.main === module) {
  const r = scan();
  console.log(r.files + ' ファイルを走査した。');
  if (r.hits.length) { console.log('見つかった（' + r.hits.length + ' 件）：\n  ' + r.hits.join('\n  ')); process.exit(1); }
  console.log('秘密情報も、許したもののほかの連絡先も、見つからなかった。');
}

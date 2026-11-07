#!/usr/bin/env node
/* ヌスクァマの検査。site/ が Markdown から作ったものそのままであること、どの頁も創作だと断っていること、
 * 規程の約束が消えていないこと、頁が外へ何も要求しないこと、安全のヘッダー、叙任の様式の誓い。
 *
 *   node verification/check.js
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const B = require('../build.js');

const ROOT = path.join(__dirname, '..');
const read = (r) => fs.readFileSync(path.join(ROOT, r), 'utf8');
let pass = 0; const fails = [];
function ok(label, cond, detail) {
  if (cond) { pass++; console.log('  通  ' + label); return; }
  console.log('  落  ' + label + (detail ? ' —— ' + detail : '')); fails.push(label);
}
function walk(dir, rel = '') {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(dir, e.name), rel + e.name + '/') : [rel + e.name]);
}

console.log('\n1. site/ は Markdown から作ったものそのまま');
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nusquama-'));
  B.build(tmp);
  const a = walk(tmp).sort(), b = walk(path.join(ROOT, 'site')).sort();
  const diff = a.filter((f) => !b.includes(f) || !fs.readFileSync(path.join(tmp, f)).equals(fs.readFileSync(path.join(ROOT, 'site', f)))).concat(b.filter((f) => !a.includes(f)));
  ok('site/ が build.js の出力と一致する（手で直していない）', diff.length === 0, diff.join(', '));
}

console.log('\n2. どの頁も創作だと断る');
{
  const readme = read('README.md');
  ok('README の冒頭が、創作であること・無関係であること・効力がないことを断る',
    readme.indexOf('> これは創作であり、遊びです。') > 0 && readme.indexOf('> これは創作であり、遊びです。') < readme.indexOf('## ')
    && readme.includes('いかなる実在の国家・王室・騎士団・叙勲・称号とも関係がなく') && readme.includes('ここで授ける称号に、法的な効力はありません。'));
  for (const [src, dst] of B.SOURCES.concat([['', '404.html']])) {
    const html = read('site/' + dst);
    const has = dst === 'index.html' ? html.includes('これは創作であり、遊びです。') : html.includes('<p class="notice">' + B.NOTICE + '</p>');
    ok(dst + ' に創作だという断りがある', has);
  }
  ok('KNIGHTS.md の冒頭も断る', read('KNIGHTS.md').includes('> これは創作であり、遊びです。'));
}

console.log('\n3. 規程の約束（消せば落ちる）');
{
  const must = {
    'policies/terms.md': ['国家ではありません。領土・国民・政府・通貨・旅券・国籍を持たず、主権も領有も主張しません。', 'どの国の法令に定められた称号でもなく、法的な効力も、身分も、特典もありません。',
      '官公職・位階勲等・学位・その他法令により定められた称号と誤認されるように使うことは、してはいけません。', 'ヌスクァマは、誰からも料金を取りません。', '称号を売らず、寄付を受けず、広告を出さず、何も販売しません。', 'この規約は日本法に準拠します。'],
    'policies/disclaimer.md': ['国際法上の国家ではなく、国家としての承認を求めず、どの国の領土も主張しません。', '叙任は、現実の栄誉の授与ではありません。', 'アーサー王伝説を題材とする小説・映画・ゲーム・アニメなどの作品と、その権利者', 'Claude は騎士でも王でもなく、ヌスクァマの著者でもありません。'],
    'policies/privacy.md': ['サイトは、cookie を使わず、アクセス解析も広告も置いていません。', '本名・住所・所属・連絡先は求めません。', '13 歳未満の人は、叙任を願い出ることができません。'],
    'policies/knighting.md': ['叙任は無償です。', '騎士は、いつでも名簿からの辞退を求めることができます。理由は要りません。', '運営者は、訂正の中身が正しいかどうかを判断しません。'],
    'policies/requests.md': ['名簿からの辞退は、理由を問わず応じます。', '費用はかかりません。'],
    'policies/names.md': ['特定の作品・団体・人物の名を借りたものではありません。', '実在の国家・王室・騎士団・勲章・大学・企業の紋章や記章を写したものではありません。'],
  };
  for (const [f, list] of Object.entries(must)) {
    const t = read(f);
    const miss = list.filter((x) => !t.includes(x));
    ok(f + ' の約束がそろっている（' + list.length + ' 文）', miss.length === 0, miss.join(' / '));
    ok(f + ' に最終更新の日がある', /^最終更新：\d{4}-\d{2}-\d{2}。$/m.test(t));
  }
  const readme = read('README.md');
  ok('README が規程のすべてへつなぐ', B.POLICIES.every((p) => readme.includes('(policies/' + p + '.md)')));
  ok('基本法の第一条・第六条・第八条が残り、改正で削らないと書いてある',
    readme.includes('**第一条（創作であること）**') && readme.includes('**第六条（叙任）**') && readme.includes('**第八条（称号を使う場所）**') && readme.includes('ただし、第一条・第六条・第八条は削らない。'));
}

console.log('\n4. 頁は外へ何も要求しない');
for (const f of walk(path.join(ROOT, 'site')).filter((x) => x.endsWith('.html'))) {
  const html = read('site/' + f);
  const csp = (/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/.exec(html) || [])[1] || '';
  const loads = [...html.matchAll(/<(?:img|script|link|iframe|source)\b[^>]*(?:src|href)="(https?:)?\/\/[^"]*"/g)].map((m) => m[0])
    .filter((t) => !/<link rel="canonical"/.test(t) && !/<a /.test(t));
  ok(f + '：CSP が default-src none で、unsafe-inline を使わず、外から何も読み込まない',
    csp.startsWith("default-src 'none'") && !csp.includes('unsafe-inline') && !/<script/.test(html) && loads.length === 0, loads.join(' '));
}

console.log('\n5. 安全のヘッダー');
{
  const cfg = JSON.parse(read('site/vercel.json'));
  const h = Object.fromEntries((cfg.headers[0] || { headers: [] }).headers.map((x) => [x.key, x.value]));
  ok('vercel.json はヘッダーだけを持つ', Object.keys(cfg).join() === 'headers' && cfg.headers[0].source === '/(.*)');
  ok('枠を二通りで断り、型の推測・参照元・機能・窓・HTTPS を押さえる',
    h['Content-Security-Policy'] === "frame-ancestors 'none'" && h['X-Frame-Options'] === 'DENY' && h['X-Content-Type-Options'] === 'nosniff'
    && h['Referrer-Policy'] === 'no-referrer' && /camera=\(\)/.test(h['Permissions-Policy'] || '') && h['Cross-Origin-Opener-Policy'] === 'same-origin' && /^max-age=\d{8,}/.test(h['Strict-Transport-Security'] || ''));
}

console.log('\n6. 叙任の様式の誓い');
{
  const y = read('.github/ISSUE_TEMPLATE/knighting.yml');
  const oaths = ['訂正したのは、自分自身の誤りです。', '称号に法的な効力も現実の栄誉もないことを分かっています。', '履歴書・論文・名刺・公的な書類には書きません（基本法第八条）。',
    '叙任のために、誰にも何も支払いません（基本法第六条）。', '13 歳以上です。', '利用規約・免責事項・個人情報の取り扱い・叙任の規程を読み、同意します'];
  const miss = oaths.filter((x) => !y.includes(x));
  ok('誓いがそろい、どれも必須である', miss.length === 0 && (y.match(/required: true/g) || []).length >= oaths.length + 2, miss.join(' / '));
  ok('本名・住所・所属を書かないよう求めている', y.includes('本名・住所・所属は書かないでください。'));
}

console.log('\n7. アイコン');
{
  const sizes = { 'apple-touch-icon.png': 180, 'icon-192.png': 192, 'icon-512.png': 512 };
  for (const [f, s] of Object.entries(sizes)) {
    const b = fs.readFileSync(path.join(ROOT, 'assets', f));
    ok(f + ' が ' + s + ' px の正方形の PNG', b.readUInt32BE(16) === s && b.readUInt32BE(20) === s);
  }
  const ico = fs.readFileSync(path.join(ROOT, 'assets', 'favicon.ico'));
  ok('favicon.ico が 16・32・48 px を収める', ico.readUInt16LE(4) === 3 && [0, 1, 2].map((i) => ico.readUInt8(6 + 16 * i)).join() === '16,32,48');
  ok('どの頁もアイコンを指す', B.SOURCES.every(([, d]) => /rel="icon" href="[^"]*favicon\.svg"/.test(read('site/' + d)) && /rel="apple-touch-icon"/.test(read('site/' + d))));
}

console.log('\n' + '-'.repeat(56));
if (fails.length) { console.log(pass + ' 件が通り、' + fails.length + ' 件が通りませんでした。'); process.exit(1); }
console.log(pass + ' 件すべて通りました。');

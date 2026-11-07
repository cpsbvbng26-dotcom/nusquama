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
    && readme.includes('いかなる実在の国家・王室・騎士団・叙勲・称号とも関係がなく') && readme.includes('ここで授ける称号に、法的な効力はありません。') && readme.includes('> 悪意はなく、法令を守って運営しています。'));
  for (const [src, dst] of B.SOURCES.concat([['', '404.html']])) {
    const html = read('site/' + dst);
    const has = dst === 'index.html' ? html.includes('これは創作であり、遊びです。') : html.includes('<p class="notice">' + (dst.endsWith('.en.html') ? B.NOTICE_EN : B.NOTICE) + '</p>');
    ok(dst + ' に創作だという断りがある', has);
  }
  ok('KNIGHTS.md の冒頭も断る', read('KNIGHTS.md').includes('> これは創作であり、遊びです。'));
}

console.log('\n3. 規程の約束（消せば落ちる）');
{
  const must = {
    'policies/terms.md': ['国家ではありません。領土・国民・政府・通貨・旅券・国籍を持たず、主権も領有も主張しません。', 'どの国の法令に定められた称号でもなく、法的な効力も、身分も、特典もありません。',
      '官公職・位階勲等・学位・その他法令により定められた称号と誤認されるように使うことは、してはいけません。', 'ヌスクァマは、誰からも料金を取りません。', '称号を売らず、寄付を受けず、広告を出さず、何も販売しません。', 'この規約は日本法に準拠します。',
      '紛争は、示談による解決を優先します。', '相手方から示談の申し出があれば、運営者は誠実に応じます。',
      '示談で解決しない紛争は、訴額に応じて、宇都宮地方裁判所または宇都宮簡易裁判所を、第一審の専属的合意管轄裁判所とします。'],
    'policies/disclaimer.md': ['国際法上の国家ではなく、国家としての承認を求めず、どの国の領土も主張しません。', '叙任は、現実の栄誉の授与ではありません。', 'アーサー王伝説を題材とする小説・映画・ゲーム・アニメなどの作品と、その権利者', 'Claude は騎士でも王でもなく、ヌスクァマの著者でもありません。'],
    'policies/privacy.md': ['サイトは、cookie を使わず、アクセス解析も広告も置いていません。', '本名・住所・所属・連絡先は求めません。', '16 歳未満の人は、叙任を願い出ることができません。',
      'ただし、訂正へのリンクの先に本名や所属が書かれている場合は、名簿と issue によって、アカウント名とその人が結び付いて公開されます。',
      '米国には、日本の個人情報保護法に当たる、個人情報を包括して扱う連邦の法律はありません。',
      '保有個人データの開示と利用停止にも応じます。',
      'issue は、削除の求めがあれば、運営者が issue を削除するか、本文を空にしたうえで編集の履歴からも前の版を消します。'],
    'policies/knighting.md': ['叙任は無償です。', '騎士は、いつでも名簿からの辞退を求めることができます。理由は要りません。', '運営者は、訂正の中身が正しいかどうかを判断しません。'],
    'policies/requests.md': ['名簿からの辞退は、理由を問わず応じます。', '費用はかかりません。'],
    'policies/names.md': ['特定の作品・団体・人物の名を借りたものではありません。', '実在の国家・王室・騎士団・勲章・大学・企業の紋章や記章を写したものではありません。'],
    'policies/legality.md': ['この頁は、運営者の理解を書いたもので、法的な助言でも保証でもありません。', '弁護士の確認は受けていません。',
      '運営者の整理では、上のどの法令についても、要件に当たる事実がありません。',
      '要旨は、2026-11-08 に e-Gov 法令 API から取り寄せた現行の条文と突き合わせました。突き合わせた条は、各節の見出しに挙げています。',
      '読むだけの人との間では、書面の合意がないので、管轄の合意は効力を生じないことがある。', 'ただし、これは法的な保証ではありません。前提となる事実が変われば、結論も変わります。'],
  };
  must['policies/terms.md'].push('通貨・点数・引換券・電子的な価値・旅券・身分証・証明書のどれも発行しません。', 'ヌスクァマは、勲章・記章・制服・証書などの物を作らず、配りません。');
  for (const f of ['policies/terms.md', 'policies/legality.md']) must[f].push('ヌスクァマに悪意はありません。人をだますことも、誰かを害することも、目的にしていません。', '運営者は、日本の法令と、使っているサービスの規約を守って運営します。', '適法かどうか迷う事柄は、行わないほうを選びます。');
  must['policies/disclaimer.md'].push('ヌスクァマに悪意はありません。人をだますことも、誰かを害することも、目的にしていません。');
  must['policies/disclaimer.md'].push('この頁は、[利用規約](./terms.md)の一部です。',
    '日本の消費者契約法が適用される場合は、前の文を適用しません。そのときは、軽過失による損害を含め、同法と民法の定めるとおり責任を負います。',
    '法令が免除や制限を認めない責任を、免除したり制限したりするものではありません。');
  must['policies/terms.md'].push('これは、消費者や日本国外の人が、法令によって別の裁判所で訴える権利を奪うものではありません。',
    'この規約のどの定めも、法令が制限を認めない権利を制限しません。',
    '読む人や騎士に不利になる変更は、変える内容と効力の生じる日を、効力の生じる前にこの頁で示します。');
  must['policies/legality.md'].push('- 16 歳未満の人と、住んでいる国の法令が私人の授ける騎士の称号を禁じている人の願い出は受けない。',
    '- お金や品物を受け取らない。何も売らず、寄付を受けず、広告を出さない。', '- 通貨・旅券・身分証・証明書を発行しない。');
  must['policies/knighting.md'].push('16 歳未満の人は願い出ることができません。', '- 様式の誓いのすべてに印があること。',
    '住んでいる国の法令が、私人の授ける騎士の称号を受けることや使うことを禁じている人も、願い出ることができません。');
  must['policies/knighting.md'].push('叙任では、任命書・証書・記章などの書面や物を発行しません。名簿にアカウント名を載せるだけです。');
  must['policies/disclaimer.md'].push('法令ごとの整理は[適法性の説明](./legality.md)にあります。弁護士の確認は受けていません。');
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
    .filter((t) => !/<link rel="(?:canonical|alternate)"/.test(t) && !/<a /.test(t));
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
    '叙任のために、誰にも何も支払いません（基本法第六条）。', '16 歳以上です。', '住んでいる国の法令は、私人の授ける騎士の称号を受けることや使うことを禁じていません。', '利用規約・免責事項・個人情報の取り扱い・叙任の規程を読み、願い出の日の版に同意します'];
  const miss = oaths.filter((x) => !y.includes(x));
  ok('誓いがそろい、どれも必須である', miss.length === 0 && (y.match(/required: true/g) || []).length >= oaths.length + 2, miss.join(' / '));
  ok('本名・住所・所属・連絡先を書かないよう求め、リンクの先から身元が分かることを知らせる', y.includes('本名・住所・所属・連絡先は書かないでください。') && y.includes('訂正へのリンクの先に本名や所属が書かれていると、このアカウントとその人が結び付いて公開されます。'));
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
  const F = require('../tools/favicon.js');
  const fav = read('assets/favicon.svg');
  ok('favicon.svg は正方形で、国章から tools/favicon.js が作ったものそのまま（Google の検索結果は正方形を求める）',
    fav.includes('viewBox="0 0 ' + F.SIDE + ' ' + F.SIDE + '"') && fav === F.square(read('assets/emblem.svg')));
  ok('どの頁も 48 の倍数の正方形の PNG（192 px）を指し、サイト名を og:site_name で出す',
    B.SOURCES.every(([s, d]) => read('site/' + d).includes('icon-192.png" sizes="192x192" type="image/png">')
      && read('site/' + d).includes('<meta property="og:site_name" content="' + (s.endsWith('.en.md') ? 'Nusquama' : '無何有騎士王国ヌスクァマ') + '">')));
  ok('どの頁もアイコンを指す', B.SOURCES.every(([, d]) => /rel="icon" href="[^"]*favicon\.svg"/.test(read('site/' + d)) && /rel="apple-touch-icon"/.test(read('site/' + d))));
}

console.log('\n8. Search Console の所有者の確認');
ok('トップの頁に google-site-verification の meta がある（受け取った値のまま）',
  read('site/index.html').includes('<meta name="google-site-verification" content="UEPpX5mfnLlhOBTBTETu-PmRO_Y4L2SmjEiaq_U1Zf8">') && B.GOOGLE_SITE_VERIFICATION === 'UEPpX5mfnLlhOBTBTETu-PmRO_Y4L2SmjEiaq_U1Zf8');

console.log('\n9. 適法性の説明が指す先は実在し、前提の事実は崩れていない');
{
  const t = read('policies/legality.md');
  const readme = read('README.md');
  const refs = [...t.matchAll(/\]\(\.\/(\w+)\.md\)(?:「([^」]+)」)?/g)];
  const bad = refs.filter(([, f, sec]) => !fs.existsSync(path.join(ROOT, 'policies', f + '.md')) || (sec && !read('policies/' + f + '.md').includes('\n## ' + sec + '\n')))
    .map(([m]) => m);
  ok('規程への参照（' + refs.length + ' 件）が、実在する頁と節を指す', refs.length > 0 && bad.length === 0, bad.join(' / '));
  const lawArts = [...t.matchAll(/王国基本法((?:第[一二三四五六七八九十]+条・?)+)/g)].flatMap((m) => [...m[1].matchAll(/第([一二三四五六七八九十]+)条/g)].map((x) => x[1]));
  ok('引いた基本法の条（' + new Set(lawArts).size + ' 条）が README にある', lawArts.length > 0 && lawArts.every((a) => readme.includes('**第' + a + '条（')), lawArts.join(','));
  ok('引いた十則の五が README にある', !t.includes('十則の五') || readme.includes('五　金を取るな。'));
  const pay = /paypal|stripe\.com|patreon|ko-fi|buymeacoffee|fanbox|gumroad|opencollective|github\.com\/sponsors|booth\.pm/i;
  const files = ['README.md', 'KNIGHTS.md', ...B.POLICIES.map((p) => 'policies/' + p + '.md'), '.github/ISSUE_TEMPLATE/knighting.yml',
    ...walk(path.join(ROOT, 'site')).filter((x) => x.endsWith('.html')).map((x) => 'site/' + x)];
  const hit = files.filter((f) => pay.test(read(f)));
  ok('お金を受け取る導線がどこにもない（' + files.length + ' ファイル）', hit.length === 0 && !fs.existsSync(path.join(ROOT, '.github', 'FUNDING.yml')), hit.join(', '));
  ok('利用規約と免責事項が適法性の説明へつなぐ', read('policies/terms.md').includes('[適法性の説明](./legality.md)') && read('policies/disclaimer.md').includes('[適法性の説明](./legality.md)'));
}

console.log('\n10. 王の正誤表');
{
  const t = read('ERRATA.md');
  const readme = read('README.md');
  const rows = t.split('\n').filter((l) => /^\| \d+ \|/.test(l)).map((l) => l.split(' | ').map((c) => c.replace(/^\| |\s\|$/g, '')));
  ok('冒頭で創作だと断る', t.includes('> これは創作であり、遊びです。'));
  ok('番が 1 から欠けずに続き（' + rows.length + ' 件）、どれにも記した日がある',
    rows.length > 0 && rows.every((r, i) => r[0] === String(i + 1) && /^\d{4}-\d{2}-\d{2}$/.test(r[1])));
  const frozen = rows.filter((r) => r[2].startsWith('建国の宣言'));
  const gone = frozen.filter((r) => !readme.includes(r[3]));
  ok('建国の宣言の誤り（' + frozen.length + ' 件）は、宣言の中にそのまま残っている（凍った文を書き換えていない）', gone.length === 0, gone.map((r) => r[0]).join(','));
  ok('README と名称と権利が正誤表へつなぐ', readme.includes('[王の正誤表](ERRATA.md)') && read('policies/names.md').includes('[王の正誤表](../ERRATA.md)'));
}

console.log('\n11. 配色（WCAG の比）');
{
  const css = (/<style>([\s\S]*?)<\/style>/.exec(read('site/index.html')) || [])[1] || '';
  const tok = (s) => Object.fromEntries([...(s || '').matchAll(/--(\w+): (#[0-9a-f]{6})/g)].map((m) => [m[1], m[2]]));
  const light = tok((/^:root \{([^}]*)\}/m.exec(css) || [])[1]);
  const dark = tok((/prefers-color-scheme: dark\) \{ :root \{([^}]*)\}/.exec(css) || [])[1]);
  const lum = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const TEXT = [['fg', 'bg'], ['muted', 'bg'], ['accent', 'bg'], ['fg', 'notice'], ['accent', 'notice'], ['muted', 'notice']];
  const RING = [['gold', 'bg'], ['gold', 'notice']];
  for (const [name, t] of [['明るい配色', light], ['暗い配色', dark]]) {
    const low = TEXT.filter(([f, b]) => !(t[f] && t[b] && ratio(t[f], t[b]) >= 4.5)).map(([f, b]) => f + '/' + b);
    ok(name + '：文字と背景の組（' + TEXT.length + ' 組）がどれも 4.5:1 以上', Object.keys(t).length > 0 && low.length === 0, low.join(', '));
    const lowRing = RING.filter(([f, b]) => !(t[f] && t[b] && ratio(t[f], t[b]) >= 3)).map(([f, b]) => f + '/' + b);
    ok(name + '：フォーカスの枠と背景の組（' + RING.length + ' 組）がどれも 3:1 以上', lowRing.length === 0, lowRing.join(', '));
  }
  const literal = css.replace(/^:root \{[^}]*\}/m, '').replace(/prefers-color-scheme: dark\) \{ :root \{[^}]*\}/, '').match(/#[0-9a-fA-F]{3,8}\b/g) || [];
  ok('色はすべて二つの配色の変数から取る（地の色を書き込んでいない）', literal.length === 0, literal.join(' '));
}

console.log('\n12. 受付と安全の知らせ');
{
  const cfg = read('.github/ISSUE_TEMPLATE/config.yml');
  const req = read('.github/ISSUE_TEMPLATE/request.yml');
  const labels = read('.github/workflows/labels.yml');
  ok('様式を使わない issue を開けない', /^blank_issues_enabled: false$/m.test(cfg));
  const used = ['knighting.yml', 'request.yml'].flatMap((f) => JSON.parse((/^labels: (\[.*\])$/m.exec(read('.github/ISSUE_TEMPLATE/' + f)) || [, '[]'])[1]));
  ok('様式が使うラベル（' + used.length + ' 個）を、ラベルの workflow がそろえる', used.length > 0 && used.every((l) => labels.includes('gh label create "' + l + '"')), used.join(','));
  const rq = read('policies/requests.md');
  const kinds = ((/## 求めることができるもの\n\n([\s\S]*?)\n\n/.exec(rq) || [])[1] || '').split('\n').filter((l) => l.startsWith('- '));
  const opts = [...req.matchAll(/^        - (.+)$/gm)].map((m) => m[1]);
  ok('求めの様式の種類が、規程の「求めることができるもの」（' + kinds.length + ' 件）と非公開の連絡を覆う', kinds.length === 6 && opts.length === kinds.length + 1 && opts.includes('非公開の連絡を求める'), opts.join(' / '));
  const sec = read('SECURITY.md');
  ok('SECURITY.md が冒頭で創作だと断り、非公開の手順へ案内する', sec.includes('> これは創作であり、遊びです。') && sec.includes('template=request.yml') && sec.includes('「非公開の連絡を求める」'));
  const days = (s) => (/(\d+) 日以内に答える/.exec(s) || [])[1];
  ok('答えるまでの日数が、SECURITY.md と規程で同じ（' + days(rq) + ' 日）', days(rq) && days(sec) === days(rq));
  ok('求めの規程が様式と SECURITY.md へつなぐ', rq.includes('template=request.yml') && rq.includes('[安全の問題の知らせ方](../SECURITY.md)'));
}

console.log('\n13. リンク切れ（リポジトリの中を指すもの）');
{
  const docs = ['README.md', 'KNIGHTS.md', 'ERRATA.md', 'SECURITY.md', ...fs.readdirSync(path.join(ROOT, 'policies')).filter((f) => f.endsWith('.md')).map((f) => 'policies/' + f)];
  const ymls = fs.readdirSync(path.join(ROOT, '.github', 'ISSUE_TEMPLATE')).map((f) => '.github/ISSUE_TEMPLATE/' + f);
  const heads = (f) => read(f).split('\n').filter((l) => /^#{2,3} /.test(l)).map((l) => l.replace(/^#+ /, ''));
  const exists = (rel) => fs.existsSync(path.join(ROOT, rel));
  const bad = [];
  let n = 0;
  const absolute = (u, from) => {
    let m;
    if ((m = /^https:\/\/github\.com\/cpsbvbng26-dotcom\/nusquama\/blob\/main\/([^?#)\s]+)/.exec(u))) { n++; if (!exists(decodeURIComponent(m[1]))) bad.push(from + ' → ' + u); }
    else if ((m = /^https:\/\/github\.com\/cpsbvbng26-dotcom\/nusquama\/issues\/new\?template=([\w.-]+)/.exec(u))) { n++; if (!exists('.github/ISSUE_TEMPLATE/' + m[1])) bad.push(from + ' → ' + u); }
    else if ((m = /^https:\/\/nusquama\.vercel\.app\/([^?#)\s]*)/.exec(u))) { n++; if (!exists('site/' + (m[1] || 'index.html'))) bad.push(from + ' → ' + u); }
  };
  for (const f of docs) {
    const t = read(f);
    for (const m of t.matchAll(/\]\(([^)\s]+)\)(?:の?「([^」]+)」)?/g)) {
      const [, href, sec] = m;
      if (/^https?:/.test(href)) { absolute(href, f); continue; }
      if (/^(mailto:|#)/.test(href)) continue;
      n++;
      const target = path.posix.normalize(path.posix.join(path.posix.dirname(f), href.split('#')[0]));
      if (!exists(target)) { bad.push(f + ' → ' + href); continue; }
      if (sec && target.endsWith('.md') && !heads(target).includes(sec)) bad.push(f + ' → ' + href + '「' + sec + '」');
    }
    for (const m of t.matchAll(/<(https:\/\/[^>\s]+)>/g)) absolute(m[1], f);
  }
  for (const f of ymls) for (const m of read(f).matchAll(/https:\/\/[^\s"')]+/g)) absolute(m[0], f);
  ok('リポジトリの中とサイトを指すリンクと節（' + n + ' 件）が、どれも実在する', n > 0 && bad.length === 0, bad.join(' / '));
}

console.log('\n14. GitHub Actions の版');
{
  const wf = fs.readdirSync(path.join(ROOT, '.github', 'workflows')).map((f) => read('.github/workflows/' + f)).join('\n');
  const old = [...wf.matchAll(/uses: (actions\/(?:checkout|setup-node)@v(\d+))/g)].filter((m) => Number(m[2]) < 5).map((m) => m[1]);
  ok('checkout と setup-node は Node.js 24 で動く v5 以上', old.length === 0, old.join(', '));
  ok('Dependabot が GitHub Actions の版を見る', /package-ecosystem: github-actions/.test(read('.github/dependabot.yml')));
}

console.log('\n15. 規程の英語版（日本語の版を正とする訳）');
{
  const date = (s, re) => (re.exec(s) || [])[1];
  const count = (s, re) => (s.match(re) || []).length;
  for (const p of B.EN) {
    const ja = read('policies/' + p + '.md'), en = read('policies/' + p + '.en.md');
    const html = read('site/policies/' + p + '.en.html'), jaHtml = read('site/policies/' + p + '.html');
    ok(p + '.en.md：日本語の版を正とすると断り、その版へつなぐ', en.includes('This is an English translation. The [Japanese version](./' + p + '.md) governs; if the two differ, the Japanese version applies.'));
    const dj = date(ja, /^最終更新：(\d{4}-\d{2}-\d{2})。$/m), de = date(en, /^Last updated: (\d{4}-\d{2}-\d{2})\.$/m);
    ok(p + '.en.md：最終更新の日が日本語の版と同じ（' + dj + '）', dj && dj === de, de);
    ok(p + '.en.md：節の数が日本語の版と同じ（## ' + count(ja, /^## /gm) + '、### ' + count(ja, /^### /gm) + '）',
      count(ja, /^## /gm) === count(en, /^## /gm) && count(ja, /^### /gm) === count(en, /^### /gm));
    ok(p + '.en.html：lang が en で、日本語の頁と互いに hreflang で指し合う',
      html.includes('<html lang="en">') && html.includes('hreflang="ja" href="' + B.BASE + 'policies/' + p + '.html"') && jaHtml.includes('hreflang="en" href="' + B.BASE + 'policies/' + p + '.en.html"'));
  }
  const mustEn = {
    'policies/terms.en.md': ['It is not a state. It has no territory, people, government, currency, passports or nationality, and it claims no sovereignty and no land.',
      'Nusquama charges no one anything.', 'Nusquama means no harm. It does not aim to deceive anyone or to hurt anyone.', 'Disputes are to be settled by agreement first.',
      'A dispute not settled by agreement goes, according to the amount in dispute, to the Utsunomiya District Court or the Utsunomiya Summary Court, as the exclusive agreed court of first instance.'],
    'policies/disclaimer.en.md': ['Where the Japanese Consumer Contract Act applies, the previous sentence does not apply.', 'Knighting is not the award of a real honour.', 'Claude is neither a knight nor a king, and is not an author of Nusquama.'],
    'policies/legality.en.md': ['This page sets out the operator\'s understanding; it is neither legal advice nor a guarantee.', 'It has not been reviewed by a lawyer.', 'This is not a legal guarantee. If the facts relied on change, so does the conclusion.'],
  };
  for (const [f, list] of Object.entries(mustEn)) {
    const miss = list.filter((x) => !read(f).includes(x));
    ok(f + ' の約束がそろっている（' + list.length + ' 文）', miss.length === 0, miss.join(' / '));
  }
  ok('README が英語版のすべてへつなぐ', B.EN.every((p) => read('README.md').includes('(policies/' + p + '.en.md)')));
}

console.log('\n' + '-'.repeat(56));
if (fails.length) { console.log(pass + ' 件が通り、' + fails.length + ' 件が通りませんでした。'); process.exit(1); }
console.log(pass + ' 件すべて通りました。');

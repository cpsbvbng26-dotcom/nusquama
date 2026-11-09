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
  /* 2026-11-22 から、願い出は日本に住む人に限る。国籍は問わない。利用規約で予告する（不利な変更は効力の前に示す）。 */
  must['policies/knighting.md'].push('2026-11-22 から、願い出ることができるのは、日本に住んでいて、願い出のときに日本にいる人に限ります。国籍は問いません。', '日本の外に住む人は、国籍を問わず願い出ることができません。日本の外の法令を、国ごとに確かめきれないためです。',
    '日本に住んでいても、旅行・出張・留学などで日本の外にいるあいだは、願い出ることができません。外国の法令には、そこに住む人だけでなく、そこにいる人に及ぶものがあるためです。', '旅行などで日本に短く滞在しているだけの人は、日本に住んでいる人に当たりません。');
  must['policies/terms.md'].push('予告：2026-11-22 から、叙任を願い出ることができるのは、日本に住んでいて、願い出のときに日本にいる人に限ります。国籍は問いません');
  must['policies/legality.md'].push('- 2026-11-22 から、願い出は日本に住み、願い出のときに日本にいる人に限る。国籍は問わない。', '旅行・出張・留学などで日本の外にいるあいだの願い出も受けない');
  /* 気づくことができた事柄を見落とさない。リンク先にはっきり書かれた住む国や年齢は、尋ねてから決める。 */
  must['policies/knighting.md'].push('- 訂正のリンク先に、願い出た人が日本の外に住んでいることや、願い出のときに日本の外にいること、16 歳未満であることが、はっきり書かれていないこと。', 'ただし、訂正のリンク先にはっきり書かれていることは、見落としません。',
    '- 願い出の条件（年齢・住んでいる国）に当たらないことが、訂正のリンク先からはっきり読めるもの。');
  must['policies/legality.md'].push('- 本人の申告は確かめないが、訂正のリンク先に日本の外に住むことや 16 歳未満であることがはっきり書かれていれば、本人に尋ね、条件に当たると確かめられなければ叙任しない。');
  /* 事実でない印。してはいけないことに挙げ、知った時点で名簿から外し、信頼して受けたこと・公開に残ること・違約金を求めないことを書く。 */
  must['policies/terms.md'].push('- 願い出の様式で、事実でないことに印を付けること。', '印が事実でないと分かったときは、運営者は、知った時点で名簿から名を外します。',
    '運営者は、印を信頼して受け、確かめません。', '願い出た人に、違約金や、法令が定める以上の損害の賠償を求めることはありません。',
    '予告：2026-11-22 から、事実でない印を付けた GitHub アカウントからのその後の願い出を断ることがあります');
  // 確かめないことを確かめていると読ませない。国籍・年齢・住む国は本人の申告で、身分証は取らない。
  must['policies/knighting.md'].push('運営者は、国籍・住んでいる国・年齢・本名を確かめません。身分証も求めません。',
    'ヌスクァマは国籍を与えません。騎士は国民ではありません。', '年齢・住んでいる国・願い出のときにいる国は、様式の誓いへの印による本人の申告で受けます。');
  must['policies/legality.md'].push('- 国籍・年齢・住んでいる国・本名を確かめる書類を取らない。年齢・住んでいる国・願い出のときにいる国は、様式の誓いによる本人の申告で受ける。');
  // 国際法上の国家ではないこと。国籍を与えないので、誰の国籍も変えないこと。
  must['policies/terms.md'].push('国際法上の国家ではなく、国家としての承認を求めず、どの国とも外交の関係を結びません。');
  must['policies/legality.md'].push('- **当てはまらない理由**：取る「外国の国籍」がないので、叙任によって誰の国籍も変わらない。どの国の国籍法についても同じである。');
  // 16 歳未満と分かったら、求めを待たずに消す。CC BY 4.0 は著作権の外に及ばない。
  must['policies/knighting.md'].push('16 歳未満の人の願い出だったときは、求めがなくても、その issue も削除します。');
  must['policies/privacy.md'].push('16 歳未満の人の願い出だと分かったときは、求めがなくても、名簿から名を外し、その issue を削除します。');
  must['policies/names.md'].push('CC BY 4.0 が許すのは、著作権の及ぶ範囲のことだけです。商標などのほかの権利や、ほかの法令による制限には及びません。');
  must['policies/legality.md'].push('- **他人が書いたもの**：issue には、願い出た人や求めた人が文を書く。他人の名誉や個人情報を害する記載が書かれたときは、判断の前にただちに外す。');
  must['policies/disclaimer.md'].push('法令ごとの整理は[適法性の説明](./legality.md)にあります。弁護士の確認は受けていません。');
  /* 読むことを同意とみなさない。同意は願い出の様式で得る（民法第548条の2）。 */
  must['policies/terms.md'] = (must['policies/terms.md'] || []).concat(['サイトやリポジトリを読むことを、何かへの同意とはみなしません。']);
  /* 運営者の GitHub アカウントの二段階認証。運営者が 2026-11-08 に確かめた。 */
  must['policies/privacy.md'] = (must['policies/privacy.md'] || []).concat(['名簿とサイトを変えられるのは、リポジトリの持ち主である運営者の GitHub アカウントだけです。\nそのアカウントは、二段階認証を使っています。']);
  /* README「ほかの場所」に挙げていない投稿や発言は、この国の中に入らない。運営者のほかの活動とも関係がない。 */
  must['policies/disclaimer.md'].push('そこに挙げていない投稿や発言は、運営者が書いたものでも、この国の中に入りません。', 'ヌスクァマの規程はそこに及ばず、そこでの言葉はヌスクァマの約束ではありません。', 'その活動の中で、ヌスクァマの称号を使うことはありません。ヌスクァマも、その活動を推薦しません。');
  // 同じ名を使う者と紛れさせない。名は一般の語に由来し、誰かの名を借りていない。
  must['policies/disclaimer.md'].push('- 「ヌスクァマ」「Nusquama」「ネモ」「Nemo」など、同じ名や似た名を使う音楽グループ・作品・団体・人・商品');
  /* 独自のドメインを取る予定はない。ほかのドメインで名乗るサイトとは関係がない。 */
  must['policies/disclaimer.md'].push('ヌスクァマは、独自のドメインを取る予定がありません。サイトは https://nusquama.vercel.app/ だけです。', 'ほかのドメインにある、ヌスクァマや Nusquama を名乗るサイトは、この国の中に入らず、運営者とも関係がありません。');
  for (const [f, list] of Object.entries(must)) {
    const t = read(f);
    const miss = list.filter((x) => !t.includes(x));
    ok(f + ' の約束がそろっている（' + list.length + ' 文）', miss.length === 0, miss.join(' / '));
    ok(f + ' に最終更新の日がある', /^最終更新：\d{4}-\d{2}-\d{2}。$/m.test(t));
  }
  const readme = read('README.md');
  ok('README が、独自のドメインを取る予定がないと書く', readme.includes('独自のドメインを取る予定はありません。ヌスクァマのサイトは、この所在だけです。'));
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
  ok('vercel.json はヘッダーと、main だけを配信する決まりを持つ', Object.keys(cfg).join() === 'headers,git' && cfg.headers[0].source === '/(.*)'
    && JSON.stringify(cfg.git) === JSON.stringify({ deploymentEnabled: { '**': false, main: true } }));
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
  ok('様式が、日本に住んでいて、いま日本にいることの印を求め、その日と国籍を問わないことを書く', y.includes('- label: 日本に住んでいて、いま日本にいます（旅行・出張・留学などで日本の外にいるあいだは願い出られません。2026-11-22 から、この印のない願い出は受けません。国籍は問いません）。'));
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
      && read('site/' + d).includes('<meta property="og:site_name" content="' + (s.endsWith('.en.md') ? 'Regnum Nusquamae' : '無何有騎士王国ヌスクァマ') + '">')));
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
    'policies/terms.en.md': ['- Ticking a box in the application form for something that is not true', 'The operator relies on the ticked boxes in good faith and does not check them.', 'Nothing here asks an applicant for a penalty, or for damages beyond what the law provides.', 'Notice: from 2026-11-22, only people who live in Japan and are in Japan when they apply may apply for knighthood, whatever their nationality', 'It is not a state. It has no territory, people, government, currency, passports or nationality, and it claims no sovereignty and no land.',
      'Nusquama charges no one anything.', 'Nusquama means no harm. It does not aim to deceive anyone or to hurt anyone.', 'Disputes are to be settled by agreement first.',
      'A dispute not settled by agreement goes, according to the amount in dispute, to the Utsunomiya District Court or the Utsunomiya Summary Court, as the exclusive agreed court of first instance.'],
    'policies/disclaimer.en.md': ['Nusquama has no plan to obtain a domain of its own. Its only site is https://nusquama.vercel.app/.', 'A site under another domain that calls itself Nusquama is outside the kingdom and has no relation to the operator.', 'A post or statement not listed there is outside the kingdom, even if the operator wrote it.', 'The titles of Nusquama are not used in those activities, and Nusquama does not recommend them.', 'Where the Japanese Consumer Contract Act applies, the previous sentence does not apply.', 'Knighting is not the award of a real honour.', 'Claude is neither a knight nor a king, and is not an author of Nusquama.'],
    'policies/legality.en.md': ['This page sets out the operator\'s understanding; it is neither legal advice nor a guarantee.', 'It has not been reviewed by a lawyer.', 'This is not a legal guarantee. If the facts relied on change, so does the conclusion.',
      'It collects no documents to check nationality, age, country of residence or real name.'],
  };
  for (const [f, list] of Object.entries(mustEn)) {
    const miss = list.filter((x) => !read(f).includes(x));
    ok(f + ' の約束がそろっている（' + list.length + ' 文）', miss.length === 0, miss.join(' / '));
  }
  ok('README が英語版のすべてへつなぐ', B.EN.every((p) => read('README.md').includes('(policies/' + p + '.en.md)')));
}

console.log('\n16. 適法性の論理式・網羅・無矛盾・残る危険');
{
  const M = JSON.parse(read('verification/legal-matrix.json'));
  const leg = read('policies/legality.md');
  /* 法令の見出しは「法令ごとの整理」の中の ### だけ。表と行列の鍵が、一つ残らず一致すること。 */
  const part = leg.split('\n## 法令ごとの整理\n')[1].split('\n## ')[0];
  const heads = [...part.matchAll(/^### (.+)$/gm)].map((m) => m[1]);
  const keys = Object.keys(M.laws);
  ok('論理式の行列が、適法性の説明の法令の見出しと一つ残らず一致する（' + heads.length + ' 項）',
    heads.length > 0 && heads.length === keys.length && heads.every((h) => keys.includes(h)),
    heads.filter((h) => !keys.includes(h)).concat(keys.filter((k) => !heads.includes(k))).join(' / '));
  /* 選言のどの連言でも、否定した要件がその連言の要件の一つで、否定する文が実在すること。
   * 義務の法令は、義務ごとに、それを満たす文が実在すること。 */
  const bad = [];
  let forms = 0, duties = 0;
  for (const [law, d] of Object.entries(M.laws)) {
    if (!(d.forms || []).length && !(d.duties || []).length) bad.push(law + '：要件も義務もない');
    for (const f of d.forms || []) {
      forms++;
      if (!f.elements.includes(f.denied)) bad.push(law + '：否定した要件が要件の中にない（' + f.denied + '）');
      if (!(f.by || []).length) bad.push(law + '：否定する文がない（' + f.denied + '）');
      for (const b of f.by || []) if (!read(b.file).includes(b.text)) bad.push(law + '：' + b.file + ' に文がない —— ' + b.text);
    }
    for (const u of d.duties || []) {
      duties++;
      if (!(u.by || []).length) bad.push(law + '：義務を満たす文がない（' + u.duty + '）');
      for (const b of u.by || []) if (!read(b.file).includes(b.text)) bad.push(law + '：' + b.file + ' に文がない —— ' + b.text);
    }
  }
  ok('どの連言でも要件の一つが否定され、どの義務にも満たす文がある（連言 ' + forms + '、義務 ' + duties + '）', bad.length === 0, bad.join(' / '));
  /* 網羅：行う者と行いのすべての組に、項か「起こらない」理由がある。 */
  const holes = [];
  for (const a of M.actors) for (const v of M.acts) {
    const c = (M.coverage[a] || {})[v];
    if (Array.isArray(c)) { if (!c.length || c.some((h) => !keys.includes(h))) holes.push(a + '×' + v); }
    else if (!(c && typeof c['起こらない'] === 'string' && c['起こらない'].length)) holes.push(a + '×' + v);
  }
  ok('行う者と行いの組 ' + M.actors.length * M.acts.length + ' 通りのすべてに、項か起こらない理由がある', holes.length === 0, holes.join(' / '));
  /* 無矛盾：「この国の中」を定めるのは利用規約の一か所だけ。括弧で範囲を言い直す書き方を残さない。 */
  const pol = B.POLICIES.map((p) => 'policies/' + p + '.md').concat(B.EN.map((p) => 'policies/' + p + '.en.md'));
  const redef = pol.filter((f) => /この国（[^）]*）の外|outside the kingdom \(/.test(read(f)));
  ok('「この国の中」の範囲を、頁ごとに言い直していない', redef.length === 0, redef.join(', '));
  ok('「この国の中」を利用規約の一か所で定めている',
    read('policies/terms.md').split('この国の中とは、').length === 2 && pol.filter((f) => read(f).includes('この国の中とは、')).length === 1);
  /* 残る危険の表：積が掛け算どおりで、積の大きい順に並び、英語の訳と数が同じ。 */
  const rows = (t, head) => {
    const sec = t.split(head)[1].split('\n## ')[0];
    return [...sec.matchAll(/^\| (\d+) \| [^|]+ \| (\d) \| (\d) \| (\d) \|/gm)].map((m) => m.slice(1, 5).map(Number));
  };
  const rj = rows(leg, '\n## 審査の方法と残る危険\n'), re = rows(read('policies/legality.en.md'), '\n## How this was reviewed, and the risks that remain\n');
  ok('残る危険の表がある（' + rj.length + ' 行）', rj.length >= 5);
  ok('残る危険の表：番が 1 から続き、起こりやすさと重さが 1〜3、積が掛け算どおり',
    rj.every(([n, l, s, x], i) => n === i + 1 && l >= 1 && l <= 3 && s >= 1 && s <= 3 && x === l * s),
    rj.filter(([n, l, s, x], i) => !(n === i + 1 && x === l * s)).map((r) => r.join(',')).join(' / '));
  ok('残る危険の表：積の大きい順に並んでいる', rj.every((r, i) => i === 0 || rj[i - 1][3] >= r[3]));
  ok('残る危険の表：英語の訳と、行の数も数もすべて同じ', JSON.stringify(rj) === JSON.stringify(re), JSON.stringify(re));
}

console.log('\n17. 条文と規約の見張り');
{
  const S = JSON.parse(read('verification/statutes.json'));
  const leg = read('policies/legality.md');
  /* 適法性の説明が「〇〇法第N条」と挙げた条は、一つ残らず見張りの表にあること。 */
  const cited = new Set();
  for (const m of leg.matchAll(/([一-龥]+法)((?:・?第\d+条(?:の\d+)?(?:第\d+項)?(?:第\d+号)?)+)/g)) {
    if (m[1] === '同法') continue; // 直前に挙げた法を指す。その法の条として、すでに数えている。
    for (const a of m[2].matchAll(/第(\d+)条(?:の(\d+))?/g)) cited.add(m[1] + ' ' + a[1] + (a[2] ? '_' + a[2] : ''));
  }
  const have = new Set(S.statutes.map((e) => e.name + ' ' + e.article));
  const miss = [...cited].filter((c) => !have.has(c));
  ok('適法性の説明が挙げた条（' + cited.size + '）は、すべて見張りの表にある', cited.size >= 20 && miss.length === 0, miss.join(' / '));
  const unrec = S.statutes.filter((e) => !/^[0-9a-f]{64}$/.test(e.sha256 || '') || !e.title || !/^\d{3}(?:AC\d{10}|CO\d{10}|M\d{11})$/.test(e.law_id)).map((e) => e.name + ' ' + e.label);
  ok('見張りの表のすべての条（' + S.statutes.length + '）に、法令番号・法令名・条文の SHA-256 が記してある', unrec.length === 0, unrec.join(' / '));
  ok('GitHub の規約（' + S.policies.length + '）に、最新のコミットが記してある', S.policies.length >= 2 && S.policies.every((p) => /^[0-9a-f]{40}$/.test(p.commit || '')));
  const wf = read('.github/workflows/statutes.yml');
  ok('見張りは週に一度走り、issue を開く権限を持ち、PR でも走る',
    /cron: '\d+ \d+ \* \* \d'/.test(wf) && wf.includes('issues: write') && wf.includes('pull_request:') && wf.includes('node tools/statutes.js'));
  ok('見張りが開く issue のラベルを、ラベルの仕事が作る', S.labels.every((l) => read('.github/workflows/labels.yml').includes('gh label create "' + l + '"')));
  ok('適法性の説明が、見張りのことを書いている（日本語と英語）',
    leg.includes('審査は一度きりではありません。') && read('policies/legality.en.md').includes('The review is not done once only.'));
}

console.log('\n18. 義務を項ごとに規程の文と結ぶ表');
{
  const T = JSON.parse(read('verification/duties.json'));
  const S = JSON.parse(read('verification/statutes.json'));
  const miss = [];
  for (const u of T.duties) {
    if (!(u.by || []).length) miss.push(u.law + '第' + u.article + '条：結ぶ文がない');
    for (const b of u.by || []) if (!read(b.file).includes(b.text)) miss.push(u.law + '第' + u.article + '条' + (u.paragraph ? '第' + u.paragraph + '項' : '') + '：' + b.file + ' に文がない —— ' + b.text);
  }
  ok('どの義務（' + T.duties.length + '）にも、それを満たす文が規程や様式にある', T.duties.length >= 30 && miss.length === 0, miss.join(' / '));
  /* 表の条はどれも見張られ、見張っている個人情報保護法とその施行令・施行規則の条は、どれも表にある。 */
  const watched = new Set(S.statutes.map((e) => e.name + ' ' + e.article));
  const unwatched = [...new Set(T.duties.map((u) => u.law + ' ' + u.article))].filter((k) => !watched.has(k));
  ok('表の条は、どれも条文の見張りの表にある', unwatched.length === 0, unwatched.join(' / '));
  const inTable = new Set(T.duties.map((u) => u.law + ' ' + u.article));
  const orphan = S.statutes.filter((e) => /^個人情報保護法/.test(e.name) && !inTable.has(e.name + ' ' + e.article)).map((e) => e.name + ' ' + e.article);
  ok('見張っている個人情報保護法の条は、どれも表で規程の文と結ばれている', orphan.length === 0, orphan.join(' / '));
}

console.log('\n19. 見張りが PR を作り、ラベル「記す」で検査を通してから記す。公開中のサイトを main と照らす');
{
  const St = require('../tools/statutes.js');
  const Rc = require('../tools/record.js');
  const Lv = require('../tools/live.js');
  const S = JSON.parse(read('verification/statutes.json'));
  ok('変わった条文を、文ごとの差分で示す', St.diff('第一条 A。第二条 B。', '第一条 A。第二条 C。') === '  第一条 A。\n- 第二条 B。\n+ 第二条 C。');
  const res = [{ kind: 'statute', i: 0, label: 'X 1', state: 'changed', value: 'h2', title: 'T', text: '甲。乙。' }, { kind: 'policy', i: 0, label: 'P', state: 'same' }];
  const conf = { statutes: [{ sha256: 'h1', title: 'T' }], policies: [{ commit: 'c1' }], recorded: '2026-11-08' };
  const pr = St.proposal(res, conf, { 'X 1': '甲。' }, '2026-11-20');
  ok('提案は新しい値と条文を記し、差分を示し、ラベル「記す」を案内する。新しいものが無ければ何も作らない',
    pr.changed === 1 && pr.conf.statutes[0].sha256 === 'h2' && pr.conf.recorded === '2026-11-20' && pr.body.includes('```diff\n  甲。\n+ 乙。\n```') && pr.body.includes('ラベル「記す」')
    && St.proposal([Object.assign({}, res[0], { state: 'same' })], conf, { 'X 1': '甲。乙。' }, '2026-11-20') === null && S.text.prFoot.includes('マージのボタンは使いません'));
  ok('「記す」は見張りの枝の、見張りが書くファイルだけを取り込み、マージの題をこのリポジトリの形にし、ワークフローを共著者として名乗る',
    Rc.allowed('statutes/record', ['verification/statutes.json', 'verification/statutes-texts.json']) && !Rc.allowed('statutes/record', ['verification/statutes.json', 'policies/terms.md'])
    && Rc.mergeTitle(31, '記す') === 'Merge pull request #31: 記す' && read('tools/record.js').includes("Co-authored-by: ' + BOT"));
  ok('PR を作れないリポジトリでは、提案を issue に置き、PR を一押しで作るリンクを添える。記せばその issue も閉じる',
    read('tools/statutes.js').includes("if (!/HTTP 403/.test(e.message)) throw e;") && S.text.openPr.includes('{link}') && S.text.openPr.includes('ラベル「記す」')
    && St.PROPOSAL === '<!-- statutes-proposal -->' && read('tools/record.js').includes("startsWith('<!-- statutes-proposal -->')"));
  const rw = read('.github/workflows/record.yml');
  ok('ラベルの仕事は、持ち主の付けた「記す」に、見張りの枝でだけ応じる。ラベルはラベルの仕事が作る',
    rw.includes("github.event.label.name == '記す'") && rw.includes('github.event.sender.login == github.repository_owner') && rw.includes("github.event.pull_request.head.ref == 'statutes/record'")
    && read('.github/workflows/labels.yml').includes('gh label create "記す"') && read('.github/workflows/statutes.yml').includes('pull-requests: write'));
  const files = Lv.served(fs.readdirSync(path.join(ROOT, 'site'), { recursive: true }).filter((f) => fs.statSync(path.join(ROOT, 'site', f)).isFile()).map((f) => f.split(path.sep).join('/')));
  ok('公開中のサイトの照合は、site/ のファイル（' + files.length + ' 件）を Vercel の設定を除いてすべて取り寄せる',
    files.length >= 20 && files.every((x) => x.url.startsWith('https://nusquama.vercel.app/')) && !files.some((x) => x.file === 'vercel.json') && read('.github/workflows/live.yml').includes('node tools/live.js'));
  ok('適法性の説明が、PR とラベル「記す」のことを書いている（日本語と英語）',
    read('policies/legality.md').includes('ラベル「記す」を付けます') && read('policies/legality.en.md').includes('adds the label 記す'));
}

console.log('\n20. 言語モデルを通して調べる人に、規程をそのままの言葉で渡す（llms.txt と llms-full.txt）');
{
  const lt = read('site/llms.txt'), lf = read('site/llms-full.txt');
  const links = [...lt.matchAll(/\]\((https:\/\/nusquama\.vercel\.app\/[^)#]*)/g)].map((m) => m[1].replace(B.BASE, ''));
  const missing = links.filter((u) => u !== '' && !fs.existsSync(path.join(ROOT, 'site', u)));
  ok('llms.txt は題・断り・節・リンクの形で、規程が優先すると書き、日本語の版が正と書く',
    lt.startsWith('# 無何有騎士王国ヌスクァマ（Regnum Nusquamae）\n\n> ' + B.NOTICE + '\n') && lt.includes(B.NOTICE_EN)
    && lt.includes('このファイルと規程が食い違うときは、規程に従います。') && lt.includes('日本語の版が正で、英語の頁は訳です。'));
  ok('願い出ることができる人・費用・称号の扱い・求め方の節を、規程から一字一句そのまま収める（リンクだけをサイトの所在に直す）',
    [['policies/knighting.md', '願い出ることができる人'], ['policies/terms.md', '費用'], ['policies/terms.md', '称号の扱い'], ['policies/requests.md', '求め方']]
      .every(([f, h]) => lt.includes(B.section(f, h)) && B.section(f, h).startsWith('## ' + h + '\n'))
    && lt.includes('2026-11-22 から、願い出ることができるのは、日本に住んでいて、願い出のときに日本にいる人に限ります。'));
  ok('リンクする頁はどれも作られていて、すべての頁と llms-full.txt にリンクする（' + links.length + ' 件）', missing.length === 0
    && B.SOURCES.every(([, d]) => links.includes(d === 'index.html' ? '' : d)) && links.includes('llms-full.txt'), missing.join(', '));
  ok('llms-full.txt は、すべての頁の元の Markdown を、所在とともに一字一句そのまま収める（' + B.SOURCES.length + ' 件）',
    B.SOURCES.every(([s, d]) => lf.includes('Source: ' + B.BASE + (d === 'index.html' ? '' : d) + '\n\n' + read(s).trim() + '\n')) && (lf.match(/^Source: /gm) || []).length === B.SOURCES.length);
  ok('研究の系列の名もリンクも、どちらにも書かない', !/sophaxis|researcher-profile|cpsbvbng26-dotcom\.vercel|trinity|orcid/i.test(lt + lf));
  const vj = JSON.parse(read('site/vercel.json'));
  ok('どちらも UTF-8 の文字の文書として配り、robots.txt はすべてのクローラーに読ませる',
    vj.headers.some((h) => h.source === '/(llms|llms-full)\\.txt' && h.headers.some((x) => x.key === 'Content-Type' && x.value === 'text/plain; charset=utf-8')) && read('site/robots.txt').startsWith('User-agent: *\nAllow: /\n'));
  ok('README が二つのファイルのことを書く', read('README.md').includes('[llms.txt](https://nusquama.vercel.app/llms.txt)') && read('README.md').includes('食い違うときは規程に従います。'));
}

console.log('\n21. GitHub と Vercel の規約が定めることを、原文で読んだ日・各文書の日付・条とともに書く');
{
  const tj = read('policies/terms.md'), te = read('policies/terms.en.md'), pj = read('policies/privacy.md');
  const links = ['https://docs.github.com/en/site-policy/github-terms/github-terms-of-service', 'https://docs.github.com/en/site-policy/acceptable-use-policies/github-acceptable-use-policies',
    'https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement', 'https://vercel.com/legal/terms', 'https://vercel.com/legal/acceptable-use-policy', 'https://vercel.com/legal/privacy-notice'];
  ok('利用規約（日本語と英語）が、六つの文書をリンクとともに挙げ、読んだ日と各文書の日付を書く', [tj, te].every((t) => links.every((u) => t.includes('(' + u + ')')) && t.includes('2026-11-09')
    && ['2026-04-27', '2026-10-19', '2026-04-21', '2026-06-01'].every((d) => t.includes(d))) && tj.includes('\n## GitHub と Vercel の規約\n') && te.includes("\n## GitHub's and Vercel's terms\n"));
  const facts = [['（GitHub の利用規約 B.3）', '(GitHub Terms, B.3)'], ['（GitHub の利用規約 C）', '(GitHub Terms, C)'], ['（GitHub の利用規約 D.2・M.3）', '(GitHub Terms, D.2 and M.3)'],
    ['（GitHub の利用規約 D.4）', '(GitHub Terms, D.4)'], ['（GitHub の利用規約 J.3）', '(GitHub Terms, J.3)'], ['（Vercel の利用規約 第 4 条）', '(Vercel Terms, section 4)'],
    ['（Vercel の利用規約 第 3 条）', '(Vercel Terms, section 3)'], ['（Vercel の利用規約 第 3 条・第 8 条）', '(Vercel Terms, sections 3 and 8)'],
    ['（GitHub の利用規約 O・P、Vercel の利用規約 第 20 条・第 21 条）', '(GitHub Terms, O and P; Vercel Terms, sections 20 and 21)'], ['（GitHub の利用規約 S.1、Vercel の利用規約 第 23 条）', '(GitHub Terms, S.1; Vercel Terms, section 23)']];
  const miss = facts.filter(([j, e]) => !tj.includes(j) || !te.includes(e)).map(([j]) => j);
  ok('年齢・内容の決まり・削除・公開の内容と AI の学習・Hobby プラン・モデルの学習・許容される利用・現状のまま・準拠法を、条とともに書く（' + facts.length + ' 件、日本語と英語）', miss.length === 0, miss.join(' / '));
  ok('非商用であること、サイトが予告なく見られなくなりうること、モデルの学習はチームの設定で止めない限り行われることを書く',
    tj.includes('ヌスクァマは非商用です。') && tj.includes('サイトが予告なく見られなくなることがあります。') && tj.includes('アカウントのチームの設定でこれを止めたときは別です')
    && te.includes('Nusquama is non-commercial.') && te.includes('so the site can go offline without warning') && te.includes('unless the account turns this off in its team settings'));
  ok('個人情報の取り扱いが、GitHub と Vercel が自ら公開の内容を使う二つの場合を書く',
    pj.includes('AI の機能と関連会社のモデルの学習に使うことを認めています（D.4）') && pj.includes('アカウントのチームの設定でこれを止めたときは別です（第 3 条）'));
  ok('AI の学習への利用で個人情報が心配な方は願い出ないよう、叙任の規程と個人情報の取り扱いで断り、辞退できることを書く',
    read('policies/knighting.md').includes('個人情報が心配な方は、願い出ないでください。') && pj.includes('これらの利用で個人情報が心配な方は、願い出ないでください。') && pj.includes('いつでも名簿からの辞退を求めることができ'));
  ok('運営者が Vercel のモデルの学習を止めたとは、確かめるまで書かない', ![tj, te, pj].some((t) => /止めています|止めました|has turned (this|it) off|opted out/.test(t)));
  ok('免責事項（日本語と英語）が、二つのサービスが現状のままであることを書き、利用規約を指す', read('policies/disclaimer.md').includes('サービスを「現状のまま」保証なしに提供し')
    && read('policies/disclaimer.en.md').includes('GitHub and Vercel each provide their services "as is"'));
}

console.log('\n22. 版図の広さと、王の正誤表・騎士の名簿の新着の配信');
{
  const B = require('../build.js');
  const errata = read('ERRATA.md').split('\n').filter((l) => /^\| \d+ \|/.test(l));
  const knights = read('KNIGHTS.md').split('\n').filter((l) => /^\| \d+ \|/.test(l));
  const line = '版図のうち、王の正誤表に記した誤りは ' + errata.length + ' 件です。基本法第三条により、版図は、王が誤りを一つ認めるたびに広がります。';
  ok('版図のうち、王の正誤表に記した誤りの数（' + errata.length + ' 件）を、正誤表の表から数えてトップと llms.txt に出す',
    B.domain() === errata.length && errata.length >= 9 && read('build.js').includes("const domain = () => tableRows('ERRATA.md').length;") && read('site/index.html').includes('<p class="notice">' + line + ' <a href="errata.html">王の正誤表</a></p>') && read('site/llms.txt').includes(line)
    && read('README.md').includes('**第三条（版図）**　王国の版図は、王の本棚と、王が公にした正誤表とする。版図は、王が誤りを一つ認めるたびに広がる。'));
  const ex = read('site/errata.xml'), kx = read('site/knights.xml');
  ok('王の正誤表の新着の配信は、表の行ごとに一つの項目を持ち、日付と番号で引け、断りを添える',
    (ex.match(/<entry>/g) || []).length === errata.length && errata.every((r) => ex.includes('<id>' + B.BASE + 'errata.html#errata-' + r.split('|')[1].trim() + '</id>'))
    && ex.includes('<subtitle>' + B.NOTICE + '</subtitle>') && ex.includes('<link rel="self" href="' + B.BASE + 'errata.xml"/>') && ex.includes('<author><name>騎士王ネモ一世（創作の中の王）</name></author>'));
  ok('騎士の名簿の新着の配信は、名簿の行と同じ数の項目を持つ（いま ' + knights.length + ' 件）', (kx.match(/<entry>/g) || []).length === knights.length && kx.includes('<subtitle>' + B.NOTICE + '</subtitle>'));
  ok('日本語の頁は二つの配信を head で示し、正誤表と名簿の頁と README と llms.txt がリンクする',
    read('site/index.html').includes('<link rel="alternate" type="application/atom+xml" title="王の正誤表" href="' + B.BASE + 'errata.xml">')
    && read('site/errata.html').includes('<a href="errata.xml">新着の配信（Atom）</a>') && read('site/knights.html').includes('<a href="knights.xml">新着の配信（Atom）</a>')
    && read('README.md').includes('[errata.xml](https://nusquama.vercel.app/errata.xml)') && read('site/llms.txt').includes(B.BASE + 'knights.xml)'));
}

console.log('\n24. 建国の宣言・基本法・十則の英訳（日本語の版が正）');
{
  const B = require('../build.js');
  const ja = read('README.md'), en = read('founding.en.md');
  const jaArticles = (ja.match(/^\*\*第[一二三四五六七八九十]+条（[^）]+）\*\*/gm) || []).length;
  const enArticles = (en.match(/^\*\*Article \d+ \([^)]+\)\*\*/gm) || []).length;
  const jaPrecepts = (ja.match(/^[一二三四五六七八九十]　/gm) || []).length;
  const enPrecepts = (en.match(/^(I|II|III|IV|V|VI|VII|VIII|IX|X)\. /gm) || []).length;
  ok('基本法の条（' + jaArticles + '）と十則（' + jaPrecepts + '）を、同じ数だけ同じ順に訳す', jaArticles === 10 && enArticles === 10 && jaPrecepts === 10 && enPrecepts === 10
    && [...en.matchAll(/^\*\*Article (\d+) /gm)].map((m) => m[1]).join() === '1,2,3,4,5,6,7,8,9,10');
  ok('日本語の版が正であること、宣言は日付の付いた凍った文で書き換えないこと、正誤表の 1 と 3 が直すことを書く',
    en.includes('The [Japanese version](./README.md) governs; if the two differ, the Japanese version applies.') && en.includes('The declaration is a dated text, and it is not rewritten (Ten Precepts, II).')
    && en.includes('in entries 1 and 3 of [the King\'s Errata](./ERRATA.md)') && en.includes('Nemo I, the Knight King, 7 November 2026') && ja.includes('―― 騎士王ネモ一世　2026年11月7日'));
  ok('第一条・第六条・第八条の要と、第十条の削らない条を、日本語のとおりに訳す',
    en.includes('This country is a work of fiction. It is not related to any real state, royal house, order of knighthood, honour or title, and it has no territory, people, currency or passports.')
    && en.includes('Knighting is free of charge. It is not given in exchange for money, goods or services.') && en.includes('The titles of this country are used only within this country.')
    && en.includes('Articles 1, 6 and 8, however, are never removed.') && ja.includes('ただし、第一条・第六条・第八条は削らない。'));
  const html = read('site/founding.en.html');
  ok('英語の頁は英語の断りを先頭に出し、英語の頁どうしと README と llms.txt がつなぐ', /<html lang="en"/.test(html) && html.includes('<p class="notice">' + B.NOTICE_EN + '</p>')
    && read('site/policies/terms.en.html').includes('founding.en.html') && ja.includes('[Founding Declaration, Basic Law and Ten Precepts](founding.en.md)')
    && read('site/llms.txt').includes(B.BASE + 'founding.en.html)') && B.SOURCES.some(([s2]) => s2 === 'founding.en.md'));
}

console.log('\n' + '-'.repeat(56));
if (fails.length) { console.log(pass + ' 件が通り、' + fails.length + ' 件が通りませんでした。'); process.exit(1); }
console.log(pass + ' 件すべて通りました。');

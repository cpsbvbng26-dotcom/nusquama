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
    && readme.includes('いかなる実在の国家・王室・騎士団・叙勲・称号とも関係がなく') && readme.includes('> ここで贈る騎士の呼び名は、勲章・栄典・騎士の位ではなく、法的な効力もありません。') && !readme.includes('ここで授ける称号') && readme.includes('> 悪意はなく、法令を守って運営しています。'));
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
      '叙任の願い出の様式でこの規約に同意した人との間では、訴額に応じて、宇都宮地方裁判所または宇都宮簡易裁判所を、第一審の合意管轄裁判所とします。\nこの合意は専属的なものではありません。\nそれ以外の紛争と、様式で同意していない人との間の紛争は、法令の定める裁判所が管轄します。',
      '運営者がこの規約の及ぶ人に訴えを起こすときは、宇都宮地方裁判所・宇都宮簡易裁判所か、訴える相手の普通裁判籍の所在地を管轄する裁判所にだけ起こします。',
      '相手方が宇都宮地方裁判所または宇都宮簡易裁判所に訴えを起こしたときは、運営者は、どの紛争でも管轄を争いません。', '裁判所の合意は、叙任の願い出の様式で同意した人との間にだけ置きます（「準拠法と紛争」）。'],
    'policies/disclaimer.md': ['国際法上の国家ではなく、国家としての承認を求めず、どの国の領土も主張しません。', '叙任は、現実の栄誉の授与ではありません。', 'アーサー王伝説を題材とする小説・映画・ゲーム・アニメなどの作品と、その権利者', 'Claude は騎士でも王でもなく、ヌスクァマの著者でもありません。',
      '## 運営者の研究との関係\n\n' + B.SEPARATE + '\n', 'ヌスクァマの頁から運営者の研究の頁へはつながず、研究の頁からもヌスクァマへはつなぎません。'],
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
      '読むだけの人とは書面の合意がなく、ほかの紛争とあわせて、法令の定める裁判所が管轄する。', 'ただし、これは法的な保証ではありません。前提となる事実が変われば、結論も変わります。'],
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
  /* 2026-11-22 から、願い出は日本に住む人に限る。国籍は、イタリアの国籍を持つ人を除いて問わない。利用規約で予告する（不利な変更は効力の前に示す）。 */
  must['policies/knighting.md'].push('2026-11-22 から、願い出ることができるのは、日本に住んでいて、願い出のときに日本にいる人に限ります。イタリアの国籍を持つ人と、「外国の称号を縛る国」の国籍を持つ人を除き、国籍は問いません。', '2026-11-22 から、日本の外に住む人は、国籍を問わず願い出ることができません。日本の外の法令を、国ごとに確かめきれないためです。',
    '2026-11-22 から、日本に住んでいても、旅行・出張・留学などで日本の外にいるあいだは、願い出ることができません。外国の法令には、そこに住む人だけでなく、そこにいる人に及ぶものがあるためです。', '旅行などで日本に短く滞在しているだけの人は、日本に住んでいる人に当たりません。');
  must['policies/terms.md'].push('予告：2026-11-22 から、叙任を願い出ることができるのは、日本に住んでいて、願い出のときに日本にいる人に限ります。イタリアの国籍を持つ人と、外国の称号を縛る国の国籍を持つ人を除き、国籍は問いません');
  must['policies/legality.md'].push('- 2026-11-22 から、願い出は日本に住み、願い出のときに日本にいる人に限る。', '旅行・出張・留学などで日本の外にいるあいだの願い出も受けない');
  /* 2026-11-22 から、イタリアの国籍を持つ人（重国籍を含む）の願い出を受けない。理由は、常識に照らして場違いであることが先で、イタリアの 1951 年法律第 178 号第 8 条が次。
   * 限っても、及ぶおそれは減るだけで、なくならない。2026-11-12 に利用者が決めた。 */
  must['policies/knighting.md'].push('2026-11-22 から、イタリアの国籍を持つ人は、日本に住んでいても、ほかの国籍と重ねて持っていても、願い出ることができません。理由は二つです。',
    '一つめに、イタリアの国民が日本のミクロネーションの騎士になることは、常識に照らして、そもそも場違いです。', '二つめに、イタリアの 1951 年法律第 178 号第 8 条は、称号を使う者も罰し、授けたのが国外であっても及ぶとしています。',
    'この限りで、同条が及ぶおそれは減りますが、なくなりはしません');
  must['policies/terms.md'].push('予告：2026-11-22 から、イタリアの国籍を持つ人は、日本に住んでいても、ほかの国籍と重ねて持っていても、叙任を願い出ることができません');
  must['policies/legality.md'].push('- 2026-11-22 から、イタリアの国籍を持つ人（重国籍を含む）の願い出も受けない。理由は、イタリアの国民が日本のミクロネーションの騎士になるのは常識に照らして場違いであることと、上の条が届くいちばん現実の道が、称号を受けて使ったイタリアの国民であることである。',
    '- これらの限定によって、日本の外の法令が及ぶおそれは減るが、なくなるわけではない。');
  /* 良識の前提。2026-11-22 から、称号を遊びとして扱う人を前提とし、既にある禁止を守ることを指す。当たらなければ叙任せず、既にある取り消しの定めで取り消す。 */
  must['policies/knighting.md'].push('2026-11-22 から、叙任は、願い出る人が、称号を遊びとして扱う良識ある人であることを前提とします。',
    'この前提は、称号を創作の中でだけ使い、次の決まりを守ることを指します。', '- 称号を、人をだますために使わない。',
    '願い出た人が書いたことや訂正のリンク先から、この前提に当たらないことがはっきり分かったときは、叙任しません（「断ること」）。',
    '叙任した後に分かったときは、「辞退と取り消し」の定めにより、叙任を取り消します。', '取り消すときは、願い出の issue に、当たらなかった決まりだけを短く書き、人を評しません。',
    '- 2026-11-22 から、「良識の前提」に当たらないことが、願い出た人が書いたことや訂正のリンク先からはっきり読めるもの。');
  must['policies/terms.md'].push('予告：2026-11-22 から、叙任は、願い出る人が称号を遊びとして扱う良識ある人であることを前提とし、様式でこの前提に印のない願い出は受けません');
  must['policies/legality.md'].push('「良識の前提」（おそれは断たない）', '良識の前提（叙任の規程）も同じだが、おそれを断たない。');
  /* 気づくことができた事柄を見落とさない。リンク先にはっきり書かれた住む国や年齢は、尋ねてから決める。 */
  must['policies/knighting.md'].push('- 訂正のリンク先に、願い出た人が日本の外に住んでいることや、願い出のときに日本の外にいること、イタリアや「外国の称号を縛る国」の国籍を持つこと、16 歳未満であることが、はっきり書かれていないこと。', 'ただし、訂正のリンク先にはっきり書かれていることは、見落としません。',
    '- 願い出の条件（年齢・住んでいる国・願い出のときにいる国・国籍）に当たらないことが、訂正のリンク先からはっきり読めるもの。');
  must['policies/legality.md'].push('- 本人の申告は確かめないが、願い出の条件に当たらないことが訂正のリンク先にはっきり書かれていれば、本人に尋ね、条件に当たると確かめられなければ叙任しない。');
  /* 事実でない印。してはいけないことに挙げ、知った時点で名簿から外し、信頼して受けたこと・公開に残ること・違約金を求めないことを書く。 */
  must['policies/terms.md'].push('- 願い出の様式で、事実でないことに印を付けること。', '印が事実でないと分かったときは、運営者は、知った時点で名簿から名を外します。',
    '運営者は、印を信頼して受け、確かめません。', '願い出た人に、違約金や、法令が定める以上の損害の賠償を求めることはありません。',
    '予告：2026-11-22 から、事実でない印を付けた GitHub アカウントからのその後の願い出を断ることがあります');
  // 確かめないことを確かめていると読ませない。国籍・年齢・住む国は本人の申告で、身分証は取らない。
  must['policies/knighting.md'].push('運営者は、国籍・住んでいる国・年齢・本名を確かめません。身分証も求めません。',
    'ヌスクァマは国籍を与えません。騎士は国民ではありません。', '年齢・住んでいる国・願い出のときにいる国・イタリアと「外国の称号を縛る国」の国籍を持たないことは、様式の誓いへの印による本人の申告で受けます。');
  must['policies/legality.md'].push('- 国籍・年齢・住んでいる国・本名を確かめる書類を取らない。年齢・住んでいる国・願い出のときにいる国・国籍は、様式の誓いによる本人の申告で受ける。');
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
  ok('様式が、日本に住んでいて、いま日本にいることの印を求め、その日と、イタリアの国籍を持つ人を除いて国籍を問わないことを書く', y.includes('- label: 日本に住んでいて、いま日本にいます（旅行・出張・留学などで日本の外にいるあいだは願い出られません。2026-11-22 から、この印のない願い出は受けません。イタリアと、叙任の規程「外国の称号を縛る国」の国籍を持つ人を除き、国籍は問いません）。'));
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
  /* 国の名は「無何有騎士王国ヌスクァマ」一つにそろえる。国章の画像の題も、その名で呼ぶ（2026-11-12 にそろえた）。 */
  const EMBLEM_TITLE = '<title id="t">' + B.NAME + 'の国章（創作）</title>';
  const texts = walk(ROOT).filter((f) => !f.startsWith('.git/') && /\.(md|svg|js|json|yml|html|txt|xml)$/.test(f) && f !== 'verification/check.js');
  const reversed = texts.filter((f) => read(f).includes('ヌスクァマ' + '騎士王国'));
  ok('国章とファビコンの題は国の名（' + B.NAME + '）で国章を呼び、名を前後に入れ替えた形はどのファイルにもない',
    B.NAME === '無何有騎士王国ヌスクァマ' && ['assets/emblem.svg', 'assets/favicon.svg', 'site/emblem.svg', 'site/favicon.svg'].every((f) => read(f).split('<title').length === 2 && read(f).includes(EMBLEM_TITLE))
    && read('tools/favicon.js').includes(EMBLEM_TITLE) && reversed.length === 0, reversed.join(', '));
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
  /* 頁の上と下の欄は紺の帯（band）、トップの入口と断りの枠は札の地（card）。国名のラテン語は金（gold）の文字で書く。 */
  const TEXT = [['fg', 'bg'], ['muted', 'bg'], ['accent', 'bg'], ['gold', 'bg'], ['fg', 'notice'], ['accent', 'notice'], ['muted', 'notice'],
    ['fg', 'card'], ['muted', 'card'], ['accent', 'card'], ['onband', 'band'], ['bandgold', 'band'], ['bandmuted', 'band']];
  const RING = [['gold', 'bg'], ['gold', 'notice'], ['gold', 'card'], ['bandgold', 'band']];
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
  const used = fs.readdirSync(path.join(ROOT, '.github', 'ISSUE_TEMPLATE')).filter((f) => f !== 'config.yml').flatMap((f) => JSON.parse((/^labels: (\[.*\])$/m.exec(read('.github/ISSUE_TEMPLATE/' + f)) || [, '[]'])[1]));
  ok('様式が使うラベル（' + used.length + ' 個）を、ラベルの workflow がそろえる', used.length > 0 && used.every((l) => labels.includes('gh label create "' + l + '"')), used.join(','));
  const rq = read('policies/requests.md');
  const kinds = ((/## 求めることができるもの\n\n([\s\S]*?)\n\n/.exec(rq) || [])[1] || '').split('\n').filter((l) => l.startsWith('- '));
  const opts = [...req.matchAll(/^        - (.+)$/gm)].map((m) => m[1]);
  ok('求めの様式の種類が、規程の「求めることができるもの」（' + kinds.length + ' 件）と非公開の連絡を覆う', kinds.length === 7 && opts.length === kinds.length + 1 && opts.includes('非公開の連絡を求める'), opts.join(' / '));
  const sec = read('SECURITY.md');
  ok('SECURITY.md が冒頭で創作だと断り、GitHub の非公開の報告が有効でないことと、プロフィールの連絡先へだけ非公開で答える手順へ案内する', sec.includes('> これは創作であり、遊びです。') && sec.includes('template=request.yml') && sec.includes('「非公開の連絡を求める」')
    && sec.includes('GitHub の非公開の脆弱性の報告（private vulnerability reporting）は、このリポジトリで有効になっていません') && sec.includes('自分の GitHub のプロフィールに連絡先を公開しているときだけ'));
  const days = (s) => (/(\d+) 日以内に答える/.exec(s) || [])[1];
  ok('答えるまでの日数が、SECURITY.md と規程で同じ（' + days(rq) + ' 日）', days(rq) && days(sec) === days(rq));
  ok('求めの規程が様式と SECURITY.md へつなぐ', rq.includes('template=request.yml') && rq.includes('[安全の問題の知らせ方](../SECURITY.md)'));
}

console.log('\n13. リンク切れ（リポジトリの中を指すもの）');
{
  const docs = [...fs.readdirSync(ROOT).filter((f) => f.endsWith('.md') && f !== 'CLAUDE.md'), ...fs.readdirSync(path.join(ROOT, 'policies')).filter((f) => f.endsWith('.md')).map((f) => 'policies/' + f)];
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
      /* build.js が描くもの（版図の地図・暦）は、site/ にあることを見る。 */
      if (!exists(target) && !(/^(territory(-\d{4})?\.svg|calendar\.ics)$/.test(target) && exists('site/' + target))) { bad.push(f + ' → ' + href); continue; }
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
  /* 版は、コミットの値で固めた行の後ろの注釈（# v7.0.1 など）から読む。 */
  const uses = [...wf.matchAll(/uses: (\S+)(.*)$/gm)];
  const loose = uses.filter((m) => !/^[\w.-]+\/[\w.-]+@[0-9a-f]{40}$/.test(m[1]) || !/^ # v\d+(?:\.\d+){0,2}$/.test(m[2])).map((m) => m[1] + m[2]);
  ok('外のアクション（' + uses.length + ' 行）は、どれもコミットの値（40 桁）で固め、版を注釈に書く', uses.length > 0 && loose.length === 0, loose.join(', '));
  const old = uses.filter((m) => /^actions\/(?:checkout|setup-node)@/.test(m[1]) && Number((/# v(\d+)/.exec(m[2]) || [])[1] || 0) < 5).map((m) => m[1] + m[2]);
  ok('checkout と setup-node は Node.js 24 で動く v5 以上', old.length === 0, old.join(', '));
  const pins = new Map();
  for (const m of uses) { const k = m[1].split('@')[0]; pins.set(k, (pins.get(k) || new Set()).add(m[1] + m[2])); }
  ok('同じアクションは、どのワークフローでも同じコミットの値を使う', [...pins.values()].every((v) => v.size === 1), [...pins].filter(([, v]) => v.size > 1).map(([k]) => k).join(', '));
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
    'policies/terms.en.md': ['- Ticking a box in the application form for something that is not true', 'The operator relies on the ticked boxes in good faith and does not check them.', 'Nothing here asks an applicant for a penalty, or for damages beyond what the law provides.', 'Notice: from 2026-11-22, only people who live in Japan and are in Japan when they apply may apply for knighthood; nationality does not matter, except that people who hold Italian nationality, or the nationality of a country that restricts foreign titles, are excluded', 'Notice: from 2026-11-22, people who hold Italian nationality may not apply for knighthood, even if they live in Japan, and even if they also hold another nationality', 'Notice: from 2026-11-22, knighting presumes that the applicant is a person of good sense who treats the title as play', 'It is not a state. It has no territory, people, government, currency, passports or nationality, and it claims no sovereignty and no land.',
      'Nusquama charges no one anything.', 'Nusquama means no harm. It does not aim to deceive anyone or to hurt anyone.', 'Disputes are to be settled by agreement first.',
      'as the court of first instance by agreement, for a person who has agreed to these terms in the application form for knighting, and only for suits based on these terms or on that person\'s own application for knighting, listing on the roll of knights or withdrawal.\nThis agreement is not exclusive.\nAny other dispute, and any dispute with a person who has not agreed in the form, goes to the court that the law sets.',
      'the operator brings it only in the Utsunomiya District Court or the Utsunomiya Summary Court, or in the court with jurisdiction over the place of that person\'s general forum.',
      'the operator does not contest jurisdiction, whatever the dispute.', 'The agreement on courts is made only with those who agreed in the application form for knighting ("Governing law and disputes").'],
    'policies/disclaimer.en.md': ['Nusquama has no plan to obtain a domain of its own. Its only site is https://nusquama.vercel.app/.', 'A site under another domain that calls itself Nusquama is outside the kingdom and has no relation to the operator.', 'A post or statement not listed there is outside the kingdom, even if the operator wrote it.', 'The titles of Nusquama are not used in those activities, and Nusquama does not recommend them.', 'Where the Japanese Consumer Contract Act applies, the previous sentence does not apply.', 'Knighting is not the award of a real honour.', 'Claude is neither a knight nor a king, and is not an author of Nusquama.',
      "## The operator's research\n\n" + B.SEPARATE_EN + '\n', 'The pages of Nusquama do not link to the operator\'s research pages, and the research pages do not link to Nusquama.'],
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
  /* 法令の名は、見張りの表の名を長い順に先に当てる（「情報流通プラットフォーム対処法」のように仮名を含む名、「〇〇法施行規則」も拾う）。
   * 表にない名は、漢字の並びに「法」が続くものとして拾う。2026-11-12 に広げた。 */
  const names17 = [...new Set(S.statutes.map((e) => e.name))].sort((a, b) => b.length - a.length).map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re17 = new RegExp('(' + names17.join('|') + '|[一-龥]+法)((?:・?第\\d+条(?:の\\d+)?(?:第\\d+項)?(?:第\\d+号)?)+)', 'g');
  for (const m of leg.matchAll(re17)) {
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

console.log('\n23. 叙任の願い出の自動の確認（何も決めない）');
{
  const K = require('../tools/knighting.js');
  const oaths = K.requiredOaths();
  const tpl = read('.github/ISSUE_TEMPLATE/knighting.yml');
  ok('必ず印を付ける誓いを、様式の定義から読む（' + oaths.length + ' 件）。日本にいる印は、そのうちに入らない',
    oaths.length === (tpl.match(/required: true\n/g) || []).length - 2 && oaths.every((o) => tpl.includes('- label: ' + o + '\n')) && !oaths.some((o) => o.includes(K.PRESENCE)));
  const body = (ticks, link, what) => '### 訂正への公開のリンク\n\n' + link + '\n\n### 何を誤り、どう正したか\n\n' + what + '\n\n### 誓い\n\n' + ticks.join('\n') + '\n';
  const dated = ['- [X] ' + K.PRESENCE + '（旅行・出張・留学などで日本の外にいるあいだは願い出られません。）', '- [X] ' + K.NATIONALITY + '（ほかの国籍と重ねて持つ場合も含みます。）', '- [X] ' + K.PREMISE + '。', '- [X] ' + K.FOREIGN + 'アイルランド、アメリカ合衆国。'];
  const all = oaths.map((o) => '- [X] ' + o).concat(dated);
  const without = (x) => all.filter((l) => !l.includes(x));
  const f = K.parse(body(all, 'https://example.org/erratum', 'ブログの記事で年を誤り、追記で正しました。'));
  const r = (form, opened) => K.check(form, opened, oaths);
  ok('印がすべてあり、リンクが https の URL で、説明があれば通る。11 月 22 日（日本時間）からは、日本にいる印・イタリアの国籍を持たない印・良識の前提の印・外国の称号を縛る国の国籍を持たない印も見る', r(f, '2026-11-22T00:00:00Z').ok === true && r(f, '2026-11-21T00:00:00Z').rows.length === 3 && r(f, '2026-11-21T15:00:00Z').rows.length === 7);
  const noHere = K.parse(body(without(K.PRESENCE), 'https://example.org/erratum', 'ブログの記事で年を誤り、追記で正しました。'));
  const noNat = K.parse(body(without(K.NATIONALITY), 'https://example.org/erratum', 'ブログの記事で年を誤り、追記で正しました。'));
  const noPremise = K.parse(body(without(K.PREMISE), 'https://example.org/erratum', 'ブログの記事で年を誤り、追記で正しました。'));
  const noForeign = K.parse(body(without(K.FOREIGN), 'https://example.org/erratum', 'ブログの記事で年を誤り、追記で正しました。'));
  const unticked = K.parse(body(all.map((l) => (l.includes(K.NATIONALITY) ? l.replace('- [X] ', '- [ ] ') : l)), 'https://example.org/erratum', 'ブログの記事で年を誤り、追記で正しました。'));
  ok('11 月 22 日（日本時間）からは、イタリアの国籍を持たない印・良識の前提の印・外国の称号を縛る国の国籍を持たない印のどれかがない、または印を付けていない願い出は通らない。その前の日は通る',
    [noNat, noPremise, noForeign, unticked].every((x) => r(x, '2026-11-21T15:00:00Z').ok === false && r(x, '2026-11-21T14:59:00Z').ok === true)
    && r(noNat, '2026-11-22T00:00:00Z').rows.some((row) => !row[1] && row[0].includes('イタリアの国籍')) && r(noPremise, '2026-11-22T00:00:00Z').rows.some((row) => !row[1] && row[0].includes('良識の前提')) && r(noForeign, '2026-11-22T00:00:00Z').rows.some((row) => !row[1] && row[0].includes('外国の称号を縛る国')));
  const oneOff = K.parse(body(all.slice(1), 'https://example.org/erratum', 'ブログの記事で年を誤り、追記で正しました。'));
  ok('一つでも誓いの印がない、日本にいる印がない、リンクが http・受けない先、説明が空、のどれでも通らない',
    r(oneOff, '2026-11-22T00:00:00Z').ok === false && r(noHere, '2026-11-22T00:00:00Z').ok === false && r(noHere, '2026-11-20T00:00:00Z').ok === true
    && r(K.parse(body(all, 'http://example.org/erratum', 'ブログの記事で年を誤り、追記で正しました。')), '2026-11-22T00:00:00Z').ok === false
    && r(K.parse(body(all, 'https://localhost/erratum', 'ブログの記事で年を誤り、追記で正しました。')), '2026-11-22T00:00:00Z').ok === false
    && r(K.parse(body(all, 'https://example.org/erratum', '_No response_')), '2026-11-22T00:00:00Z').ok === false);
  const c = K.comment(r(f, '2026-11-22T00:00:00Z'));
  const src = read('tools/knighting.js'), wf = read('.github/workflows/knighting.yml');
  ok('コメントは、何も決めないこと、決めるのは運営者であること、リンクを開かないこと、創作であることを書く。リンクは開かず、何も残さない',
    c.startsWith(K.MARK) && c.includes('この確認は何も決めません。叙任を決めるのは運営者です。この確認は、訂正へのリンクを開きません。') && c.includes('これは創作であり、遊びです。称号に法的な効力はありません。')
    && !/writeFileSync|appendFileSync/.test(src));
  ok('仕事は叙任のラベルの issue でだけ動き、コードを読んで issue に書くことしかできず、issue の文を環境変数でだけ渡す',
    wf.includes("if: contains(github.event.issue.labels.*.name, '叙任')") && /permissions:\n  contents: read\n  issues: write\n/.test(wf) && wf.includes('ISSUE_BODY: ${{ github.event.issue.body }}')
    && [...wf.matchAll(/^\s*- run: (.*)$/gm)].map((m) => m[1]).join() === 'node tools/knighting.js');
  ok('叙任の規程と個人情報の取り扱いが、自動の確認と、リンクの扱いを書く',
    read('policies/knighting.md').includes('自動の確認は何も決めません。叙任を決めるのは運営者です。')
    && read('policies/privacy.md').includes('自動の確認は、訂正へのリンクを開きません。リンク先へは何も要求せず、リンク先の中身はどこにも残しません。'));
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
    && en.includes('in entries 1 and 3 of [the King\'s errata](./ERRATA.en.md)') && en.includes('Nemo I, the Knight-King, 7 November 2026') && ja.includes('―― 騎士王ネモ一世　2026年11月7日'));
  ok('第一条・第六条・第八条の要と、第十条の削らない条を、日本語のとおりに訳す',
    en.includes('This country is a work of fiction. It is not related to any real state, royal house, order of knighthood, honour or title, and it has no territory, people, currency or passports.')
    && en.includes('Knighting is free of charge. It is not given in exchange for money, goods or services.') && en.includes('The titles of this country are used only within this country.')
    && en.includes('Articles 1, 6 and 8, however, are never removed.') && ja.includes('ただし、第一条・第六条・第八条は削らない。'));
  const html = read('site/founding.en.html');
  ok('英語の頁は英語の断りを先頭に出し、英語の頁どうしと README と llms.txt がつなぐ', /<html lang="en"/.test(html) && html.includes('<p class="notice">' + B.NOTICE_EN + '</p>')
    && read('site/policies/terms.en.html').includes('founding.en.html') && ja.includes('[Founding Declaration, Basic Law and Ten Precepts](founding.en.md)')
    && read('site/llms.txt').includes(B.BASE + 'founding.en.html)') && B.SOURCES.some(([s2]) => s2 === 'founding.en.md'));
}

console.log('\n25. 国のしるし（国旗・版図の地図）は国章の色だけで描き、書体を使わない');
{
  const COLORS = ['#14213d', '#c9a227', '#e8cf74'];
  const svgs = { flag: read('assets/flag.svg'), territory: read('site/territory.svg') };
  const colors = (t) => [...new Set((t.match(/#[0-9a-f]{6}/gi) || []).map((c) => c.toLowerCase()))];
  ok('二つとも国章の三色だけを使い、文字を描かず、題に創作であることを書く', Object.values(svgs).every((t) => colors(t).every((c) => COLORS.includes(c)) && !/<text|font-family/.test(t) && /<title id="t">[^<]*（創作/.test(t))
    && COLORS.every((c) => read('assets/emblem.svg').toLowerCase().includes(c)));
  /* 帯の形（幅いっぱいで高さの半分に満たない塗りの矩形）を取らない。実在の国旗の多くが帯でできているため。 */
  const fills = [...svgs.flag.matchAll(/<rect ([^>]*)\/>/g)].map((m) => m[1]).filter((a) => !/fill="none"/.test(a));
  const W = Number((/viewBox="0 0 (\d+) (\d+)"/.exec(svgs.flag) || [])[1]), H = Number((/viewBox="0 0 (\d+) (\d+)"/.exec(svgs.flag) || [])[2]);
  const stripes = fills.filter((a) => { const w = Number((/width="([\d.]+)"/.exec(a) || [])[1]), h = Number((/height="([\d.]+)"/.exec(a) || [])[1]); return w >= W * 0.9 && h < H * 0.5; });
  ok('国旗は 3:2 で、帯の形を取らない', W / H === 1.5 && stripes.length === 0 && read('SYMBOLS.md').includes('帯を横や縦に並べる形は取りません。'));
  const tiles = (t) => (t.match(/fill="#c9a227"/g) || []).length;
  ok('版図の地図は、正誤表の誤りの数（' + B.domain() + ' 件）だけの区画と、中央の本棚の三本の柱を描き、誤りが増えれば区画も増える',
    tiles(svgs.territory) === B.domain() && (svgs.territory.match(/fill="#e8cf74"/g) || []).length === 3 && tiles(B.territorySvg(12)) === 12 && tiles(B.territorySvg(0)) === 0
    && svgs.territory.includes('王の正誤表の誤り ' + B.domain() + ' 件の区画'));
  const sym = read('SYMBOLS.md');
  ok('国のしるしの頁が、どれも実在の旗や記章ではないと断り、徽章や叙任状は作らないと書く。徽章・叙任状を描く画像もコードもない',
    sym.includes('ここに挙げるしるしは、どれも実在の国家・王室・騎士団・叙勲の旗や記章ではなく、それらに代わるものでもありません。')
    && sym.includes('騎士にも、徽章や叙任状は出しません。') && !fs.existsSync(path.join(ROOT, 'assets', 'insignia.svg')) && !fs.existsSync(path.join(ROOT, 'site', 'certificates'))
    && !/certificate|insignia|叙任状を描/.test(read('build.js')));
}

console.log('\n26. 官報');
{
  const items = B.gazetteItems();
  const n = B.timelineRows().length + B.tableRows('ERRATA.md').length + Math.floor(B.tableRows('ERRATA.md').length / B.MILESTONE) + B.tableRows('KNIGHTS.md').length;
  const g = read('site/gazette.html'), x = read('site/gazette.xml');
  ok('官報は、年表・正誤表・名簿のすべての行と記念の号（' + n + ' 件）を、日付の新しい順に、頁と配信の両方に載せる',
    items.length === n && items.every((it, i) => i === 0 || items[i - 1].date >= it.date) && (x.match(/<entry>/g) || []).length === n
    && (g.match(/<tr><td>\d{4}-\d{2}-\d{2}<\/td>/g) || []).length === n && g.includes('href="gazette.xml"') && read('GAZETTE.md').includes('実在の官報ではありません。'));
}

console.log('\n27. 暦と祝日、交流の規程');
{
  const cal = read('CALENDAR.md'), ex = read('policies/exchange.md');
  const first = B.tableRows('ERRATA.md')[0][1];
  ok('記念日は、建国の宣言の日と、正誤表に最初の誤りを記した日に合い、実在の祝日ではなく誰にも義務を生じないと断る',
    read('README.md').includes('―― 騎士王ネモ一世　2026年11月7日') && cal.includes('| 11 月 7 日 | 建国の日 | 2026 年のこの日に') && first === '2026-11-08' && cal.includes('| 11 月 8 日 | 正誤の日 |')
    && cal.includes('実在の祝日ではなく、誰にも休みや義務を生じません。') && cal.includes('騎士にも誰にも、何かをする決まりはありません。'));
  ok('交流は挨拶とリンクに留め、条約・同盟・承認の文書を結ばず、称号を授け合わず、金銭を伴わず、称号を売るものと交わらない',
    ['- 交流は、挨拶と、互いの頁へのリンクに留めます。', '- 条約・同盟・相互の承認の文書は結びません。', '- 称号・勲章・位を、相手と授け合いません。',
      '- 金銭・物品・役務の受け渡しを伴う交流はしません。', '- 実在の国家・王室・騎士団を名乗るもの、称号を売るもの、人を欺くものとは交流しません。'].every((t) => ex.includes(t))
    && read('README.md').includes('- [交流の規程](policies/exchange.md)'));
}

console.log('\n28. トップ以外のすべての頁の英語版（日本語の版を正とする訳）');
{
  const count = (t, re) => (t.match(re) || []).length;
  const rows = (t) => count(t, /^\| \d+ \|/gm);
  for (const [f, h] of B.ROOT_EN) {
    const ja = read(f + '.md'), en = read(f + '.en.md');
    const html = read('site/' + h + '.en.html'), jaHtml = read('site/' + h + '.html');
    ok(f + '.en.md：日本語の版を正とすると断り、創作であると断り、節と表の行の数が日本語の版と同じ（## ' + count(ja, /^## /gm) + '、行 ' + rows(ja) + '）',
      en.includes('This is an English translation. The [Japanese version](' + f + '.md) governs; if the two differ, the Japanese version applies.') && /^> This is a work of fiction, written for fun\./m.test(en)
      && count(ja, /^## /gm) === count(en, /^## /gm) && rows(ja) === rows(en));
    ok(h + '.en.html：lang が en で、日本語の頁と互いに hreflang で指し合う',
      html.includes('<html lang="en">') && html.includes('hreflang="ja" href="' + B.BASE + h + '.html"') && jaHtml.includes('hreflang="en" href="' + B.BASE + h + '.en.html"'));
  }
  const tl = B.timelineRows();
  const g = read('site/gazette.en.html');
  ok('年表のどの行にも英語の欄があり（' + tl.length + ' 行）、英語の官報はそれと、正誤表・名簿から英語で作る',
    tl.every((r) => r[2] && /[A-Za-z]/.test(r[2])) && (g.match(/<tr><td>\d{4}-\d{2}-\d{2}<\/td>/g) || []).length === B.gazetteItems().length && !/<td>[^<]*[ぁ-んァ-ン一-龥][^<]*<\/td>/.test(g.split('<table>')[1] || ''));
  const readme = read('README.md');
  ok('すべての規程と、トップ以外のすべての頁に英語版があり、README がそのすべてへつなぐ',
    B.EN.length === B.POLICIES.length && B.POLICIES.every((p) => B.EN.includes(p))
    && B.EN.every((p) => readme.includes('(policies/' + p + '.en.md)')) && B.ROOT_EN.every(([f]) => readme.includes('(' + f + '.en.md)'))
    && B.SOURCES.filter(([s]) => !s.endsWith('.en.md') && s !== 'README.md').every(([s]) => B.SOURCES.some(([t]) => t === s.replace(/\.md$/, '.en.md'))));
}

console.log('\n29. 王の正誤表の分類・地名・一件ごとの頁・地図');
{
  const E = B.errataEntries();
  const cells = (f) => read(f).split('\n').filter((l) => /^\| \d+ \|/.test(l)).map((l) => l.replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
  const ja = cells('ERRATA.md'), en = cells('ERRATA.en.md');
  ok('どの行にも分類と地名があり、地名は分類と順から決まるものと同じ（日本語と英語、' + E.length + ' 件）',
    E.length === B.domain() && E.every((e, i) => ja[i][7] === e.place && en[i][7] === e.place && en[i][6] === e.kind.en)
    && E.map((e) => e.place).length === new Set(E.map((e) => e.place)).size,
    E.filter((e, i) => ja[i][7] !== e.place || (en[i] || [])[7] !== e.place).map((e) => e.n + ':' + e.place).join(', '));
  const legend = (f, en2) => B.KINDS.every((k) => read(f).includes(en2 ? '| ' + k.en + ' | ' + k.shapeEn + ' | Insula ' + k.la + ' |' : '| ' + k.ja + ' | ' + k.shapeJa + ' | Insula ' + k.la + ' |'));
  ok('分類の表（' + B.KINDS.length + ' 分類）が、地図の形と島の名を build.js と同じに書く（日本語と英語）。ローマ数字が正しい',
    legend('ERRATA.md') && legend('ERRATA.en.md', true) && B.roman(1) === 'I' && B.roman(4) === 'IV' && B.roman(9) === 'IX' && B.roman(14) === 'XIV' && B.roman(40) === 'XL' && B.roman(1999) === 'MCMXCIX');
  const t = read('site/territory.svg');
  const shapes = { square: (x) => (x.match(/<rect x="[\d.]+" y="[\d.]+" width="26" height="26" fill="#c9a227"\/>/g) || []).length, bar: (x) => (x.match(/width="30" height="16" fill="#c9a227"/g) || []).length,
    polys: (x) => (x.match(/<polygon points="[^"]+" fill="#c9a227"\/>/g) || []).length };
  const want = (k) => E.filter((e) => e.kind.shape === k).length;
  ok('版図の地図の区画の形が、分類ごとの件数と合う', shapes.square(t) === want('square') && shapes.bar(t) === want('bar') && shapes.polys(t) === E.length - want('square') - want('bar'));
  const eh = read('site/errata.html'), ee = read('site/errata.en.html');
  const links = (h) => [...h.matchAll(/<a href="(errata\/\d+(?:\.en)?\.html)" aria-label="[^"]+">/g)].map((m) => m[1]);
  ok('正誤表の頁の地図は、区画ごとに一件の頁へつなぐ（日本語と英語、' + E.length + ' 区画）',
    JSON.stringify(links(eh)) === JSON.stringify(E.map((e) => 'errata/' + e.n + '.html')) && JSON.stringify(links(ee)) === JSON.stringify(E.map((e) => 'errata/' + e.n + '.en.html'))
    && eh.includes('<title id="tm">') && eh.includes('href="territory.svg"'));
  const pages = fs.readdirSync(path.join(ROOT, 'site', 'errata'));
  ok('一件ごとの頁が、日本語と英語で一件に一つずつあり、断りと対の頁と地名を持つ',
    pages.length === 2 * E.length && E.every((e) => {
      const j = read('site/errata/' + e.n + '.html'), g = read('site/errata/' + e.n + '.en.html');
      return j.includes('<p class="notice">' + B.NOTICE + '</p>') && g.includes('<p class="notice">' + B.NOTICE_EN + '</p>') && j.includes('hreflang="en" href="' + B.BASE + 'errata/' + e.n + '.en.html"')
        && g.includes('hreflang="ja" href="' + B.BASE + 'errata/' + e.n + '.html"') && j.includes('<h1>王の正誤表 第 ' + e.n + ' 件：' + e.place + '</h1>') && g.includes('<html lang="en">');
    }));
  const years = B.errataYears();
  const tilesIn = (x) => (x.match(/fill="#c9a227"/g) || []).length;
  ok('年ごとの版図の地図（' + years.length + ' 年）は、その年の終わりまでの件数だけの区画を持ち、表の累計と合う',
    years.every((y) => { const n = E.filter((e) => e.date.slice(0, 4) <= y).length; return tilesIn(read('site/territory-' + y + '.svg')) === n && eh.includes('<td>' + y + '</td><td>' + E.filter((e) => e.date.startsWith(y)).length + '</td><td>' + n + '</td>'); })
    && (eh.match(/<tr><td>\d{4}-\d{2}-\d{2}<\/td><td>\d+<\/td><td>(\d+)<\/td><\/tr>/g) || []).pop().includes('<td>' + E.length + '</td></tr>'));
  ok('他人の文の誤りは記さず、記した行が誤りでも消さないと書き、最古の区画は第 1 件の地名を挙げる',
    read('ERRATA.md').includes('他人の文の誤りは記しません。') && read('ERRATA.md').includes('記した正誤そのものが誤りだったと分かったときも、前の行は消しません。')
    && read('ERRATA.md').includes('最古の区画は、第 1 件の ' + E[0].place + ' です。') && read('ERRATA.en.md').includes('The oldest parcel is entry 1, ' + E[0].place + '.'));
}

console.log('\n30. 官報の号と一号ごとの頁');
{
  const items = B.gazetteItems();
  const g = read('site/gazette.html'), x = read('site/gazette.xml');
  ok('号は古い順に 1 から欠けずに振られ、頁の表と配信が号の頁へつなぐ（' + items.length + ' 号）',
    items.map((it) => it.no).sort((a, b) => a - b).every((n, i) => n === i + 1) && items.every((it, i) => i === 0 || items[i - 1].no === it.no + 1)
    && items.every((it) => g.includes('<a href="gazette/' + it.no + '.html">第 ' + it.no + ' 号</a>') && x.includes('<link href="' + B.BASE + 'gazette/' + it.no + '.html"/>')));
  const files = fs.readdirSync(path.join(ROOT, 'site', 'gazette'));
  ok('一号ごとの頁が日本語と英語で一号に一つずつあり、断りを持つ', files.length === 2 * items.length
    && items.every((it) => read('site/gazette/' + it.no + '.html').includes('<h1>官報 第 ' + it.no + ' 号</h1>') && read('site/gazette/' + it.no + '.en.html').includes('<p class="notice">' + B.NOTICE_EN + '</p>')));
  const heads = [...g.matchAll(/<h2 id="y(\d{4})">\d{4} 年（(\d+) 号）<\/h2>/g)];
  ok('官報は年ごとに区切られ（年代記）、年の号の数を足すと全体になる', heads.length > 0 && heads.reduce((a, m) => a + Number(m[2]), 0) === items.length);
  const first = items.find((it) => it.no === 1);
  ok('国の仕組みが挙げる「官報第 1 号」は、基本法と十則を定めた布告である', read('INSTITUTIONS.md').includes('基本法と十則を定めた布告は、官報第 1 号です。') && first.text.startsWith('建国。基本法と十則を定め'));
}

console.log('\n31. 暦の iCalendar');
{
  const ics = read('site/calendar.ics');
  const rows = read('CALENDAR.md').split('\n').filter((l) => /^\| \d+ 月 \d+ 日 \|/.test(l));
  const lines = ics.split('\r\n');
  ok('行は CRLF で区切られ、どの行も 75 オクテット以下で、記念日（' + rows.length + ' 日）ごとに毎年くり返す終日の項目を持つ',
    !/[^\r]\n/.test(ics) && lines.every((l) => Buffer.byteLength(l) <= 75) && ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n') && ics.endsWith('END:VCALENDAR\r\n')
    && (ics.match(/BEGIN:VEVENT/g) || []).length === rows.length && (ics.match(/RRULE:FREQ=YEARLY/g) || []).length === rows.length && (ics.match(/TRANSP:TRANSPARENT/g) || []).length === rows.length
    && ics.includes('DTSTART;VALUE=DATE:20261107') && ics.includes('DTSTART;VALUE=DATE:20261108'));
  const unfolded = ics.replace(/\r\n /g, '');
  ok('どの項目も、創作の記念日で実在の祝日ではないと書き、text/calendar で配る',
    (unfolded.match(/実在の祝日ではありません。/g) || []).length === rows.length && JSON.parse(read('site/vercel.json')).headers.some((h) => h.source === '/calendar.ics' && h.headers[0].value === 'text/calendar; charset=utf-8'));
  const cal = read('CALENDAR.md');
  ok('祝日を足すのは王で、実在の祝日や実在の人の日を祝日にせず、誰にも義務を生じないと書く（日本語と英語）',
    cal.includes('- 実在の祝日や、実在の人の誕生日・命日を、祝日にしません。') && cal.includes('- 祝日を足しても、誰にも休みや義務を生じません。')
    && read('CALENDAR.en.md').includes('- Real public holidays and the birthdays or death days of real people are not made days of the kingdom.'));
}

console.log('\n32. 物語・言葉・仕組み・紹介・遊び・しるし');
{
  const press = read('site/press.html'), knights = B.population(), dubbed = B.tableRows('KNIGHTS.md').length, items = B.gazetteItems().length;
  ok('紹介の事実の表は、正誤表・名簿・官報・頁の元から数える（版図 ' + B.domain() + '、人口 ' + knights + '、官報 ' + items + '、頁 ' + B.SOURCES.length + '）',
    press.includes('<td>版図（王の正誤表の誤り）</td><td>' + B.domain() + ' 件</td>') && press.includes('<td>人口（正誤表騎士団の騎士）</td><td>' + knights + ' 人</td>')
    && press.includes('<td>官報</td><td>' + items + ' 号</td>') && press.includes('<td>頁（日本語と英語）</td><td>' + B.SOURCES.length + '</td>') && press.includes('<td>建国の日</td><td>' + B.FOUNDED + '</td>')
    && read('README.md').includes('―― 騎士王ネモ一世　' + B.FOUNDED.replace(/^(\d+)-(\d+)-(\d+)$/, (m, y, mo, d) => y + '年' + Number(mo) + '月' + Number(d) + '日')));
  const census = [...press.matchAll(/<tr><td>(\d{4})<\/td><td>(\d+)<\/td><td>(\d+)<\/td><td>(\d+)<\/td><td>(\d+)<\/td><\/tr>/g)];
  ok('年ごとの国勢の表を足すと、正誤・叙任・官報の全体になる', census.length > 0 && census.reduce((a, m) => a + Number(m[2]), 0) === B.domain()
    && census.reduce((a, m) => a + Number(m[3]), 0) === dubbed && census.reduce((a, m) => a + Number(m[4]), 0) === items && Number((census[census.length - 1] || [])[5]) === B.population(census.length ? census[census.length - 1][1] : '0'));
  {
    const paras = (t, h) => { const i = t.indexOf('\n## ' + h + '\n'); const j = t.indexOf('\n## ', i + 5); return i < 0 ? [] : t.slice(i + h.length + 5, j < 0 ? undefined : j).split(/\n{2,}/).map((p) => p.trim()).filter(Boolean); };
    const pj = paras(read('PRESS.md'), '添える文'), pe = paras(read('PRESS.en.md'), 'Sentences to add');
    const mj = /^紹介には、次の([一二三四五])つの段落を添えます。$/.exec(pj[0] || ''), me = /^An introduction carries these (one|two|three|four|five) passages?\.$/.exec(pe[0] || '');
    const nj = mj ? ' 一二三四五'.indexOf(mj[1]) : -1, ne = me ? ['', 'one', 'two', 'three', 'four', 'five'].indexOf(me[1]) : -2;
    ok('紹介に添える段落の数（' + (pj.length - 1) + '）が、文に書いた数と同じ（日本語と英語）', nj > 0 && nj === pj.length - 1 && ne === pe.length - 1 && nj === ne, mj ? mj[1] : '数が見つからない');
  }
  ok('紹介に添える文は、創作であることと、運営者のほかの活動と関係がないことを書く（日本語と英語）',
    read('PRESS.md').includes('これは創作であり、遊びです。ヌスクァマは国家ではなく、ここで贈る騎士の呼び名は、勲章・栄典・騎士の位ではなく、法的な効力もありません。') && !read('PRESS.md').includes('ここで授ける称号') && read('PRESS.md').includes('ヌスクァマは遊びの創作です。運営者のほかの活動とは関係がありません。')
    && read('PRESS.en.md').includes('Nusquama is a playful fiction. It has no connection with the operator\'s other activities.'));
  const inst = read('INSTITUTIONS.md');
  const sec = (h) => { const i = inst.indexOf('\n## ' + h + '\n'); return i < 0 ? '' : inst.slice(i + 1, inst.indexOf('\n## ', i + 5) < 0 ? undefined : inst.indexOf('\n## ', i + 5)); };
  ok('国の仕組みが、凍結・解散・終わりの言葉・十年の見通しを持ち、解散は求めに応じる期間を 30 日以上置き、リポジトリを消さない',
    ['凍結', '解散', '終わりの言葉', '十年の見通し', '恩赦', '改めるとき'].every((h) => sec(h)) && sec('解散').includes('少なくとも 30 日') && sec('解散').includes('リポジトリは消さず')
    && sec('十年の見通し').includes('- 土地・通貨・旅券・証書・物は作りません。'));
  const R = require('../tools/review.js');
  const bullets = sec('年一回の総点検').split('\n').filter((l) => l.startsWith('- '));
  const wf = read('.github/workflows/review.yml');
  ok('年一回の総点検は、建国の日に issue を開き、本文は国の仕組みの箇条（' + bullets.length + ' 項）そのまま。同じ年に二度開かない',
    /cron: '17 0 7 11 \*'/.test(wf) && wf.includes('node tools/review.js') && wf.includes('grep -qxF') && /issues: write/.test(wf)
    && bullets.length >= 5 && bullets.every((b) => R.body('2026').includes('- [ ] ' + b.slice(2))) && R.body('2026').startsWith('> これは創作であり、遊びです。'));
  const lex = read('LEXICON.md');
  ok('国の言葉は、正誤表の島の名のもとの語（' + B.KINDS.length + '）を持ち、誤りを含む二文をラテン語に移さない',
    ['factum', 'verbum', 'lex', 'finis', 'littera', 'numerus'].every((w) => lex.includes('| ' + w + ' |')) && !/Morus|Thomas|Utopia|locus/i.test(lex.slice(lex.indexOf('## 建国の宣言のラテン語')))
    && lex.includes('辞書では確かめていません'));
  const flag = read('assets/flag.svg'), sym = read('SYMBOLS.md');
  const r = [...flag.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)].map((m) => m.slice(1).map(Number));
  ok('国旗の作図の数は、国旗の画像の座標そのまま（黄金比の矩形・切り出す正方形・角石）',
    r.some(([x, y, w, h]) => x === 183 && y === 155 && w === 534 && h === 330) && sym.includes('左上の角は (183, 155)') && sym.includes('横 534、縦 330')
    && ['330', '204', '126', '77.9', '48.1', '29.8'].every((v) => r.some(([, , w]) => w.toFixed(1).replace(/\.0$/, '') === v || String(w) === v)) && sym.includes('330、204、126、77.9、48.1、29.8')
    && r.filter(([, y, w]) => y === 99 && w === 24).length === 3 && sym.includes('上の端は 99'));
  const emblemColors = [...new Set((read('assets/emblem.svg').match(/#[0-9a-f]{6}/gi) || []).map((c) => c.toLowerCase()))];
  ok('国の色の表が、国章の色（' + emblemColors.length + ' 色）をすべて挙げ、商標に出願しないと書く', emblemColors.every((c) => sym.includes('`' + c + '`'))
    && sym.includes('運営者は、国の名・国章・国旗を、商標として出願しません。') && sym.includes('国旗と版図の地図も、文と国章と同じく CC BY 4.0 です。'));
  ok('叙任の規程が、騎士の呼び方に飾りの語を足さないと書く（日本語と英語）', read('policies/knighting.md').includes('呼ぶときは「騎士 アカウント名」とし、ほかの呼び名や飾りの語を足しません。')
    && read('policies/knighting.en.md').includes('with no other title or adornment added.'));
  const play = read('PLAY.md');
  const listIn = (h) => { const i = play.indexOf('\n## ' + h + '\n'); const j = play.indexOf('\n## ', i + 5); return play.slice(i, j < 0 ? undefined : j).split('\n').filter((l) => /^\d+\. /.test(l)); };
  const tri = B.KINDS.find((k) => k.shape === 'triangle');
  ok('遊びの問いと答えの数がそろい、答えが国の決まりと合う（地図の三角形・正誤の日）',
    listIn('誤り探しの練習').length === listIn('練習の答え').length && listIn('国の仕組みの問い').length === listIn('問いの答え').length && listIn('問いの答え').length === 10
    && listIn('問いの答え')[9].startsWith('10. ' + tri.ja + '（') && listIn('問いの答え')[8].startsWith('9. 11 月 8 日') && read('CALENDAR.md').includes('| 11 月 8 日 | 正誤の日 |'));
}

console.log('\n33. 頁の形（読み上げと印刷）');
{
  const html = walk(path.join(ROOT, 'site')).filter((f) => f.endsWith('.html'));
  const bad = [];
  for (const f of html) {
    const t = read('site/' + f);
    const main = (/<main id="main">([\s\S]*)<\/main>/.exec(t) || [])[1] || '';
    const levels = [...main.matchAll(/<h([1-6])[ >]/g)].map((m) => Number(m[1]));
    if (!/<html lang="(ja|en)">/.test(t)) bad.push(f + '：lang');
    if ((t.match(/<h1[ >]/g) || []).length !== 1) bad.push(f + '：h1');
    if (levels.some((l, i) => i > 0 && l > levels[i - 1] + 1)) bad.push(f + '：見出しの段を飛ばす');
    if ((t.match(/<img /g) || []).length !== (t.match(/<img [^>]*alt="[^"]*"/g) || []).length) bad.push(f + '：alt');
    if ((main.match(/<svg /g) || []).length !== (main.match(/<svg [^>]*aria-labelledby="(\w+)"[^>]*>\s*<title id="\1">/g) || []).length) bad.push(f + '：svg の題');
    if (f.endsWith('.en.html') && /<p>[^<]*[a-z][.?!]["”)]?[A-Z][a-z]/.test(main.replace(/<a [^>]*>|<\/a>/g, ''))) bad.push(f + '：英文の文がつながっている');
  }
  ok('どの頁（' + html.length + '）も lang と h1 を一つ持ち、見出しの段を飛ばさず、画像に alt、図に題があり、英文の文と文の間が空く', bad.length === 0, bad.slice(0, 8).join(' / '));
  ok('印刷のときは、案内と下の欄を隠し、外へのリンクの所在を書き出す', /@media print \{[^}]*\.skip, footer ul/.test(read('site/index.html')) && read('site/index.html').includes('content: " <" attr(href) ">"'));
}

console.log('\n34. 条文の引用と、規程の外の行い');
{
  const crypto = require('crypto');
  const conf = JSON.parse(read('verification/statutes.json'));
  const texts = JSON.parse(read('verification/statutes-texts.json'));
  const prim = JSON.parse(read('verification/sources.json'));
  const raw = JSON.parse(read('verification/sources-raw.json'));
  const unhtml = (x) => x.replace(/<br>\n?/g, ' ').replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  // 引く日本の条文は、見張りが記した文そのもの（SHA-256 が記した値と同じ）。
  const badHash = conf.statutes.filter((e) => !texts[e.name + ' ' + e.label] || crypto.createHash('sha256').update(texts[e.name + ' ' + e.label], 'utf8').digest('hex') !== e.sha256).map((e) => e.name + ' ' + e.label);
  ok('引く日本の条文（' + conf.statutes.length + '）は、見張りが記した値と同じ文', badHash.length === 0, badHash.join(' / '));
  // 外国の一次資料の引用は、取り寄せた文にそのまま現れる（閉じ括弧と句読点の前の空白だけを詰める）。
  const squeeze = (x) => x.replace(/ ([).,;])/g, '$1');
  // 窓（法令・条約と国の機関の文）か、抜き出した箇所（それ以外の文。引いた箇所と検査が拠る箇所だけ）に現れ、
  // 引用に記した全文の SHA-256 が、いま取り寄せた全文の SHA-256 と同じ。取り寄せ直して文が変わっていれば落ちる。
  const badQuote = Object.entries(prim.sources).filter(([k, v]) => !raw.sources[v.from] || !(raw.sources[v.from].windows || []).concat(raw.sources[v.from].spans || []).some((w) => squeeze(w).includes(v.quote))
    || !/^[0-9a-f]{64}$/.test(v.sha256_full || '') || raw.sources[v.from].sha256_full !== v.sha256_full).map(([k]) => k);
  ok('外国の一次資料の引用（' + Object.keys(prim.sources).length + '）は、取り寄せた文にそのまま現れ、記した全文の SHA-256 が取り寄せた全文と同じで、取り寄せた日が頁の断りと同じ',
    badQuote.length === 0 && prim.fetched === raw.fetched && read('policies/legality.md').includes(prim.fetched + ' に取り寄せた文から引き') && read('policies/legality.en.md').includes('fetched on ' + prim.fetched), badQuote.join(' / '));
  // 見出しに挙げた条は、その節の終わりにすべて引く。英語の頁も同じ印を持つ。
  const leg = read('policies/legality.md'), legEn = read('policies/legality.en.md');
  const marks = (t) => [...t.matchAll(/<!-- 条文 (.+?) -->/g)].map((m) => m[1]);
  const missing = [];
  for (const sec of leg.split('\n### ').slice(1)) {
    const head = sec.split('\n')[0];
    const cited = ((/（([^）]*第[^）]*)）/.exec(head) || [])[1] || '').split('、').filter((x) => /第/.test(x)).flatMap((part) => {
      const m = /^(.+?)(第.+)$/.exec(part);
      const pieces = m[2].split('・');
      return pieces.every((x) => /^第.+条(?:の\d+)?$/.test(x)) ? pieces.map((x) => m[1] + ' ' + x) : [m[1] + ' ' + m[2]];
    });
    const quoted = marks(sec.split('\n## ')[0]).join('、').split('、');
    for (const c of cited) if (!quoted.includes(c)) missing.push(c);
  }
  ok('見出しに挙げた条は、その節の終わりにすべて引き、英語の頁も同じ印を持つ', missing.length === 0 && marks(leg).join('|') === marks(legEn).join('|') && marks(leg).length >= 16, missing.join(' / '));
  // 生成された頁の引用は、記した文と同じ（行を改めただけ）。
  const page = read('site/policies/legality.html');
  const blocks = [...page.matchAll(/<summary>条文　(.+?)<\/summary><blockquote lang="ja"><p>([\s\S]*?)<\/p><\/blockquote>/g)];
  const badPage = blocks.filter(([, k, b]) => unhtml(b) !== texts[unhtml(k)]).map(([, k]) => k);
  const foreign = [...page.matchAll(/<summary>原文　[\s\S]*?<blockquote lang="(?:en|it)"><p>([\s\S]*?)<\/p><\/blockquote>/g)].map((m) => unhtml(m[1]));
  const allKeys = marks(leg).join('、').split('、');
  ok('生成された頁は、日本の条文（' + blocks.length + '）と外国の文（' + foreign.length + '）を、記した文のまま引く',
    badPage.length === 0 && blocks.length + foreign.length === allKeys.length && foreign.every((q) => Object.values(prim.sources).some((v) => v.quote === q)), badPage.join(' / '));
  // 規程の外の行いの表と、責任の文。
  const rowsIn = (t, h) => { const i = t.indexOf('\n## ' + h + '\n'); const j = t.indexOf('\n## ', i + 5); return t.slice(i, j).split('\n').filter((l) => /^\| [^-]/.test(l)).length - 1; };
  const nJa = rowsIn(leg, '規程の外で、要件に近づく行い'), nEn = rowsIn(legEn, 'Acts outside the rules that come near a law\'s elements');
  ok('規程の外で要件に近づく行いの表（' + nJa + ' 行）が日本語と英語でそろい、責任は行った本人にあり、法令が運営者に責任を負わせる場合を除かない',
    nJa >= 8 && nJa === nEn
    && leg.includes('規程に反して、または規程の外で行われた行いの責任は、行った本人にあります。') && leg.includes('ただし、法令が運営者に責任を負わせる場合は、この限りではありません')
    && legEn.includes('The responsibility for an act done against the rules, or outside them, lies with the person who did it.') && legEn.includes('This does not apply where the law makes the operator responsible')
    && read('policies/disclaimer.md').includes('運営者は、法令が責任を負わせる場合を除き、そうした行いについて責任を負いません。')
    && read('policies/disclaimer.en.md').includes('Except where the law makes the operator responsible, the operator is not responsible for such acts.'));
}

console.log('\n35. 法令の引用は、すべて取り寄せた条文に拠る');
{
  // 日本語の頁が挙げる「〇〇法第N条」「同法第N条」を拾い、見張りの表（verification/statutes.json）にあることを確かめる。
  // 外国の条約・法令の条は、選んだ一次資料（verification/sources.json）にあることを確かめる。
  // 無い条を挙げれば落ちる。言語モデルが条を作り出したときに、ここで止める。
  const conf = JSON.parse(read('verification/statutes.json'));
  const prim = JSON.parse(read('verification/sources.json'));
  const have = new Set(conf.statutes.map((e) => e.name + ' ' + e.article.replace('_', 'の')));
  const laws = [...new Set(conf.statutes.map((e) => e.name))].sort((a, b) => b.length - a.length);
  const files = walk(ROOT).filter((f) => f.endsWith('.md') && !f.endsWith('.en.md') && !f.startsWith('site/') && !f.startsWith('node_modules/'));
  const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('(同法施行規則|同法施行令|同法|' + laws.map(esc).join('|') + '|[一-龥]+法)((?:第[0-9]+条(?:の[0-9]+)?(?:第[0-9]+項)?(?:第[0-9]+号)?[・、]?)+)', 'g');
  const cited = new Map();
  for (const f of files) {
    let last = null;
    for (const m of read(f).matchAll(re)) {
      let law = m[1];
      if (law === '同法') law = last;
      else if (law.startsWith('同法施行')) law = (last || '').replace(/施行(令|規則)$/, '') + law.slice(2);
      else last = law;
      for (const a of m[2].matchAll(/第([0-9]+)条(?:の([0-9]+))?/g)) {
        const k = law + ' ' + a[1] + (a[2] ? 'の' + a[2] : '');
        if (!cited.has(k)) cited.set(k, new Set());
        cited.get(k).add(f);
      }
    }
  }
  const missing = [...cited.keys()].filter((k) => !have.has(k));
  ok('日本語の頁が挙げる日本の法令の条（' + cited.size + '）は、すべて見張りの表にある', missing.length === 0 && cited.size >= 40,
    missing.map((k) => k + '（' + [...cited.get(k)].join('・') + '）').join(' / '));
  // 外国の条：GDPR・モンテビデオ条約・イタリアの 1951 年法律第 178 号。
  const keys = Object.keys(prim.sources).map((k) => k.replace(/\s+/g, ''));
  const foreign = [];
  for (const f of files) {
    const t = read(f).replace(/<!--[\s\S]*?-->/g, '');
    for (const m of t.matchAll(/(GDPR|モンテビデオ条約|条約|法律第 ?178 ?号) ?第 ?([0-9]+) ?条( ?第 ?[0-9]+ ?項)?/g)) {
      const name = m[1] === '条約' ? 'モンテビデオ条約' : m[1].replace(/\s+/g, '');
      foreign.push([f, (name + '第' + m[2] + '条' + (m[3] || '')).replace(/\s+/g, '')]);
    }
  }
  const strayForeign = foreign.filter(([, k]) => !keys.some((x) => x.endsWith(k) || x === k));
  ok('日本語の頁が挙げる外国の条（' + foreign.length + ' か所）は、すべて取り寄せた一次資料にある', strayForeign.length === 0 && foreign.length >= 4,
    strayForeign.map(([f, k]) => k + '（' + f + '）').join(' / '));
}

console.log('\n36. GitHub で読んでもリンクが切れない');
{
  // Markdown の相対のリンクは、リポジトリの中のファイルを指す。GitHub で開くと、そのまま辿れる。
  const files = walk(ROOT).filter((f) => f.endsWith('.md') && !f.startsWith('site/') && !f.startsWith('node_modules/'));
  const broken = [];
  let n = 0;
  for (const f of files) {
    const t = read(f).replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '');
    for (const m of t.matchAll(/\]\(([^)\s]+)\)/g)) {
      const u = m[1];
      if (/^([a-z]+:|#|\/\/)/.test(u)) continue;
      n++;
      const p = decodeURIComponent(u.split('#')[0]);
      if (p && !fs.existsSync(path.join(ROOT, path.dirname(f), p))) broken.push(f + ' → ' + u);
    }
  }
  ok('Markdown の相対のリンク（' + n + '）は、どれもリポジトリの中のファイルを指す', broken.length === 0 && n > 200, broken.slice(0, 8).join(' / '));
}

console.log('\n37. 種類と状態の札（README だけ）、娯楽の創作だという断り（トップ）');
{
  const readme = read('README.md');
  const lines = readme.split('\n');
  const h = lines.findIndex((l) => l.startsWith('# '));
  const next = lines.slice(h + 1).find((l) => l.trim());
  const LABEL = '種類：エンターテインメント　状態：運営中';
  ok('README の題のすぐ下に、種類と状態の札がある（' + LABEL + '）', h === 0 && next === LABEL && B.LABEL === LABEL, next);
  /* 札は GitHub で読む人のためのもの。サイトでは頁の上の欄と最初の画面が同じ役を務めるので、どの頁にも出さない。 */
  const shown = walk(path.join(ROOT, 'site')).filter((f) => f.endsWith('.html') && read('site/' + f).includes(LABEL));
  ok('種類と状態の札は、サイトのどの頁にも出さない', shown.length === 0, shown.slice(0, 8).join(', '));
  const top = readme.slice(0, readme.indexOf('\n## '));
  const JA = '> ヌスクァマは、娯楽のために作った架空の国です。学術の研究ではなく、研究の成果を示すものでもありません。';
  const EN = '> English: This is a work of fiction, made for entertainment. Nusquama is an imaginary kingdom. It is not a state, and it is not academic research.';
  ok('トップの冒頭の断りが、娯楽の創作で研究ではないことを日本語と英語で書き、英語の段落に lang を付ける',
    top.includes(JA) && top.includes(EN) && top.indexOf(JA) < top.indexOf('](policies/terms.md)')
    && read('site/index.html').includes('<p lang="en">' + EN.slice(2) + '</p></blockquote>'));
}

console.log('\n38. 遊びの季節の問い');
{
  const subs = (t, h) => {
    const i = t.indexOf('\n## ' + h + '\n'); if (i < 0) return [];
    const j = t.indexOf('\n## ', i + 5);
    return t.slice(i, j < 0 ? undefined : j).split('\n### ').slice(1).map((b) => ({ head: b.split('\n')[0], n: b.split('\n').filter((l) => /^\d+\. /.test(l)).length }));
  };
  const cal = (f) => read(f).split('\n').filter((l) => /^\| \d+ (月 \d+ 日|[A-Z][a-z]+) \|/.test(l)).map((l) => l.replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
  const pj = read('PLAY.md'), pe = read('PLAY.en.md');
  const qj = subs(pj, '季節の問い'), aj = subs(pj, '季節の問いの答え'), qe = subs(pe, 'Seasonal questions'), ae = subs(pe, 'Answers to the seasonal questions');
  const wantJ = cal('CALENDAR.md').map(([d, n]) => n + '（' + d + '）'), wantE = cal('CALENDAR.en.md').map(([d, n]) => n + ' (' + d + ')');
  ok('季節の問いは、暦の記念日（' + wantJ.length + ' 日）ごとに一つずつ節を持ち、問いと答えの数がそろう（日本語と英語）',
    wantJ.length > 0 && JSON.stringify(qj.map((x) => x.head)) === JSON.stringify(wantJ) && JSON.stringify(aj.map((x) => x.head)) === JSON.stringify(wantJ)
    && JSON.stringify(qe.map((x) => x.head)) === JSON.stringify(wantE) && JSON.stringify(ae.map((x) => x.head)) === JSON.stringify(wantE)
    && qj.every((x, i) => x.n > 0 && x.n === aj[i].n && x.n === qe[i].n && x.n === ae[i].n),
    qj.map((x) => x.head + ':' + x.n).join(', '));
  ok('季節の問いの答えが拠る文が、国の頁に残っている（国是・十年の見通し・総点検・最初の誤り・単位・恩赦）',
    read('README.md').includes('**国是**：Errata servo, me ipsum rego.') && pj.includes('2. Errata servo, me ipsum rego.')
    && read('INSTITUTIONS.md').includes('2036 年 11 月 7 日に、この見通しと実際を比べて、官報に載せます。') && read('INSTITUTIONS.md').includes('毎年 11 月 7 日（建国の日）に、点検の issue が自動で開きます。')
    && read('STORY.md').includes('それは、国の名の由来についての誤りでした。') && read('SYMBOLS.md').includes('版図の広さは「誤」で数えます。王の正誤表の一件が一誤です。')
    && read('INSTITUTIONS.md').includes('そのため、恩赦を求めると、版図はかえって一区画広がります。'));
  const practice = { 'PLAY.md': ['1. 一週間は八日である。', '2. 水は、1 気圧のもとで、およそ 50 ℃ で沸騰する。', '3. 平面の三角形の内角の和は 360 度である。', '4. この文には誤字がありまさん。', '5. ヌスクァマの騎士の位は三つある。'],
    'PLAY.en.md': ['1. A week has eight days.', '2. At a pressure of one atmosphere, water boils at about 50 °C.', '3. The angles of a triangle in a plane add up to 360 degrees.', '4. There are no speling mistakes in this sentence.', '5. The knights of Nusquama have three ranks.'] };
  const fixed = Object.entries(practice).flatMap(([f, l]) => l.filter((x) => !read(f).includes('\n' + x + '\n')).map((x) => f + '：' + x));
  ok('誤り探しの練習の文は、わざと置いた誤りを残している（日本語と英語、直さない）', fixed.length === 0, fixed.join(' / '));
}

console.log('\n39. 官報の月ごとの合本（号は振り直さない）');
{
  const items = B.gazetteItems(), months = B.gazetteMonths();
  const g = read('site/gazette.html'), ge = read('site/gazette.en.html');
  const seen = [];
  const bad = [];
  for (const m of months) {
    const want = items.filter((x) => x.date.startsWith(m)).map((x) => x.no).sort((a, b) => a - b);
    for (const en of [false, true]) {
      const f = 'site/monthly/' + m + (en ? '.en' : '') + '.html';
      if (!fs.existsSync(path.join(ROOT, f))) { bad.push(f + ' がない'); continue; }
      const t = read(f);
      const got = [...t.matchAll(en ? /<a href="\.\.\/gazette\/(\d+)\.en\.html">No\. (\d+)<\/a>/g : /<a href="\.\.\/gazette\/(\d+)\.html">第 (\d+) 号<\/a>/g)];
      if (got.some((x) => x[1] !== x[2])) bad.push(f + '：号の名と所在が食い違う');
      if (JSON.stringify(got.map((x) => Number(x[1]))) !== JSON.stringify(want)) bad.push(f + '：号の並び');
      if (!t.includes('<p class="notice">' + (en ? B.NOTICE_EN : B.NOTICE) + '</p>')) bad.push(f + '：断り');
      if (!t.includes(en ? 'they are not renumbered' : '合本のために振り直しません。')) bad.push(f + '：振り直さない旨');
      if (!(en ? ge : g).includes('<a href="monthly/' + m + (en ? '.en' : '') + '.html">')) bad.push(f + '：官報の頁から指していない');
    }
    seen.push(...want);
  }
  ok('月ごとの合本（' + months.length + ' 月）は、その月の号だけを古い順に、一号ごとの頁と同じ番号で載せ、官報の頁から指される（日本語と英語）', months.length > 0 && bad.length === 0, bad.join(' / '));
  ok('合本の号を合わせると、号は 1 から ' + items.length + ' まで欠けず重ならない。合本の数は月の数の二倍', JSON.stringify(seen.slice().sort((a, b) => a - b)) === JSON.stringify(items.map((x) => x.no).sort((a, b) => a - b))
    && fs.existsSync(path.join(ROOT, 'site', 'monthly')) && fs.readdirSync(path.join(ROOT, 'site', 'monthly')).length === 2 * months.length);
  const rows = [...g.matchAll(/<tr><td><a href="monthly\/(\d{4}-\d{2})\.html">[^<]+<\/a><\/td><td>(\d+)<\/td>/g)];
  ok('官報の頁の合本の表の号の数は、月ごとに数えたものと同じで、足すと全体になる', rows.length === months.length && rows.every(([, m, n]) => Number(n) === items.filter((x) => x.date.startsWith(m)).length)
    && rows.reduce((a, r) => a + Number(r[2]), 0) === items.length);
  ok('一号ごとの頁は、その号の月の合本を指す', items.every((x) => read('site/gazette/' + x.no + '.html').includes('<a href="../monthly/' + x.date.slice(0, 7) + '.html">')
    && read('site/gazette/' + x.no + '.en.html').includes('<a href="../monthly/' + x.date.slice(0, 7) + '.en.html">')));
}

console.log('\n40. 年ごとの版図を並べて比べる頁');
{
  const E = B.errataEntries(), years = B.errataYears();
  const vb = (t) => (/viewBox="([^"]+)"/.exec(t) || [])[1];
  const now = vb(read('site/territory.svg'));
  const bad = [];
  for (const en of [false, true]) {
    const t = read('site/territory-years' + (en ? '.en' : '') + '.html');
    const svgs = [...t.matchAll(/<svg [^>]*viewBox="([^"]+)"[^>]*aria-labelledby="ty(\d{4})">([\s\S]*?)<\/svg>/g)];
    if (JSON.stringify(svgs.map((m) => m[2])) !== JSON.stringify(years)) bad.push((en ? 'en' : 'ja') + '：年の並び');
    for (const [, box, y, body] of svgs) {
      const n = E.filter((e) => e.date.slice(0, 4) <= y).length;
      if (box !== now) bad.push(y + '：縮尺がいまの地図と違う');
      if ((body.match(/fill="#c9a227"/g) || []).length !== n) bad.push(y + '：区画の数');
      if (!t.includes('<a href="territory-' + y + '.svg">territory-' + y + '.svg</a>')) bad.push(y + '：年の地図へのリンク');
    }
    if (!t.includes('<p class="notice">' + (en ? B.NOTICE_EN : B.NOTICE) + '</p>')) bad.push('断り');
  }
  ok('年ごとの版図の頁は、どの年（' + years.length + ' 年）の地図も、いまの地図と同じ縮尺で、その年の終わりまでの件数だけの区画を描く（日本語と英語）', bad.length === 0, bad.join(' / '));
  const wide = B.territorySvg(3, { frame: 40 }), own = B.territorySvg(3);
  ok('同じ縮尺の枠は、件数の少ない年の地図を小さく描く（枠の幅は件数の多いほうに合う）', vb(wide) === vb(B.territorySvg(40)) && vb(own) !== vb(wide) && (wide.match(/fill="#c9a227"/g) || []).length === 3);
  ok('国のしるしと正誤表の頁が、年ごとの版図の頁を指す', read('SYMBOLS.md').includes('[年ごとの版図](site/territory-years.html)') && read('SYMBOLS.en.md').includes('(site/territory-years.en.html)')
    && read('site/errata.html').includes('<a href="territory-years.html">') && read('site/errata.en.html').includes('<a href="territory-years.en.html">'));
}

console.log('\n41. 建国の物語の章ごとの頁（文に手を入れない）');
{
  const bad = [];
  let total = 0;
  for (const en of [false, true]) {
    const src = read(en ? 'STORY.en.md' : 'STORY.md');
    const ch = B.storyChapters(en);
    total = ch.length;
    if (ch.length !== (src.match(/^## /gm) || []).length || src.slice(src.indexOf('\n## ') + 1).trim() !== ch.map((c) => c.text).join('\n\n')) bad.push((en ? 'en' : 'ja') + '：章を合わせても元の文にならない');
    for (const c of ch) {
      const f = 'site/story/' + c.n + (en ? '.en' : '') + '.html';
      if (!fs.existsSync(path.join(ROOT, f))) { bad.push(f + ' がない'); continue; }
      const main = ((/<main id="main">([\s\S]*)<\/main>/.exec(read(f)) || [])[1] || '').replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
      const lines = c.text.split('\n').filter((l) => l.trim()).map((l) => l.replace(/^## /, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'));
      const miss = lines.filter((l) => !main.includes(l));
      if (miss.length) bad.push(f + '：' + miss[0]);
      if (!read(f).includes('<h2>' + c.heading + '</h2>') || !read(f).includes('<p class="notice">' + (en ? B.NOTICE_EN : B.NOTICE) + '</p>')) bad.push(f + '：見出しか断り');
      if (!read('site/story' + (en ? '.en' : '') + '.html').includes('<a href="story/' + c.n + (en ? '.en' : '') + '.html">' + c.heading + '</a>')) bad.push(f + '：目次から指していない');
    }
  }
  ok('物語の章（' + total + ' 章）は、元の文の節をそのまま一頁ずつに収め、物語の頁の目次から指される（日本語と英語）',
    total > 0 && bad.length === 0 && fs.existsSync(path.join(ROOT, 'site', 'story')) && fs.readdirSync(path.join(ROOT, 'site', 'story')).length === 2 * total, bad.join(' / '));
}

console.log('\n42. しるしの作図の頁（手順の文は国のしるしから、図は画像の要素から）');
{
  const all = (rel) => [...read(rel).matchAll(/<(rect|polygon) [^>]*\/>/g)].map((m) => m[0]);
  const fg = B.flagGroups(), eg = B.emblemGroups();
  const covers = (gs, rel) => gs.groups.every((g) => g.length > 0) && JSON.stringify(gs.groups.flat().map((e) => e.raw).sort()) === JSON.stringify(all(rel).sort());
  ok('国旗の要素は五つの組に、国章の要素は四つの組に、欠けず重ならずに分かれる', covers(fg, 'assets/flag.svg') && covers(eg, 'assets/emblem.svg') && fg.groups.length === 5 && eg.groups.length === 4);
  const COLORS = ['#14213d', '#c9a227', '#e8cf74', '#0b1428'];
  const bad = [];
  for (const en of [false, true]) {
    const t = read('site/symbols-construction' + (en ? '.en' : '') + '.html');
    const steps = [...t.matchAll(/<svg [^>]*aria-labelledby="([fe])s(\d+)">[\s\S]*?<\/svg>/g)];
    const sym = en ? 'SYMBOLS.en.md' : 'SYMBOLS.md';
    const nf = B.listIn(sym, en ? 'How the flag is drawn' : '国旗の作図').length, ne = B.listIn(sym, en ? 'How the emblem is drawn' : '国章の作図').length;
    if (steps.filter((m) => m[1] === 'f').length !== nf || steps.filter((m) => m[1] === 'e').length !== ne) bad.push((en ? 'en' : 'ja') + '：手順の図の数');
    const last = (k, n) => (steps.find((m) => m[1] === k && Number(m[2]) === n) || [''])[0];
    if (JSON.stringify(all('assets/flag.svg').sort()) !== JSON.stringify([...last('f', nf).matchAll(/<(rect|polygon) [^>]*\/>/g)].map((m) => m[0]).sort())) bad.push('国旗の最後の図が国旗の画像と違う');
    if (JSON.stringify(all('assets/emblem.svg').sort()) !== JSON.stringify([...last('e', ne).matchAll(/<(rect|polygon) [^>]*\/>/g)].map((m) => m[0]).sort())) bad.push('国章の最後の図が国章の画像と違う');
    const main = (/<main id="main">([\s\S]*)<\/main>/.exec(t) || [])[1] || '';
    if (/<text|font-family/.test(main) || [...new Set((main.match(/#[0-9a-f]{6}/gi) || []).map((c) => c.toLowerCase()))].some((c) => !COLORS.includes(c))) bad.push('国章の色のほかの色か文字');
    for (const l of B.listIn(sym, en ? 'How the flag is drawn' : '国旗の作図').concat(B.listIn(sym, en ? 'How the emblem is drawn' : '国章の作図'))) if (!t.includes(l.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'))) bad.push('手順の文：' + l.slice(0, 20));
    const swatches = (t.match(/<span class="swatch">/g) || []).length, tiles = (t.match(/<span class="tile">/g) || []).length;
    const colorRows = read(sym).split('\n').filter((l) => /^\| [^|]+ \| `#[0-9a-f]{6}` \|/.test(l)).length;
    if (swatches !== colorRows || colorRows !== COLORS.length || tiles !== B.KINDS.length) bad.push('色（' + swatches + '）か区画（' + tiles + '）の数');
    if (!t.includes('<p class="notice">' + (en ? B.NOTICE_EN : B.NOTICE) + '</p>')) bad.push('断り');
  }
  ok('作図の頁は、手順ごとに図を一つ持ち、最後の図は画像そのもので、国の色（' + COLORS.length + '）と区画の形（' + B.KINDS.length + '）を挙げ、文字を描かない（日本語と英語）', bad.length === 0, bad.join(' / '));
  const em = read('assets/emblem.svg');
  const r = [...em.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"([^>]*)\/>/g)].map((m) => ({ x: Number(m[1]), y: Number(m[2]), w: Number(m[3]), h: Number(m[4]), a: m[5] }));
  const golden = r.filter((q) => /stroke="#e8cf74"/.test(q.a));
  const gx = Math.min(...golden.map((q) => q.x)), gy = Math.min(...golden.map((q) => q.y));
  const gw = Math.max(...golden.map((q) => q.x + q.w)) - gx, gh = Math.max(...golden.map((q) => q.y + q.h)) - gy;
  const stones = r.filter((q) => /fill="#c9a227"/.test(q.a) && q.w === q.h);
  const polys = [...em.matchAll(/<polygon points="([^"]+)"/g)].map((m) => m[1].split(' ').map((p) => p.split(',').map(Number)));
  const outer = polys[0], inner = polys[1], blade = polys.find((p) => p.length < 8);
  const nums = { vb: /viewBox="0 0 (\d+) (\d+)"/.exec(em).slice(1).join(','), corner: gx + ',' + gy, size: gw + ',' + gh, sides: golden.map((q) => String(q.w)).join('、'),
    stone: stones.length + ',' + [...new Set(stones.map((q) => q.w))].join('/') + ',' + [...new Set(stones.slice(1).map((q, i) => q.x - stones[i].x - stones[i].w))].join('/') + ',' + [...new Set(stones.map((q) => q.y))].join('/'), border: (inner[0][1] - outer[0][1]) + ',' + (inner[0][0] - outer[0][0]), point: Math.max(...blade.map((p) => p[1])) };
  const sj = read('SYMBOLS.md'), se = read('SYMBOLS.en.md');
  ok('国章の作図の数は、国章の画像の座標そのまま（枠・縁・黄金比の矩形・正方形・角石・切っ先）（日本語と英語）',
    nums.vb === '600,720' && nums.border === '20,20' && nums.corner === '120,112' && nums.size === '360,222.5' && nums.sides === '222.5、137.5、85、52.5、32.5、20.1' && nums.stone === '3,18,10,76' && nums.point === 632
    && sj.includes('横 600、縦 720 の枠') && sj.includes('太さ 20 の金の縁') && sj.includes('左上の角は (120, 112)') && sj.includes('横 360、縦 222.5') && sj.includes('正方形の辺は ' + nums.sides + ' と')
    && sj.includes('辺 18 の金の正方形（角石）を三つ、間を 10 空けて並べる。上の端は 76 に置く。') && sj.includes('切っ先は 632 に届く。')
    && se.includes('600 wide and 720 high') && se.includes('A gold border 20 thick') && se.includes('top-left corner at (120, 112)') && se.includes('360 wide and 222.5 high') && se.includes(nums.sides.replace(/、/g, ', '))
    && se.includes('sides of 18, 10 apart, their top edge at 76') && se.includes('The point reaches 632.'), JSON.stringify(nums));
  ok('国のしるしの頁が、作図の頁を指す（日本語と英語）', sj.includes('[しるしの作図](site/symbols-construction.html)') && se.includes('(site/symbols-construction.en.html)'));
}

console.log('\n43. ミクロネーションの界隈へ向けた英語の紹介');
{
  const para = (f, h) => { const t = read(f); const i = t.indexOf('\n## ' + h + '\n'); const j = t.indexOf('\n## ', i + 5); return i < 0 ? [] : t.slice(i + h.length + 5, j).split(/\n{2,}/).map((p) => p.trim()).filter(Boolean); };
  const pj = para('PRESS.md', 'ミクロネーションの界隈へ向けた紹介'), pe = para('PRESS.en.md', 'For the micronation community');
  const d = B.FOUNDED.split('-').map(Number);
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  ok('紹介の文は、最初の文で創作だと断り、建国の日は FOUNDED と同じで、願い出の限りを規程と同じ言葉で書く（日本語と英語）',
    pj.length === 2 && pe.length === 2 && pj[1].startsWith('これは創作であり、') && pe[1].startsWith('This is a work of fiction,')
    && pj[1].includes(d[0] + ' 年 ' + d[1] + ' 月 ' + d[2] + ' 日に建国を宣した') && pe[1].includes('declared on ' + d[2] + ' ' + months[d[1] - 1] + ' ' + d[0])
    && pj[1].includes('2026-11-22 から、願い出ることができるのは、日本に住んでいて、願い出のときに日本にいる人に限ります。') && read('policies/knighting.md').includes('2026-11-22 から、願い出ることができるのは、日本に住んでいて、願い出のときに日本にいる人に限ります。')
    && pe[1].includes('only people who live in Japan and are in Japan when they apply may apply') && read('policies/terms.en.md').includes('only people who live in Japan and are in Japan when they apply may apply'));
  ok('紹介の文は、称号に効力がないこと、条約・称号の授け合い・金銭のやりとりをしないことを書き、交流の規程と合う',
    pj[1].includes('称号に法的な効力はなく') && pj[1].includes('条約を結ばず、称号を授け合わず、金銭のやりとりをしません。') && pe[1].includes('The titles have no legal effect')
    && pe[1].includes('Nusquama makes no treaties, gives no titles in exchange, and handles no money.') && read('policies/exchange.md').includes('- 交流は、挨拶と、互いの頁へのリンクに留めます。'));
}

console.log('\n44. 外のパッケージに頼らない');
{
  const { builtinModules } = require('module');
  /* playwright を読むのは、手で走らせるアイコンの作図と、CI の別の job で走らせるはみ出しの検査だけ。 */
  const ALLOW = { 'tools/icons.js': ['playwright'], 'verification/check_layout.js': ['playwright'] };
  const list = (dir, rel = '') => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (['.git', 'node_modules', 'site'].includes(e.name) ? []
    : e.isDirectory() ? list(path.join(dir, e.name), rel + e.name + '/') : [rel + e.name]));
  const js = list(ROOT).filter((f) => /\.(c|m)?js$/.test(f));
  const bad = [];
  for (const f of js) {
    const t = read(f);
    const ids = [...t.matchAll(/\brequire\(\s*['"]([^'"]+)['"]\s*\)/g), ...t.matchAll(/\bimport\s[^;'"]*?from\s+['"]([^'"]+)['"]/g), ...t.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1]);
    for (const id of ids) if (!id.startsWith('.') && !builtinModules.includes(id.replace(/^node:/, '')) && !(ALLOW[f] || []).includes(id)) bad.push(f + '：' + id);
  }
  ok('どのスクリプト（' + js.length + '）も、Node.js に備わるモジュールとリポジトリの中のファイルだけを読む（playwright は、手で走らせる icons.js と、別の job の check_layout.js だけ）', js.length > 0 && bad.length === 0, bad.join(', '));
  const lock = ['package.json', 'package-lock.json', 'npm-shrinkwrap.json', 'yarn.lock', 'pnpm-lock.yaml', 'node_modules', '.npmrc', 'requirements.txt'].filter((f) => fs.existsSync(path.join(ROOT, f)));
  ok('package.json も lock のファイルも node_modules もない', lock.length === 0, lock.join(', '));
  const wfs = fs.readdirSync(path.join(ROOT, '.github', 'workflows'));
  const installs = wfs.flatMap((f) => read('.github/workflows/' + f).split('\n').filter((l) => /\b(npm|npx|yarn|pnpm|pip3?)\b/.test(l)).map((l) => f + '：' + l.trim()));
  const allowed = ['check.yml：npm install -g playwright@1.56.1', 'check.yml：npx playwright install --with-deps chromium', 'check.yml：run: NODE_PATH="$(npm root -g)" node verification/check_layout.js'];
  ok('ワークフローがパッケージを入れるのは、はみ出しの job の playwright（版を固める）だけ', installs.length === allowed.length && installs.every((l) => allowed.includes(l)), installs.filter((l) => !allowed.includes(l)).join(' / '));
}

console.log('\n45. ワークフローの権限は、要るものだけ');
{
  /* 書き込みが要る理由：issue へのコメントと issue を開く（issues）、PR を作る（pull-requests）、枝に push する（contents）。
   * ワークフローを足したら、ここに足す。権限を広げるときも、ここを直す。 */
  const PERM = {
    'check.yml': { contents: 'read' },
    'knighting.yml': { contents: 'read', issues: 'write' },
    'labels.yml': { issues: 'write' },
    'live.yml': { contents: 'read', issues: 'write' },
    'record.yml': { contents: 'write', issues: 'write', 'pull-requests': 'write' },
    'review.yml': { contents: 'read', issues: 'write' },
    'sources.yml': { contents: 'write' },
    'statutes.yml': { contents: 'write', issues: 'write', 'pull-requests': 'write' },
    'world.yml': { contents: 'write' },
  };
  const wfs = fs.readdirSync(path.join(ROOT, '.github', 'workflows')).sort();
  const bad = [];
  for (const f of wfs) {
    const t = read('.github/workflows/' + f);
    const m = /^permissions:\n((?: {2}[\w-]+: \w+\n)+)/m.exec(t);
    const got = m ? Object.fromEntries(m[1].trim().split('\n').map((l) => l.trim().split(': '))) : null;
    if (!PERM[f]) bad.push(f + '：表にない');
    else if (!got || JSON.stringify(got) !== JSON.stringify(PERM[f])) bad.push(f + '：' + JSON.stringify(got));
    if (/^ +permissions:/m.test(t) || /write-all|read-all/.test(t)) bad.push(f + '：job ごとの権限か、まとめた権限');
  }
  ok('どのワークフロー（' + wfs.length + '）も、先頭で権限を挙げ、表のとおり要るものだけを持つ', wfs.length === Object.keys(PERM).length && bad.length === 0, bad.join(' / '));
}

console.log('\n46. 秘密情報と連絡先の走査');
{
  const S = require('../tools/scan.js');
  const r = S.scan(ROOT);
  ok('リポジトリの ' + r.files + ' ファイルに、秘密情報も、許したもののほかの連絡先もない', r.files > 100 && r.hits.length === 0, r.hits.join(' / '));
  /* 鍵や宛先の形は、ここで組み立てる。そのまま書くと、このファイル自身が走査に掛かる。 */
  const fake = ['-----BEGIN ' + 'RSA PRIVATE KEY-----', 'gh' + 'p_' + 'a1'.repeat(18), 'AK' + 'IA' + 'ABCDEFGHIJKLMNOP', 'token: "' + 'x1'.repeat(8) + '"', 'someone' + '@' + 'example.org', '03' + '-1234-5678', '〒' + '100-0001'];
  ok('走査は、鍵・token・代入・メールアドレス・電話番号・郵便番号の形を一つずつ見つけ、許した noreply・暦の UID・日付は見逃す',
    fake.every((t) => S.scanText(t).length === 1) && S.scanText('UID:1107' + '@nusquama.vercel.app').length === 0 && S.scanText('noreply' + '@anthropic.com').length === 0 && S.scanText('2026-11-11 と 03-12').length === 0);
  const wf = read('.github/workflows/check.yml');
  ok('検査（走査を含む）は、push と PR のほか、週に一度も回る', /\n {2}schedule:\n {4}- cron: '\d+ \d+ \* \* \d'\n/.test(wf) && wf.includes('run: node verification/check.js'));
}

console.log('\n47. 頁の形（言語の切り替え・下の欄・代替テキスト・重さ・索引）');
{
  const html = walk(path.join(ROOT, 'site')).filter((f) => f.endsWith('.html'));
  const bad = { lang: [], foot: [], alt: [], weight: [], canon: [], dims: [] };
  const KIB = 1024, PAGE = 128 * KIB, WITH_IMAGES = 160 * KIB;
  for (const f of html) {
    const t = read('site/' + f);
    const en = /<html lang="en">/.test(t);
    const head = (/<header>([\s\S]*?)<\/header>/.exec(t) || [])[1] || '';
    const lang = [...t.matchAll(/<a class="lang" href="([^"]+)" hreflang="(\w+)" lang="(\w+)">([^<]+)<\/a>/g)];
    const target = lang[0] && (f === '404.html' ? lang[0][1].replace(/^\//, '') : path.posix.normalize(path.posix.join(path.posix.dirname(f), lang[0][1])));
    if (lang.length !== 1 || !head.includes(lang[0][0]) || (en ? lang[0][4] !== '日本語' || lang[0][2] !== 'ja' : lang[0][4] !== 'English' || lang[0][2] !== 'en') || !fs.existsSync(path.join(ROOT, 'site', target))) bad.lang.push(f);
    const foot = (/<footer>([\s\S]*?)<\/footer>/.exec(t) || [])[1] || '';
    /* 運営者・連絡・免責の欄は、下の欄の頁の一覧とは別の一文で書く（一覧の中のリンクでは足りない）。 */
    const need = en ? [/<p>Operator: the individual who owns the GitHub account cpsbvbng26-dotcom, and who plays the King\. Contact: <a href="[^"]*policies\/requests\.en\.html">Requests<\/a>, <a href="[^"]*\?template=error\.yml">Report a mistake<\/a>, <a href="[^"]*SECURITY\.md">Reporting a security issue<\/a>\. Disclaimer: <a href="[^"]*policies\/disclaimer\.en\.html">Disclaimer<\/a>\.<\/p>/, /Written with Claude Code \(Anthropic\)\./, new RegExp('<p>' + B.SEPARATE_EN + '</p>')]
      : [/<p>運営者は、GitHub のアカウント cpsbvbng26-dotcom の持ち主である個人で、王の役を務めます。連絡は、<a href="[^"]*policies\/requests\.html">削除・訂正・辞退の求め<\/a>、<a href="[^"]*\?template=error\.yml">誤りの知らせ<\/a>、<a href="[^"]*SECURITY\.md">安全の問題の知らせ方<\/a>で受けます。免責は、<a href="[^"]*policies\/disclaimer\.html">免責事項<\/a>にあります。<\/p>/, /Claude Code（Anthropic）で書きました。/, new RegExp('<p>' + B.SEPARATE + '</p>')];
    if (!need.every((x) => x.test(foot)) || /github\.com\/cpsbvbng26-dotcom\/(?!nusquama[/"])|cpsbvbng26-dotcom\.github\.io/.test(t)) bad.foot.push(f);
    const imgs = [...t.matchAll(/<img ([^>]*)>/g)].map((m) => m[1]);
    const deco = imgs.filter((a) => /alt=""/.test(a));
    if (deco.length !== 1 || !head.includes('<img src="' + (/src="([^"]*emblem\.svg)" alt=""/.exec(head) || [, '?'])[1] + '" alt="" width="40" height="48">')) bad.alt.push(f + '：飾り');
    /* 画像は縦横を書いて場所を取っておく。縦横は SVG の viewBox と同じ。最初の画面より下の、文の中の画像だけを遅れて読む。 */
    const first = (/<figure class="first">([\s\S]*?)<\/figure>/.exec(t) || [])[1] || '';
    for (const a of imgs) {
      const src = (/src="([^"]+)"/.exec(a) || [])[1] || '';
      const file = path.join(ROOT, 'site', f === '404.html' ? src.replace(/^\//, '') : path.posix.normalize(path.posix.join(path.posix.dirname(f), src)));
      const vb = fs.existsSync(file) ? /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(fs.readFileSync(file, 'utf8')) : null;
      const inHead = head.includes('<img ' + a + '>'), inFirst = first.includes('<img ' + a + '>');
      const w = (/ width="([\d.]+)"/.exec(a) || [])[1], h = (/ height="([\d.]+)"/.exec(a) || [])[1];
      const sized = inHead ? w === '40' && h === '48' : !!vb && w === vb[1] && h === vb[2];
      const lazy = / loading="lazy"/.test(a);
      if (!sized || (inHead || inFirst ? lazy : !lazy || !/ decoding="async"/.test(a))) bad.dims.push(f + '：' + src);
    }
    for (const a of imgs.filter((x) => !/alt=""/.test(x))) {
      const alt = (/alt="([^"]*)"/.exec(a) || [])[1] || '';
      if (/\.(svg|png)|^(画像|image)/i.test(alt) || !(en ? alt.endsWith('(fiction)') : alt.endsWith('（創作）'))) bad.alt.push(f + '：' + alt);
    }
    const size = Buffer.byteLength(t);
    const imgBytes = imgs.map((a) => (/src="([^"]+)"/.exec(a) || [])[1]).filter(Boolean).map((s) => (f === '404.html' ? s.replace(/^\//, '') : path.posix.normalize(path.posix.join(path.posix.dirname(f), s))))
      .reduce((n, p) => n + (fs.existsSync(path.join(ROOT, 'site', p)) ? fs.statSync(path.join(ROOT, 'site', p)).size : Infinity), 0);
    if (size > PAGE || size + imgBytes > WITH_IMAGES) bad.weight.push(f + '：' + size + '+' + imgBytes);
    const canon = (/<link rel="canonical" href="([^"]+)">/.exec(t) || [])[1];
    if (f === '404.html' ? canon || !t.includes('<meta name="robots" content="noindex">') : canon !== B.BASE + (f === 'index.html' ? '' : f)) bad.canon.push(f);
  }
  ok('どの頁（' + html.length + '）も、言語の切り替えを頁の上の欄の右端に一つだけ置き、日本語の頁は「English」、英語の頁は「日本語」と書き、指す先がある', bad.lang.length === 0, bad.lang.slice(0, 8).join(', '));
  ok('どの頁の下の欄も、運営者・連絡（求め・誤りの知らせ・安全の知らせ）・免責・開示と、研究とは別のもので、その一部ではないという一文をそろえ、研究の系列へつながない', bad.foot.length === 0, bad.foot.slice(0, 8).join(', '));
  ok('代替テキスト：頁の上の国章だけが飾りで空にし、中身の画像は何の画像かを書いて（創作）・(fiction) を添え、ファイル名を書かない', bad.alt.length === 0, bad.alt.slice(0, 8).join(', '));
  ok('どの頁も 128 KiB 以下で、読む画像を足しても 160 KiB 以下', bad.weight.length === 0, bad.weight.join(', '));
  ok('どの画像も縦横（SVG の viewBox と同じ）を書いて場所を取り、頁の上の国章とトップの最初の画面の図のほかは遅れて読む', bad.dims.length === 0, bad.dims.slice(0, 8).join(', '));
  const vp = html.map((f) => (/<meta name="viewport" content="([^"]+)">/.exec(read('site/' + f)) || [])[1]);
  ok('拡大を止めない（viewport に user-scalable も maximum-scale もない）。表は枠の中で横に送り、長い語は折り返す', vp.every((v) => v === 'width=device-width, initial-scale=1, viewport-fit=cover')
    && /\.table \{ overflow-x: auto; \}/.test(read('site/index.html')) && /p, li \{ overflow-wrap: anywhere; \}/.test(read('site/index.html')));
  const lay = read('verification/check_layout.js'), cy = read('.github/workflows/check.yml');
  ok('はみ出しの検査は、360 px と、1280 px の 200% に当たる 640 px を含む幅で、どの頁も描いて測り、CI の別の job で走る',
    /const WIDTHS = \[[^\]]*\b640\b[^\]]*\b360\b[^\]]*\];/.test(lay) && cy.includes('node verification/check_layout.js') && /\n {2}layout:\n/.test(cy));
  const robots = read('site/robots.txt'), sm = read('site/sitemap.xml');
  const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const want = html.filter((f) => f !== '404.html').map((f) => B.BASE + (f === 'index.html' ? '' : f)).sort();
  ok('robots.txt はサイトマップを指し、サイトマップは 404 のほかのすべての頁（' + want.length + '）を一度ずつ挙げる', robots.includes('Allow: /') && robots.includes('Sitemap: ' + B.BASE + 'sitemap.xml')
    && locs.length === want.length && JSON.stringify(locs.slice().sort()) === JSON.stringify(want));
  ok('どの頁も、自分の所在を正の URL（canonical）に持ち、404 の頁は持たずに noindex とする', bad.canon.length === 0, bad.canon.slice(0, 8).join(', '));
}

console.log('\n48. 誤りの知らせの様式（ラテン語の誤りも）');
{
  const y = read('.github/ISSUE_TEMPLATE/error.yml');
  const opts = (((/id: kind[\s\S]*?options:\n((?: {8}- .+\n)+)/.exec(y)) || [])[1] || '').split('\n').filter(Boolean).map((l) => l.trim().slice(2));
  ok('様式の分類は、王の正誤表の分類（' + B.KINDS.length + '）と同じ並びで、ラテン語は「語」に入る', opts.length === B.KINDS.length && opts.every((o, i) => o.replace(/（.*）$/, '') === B.KINDS[i].ja) && opts.includes('語（ラテン語を含む）'), opts.join(' / '));
  ok('様式は、公開されることと書かないことを知らせ、使い道を一つに限り、知らせた人の名を正誤表に書かず、叙任にならないと書く',
    /^labels: \["誤り"\]$/m.test(y) && ['この issue は公開されます。本名・住所・所属・連絡先は書かないでください。', '書いたものは、知らされた誤りを確かめ、王の正誤表に記すことにだけ使います。',
      '知らせた人の名は、正誤表に書きません。', '王の誤りを知らせることは、叙任の条件（自分の誤りを一つ、公に訂正したこと）には当たりません。', 'ラテン語の誤り（語形・格・綴り・文法）は、分類で「語」を選びます。'].every((x) => y.includes(x)));
  const pj = read('policies/privacy.md'), pe = read('policies/privacy.en.md');
  const old = '叙任を判断すること、名簿を載せること、求めに応じること。これ以外には使いません。';
  ok('個人情報の取り扱いが、利用の目的に誤りの知らせを足し、扱うものの節を持ち（日本語と英語）、改める前の文を王の正誤表に残す',
    pj.includes('叙任を判断すること、名簿を載せること、求めに応じること、知らされた誤りを確かめて王の正誤表に記すこと。これ以外には使いません。') && !pj.includes(old) && pj.includes('\n## 誤りの知らせで扱うもの\n')
    && pe.includes('and to check reported mistakes and record them in the King\'s errata. Nothing else.') && pe.includes('\n## What a report of a mistake involves\n')
    && B.tableRows('ERRATA.md').some((r) => r[2] === '個人情報の取り扱い「利用の目的」' && r[3] === old));
  const form = 'https://github.com/cpsbvbng26-dotcom/nusquama/issues/new?template=error.yml';
  ok('王の正誤表と国の言葉（日本語と英語）が、様式へつなぎ、ラテン語の誤りを分類「語」で記すと書く', ['ERRATA.md', 'ERRATA.en.md', 'LEXICON.md', 'LEXICON.en.md', 'policies/privacy.md'].every((f) => read(f).includes('(' + form + ')'))
    && read('LEXICON.md').includes('\n## ラテン語の誤りの知らせ\n') && read('LEXICON.md').includes('分類「語」で記します。') && read('LEXICON.en.md').includes('under the category Word.'));
}

console.log('\n49. 言語モデルの使い方の開示の表');
{
  const t = read('README.md');
  const i = t.indexOf('\n## ライセンスと開示\n');
  const part = i < 0 ? '' : t.slice(i);
  const rows = part.split('\n').filter((l) => /^\| (?!---|道具 )/.test(l));
  ok('README の開示に、道具・使ったこと・確かめた人の表があり、Claude Code の行の確かめた人は運営者', part.includes('| 道具 | 使ったこと | 確かめた人 |') && rows.length === 1
    && rows[0].startsWith('| Claude Code（Anthropic） |') && rows[0].endsWith('| 運営者（王の役） |') && part.includes('Claude は騎士でも王でもありません。'));
}

console.log('\n50. 散文に書いた数（決めごと 5）');
{
  const KJ = ' 一二三四五六七八九十', KE = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  const numJ = (t, re) => KJ.indexOf((re.exec(t) || [])[1] || '?');
  const numE = (t, re) => KE.indexOf(((re.exec(t) || [])[1] || '?').toLowerCase());
  const listAfter = (t, s) => { const i = t.indexOf(s); if (i < 0) return -1; const lines = t.slice(i + s.length).split('\n').slice(1); let n = 0; for (const l of lines) { if (/^\d+\. /.test(l)) n++; else if (n && l.trim() === '') break; else if (n) break; } return n; };
  const ej = read('ERRATA.md'), ee = read('ERRATA.en.md');
  const kindRows = (t) => { const i = t.indexOf('\n| ' + (t === ej ? '分類' : 'Category') + ' |'); if (i < 0) return -1; const rest = t.slice(i + 1).split('\n').slice(2); const n = rest.findIndex((l) => !l.startsWith('| ')); return n < 0 ? rest.length : n; };
  ok('王の正誤表の分類の数（' + B.KINDS.length + '）を、文（六つ・six）と表の行で同じに書く', numJ(ej, /誤りは、次の(.)つに分けます。/) === B.KINDS.length && numE(ee, /sorted into (\w+) categories/) === B.KINDS.length
    && kindRows(ej) === B.KINDS.length && kindRows(ee) === B.KINDS.length && numJ(read('CLAUDE.md'), /`KINDS` の(.)つ/) === B.KINDS.length);
  const lj = read('policies/legality.md'), le = read('policies/legality.en.md');
  ok('適法性の説明の審査の方法の数を、文と並べた箇条で同じに書く（日本語と英語）', numJ(lj, /次の(.)つの方法で確かめました。/) === listAfter(lj, 'この頁の結論は、次の') && numE(le, /checked in the (\w+) ways below/) === listAfter(le, 'The conclusion of this page was checked in the') && listAfter(lj, 'この頁の結論は、次の') === 5);
  const plj = read('PLAY.md'), ple = read('PLAY.en.md');
  ok('遊びの雛形の決まりの数と、練習の文の数を、文と箇条で同じに書く（日本語と英語）', numJ(plj, /使うときの決まりは(.)つです。/) === listAfter(plj, '使うときの決まりは') && numE(ple, /^(\w+) rules go with it\./m) === listAfter(ple, 'rules go with it.')
    && numJ(plj, /次の(.)つの文には/) === B.listIn('PLAY.md', '誤り探しの練習').length && numE(ple, /Each of these (\w+) sentences/) === B.listIn('PLAY.en.md', 'Practice: find the mistake').length);
  const stones = [...read('assets/emblem.svg').matchAll(/<rect [^>]*width="18" height="18"/g)].length;
  ok('国章の角石の数（' + stones + '）を、トップと国のしるしの文で同じに書く', stones === 3 && numJ(read('README.md'), /\*\*(.)つの角石\*\*/) === stones && numJ(read('SYMBOLS.md'), /矩形の上に、(.)つの角石を並べます。/) === stones);
  const fe = read('founding.en.md');
  const frozen = B.tableRows('ERRATA.md').filter((r) => r[2].startsWith('建国の宣言')).map((r) => r[0]);
  ok('建国の宣言の英訳が書く部分の数と、宣言の誤りの数と番（' + frozen.join('・') + '）が、頁と正誤表に合う', numE(fe, /translation of (\w+) parts of the top page/) === (fe.match(/^## /gm) || []).length
    && numE(fe, /correct (\w+) of its statements, in entries/) === frozen.length && fe.includes('in entries ' + frozen.join(' and ') + ' of') && read('LEXICON.md').includes('第 ' + frozen.join(' 件と第 ') + ' 件のとおり')
    && read('LEXICON.en.md').includes('entries ' + frozen.join(' and ') + ' of'));
  const tj = read('policies/terms.md'), te = read('policies/terms.en.md');
  const services = ((/\n## (.+) の規約\n/.exec(tj) || [])[1] || '').split('と').length;
  ok('利用規約が挙げるサービスの数（' + services + '）を、文に同じに書く（日本語と英語）', services === 2 && numJ(tj, /米国の(.)つのサービスの上で動いています。/) === services && numJ(tj, /\n(.)つのサービスの規約は、/) === services && numE(te, /runs on (\w+) services in the United States/) === services);
  const pj = read('policies/privacy.md'), pe = read('policies/privacy.en.md');
  const para = (t, s) => (t.split('\n').find((l) => l.includes(s)) || '');
  const cj = para(pj, '自ら公開の内容を使う場合が').split('。').filter((x) => /^(GitHub|Vercel) の利用規約は/.test(x)).length;
  const ce = para(pe, 'There are two cases').split('. ').filter((x) => /^(GitHub|Vercel)'s Terms of Service allow/.test(x)).length;
  ok('個人情報の取り扱いが挙げる、GitHub と Vercel が公開の内容を使う場合の数（' + cj + '）を、文に同じに書く（日本語と英語）', cj === 2 && ce === cj && numJ(pj, /使う場合が(.)つあり/) === cj && numE(pe, /There are (\w+) cases in which/) === ce);
}

console.log('\n51. 官報の号の台帳・記念の号・騎士の号');
{
  const items = B.gazetteItems(), ledger = B.readLedger();
  const nos = Object.values(ledger).sort((a, b) => a - b);
  ok('号の台帳は、いまのすべての号（' + items.length + '）を同じ番号で持ち、消えた行の鍵を持たず、番号は 1 から欠けず重ならない',
    items.every((x) => ledger[x.key] === x.no) && Object.keys(ledger).length === items.length && nos.every((n, i) => n === i + 1));
  const base = { timeline: B.timelineRows(), errata: B.tableRows('ERRATA.md'), knights: B.tableRows('KNIGHTS.md'), ledger };
  const same = (got) => items.every((x) => (got.find((y) => y.key === x.key) || {}).no === x.no);
  const chain = (got) => got.every((x, i) => i === 0 || got[i - 1].no === x.no + 1);
  const last = items[0].date;
  const t1 = B.gazetteItems(Object.assign({}, base, { timeline: base.timeline.concat([[last + '（日本時間）', '試しの行', 'A trial row']]) }));
  ok('同じ日に後から年表の行を足しても、いまの号は動かず、新しい行は次の号（' + (items.length + 1) + '）になり、日付の順と号の順がそろう', same(t1) && t1[0].no === items.length + 1 && t1[0].text === '試しの行' && chain(t1));
  const t2 = B.gazetteItems(Object.assign({}, base, { timeline: base.timeline.concat([['2026-11-08（日本時間）', '過去の日付の行', 'A past row']]) }));
  ok('過去の日付の行を後から足すと、日付の順と号の順が食い違い、号の並びの検査（30）が落ちる', same(t2) && !chain(t2));
  const fill = (n) => Array.from({ length: n }, (_, i) => base.errata[i] || [String(i + 1), '2026-12-01', '試し', '誤', '正', '先', '数', '']);
  const e99 = B.gazetteItems(Object.assign({}, base, { errata: fill(99) })), e100 = B.gazetteItems(Object.assign({}, base, { errata: fill(100) }));
  const m = e100.find((x) => x.key === 'M:100'), at = e100.find((x) => x.key === 'E:100');
  ok('王の正誤表が ' + B.MILESTONE + ' 件に達すると、記念の号がその件の号のすぐ後に一つでき、99 件ではできない。いまの号は動かない',
    B.MILESTONE === 100 && !e99.some((x) => x.kind === '記念の号') && e100.filter((x) => x.kind === '記念の号').length === 1 && m && at && m.no === at.no + 1 && m.text === '王の正誤表が 100 件に達する'
    && m.textEn === "The King's errata reach 100 entries" && same(e100) && chain(e100));
  const ij = read('INSTITUTIONS.md'), ie = read('INSTITUTIONS.en.md');
  ok('国の仕組みの記念の号は、' + B.MILESTONE + ' の倍数で、物・記章・証書を作らず、称号を授けないと書く（日本語と英語）', ij.includes('王の正誤表の件数が ' + B.MILESTONE + ' の倍数に達したときは、官報に記念の号を一つ載せます。')
    && ij.includes('記念に、物・記章・証書を作りません。称号も授けず、祝日も足しません。') && ie.includes('reaches a multiple of ' + B.MILESTONE + ', one commemorative issue') && ie.includes('No object, badge or certificate is made for it.'));
  /* 次の騎士は、いまの名簿の次の番（名簿が空なら第 1 番）。本物の騎士が載ったあとも同じ形を確かめる（叙任の通し稽古で見つけた）。 */
  const N = base.knights.length + 1, as1 = (t) => t.replace(/^第 \d+ 番/, '第 1 番').replace(/no\. \d+/, 'no. 1');
  const k1 = [String(N), 'アカウント名', '2026-12-01', '要約', '願い出'];
  const g1 = B.gazetteItems(Object.assign({}, base, { knights: base.knights.concat([k1]) }));
  const kn = g1.find((x) => x.key === 'K:' + N);
  const kj = read('KNIGHTS.md'), ke = read('KNIGHTS.en.md');
  ok('最初の騎士の号は、名簿の「記し方」に書いた形（ほかの騎士と同じ形）で、次の号になり、人口は 1 になる（日本語と英語）', kn && kn.no === items.length + 1 && same(g1)
    && kj.includes('官報の布告は「' + as1(kn.text) + '」の形になります。') && ke.includes('The gazette proclaims "' + as1(kn.textEn).replace('アカウント名', 'Account-name') + '".') && B.population(undefined, [k1]) === 1
    && B.population(undefined, base.knights.concat([k1])) === B.population() + 1);
  const cols = (t) => { const l = t.split('\n').find((x) => /^\| (番|No\.) \|/.test(x)); return l ? l.split('|').map((c) => c.trim()).filter(Boolean) : []; };
  const bul = (t, h) => { const i = t.indexOf('\n## ' + h + '\n'); return t.slice(i).split('\n').filter((l) => /^- [^：:]+[：:]/.test(l)).map((l) => l.slice(2).split(/[：:]/)[0]); };
  ok('名簿の「記し方」は、表の欄（' + cols(kj).length + '）を一つずつ、同じ名で説明する（日本語と英語）', JSON.stringify(bul(kj, '記し方')) === JSON.stringify(cols(kj)) && JSON.stringify(bul(ke, 'How entries are recorded')) === JSON.stringify(cols(ke)));
  const led1 = B.ledgerWith(g1, ledger);
  const k1w = [String(N), '辞退（2027-01-05）', '2026-12-01', '', ''];
  const gw = B.gazetteItems(Object.assign({}, base, { knights: base.knights.concat([k1w]), ledger: led1 })).find((x) => x.key === 'K:' + N);
  ok('辞退した騎士の号は、同じ番号のまま名を外した形になり、その年から人口に数えない（名簿の「辞退したとき」の形のまま）', gw && gw.no === kn.no && !gw.text.includes('アカウント名')
    && kj.includes('名を外した形（' + as1(gw.text) + '）') && ke.includes('("' + as1(gw.textEn) + '")') && B.population('2026', [k1w]) === 1 && B.population('2027', [k1w]) === 0);
  const ax = B.atom('knights', [k1]);
  ok('騎士の名簿の新着の配信は、叙任の日の欄から日付を取る', ax.includes('<updated>2026-12-01T00:00:00+09:00</updated>\n    <summary>') && (ax.match(/<updated>2026-12-01T/g) || []).length === 2);
}

console.log('\n52. 交流の申し出を受けたとき');
{
  const ej = read('policies/exchange.md'), ee = read('policies/exchange.en.md');
  const steps = (t, h) => { const i = t.indexOf('\n## ' + h + '\n'); const j = t.indexOf('\n## ', i + 5); return t.slice(i, j < 0 ? undefined : j).split('\n').filter((l) => /^\d+\. /.test(l)); };
  ok('交流の規程は、申し出を届いた場所で受けて答え、確かめることを箇条で挙げ、断るときも答える（日本語と英語で箇条の数がそろう）',
    ['交流の申し出は、届いた場所で受け、同じ場所で答えます。申し出のための様式は置きません。', '断るときも、答えを返します。断る理由には、この規程のどの決まりに当たるかだけを書きます。',
      '条約・同盟・承認・大使の交換を求められたときは、それを断り、挨拶とリンクだけなら受けると答えます。', '- 称号のほか、国籍・旅券・土地・位を売るものとも交流しません。', '- 大使・領事などの役を置かず、相手の大使や領事も受け入れません。',
      '相手が、ヌスクァマとの間に条約・同盟・承認があるように書いたときは、訂正を頼みます。訂正されないときは、交流を終えます。', '相手が、ヌスクァマの王や騎士に称号や勲章を授けたと書いたときは、受けないと答え、その記載を外すよう頼みます。',
      '始めた日も、年表に残します。'].every((x) => ej.includes(x)) && steps(ej, '申し出を受けたとき').length === 4 && steps(ee, 'When an offer is received').length === steps(ej, '申し出を受けたとき').length);
}

console.log('\n53. 解散の通し稽古（実行していない）');
{
  const ij = read('INSTITUTIONS.md'), ie = read('INSTITUTIONS.en.md');
  const stepsOf = (t, h) => { const i = t.indexOf('\n## ' + h + '\n'); const j = t.indexOf('\n## ', i + 5); return t.slice(i, j).split('\n').filter((l) => /^\d+\. /.test(l)).map((l) => l.replace(/^\d+\. /, '')); };
  const rowsOf = (t, h) => { const i = t.indexOf('\n## ' + h + '\n'); const j = t.indexOf('\n## ', i + 5); return t.slice(i, j < 0 ? undefined : j).split('\n').filter((l) => /^\| (\d+|ほか|Other) \|/.test(l)).map((l) => l.split(' | ')); };
  const sj = stepsOf(ij, '解散'), se = stepsOf(ie, 'Dissolution'), rj = rowsOf(ij, '解散の通し稽古'), re = rowsOf(ie, 'A dry run of dissolution');
  ok('通し稽古の表は、解散の段（' + sj.length + '）を一つずつ、段の文のままに通し、日本語と英語で行の数がそろう',
    sj.length === 6
    // 段 1〜3 は、いまの段の文のまま通す。段 4・5 は 2026-11-11 に改めたので、通し稽古の行は改める前の文（王の正誤表に残した文）を引く。
    && [0, 1, 2].every((i) => rj[i] && rj[i][0] === '| ' + (i + 1) && rj[i][1] === sj[i].replace(/。$/, '') && re[i] && re[i][1] === se[i])
    && [3, 4].every((i) => rj[i] && rj[i][0] === '| ' + (i + 1) && read('ERRATA.md').includes(rj[i][1] + '。') && re[i] && read('ERRATA.en.md').includes('"' + re[i][1] + '"')) && rj.length === re.length && rj.length > sj.length);
  ok('通し稽古では何も止めず消しておらず、終わりの言葉はトップに掲げていない', ij.includes('2026-11-11 に、解散の手順を、実行せずに一度通して確かめました。何も止めず、何も消していません。')
    && !read('README.md').includes('どこにもない国は、どこにもない所へ帰ります。') && fs.existsSync(path.join(ROOT, '.github', 'ISSUE_TEMPLATE', 'knighting.yml')) && fs.existsSync(path.join(ROOT, '.github', 'workflows', 'review.yml')));
}

console.log('\n54. ミクロネーションの界隈の言い回しとの対応');
{
  const rows = (f, h) => { const t = read(f); const i = t.indexOf('\n## ' + h + '\n'); const j = t.indexOf('\n## ', i + 5); return t.slice(i, j).split('\n').filter((l) => /^\| (?!---)/.test(l)).slice(1).map((l) => l.split(' | ').map((c) => c.replace(/^\| |\s\|$/g, ''))); };
  const rj = rows('PRESS.md', '界隈の言い回しとの対応'), re = rows('PRESS.en.md', 'Terms used in the micronation community');
  ok('紹介の頁の言い回しの表（' + rj.length + ' 行）は、日本語と英語で同じ界隈の語を同じ順に挙げ、持たないものは両方で「なし」「none」とする',
    rj.length >= 8 && rj.length === re.length && rj.every((r, i) => r[0] === re[i][0] && (r[1] === 'なし') === (re[i][1] === 'none'))
    && rj.some((r) => r[0].includes('mutual recognition') && r[1] === 'なし') && rj.some((r) => r[0].startsWith('citizens') && r[1] === 'なし'));
}

console.log('\n55. 規程の分かりにくい文の言い直し（王の正誤表の手順）');
{
  /* 言い直しも、文を置き換えることなので、国の仕組み「改めるとき」の順による。改める前の文を王の正誤表に残し、
   * 日本語と英語の最終更新を同じ日に改め、年表に一行を足す。言い直した行は、正の欄をこの一文で始める。 */
  const REWORD = '誤りではなく、分かりにくい文を言い直した。', REWORD_EN = 'Not a mistake; an unclear sentence was reworded.';
  const E = B.errataEntries().filter((e) => e.right.startsWith(REWORD));
  const titleOf = (rel) => (/^# (.*)$/m.exec(read(rel)) || [])[1];
  const policy = (where) => B.POLICIES.find((p) => where.startsWith(titleOf('policies/' + p + '.md') + '「'));
  const day = (t, re) => (re.exec(t) || [])[1];
  const timeline = B.timelineRows();
  const bad = [];
  for (const e of E) {
    const p = policy(e.where);
    if (!p) { bad.push(e.n + '：場所が規程の名で始まらない'); continue; }
    const ja = read('policies/' + p + '.md'), en = read('policies/' + p + '.en.md');
    const wrongEn = (e.en[3] || '').replace(/^"|"$/g, '');
    if (ja.includes(e.wrong) || !wrongEn || en.includes(wrongEn)) bad.push(e.n + '：改める前の文が規程に残る');
    if (!(e.en[4] || '').startsWith(REWORD_EN) || e.kind.ja !== '語') bad.push(e.n + '：英語の正の欄か分類');
    if (day(ja, /^最終更新：(\d{4}-\d{2}-\d{2})。$/m) < e.date || day(en, /^Last updated: (\d{4}-\d{2}-\d{2})\.$/m) !== day(ja, /^最終更新：(\d{4}-\d{2}-\d{2})。$/m)) bad.push(e.n + '：最終更新');
    if (!timeline.some((r) => r[0].startsWith(e.date) && r[1].includes(titleOf('policies/' + p + '.md')) && r[1].includes('言い直す') && r[2].includes('reworded'))) bad.push(e.n + '：年表');
  }
  ok('言い直した文（' + E.length + ' 件）は、改める前の文を日本語と英語の正誤表に残して規程から外し、最終更新を日本語と英語で同じ日に改め、年表に行がある', E.length >= 2 && bad.length === 0, bad.join(', '));
  const xj = read('policies/exchange.md'), xe = read('policies/exchange.en.md'), pj = read('policies/privacy.md'), pe = read('policies/privacy.en.md');
  /* 2026-11-12 に改めた（王の正誤表 29）。非公開の窓口はなく、氏名と住所は、求めた人がプロフィールに公開した連絡先へ知らせる。前の文の約束は 67 が外れていることを確かめる。 */
  ok('交流の規程は相手の国を相手が作ったものとして尊重し、その主張を認めも否みもしない。運営者の氏名と住所は、求めた人がプロフィールに公開した連絡先へ知らせ、連絡先がなければ非公開の道はないと書き、求め方は求めの頁の手順による（日本語と英語）',
    xj.includes('- 相手の国は、相手が自ら作ったものとして尊重します。その国の主張を、ヌスクァマは認めも否みもしません。')
    && xe.includes("- The other party's country is respected as the other party's own creation. Nusquama neither accepts nor denies that country's claims.")
    && pj.includes('運営者の氏名と住所は、求めた人が自分の GitHub のプロフィールに公開している連絡先へ、遅滞なく知らせます。\n求めるときは、[削除・訂正・辞退の求め](./requests.md)の様式の種類で「非公開の連絡を求める」を選びます。\nそうした連絡先がない人には、氏名と住所を非公開で知らせる道がありません。')
    && pe.includes("The operator's name and address are given without delay to the person who asks for them, at a contact that person has made public on their own GitHub profile.")
    && pe.includes('For a person with no such contact, there is no private route to give the name and address.')
    && read('policies/requests.md').includes('様式の種類で「非公開の連絡を求める」を選び') && read('.github/ISSUE_TEMPLATE/request.yml').includes('        - 非公開の連絡を求める\n'));
}

console.log('\n56. 休止の告知（下書き。いまは掲げていない）');
{
  const ij = read('INSTITUTIONS.md'), ie = read('INSTITUTIONS.en.md');
  const part = (t, h) => { const i = t.indexOf('\n## ' + h + '\n'); if (i < 0) return ''; const j = t.indexOf('\n## ', i + 5); return t.slice(i + 1, j < 0 ? undefined : j); };
  const quote = (t) => t.split('\n').filter((l) => l.startsWith('> ')).map((l) => l.slice(2));
  const nj = quote(part(ij, '休止の告知')), ne = quote(part(ie, 'Notice of suspension'));
  const fj = part(ij, '凍結'), fe = part(ie, 'Freezing');
  /* 告知の文は、凍結の箇条（願い出を受けない・そのまま公開に残す・求めにはできる限り応える）を、そのまま言い換えたものに限る。 */
  ok('休止の告知の下書きは、日本語と英語で同じ行の数（' + nj.length + '）を持ち、日付を空けておき、凍結の箇条と同じことだけを告げ、創作だと断る',
    nj.length === 6 && ne.length === nj.length && nj[0].includes('（日付）から休止しています（国の仕組み「凍結」）') && ne[0].includes('suspended since (date) (Institutions, "Freezing")')
    && fj.includes('- 叙任の願い出を受けません。') && nj.includes('叙任の願い出は、受けていません。')
    && fj.includes('- 名簿・正誤表・規程は、そのときのまま公開に残します。') && nj.includes('騎士の名簿・王の正誤表・規程は、休止したときのまま公開しています。')
    && fj.includes('- 削除・訂正・辞退の求めには、できる限り応えます。') && nj.some((l) => l.startsWith('削除・訂正・辞退の求めは、') && l.endsWith('できる限り応えます。') && l.includes('?template=request.yml'))
    && nj[nj.length - 1] === 'これは創作であり、遊びです。' && ne[ne.length - 1] === 'This is a work of fiction, written for fun.'
    && fj.includes('そのとき、下の「休止の告知」も添えます。') && fe.includes('The "Notice of suspension" below is put up with them.'));
  const live = B.SOURCES.filter(([src]) => !/^INSTITUTIONS(\.en)?\.md$/.test(src) && /から休止しています|has been suspended since/.test(read(src))).map(([src]) => src)
    .concat(['site/index.html', 'site/founding.en.html', 'site/llms.txt'].filter((f) => /から休止しています|has been suspended since/.test(read(f))));
  ok('休止の告知は下書きのままで、トップの頁にも、ほかのどの頁にも掲げていない（国の仕組みの頁だけにある）', live.length === 0, live.join(', '));
}

console.log('\n57. 叙任の通し稽古（本物の issue を開かず、試しの一件を様式から名簿まで通す）');
{
  const K = require('../tools/knighting.js');
  const tpl = read('.github/ISSUE_TEMPLATE/knighting.yml');
  /* 段 1：様式の定義から、GitHub が issue に書く形（### 題、空行、答え）で本文を組む。印はすべて付ける。 */
  const fields = tpl.split(/\n  - type: /).slice(1).map((b) => ({ type: b.split('\n')[0].trim(), label: (/\n      label: (.+)/.exec(b) || [])[1],
    options: [...b.matchAll(/\n        - label: (.+)\n          required: (?:true|false)/g)].map((m) => m[1]) })).filter((f) => f.type !== 'markdown');
  /* 叙任の日は、日本にいる印を見始める 2026-11-22 と、いまの官報の最後の号の日の、遅いほう。 */
  const lastDay = [K.PRESENCE_FROM].concat(B.gazetteItems().map((x) => x.date)).sort().pop();
  const TRIAL = { link: 'https://example.org/erratum', what: 'ブログの記事で年を誤り、追記で正しました。', account: 'アカウント名', day: lastDay, opened: lastDay + 'T00:00:00Z' };
  const answer = (f) => (f.type === 'checkboxes' ? f.options.map((o) => '- [X] ' + o).join('\n') : f.type === 'input' ? TRIAL.link : TRIAL.what);
  const body = fields.map((f) => '### ' + f.label + '\n\n' + answer(f)).join('\n\n') + '\n';
  const form = K.parse(body);
  ok('段 1：様式の定義（' + fields.length + ' 項）から組んだ本文を、自動の確認が同じ題で読む', fields.length >= 3 && fields.every((f) => f.label && form[f.label] === answer(f))
    && ['訂正への公開のリンク', '何を誤り、どう正したか', '誓い'].every((h) => fields.some((f) => f.label === h)));
  /* 段 2：様式が付けるラベルを、ラベルの workflow が作り、確認の workflow が待つ。 */
  const label = (/\nlabels: \["([^"]+)"\]/.exec(tpl) || [])[1];
  ok('段 2：様式が付けるラベル（' + label + '）を、ラベルの workflow が作り、確認の workflow がそのラベルで動く', !!label && read('.github/workflows/labels.yml').includes('gh label create "' + label + '"')
    && read('.github/workflows/knighting.yml').includes("contains(github.event.issue.labels.*.name, '" + label + "')"));
  /* 段 3：自動の確認。リンクは開かない（2026-11-12 から、自動の確認そのものが外へ何も要求しない）。 */
  const result = K.check(form, TRIAL.opened), c = K.comment(result);
  ok('段 3：試しの一件は自動の確認を通り（' + result.rows.length + ' 行）、コメントは整っていると書いて何も決めない。日本にいる印がなければ通らない',
    result.ok && result.rows.length === 7 && c.startsWith(K.MARK) && c.includes('様式は整っています。') && c.includes('この確認は何も決めません。')
    && !K.check(K.parse(body.replace('- [X] ' + K.PRESENCE, '- [ ] ' + K.PRESENCE)), TRIAL.opened).ok);
  /* 試しの一件は、イタリアの国籍を持たない印と良識の前提の印も付けて願い出る。どちらかを外せば通らない。 */
  ok('段 3：試しの一件は、イタリアの国籍を持たない印・良識の前提の印・外国の称号を縛る国の国籍を持たない印を付けて通り、どれかの印を外すと通らない',
    [K.NATIONALITY, K.PREMISE, K.FOREIGN].every((x) => body.includes('- [X] ' + x) && !K.check(K.parse(body.replace('- [X] ' + x, '- [ ] ' + x)), TRIAL.opened).ok));
  /* 段 5：記し方のとおりに、日本語と英語の名簿の終わりへ一行ずつ足す（ファイルは書き換えない）。番は、いまの名簿の次の番。 */
  const issue = B.REPO + '/issues/0';
  const kj = read('KNIGHTS.md'), ke = read('KNIGHTS.en.md');
  const rowsOf = (t) => t.split('\n').filter((l) => /^\| \d+ \|/.test(l)).map((l) => l.replace(/^\||\|$/g, '').split('|').map((x) => x.trim()));
  const n = rowsOf(kj).length + 1;
  const append = (t, row) => { const ls = t.split('\n'); let k = ls.indexOf('| --- | --- | --- | --- | --- |'); while (/^\| \d+ \|/.test(ls[k + 1] || '')) k++; ls.splice(k + 1, 0, row); return ls.join('\n'); };
  const mdJ = append(kj, '| ' + n + ' | ' + TRIAL.account + ' | ' + TRIAL.day + ' | ブログの記事の年の誤りを、追記で正した（[訂正](' + TRIAL.link + ')） | [願い出](' + issue + ') |');
  const mdE = append(ke, '| ' + n + ' | ' + TRIAL.account + ' | ' + TRIAL.day + ' | Corrected a wrong year in a blog post with an addendum ([correction](' + TRIAL.link + ')) | [Application](' + issue + ') |');
  /* 英語の名簿は、番・騎士・叙任の日・願い出を日本語の名簿とそろえ、正した誤りの欄の空き方もそろえる（通し稽古で見つけた抜け）。 */
  const href = (x) => (/\]\(([^)]+)\)/.exec(x || '') || [, x || ''])[1];
  const twin = (a, b) => a.length === b.length && a.every((r, i) => b[i] && [0, 1, 2].every((k) => r[k] === b[i][k]) && href(r[4]) === href(b[i][4]) && !r[3] === !b[i][3]);
  const rows = rowsOf(mdJ);
  const html = B.page('KNIGHTS.md', 'knights.html', { md: mdJ, twin: 'knights.en.html' });
  ok('段 5：記し方のとおりに足した行（第 ' + n + ' 番）が名簿の頁の表に出て、日本語と英語の名簿の行がそろう。英語の行を足し忘れると、そろわない',
    rows.length === n && rows[n - 1][0] === String(n) && twin(rows, rowsOf(mdE)) && !twin(rows, rowsOf(ke)) && html.includes('<td>' + n + '</td><td>' + TRIAL.account + '</td><td>' + TRIAL.day + '</td>') && html.includes('<p class="notice">' + B.NOTICE + '</p>'));
  /* 段 6：官報の号・人口・新着の配信。 */
  const items = B.gazetteItems();
  const base = { timeline: B.timelineRows(), errata: B.tableRows('ERRATA.md'), ledger: B.readLedger() };
  const g = B.gazetteItems(Object.assign({}, base, { knights: rows })), kn = g.find((x) => x.key === 'K:' + n);
  const ax = B.atom('knights', rows);
  ok('段 6：試しの騎士は次の号（' + (items.length + 1) + '）に記し方の形で載り、人口は一人増え、新着の配信に叙任の日で出る。いまの号は動かない',
    kn && kn.no === items.length + 1 && kn.date === TRIAL.day && kj.includes('官報の布告は「' + kn.text.replace(TRIAL.account, 'アカウント名').replace(/^第 \d+ 番/, '第 1 番') + '」の形になります。')
    && items.every((x) => (g.find((y) => y.key === x.key) || {}).no === x.no) && B.population(undefined, rows) === B.population() + 1
    && ax.includes('<title>第 ' + n + ' 番の騎士：' + TRIAL.account + '</title>') && ax.includes('<updated>' + TRIAL.day + 'T00:00:00+09:00</updated>') && !/\]\(https:/.test(ax));
  const late = B.gazetteItems(Object.assign({}, base, { knights: rows.map((r, i) => (i === n - 1 ? r.map((x, k) => (k === 2 ? '2026-11-07' : x)) : r)) }));
  /* 通し稽古で見つけた二つの抜けは、2026-11-12 に決めて埋めた。抜けの文を表に残し、決めたことを記し方と叙任の規程に書く（日本語と英語）。 */
  ok('ほか：年表の最後の行より前の日を叙任の日にすると、号の並びが日付の順から外れる（通し稽古の表に、抜けとして書き、名簿の記し方で、行を決めた日のうちに足すと決めた）',
    !late.every((x, i) => i === 0 || late[i - 1].no === x.no + 1) && read('INSTITUTIONS.md').includes('叙任を決めた日より後の日付の行が年表にあると')
    && kj.includes('- 叙任の日：王が叙任を決めた日（日本時間）です。名簿の行は、決めたその日のうちに足します。')
    && kj.includes('官報の号は、年表と名簿に行を足した順に振ります。叙任の日は行を足す日と同じなので、古い日付の号が、新しい日付の号の後に来ることはありません。')
    && ke.includes('- Knighted: the day the King decided on the knighting (Japan time). The row is added on that same day.')
    && ke.includes('Gazette issues are numbered in the order rows are added to the timeline and the roll. As the day of knighting is the day the row is added, an older date never comes after a newer one.')
    && kj.includes('\n2026-11-12 に Claude が決めました。叙任の通し稽古で') && ke.includes('\nDecided by Claude on 2026-11-12, after the dry run of knighting'));
  ok('ほか：叙任したときは、願い出の issue に名簿の行へのリンクを添えて答え、issue を完了として閉じる（叙任の規程「名簿」、日本語と英語）。通し稽古の表は、二つの抜けを埋めたと書き、王に委ねる文を残さない',
    read('policies/knighting.md').includes('叙任したときは、運営者が願い出の issue に、名簿の行へのリンクを添えたコメントを書き、issue を「完了」として閉じます。')
    && read('policies/knighting.en.md').includes('On knighting, the operator posts a comment on the application issue with a link to the row of the roll, and closes the issue as completed.')
    && read('INSTITUTIONS.md').includes('叙任の日と号の並びの抜けと、願い出の issue への答えの抜けは、2026-11-12 に Claude が決めて埋めました。')
    && read('INSTITUTIONS.en.md').includes('were filled by decisions Claude made on 2026-11-12.')
    && (read('INSTITUTIONS.md').match(/。2026-11-12 に Claude が決めて、/g) || []).length === 2 && (read('INSTITUTIONS.en.md').match(/\. Decided by Claude on 2026-11-12 and written in/g) || []).length === 2
    && !/埋めるかどうかは、王が決めます|is for the King to decide/.test(read('INSTITUTIONS.md') + read('INSTITUTIONS.en.md')));
  ok('いまの名簿は、日本語と英語で行がそろう（' + B.tableRows('KNIGHTS.md').length + ' 行）', twin(rowsOf(kj), rowsOf(ke)));
  const ij = read('INSTITUTIONS.md'), ie = read('INSTITUTIONS.en.md');
  const tab = (t, h) => { const i = t.indexOf('\n## ' + h + '\n'); const j = t.indexOf('\n## ', i + 5); return i < 0 ? [] : t.slice(i, j < 0 ? undefined : j).split('\n').filter((l) => /^\| (\d+|ほか|Other) \|/.test(l)).map((l) => l.split(' | ')[0].slice(2)); };
  const tj = tab(ij, '叙任の通し稽古'), te = tab(ie, 'A dry run of knighting');
  ok('国の仕組みの叙任の通し稽古の表は、段 1 から 6 とほかの行を持ち、日本語と英語で行がそろい、本物の issue を開いていないと書く',
    JSON.stringify(tj.filter((x) => /^\d+$/.test(x))) === JSON.stringify(['1', '2', '3', '4', '5', '6']) && tj.length === te.length && tj.length > 6
    && ij.includes('本物の issue は開いていません。') && ie.includes('No real issue was opened.'));
}

console.log('\n58. トップの最初の画面と、狭い画面での読みやすさ');
{
  const idx = read('site/index.html');
  const fig = (/<figure class="first">([\s\S]*?)<\/figure>/.exec(idx) || [])[0] || '';
  const readme = read('README.md');
  const hero = (/<main id="main">\n<div class="hero">\n([\s\S]*?)\n<\/div>\n<blockquote>/.exec(idx) || [])[1] || '';
  ok('トップの最初の画面に、国の名（題）・一文・国旗（国のしるしへ）・国章・版図の地図（王の正誤表へ）を一つの枠に収め、創作の断りをそのすぐ後に置く。GitHub では印だけで見えない',
    !!fig && hero.startsWith('<h1>' + B.NAME + '<span class="la" lang="la">Regnum Nusquamae</span></h1>\n<p class="lede">' + B.LEDE + '</p>\n') && hero.endsWith(fig)
    && read('README.md').includes('\n> ' + B.LEDE)
    && /^<a href="symbols\.html"><img src="flag\.svg" alt="ヌスクァマの国旗（創作）"[^>]*><\/a><img class="crest" src="emblem\.svg" alt="ヌスクァマの国章（創作）"[^>]*><a href="errata\.html"><img src="territory\.svg" alt="ヌスクァマの版図の地図（創作）"/.test(fig.replace(/^<figure class="first">/, ''))
    && (idx.match(/src="emblem\.svg"/g) || []).length === 1
    && (idx.match(/<figure class="first">/g) || []).length === 1 && B.SOURCES.filter(([, d]) => d !== 'index.html').every(([, d]) => !read('site/' + d).includes('<figure class="first">'))
    && readme.indexOf('\n<!-- first -->\n') > 0 && readme.indexOf('\n<!-- first -->\n') < readme.indexOf('\n> これは創作であり、遊びです。'));
  ok('最初の画面の図の題は、地図が王の誤りで広がることを書き、色・形・数は代替テキストに書かない',
    fig.includes('<figcaption>国旗、国章、版図の地図。版図は、王が誤りを一つ認めるたびに広がります。</figcaption>') && !/alt="[^"]*(紺|金|\d)/.test(fig));
  ok('見出しは、日本語の語の途中で折り返さない（word-break: auto-phrase）。最初の画面の図は、狭い画面で低くし、640 px から高くする（国章は旗と地図より高く）',
    B.STYLE.includes('h1, h2, h3 { word-break: auto-phrase; }') && B.STYLE.includes('.first img { display: block; height: 80px; width: auto; }') && B.STYLE.includes('.first img.crest { height: 104px; }')
    && B.STYLE.includes('@media (min-width: 640px) { .first img { height: 128px; } .first img.crest { height: 160px; }'));
}

console.log('\n59. 頁の上の欄（国章・国の名・ラテン語の名・案内・言語の切り替え）と、どの頁にも同じ様式');
{
  const html = walk(path.join(ROOT, 'site')).filter((f) => f.endsWith('.html'));
  const WANT = { ja: ['宣言', '基本法', '制度', '騎士名簿', '官報', '暦', '王の正誤表'], en: ['Declaration', 'Basic Law', 'Institutions', 'Knights', 'Gazette', 'Calendar', 'Errata'] };
  const bad = { bar: [], nav: [], link: [], style: [] };
  for (const f of html) {
    const t = read('site/' + f);
    const en = /<html lang="en">/.test(t);
    const head = (/<header>([\s\S]*?)<\/header>/.exec(t) || [])[1] || '';
    /* 欄の形：国章（飾り）、国の名とラテン語の名のリンク、右端に言語の切り替え。その下に案内。 */
    const m = /^<div class="wrap">\n<div class="bar">([\s\S]*?)<\/div>\n<nav aria-label="([^"]+)"><ul>([\s\S]*?)<\/ul><\/nav>\n<\/div>$/.exec(head) || [];
    if (!new RegExp('^<img src="[^"]*emblem\\.svg" alt="" width="40" height="48"><a class="home" href="[^"]*index\\.html"><span class="name"' + (en ? ' lang="ja"' : '') + '>' + B.NAME + '</span><span class="la" lang="la">Regnum Nusquamae</span></a><a class="lang" [^>]+>[^<]+</a>$').test(m[1] || '')) bad.bar.push(f);
    const items = [...(m[3] || '').matchAll(/<li><a href="([^"]+)"( aria-current="page")?>([^<]+)<\/a><\/li>/g)];
    if (m[2] !== (en ? 'Main pages' : '主な頁') || items.map((x) => x[0]).join('') !== (m[3] || '') || JSON.stringify(items.map((x) => x[3])) !== JSON.stringify(WANT[en ? 'en' : 'ja'])) bad.nav.push(f);
    for (const [, href, cur] of items) {
      const [p, hash] = href.split('#');
      const target = f === '404.html' ? p.replace(/^\//, '') : path.posix.normalize(path.posix.join(path.posix.dirname(f), p));
      if (!fs.existsSync(path.join(ROOT, 'site', target))) { bad.link.push(f + ' → ' + href); continue; }
      const there = read('site/' + target);
      /* 案内は頁と同じ言語の頁を指し、節を指すときはその節の id が一つだけある。いまの頁を指す項にだけ aria-current を付ける。 */
      if (en !== target.endsWith('.en.html') || (hash && there.split(' id="' + hash + '"').length !== 2) || !!cur !== (!hash && target === f)) bad.link.push(f + ' → ' + href);
    }
    if ((/<style>([\s\S]*?)<\/style>/.exec(t) || [])[1] !== B.STYLE || (t.match(/<style>/g) || []).length !== 1) bad.style.push(f);
  }
  ok('どの頁（' + html.length + '）も、頁の上の欄に国章・国の名・ラテン語の名（Regnum Nusquamae）を並べ、言語の切り替えを右端に置く', bad.bar.length === 0, bad.bar.slice(0, 8).join(', '));
  ok('どの頁も、案内に宣言・基本法・制度・騎士名簿・官報・暦・王の正誤表の七つを、この順に、頁の言語で置く', bad.nav.length === 0, bad.nav.slice(0, 8).join(', '));
  ok('案内のリンクは、どれも同じ言語の頁（宣言と基本法はその節の id）を指し、いまの頁を指す項にだけ aria-current を付ける', bad.link.length === 0, bad.link.slice(0, 8).join(', '));
  ok('どの頁も、同じ一つの様式（build.js の STYLE）を持つ', bad.style.length === 0, bad.style.slice(0, 8).join(', '));
  ok('案内は狭い画面で折り返し、印刷では隠す', /header nav ul \{[^}]*flex-wrap: wrap;/.test(B.STYLE) && /@media print \{[^}]*header nav[^}]*\{ display: none; \}/.test(B.STYLE));
}

console.log('\n60. 法令の点検の記録（2026-11-12）');
{
  /* 点検の記録は、箇所・法令と条・要件・事実・判定・対応の表で、判定は五つのどれか。散文に書いた数（判定ごとの件数、問いの肢の数）は、
   * 表から数えた数と同じ（決めごと 5）。終わりに、調べた法令・取り寄せられなかった文・弁護士の確認を受けていないことを置く。
   * 表の「法令と条」に挙げた条は、見張りの表か一次資料の表にある。正した文は、正した形で頁に残る。 */
  const F = 'docs/legal-audit-2026-11-12.md';
  const a = fs.existsSync(path.join(ROOT, F)) ? read(F) : '';
  const part = (h) => { const i = a.indexOf('\n## ' + h + '\n'); if (i < 0) return ''; const j = a.indexOf('\n## ', i + 5); return a.slice(i + 1, j < 0 ? undefined : j); };
  const table = part('判定の表');
  const KINDS60 = ['誤り', '根拠不足', '漏れ', '表現', '問題なし'];
  const rows = table.split('\n').filter((l) => l.startsWith('| ') && !l.startsWith('| 箇所 |') && !l.startsWith('| --- |')).map((l) => l.replace(/^\| | \|$/g, '').split(' | '));
  ok('点検の記録の表は、箇所・法令と条・要件・事実・判定・対応の六つの欄を持ち、どの行の判定も五つのどれか（' + rows.length + ' 行）',
    table.includes('\n| 箇所 | 法令と条 | 要件 | 事実 | 判定 | 対応 |\n| --- | --- | --- | --- | --- | --- |\n') && rows.length >= 40 && rows.every((r) => r.length === 6 && KINDS60.includes(r[4])),
    rows.filter((r) => r.length !== 6 || !KINDS60.includes(r[4])).map((r) => r[0]).join(' / '));
  const count = (k) => rows.filter((r) => r[4] === k).length;
  const said = (k) => Number((new RegExp(k + ' (\\d+) 件').exec(table) || [])[1]);
  ok('判定ごとの件数と合計を、表から数えた数のとおりに書く（' + KINDS60.map((k) => k + ' ' + count(k)).join('、') + '）',
    KINDS60.every((k) => said(k) === count(k)) && Number((/合わせて (\d+) 件です。/.exec(table) || [])[1]) === rows.length);
  const S = JSON.parse(read('verification/statutes.json'));
  const P = JSON.parse(read('verification/sources.json'));
  const have = new Set(S.statutes.map((e) => e.name + ' ' + e.article.replace('_', 'の')));
  const names = [...new Set(S.statutes.map((e) => e.name))].sort((x, y) => y.length - x.length);
  const foreignKeys = Object.keys(P.sources).map((k) => k.replace(/\s+/g, ''));
  const strays = [];
  let cited = 0;
  for (const r of rows) {
    if (r[1].startsWith('なし')) continue;
    for (const piece of r[1].split('、')) {
      const law = names.find((n) => piece.startsWith(n));
      if (law) {
        for (const m of piece.slice(law.length).matchAll(/第(\d+)条(?:の(\d+))?/g)) { cited++; if (!have.has(law + ' ' + m[1] + (m[2] ? 'の' + m[2] : ''))) strays.push(r[0] + '：' + piece); }
      } else if (!foreignKeys.some((k) => k.endsWith(piece.replace(/（[^）]*）/g, '').replace(/\s+/g, '')))) strays.push(r[0] + '：' + piece);
    }
  }
  ok('表の「法令と条」に挙げた日本の条（' + cited + '）は見張りの表に、外国の条は一次資料の表にある', cited >= 60 && strays.length === 0, strays.join(' / '));
  const quiz = part('適法性の説明の問い 38 肢');
  const qs = [...quiz.matchAll(/^\| (\d+) \| (.) \| (.+) \|$/gm)];
  const qc = (m) => qs.filter((q) => q[2] === m).length;
  ok('問いの 38 肢は、1 から欠けずに並び、どれにも ○・×・？ と理由があり、肢の数を表から数えたとおりに書く（○ ' + qc('○') + '、× ' + qc('×') + '、？ ' + qc('？') + '）',
    qs.length === 38 && qs.every((q, i) => Number(q[1]) === i + 1 && '○×？'.includes(q[2]) && q[3].length > 4)
    && quiz.includes('問いの判定の数は、○ ' + qc('○') + ' 肢、× ' + qc('×') + ' 肢、？ ' + qc('？') + ' 肢です。'));
  const decided = part('決めたこと');
  const nDecided = decided.split('2026-11-12 に Claude が決めました。').length - 1;
  ok('決めたことの数（' + nDecided + '）を、文に同じに書き、どれにも理由を添える', nDecided === 3 && decided.includes('点検で選ぶところが三つありました。') && decided.split('2026-11-12 に Claude が決めました。').slice(1).every((x) => /ためです。/.test(x.split('\n\n')[0])));
  const heads = [...a.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
  ok('記録は、調べた法令・取り寄せられなかった文・弁護士の確認の順で終わり、弁護士の確認を受けていないと書く',
    heads.slice(-3).join('|') === '調べた法令|取り寄せられなかった文|弁護士の確認' && part('弁護士の確認').includes('この点検は、弁護士の確認を受けていません。')
    && part('取り寄せられなかった文').split('\n').filter((l) => l.startsWith('- ')).length >= 5);
  const lj = read('policies/legality.md'), le = read('policies/legality.en.md');
  const URL60 = 'https://github.com/cpsbvbng26-dotcom/nusquama/blob/main/docs/legal-audit-2026-11-12.md';
  ok('適法性の説明は、点検の記録へつなぎ、言い切りすぎた結論・事業・写しの文を正した形で持つ（日本語と英語）',
    lj.includes('(' + URL60 + ')') && le.includes('(' + URL60 + ')') && !lj.includes('きわめて小さい') && !le.includes('very small')
    && lj.includes('並べていない法令と、解釈の分かれる要件が残るので、違法となるおそれがどれほど小さいかは言い切れません。')
    && le.includes('so the operator does not claim to know how small the risk of illegality is.')
    && lj.includes('- **ヌスクァマの事実**：何も売らず、広告を出さず、営利の事業を営まない。') && !lj.includes('広告を出さず、事業を営まない。')
    && lj.includes('他人の著作物は、この頁の「条文」と「原文」の欄に条約・法令・規約・説明の文を引くほかは、写していない。') && !lj.includes('他人の著作物を写していない。'));
  ok('日本に住む人に限っても日本の外の法令が及ぶおそれは断てないこと、イタリアの条は受ける人の住む国を要件にしないこと、GDPR の代理人を Claude が決めたことを書く（日本語と英語）',
    lj.includes('- これらの限定によって、日本の外の法令が及ぶおそれは減るが、なくなるわけではない。') && le.includes('- These limits reduce, but do not remove, the possibility that laws outside Japan apply.')
    && lj.includes('同条が禁じるのは、私人や団体が授けることで、受ける人の住む国を要件にしていない。') && le.includes("the recipient's country of residence is not an element")
    && lj.includes('代理人は指名していない。2026-11-12 に Claude が決めました。') && le.includes('Claude decided this on 2026-11-12'));
  ok('電気通信事業と定型約款の節を持ち、どちらも日本語と英語にある',
    lj.includes('\n### 電気通信事業（電気通信事業法第164条）\n') && le.includes('\n### Telecommunications business (Telecommunications Business Act, Article 164)\n')
    && lj.includes('\n### 定型約款（民法第548条の2・第548条の3・第548条の4）\n') && le.includes('\n### Standard terms (Civil Code, Articles 548-2, 548-3 and 548-4)\n'));
}

console.log('\n61. イタリアの国籍を持つ人の願い出と、良識の前提（2026-11-22 から）');
{
  /* 2026-11-12 に利用者が決めた。2026-11-22 から、イタリアの国籍を持つ人（重国籍を含む）の願い出を受けず、叙任は称号を遊びとして扱う良識ある人を前提とする。
   * 条件は、日本語と英語の規程・利用規約の予告・適法性の説明・様式の印・受付のコードのすべてに現れ、効力の日がそろう。
   * 理由は、常識に照らした場違いが先で、イタリアの 1951 年法律第 178 号第 8 条が後。どちらでも、及ぶおそれは減るだけでなくならないと書く。
   * 確かめる関数に、印を外した様式と前の文言の規程を渡し、落ちることも確かめる（壊して確かめる）。 */
  const K = require('../tools/knighting.js');
  const DAY = '2026-11-22';
  const files = ['policies/knighting.md', 'policies/knighting.en.md', 'policies/terms.md', 'policies/terms.en.md', 'policies/legality.md', 'policies/legality.en.md', '.github/ISSUE_TEMPLATE/knighting.yml', 'tools/knighting.js'];
  const BOX_N = 'イタリアの国籍を持っていません（ほかの国籍と重ねて持つ場合も含みます。' + DAY + ' から、この印のない願い出は受けません）。';
  const BOX_P = '称号を遊びとして扱い、規程の禁じる使い方をしません（この国の外で使う、実在の称号や叙勲と誤認させる、履歴書・名刺などに書く、売る、人をだますために使う、のどれもしません。' + DAY + ' から、この印のない願い出は受けません）。';
  const before = (s, a, b) => s.indexOf(a) >= 0 && s.indexOf(b) > s.indexOf(a);
  function verdict(x, k) {
    const bad = [];
    const need = (f, list) => list.forEach((s) => { if (!x[f].includes(s)) bad.push(f + '：' + s.slice(0, 40)); });
    need('policies/knighting.md', [DAY + ' から、イタリアの国籍を持つ人は、日本に住んでいても、ほかの国籍と重ねて持っていても、願い出ることができません。', 'イタリアの国籍を持つ人と、「外国の称号を縛る国」の国籍を持つ人を除き、国籍は問いません。', '\n## 良識の前提\n', 'この限りで、同条が及ぶおそれは減りますが、なくなりはしません']);
    need('policies/knighting.en.md', ['From ' + DAY + ', a person who holds Italian nationality may not apply, even if they live in Japan, and even if they also hold another nationality.', '\n## The premise of good sense\n',
      'From ' + DAY + ', knighting presumes that the applicant is a person of good sense who treats the title as play.', 'From ' + DAY + ', the applicant ticks a box in the form for this premise.', 'This limit reduces the possibility that the article applies; it does not remove it']);
    need('policies/terms.md', ['予告：' + DAY + ' から、イタリアの国籍を持つ人は、', '予告：' + DAY + ' から、叙任は、願い出る人が称号を遊びとして扱う良識ある人であることを前提とし']);
    need('policies/terms.en.md', ['Notice: from ' + DAY + ', people who hold Italian nationality may not apply', 'Notice: from ' + DAY + ', knighting presumes that the applicant is a person of good sense']);
    need('policies/legality.md', ['- ' + DAY + ' から、イタリアの国籍を持つ人（重国籍を含む）の願い出も受けない。', '「良識の前提」（おそれは断たない）']);
    need('policies/legality.en.md', ['- From ' + DAY + ', applications from people who hold Italian nationality (including dual nationals) are not accepted either.', '"The premise of good sense" (which does not remove the risk)', '- These limits reduce, but do not remove,']);
    need('.github/ISSUE_TEMPLATE/knighting.yml', ['        - label: ' + BOX_N + '\n          required: false\n', '        - label: ' + BOX_P + '\n          required: false\n']);
    /* 前の文言（国籍を問わない）が、規程にも様式にも残っていない。 */
    if (/(?<!除き、)国籍は問いません|(?<!除き、)国籍は問わない/.test(x['policies/knighting.md'] + x['policies/legality.md'] + x['.github/ISSUE_TEMPLATE/knighting.yml'])) bad.push('前の文言「国籍は問いません」が残る');
    if (/whatever their nationality\.\n|may apply for knighthood, whatever their nationality/.test(x['policies/knighting.en.md'] + x['policies/terms.en.md'] + x['policies/legality.en.md'])) bad.push('前の文言「whatever their nationality」が残る');
    /* 理由は常識が先で、法令が後。数を書いたとおりに並べる（決めごと 5）。 */
    if (!(x['policies/knighting.md'].includes('理由は二つです。\n一つめに、') && before(x['policies/knighting.md'], '\n一つめに、イタリアの国民が日本のミクロネーションの騎士になることは、常識に照らして', '\n二つめに、イタリアの 1951 年法律第 178 号第 8 条は') && !x['policies/knighting.md'].includes('\n三つめに、'))) bad.push('叙任の規程の理由の順と数');
    if (!(x['policies/knighting.en.md'].includes('There are two reasons.\nFirst, by plain common sense,') && before(x['policies/knighting.en.md'], '\nFirst, by plain common sense,', '\nSecond, Article 8 of Italy') && !x['policies/knighting.en.md'].includes('\nThird, '))) bad.push('英語の叙任の規程の理由の順と数');
    if (!before(x['policies/legality.md'], '常識に照らして場違いであることと、', '上の条が届くいちばん現実の道') || !before(x['policies/legality.en.md'], 'by plain common sense, an Italian national', 'the most realistic path by which the article above')) bad.push('適法性の説明の理由の順');
    /* 良識の前提の決まりは、日本語と英語で同じ数だけ並ぶ。 */
    const items = (s, h) => { const i = s.indexOf('\n## ' + h + '\n'); const j = s.indexOf('\n## ', i + 4); return i < 0 ? 0 : s.slice(i, j).split('\n').filter((l) => l.startsWith('- ')).length; };
    if (!(items(x['policies/knighting.md'], '良識の前提') === 5 && items(x['policies/knighting.en.md'], 'The premise of good sense') === 5)) bad.push('良識の前提の決まりの数');
    /* 受付のコード：様式の印の文を、その日から求める。 */
    if (!(k.NATIONALITY_FROM === DAY && k.PREMISE_FROM === DAY && BOX_N.startsWith(k.NATIONALITY) && BOX_P.startsWith(k.PREMISE)
      && [k.NATIONALITY, k.PREMISE].every((s) => k.DATED.some((d) => d.text === s && d.from === DAY)) && x['tools/knighting.js'].includes("const NATIONALITY = 'イタリアの国籍を持っていません';"))) bad.push('受付のコード');
    return bad;
  }
  const real = Object.fromEntries(files.map((f) => [f, read(f)]));
  const bad = verdict(real, K);
  ok('イタリアの国籍を持つ人の願い出を受けないことと良識の前提が、日本語と英語の規程・利用規約・適法性の説明・様式の印・受付のコードにそろい、効力の日は ' + DAY + '、理由は常識が先', bad.length === 0, bad.join(' / '));
  const mut = (f, a, b) => Object.assign({}, real, { [f]: real[f].replace(a, b) });
  const breaks = [
    ['様式から国籍の印を外す', mut('.github/ISSUE_TEMPLATE/knighting.yml', '        - label: ' + BOX_N + '\n          required: false\n', '')],
    ['様式から良識の前提の印を外す', mut('.github/ISSUE_TEMPLATE/knighting.yml', '        - label: ' + BOX_P + '\n          required: false\n', '')],
    ['様式を前の文言（国籍は問いません）に戻す', mut('.github/ISSUE_TEMPLATE/knighting.yml', 'イタリアと、叙任の規程「外国の称号を縛る国」の国籍を持つ人を除き、国籍は問いません）', '国籍は問いません）')],
    ['叙任の規程を前の文言に戻す', mut('policies/knighting.md', 'イタリアの国籍を持つ人と、「外国の称号を縛る国」の国籍を持つ人を除き、国籍は問いません。', '国籍は問いません。')],
    ['英語の利用規約を前の文言に戻す', mut('policies/terms.en.md', 'may apply for knighthood; nationality does not matter, except that people who hold Italian nationality, or the nationality of a country that restricts foreign titles, are excluded', 'may apply for knighthood, whatever their nationality')],
    ['理由の順を入れ替える', mut('policies/knighting.md', '一つめに、イタリアの国民', '三つめに、イタリアの国民')],
  ];
  const kBreak = Object.assign({}, K, { DATED: K.DATED.filter((d) => d.text !== K.NATIONALITY) });
  const caught = breaks.filter(([, x]) => verdict(x, K).length > 0).map(([n]) => n).concat(verdict(real, kBreak).length > 0 ? ['受付のコードから国籍の印を外す'] : []);
  ok('壊して確かめる：印を外す・前の文言に戻す・理由の順を崩す・受付のコードから外す、のどれでも落ちる（' + caught.length + ' / ' + (breaks.length + 1) + '）', caught.length === breaks.length + 1);
  const ej = B.errataEntries().find((e) => e.right.includes('イタリアの国籍を持つ人'));
  ok('王の正誤表に、前の文と、利用者が決めたことと Claude が決めた細目を、理由とともに記し、年表に行がある（日本語と英語）',
    !!ej && ej.kind.ja === '範囲' && ej.wrong.includes('国籍は問いません。') && (ej.right.match(/2026-11-12 に利用者が決めました。/g) || []).length === 2 && (ej.right.match(/2026-11-12 に Claude が決めました。/g) || []).length === 2
    && (ej.en[4] || '').includes('The owner decided this on 2026-11-12.') && B.timelineRows().some((r) => r[0].startsWith('2026-11-12') && r[1].includes('イタリアの国籍を持つ人') && r[1].includes('良識ある人') && r[2].includes('Italian nationality')));
}

console.log('\n62. 法令の点検の続き：取り寄せた周辺の文と、外国の法令に触れる点を減らす言い方（2026-11-12）');
{
  /* 点検で取り寄せられなかった文と、条を解釈する公の文書を取り寄せ、確かめ直した表を点検の記録に置いた。
   * 表は六つの欄で、判定は五つのどれか。判定ごとの件数は表から数えたとおり（決めごと 5）。「法令と条」は見張りの表か一次資料の表にある。
   * 引いた文は、一次資料の表の文と一字一句同じで、表の文は、取り寄せた窓（SHA-256 を記した）にそのまま現れる。
   * 「授ける称号」を「贈る騎士の呼び名」に改め、勲章・栄典・騎士の位ではないと書いた文と、個人情報の取り扱いに足した文が、日本語と英語にそろう。
   * 確かめる関数に壊した入力を渡し、落ちることも確かめる（壊して確かめる）。 */
  const crypto = require('crypto');
  const F62 = 'docs/legal-audit-2026-11-12.md';
  const S62 = JSON.parse(read('verification/statutes.json'));
  const files = [F62, 'verification/sources.json', 'verification/sources-raw.json', 'policies/terms.md', 'policies/terms.en.md', 'policies/knighting.md', 'policies/knighting.en.md',
    'KNIGHTS.md', 'KNIGHTS.en.md', 'README.md', 'PRESS.md', 'PRESS.en.md', '.github/ISSUE_TEMPLATE/knighting.yml', 'build.js', 'policies/privacy.md', 'policies/privacy.en.md',
    'policies/legality.md', 'policies/legality.en.md', 'policies/exchange.md', 'policies/exchange.en.md'];
  const NAME_JA = '騎士の呼び名は、勲章・栄典・騎士の位ではなく、法的な効力もありません。';
  const NAME_EN = 'are not decorations, honours or ranks of knighthood, and have no legal effect.';
  const KINDS62 = ['誤り', '根拠不足', '漏れ', '表現', '問題なし'];
  const squeeze = (x) => x.replace(/ ([).,;])/g, '$1');
  const sha = (x) => crypto.createHash('sha256').update(x, 'utf8').digest('hex');
  function verdict(x) {
    const bad = [];
    const a = x[F62];
    const i = a.indexOf('\n## 2026-11-12 の続き：取り寄せた周辺の文\n'), j = a.indexOf('\n## ', i + 5);
    const sec = i < 0 ? '' : a.slice(i, j);
    const heads = [...a.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
    /* 2026-11-12 の二度目の見落としの節（67）はこの節のすぐ後に、三度目の見落としの節（68）、五度目の見落としの節（69）、六度目の見落としの節（70）、七度目の見落としの節（71）はその後に置く。並びは一通りに固める。 */
    if (heads.slice(-9).join('|') !== '2026-11-12 の続き：取り寄せた周辺の文|2026-11-12 の続き：二度目の見落とし|2026-11-12 の続き：三度目の見落とし|2026-11-12 の続き：五度目の見落とし|2026-11-12 の続き：六度目の見落とし|2026-11-12 の続き：七度目の見落とし|調べた法令|取り寄せられなかった文|弁護士の確認') bad.push('記録の節の並び');
    const t0 = sec.indexOf('\n### 確かめ直した表\n'), t1 = sec.indexOf('\n### ', t0 + 5);
    const table = t0 < 0 ? '' : sec.slice(t0, t1);
    const rows = table.split('\n').filter((l) => l.startsWith('| ') && !l.startsWith('| 箇所 |') && !l.startsWith('| --- |')).map((l) => l.replace(/^\| | \|$/g, '').split(' | '));
    if (!table.includes('\n| 箇所 | 法令と条 | 要件 | 事実 | 判定 | 対応 |\n| --- | --- | --- | --- | --- | --- |\n') || rows.length < 20 || !rows.every((r) => r.length === 6 && KINDS62.includes(r[4]))) bad.push('確かめ直した表の形');
    const said = (k) => Number((new RegExp(k + ' (\\d+) 件').exec(table) || [])[1]);
    if (!KINDS62.every((k) => said(k) === rows.filter((r) => r[4] === k).length) || Number((/合わせて (\d+) 件です。/.exec(table) || [])[1]) !== rows.length) bad.push('確かめ直した表の件数');
    const P = JSON.parse(x['verification/sources.json']), R = JSON.parse(x['verification/sources-raw.json']);
    const have = new Set(S62.statutes.map((e) => e.name + ' ' + e.article.replace('_', 'の')));
    const names = [...new Set(S62.statutes.map((e) => e.name))].sort((p, q) => q.length - p.length);
    const keys = Object.keys(P.sources).map((k) => k.replace(/\s+/g, ''));
    for (const r of rows) for (const piece of r[1].split('、')) {
      const law = names.find((n) => piece.startsWith(n));
      if (law) { for (const m of piece.slice(law.length).matchAll(/第(\d+)条(?:の(\d+))?/g)) if (!have.has(law + ' ' + m[1] + (m[2] ? 'の' + m[2] : ''))) bad.push('見張りの表にない条：' + piece); }
      else if (!keys.includes(piece.replace(/\s+/g, '')) && !keys.some((k) => k.endsWith(piece.replace(/\s+/g, '')))) bad.push('一次資料の表にない：' + piece);
    }
    /* 引いた文：印の名は一次資料の表にあり、引用は表の文と一字一句同じ。表の文は、SHA-256 を記した取り寄せた窓に現れる。 */
    const quotes = [...sec.matchAll(/<!-- 原文 (.+?) -->\n> (.+)\n/g)];
    const fresh = Object.keys(P.sources).filter((k) => P.sources[k].quoted_in === F62);
    if (fresh.length < 30 || !fresh.every((k) => quotes.some((q) => q[1] === k))) bad.push('引いていない文がある');
    for (const [, k, q] of quotes) {
      const v = P.sources[k];
      if (!v || v.quote !== q) { bad.push('引用が表と違う：' + k); continue; }
      const r = R.sources[v.from] || {};
      /* 法令・条約と国の機関の文は窓に、それ以外の文は抜き出した箇所に現れる。窓は記した値と同じ。全文の値は記した値と同じ。 */
      const w = (r.whole ? r.windows || [] : r.spans || []).find((y) => squeeze(y).includes(v.quote));
      if (!w || (r.whole && sha(w) !== v.window_sha256) || r.sha256_full !== v.sha256_full) bad.push('取り寄せた窓と違う：' + k);
    }
    /* 取り寄せた文から読める事実：除外の一覧に 1951 年法律第 178 号がなく、米州機構の一覧に日本がない。 */
    const win = (key) => ((R.sources[key] || {}).windows || []).concat((R.sources[key] || {}).spans || []).join(' ');
    if (!win('italy-depenalizzazione-allegato').includes('Proprieta\' intellettuale e industriale') || /3 marzo 1951/.test(win('italy-depenalizzazione-allegato'))) bad.push('除外の一覧の全体が窓にない、または 1951 年法律第 178 号が載っている');
    if (!win('montevideo-parties').includes('Venezuela') || /Japan/.test(win('montevideo-parties'))) bad.push('米州機構の一覧の全体が窓にない、または日本が載っている');
    /* 取り寄せられなかった文は、書いた数のとおりに並ぶ。 */
    const k0 = a.indexOf('\n## 取り寄せられなかった文\n'), k1 = a.indexOf('\n## ', k0 + 5);
    const miss = k0 < 0 ? '' : a.slice(k0, k1);
    const nMiss = miss.split('\n').filter((l) => l.startsWith('- ')).length;
    if (!miss.includes('いまも公式の所在から取り寄せられないものは、次の ' + nMiss + ' 件です。') || nMiss < 1 || /Q1-62|当事国の一覧（米州機構）|第164条第1項第3号の指定/.test(miss)) bad.push('取り寄せられなかった文の数と中身');
    /* 言い方：贈る騎士の呼び名。前の「授ける称号」はどこにも残らない。 */
    const need = (f, list) => list.forEach((s) => { if (!x[f].includes(s)) bad.push(f + '：' + s.slice(0, 30)); });
    need('README.md', ['> ここで贈る' + NAME_JA]);
    need('PRESS.md', ['ヌスクァマは国家ではなく、ここで贈る' + NAME_JA]);
    need('PRESS.en.md', ['Nusquama is not a state, and the knightly names it gives ' + NAME_EN]);
    need('.github/ISSUE_TEMPLATE/knighting.yml', ['ここで贈る' + NAME_JA, '下の誓いで同意する前に、その節を確かめてください。']);
    need('build.js', ["ここで贈る" + NAME_JA + "';", 'The knightly names it gives ' + NAME_EN + "';"]);
    need('policies/terms.md', ['叙任は、どの国の勲章・栄典・騎士の位（騎士団の位を含みます）を授けるものでもなく、']);
    need('policies/terms.en.md', ['Knighting does not confer a decoration, honour or rank of knighthood (including a rank in an order) of any country;']);
    need('policies/knighting.md', ['叙任は、どの国の勲章・栄典・騎士の位を授けるものでもありません。']);
    need('policies/knighting.en.md', ['Knighting does not confer a decoration, honour or rank of knighthood of any country.']);
    need('KNIGHTS.md', ['> 騎士の呼び名は、どの国の勲章・栄典・騎士の位でもありません。']);
    need('KNIGHTS.en.md', ['> The name of knight is not a decoration, honour or rank of knighthood of any country.']);
    need('policies/exchange.md', ['ヌスクァマが贈るのは、叙任の規程による騎士の呼び名だけです。']);
    need('policies/exchange.en.md', ['The only thing Nusquama gives is the name of knight under the Rules on Knighting.']);
    for (const f of ['README.md', 'PRESS.md', '.github/ISSUE_TEMPLATE/knighting.yml', 'build.js', 'policies/exchange.md']) if (/授ける称号に|ヌスクァマが授けるのは/.test(x[f])) bad.push(f + '：前の文言「授ける称号」が残る');
    for (const f of ['PRESS.en.md', 'build.js', 'policies/exchange.en.md']) if (/the titles it gives have no legal effect|The titles it gives have no legal effect|gives is knighthood under/.test(x[f])) bad.push(f + '：前の英語の文言が残る');
    /* 個人情報の取り扱い：米国の制度の調べと、両社の措置を確かめられないこと（日本語と英語）。 */
    need('policies/privacy.md', ['米国は EU の十分性認定を受けておらず、APEC の CBPR システムに 2012 年 7 月 25 日から参加しています。', '運営者には確かめられません。', '（個人情報保護法施行規則第17条第4項）']);
    need('policies/privacy.en.md', ['has no adequacy decision of the EU and has taken part in the APEC CBPR system since 25 July 2012.', 'The operator cannot confirm whether GitHub and Vercel take all the measures', '(Article 17(4) of the Enforcement Rules']);
    /* 適法性の説明：取り寄せて確かめたことを、確かめていないと書かない（日本語と英語）。 */
    need('policies/legality.md', ['刑法典第 10 条は、外国人の国外の罪を、下限が一年以上の拘禁刑の罪などに限るので', '批准の寄託先である[米州機構（OAS）の一覧]', '州法の条は、Internet Archive の写しで確かめた（点検の記録）。', '総務省の参入マニュアルは、自らの情報だけを発信するサイトと問合せの受付を、事業に当たらないとする。']);
    need('policies/legality.en.md', ['Article 10 of the Italian Penal Code punishes crimes of foreigners abroad only where', 'which holds the ratifications.', 'was read on 2026-11-12 in an Internet Archive copy', "The Ministry's entry manual (supplement) treats a website"]);
    if (/刑法典第 10 条を取り寄せられず|寄託者である\[米州機構|読んでいない。|この点は確かめていない。/.test(x['policies/legality.md'])) bad.push('適法性の説明に前の文が残る');
    return bad;
  }
  const real = Object.fromEntries(files.map((f) => [f, read(f)]));
  const bad = verdict(real);
  ok('点検の続きの表・引いた文・取り寄せられなかった文、「贈る騎士の呼び名」と個人情報の取り扱いに足した文が、取り寄せた文と日本語と英語にそろう', bad.length === 0, bad.join(' / '));
  const mut = (f, p, q) => Object.assign({}, real, { [f]: real[f].replace(p, q) });
  const P0 = JSON.parse(real['verification/sources.json']);
  const k10 = 'イタリア 刑法典 第10条';
  const breaks = [
    ['引いた文を一字変える', mut(F62, '> ' + P0.sources[k10].quote, '> ' + P0.sources[k10].quote.replace('un anno', 'due anni'))],
    ['一次資料の表の文を一字変える', mut('verification/sources.json', P0.sources[k10].quote, P0.sources[k10].quote.replace('un anno', 'due anni'))],
    ['窓の SHA-256 を変える', mut('verification/sources.json', P0.sources[k10].window_sha256, '0'.repeat(64))],
    ['案内の引用に記した全文の SHA-256 を変える（取り寄せ直して文が変わったのと同じ）', mut('verification/sources.json', P0.sources['イタリア 首相府 勲章の使用の案内（使う者）'].sha256_full, '0'.repeat(64))],
    ['取り寄せた案内の全文の SHA-256 を変える', mut('verification/sources-raw.json', JSON.parse(real['verification/sources-raw.json']).sources['italy-pcm-uso-archive'].sha256_full, '1'.repeat(64))],
    ['案内の抜き出した箇所から引用を外す', mut('verification/sources-raw.json', JSON.stringify(JSON.parse(real['verification/sources-raw.json']).sources['italy-pcm-uso-archive'].spans[0]).slice(1, 40), 'X')],
    ['判定の数を変える', mut(F62, '問題なし 13 件で、合わせて 21 件です。', '問題なし 14 件で、合わせて 21 件です。')],
    ['表に一次資料の表にない文書を挙げる', mut(F62, '| イタリア 刑法典 第10条 |', '| イタリア 刑法典 第11条 |')],
    ['取り寄せられなかった文の数を変える', mut(F62, '次の 5 件です。', '次の 4 件です。')],
    ['README を前の文言に戻す', mut('README.md', '> ここで贈る' + NAME_JA, '> ここで授ける称号に、法的な効力はありません。')],
    ['頁の断りを前の文言に戻す', mut('build.js', "ここで贈る" + NAME_JA + "';", "ここで授ける称号に、法的な効力はありません。';")],
    ['名簿の断りを外す', mut('KNIGHTS.en.md', '> The name of knight is not a decoration, honour or rank of knighthood of any country.\n', '')],
    ['個人情報の取り扱いから両社の措置の文を外す', mut('policies/privacy.md', '運営者には確かめられません。', '')],
    ['適法性の説明を前の文に戻す', mut('policies/legality.md', '州法の条は、Internet Archive の写しで確かめた（点検の記録）。', '州の法令の頁は、機械からの取得を止める仕組みがあるので、読んでいない。')],
    ['除外の一覧に 1951 年法律第 178 号を載せる', mut('verification/sources-raw.json', 'Proprieta\' intellettuale e industriale', 'Legge 3 marzo 1951, n. 178. Proprieta\' intellettuale e industriale')],
  ];
  const caught = breaks.filter(([, x]) => verdict(x).length > 0).map(([n]) => n);
  ok('壊して確かめる：引用・表・窓の値・件数・言い方・足した文・前の文に戻す、のどれでも落ちる（' + caught.length + ' / ' + breaks.length + '）', caught.length === breaks.length, breaks.filter(([n]) => !caught.includes(n)).map(([n]) => n).join(' / '));
}

console.log('\n63. 叙任の願い出の受付の停止（2026-11-12 から 2026-11-22 0 時まで）');
{
  /* 2026-11-12 に利用者が決めた。2026-11-22 0 時（日本時間）より前に開かれた願い出は受けず、自動の確認が停止を書いて閉じる。
   * 受けるかどうかは issue を開いた時刻だけで決まり、2026-11-22 0 時からは人の手を待たずに改めた規程で確かめる。
   * 時刻を外から渡して、停止のあいだは止まり、その後は受けることを確かめる。様式・規程・利用規約・README の文が日本語と英語にそろう。
   * 確かめる関数に壊したコードと文を渡し、落ちることも確かめる（壊して確かめる）。 */
  const files = ['tools/knighting.js', '.github/ISSUE_TEMPLATE/knighting.yml', 'policies/knighting.md', 'policies/knighting.en.md', 'policies/terms.md', 'policies/terms.en.md', 'README.md', 'docs/legal-audit-2026-11-12.md'];
  const load = (src) => { const m = { exports: {} }; new Function('require', 'module', 'exports', '__dirname', src.replace(/^#!.*\n/, ''))(require, m, m.exports, path.join(ROOT, 'tools')); return m.exports; };
  const FORM = (boxes) => '### 訂正への公開のリンク\n\nhttps://example.org/fix\n\n### 何を誤り、どう正したか\n\n自分の記事の年を誤り、正誤表で正しました。\n\n### 誓い\n\n' + boxes.map((b) => '- [X] ' + b).join('\n') + '\n';
  function verdict(x) {
    const bad = [];
    let K;
    try { K = load(x['tools/knighting.js']); } catch (e) { return ['受付のコードが読めない：' + e.message]; }
    /* 時刻を渡して確かめる：停止の始まりと終わりの両端。 */
    const cases = [['2026-11-11T23:59:59+09:00', false], ['2026-11-12T00:00:00+09:00', true], ['2026-11-21T23:59:59+09:00', true], ['2026-11-21T14:59:59Z', true], ['2026-11-22T00:00:00+09:00', false], ['2026-11-21T15:00:00Z', false], ['2027-01-01T00:00:00+09:00', false]];
    const wrong = cases.filter(([t, v]) => typeof K.paused !== 'function' || K.paused(t) !== v).map(([t]) => t);
    if (wrong.length) bad.push('停止の時刻：' + wrong.join(', '));
    if (K.PAUSE_UNTIL !== '2026-11-22T00:00:00+09:00' || K.PAUSE_UNTIL !== K.PRESENCE_FROM + 'T00:00:00+09:00' || K.PAUSE_UNTIL !== K.NATIONALITY_FROM + 'T00:00:00+09:00' || K.PAUSE_UNTIL !== K.PREMISE_FROM + 'T00:00:00+09:00') bad.push('停止の終わりと改めた規程の効力の日が食い違う');
    /* 停止の後は受ける：改めた規程の印をすべて付けた願い出は、2026-11-22 0 時に開けば整っている。 */
    const oaths = K.requiredOaths(x['.github/ISSUE_TEMPLATE/knighting.yml']);
    const after = K.check(K.parse(FORM(oaths.concat(K.DATED.map((d) => d.text)))), '2026-11-22T00:00:00+09:00', oaths);
    if (!after.ok) bad.push('2026-11-22 0 時に開いた整った願い出が通らない');
    const noPremise = K.check(K.parse(FORM(oaths.concat(K.DATED.map((d) => d.text).filter((t) => t !== K.PREMISE)))), '2026-11-22T00:00:00+09:00', oaths);
    if (noPremise.ok) bad.push('2026-11-22 からの印のない願い出が通る');
    /* 停止のあいだは、リンクを開く前に止め、停止を書いて閉じる（受けないものとして）。 */
    const src = x['tools/knighting.js'];
    const ip = src.indexOf('if (paused(opened)) {'), is = src.indexOf('const result = check(form, opened);');
    if (!(ip > 0 && is > ip && src.slice(ip, is).includes("state: 'closed', state_reason: 'not_planned'") && src.slice(ip, is).includes('return;'))) bad.push('停止のあいだに、閉じずに確かめに進む');
    const c = K.pauseComment ? K.pauseComment() : '';
    if (!(c.startsWith(K.MARK) && c.includes(K.PAUSE_TEXT) && c.includes(K.PAUSE_TEXT_EN) && K.PAUSE_TEXT.includes('2026-11-22 から、改めた規程') && K.PAUSE_TEXT_EN.includes('From 2026-11-22, a new issue may be opened'))) bad.push('停止のコメント');
    const need = (f, list) => list.forEach((s) => { if (!x[f].includes(s)) bad.push(f + '：' + s.slice(0, 40)); });
    need('.github/ISSUE_TEMPLATE/knighting.yml', ['**2026-11-12 から 2026-11-22 0 時（日本時間）より前は、願い出の受付を止めています。**', 'Applications are paused from 2026-11-12 until 00:00 on 2026-11-22 (Japan time).']);
    need('policies/knighting.md', ['\n## 受付の停止\n', '2026-11-12 から 2026-11-22 0 時（日本時間）より前は、叙任の願い出を受けません。2026-11-12 に利用者が決めました。', '2026-11-12 に Claude が決めました。日付だけで決まり、人の手を待たない形にするためです。', '開いている叙任の願い出は 0 件', '- 2026-11-12 から 2026-11-22 0 時（日本時間）より前に開かれた願い出（「受付の停止」）。', '1. 2026-11-22 0 時（日本時間）から、[叙任の願い出]']);
    need('policies/knighting.en.md', ['\n## Pause in receiving applications\n', 'The owner decided this on 2026-11-12.', 'Claude decided on 2026-11-12 that', 'there were no open applications for knighting', '1. From 00:00 on 2026-11-22 (Japan time), open an issue']);
    need('policies/terms.md', ['2026-11-12 から 2026-11-22 0 時（日本時間）より前は、叙任の願い出を受け付けません（[叙任の規程](./knighting.md)「受付の停止」）。']);
    need('policies/terms.en.md', ['From 2026-11-12 until 00:00 on 2026-11-22 (Japan time), applications for knighting are not received ([Rules on Knighting](./knighting.en.md), "Pause in receiving applications").']);
    need('README.md', ['2026-11-12 から 2026-11-22 0 時（日本時間）より前は、願い出の受付を止めています（[叙任の規程](policies/knighting.md)「受付の停止」）。']);
    need('docs/legal-audit-2026-11-12.md', ['2026-11-22 までの窓は、この停止で閉じた', '\n### 追って：受付の停止\n', '「法令に触れるおそれが分かったときは、その部分を止めてから確かめ、直します。」', '「読む人や騎士に不利になる変更は、変える内容と効力の生じる日を、効力の生じる前にこの頁で示します。」']);
    /* 引いた利用規約の文は、利用規約にそのまま現れる。 */
    for (const q of ['法令に触れるおそれが分かったときは、その部分を止めてから確かめ、直します。', '読む人や騎士に不利になる変更は、変える内容と効力の生じる日を、効力の生じる前にこの頁で示します。']) if (!x['policies/terms.md'].includes(q)) bad.push('利用規約にない引用：' + q.slice(0, 20));
    return bad;
  }
  const real = Object.fromEntries(files.map((f) => [f, read(f)]));
  const bad = verdict(real);
  ok('2026-11-22 0 時（日本時間）より前に開かれた願い出は受けずに閉じ、その時刻からは改めた規程で受ける（時刻を渡して確かめる）。断りが様式・規程・利用規約・README に日本語と英語でそろう', bad.length === 0, bad.join(' / '));
  const mut = (f, a, b) => Object.assign({}, real, { [f]: real[f].replace(a, b) });
  const breaks = [
    ['停止の終わりを一日早める', mut('tools/knighting.js', "const PAUSE_UNTIL = '2026-11-22T00:00:00+09:00';", "const PAUSE_UNTIL = '2026-11-21T00:00:00+09:00';")],
    ['停止の終わりを一日遅らせる', mut('tools/knighting.js', "const PAUSE_UNTIL = '2026-11-22T00:00:00+09:00';", "const PAUSE_UNTIL = '2026-11-23T00:00:00+09:00';")],
    ['停止の判定を外す', mut('tools/knighting.js', 'return Number.isFinite(t) && t >= Date.parse(PAUSE_FROM) && t < Date.parse(PAUSE_UNTIL);', 'return false;')],
    ['停止のあいだに閉じない', mut('tools/knighting.js', "    await github('PATCH', '/issues/' + n, { state: 'closed', state_reason: 'not_planned' });\n", '')],
    ['停止の後の改めた規程の印を外す', mut('tools/knighting.js', "  { from: PREMISE_FROM, text: PREMISE, label: '称号を遊びとして扱う印（良識の前提）がある' },\n", '')],
    ['様式の断りを外す', mut('.github/ISSUE_TEMPLATE/knighting.yml', 'Applications are paused from 2026-11-12 until 00:00 on 2026-11-22 (Japan time).', '')],
    ['英語の規程の節を外す', mut('policies/knighting.en.md', '\n## Pause in receiving applications\n', '\n## Pause\n')],
    ['利用規約の断りを外す', mut('policies/terms.md', '叙任の願い出を受け付けません（[叙任の規程](./knighting.md)「受付の停止」）。', '')],
    ['記録の窓の行を前に戻す', mut('docs/legal-audit-2026-11-12.md', '2026-11-22 までの窓は、この停止で閉じた', '')],
  ];
  const caught = breaks.filter(([, x]) => verdict(x).length > 0).map(([n]) => n);
  ok('壊して確かめる：停止の終わりをずらす・判定を外す・閉じない・改めた印を外す・断りを外す、のどれでも落ちる（' + caught.length + ' / ' + breaks.length + '）', caught.length === breaks.length, breaks.filter(([n]) => !caught.includes(n)).map(([n]) => n).join(' / '));
  const ej = B.errataEntries().find((e) => e.right.includes('叙任の願い出を受けない。2026-11-12 に利用者が決めました。'));
  ok('王の正誤表に、前の手順の文と、利用者が決めたことと Claude が決めた細目を、理由とともに記し、年表に行がある（日本語と英語）',
    !!ej && ej.kind.ja === '範囲' && ej.wrong.includes('叙任の願い出の様式で issue を開く。') && ej.right.includes('2026-11-12 に Claude が決めました。') && (ej.en[4] || '').includes('The owner decided this on 2026-11-12.')
    && B.timelineRows().some((r) => r[0].startsWith('2026-11-12') && r[1].includes('叙任の願い出の受付を止める') && r[2].includes('Applications for knighting are paused')));
}

console.log('\n64. 各国の憲法と法令の調べ（2026-11-12）');
require('./world/check.js').run(ok);

console.log('\n65. 各国の法令の調べの当てはめ：外国の称号を縛る国、騎士の呼び名の使い方、削除の求め、刑法第233条（2026-11-12）');
{
  /* 2026-11-12 に Claude が決めた。各国の法令の調べで取り寄せ、一つずつ読んだ条から、2026-11-22 から願い出を受けない国の表を作る。
   * 表の国は、一つずつ読んだ決め（decisions.json）が「叙任の規程「外国の称号を縛る国」」で除くと書いた条の国と、過不足なく同じで、
   * 拠る条の名は取り寄せた条の名そのもの。様式の印は表と同じ国を挙げ、受付のコードは 2026-11-22 からその印を求める（日付を渡して確かめる）。
   * 騎士の呼び名の使い方は三つの決まりと、反したときに名簿から外すことを、日本語と英語の規程と利用規約に書く。拠る条は取り寄せた条。
   * 記録は、引いた条の文が取り寄せた文に一字一句現れ、表は六つの欄で判定は五つのどれか、件数は表から数えたとおり。
   * 確かめる関数に壊した入力を渡し、落ちることも確かめる（壊して確かめる）。 */
  const W = require('./world/check.js');
  const WS = W.state();
  const prov = {};
  for (const d of Object.values(WS.data)) for (const p of d.provisions) prov[p.id] = p;
  const byJa = Object.fromEntries(WS.countries.map((c) => [c.name_ja, c.iso3])), byEn = Object.fromEntries(WS.countries.map((c) => [c.name, c.iso3]));
  const label = (p, en) => p.instrument + ' ' + p.article + (p.part === 'article' ? '' : en ? ' (paragraph ' + p.part.split(' ')[1] + ')' : '（第 ' + p.part.split(' ')[1] + ' 段落）');
  const DAY = '2026-11-22';
  const EXCL = '（叙任の規程「外国の称号を縛る国」）';
  const REC = 'docs/world-law-2026-11-12.md';
  const files = ['policies/knighting.md', 'policies/knighting.en.md', 'policies/terms.md', 'policies/terms.en.md', 'policies/legality.md', 'policies/legality.en.md', 'policies/requests.md', 'policies/requests.en.md',
    '.github/ISSUE_TEMPLATE/knighting.yml', '.github/ISSUE_TEMPLATE/request.yml', 'tools/knighting.js', REC];
  const load = (src) => { const m = { exports: {} }; new Function('require', 'module', 'exports', '__dirname', src.replace(/^#!.*\n/, ''))(require, m, m.exports, path.join(ROOT, 'tools')); return m.exports; };
  const sec = (t, h) => { const i = t.indexOf('\n## ' + h + '\n'); if (i < 0) return ''; const j = t.indexOf('\n## ', i + 4); return t.slice(i, j < 0 ? undefined : j); };
  const rowsOf = (t, head) => t.split('\n').filter((l) => /^\| /.test(l) && !l.startsWith('| --- ') && !l.startsWith(head)).map((l) => l.replace(/^\| | \|$/g, '').split(' | '));
  const KINDS = ['誤り', '根拠不足', '漏れ', '表現', '問題なし'];
  function verdict(x, decisions) {
    const bad = [];
    const need = (f, list) => list.forEach((t) => { if (!x[f].includes(t)) bad.push(f + '：' + t.slice(0, 40)); });
    /* 表の国 ＝ 一つずつ読んで除くと決めた条の国。 */
    const want = {};
    for (const [id, d] of Object.entries(decisions.provisions)) if (d.class !== 'does not apply' && (d.action || '').includes(EXCL) && prov[id] && prov[id].sha256 === d.sha256) (want[prov[id].country] = want[prov[id].country] || []).push(id);
    const isos = Object.keys(want).sort();
    const sj = sec(x['policies/knighting.md'], '外国の称号を縛る国'), se = sec(x['policies/knighting.en.md'], 'Countries that restrict foreign titles');
    const rj = rowsOf(sj, '| 国 |'), re = rowsOf(se, '| Country |');
    const sortId = (a, b) => a.localeCompare(b, 'en', { numeric: true });
    if (rj.length < 10 || rj.map((r) => byJa[r[0]]).sort().join() !== isos.join()) bad.push('表の国と、読んで除くと決めた国が違う');
    for (const r of rj) { const ids = (want[byJa[r[0]]] || []).slice().sort(sortId); if (r[1] !== ids.map((i) => label(prov[i])).join('、') || !/^型 [123](・型 [123])*$/.test(r[2] || '')) bad.push('拠る条か型が違う：' + r[0]); }
    if (re.length !== rj.length || re.map((r) => byEn[r[0]]).sort().join() !== isos.join()) bad.push('英語の表の国');
    for (const r of re) { const ids = (want[byEn[r[0]]] || []).slice().sort(sortId); if (r[1] !== ids.map((i) => label(prov[i], true)).join('; ')) bad.push('英語の拠る条：' + r[0]); }
    if (!sj.includes('2026-11-22 から、次の表の ' + rj.length + ' か国の国籍を持つ人は、日本に住んでいても、ほかの国籍と重ねて持っていても、願い出ることができません。2026-11-12 に Claude が決めました。')) bad.push('表の国の数を文に書いたとおりでない');
    if (!se.includes('From 2026-11-22, a person who holds the nationality of any of the ' + re.length + ' countries in the table below may not apply')) bad.push('英語の国の数');
    const types = (s, re1) => s.split('\n').filter((l) => re1.test(l)).length;
    if (!(sj.includes('次の三つの型のどれかに当たります。') && types(sj, /^[123]\. 型 [123]：/) === 3 && types(se, /^[123]\. Type [123]: /) === 3)) bad.push('三つの型');
    need('policies/knighting.md', ['表の国のほかにも、国籍を持つ国の法令が三つの型のどれかに当たる人は、願い出ることができません。', 'いちばん厳しい読み方を取り、願い出を受けない形にしました。', 'この限りで、これらの条が及ぶおそれは減りますが、なくなりはしません。']);
    need('policies/knighting.en.md', ['Besides the countries in the table, a person whose country of nationality has a law of any of the three types may not apply either', 'The strictest reading was taken']);
    /* 様式の印は表と同じ国を挙げ、2026-11-22 から求める。 */
    const yml = x['.github/ISSUE_TEMPLATE/knighting.yml'];
    let K;
    try { K = load(x['tools/knighting.js']); } catch (e) { return bad.concat(['受付のコードが読めない']); }
    const box = (new RegExp('        - label: (' + K.FOREIGN + '[^\\n]+)\\n          required: false\\n').exec(yml) || [])[1] || '';
    const listed = box.slice(K.FOREIGN.length).split('。')[0].split('、');
    if (!box || listed.slice().sort().join() !== rj.map((r) => r[0]).sort().join() || !box.includes('（ほかの国籍と重ねて持つ場合も含みます。' + DAY + ' から、この印のない願い出は受けません）。')) bad.push('様式の印の国が表と違う');
    if (!(K.FOREIGN_FROM === DAY && (K.DATED || []).some((d) => d.text === K.FOREIGN && d.from === DAY))) bad.push('受付のコードがその日から印を求めない');
    const oaths = K.requiredOaths(yml);
    const FORM = (boxes) => '### 訂正への公開のリンク\n\nhttps://example.org/fix\n\n### 何を誤り、どう正したか\n\n自分の記事の年を誤り、正誤表で正しました。\n\n### 誓い\n\n' + boxes.map((b) => '- [X] ' + b).join('\n') + '\n';
    const all = oaths.concat((K.DATED || []).map((d) => d.text)), noF = all.filter((t) => t !== K.FOREIGN);
    if (!K.check(K.parse(FORM(all)), DAY + 'T00:00:00+09:00', oaths).ok) bad.push('22 日に整った願い出が通らない');
    if (K.check(K.parse(FORM(noF)), DAY + 'T00:00:00+09:00', oaths).ok) bad.push('22 日から、印のない願い出が通る');
    if (!K.check(K.parse(FORM(noF)), '2026-11-21T23:59:59+09:00', oaths).ok) bad.push('22 日より前から印を求める');
    /* 利用規約と適法性の説明（日本語と英語）。 */
    need('policies/terms.md', ['予告：' + DAY + ' から、外国の称号を受けることを縛る国の国籍を持つ人は、日本に住んでいても、ほかの国籍と重ねて持っていても、叙任を願い出ることができません', '予告：' + DAY + ' から、騎士の呼び名は、ヌスクァマに関わることにだけ使い、',
      DAY + ' から、騎士の呼び名は、ヌスクァマに関わることにだけ使います。', DAY + ' から、これに反したときは、運営者は名簿から名を外します（[叙任の規程](./knighting.md)「騎士の呼び名の使い方」）。']);
    need('policies/terms.en.md', ['Notice: from ' + DAY + ', people who hold the nationality of a country that restricts accepting foreign titles may not apply', 'Notice: from ' + DAY + ', the name of knight is used only in connection with Nusquama',
      'From ' + DAY + ', if this is breached, the operator removes the name from the roll']);
    need('policies/legality.md', ['- ' + DAY + ' から、外国の称号を受けることを縛る国の国籍を持つ人の願い出も受けない（[叙任の規程](./knighting.md)「外国の称号を縛る国」）。']);
    need('policies/legality.en.md', ['- From ' + DAY + ', applications from people who hold the nationality of a country that restricts accepting foreign titles are not accepted either']);
    /* 騎士の呼び名の使い方：三つの決まり、反したときに外す、拠る条は取り寄せた条。 */
    const uj = sec(x['policies/knighting.md'], '騎士の呼び名の使い方'), ue = sec(x['policies/knighting.en.md'], 'Use of the name of knight');
    const items = (s) => s.split('\n').filter((l) => /^- [^：:]+$/.test(l) && !/^- \S+[：:]/.test(l));
    if (!(uj.includes(DAY + ' から、騎士の呼び名は、次の三つを守って使います。2026-11-12 に Claude が決めました。') && items(uj).length === 3 && uj.includes('これに反したことが分かったときは、名簿から名を外します。')
      && ue.includes('used only within the following three rules') && ue.split('\n').filter((l) => /^- (Use it only|Never present|Do not use it)/.test(l)).length === 3 && ue.includes('the name is removed from the roll'))) bad.push('呼び名の使い方の三つの決まり');
    const labels = new Set(Object.values(prov).map((p) => label(p))), labelsEn = new Set(Object.values(prov).map((p) => label(p, true)));
    const cites = uj.split('\n').filter((l) => /^- \S+：/.test(l)).map((l) => l.replace(/^- \S+?：/, '').replace(/（取り寄せた頁から取れたのは見出しだけです）$/, '').split('、'));
    if (cites.length < 6 || !cites.flat().every((c) => labels.has(c))) bad.push('呼び名の使い方が挙げる条が、取り寄せた条にない');
    const citesEn = ue.split('\n').filter((l) => /^- [A-Z][a-z]+: /.test(l)).map((l) => l.replace(/^- [A-Za-z]+: /, '').replace(/ \(only the heading could be taken from the fetched page\)$/, '').split('; '));
    if (citesEn.length !== cites.length || !citesEn.flat().every((c) => labelsEn.has(c))) bad.push('英語の呼び名の使い方が挙げる条');
    /* 削除の求め：どの国の人からも同じ手順と速さ。名誉と信用を求めの種類に。 */
    need('policies/requests.md', ['求めは、住んでいる国や国籍を問わず、どの国の人からも同じ手順で受け、同じ速さで答えます。', '- 自分の名誉や信用を傷つける内容の削除。', '他人の名誉や信用を傷つける記載も、判断の前に、ただちに外します。']);
    need('policies/requests.en.md', ['Requests are received in the same way, and answered as quickly, from people in any country', '- Deletion of content that harms one\'s honour or reputation.']);
    need('.github/ISSUE_TEMPLATE/request.yml', ['        - 自分の名誉や信用を傷つける内容の削除\n', 'どの国の人からも同じ手順で受け、同じ速さで答えます。']);
    /* 刑法第233条。 */
    need('policies/legality.md', ['### 名誉と信用（刑法第230条・第231条・第233条、民法第709条）', '<!-- 条文 刑法 第230条、刑法 第231条、刑法 第233条、民法 第709条 -->']);
    /* 記録：当てはめの節、引いた条の文、表の形と件数。 */
    const r = x[REC];
    const ri = r.indexOf('\n## 2026-11-12 の続き：当てはめ\n'), rs = ri < 0 ? '' : r.slice(ri, r.indexOf('\n## ', ri + 5) < 0 ? undefined : r.indexOf('\n## ', ri + 5));
    const quotes = [...rs.matchAll(/<!-- 条 (.+?) -->\n> (.+)\n/g)];
    for (const [, id, q] of quotes) if (!prov[id] || !require('../tools/world.js').body(prov[id]).split('\n').some((y) => y.includes(q))) bad.push('記録の引用が取り寄せた文にない：' + id);
    const quoted = new Set(quotes.map((q) => q[1]));
    for (const id of Object.values(want).flat()) if (!quoted.has(id)) bad.push('除く国の条を記録に引いていない：' + id);
    const t0 = rs.indexOf('\n| 箇所 | 法令と条 | 要件 | 事実 | 判定 | 対応 |\n| --- | --- | --- | --- | --- | --- |\n');
    const trows = t0 < 0 ? [] : rs.slice(t0 + 1).split('\n\n')[0].split('\n').slice(2).map((l) => l.replace(/^\| | \|$/g, '').split(' | '));
    if (trows.length < 10 || !trows.every((y) => y.length === 6 && KINDS.includes(y[4]))) bad.push('当てはめの表の形');
    const said = (k) => Number((new RegExp(k + ' (\\d+) 件').exec(rs) || [])[1]);
    if (!KINDS.every((k) => said(k) === trows.filter((y) => y[4] === k).length) || Number((/合わせて (\d+) 件です。/.exec(rs) || [])[1]) !== trows.length) bad.push('当てはめの表の件数');
    if (!rs.includes('弁護士の確認は受けていません。')) bad.push('記録に弁護士の文がない');
    /* 型で分けていた条を読み直した数は、型を当て直して数えたとおり（決めごと 5）。 */
    const Wt = require('../tools/world.js');
    const byRule = Wt.classifyAll(WS.data, Object.assign({}, decisions, { provisions: {} })).out, mine = Wt.classifyAll(WS.data, decisions).out;
    const of = (rule, c) => Object.keys(byRule).filter((k) => byRule[k].by === rule && (!c || (mine[k].by === 'read' && mine[k].class === c))).length;
    const hf = of('C-honours-foreign'), hfc = of('C-honours-foreign', 'could apply'), hfn = of('C-honours-foreign', 'does not apply'), sy = of('K-symbols-similar'), syn = of('K-symbols-similar', 'does not apply');
    if (!(rs.includes('外国の称号の型（C-honours-foreign）が拾う ' + hf + ' 件と、国のしるしの型（K-symbols-similar）が拾う ' + sy + ' 件です。') && rs.includes('外国の称号の型の ' + hf + ' 件のうち、' + hfc + ' 件は')
      && rs.includes('残る ' + hfn + ' 件は') && hfc + hfn === hf && rs.includes('国のしるしの型の ' + sy + ' 件は') && syn === sy)) bad.push('読み直した数が数えた数と違う');
    /* 取り寄せ直した出典の数は、取り寄せの記録から数えたとおり。 */
    const alts = WS.sources.codes.filter((c) => c.alt), recOf = (id) => Object.values(WS.data).map((d) => d.sources[id]).find(Boolean) || {};
    const okN = alts.filter((c) => !recOf(c.id).error).length;
    if (!rs.includes('取り寄せられなかった ' + alts.length + ' の出典を') || !rs.includes('取れたのは ' + okN + ' 件、取れなかったのは ' + (alts.length - okN) + ' 件です。')) bad.push('取り寄せ直した数が記録と違う');
    return bad;
  }
  const real = Object.fromEntries(files.map((f) => [f, read(f)]));
  const D = WS.decisions;
  const bad = verdict(real, D);
  ok('外国の称号を縛る国の表が一つずつ読んだ決めと過不足なくそろい、様式・受付のコード（日付を渡して確かめる）・規程・利用規約・適法性の説明・削除の求め・記録が日本語と英語でそろう', bad.length === 0, bad.join(' / '));
  const mut = (f, a, b) => Object.assign({}, real, { [f]: real[f].replace(a, b) });
  const kn = real['policies/knighting.md'];
  const firstRow = kn.split('\n').find((l) => l.startsWith('| アイルランド |'));
  const D2 = JSON.parse(JSON.stringify(D)); const k2 = Object.keys(D2.provisions).find((k) => (D2.provisions[k].action || '').includes(EXCL)); D2.provisions[k2].action = '対応は要りません。';
  const breaks = [
    ['表から国を一つ外す', mut('policies/knighting.md', firstRow + '\n', ''), D],
    ['決めから除く国を一つ外す（表は残す）', real, D2],
    ['表の国の数を変える', mut('policies/knighting.md', '次の表の ', '次の表の 1'), D],
    ['様式の印から国を一つ外す', mut('.github/ISSUE_TEMPLATE/knighting.yml', '：アイルランド、', '：'), D],
    ['受付のコードから印を外す', mut('tools/knighting.js', "  { from: FOREIGN_FROM, text: FOREIGN, label: '外国の称号を縛る国の国籍を持っていない印がある' },\n", ''), D],
    ['印を求める日を一日遅らせる', mut('tools/knighting.js', "const FOREIGN_FROM = '2026-11-22';", "const FOREIGN_FROM = '2026-11-23';"), D],
    ['呼び名の使い方の決まりを一つ外す', mut('policies/knighting.md', '- 公的な場・商取引・法的な場（書類・届出・契約・裁判など）で使わない。\n', ''), D],
    ['呼び名の使い方に取り寄せていない条を挙げる', mut('policies/knighting.md', '- ドイツ：Strafgesetzbuch (StGB) § 132a\n', '- ドイツ：Strafgesetzbuch (StGB) § 132b\n'), D],
    ['利用規約の予告を外す', mut('policies/terms.md', '予告：' + DAY + ' から、外国の称号を受けることを縛る国の国籍を持つ人は、', '予告：'), D],
    ['削除の求めから、どの国の人からも同じ手順で受ける文を外す', mut('policies/requests.md', '求めは、住んでいる国や国籍を問わず、どの国の人からも同じ手順で受け、同じ速さで答えます。', ''), D],
    ['適法性の説明の見出しから第233条を外す', mut('policies/legality.md', '### 名誉と信用（刑法第230条・第231条・第233条、民法第709条）', '### 名誉と信用（刑法第230条・第231条、民法第709条）'), D],
    ['記録の引用を一字変える', mut(REC, '> No citizen shall, without the prior approval of the President', '> No citizen shall, without the prior approval of the Prezident'), D],
    ['記録の判定の数を変える', mut(REC, /漏れ (\d+) 件/, (m0, n0) => '漏れ ' + (Number(n0) + 1) + ' 件'), D],
    ['記録の読み直した数を変える', mut(REC, /が拾う (\d+) 件と、国のしるし/, (m0, n0) => 'が拾う ' + (Number(n0) + 1) + ' 件と、国のしるし'), D],
    ['記録の取り寄せ直した数を変える', mut(REC, /取れたのは (\d+) 件/, (m0, n0) => '取れたのは ' + (Number(n0) + 1) + ' 件'), D],
  ];
  const caught = breaks.filter(([, x, d]) => verdict(x, d).length > 0).map(([n]) => n);
  ok('壊して確かめる：表・決め・数・様式・受付のコード・日付・呼び名の決まり・挙げた条・予告・削除の求め・第233条・記録の引用と件数・読み直した数・取り寄せ直した数、のどれでも落ちる（' + caught.length + ' / ' + breaks.length + '）', caught.length === breaks.length, breaks.filter(([n]) => !caught.includes(n)).map(([n]) => n).join(' / '));
}

console.log('\n66. リポジトリに記す他人の文：法令・条約と国の機関の文のほかは、引いた箇所と検査が拠る箇所だけ（2026-11-12）');
{
  /* 2026-11-12 に Claude が決めた。法令・条約と国の機関の文（著作権法第13条）のほかは、取り寄せた文の全文を git に記さない。
   * 記すのは、所在・最後の所在・取り寄せた日・全文の SHA-256 と、引いた箇所と検査が拠る箇所だけ。全文は取り寄せの実行の artifact に残す。
   * sources-raw.json の出典は、窓を記す法令・条約の出典（下の WHOLE）と、引いた箇所だけを記す出典に分かれ、後者の箇所は一次資料の表の引用か、
   * 検査が拠る米州機構の表だけ。各国の法令の調べの私的な団体の文は verification/world/check.js が確かめる。
   * ライセンスの断り（日本語と英語）、適法性の説明の改めた文、王の正誤表 28、年表、記録の節の表と数が、数えた数とそろう。
   * 確かめる関数に壊した入力を渡し、落ちることも確かめる（壊して確かめる）。 */
  const REC = 'docs/world-law-2026-11-12.md';
  const files = ['verification/sources-raw.json', 'verification/sources.json', 'verification/world/sources.json', 'verification/world/README.md', 'README.md', 'policies/names.md', 'policies/names.en.md',
    'policies/legality.md', 'policies/legality.en.md', 'ERRATA.md', 'ERRATA.en.md', REC];
  const WHOLE = ['montevideo', 'gdpr', 'gdpr-cellar', 'italy', 'ccpa', 'gdpr-art27', 'italy-cp-10', 'italy-depenalizzazione', 'egov', 'italy-cp-6', 'italy-cp-9', 'italy-178-art7', 'italy-depenalizzazione-allegato', 'ccpa-archive'];
  const LIC_JA = '検証のために引いたり記したりした他人の文は、CC BY 4.0 の対象ではなく、それぞれの権利者のものです。';
  const LIC_EN = 'Third-party texts quoted or stored for verification are not under CC BY 4.0 and remain their owners\'.';
  const KINDS66 = ['誤り', '根拠不足', '漏れ', '表現', '問題なし'];
  const W66 = require('./world/check.js').state();
  const art13 = JSON.parse(read('verification/statutes-texts.json'))['著作権法 第13条'];
  function verdict(x) {
    const bad = [];
    const need = (f, list) => list.forEach((t) => { if (!x[f].includes(t)) bad.push(f + '：' + t.slice(0, 40)); });
    let R, P, WS;
    try { R = JSON.parse(x['verification/sources-raw.json']).sources; P = JSON.parse(x['verification/sources.json']).sources; WS = JSON.parse(x['verification/world/sources.json']); } catch (e) { return ['JSON が読めない']; }
    /* 窓を記す出典は、法令・条約の出典と過不足なく同じ。ほかの出典は窓を持たず、箇所は引用か米州機構の表だけ。 */
    const whole = Object.keys(R).filter((k) => R[k].whole === true);
    if (whole.slice().sort().join() !== WHOLE.slice().sort().join() || !Object.values(R).every((r) => typeof r.whole === 'boolean')) bad.push('窓を記す出典が、法令・条約の出典と違う');
    let spanChars = 0;
    for (const [k, r] of Object.entries(R)) {
      if (!r.error && !/^[0-9a-f]{64}$/.test(r.sha256_full || '')) bad.push(k + '：全文の SHA-256 がない');
      if (r.whole) continue;
      if (r.windows) bad.push(k + '：法令・条約でない文の窓を記している');
      if ((r.head || '').length > 300) bad.push(k + '：冒頭を 300 字より長く記している');
      if (r.missing) bad.push(k + '：引いた文が取り寄せた全文にない（' + r.missing.join('・') + '）');
      const quotes = Object.values(P).filter((v) => v.from === k).map((v) => v.quote);
      for (const sp of r.spans || []) { spanChars += sp.length; if (!quotes.includes(sp) && !(k === 'montevideo-parties' && sp.startsWith('COUNTRY SIGNATURE') && !sp.includes('*DECLARATIONS'))) bad.push(k + '：引用でも検査が拠る表でもない箇所を記している'); }
    }
    if (!WS.spans_only || !WS.spans_only.constitute || !WS.spans_only['KOR-pipa']) bad.push('各国の法令の調べで、私的な団体の文の出典を挙げていない');
    /* ライセンスの断りと、調べの README。 */
    need('README.md', ['文と国章は CC BY 4.0 です。\n' + LIC_JA]);
    need('policies/names.md', ['最終更新：2026-11-12。', LIC_JA]);
    need('policies/names.en.md', ['Last updated: 2026-11-12.', LIC_EN]);
    need('verification/world/README.md', ['ここに記した他人の文は、CC BY 4.0 の対象ではなく、それぞれの権利者のものです。', '全文は、取り寄せの実行の artifact（`world-full`）に残し、git には入れていません。']);
    /* 適法性の説明の改めた文。前の文は残らない。 */
    need('policies/legality.md', ['頁は引用のほかに他人の著作物を載せず、リポジトリも、法令・条約と国の機関の文のほかは、引いた箇所と検査が拠る箇所だけを記す。']);
    need('policies/legality.en.md', ['the repository, too, keeps of texts other than laws, treaties and texts of state organs only the passages quoted and the passages its checks rely on.']);
    if (x['policies/legality.md'].includes('引用のほかは、他人の著作物を複製していない。') || x['policies/legality.en.md'].includes('apart from quotation, no one else\'s work is reproduced.')) bad.push('適法性の説明に前の文が残る');
    /* 王の正誤表 28 は前の文を残し、事実の分類で、日本語と英語にある。 */
    const row = (t, n) => t.split('\n').find((l) => l.startsWith('| ' + n + ' | ')) || '';
    const e28 = row(x['ERRATA.md'], 28), e28en = row(x['ERRATA.en.md'], 28);
    if (!e28.includes('当てはまらない理由：引用のほかは、他人の著作物を複製していない。') || !e28.includes('2026-11-12 に Claude が決めました。') || !/\| 事実 \| Insula Facti V \|$/.test(e28)) bad.push('王の正誤表 28');
    if (!e28en.includes('apart from quotation, no one else\'s work is reproduced.') || !/\| Fact \| Insula Facti V \|$/.test(e28en)) bad.push('英語の王の正誤表 28');
    need('README.md', ['| 2026-11-12（日本時間） | リポジトリに記す他人の文を減らす。']);
    /* 記録の節：表の形と判定の数、書いた数は数えた数、引いた第13条は取り寄せた文。 */
    const r = x[REC], i = r.indexOf('\n## 2026-11-12 の続き：見落としていたもの\n'), j = i < 0 ? -1 : r.indexOf('\n## ', i + 5);
    const sec = i < 0 ? '' : r.slice(i, j < 0 ? undefined : j);
    const t0 = sec.indexOf('\n| 箇所 | 法令と条 | 要件 | 事実 | 判定 | 対応 |\n| --- | --- | --- | --- | --- | --- |\n');
    const rows = t0 < 0 ? [] : sec.slice(t0 + 1).split('\n\n')[0].split('\n').slice(2).map((l) => l.replace(/^\| | \|$/g, '').split(' | '));
    if (rows.length < 8 || !rows.every((y) => y.length === 6 && KINDS66.includes(y[4]))) bad.push('記録の表の形');
    const said = (k) => Number((new RegExp(k + ' (\\d+) 件').exec(sec) || [])[1]);
    if (!KINDS66.every((k) => said(k) === rows.filter((y) => y[4] === k).length) || Number((/合わせて (\d+) 件です。/.exec(sec) || [])[1]) !== rows.length) bad.push('記録の表の件数');
    const priv = Object.values(W66.data).flatMap((d) => d.provisions).filter((p) => p.spans);
    const n = (src) => priv.filter((p) => p.source === src).length;
    const sum = (f) => priv.reduce((a, p) => a + f(p), 0);
    const nums = ['出典は ' + Object.keys(R).length + ' です', '法令・条約の ' + whole.length + ' で', '検査が拠る箇所だけを記すのは ' + (Object.keys(R).length - whole.length) + ' です', 'あわせて ' + spanChars + ' 字です',
      '文を外した条は ' + priv.length + ' 件です', '英語の文が ' + n('constitute') + ' 件', '英訳が ' + n('KOR-pipa') + ' 件', '文は、あわせて ' + sum((p) => p.length) + ' 字でした', '記した箇所は、あわせて ' + sum((p) => p.spans.join('').length) + ' 字です'];
    for (const s of nums) if (!sec.includes(s)) bad.push('記録の数が数えた数と違う：' + s);
    if (!sec.includes('<!-- 条文 著作権法 第13条 -->\n> ' + art13 + '\n')) bad.push('記録の第13条の文が取り寄せた文と違う');
    if (!sec.includes('弁護士の確認は受けていません。') || (sec.match(/2026-11-12 に Claude が決めました。/g) || []).length < 3) bad.push('記録に、弁護士の文か決めた者と理由がない');
    return bad;
  }
  const real = Object.fromEntries(files.map((f) => [f, read(f)]));
  const bad = verdict(real);
  ok('リポジトリに記す他人の文は、法令・条約の窓と、引いた箇所と検査が拠る箇所だけで、全文の SHA-256 を持ち、ライセンスの断り・適法性の説明・王の正誤表 28・年表・記録の表と数が、日本語と英語でそろう', bad.length === 0, bad.join(' / '));
  const mut = (f, a, b) => Object.assign({}, real, { [f]: real[f].replace(a, b) });
  const raw0 = JSON.parse(real['verification/sources-raw.json']);
  const withRaw = (fn) => { const t = JSON.parse(JSON.stringify(raw0)); fn(t.sources); return Object.assign({}, real, { 'verification/sources-raw.json': JSON.stringify(t) }); };
  const breaks = [
    ['規約の出典に窓を戻す', withRaw((S) => { S['vercel-terms'].windows = ['Hobby plan …']; })],
    ['規約の出典を法令の扱いに替える', withRaw((S) => { S['vercel-terms'].whole = true; })],
    ['規約の出典に、引用でない箇所を足す', withRaw((S) => { S['vercel-terms'].spans.push('Vercel may change these Terms at any time.'); })],
    ['米州機構の表に宣言の文まで足す', withRaw((S) => { const k = S['montevideo-parties'].spans.findIndex((y) => y.startsWith('COUNTRY SIGNATURE')); S['montevideo-parties'].spans[k] += ' *DECLARATIONS/RESERVATIONS'; })],
    ['出典の全文の SHA-256 を消す', withRaw((S) => { delete S['ppc-qa'].sha256_full; })],
    ['冒頭を長く記す', withRaw((S) => { S['vercel'].head = 'x'.repeat(301); })],
    ['名称と権利からライセンスの断りを外す', mut('policies/names.md', LIC_JA, '')],
    ['英語の名称と権利からライセンスの断りを外す', mut('policies/names.en.md', LIC_EN, '')],
    ['適法性の説明を前の文に戻す', mut('policies/legality.md', '頁は引用のほかに他人の著作物を載せず、リポジトリも、法令・条約と国の機関の文のほかは、引いた箇所と検査が拠る箇所だけを記す。', '引用のほかは、他人の著作物を複製していない。')],
    ['王の正誤表 28 の分類を変える', mut('ERRATA.md', '| 事実 | Insula Facti V |', '| 法 | Insula Legis VIII |')],
    ['記録の表の判定の数を変える', mut(REC, '漏れ 4 件、表現 0 件', '漏れ 5 件、表現 0 件')],
    ['記録の文字数を変える', mut(REC, /記した箇所は、あわせて (\d+) 字です/, (m0, d) => '記した箇所は、あわせて ' + (Number(d) - 1) + ' 字です')],
    ['記録の第13条の文を一字変える', mut(REC, '一 憲法その他の法令', '一 憲法その他の法律')],
  ];
  const caught = breaks.filter(([, x]) => verdict(x).length > 0).map(([k]) => k);
  ok('壊して確かめる：窓・扱い・箇所・表・値・冒頭・ライセンスの断り・前の文・正誤表・判定の数・文字数・第13条のどれでも落ちる（' + caught.length + ' / ' + breaks.length + '）', caught.length === breaks.length, breaks.filter(([k]) => !caught.includes(k)).map(([k]) => k).join(' / '));
}

console.log('\n67. 非公開の連絡の約束を、ある道に合わせる（2026-11-12）');
{
  /* 2026-11-12 の二度目の読み直しで、非公開で連絡する方法を返すという約束が事実に合わないと分かった。GitHub の外に連絡先を持たず、
   * GitHub の非公開の脆弱性の報告も有効でない（API で enabled: false）。規程・様式・SECURITY.md は、ある道だけを書く：
   * 求めた人が自分の GitHub のプロフィールに公開した連絡先にだけ非公開で答え、ないときは個人の事柄を書かずに issue で答える。
   * 氏名と住所は issue に書かない。前の約束の文は、王の正誤表と生成した正誤の頁のほかに残らない。
   * 王の正誤表 29（事実、日本語と英語）、年表、適法性の説明の残る危険、義務の表、点検の記録の節（表・件数・条文・残る危険）がそろう。
   * 確かめる関数に壊した入力を渡し、落ちることも確かめる（壊して確かめる）。 */
  const AUD = 'docs/legal-audit-2026-11-12.md';
  const files = ['SECURITY.md', 'policies/requests.md', 'policies/requests.en.md', 'policies/privacy.md', 'policies/privacy.en.md', 'policies/terms.md', 'policies/terms.en.md',
    'policies/legality.md', 'policies/legality.en.md', '.github/ISSUE_TEMPLATE/request.yml', 'ERRATA.md', 'ERRATA.en.md', 'README.md', 'verification/duties.json', AUD];
  const scanned = [...fs.readdirSync(ROOT).filter((f) => f.endsWith('.md') && !/^(ERRATA(\.en)?|CLAUDE)\.md$/.test(f)),
    ...fs.readdirSync(path.join(ROOT, 'policies')).map((f) => 'policies/' + f),
    ...fs.readdirSync(path.join(ROOT, '.github', 'ISSUE_TEMPLATE')).map((f) => '.github/ISSUE_TEMPLATE/' + f),
    ...fs.readdirSync(path.join(ROOT, 'site', 'policies')).filter((f) => f.endsWith('.html')).map((f) => 'site/policies/' + f)];
  const OLD = ['非公開で連絡する方法を返します', 'a way to make contact privately', '非公開の連絡で遅滞なく', 'through a private channel', 'through the private channel', '「公開できない求め」に沿った連絡で', '「公開できない求め」に沿って行います'];
  const PVR_JA = 'GitHub の非公開の脆弱性の報告（private vulnerability reporting）は、このリポジトリで有効になっていません（2026-11-13 に GitHub の API で確かめました）。';
  const PVR_EN = "GitHub's private vulnerability reporting is not enabled for this repository (checked through the GitHub API on 2026-11-13).";
  const NAME_JA = '運営者の氏名と住所は、求めた人が自分の GitHub のプロフィールに公開している連絡先へ、遅滞なく知らせます。';
  const KINDS67 = ['誤り', '根拠不足', '漏れ', '表現', '問題なし'];
  const T67 = JSON.parse(read('verification/statutes-texts.json'));
  const S67 = JSON.parse(read('verification/statutes.json'));
  const have67 = new Set(S67.statutes.map((e) => e.name + ' ' + e.article));
  function verdict(x) {
    const bad = [];
    const need = (f, list) => list.forEach((t) => { if (!x[f].includes(t)) bad.push(f + '：' + t.slice(0, 40)); });
    /* 前の約束は、どこにも残らない（王の正誤表と、それから作る頁は除く）。 */
    for (const f of Object.keys(x).filter((k) => k.startsWith('scan:'))) for (const o of OLD) if (x[f].includes(o)) bad.push(f.slice(5) + ' に前の約束が残る：' + o);
    need('SECURITY.md', [PVR_JA, 'ヌスクァマには、非公開で知らせを受ける窓口がありません。', '運営者は、知らせた人が自分の GitHub のプロフィールに連絡先を公開しているときだけ、その連絡先へ非公開で答え、詳細を受け取ります。', 'そうした連絡先がないときは、詳細を非公開で受け取る道はありません。運営者は、詳細に触れずに issue で答えます。']);
    need('policies/requests.md', ['ヌスクァマには、非公開で求めを受ける窓口がありません。\n' + PVR_JA, '運営者は、求めた人が自分の GitHub のプロフィールに連絡先を公開しているときだけ、その連絡先へ非公開で答えます。', 'そうした連絡先がないときは、非公開で答える道はありません。そのときは、個人の事柄を書かずに、issue で答えます。']);
    need('policies/requests.en.md', ['Nusquama has no channel that receives requests privately.\n' + PVR_EN, 'The operator answers privately only when the person who asks has made a contact public on their own GitHub profile', 'When there is no such contact, there is no private route. The operator then answers in the issue, without personal details.']);
    need('policies/privacy.md', [NAME_JA, 'そうした連絡先がない人には、氏名と住所を非公開で知らせる道がありません。issue には書きません（']);
    need('policies/privacy.en.md', ['at a contact that person has made public on their own GitHub profile.', 'For a person with no such contact, there is no private route to give the name and address. They are not written in the issue']);
    need('policies/terms.md', ['話し合いは、issue で行います。相手方が自分の GitHub のプロフィールに連絡先を公開しているときは、その連絡先で行うこともできます', '非公開の窓口はありません。運営者が非公開で答えるのは、']);
    need('policies/terms.en.md', ['The talks take place in an issue. When the other party has made a contact public on their own GitHub profile', 'There is no private channel. The operator answers privately only in the case described']);
    need('policies/legality.md', ['ただし第32条の氏名と住所は、連絡先を公開していない人に知らせる道がない。']);
    need('policies/legality.en.md', ['except that the name and address under Article 32 cannot be given to a person who has made no contact public.']);
    need('.github/ISSUE_TEMPLATE/request.yml', ['運営者が非公開で答えるのは、GitHub のプロフィールに連絡先を公開している人にだけです。', 'The operator answers privately only to a contact made public on the person\'s own GitHub profile.']);
    need('verification/duties.json', ['"text": "' + NAME_JA + '"']);
    /* 規程の最終更新は、日本語と英語で同じ日。 */
    for (const p of ['requests', 'privacy', 'terms', 'legality']) {
      const dj = (/^最終更新：(\d{4}-\d{2}-\d{2})。$/m.exec(x['policies/' + p + '.md']) || [])[1], de = (/^Last updated: (\d{4}-\d{2}-\d{2})\.$/m.exec(x['policies/' + p + '.en.md']) || [])[1];
      if (!(dj && dj >= '2026-11-13' && dj === de)) bad.push(p + '：最終更新');
    }
    /* 王の正誤表 29：前の文を残し、事実の分類で、Claude が決めたことと理由がある（日本語と英語）。年表に行がある。 */
    const row = (t, n) => t.split('\n').find((l) => l.startsWith('| ' + n + ' | ')) || '';
    const e29 = row(x['ERRATA.md'], 29), e29en = row(x['ERRATA.en.md'], 29);
    if (!e29.includes('運営者から、非公開で連絡する方法を返します。') || !e29.includes('運営者の氏名と住所は、求めた人に、非公開の連絡で遅滞なく知らせます。') || !e29.includes('これは事実の訂正で、範囲を改めたものではない。')
      || (e29.match(/2026-11-12 に Claude が決めました。/g) || []).length !== 2 || !/\| 事実 \| Insula Facti VI \|$/.test(e29)) bad.push('王の正誤表 29');
    if (!e29en.includes('"The operator answers with a way to make contact privately."') || !e29en.includes('This is a correction of a fact, not a change of scope.') || (e29en.match(/Claude decided this on 2026-11-12/g) || []).length !== 2 || !/\| Fact \| Insula Facti VI \|$/.test(e29en)) bad.push('英語の王の正誤表 29');
    need('README.md', ['| 2026-11-13（日本時間） | 非公開の連絡の約束を、ある道に合わせて改める。', '| The promise of a private contact is corrected to the route that exists.']);
    /* 点検の記録の節：表の形、件数、条は見張りの表にある、条文は取り寄せた文、残る危険、弁護士の文、決めた者と理由。 */
    const a = x[AUD], i = a.indexOf('\n## 2026-11-12 の続き：二度目の見落とし\n'), j = i < 0 ? -1 : a.indexOf('\n## ', i + 5);
    const sec = i < 0 ? '' : a.slice(i, j < 0 ? undefined : j);
    const t0 = sec.indexOf('\n| 箇所 | 法令と条 | 要件 | 事実 | 判定 | 対応 |\n| --- | --- | --- | --- | --- | --- |\n');
    const rows = t0 < 0 ? [] : sec.slice(t0 + 1).split('\n\n')[0].split('\n').slice(2).map((l) => l.replace(/^\| | \|$/g, '').split(' | '));
    if (rows.length < 8 || !rows.every((y) => y.length === 6 && KINDS67.includes(y[4]))) bad.push('記録の表の形');
    const said = (k) => Number((new RegExp(k + ' (\\d+) 件').exec(sec) || [])[1]);
    if (!KINDS67.every((k) => said(k) === rows.filter((y) => y[4] === k).length) || Number((/合わせて (\d+) 件です。/.exec(sec) || [])[1]) !== rows.length) bad.push('記録の表の件数');
    for (const y of rows) if (!y[1].startsWith('なし')) for (const m of y[1].matchAll(/(個人情報保護法(?:施行令|施行規則)?)第(\d+)条/g)) if (!have67.has(m[1] + ' ' + m[2])) bad.push('記録の表の条が見張りの表にない：' + m[0]);
    for (const k of ['個人情報保護法 第32条', '個人情報保護法 第37条']) if (!sec.includes('<!-- 条文 ' + k + ' -->\n> ' + T67[k] + '\n')) bad.push('記録の条文が取り寄せた文と違う：' + k);
    if (!rows.some((y) => y[0].startsWith('判定の表の「個人情報保護法第32条') && y[4] === '誤り')) bad.push('前の「問題なし」の行が誤りだったと書いていない');
    if (!sec.includes('\n### 残る危険\n') || !sec.includes('これは残る危険です。') || !sec.includes('`enabled: false`') || !sec.includes('ラベル「求め」の issue は、2026-11-12 の時点で 0 件でした。')) bad.push('記録の残る危険か事実');
    if (!sec.includes('この節も、弁護士の確認は受けていません。') || (sec.match(/2026-11-12 に Claude が決めました。/g) || []).length !== 3 || !sec.split('2026-11-12 に Claude が決めました。').slice(1).every((z) => /ためです。/.test(z.split('\n\n')[0]))) bad.push('記録に、弁護士の文か決めた者と理由がない');
    return bad;
  }
  const real = Object.fromEntries(files.map((f) => [f, read(f)]).concat(scanned.map((f) => ['scan:' + f, read(f)])));
  const bad = verdict(real);
  ok('非公開の連絡の約束は、ある道だけを書き（GitHub の非公開の報告は有効でない、プロフィールに公開した連絡先にだけ答える、ないときは issue で個人の事柄を書かずに答える）、前の約束は ' + scanned.length + ' の頁と様式に残らず、王の正誤表 29・年表・適法性の説明・義務の表・点検の記録がそろう（日本語と英語）', bad.length === 0, bad.join(' / '));
  const mut = (f, a, b) => Object.assign({}, real, { [f]: real[f].replace(a, b) });
  const breaks = [
    ['求めの規程に前の約束を戻す', mut('scan:policies/requests.md', '運営者は、求めた人が', '運営者から、非公開で連絡する方法を返します。\n運営者は、求めた人が')],
    ['英語の個人情報の取り扱いに前の約束を戻す', mut('scan:policies/privacy.en.md', 'at a contact that person', 'through a private channel, at a contact that person')],
    ['生成した頁に前の約束が残る', mut('scan:site/policies/terms.html', '<h2', '非公開で連絡する方法を返します<h2')],
    ['SECURITY.md から非公開の報告が有効でないことを外す', mut('SECURITY.md', PVR_JA, '')],
    ['求めの規程から、連絡先がないときの答え方を外す', mut('policies/requests.md', 'そうした連絡先がないときは、非公開で答える道はありません。', '')],
    ['個人情報の取り扱いから、issue に書かないことを外す', mut('policies/privacy.md', 'issue には書きません（', '（')],
    ['適法性の説明から残る危険を外す', mut('policies/legality.md', 'ただし第32条の氏名と住所は、連絡先を公開していない人に知らせる道がない。', '')],
    ['様式から答え方を外す', mut('.github/ISSUE_TEMPLATE/request.yml', '運営者が非公開で答えるのは、GitHub のプロフィールに連絡先を公開している人にだけです。', '')],
    ['義務の表を前の文に戻す', mut('verification/duties.json', NAME_JA, '運営者の氏名と住所は、求めた人に、非公開の連絡で遅滞なく知らせます。')],
    ['英語の規程の最終更新をずらす', mut('policies/terms.en.md', 'Last updated: 2026-11-13.', 'Last updated: 2026-11-11.')],
    ['王の正誤表 29 を範囲の分類にする', mut('ERRATA.md', '| 事実 | Insula Facti VI |', '| 範囲 | Insula Finis XIII |')],
    ['英語の王の正誤表 29 から前の文を外す', mut('ERRATA.en.md', '"The operator answers with a way to make contact privately." (Requests; the security page) / ', '')],
    ['年表の行を外す', mut('README.md', '| 2026-11-13（日本時間） | 非公開の連絡の約束を、ある道に合わせて改める。', '| 2026-11-13（日本時間） | 改める。')],
    ['記録の判定の数を変える', mut(AUD, '誤り 2 件、根拠不足 2 件', '誤り 3 件、根拠不足 2 件')],
    ['記録の第32条の文を一字変える', mut(AUD, '当該個人情報取扱事業者の氏名又は名称及び住所', '当該個人情報取扱事業者の氏名又は名称及び居所')],
    ['記録の表に見張っていない条を挙げる', mut(AUD, '| 開示の求め | 個人情報保護法第33条 |', '| 開示の求め | 個人情報保護法第99条 |')],
    ['記録から残る危険を外す', mut(AUD, 'これは残る危険です。', '')],
    ['記録から決めた理由を外す', mut(AUD, 'issue に書けば、求めた人だけでなく誰にでも公開されるためです。', 'issue に書けば、誰にでも公開されます。')],
  ];
  const caught = breaks.filter(([, y]) => verdict(y).length > 0).map(([k]) => k);
  ok('壊して確かめる：前の約束を戻す・生成した頁に残す・非公開の報告・答え方・issue に書かないこと・残る危険・様式・義務の表・最終更新・正誤表・年表・判定の数・条文・条・理由のどれでも落ちる（' + caught.length + ' / ' + breaks.length + '）', caught.length === breaks.length, breaks.filter(([k]) => !caught.includes(k)).map(([k]) => k).join(' / '));
}

console.log('\n68. 叙任の願い出の自動の確認は、訂正へのリンクを開かない（2026-11-12）');
{
  /* 2026-11-12 の三度目の読み直しで、自動の確認が願い出た人の書いたリンクを GitHub Actions から開いていると分かった。
   * 先のサイトの規約は願い出ごとに違い、前もって読めない。自動の確認はリンクを開かず、https の URL で受けない先（CLOSED）を
   * 指さないことだけを文字の上で見る。外へ出す要求は GitHub の API だけ。受けない先の一覧は、叙任の規程（日本語と英語）・
   * 王の正誤表 30・点検の記録の節と同じ。前の文は、王の正誤表と生成した正誤の頁のほかに残らない。
   * 確かめる関数に壊した入力を渡し、落ちることも確かめる（壊して確かめる）。 */
  const AUD = 'docs/legal-audit-2026-11-12.md', CODE = 'tools/knighting.js', WF = '.github/workflows/knighting.yml';
  const files = [CODE, WF, 'policies/knighting.md', 'policies/knighting.en.md', 'policies/privacy.md', 'policies/privacy.en.md', 'INSTITUTIONS.md', 'INSTITUTIONS.en.md', 'ERRATA.md', 'ERRATA.en.md', 'README.md', AUD];
  const scanned = [...fs.readdirSync(ROOT).filter((f) => f.endsWith('.md') && !/^(ERRATA(\.en)?|CLAUDE)\.md$/.test(f)),
    ...fs.readdirSync(path.join(ROOT, 'policies')).map((f) => 'policies/' + f),
    ...fs.readdirSync(path.join(ROOT, '.github', 'ISSUE_TEMPLATE')).map((f) => '.github/ISSUE_TEMPLATE/' + f),
    ...fs.readdirSync(path.join(ROOT, 'site', 'policies')).filter((f) => f.endsWith('.html')).map((f) => 'site/policies/' + f), WF, CODE];
  const OLD = ['訂正へのリンクを一度開きます', '開けるかどうかを示す応答の状態', '訂正へのリンクが開けるかどうかを確かめ', '訂正へのリンクが開けるかを確かめて', 'opens the link to the correction once', 'the status of the response, which shows whether the link opens', 'whether the link to the correction opens', 'await status(link)', "method: 'HEAD'"];
  const GOOD = ['https://example.org/erratum', 'https://github.com/someone/notes/commit/0123abc', 'https://zenn.dev/someone/articles/fix', 'https://例え.jp/訂正'];
  const BAD = ['http://example.org/erratum', 'https://localhost/x', 'https://LOCALHOST./x', 'https://127.0.0.1/x', 'https://0x7f.1/x', 'https://2130706433/x', 'https://[::1]/x', 'https://router/x',
    'https://printer.local/x', 'https://a.localhost/x', 'https://db.internal/x', 'https://nas.home.arpa/x', 'https://a.test/x', 'https://foo.example/x', 'https://x.invalid/x', 'https://abc.onion/x', ['https://user:pw', 'example.org/x'].join('@') /* 連絡先の走査（検査 46）に掛からないよう、@ で繋いで作る */, 'https://'];
  const SUFFIXES = ['.localhost', '.local', '.internal', '.home.arpa', '.test', '.example', '.invalid', '.onion'];
  const KINDS68 = ['誤り', '根拠不足', '漏れ', '表現', '問題なし'];
  const load = (src) => { const m = { exports: {} }; new Function('require', 'module', 'exports', '__dirname', src.replace(/^#!.*\n/, ''))(require, m, m.exports, path.join(ROOT, 'tools')); return m.exports; };
  function verdict(x) {
    const bad = [];
    const need = (f, list) => list.forEach((t) => { if (!x[f].includes(t)) bad.push(f + '：' + t.slice(0, 40)); });
    /* コード：外へ出す要求は GitHub の API だけ。要求の先をすべて数える。 */
    const src = x[CODE];
    const calls = [...src.matchAll(/\bfetch\s*\(\s*([^,)]*)/g)].map((m) => m[1].trim());
    if (calls.length !== 1 || !calls.every((a) => a.startsWith("'https://api.github.com/repos/'"))) bad.push('要求の先が GitHub の API だけでない：' + calls.join(' / '));
    if (/\b(?:https?|net|tls|dns|child_process|undici)\b['"]\s*\)/.test(src) || /\brequire\(\s*['"](?:https?|net|tls|dns|child_process|undici)['"]/.test(src)) bad.push('外へ出る別の道を読み込む');
    let K;
    try { K = load(src); } catch (e) { return bad.concat(['受付のコードが読めない：' + e.message]); }
    if ('status' in K) bad.push('リンクを開く関数が残る');
    const oaths = K.requiredOaths(read('.github/ISSUE_TEMPLATE/knighting.yml'));
    const all = oaths.concat((K.DATED || []).map((d) => d.text));
    const FORM = (link) => '### 訂正への公開のリンク\n\n' + link + '\n\n### 何を誤り、どう正したか\n\n自分の記事の年を誤り、正誤表で正しました。\n\n### 誓い\n\n' + all.map((b) => '- [X] ' + b).join('\n') + '\n';
    /* 確かめるあいだに外へ要求を出さない：fetch を落とす形に替えて走らせ、同期で答えが返る。 */
    const real = global.fetch; let asked = 0;
    global.fetch = () => { asked++; throw new Error('fetch'); };
    try {
      for (const u of GOOD) { const r = K.check(K.parse(FORM(u)), '2026-11-22T00:00:00+09:00', oaths); if (!r || r instanceof Promise || r.ok !== true) bad.push('受けるはずのリンクが通らない：' + u); }
      for (const u of BAD) { const r = K.check(K.parse(FORM(u)), '2026-11-22T00:00:00+09:00', oaths); if (!r || r instanceof Promise || r.ok !== false) bad.push('受けない先が通る：' + u); }
      var c = K.comment(K.check(K.parse(FORM(GOOD[0])), '2026-11-22T00:00:00+09:00', oaths));
    } catch (e) { bad.push('確かめるあいだに外へ要求を出す：' + e.message); }
    global.fetch = real;
    if (asked) bad.push('確かめるあいだに外へ要求を出す（' + asked + ' 回）');
    if (!K.CLOSED || JSON.stringify(K.CLOSED.hosts) !== '["localhost"]' || JSON.stringify(K.CLOSED.suffixes) !== JSON.stringify(SUFFIXES) || !K.CLOSED.ip || !K.CLOSED.singleLabel || !K.CLOSED.userinfo) bad.push('受けない先の一覧');
    c = c || '';
    if (!c.includes('この確認は、訂正へのリンクを開きません。') || !c.includes('開いていない。リンク先は運営者が読む')) bad.push('コメントがリンクを開かないことを書かない');
    /* main は、停止を見たあと、要求を出さずに確かめる。 */
    if (!/const result = check\(form, opened\);/.test(src)) bad.push('main が開かずに確かめていない');
    need(WF, ['# 訂正へのリンクは開かない。外へ出す要求は GitHub の API だけである。']);
    /* 前の文は、どこにも残らない（王の正誤表と、それから作る頁は除く）。 */
    for (const f of Object.keys(x).filter((k) => k.startsWith('scan:'))) for (const o of OLD) if (x[f].includes(o)) bad.push(f.slice(5) + ' に前の文が残る：' + o);
    /* 規程の文（日本語と英語）。受けない先は、コードの一覧と同じ名を同じ順で挙げる。 */
    const sj = '.localhost・.local・.internal・.home.arpa・.test・.example・.invalid・.onion で終わる名', se = 'names ending in .localhost, .local, .internal, .home.arpa, .test, .example, .invalid or .onion';
    if (sj !== SUFFIXES.join('・') + ' で終わる名' || se !== 'names ending in ' + SUFFIXES.slice(0, -1).join(', ') + ' or ' + SUFFIXES.slice(-1)[0]) bad.push('検査の中の一覧の文');
    need('policies/knighting.md', ['自動の確認は、訂正へのリンクを開きません。リンク先を開いて読むのは運営者です。', '受けない先は、localhost、' + sj + '、数で書いた先、点を含まない名、名や合言葉を含む URL です。']);
    need('policies/knighting.en.md', ['The automatic check does not open the link to the correction. The operator is the one who opens and reads it.', 'The refused destinations are localhost; ' + se + '; addresses written as numbers; names without a dot; and URLs that contain a user name or password.']);
    need('policies/privacy.md', ['自動の確認は、訂正へのリンクを開きません。リンク先へは何も要求せず、リンク先の中身はどこにも残しません。', 'リンク先を開いて読むのは運営者です（[叙任の規程](./knighting.md)「運営者が確かめること」）。']);
    need('policies/privacy.en.md', ['The automatic check does not open the link to the correction. It sends no request to the linked site, and keeps nothing of what is there.']);
    need('INSTITUTIONS.md', ['2026-11-13 から、自動の確認はリンクを開かず、https の URL で受けない先を指さないことだけを見る（王の正誤表 30）']);
    need('INSTITUTIONS.en.md', ['From 2026-11-13, the automatic check does not open the link']);
    for (const p of ['knighting', 'privacy']) {
      const dj = (/^最終更新：(\d{4}-\d{2}-\d{2})。$/m.exec(x['policies/' + p + '.md']) || [])[1], de = (/^Last updated: (\d{4}-\d{2}-\d{2})\.$/m.exec(x['policies/' + p + '.en.md']) || [])[1];
      if (!(dj && dj >= '2026-11-13' && dj === de)) bad.push(p + '：最終更新');
    }
    /* 王の正誤表 30：前の文を残し、範囲の分類で、Claude が決めたことと理由が三つある（日本語と英語）。年表に行がある。 */
    const row = (t, n) => t.split('\n').find((l) => l.startsWith('| ' + n + ' | ')) || '';
    const e30 = row(x['ERRATA.md'], 30), e30en = row(x['ERRATA.en.md'], 30);
    if (!e30.includes('訂正へのリンクを一度開きます。リンクについては、開けるかどうかを示す応答の状態だけを見ます。') || !e30.includes('訂正へのリンクが開けるかどうかを確かめ、結果を issue にコメントします。') || !e30.includes('誤りではなく、範囲を改めた。')
      || !e30.includes(sj) || (e30.match(/2026-11-12 に Claude が決めました。/g) || []).length !== 3 || !e30.split('2026-11-12 に Claude が決めました。').slice(1).every((z) => /^[^|]*?ためです。/.test(z)) || !/\| 範囲 \| Insula Finis XIII \|$/.test(e30)) bad.push('王の正誤表 30');
    if (!e30en.includes('opens the link to the correction once.') || !e30en.includes('Not a mistake; the scope was changed.') || !e30en.includes(se) || (e30en.match(/Claude decided this on 2026-11-12/g) || []).length !== 3 || !/\| Scope \| Insula Finis XIII \|$/.test(e30en)) bad.push('英語の王の正誤表 30');
    need('README.md', ['| 2026-11-13（日本時間） | 叙任の願い出の自動の確認が、訂正へのリンクを開かないように改める。', '| The automatic check of applications for knighting no longer opens the link to the correction.']);
    /* 点検の記録の節：表の形、件数、受けない先の一覧、弁護士の文、決めた者と理由。 */
    const a = x[AUD], i = a.indexOf('\n## 2026-11-12 の続き：三度目の見落とし\n'), j = i < 0 ? -1 : a.indexOf('\n## ', i + 5);
    const sec = i < 0 ? '' : a.slice(i, j < 0 ? undefined : j);
    const t0 = sec.indexOf('\n| 箇所 | 法令と条 | 要件 | 事実 | 判定 | 対応 |\n| --- | --- | --- | --- | --- | --- |\n');
    const rows = t0 < 0 ? [] : sec.slice(t0 + 1).split('\n\n')[0].split('\n').slice(2).map((l) => l.replace(/^\| | \|$/g, '').split(' | '));
    if (rows.length < 6 || !rows.every((y) => y.length === 6 && KINDS68.includes(y[4]))) bad.push('記録の表の形');
    const said = (k) => Number((new RegExp(k + ' (\\d+) 件').exec(sec) || [0, 0])[1]);
    if (!KINDS68.every((k) => said(k) === rows.filter((y) => y[4] === k).length) || Number((/合わせて (\d+) 件です。/.exec(sec) || [])[1]) !== rows.length) bad.push('記録の表の件数');
    if (!rows.some((y) => y[0].startsWith('受付の自動の確認') && y[4] === '漏れ')) bad.push('リンクを開いていたことを漏れとして書いていない');
    const listed = (/\n- `\.localhost`・(.+?) で終わる名の先\n/.exec(sec) || [])[0] || '';
    if (listed.replace(/`/g, '').trim().replace(/^- /, '') !== SUFFIXES.join('・') + ' で終わる名の先' || !sec.includes('\n- 名が `localhost` の先\n') || !sec.includes('\n- 数で書いた先（IPv4 と IPv6）\n') || !sec.includes('\n- 点を含まない名の先\n') || !sec.includes('\n- 名や合言葉を含む URL\n')) bad.push('記録の受けない先の一覧がコードと違う');
    if (!sec.includes('この節も、弁護士の確認は受けていません。') || (sec.match(/2026-11-12 に Claude が決めました。/g) || []).length !== 3 || !sec.split('2026-11-12 に Claude が決めました。').slice(1).every((z) => /ためです。/.test(z.split('\n\n')[0]))) bad.push('記録に、弁護士の文か決めた者と理由がない');
    return bad;
  }
  const real = Object.fromEntries(files.map((f) => [f, read(f)]).concat(scanned.map((f) => ['scan:' + f, read(f)])));
  const bad = verdict(real);
  ok('叙任の願い出の自動の確認は訂正へのリンクを開かず（要求の先は GitHub の API だけ）、https の URL で受けない先を指さないことだけを見て（受ける ' + GOOD.length + ' 件・受けない ' + BAD.length + ' 件）、前の文は ' + scanned.length + ' のファイルに残らず、叙任の規程・個人情報の取り扱い・国の仕組み・王の正誤表 30・年表・点検の記録がそろう（日本語と英語）', bad.length === 0, bad.join(' / '));
  const mut = (f, a, b) => Object.assign({}, real, { [f]: real[f].replace(a, b) });
  const STATUS = "async function status(url) { const r = await fetch(url, { method: 'HEAD' }); return r.status; }\n";
  const breaks = [
    ['リンクを開く関数を戻す', mut(CODE, '\nasync function github(', '\n' + STATUS + 'async function github(')],
    ['リンクを開く関数を書き出す', mut(CODE, 'module.exports = { ', 'module.exports = { status: async () => 200, ')],
    ['main で開いた結果を渡す', mut(CODE, 'const result = check(form, opened);', "const result = check(form, opened); await fetch((form['訂正への公開のリンク'] || '').trim());")],
    ['http の読み込みで外へ出る', mut(CODE, "const fs = require('fs');", "const fs = require('fs');\nconst https = require('https');")],
    ['確かめる関数の中で開く', mut(CODE, '  const problem = linkProblem(link);', "  try { fetch(link); } catch (e) {}\n  const problem = linkProblem(link);")],
    ['受けない先の一覧から .local を外す', mut(CODE, "'.localhost', '.local', '.internal'", "'.localhost', '.internal'")],
    ['数で書いた先を受ける', mut(CODE, '  ip: true, ', '  ip: false, ')],
    ['点を含まない名を受ける', mut(CODE, '  singleLabel: true, ', '  singleLabel: false, ')],
    ['名や合言葉を含む URL を受ける', mut(CODE, '  userinfo: true, ', '  userinfo: false, ')],
    ['http を受ける', Object.assign({}, real, { [CODE]: real[CODE].replace("  if (u.protocol !== 'https:') return 'https で始まる URL ではない';\n", '').replace("if (!/^https:\\/\\/[^\\s]+$/.test(link))", "if (!/^https?:\\/\\/[^\\s]+$/.test(link))") })],
    ['コメントからリンクを開かないことを外す', mut(CODE, 'この確認は、訂正へのリンクを開きません。', '')],
    ['ワークフローの注釈を外す', mut(WF, '# 訂正へのリンクは開かない。外へ出す要求は GitHub の API だけである。\n', '')],
    ['個人情報の取り扱いに前の文を戻す', mut('scan:policies/privacy.md', '自動の確認は、訂正へのリンクを開きません。', '訂正へのリンクを一度開きます。')],
    ['英語の叙任の規程に前の文を戻す', mut('scan:policies/knighting.en.md', 'The automatic check does not open', 'It checks whether the link to the correction opens. The automatic check does not open')],
    ['生成した頁に前の文が残る', mut('scan:site/policies/privacy.html', '<h2', '開けるかどうかを示す応答の状態<h2')],
    ['叙任の規程の一覧から .onion を外す', mut('policies/knighting.md', '・.invalid・.onion で終わる名', '・.invalid で終わる名')],
    ['英語の叙任の規程から開かないことを外す', mut('policies/knighting.en.md', 'The automatic check does not open the link to the correction. ', '')],
    ['英語の個人情報の取り扱いから要求しないことを外す', mut('policies/privacy.en.md', 'It sends no request to the linked site, ', '')],
    ['国の仕組みの追記を外す', mut('INSTITUTIONS.md', '。2026-11-13 から、自動の確認はリンクを開かず、https の URL で受けない先を指さないことだけを見る（王の正誤表 30）', '')],
    ['英語の規程の最終更新をずらす', mut('policies/privacy.en.md', 'Last updated: 2026-11-13.', 'Last updated: 2026-11-11.')],
    ['王の正誤表 30 を事実の分類にする', mut('ERRATA.md', '| 範囲 | Insula Finis XIII |', '| 事実 | Insula Facti VII |')],
    ['王の正誤表 30 から理由を一つ外す', mut('ERRATA.md', '規約を読めない先へ、機械で要求を出さないためです。', '規約を読めない先へ、機械で要求を出さない。')],
    ['英語の王の正誤表 30 から前の文を外す', mut('ERRATA.en.md', 'opens the link to the correction once.', 'checks the link.')],
    ['年表の行を外す', mut('README.md', '| 2026-11-13（日本時間） | 叙任の願い出の自動の確認が、訂正へのリンクを開かないように改める。', '| 2026-11-13（日本時間） | 改める。')],
    ['記録の判定の数を変える', mut(AUD, '漏れ 3 件、問題なし 3 件', '漏れ 2 件、問題なし 3 件')],
    ['記録の一覧から .test を外す', mut(AUD, '・`.test`・', '・')],
    ['記録から漏れの行を問題なしにする', mut(AUD, '前もって読めない | 漏れ |', '前もって読めない | 問題なし |')],
    ['記録から決めた理由を外す', mut(AUD, '運営者が開く前に分けるためです。', '運営者が開く前に分けます。')],
    ['記録から弁護士の文を外す', mut(AUD, '\n\nこの節も、弁護士の確認は受けていません。\n\n## 2026-11-12 の続き：五度目の見落とし', '\n\n## 2026-11-12 の続き：五度目の見落とし')],
  ];
  const caught = breaks.filter(([, y]) => verdict(y).length > 0).map(([k]) => k);
  ok('壊して確かめる：開く関数・main で開く・別の道で外へ出る・確かめる中で開く・受けない先の一覧・数の先・点のない名・合言葉・http・コメント・注釈・前の文を戻す・生成した頁・規程・個人情報・国の仕組み・最終更新・正誤表・年表・判定の数・記録の一覧・理由・弁護士の文のどれでも落ちる（' + caught.length + ' / ' + breaks.length + '）', caught.length === breaks.length, breaks.filter(([k]) => !caught.includes(k)).map(([k]) => k).join(' / '));
}

console.log('\n69. 利用規約の合意管轄は、様式で同意した人との間の、規約とその人自身の願い出・名簿・辞退に基づく訴えに限り、専属的でない（2026-11-12）');
{
  /* 2026-11-12 の五度目の読み直しで、利用規約の合意管轄が、示談で解決しない紛争のすべてを、人も訴えも限らずに
   * 宇都宮の二つの裁判所の専属としていたと分かった。民事訴訟法第11条第2項は、一定の法律関係に基づく訴えに関し、
   * 書面でした合意にだけ効力を認める。合意は様式で同意した人との間にだけ置き、対象の訴えを限り、専属的でないとする。
   * それ以外は法令の定める裁判所。運営者の訴える先を限り、宇都宮での訴えに管轄を争わない（誰の道も狭めない）。
   * 裁判所は宇都宮地方裁判所・宇都宮簡易裁判所のまま（利用者が決めた）。前の文は、王の正誤表と生成した正誤の頁、
   * 点検の記録のほかに残らない。記録の条文は取り寄せた文と同じ。確かめる関数に壊した入力を渡し、落ちることも確かめる。 */
  const AUD = 'docs/legal-audit-2026-11-12.md', SEC = '\n## 2026-11-12 の続き：五度目の見落とし\n';
  const T69 = JSON.parse(read('verification/statutes-texts.json'));
  const P2 = '２ 前項の合意は、一定の法律関係に基づく訴えに関し、かつ、書面でしなければ、その効力を生じない。';
  const files = ['policies/terms.md', 'policies/terms.en.md', 'policies/legality.md', 'policies/legality.en.md', 'ERRATA.md', 'ERRATA.en.md', 'README.md', '.github/ISSUE_TEMPLATE/knighting.yml', AUD];
  const scanned = [...fs.readdirSync(ROOT).filter((f) => f.endsWith('.md') && !/^(ERRATA(\.en)?|CLAUDE)\.md$/.test(f)),
    ...fs.readdirSync(path.join(ROOT, 'policies')).map((f) => 'policies/' + f),
    ...fs.readdirSync(path.join(ROOT, '.github', 'ISSUE_TEMPLATE')).map((f) => '.github/ISSUE_TEMPLATE/' + f),
    ...fs.readdirSync(path.join(ROOT, 'site', 'policies')).filter((f) => f.endsWith('.html')).map((f) => 'site/policies/' + f)];
  const OLD = ['専属的合意管轄', '第一審の専属的', '合意で定めた専属管轄', '管轄の合意は効力を生じないことがある', 'exclusive agreed court', 'An exclusive court chosen by agreement', 'so the agreement on courts may have no effect'];
  const KINDS69 = ['誤り', '根拠不足', '漏れ', '表現', '問題なし'];
  const JA = {
    scope: '裁判所の合意は、叙任の願い出の様式で同意した人との間にだけ置きます（「準拠法と紛争」）。',
    agree: '示談で解決しない紛争のうち、この規約に基づく訴えと、その人自身の叙任の願い出・名簿への記載・辞退に基づく訴えは、叙任の願い出の様式でこの規約に同意した人との間では、訴額に応じて、宇都宮地方裁判所または宇都宮簡易裁判所を、第一審の合意管轄裁判所とします。',
    nonex: 'この合意は専属的なものではありません。',
    other: 'それ以外の紛争と、様式で同意していない人との間の紛争は、法令の定める裁判所が管轄します。',
    op: '運営者がこの規約の及ぶ人に訴えを起こすときは、宇都宮地方裁判所・宇都宮簡易裁判所か、訴える相手の普通裁判籍の所在地を管轄する裁判所にだけ起こします。',
    nocontest: '相手方が宇都宮地方裁判所または宇都宮簡易裁判所に訴えを起こしたときは、運営者は、どの紛争でも管轄を争いません。',
    keep: 'これは、消費者や日本国外の人が、法令によって別の裁判所で訴える権利を奪うものではありません。',
  };
  const EN = {
    scope: 'The agreement on courts is made only with those who agreed in the application form for knighting ("Governing law and disputes").',
    agree: "A dispute not settled by agreement goes, according to the amount in dispute, to the Utsunomiya District Court or the Utsunomiya Summary Court, as the court of first instance by agreement, for a person who has agreed to these terms in the application form for knighting, and only for suits based on these terms or on that person's own application for knighting, listing on the roll of knights or withdrawal.",
    nonex: 'This agreement is not exclusive.',
    other: 'Any other dispute, and any dispute with a person who has not agreed in the form, goes to the court that the law sets.',
    op: "When the operator brings a suit against a person these terms cover, the operator brings it only in the Utsunomiya District Court or the Utsunomiya Summary Court, or in the court with jurisdiction over the place of that person's general forum.",
    nocontest: 'When the other party brings a suit in the Utsunomiya District Court or the Utsunomiya Summary Court, the operator does not contest jurisdiction, whatever the dispute.',
    keep: 'This does not take away the right of a consumer, or of a person outside Japan, to sue in another court where the law allows it.',
  };
  const section = (txt, head) => { const i = txt.indexOf('\n## ' + head + '\n'); if (i < 0) return ''; const j = txt.indexOf('\n## ', i + 5); return txt.slice(i, j < 0 ? undefined : j); };
  function verdict(x) {
    const bad = [];
    /* 利用規約：合意の文は、人・訴え・専属でないこと・それ以外・運営者の訴える先・争わないことの順に、一続きで置く。 */
    const gj = section(x['policies/terms.md'], '準拠法と紛争'), ge = section(x['policies/terms.en.md'], 'Governing law and disputes');
    if (!gj.includes('\n' + [JA.agree, JA.nonex, JA.other, JA.op, JA.nocontest, JA.keep].join('\n') + '\n')) bad.push('利用規約の合意管轄の文');
    if (!ge.includes('\n' + [EN.agree, EN.nonex, EN.other, EN.op, EN.nocontest, EN.keep].join('\n') + '\n')) bad.push('英語の利用規約の合意管轄の文');
    if (/専属的(?!なものではありません)/.test(gj) || /\bexclusive\b(?!\.)/.test(ge.replace(EN.nonex, ''))) bad.push('利用規約に専属の文が残る');
    if (!section(x['policies/terms.md'], 'この規約が及ぶ人').includes('\n' + JA.scope + '\n') || !section(x['policies/terms.en.md'], 'Who these terms cover').includes('\n' + EN.scope + '\n')) bad.push('この規約が及ぶ人に、裁判所の合意の人の限りがない');
    /* 裁判所は利用者が決めた宇都宮の二つのまま。 */
    if ((gj.match(/宇都宮地方裁判所/g) || []).length < 3 || (gj.match(/宇都宮簡易裁判所/g) || []).length < 3 || /(?:東京|大阪|運営者の住所地)[^。]*裁判所/.test(gj)) bad.push('合意の裁判所が宇都宮の二つでない');
    /* 前の文は、どこにも残らない（王の正誤表・それから作る頁・点検の記録は除く）。 */
    for (const f of Object.keys(x).filter((k) => k.startsWith('scan:'))) for (const o of OLD) if (x[f].includes(o)) bad.push(f.slice(5) + ' に前の文が残る：' + o);
    /* 適法性の説明：効き方は改めた規約に合い、第20条第1項の文はない。 */
    const kj = (/\n- \*\*効き方\*\*：([^\n]*)\n/.exec(x['policies/legality.md']) || [])[1] || '', ke = (/\n- \*\*How it works\*\*: ([^\n]*)\n/.exec(x['policies/legality.en.md']) || [])[1] || '';
    if (!kj.startsWith('合意は、様式で同意した人との間で、規約と、その人自身の願い出・名簿への記載・辞退に基づく訴えにだけ置き、専属的ではない。') || !kj.includes('読むだけの人とは書面の合意がなく、ほかの紛争とあわせて、法令の定める裁判所が管轄する。') || !kj.includes('運営者から訴えるときは、宇都宮の裁判所か相手の普通裁判籍の地に限る。')) bad.push('適法性の説明の効き方');
    if (!ke.startsWith('the agreement is made only with those who agreed in the form, only for suits based on the Terms or on their own application, listing on the roll or withdrawal, and is not exclusive.') || !ke.includes('There is no written agreement with those who only read') || !ke.includes('The operator sues only in the Utsunomiya courts')) bad.push('英語の適法性の説明の効き方');
    const cj = section(x['policies/legality.md'], '管轄の合意の効き方'), ce = section(x['policies/legality.en.md'], 'How the agreement on courts works');
    if (/第20条/.test(cj) || /Article 20/.test(ce) || /専属/.test(cj.replace('専属的ではない', '')) || /\bexclusive\b/.test(ce.replace('is not exclusive', ''))) bad.push('適法性の説明に専属の前提が残る');
    /* 様式の同意の印は、規程の所在を指すだけで、合意管轄の文を写さない。 */
    if (/専属|裁判所|court/.test(x['.github/ISSUE_TEMPLATE/knighting.yml'])) bad.push('様式が合意管轄の文を写す');
    for (const p of ['terms', 'legality']) {
      const dj = (/^最終更新：(\d{4}-\d{2}-\d{2})。$/m.exec(x['policies/' + p + '.md']) || [])[1], de = (/^Last updated: (\d{4}-\d{2}-\d{2})\.$/m.exec(x['policies/' + p + '.en.md']) || [])[1];
      if (!(dj && dj >= '2026-11-13' && dj === de)) bad.push(p + '：最終更新');
    }
    /* 王の正誤表 31：前の文を残し、法の分類で、Claude が決めたことと理由が三つある（日本語と英語）。年表に行がある。 */
    const row = (t, n) => t.split('\n').find((l) => l.startsWith('| ' + n + ' | ')) || '';
    const e31 = row(x['ERRATA.md'], 31), e31en = row(x['ERRATA.en.md'], 31);
    if (!e31.includes('示談で解決しない紛争は、訴額に応じて、宇都宮地方裁判所または宇都宮簡易裁判所を、第一審の専属的合意管轄裁判所とします。') || !e31.includes('合意で定めた専属管轄は、移送の制限の外にある（民事訴訟法第20条第1項）。') || !e31.includes('民事訴訟法第11条第2項')
      || (e31.match(/2026-11-12 に Claude が決めました。/g) || []).length !== 3 || !e31.split('2026-11-12 に Claude が決めました。').slice(1).every((z) => /^[^|]*?ためです。/.test(z)) || !e31.includes('読む人や騎士に不利になる変更ではない。') || !/\| 法 \| Insula Legis VIII \|$/.test(e31)) bad.push('王の正誤表 31');
    if (!e31en.includes('as the exclusive agreed court of first instance.') || !e31en.includes('Article 11(2)') || (e31en.match(/Claude decided this on 2026-11-12/g) || []).length !== 3 || !e31en.includes('This is not a change to the disadvantage of readers or knights.') || !/\| Law \| Insula Legis VIII \|$/.test(e31en)) bad.push('英語の王の正誤表 31');
    if (!x['README.md'].includes('| 2026-11-13（日本時間） | 利用規約の合意管轄を、専属的でないものに改める。') || !x['README.md'].includes('| The agreed court in the Terms of Use is no longer exclusive.')) bad.push('年表の行');
    /* 点検の記録の節：第11条第2項と引いた条文が取り寄せた文と同じ、表の形、件数、前の行が誤りだったこと、弁護士の文、決めた者と理由。 */
    const a = x[AUD], i = a.indexOf(SEC), j = i < 0 ? -1 : a.indexOf('\n## ', i + 5);
    const sec = i < 0 ? '' : a.slice(i, j < 0 ? undefined : j);
    if (!T69['民事訴訟法 第11条'].includes(P2) || !sec.includes('民事訴訟法第11条第2項は、「' + P2 + '」と定めています。')) bad.push('記録の第11条第2項の文が取り寄せた文と違う');
    for (const k of ['民事訴訟法 第11条', '民事訴訟法 第4条']) if (!sec.includes('<!-- 条文 ' + k + ' -->\n> ' + T69[k] + '\n')) bad.push('記録の条文が取り寄せた文と違う：' + k);
    for (const q of [...sec.matchAll(/第[45]条(?:第1項)?の「([^」]+)」/g)].map((m) => m[1])) if (!T69['民事訴訟法 第4条'].includes(q) && !T69['民事訴訟法 第5条'].includes(q)) bad.push('記録の引用が取り寄せた文にない：' + q);
    const t0 = sec.indexOf('\n| 箇所 | 法令と条 | 要件 | 事実 | 判定 | 対応 |\n| --- | --- | --- | --- | --- | --- |\n');
    const rows = t0 < 0 ? [] : sec.slice(t0 + 1).split('\n\n')[0].split('\n').slice(2).map((l) => l.replace(/^\| | \|$/g, '').split(' | '));
    if (rows.length < 8 || !rows.every((y) => y.length === 6 && KINDS69.includes(y[4]))) bad.push('記録の表の形');
    const said = (k) => Number((new RegExp(k + ' (\\d+) 件').exec(sec) || [0, -1])[1]);
    if (!KINDS69.every((k) => said(k) === rows.filter((y) => y[4] === k).length) || Number((/合わせて (\d+) 件です。/.exec(sec) || [])[1]) !== rows.length) bad.push('記録の表の件数');
    if (!rows.some((y) => y[0] === '利用規約「準拠法と紛争」の合意管轄' && y[4] === '誤り')) bad.push('合意管轄の文を誤りとして書いていない');
    if (!rows.some((y) => y[0].startsWith('判定の表の「適法性の説明「管轄の合意の効き方」」') && y[4] === '誤り') || !rows.some((y) => y[0].startsWith('判定の表の「民事訴訟法第4条、民事訴訟法第5条」') && y[4] === '誤り')) bad.push('頁の要旨だけを見た前の行を誤りと書いていない');
    if (!rows.some((y) => y[0].startsWith('各国の法令の調べの記録') && y[4] !== '問題なし')) bad.push('各国の法令の調べの行を直していない');
    if (!sec.includes('この節も、弁護士の確認は受けていません。') || (sec.match(/2026-11-12 に Claude が決めました。/g) || []).length !== 3 || !sec.split('2026-11-12 に Claude が決めました。').slice(1).every((z) => /ためです。/.test(z.split('\n\n')[0]))) bad.push('記録に、弁護士の文か決めた者と理由がない');
    if (!sec.includes('どの人の道も前より狭めないためです。')) bad.push('記録に、狭める変更でない理由がない');
    return bad;
  }
  const real = Object.fromEntries(files.map((f) => [f, read(f)]).concat(scanned.map((f) => ['scan:' + f, read(f)])));
  const bad = verdict(real);
  ok('利用規約の合意管轄は、様式で同意した人との間の、規約とその人自身の願い出・名簿・辞退に基づく訴えに限り、専属的でなく、それ以外は法令の定める裁判所で、運営者の訴える先を限り、裁判所は宇都宮の二つのまま。前の文は ' + scanned.length + ' のファイルに残らず、適法性の説明・王の正誤表 31・年表・点検の記録（第11条第2項は取り寄せた文のまま）がそろう（日本語と英語）', bad.length === 0, bad.join(' / '));
  const mut = (f, a, b) => Object.assign({}, real, { [f]: real[f].replace(a, b) });
  const breaks = [
    ['規約を専属に戻す', mut('policies/terms.md', 'この合意は専属的なものではありません。', 'この合意は専属的なものとします。')],
    ['規約から人の限りを外す', mut('policies/terms.md', '叙任の願い出の様式でこの規約に同意した人との間では、訴額に応じて', '訴額に応じて')],
    ['規約から訴えの限りを外す', mut('policies/terms.md', '示談で解決しない紛争のうち、この規約に基づく訴えと、その人自身の叙任の願い出・名簿への記載・辞退に基づく訴えは、', '示談で解決しない紛争は、')],
    ['規約から法令の定める裁判所を外す', mut('policies/terms.md', JA.other + '\n', '')],
    ['規約から運営者の訴える先の限りを外す', mut('policies/terms.md', JA.op + '\n', '')],
    ['規約から管轄を争わないことを外す', mut('policies/terms.md', JA.nocontest + '\n', '')],
    ['裁判所を替える', mut('policies/terms.md', '訴額に応じて、宇都宮地方裁判所または宇都宮簡易裁判所を', '訴額に応じて、東京地方裁判所または東京簡易裁判所を')],
    ['規約に前の文を戻す', mut('scan:policies/terms.md', '## 準拠法と紛争', '第一審の専属的合意管轄裁判所とします。\n## 準拠法と紛争')],
    ['及ぶ人の文を外す', mut('policies/terms.md', JA.scope + '\n', '')],
    ['英語の規約を専属に戻す', mut('policies/terms.en.md', EN.nonex, 'This agreement is exclusive.')],
    ['英語の規約から人の限りを外す', mut('policies/terms.en.md', ', for a person who has agreed to these terms in the application form for knighting, and only for suits', ', and only for suits')],
    ['英語の及ぶ人の文を外す', mut('policies/terms.en.md', EN.scope + '\n', '')],
    ['生成した頁に前の文が残る', mut('scan:site/policies/terms.en.html', '<h2', 'as the exclusive agreed court of first instance.<h2')],
    ['適法性の説明に第20条を戻す', mut('policies/legality.md', '（民事訴訟法第17条）。', '（民事訴訟法第17条）。合意で定めた裁判所は、移送の制限の外にある（民事訴訟法第20条第1項）。')],
    ['英語の適法性の説明から読む人の文を外す', mut('policies/legality.en.md', 'There is no written agreement with those who only read; for them, and for other disputes, the court', 'The court')],
    ['様式に合意管轄を写す', mut('.github/ISSUE_TEMPLATE/knighting.yml', '願い出の日の版に同意します', '願い出の日の版と、宇都宮の裁判所の専属に同意します')],
    ['英語の規程の最終更新をずらす', mut('policies/terms.en.md', 'Last updated: 2026-11-13.', 'Last updated: 2026-11-11.')],
    ['王の正誤表 31 から前の文を外す', mut('ERRATA.md', '合意で定めた専属管轄は、移送の制限の外にある（民事訴訟法第20条第1項）。／', '')],
    ['王の正誤表 31 を範囲の分類にする', mut('ERRATA.md', '| 法 | Insula Legis VIII |', '| 範囲 | Insula Finis XIV |')],
    ['王の正誤表 31 から理由を一つ外す', mut('ERRATA.md', '誰の道も前より狭めないためです。', '誰の道も前より狭めない。')],
    ['英語の王の正誤表 31 から不利でない文を外す', mut('ERRATA.en.md', 'This is not a change to the disadvantage of readers or knights. Claude decided this on 2026-11-12, because knights may sue', 'Claude decided this on 2026-11-12, because knights may sue')],
    ['年表の行を外す', mut('README.md', '| 2026-11-13（日本時間） | 利用規約の合意管轄を、専属的でないものに改める。', '| 2026-11-13（日本時間） | 改める。')],
    ['記録の第11条第2項を書き換える', mut(AUD, '一定の法律関係に基づく訴えに関し、かつ、書面でしなければ、その効力を生じない。」と定めています。', '一定の法律関係に基づく訴えに関し、書面でしなければ、その効力を生じない。」と定めています。')],
    ['記録の第4条の引用を書き換える', mut(AUD, '第4条第1項の「訴えは、被告の', '第4条第1項の「訴えは、原告の')],
    ['記録の判定の数を変える', mut(AUD, '誤り 3 件、根拠不足 2 件', '誤り 2 件、根拠不足 2 件')],
    ['記録から誤りの行を問題なしにする', mut(AUD, '様式で同意していない読む人にも言っていた | 誤り |', '様式で同意していない読む人にも言っていた | 問題なし |')],
    ['記録から前の行の誤りを外す', mut(AUD, 'として「問題なし」としていたが、頁の要旨だけを見て、利用規約の文を見ていなかった | 誤り |', 'として「問題なし」としていた | 問題なし |')],
    ['記録から決めた理由を外す', mut(AUD, '合意していない人に合意を言わないためです。', '合意していない人に合意を言わない。')],
    ['記録から弁護士の文を外す', mut(AUD, '\n\nこの節も、弁護士の確認は受けていません。\n\n## 2026-11-12 の続き：六度目の見落とし', '\n\n## 2026-11-12 の続き：六度目の見落とし')],
  ];
  const caught = breaks.filter(([, y]) => verdict(y).length > 0).map(([k]) => k);
  ok('壊して確かめる：専属に戻す・人の限り・訴えの限り・法令の定める裁判所・運営者の訴える先・争わないこと・裁判所を替える・前の文を戻す・及ぶ人の文・英語の規約・生成した頁・第20条・読む人の文・様式・最終更新・正誤表・年表・第11条第2項・第4条・判定の数・誤りの行・前の行・理由・弁護士の文のどれでも落ちる（' + caught.length + ' / ' + breaks.length + '）', caught.length === breaks.length, breaks.filter(([k]) => !caught.includes(k)).map(([k]) => k).join(' / '));
}

console.log('\n70. 頁の日付は日本時間で、公開の日より前にならない（2026-11-13）');
{
  const { execFileSync } = require('child_process');
  const AUD = 'docs/legal-audit-2026-11-12.md', SEC = '\n## 2026-11-12 の続き：六度目の見落とし\n', WF = '.github/workflows/check.yml';
  /* 日付は日本時間で読む（利用規約「変更と終了」）。git の日付も Asia/Tokyo の地方時に直して比べる。 */
  const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', env: Object.assign({}, process.env, { TZ: 'Asia/Tokyo' }), stdio: ['ignore', 'pipe', 'ignore'] });
  const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  let shallow = true;
  try { shallow = git(['rev-parse', '--is-shallow-repository']).trim() !== 'false'; } catch (e) { shallow = true; }
  const day = (args) => { try { return git(args).split('\n').filter(Boolean); } catch (e) { return []; } };
  /* 頁の文を変えた最後の日。前の版と、最終更新の行のほかで違う版のうち、いちばん新しいコミットの日（最終更新の日だけを
   * 改めたコミットは、文を変えたものとしない）。最後のコミットと文が違う頁は、今日（日本時間）に変えたものとする。
   * 版は git cat-file で一度に読む。 */
  const body = (s) => String(s || '').replace(/^(?:最終更新：\d{4}-\d{2}-\d{2}。|Last updated: \d{4}-\d{2}-\d{2}\.)$/gm, '');
  const lastTextDays = (fs_) => {
    const logs = Object.fromEntries(fs_.map((f) => [f, day(['log', '--format=%H %cd', '--date=format-local:%Y-%m-%d', '--', f]).map((l) => l.split(' '))]));
    let buf = Buffer.alloc(0);
    try { buf = execFileSync('git', ['cat-file', '--batch'], { cwd: ROOT, input: fs_.flatMap((f) => logs[f].map(([h]) => h + ':' + f)).join('\n') + '\n', maxBuffer: 1 << 30, stdio: ['pipe', 'pipe', 'ignore'] }); } catch (e) { buf = Buffer.alloc(0); }
    const blobs = [];
    for (let p = 0; p < buf.length;) {
      const nl = buf.indexOf(10, p), m = / blob (\d+)$/.exec(buf.slice(p, nl).toString('utf8'));
      if (!m) { blobs.push(null); p = nl + 1; continue; }
      blobs.push(buf.slice(nl + 1, nl + 1 + Number(m[1])).toString('utf8')); p = nl + 1 + Number(m[1]) + 1;
    }
    const out = {};
    let k = 0;
    for (const f of fs_) {
      const l = logs[f], v = l.map(() => blobs[k++]);
      if (!l.length || body(read(f)) !== body(v[0])) { out[f] = today; continue; }
      const i = v.findIndex((x, j) => j + 1 >= v.length || body(x) !== body(v[j + 1]));
      out[f] = (l[i] || [])[1] || today;
    }
    return out;
  };
  /* 行の文が最初に入った日。まだどのコミットにもない文は、今日に入るものとする。 */
  const firstDay = (f, s) => day(['log', '--reverse', '--format=%cd', '--date=format-local:%Y-%m-%d', '-S', s, '--', f])[0] || today;
  const UPD = /^(?:最終更新：(\d{4}-\d{2}-\d{2})。|Last updated: (\d{4}-\d{2}-\d{2})\.)$/m;
  const pages = walk(ROOT).filter((f) => f.endsWith('.md') && !/^(?:\.git|site|docs|verification|node_modules)\//.test(f) && UPD.test(read(f))).sort();
  const cells = (l) => l.replace(/^\| | \|$/g, '').split(' | ');
  const timeline = (t) => { const i = t.indexOf('\n## 年表\n'); return i < 0 ? [] : t.slice(i, t.indexOf('\n## ', i + 5)).split('\n').filter((l) => /^\| \d{4}-\d{2}-\d{2}/.test(l)).map(cells); };
  const errata = (t) => t.split('\n').filter((l) => /^\| \d+ \| \d{4}-\d{2}-\d{2} \|/.test(l)).map(cells);
  const files = ['README.md', 'ERRATA.md', 'policies/terms.md', 'policies/terms.en.md', AUD, WF].concat(pages.filter((f) => !['policies/terms.md', 'policies/terms.en.md'].includes(f)));
  const real = Object.fromEntries(files.map((f) => [f, read(f)]));
  /* 履歴から読む日は、いまの文について一度だけ読む。壊して確かめるときも、同じ文には同じ日を使う。 */
  const last = lastTextDays(pages);
  const first = {};
  for (const r of timeline(real['README.md'])) first['README.md\n' + r[1]] = firstDay('README.md', r[1]);
  for (const r of errata(real['ERRATA.md'])) first['ERRATA.md\n' + r[3]] = firstDay('ERRATA.md', r[3]);
  const ledgerRaw = JSON.parse(read('verification/gazette-numbers.json'));
  const JST_JA = ['頁の日付と、年表・官報・正誤表・名簿の日付は、日本時間の日付です。', '文を取り寄せた日は、取り寄せの記録に残った協定世界時の日付です。', '建国の日の 2026-11-07 も、協定世界時の日付です。'];
  const JST_EN = ['The dates on the pages, and in the timeline, the gazette, the errata and the roll, are dates in Japan time.', 'The day a text was fetched is the day in UTC that the record of the fetch keeps.', 'The founding day, 2026-11-07, is also a date in UTC.'];
  const KINDS70 = ['誤り', '根拠不足', '漏れ', '表現', '問題なし'];
  const section = (txt, head) => { const i = txt.indexOf('\n## ' + head + '\n'); if (i < 0) return ''; const j = txt.indexOf('\n## ', i + 5); return txt.slice(i, j < 0 ? undefined : j); };
  function verdict(x, h) {
    const bad = [];
    if (h.shallow) bad.push('履歴が浅いか、git が読めない（日付を照らせない）');
    /* 頁の最終更新は、その頁を変えた最後のコミットの日（日本時間）より前にならない。 */
    for (const f of pages) { const m = UPD.exec(x[f] || ''); const d = m && (m[1] || m[2]); if (!d || d < h.last[f]) bad.push(f + '：最終更新 ' + d + ' が、変えた日 ' + h.last[f] + ' より前'); }
    /* 年表と王の正誤表の行の日付は、その文が最初に入ったコミットの日より前にならない。建国の日の行だけは、協定世界時の日付（利用規約）。 */
    for (const r of timeline(x['README.md'])) { const d = r[0].slice(0, 10), w = h.first['README.md\n' + r[1]] || today; if (d < w && d !== B.FOUNDED) bad.push('年表の行 ' + d + ' が、入った日 ' + w + ' より前：' + r[1].slice(0, 20)); }
    for (const r of errata(x['ERRATA.md'])) { const w = h.first['ERRATA.md\n' + r[3]] || today; if (r[1] < w) bad.push('王の正誤表 ' + r[0] + ' の記した日 ' + r[1] + ' が、入った日 ' + w + ' より前'); }
    /* 年表の行が告げる効力の日は、行の日付より前にならない（日本語と英語）。 */
    for (const r of timeline(x['README.md'])) {
      const d = r[0].slice(0, 10);
      const eff = [...r[1].matchAll(/(\d{4}-\d{2}-\d{2})(?: 0 時)?(?:（日本時間）)? ?から/g)].map((m) => m[1]).concat([...(r[2] || '').matchAll(/\b[Ff]rom (?:00:00 on )?(\d{4}-\d{2}-\d{2})/g)].map((m) => m[1]));
      for (const e of eff) if (e < d) bad.push('年表の行 ' + d + ' が告げる効力の日 ' + e + ' が、行の日付より前');
    }
    /* 利用規約は、頁の日付が日本時間で、取り寄せた日と建国の日が協定世界時だと書く（日本語と英語）。 */
    const cj = section(x['policies/terms.md'], '変更と終了'), ce = section(x['policies/terms.en.md'], 'Changes and ending');
    if (!JST_JA.every((s) => cj.includes('\n' + s + '\n'))) bad.push('利用規約に、日付の時刻の文がない');
    if (!JST_EN.every((s) => ce.includes('\n' + s + '\n'))) bad.push('英語の利用規約に、日付の時刻の文がない');
    /* 日付を改めた行は、号の台帳で改めた日付の鍵を持ち、古い鍵を持たない。 */
    for (const k of Object.keys(B.REDATED)) if (Object.prototype.hasOwnProperty.call(h.ledger, k) || !Object.prototype.hasOwnProperty.call(h.ledger, B.redatedKey(k)) || !B.gazetteItems().some((it) => it.key === B.redatedKey(k))) bad.push('号の台帳の鍵：' + k);
    /* 検査の workflow は、履歴をすべて取る。 */
    if (!/actions\/checkout@[0-9a-f]{40} # v[\d.]+\n {8}# [^\n]+\n {8}with:\n {10}fetch-depth: 0\n {6}- uses: actions\/setup-node@[0-9a-f]{40} # v[\d.]+\n {8}with:\n {10}node-version: 22\n {6}- run: node verification\/check\.js\n/.test(x[WF])) bad.push('検査の workflow が履歴をすべて取らない');
    /* 点検の記録の節：表の形、件数、決めた者と理由、弁護士の文。 */
    const a = x[AUD], i = a.indexOf(SEC), j = i < 0 ? -1 : a.indexOf('\n## ', i + 5);
    const sec = i < 0 ? '' : a.slice(i, j < 0 ? undefined : j);
    const t0 = sec.indexOf('\n| 箇所 | 法令と条 | 要件 | 事実 | 判定 | 対応 |\n| --- | --- | --- | --- | --- | --- |\n');
    const rows = t0 < 0 ? [] : sec.slice(t0 + 1).split('\n\n')[0].split('\n').slice(2).map(cells);
    if (rows.length < 10 || !rows.every((y) => y.length === 6 && KINDS70.includes(y[4]))) bad.push('記録の表の形');
    const said = (k) => Number((new RegExp(k + ' (\\d+) 件').exec(sec) || [0, -1])[1]);
    if (!KINDS70.every((k) => said(k) === rows.filter((y) => y[4] === k).length) || Number((/合わせて (\d+) 件です。/.exec(sec) || [])[1]) !== rows.length) bad.push('記録の表の件数');
    const decided = sec.split('2026-11-13 に Claude が決めました。').slice(1);
    if (decided.length !== 6 || !decided.every((z) => /ためです。/.test(z.split('\n\n')[0]))) bad.push('記録に、決めた者と理由がない');
    if (!sec.includes('この節も、弁護士の確認は受けていません。')) bad.push('記録に弁護士の文がない');
    return bad;
  }
  const facts = { shallow, last, first, ledger: ledgerRaw };
  const bad = verdict(real, facts);
  ok('頁の最終更新（' + pages.length + ' 頁）は文を変えた最後の日より、年表と王の正誤表の行の日付は文が入った日より前にならず（日本時間）、年表の告げる効力の日は行の日付より前にならない。利用規約が日付の時刻を書き、号の台帳は改めた日付の鍵を持ち、検査は履歴をすべて読む。点検の記録がそろう',
    bad.length === 0, bad.join(' / '));
  const mut = (f, a, b) => Object.assign({}, real, { [f]: real[f].replace(a, b) });
  const breaks = [
    ['規程の最終更新を前の日に戻す', mut('policies/privacy.md', '最終更新：2026-11-13。', '最終更新：2026-11-12。'), facts],
    ['英語の規程の最終更新を前の日に戻す', mut('policies/terms.en.md', 'Last updated: 2026-11-13.', 'Last updated: 2026-11-12.'), facts],
    ['文を変えていない頁の最終更新を、文を変えた日より前にする', mut('policies/names.md', '最終更新：2026-11-12。', '最終更新：2026-11-11。'), facts],
    ['年表の行を作業の時計の日付に戻す', mut('README.md', '| 2026-11-13（日本時間） | 利用規約の合意管轄を、', '| 2026-11-12（日本時間） | 利用規約の合意管轄を、'), facts],
    ['年表の 2026-11-11 の行を前の日に戻す', mut('README.md', '| 2026-11-11（日本時間） | 建国の物語・', '| 2026-11-10（日本時間） | 建国の物語・'), facts],
    ['王の正誤表 30 の記した日を前の日に戻す', mut('ERRATA.md', '| 30 | 2026-11-13 |', '| 30 | 2026-11-12 |'), facts],
    ['新しい正誤を前の日付で記す', mut('ERRATA.md', '| 32 | 2026-11-13 |', '| 32 | 2026-11-12 |'), facts],
    ['年表の行が、行の日付より前の効力の日を告げる', mut('README.md', '願い出の様式に、2026-11-22 からイタリアの国籍を持つ人の', '願い出の様式に、2026-11-11 からイタリアの国籍を持つ人の'), facts],
    ['英語の年表の行が、行の日付より前の効力の日を告げる', mut('README.md', 'state that, from 2026-11-22, applications from people who hold Italian', 'state that, from 2026-11-11, applications from people who hold Italian'), facts],
    ['利用規約から日本時間の文を外す', mut('policies/terms.md', JST_JA[0] + '\n', ''), facts],
    ['利用規約から建国の日の文を外す', mut('policies/terms.md', JST_JA[2] + '\n', ''), facts],
    ['英語の利用規約から取り寄せた日の文を外す', mut('policies/terms.en.md', JST_EN[1] + '\n', ''), facts],
    ['履歴が浅い', real, Object.assign({}, facts, { shallow: true })],
    ['頁を今日変えたのに最終更新を変えない', real, Object.assign({}, facts, { last: Object.assign({}, last, { 'policies/names.md': '2026-12-01' }) })],
    ['号の台帳に古い鍵が残る', real, Object.assign({}, facts, { ledger: Object.assign({ 'T:2026-11-12:4392d7625560': 55 }, ledgerRaw) })],
    ['検査の workflow から fetch-depth を外す', mut(WF, '          fetch-depth: 0\n', ''), facts],
    ['記録の判定の数を変える', mut(AUD, '誤り 5 件、根拠不足 2 件、漏れ 2 件', '誤り 4 件、根拠不足 2 件、漏れ 2 件'), facts],
    ['記録から決めた理由を外す', mut(AUD, '一度振った号を動かさないためです。', '一度振った号を動かさない。'), facts],
    ['記録から弁護士の文を外す', mut(AUD, '\n\nこの節も、弁護士の確認は受けていません。\n\n## 2026-11-12 の続き：七度目の見落とし', '\n\n## 2026-11-12 の続き：七度目の見落とし'), facts],
  ];
  const caught = breaks.filter(([, y, h]) => verdict(y, h).length > 0).map(([k]) => k);
  ok('壊して確かめる：最終更新・英語の最終更新・文を変えていない頁の最終更新・年表の行・2026-11-11 の行・王の正誤表の記した日・新しい正誤・効力の日（日本語と英語）・利用規約の三つの文・浅い履歴・今日変えた頁・号の台帳・fetch-depth・判定の数・理由・弁護士の文のどれでも落ちる（' + caught.length + ' / ' + breaks.length + '）', caught.length === breaks.length, breaks.filter(([k]) => !caught.includes(k)).map(([k]) => k).join(' / '));
}

console.log('\n71. 叙任を誘う文は、叙任の規程を挙げる（日本語と英語、生成したファイルも。2026-11-13）');
{
  const AUD = 'docs/legal-audit-2026-11-12.md', SEC = '\n## 2026-11-12 の続き：七度目の見落とし\n';
  /* 王の正誤表とその頁は、改める前の文をそのまま写すので除く（王の正誤表「記し方」）。docs/ と verification/ は配る頁ではない。 */
  const ERR = (f) => /^(?:ERRATA(?:\.en)?\.md|site\/errata(?:\.en)?\.html|site\/errata\/[^/]+|site\/errata\.xml)$/.test(f);
  const srcs = walk(ROOT).filter((f) => (/\.md$/.test(f) || /^\.github\/ISSUE_TEMPLATE\/[^/]+\.yml$/.test(f)) && !/^(?:\.git|site|docs|verification|node_modules)\//.test(f)).sort();
  const gen = walk(path.join(ROOT, 'site')).filter((f) => /\.(?:html|txt|xml|ics)$/.test(f)).map((f) => 'site/' + f).sort();
  const files = srcs.concat(gen).filter((f) => !ERR(f));
  const real = Object.fromEntries(files.concat(['policies/knighting.md', 'policies/knighting.en.md', 'INSTITUTIONS.md', 'INSTITUTIONS.en.md', 'README.md', 'founding.en.md', 'ERRATA.md', 'ERRATA.en.md', AUD]).map((f) => [f, read(f)]));
  const ent = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  const text = (f, t) => {
    let x = t;
    /* llms-full.txt は頁ごとの塊に分け、王の正誤表の塊を除く。 */
    if (f === 'site/llms-full.txt') x = x.split(/\n(?=Source: )/).filter((b) => !/^Source: \S+\/errata(?:\.en)?\.html\s*$/m.test(b.split('\n')[0])).join('\n');
    if (/\.(?:html|xml)$/.test(f)) x = x.replace(/<(?:script|style)[\s\S]*?<\/(?:script|style)>/gi, ' ').replace(/<br\s*\/?>|<\/(?:p|li|h[1-6]|td|th|tr|div|blockquote|summary|title|entry)>/gi, '\n').replace(/<[^>]+>/g, '');
    x = x.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : (ent[e.toLowerCase()] || m));
    return x.replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1');
  };
  /* 誘う文：公に正した人・誰でもが、名簿に載る・騎士団に加わる・騎士になることができる、と書く文。 */
  const JA_WHO = /誰でも|だれでも|誰もが|公に(?:正|訂正)した(?:人|者)(?:は|なら|であれば|が)/;
  const JA_CAN = /(?:名簿に載る|騎士団[^。\n]{0,24}に加わる|騎士になる|騎士に叙され|叙任を受ける|叙任される)ことができ|騎士になれ|騎士団に加われ|名簿に載れ/;
  const EN_WHO = /\b(?:anyone|anybody|everyone|everybody|any person|whoever|who (?:has|have) publicly corrected)\b/i;
  const EN_CAN = /\b(?:join (?:the )?(?:Ordo Erratorum|Order|order of)|be (?:put|added|listed|entered|included) on the roll|be (?:added|entered) to the roll|become (?:a )?knights?|be knighted|be made (?:a )?knights?|apply for knighthood|receive (?:the )?knighthood)\b/i;
  const sentences = (x) => x.split(/\n+/).flatMap((l) => l.split(/(?<=。)|(?<=[.!?]["”)]?)\s+(?=[A-Z"“(])/)).map((z) => z.trim()).filter(Boolean);
  const invites = (z) => (JA_WHO.test(z) && JA_CAN.test(z) && !z.includes('叙任の規程')) || (EN_WHO.test(z) && EN_CAN.test(z) && !/Rules on Knighting/.test(z));
  const RULE_JA = ['王国基本法第六条は、叙任の条件を、自分の誤りを一つ公に訂正したことの一つとしています。\nこの規程の条件は、第六条の条件に加わります。\nこの規程が条件を足すところは、この規程に従います。\n', '第六条の条件を満たしても、この規程の条件を満たさない人は、叙任しません。\n'];
  const RULE_EN = ["Article 6 of the Basic Law of the Kingdom sets one condition for knighting: to have publicly corrected one of one's own errors.\nThe conditions of these rules apply in addition to the condition of Article 6.\nWhere these rules add a condition, these rules prevail.\n", 'A person who meets the condition of Article 6 but not the conditions of these rules is not knighted.\n'];
  const INST_JA = '叙任には、基本法第六条の条件に、[叙任の規程](policies/knighting.md)の条件が加わります。叙任の規程が条件を足すところは、叙任の規程に従います（叙任の規程「基本法第六条との関係」）。';
  const INST_EN = 'Knighting is subject to the conditions of the [Rules on Knighting](policies/knighting.en.md) in addition to the condition of Article 6 of the Basic Law. Where the Rules on Knighting add a condition, the Rules on Knighting prevail';
  const NOTE_JA = '第六条の叙任には、[叙任の規程](policies/knighting.md)の条件も加わります。叙任の規程が条件を足すところは、叙任の規程に従います（叙任の規程「基本法第六条との関係」）。この注は基本法の条ではなく、条の文は改めていません。';
  const NOTE_EN = 'Knighting under Article 6 is also subject to the conditions of the [Rules on Knighting](policies/knighting.en.md). Where the Rules on Knighting add a condition, the Rules on Knighting prevail';
  const ART6 = '**第六条（叙任）**　騎士の叙任は無償とする。金銭・物品・役務と引き換えにしない。叙任の条件は一つ、自分の誤りを一つ、公に訂正したことである。';
  const ART6_EN = "**Article 6 (Knighting)** Knighting is free of charge. It is not given in exchange for money, goods or services. It has one condition: to have publicly corrected one of one's own errors.";
  const OLD = ['自分の誤りを一つ公に正した人は、無償で騎士の名簿に載ることができます。', '自分の誤りを一つ公に正した人は、正誤表騎士団に加わることができます。', '"Anyone who has publicly corrected one of their own mistakes can be put on the roll of knights, free of charge."', '"Anyone who has publicly corrected one of their own mistakes can join the Ordo Erratorum."'];
  const KINDS71 = ['誤り', '根拠不足', '漏れ', '表現', '問題なし'];
  const cells = (l) => l.replace(/^\| | \|$/g, '').split(' | ');
  function verdict(x) {
    const bad = [];
    for (const f of files) for (const z of sentences(text(f, x[f] || ''))) if (invites(z)) bad.push(f + '：' + z.slice(0, 60));
    /* 叙任の規程と国の仕組みは、規程の条件が第六条に加わり、条件を足すところは規程に従うと書く。基本法の後ろの注も。 */
    const kj = x['policies/knighting.md'], ke = x['policies/knighting.en.md'];
    const secJ = kj.slice(kj.indexOf('\n## 基本法第六条との関係\n'), kj.indexOf('\n## 願い出ることができる人\n')), secE = ke.slice(ke.indexOf('\n## Relation to Article 6 of the Basic Law\n'), ke.indexOf('\n## Who may apply\n'));
    if (kj.indexOf('\n## 基本法第六条との関係\n') < 0 || !RULE_JA.every((r) => secJ.includes(r))) bad.push('叙任の規程に、第六条との関係がない');
    if (ke.indexOf('\n## Relation to Article 6 of the Basic Law\n') < 0 || !RULE_EN.every((r) => secE.includes(r))) bad.push('英語の叙任の規程に、第六条との関係がない');
    if (!x['INSTITUTIONS.md'].includes(INST_JA)) bad.push('国の仕組みに、第六条との関係がない');
    if (!x['INSTITUTIONS.en.md'].includes(INST_EN)) bad.push('英語の国の仕組みに、第六条との関係がない');
    const rd = x['README.md'], fe = x['founding.en.md'];
    if (!rd.includes(ART6) || !(rd.indexOf(NOTE_JA) > rd.indexOf('**第十条（改正）**') && rd.indexOf(NOTE_JA) < rd.indexOf('\n## 騎士王の十則\n'))) bad.push('基本法の第六条が変わったか、後ろの注がない');
    if (!fe.includes(ART6_EN) || !(fe.indexOf(NOTE_EN) > fe.indexOf('**Article 10 (Amendment)**') && fe.indexOf(NOTE_EN) < fe.indexOf('\n## The Ten Precepts of the Knight-King\n'))) bad.push('英訳の第六条が変わったか、後ろの注がない');
    /* 王の正誤表 33 に、改める前の文を残す。 */
    const e33 = x['ERRATA.md'].split('\n').find((l) => l.startsWith('| 33 | ')) || '', e33en = x['ERRATA.en.md'].split('\n').find((l) => l.startsWith('| 33 | ')) || '';
    if (!OLD.slice(0, 2).every((o) => cells(e33)[3] && cells(e33)[3].includes(o)) || cells(e33)[6] !== '事実') bad.push('王の正誤表 33 に、改める前の文がない');
    if (!OLD.slice(2).every((o) => cells(e33en)[3] && cells(e33en)[3].includes(o)) || cells(e33en)[6] !== 'Fact') bad.push('英語の王の正誤表 33 に、改める前の文がない');
    /* 年表の行。 */
    if (!/^\| 2026-11-13（日本時間） \| 紹介する人のために・建国の物語・遊びで、叙任の条件を基本法第六条の一つだけのように書いた文を、叙任の規程の条件によると改め/m.test(rd)) bad.push('年表の行がない');
    /* 点検の記録の節。 */
    const a = x[AUD], i = a.indexOf(SEC), j = i < 0 ? -1 : a.indexOf('\n## ', i + 5);
    const sec = i < 0 ? '' : a.slice(i, j < 0 ? undefined : j);
    const t0 = sec.indexOf('\n| 箇所 | 法令と条 | 要件 | 事実 | 判定 | 対応 |\n| --- | --- | --- | --- | --- | --- |\n');
    const rows = t0 < 0 ? [] : sec.slice(t0 + 1).split('\n\n')[0].split('\n').slice(2).map(cells);
    if (rows.length < 10 || !rows.every((y) => y.length === 6 && KINDS71.includes(y[4]))) bad.push('記録の表の形');
    const said = (k) => Number((new RegExp(k + ' (\\d+) 件').exec(sec) || [0, -1])[1]);
    if (!KINDS71.every((k) => said(k) === rows.filter((y) => y[4] === k).length) || Number((/合わせて (\d+) 件です。/.exec(sec) || [])[1]) !== rows.length) bad.push('記録の表の件数');
    const decided = sec.split('2026-11-13 に Claude が決めました。').slice(1);
    if (decided.length !== 6 || !decided.every((z) => /ためです。/.test(z.split('\n\n')[0]))) bad.push('記録に、決めた者と理由がない');
    if (!sec.includes('この節も、弁護士の確認は受けていません。')) bad.push('記録に弁護士の文がない');
    return bad;
  }
  const bad = verdict(real);
  ok('どの頁と生成したファイル（' + files.length + '）も、叙任の規程を挙げずに叙任を誘わない（日本語と英語）。叙任の規程・国の仕組み・基本法の後ろの注が、規程の条件は第六条に加わると書き、第六条の文は変わらない。王の正誤表 33・年表・点検の記録がそろう',
    bad.length === 0, bad.join(' / '));
  const mut = (f, a2, b2) => Object.assign({}, real, { [f]: real[f].replace(a2, b2) });
  const PJ = '自分の誤りを一つ公に正した人は、叙任の規程の条件を満たすときにだけ、無償で騎士の名簿に載ることができます。';
  const PE = 'A person who has publicly corrected one of their own mistakes can be put on the roll of knights, free of charge, only if they meet the conditions of the Rules on Knighting.';
  const breaks = [
    ['紹介の頁の前の文に戻す', mut('PRESS.md', PJ, OLD[0])],
    ['英語の紹介の頁の前の文に戻す', mut('PRESS.en.md', PE, OLD[2].slice(1, -1))],
    ['物語の前の文に戻す', mut('STORY.md', '自分の誤りを一つ公に正した人は、[叙任の規程](policies/knighting.md)の条件を満たせば、[正誤表騎士団](KNIGHTS.md)に加わることができます。', '自分の誤りを一つ公に正した人は、[正誤表騎士団](KNIGHTS.md)に加わることができます。')],
    ['英語の物語の前の文に戻す', mut('STORY.en.md', 'A person who has publicly corrected one of their own mistakes can join the [Ordo Erratorum](KNIGHTS.en.md) if they meet the conditions of the [Rules on Knighting](policies/knighting.en.md).', 'Anyone who has publicly corrected one of their own mistakes can join the [Ordo Erratorum](KNIGHTS.en.md).')],
    ['生成した紹介の頁に前の文を戻す', mut('site/press.html', PJ, OLD[0])],
    ['生成した英語の物語の頁に誘う文を置く', mut('site/story.en.html', '<h2', '<p>Anyone can become a knight of Nusquama.</p><h2')],
    ['llms-full.txt に前の文を戻す', mut('site/llms-full.txt', PJ, OLD[0])],
    ['トップの頁に「誰でも騎士になれます」と書く', mut('README.md', '## 騎士になるには\n\n', '## 騎士になるには\n\n誰でも騎士になれます。\n\n')],
    ['生成したトップの頁に「誰でも」を置く', mut('site/index.html', '<h2', '<p>誰でも、名簿に載ることができます。騎士になる条件は一つです。</p><h2')],
    ['英語の遊びの頁に「Anyone may be knighted」を置く', mut('PLAY.en.md', '## Answers to the questions\n', '## Answers to the questions\n\nAnyone may be knighted for free.\n')],
    ['叙任の規程から第六条との関係を外す', mut('policies/knighting.md', RULE_JA[0], '')],
    ['英語の叙任の規程から「prevail」を外す', mut('policies/knighting.en.md', 'Where these rules add a condition, these rules prevail.\n', '')],
    ['叙任の規程から「叙任しません」を外す', mut('policies/knighting.md', RULE_JA[1], '')],
    ['国の仕組みから第六条との関係を外す', mut('INSTITUTIONS.md', INST_JA, '')],
    ['英語の国の仕組みから第六条との関係を外す', mut('INSTITUTIONS.en.md', INST_EN, 'Knighting')],
    ['基本法の後ろの注を外す', mut('README.md', NOTE_JA, '')],
    ['英訳の注を外す', mut('founding.en.md', NOTE_EN, '')],
    ['基本法の第六条を改める', mut('README.md', ART6, ART6.replace('叙任の条件は一つ、', '叙任の条件は、叙任の規程による。その一つは、'))],
    ['英訳の第六条を改める', mut('founding.en.md', ART6_EN, ART6_EN.replace('It has one condition:', 'Its conditions include:'))],
    ['王の正誤表 33 から前の文を外す', mut('ERRATA.md', OLD[1], '')],
    ['英語の王の正誤表 33 の分類を変える', mut('ERRATA.en.md', '| Fact | Insula Facti VIII |', '| Scope | Insula Facti VIII |')],
    ['年表の行を外す', mut('README.md', '| 2026-11-13（日本時間） | 紹介する人のために・建国の物語・遊びで、', '| 2026-11-13（日本時間） | 紹介の頁などで、')],
    ['記録の判定の数を変える', mut(AUD, '誤り 2 件、根拠不足 0 件、漏れ 5 件', '誤り 2 件、根拠不足 0 件、漏れ 4 件')],
    ['記録から誤りの行を問題なしにする', mut(AUD, '英語は「Anyone」で始まっていた | 誤り | 叙任の規程の', '英語は「Anyone」で始まっていた | 問題なし | 叙任の規程の')],
    ['記録から決めた理由を外す', mut(AUD, '同じ見落としを機械で止めるためです。', '同じ見落としを機械で止める。')],
    ['記録から弁護士の文を外す', mut(AUD, '\n\nこの節も、弁護士の確認は受けていません。\n\n## 調べた法令', '\n\n## 調べた法令')],
  ];
  const caught = breaks.filter(([, y]) => verdict(y).length > 0).map(([k]) => k);
  ok('壊して確かめる：紹介の頁・物語の前の文（日本語と英語）・生成した頁・llms-full.txt・「誰でも」・「Anyone」・規程と国の仕組みの文（日本語と英語）・基本法の後ろの注（日本語と英語）・第六条を改める（日本語と英語）・王の正誤表 33・年表・判定の数・誤りの行・理由・弁護士の文のどれでも落ちる（' + caught.length + ' / ' + breaks.length + '）', caught.length === breaks.length, breaks.filter(([k]) => !caught.includes(k)).map(([k]) => k).join(' / '));
}

console.log('\n72. 型で「当たらない」に分けた称号の条の読み直しと、外国の称号を縛る国に足した国（2026-11-13）');
{
  /* 2026-11-13 に Claude が決めた。型の決めで「当たらない」に分けていた称号・栄典の条を一つずつ読み直し、ギリシャ・イエメンと、
   * 憲法の第149条が取り込む貴族の廃止の法律を取り寄せて読んだオーストリアを、外国の称号を縛る国に足す（2026-11-22 から）。
   * 型の決めだけで分けた称号・栄典の条がないことは verification/world/check.js が、表と決めがそろうことは 65 が確かめる。
   * ここでは、取り寄せた法律の出典、記録の節（決めた者と理由、六つの欄の表と件数、記録の数）、規程の足した文、利用規約の予告、
   * 王の正誤表 34、年表の行が、日本語と英語でそろうことを確かめる。確かめる関数に壊した入力を渡し、落ちることも確かめる。 */
  const W72 = require('./world/check.js');
  const Wt = require('../tools/world.js');
  const WS = W72.state();
  const REC = 'docs/world-law-2026-11-12.md', SEC = '\n## 2026-11-12 の続き：八度目の見落とし\n';
  const SRC = 'AUT-adelaufhg';
  const files = [REC, 'policies/knighting.md', 'policies/knighting.en.md', 'policies/terms.md', 'policies/terms.en.md', 'ERRATA.md', 'ERRATA.en.md', 'README.md', 'verification/world/README.md'];
  const KINDS72 = ['誤り', '根拠不足', '漏れ', '表現', '問題なし'];
  const REREAD = '2026-11-13 に一つずつ読み直しました。';
  const cells = (l) => l.replace(/^\| | \|$/g, '').split(' | ');
  const OLD_JA = '2026-11-22 から、次の表の 15 か国の国籍を持つ人は、日本に住んでいても、ほかの国籍と重ねて持っていても、願い出ることができません。';
  const OLD_FORM = '次の国の国籍を持っていません：アイルランド、アメリカ合衆国、インド、オランダ、コロンビア、ドミニカ共和国、ネパール、ハンガリー、バングラデシュ、パキスタン、フィリピン、ベネズエラ、ベルギー、ホンジュラス、メキシコ。';
  const OLD_EN = '"From 2026-11-22, a person who holds the nationality of any of the 15 countries in the table below may not apply, even if they live in Japan, and even if they also hold another nationality."';
  function verdict(x, S) {
    const bad = [];
    const need = (f, list) => list.forEach((s) => { if (!x[f].includes(s)) bad.push(f + '：' + s.slice(0, 40)); });
    /* 取り寄せた法律：公式の所在から取れ、効力のある条を記し、第1条と第2条を一つずつ読んで当たりうるとした。 */
    const conf = S.sources.codes.find((c) => c.id === SRC) || {};
    const rec = (S.data['AUT.json'] || { sources: {} }).sources[SRC] || {};
    const provs = ((S.data['AUT.json'] || {}).provisions || []).filter((p) => p.source === SRC);
    if (!conf.official || !conf.drop || !conf.stop || conf.alt || rec.error || rec.via !== 'direct' || !/^https:\/\/ogd\.ris\.bka\.gv\.at\//.test((rec.final || [])[0] || '')) bad.push('貴族の廃止の法律の出典が、公式の所在から取れていない');
    const dec = (id) => (S.decisions.provisions || {})[id] || {};
    if (!['§ 1', '§ 2'].every((a) => provs.some((p) => p.article === a && dec(p.id).sha256 === p.sha256 && dec(p.id).class === 'could apply'))) bad.push('貴族の廃止の法律の第1条と第2条を、読んで当たりうるとしていない');
    /* 記録の節：見出しの並び、決めた者と理由、表の形と件数、弁護士の文。 */
    const r = x[REC], i = r.indexOf(SEC), j = i < 0 ? -1 : r.indexOf('\n## ', i + 5);
    const sec = i < 0 ? '' : r.slice(i, j < 0 ? undefined : j);
    if (i < 0 || !r.startsWith('\n## 残る限り\n', j)) bad.push('記録の節がないか、「残る限り」の前にない');
    const decided = sec.split('2026-11-13 に Claude が決めました。').slice(1);
    if (decided.length < 5 || !decided.every((z) => /ためです。/.test(z.split('\n')[0]))) bad.push('記録に、決めた者と理由がない');
    const t0 = sec.indexOf('\n| 箇所 | 法令と条 | 要件 | 事実 | 判定 | 対応 |\n| --- | --- | --- | --- | --- | --- |\n');
    const rows = t0 < 0 ? [] : sec.slice(t0 + 1).split('\n\n')[0].split('\n').slice(2).map(cells);
    if (rows.length < 8 || !rows.every((y) => y.length === 6 && KINDS72.includes(y[4]))) bad.push('記録の表の形');
    const said = (k) => Number((new RegExp(k + ' (\\d+) 件').exec(sec) || [0, -1])[1]);
    if (!KINDS72.every((k) => said(k) === rows.filter((y) => y[4] === k).length) || Number((/合わせて (\d+) 件です。/.exec(sec) || [])[1]) !== rows.length) bad.push('記録の表の件数');
    if (!sec.includes('この節も、弁護士の確認は受けていません。')) bad.push('記録に弁護士の文がない');
    /* 記録の数：型ごとの件数は、決めを外して型を当て直して数えたとおり（決めごと 5）。 */
    const byRule = Wt.classifyAll(S.data, Object.assign({}, S.decisions, { provisions: {} })).out;
    const re = Object.values(S.data).flatMap((d) => d.provisions).filter((p) => p.topics.includes('honours') && dec(p.id).sha256 === p.sha256 && (dec(p.id).reason || '').includes(REREAD));
    const of = (rule) => re.filter((p) => (byRule[p.id] || {}).by === rule).length;
    const main = ['C-honours-state', 'C-honours-uniform', 'C-honours-nobility', 'K-heading-nl', 'K-lperc'];
    const rest = re.length - main.reduce((a, k) => a + of(k), 0);
    const could = provs.filter((p) => dec(p.id).class === 'could apply').length;
    const table = (x['policies/knighting.md'].match(/次の表の (\d+) か国/) || [])[1];
    need(REC, ['型の決めだけで分けていた称号・栄典の条は ' + re.length + ' 件でした。型ごとには、国の機関が栄典を授ける権限の型が ' + of(main[0]) + ' 件、制服や一様の語の型が ' + of(main[1]) + ' 件、貴族の制度を設けない型が ' + of(main[2]) + ' 件、オランダの刑法典の題の型が ' + of(main[3]) + ' 件、メキシコの賞の法律の型が ' + of(main[4]) + ' 件、その他の型が ' + rest + ' 件です。',
      'オーストリアの貴族の廃止の法律から記した条は ' + provs.length + ' 件で、そのうち ' + could + ' 件が「当たりうる」です。', '外国の称号を縛る国は、15 か国から ' + table + ' か国になりました。',
      '| verification/world/decisions.json の称号・栄典の条 | 各国の憲法と法令の称号・栄典の条（' + re.length + ' 件） |']);
    /* 規程の足した文、利用規約の予告（日本語と英語）、調べの README。 */
    need('policies/knighting.md', ['表のうちイエメン・オーストリア・ギリシャは、2026-11-13 に Claude が足しました。', '足した国の国籍を持つ人も、2026-11-22 から願い出ることができません。受付は 2026-11-22 まで止めているので、さかのぼって断られる人はいません。']);
    need('policies/knighting.en.md', ['Austria, Greece and Yemen were added to the table by Claude on 2026-11-13', 'Applications are paused until 2026-11-22, so no one is refused retroactively.']);
    need('policies/terms.md', ['予告：2026-11-22 から、叙任の規程「外国の称号を縛る国」の表に、イエメン・オーストリア・ギリシャを足します。この三つの国の国籍を持つ人も、日本に住んでいても、ほかの国籍と重ねて持っていても、叙任を願い出ることができません（2026-11-13 に示しました）。']);
    need('policies/terms.en.md', ['Notice: from 2026-11-22, Yemen, Austria and Greece are added to the table in the Rules on Knighting, "Countries that restrict foreign titles".']);
    need('verification/world/README.md', ['称号・栄典の主題の条は、2026-11-13 から、型の決めだけで分けません。']);
    /* 王の正誤表 34：改める前の文、分類、地名。年表の行。 */
    const e34 = cells(x['ERRATA.md'].split('\n').find((l) => l.startsWith('| 34 | ')) || ''), e34en = cells(x['ERRATA.en.md'].split('\n').find((l) => l.startsWith('| 34 | ')) || '');
    if (!(e34[1] === '2026-11-13' && (e34[3] || '').includes(OLD_JA) && (e34[3] || '').includes(OLD_FORM) && e34[6] === '範囲' && (e34[4] || '').includes('2026-11-13 に Claude が決めました。'))) bad.push('王の正誤表 34 に、改める前の文か分類がない');
    if (!(e34en[1] === '2026-11-13' && (e34en[3] || '').includes(OLD_EN) && e34en[6] === 'Scope' && (e34en[4] || '').includes('Claude decided this on 2026-11-13'))) bad.push('英語の王の正誤表 34');
    if (!/^\| 2026-11-13（日本時間） \| 叙任の規程「外国の称号を縛る国」の表に、オーストリア・ギリシャ・イエメンを足す（2026-11-22 から）。[^|]+\| Austria, Greece and Yemen are added to the table/m.test(x['README.md'])) bad.push('年表の行がない');
    return bad;
  }
  const real = Object.fromEntries(files.map((f) => [f, read(f)]));
  const bad = verdict(real, WS);
  ok('型で「当たらない」に分けた称号の条の読み直し：取り寄せた法律の出典と決め、記録の節（決めた者と理由・表・件数・型ごとの数）、規程と利用規約の予告、王の正誤表 34、年表が、日本語と英語でそろう', bad.length === 0, bad.join(' / '));
  const mut = (f, a, b) => Object.assign({}, real, { [f]: real[f].replace(a, b) });
  const S2 = (f) => { const T = JSON.parse(JSON.stringify(WS)); f(T); return T; };
  const breaks = [
    ['貴族の廃止の法律の取り寄せを失敗にする', real, S2((T) => { T.data['AUT.json'].sources[SRC].error = 'x'; })],
    ['貴族の廃止の法律に別の所在を足す（取り寄せ直した出典の数が動く）', real, S2((T) => { T.sources.codes.find((c) => c.id === SRC).alt = ['https://example.org/']; })],
    ['第2条の決めを当たらないにする', real, S2((T) => { T.decisions.provisions['AUT-adelaufhg § 2'].class = 'does not apply'; })],
    ['記録の節の見出しを変える', mut(REC, SEC, '\n## 2026-11-12 の続き：八度目\n'), WS],
    ['記録から決めた理由を外す', mut(REC, '型の決めは文の型を見るだけで、条が誰を縛るかや、他の法律を取り込むかまでは見ないためです。', '型の決めは文の型を見るだけです。'), WS],
    ['記録の判定の数を変える', mut(REC, '漏れ 4 件、表現 1 件', '漏れ 3 件、表現 1 件'), WS],
    ['記録の表の判定を五つのほかにする', mut(REC, '「型で分けた条は、一つずつは読んでいません」とだけ書いていた | 表現 |', '「型で分けた条は、一つずつは読んでいません」とだけ書いていた | 軽微 |'), WS],
    ['記録の型ごとの数を変える', mut(REC, '制服や一様の語の型が 97 件', '制服や一様の語の型が 96 件'), WS],
    ['記録の国の数を変える', mut(REC, '15 か国から 18 か国', '15 か国から 17 か国'), WS],
    ['記録から弁護士の文を外す', mut(REC, '\nこの節も、弁護士の確認は受けていません。\n\n## 残る限り', '\n## 残る限り'), WS],
    ['規程から足した国の文を外す', mut('policies/knighting.md', '表のうちイエメン・オーストリア・ギリシャは、2026-11-13 に Claude が足しました。', ''), WS],
    ['英語の規程から足した国の文を外す', mut('policies/knighting.en.md', 'Austria, Greece and Yemen were added to the table by Claude on 2026-11-13', 'Countries were added'), WS],
    ['利用規約の予告を外す', mut('policies/terms.md', '予告：2026-11-22 から、叙任の規程「外国の称号を縛る国」の表に、イエメン・オーストリア・ギリシャを足します。', ''), WS],
    ['英語の利用規約の予告を外す', mut('policies/terms.en.md', 'Notice: from 2026-11-22, Yemen, Austria and Greece are added', 'Yemen, Austria and Greece are added'), WS],
    ['王の正誤表 34 から改める前の文を外す', mut('ERRATA.md', OLD_FORM, ''), WS],
    ['英語の王の正誤表 34 の分類を変える', mut('ERRATA.en.md', '| Scope | Insula Finis XIV |', '| Fact | Insula Finis XIV |'), WS],
    ['年表の行を外す', mut('README.md', '| 2026-11-13（日本時間） | 叙任の規程「外国の称号を縛る国」の表に、', '| 2026-11-13（日本時間） | 規程の表に、'), WS],
    ['調べの README から決めを外す', mut('verification/world/README.md', '称号・栄典の主題の条は、2026-11-13 から、型の決めだけで分けません。', ''), WS],
  ];
  const caught = breaks.filter(([, x, S]) => verdict(x, S).length > 0).map(([k]) => k);
  ok('壊して確かめる：取り寄せの失敗・別の所在・決め・記録の見出し・理由・判定の数と形・型ごとの数・国の数・弁護士の文・規程と利用規約（日本語と英語）・王の正誤表 34・年表・README のどれでも落ちる（' + caught.length + ' / ' + breaks.length + '）', caught.length === breaks.length, breaks.filter(([k]) => !caught.includes(k)).map(([k]) => k).join(' / '));
}

console.log('\n' + '-'.repeat(56));
if (fails.length) { console.log(pass + ' 件が通り、' + fails.length + ' 件が通りませんでした。'); process.exit(1); }
console.log(pass + ' 件すべて通りました。');

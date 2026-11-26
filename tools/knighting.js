#!/usr/bin/env node
/* 叙任の願い出の issue を確かめ、結果をコメントする。叙任を決めるのは運営者であり、この確認は何も決めない。
 *
 * GitHub Actions（.github/workflows/knighting.yml）で動く：
 *   GITHUB_EVENT_PATH, GITHUB_TOKEN, GITHUB_REPOSITORY
 * issue の番号・開いた時刻・本文は、出来事のファイル（GITHUB_EVENT_PATH）から読む。本文を環境変数で渡すと、
 * 実行の記録（Actions のログ）に本文が写るため（2026-11-13 に Claude が決めた。点検の記録「2026-11-13：十四度目の見落とし」）。
 *
 * 確かめるのは九つだけ：
 *   - 様式の誓いのうち、必ず印を付けるものすべてに印があること
 *   - 2026-11-22 から（日本時間で issue を開いた日）、日本に住み、いま日本にいる印があること
 *   - 2026-11-22 から、イタリアの国籍を持っていない印があること（ほかの国籍と重ねて持つ場合も含む）
 *   - 2026-11-22 から、外国の称号を縛る国（叙任の規程「外国の称号を縛る国」）の国籍を持っていない印があること
 *   - 2026-11-22 から、称号を遊びとして扱い、規程の禁じる使い方をしない印（良識の前提）があること
 *   - 2026-11-24 から、生まれてから一度も日本の外に出たことがない印があること（叙任の規程「日本の外に出たことがないこと」。
 *     2026-11-23 に運営者が決め、細かな定めは Claude が決めた）。見るのは印のあるなしだけで、旅券・日付・行った国は読まず、残さない
 *   - 2026-12-15 から、日本の国籍を持つ印があること（叙任の規程「日本の国籍を持つこと」。2026-11-26 に利用者が決め、細かな定めは
 *     Claude が決めた）。見るのは印のあるなしだけで、書類も、ほかに持つ国籍も読まず、残さない
 *     受付に戻ったあと（受付に戻る時刻と 2026-12-15 の遅いほうから）は、「日本の国籍の書類による確かめ」を受ける印（DOCUMENT）も見る。
 *     2026-11-26 に利用者が求め、Claude が決めた。書類の確かめそのものは運営者が非公開のリポジトリで行い、ここは画像を見ない。
 *     コメントには、運営者が結果の一行を記すまで、書類の確かめは済んでいないと書く（documentDue と addDocument）
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
 *
 * 参加のハードル（2026-12-15 から。2026-11-19 に利用者がハードルを最大限に上げると決め、Claude が条件を選んだ。叙任の規程「参加のハードル」）。前の願い出の日数は addInterval が足す：
 *   - 18 歳以上の印があること（DATED に足した）
 *   - 「称号を使わない場所」の欄が、規程の語（PLACE_WORDS）を PLACES_MIN 以上挙げること
 *   - 同じアカウントが前に開いた叙任の願い出の issue から INTERVAL_DAYS 日たっていること。GitHub の API は issue の全体を返すが、
 *     使うのは番号（いまの issue を除くため）と開いた時刻だけで、ほかは捨てる。受付の停止のあいだに開かれたものは、開いた時刻で除く（題は見ない。
 *     題は誰でも書き換えられるため。2026-11-19 の点検で改めた）。読んだものは残さず、コメントにも記録にも書かない（前の issue の番号も書かない）
 *   - 叙任を決められる最も早い日をコメントに書く。決めるのは運営者である
 *   日数は日本時間の日で数え、初めの日（前の願い出や、この願い出の issue を開いた日）を数えない。90 日なら、開いた日の次の日から数えて
 *   90 日が過ぎた次の日が、決められる最も早い日である。365 日も同じに数える（2026-11-19 の点検で改めた）。
 *   一年に 1 人までという数は、名簿の行から検査 90 が確かめる（ここでは見ない）。
 *
 * 参加のハードルの続き（2026-12-15 から。2026-11-23 に利用者が七つの条件を採ると決め、細かな定めは Claude が決めた。
 * 叙任の規程「参加のハードルの続き」、点検の記録「2026-11-24：参加の条件を七つ厳しくする」）：
 *   - 誤りの元の文が、自分が書いて公開した文である印があること（DATED に足した。共著の文は、著者に入っていれば数える）
 *   - 様式の「訂正を公開した日」（PUBLISHED_FIELD）が日付で、issue を開いた日の PUBLISHED_DAYS 日以上前であること
 *   - 訂正へのリンクが、前の版が残る場（VENUES）の形であること。文字の上だけで見て、リンクは開かない
 *   - 願い出の issue を開いたアカウントが、issue を開いた日の ACCOUNT_YEARS 年以上前に作られていること（addAccount）。GitHub の公開の API
 *     （users）の答えのうち、使うのは created_at だけで、ほかは捨てる。作られた日時は残さず、コメントにも記録にも書かない。本人には何も尋ねない
 *   - 同じアカウントの叙任の願い出に、運営者がラベル REFUSED_LABEL を付けたもの（断った願い出）がないこと（addRefused）。
 *     ラベルでの絞り込みは GitHub の API がする。使うのは番号と開いた時刻だけで、ほかは捨てる。受付の停止のあいだに開かれたものは数えない
 *   - 叙任を決められる最も早い日に、前の叙任の日（名簿の行）から ACCOUNT_YEARS 年が過ぎる日を入れる（2 年に 1 人まで。数は検査 96 が名簿から確かめる）
 *   日と年は日本時間の日で数え、初めの日（訂正を公開した日、アカウントが作られた日、前の叙任の日）を数えない。
 *   2 年は、初めの日の次の日の 2 年後の同じ月日に過ぎ終えている。その月日がない（2 月 29 日の）ときは、3 月 1 日である。
 *
 * 様式の定義は tools/knighting-form.yml に置く。受付を止めているあいだは、issue の様式の一覧（.github/ISSUE_TEMPLATE/）に置かない
 * （2026-11-13 に Claude が決めた。点検の記録「2026-11-13：十四度目の見落とし」）。受付に戻すときに、定義をそこへ写す。
 * 停止のあいだに叙任の願い出として届いた issue は、題と本文を短い断りに替え、閉じて、書き込みを止める（ロック）。
 * 届いた願い出のうち、アカウント名と開いた日のほかを、運営者の記録として残さないためである（同じ日に Claude が決めた）。
 *
 * 叙任のラベルのない issue（2026-11-13 に Claude が決めた。点検の記録「2026-11-13：十五度目の見落とし」）：
 * 様式の設定（.github/ISSUE_TEMPLATE/config.yml の blank_issues_enabled: false）が外すのは、GitHub の画面の選び場の白紙の issue だけで、
 * API など、ほかの道で開かれた issue は様式を通らず、ラベルも付かない。そうした issue が受付の停止のあいだに開かれ、題か本文に
 * 叙任の願い出の様式の見出しや印（formMarkers）を持つときは、ラベルの付いた願い出と同じに、題と本文を断りに替え、閉じて、書き込みを止める。
 * ほかの issue には何もしない（運営者が読む）。ラベルのない issue の題と本文も、記録に写さない。
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
/* 日本の外に出たことがないこと（2026-11-24 から）。2026-11-23 に運営者が決め、細かな定めは Claude が決めた。 */
const ABROAD_FROM = '2026-11-24';
const ABROAD = '生まれてから一度も、日本の外に出たことがありません';
/* 日本の国籍を持つこと（2026-12-15 から）。2026-11-26 に利用者が決め、細かな定めは Claude が決めた。 */
const JAPANESE_FROM = '2026-12-15';
const JAPANESE = '日本の国籍を持っています';
/* 日本の国籍の書類による確かめ（受付に戻ったあと）。2026-11-26 に利用者が求め、Claude が決めた。効くのは、受付に戻る時刻（REOPEN.at）と
 * JAPANESE_FROM の遅いほうからで、受付を止めているあいだ（REOPEN が null）は効かない。画像は運営者だけが非公開のリポジトリで見る。
 * この確認は画像を見ず、印のあるなしと、結果が記されるまで済んでいないことだけを書く。 */
const DOCUMENT = '受付に戻ったあとの「日本の国籍の書類による確かめ」を受けます';
const DOCUMENT_LABEL = '日本の国籍の書類による確かめを受ける印がある';
const DOCUMENT_DAYS = 7;
const DOCUMENT_PENDING = '日本の国籍の書類による確かめは、まだ済んでいません。運営者が、願い出ごとに作る非公開のリポジトリにこの issue を開いたアカウントを招き、戸籍の証明書の画像を見て、結果の一行（確かめた／確かめられなかった）をこの issue に記すまで、叙任を決めません。画像はこの issue に貼りません。個人番号（マイナンバー）と、個人番号の見えるものは送りません。電子メールは使いません。非公開のリポジトリは、作った日から ' + DOCUMENT_DAYS + ' 日以内に削除します（叙任の規程「日本の国籍の書類による確かめ」）。';
const PAUSE_FROM = '2026-11-12T00:00:00+09:00';
/* 参加のハードル（2026-12-15 から）。2026-11-19 に利用者がハードルを最大限に上げると決め、Claude が条件を選んだ。 */
const HURDLE_FROM = '2026-12-15';
const AGE = '18 歳以上です';
const PLACES_FIELD = '称号を使わない場所';
/* 規程の語（王国基本法第八条と利用規約「称号の扱い」）。英語の言い方でも数える。一つの語は一度だけ数える。 */
const PLACE_WORDS = [['履歴書', 'CV', 'CVs', 'résumé', 'resume'], ['論文', 'paper', 'papers'], ['名刺', 'business card', 'business cards'], ['公的な書類', 'official document', 'official documents'], ['学術の場', 'academic'],
  ['商取引', 'commerce', 'commercial', 'business transaction', 'business transactions'], ['広告', 'advertisement', 'advertisements', 'advertising']];
const PLACES_MIN = 3;
const INTERVAL_DAYS = 365;
const WAIT_DAYS = 90;
const DAY = 24 * 3600 * 1000;
/* 参加のハードルの続き（2026-12-15 から）。2026-11-23 に利用者が採ると決め、細かな定めは Claude が決めた。 */
const STRICT_FROM = '2026-12-15';
const OWN = '誤りの元の文は、自分が書いて公開した文です';
const PUBLISHED_FIELD = '訂正を公開した日';
const PUBLISHED_DAYS = 180;
const ACCOUNT_YEARS = 2;
const QUOTA_YEARS = 2;
/* 断った願い出に運営者が付けるラベル。受付の停止のあいだに閉じた願い出と、2 年に 1 人までのために断った願い出には付けない。 */
const REFUSED_LABEL = '断った';
/* 前の版が残る場（叙任の規程「参加のハードルの続き」の表）。種類ごとに、受けるリンクの形を持つ。文字の上だけで見る。 */
const VENUES = [
  { kind: 'Git の履歴', forms: [
    { host: 'github.com', path: /^\/[^/]+\/[^/]+\/(?:commit\/[0-9a-f]{7,40}|pull\/\d+)\/?$/i },
    { host: 'gitlab.com', path: /^\/(?:[^/]+\/)+-\/(?:commit\/[0-9a-f]{7,40}|merge_requests\/\d+)\/?$/i },
    { host: 'codeberg.org', path: /^\/[^/]+\/[^/]+\/(?:commit\/[0-9a-f]{7,40}|pulls\/\d+)\/?$/i }] },
  { kind: '版を分けて残す登録', forms: [
    { host: 'doi.org', path: /^\/10\.\d{4,9}\/\S+$/ },
    { host: 'zenodo.org', path: /^\/records\/\d+\/?$/ },
    { host: 'arxiv.org', path: /^\/abs\/(?:\d{4}\.\d{4,5}|[a-z-]+(?:\.[A-Z]{2})?\/\d{7})v\d+\/?$/ }] },
  { kind: '正誤表の頁', forms: [
    { host: 'doi.org', path: /^\/10\.\d{4,9}\/\S+$/ }] },
];
/* 様式が付けるラベル。ワークフローはどの issue でも動き、ラベルと様式の見出しや印で、ここが扱うかを決める。 */
const LABEL = '叙任';
/* 受付に戻す決め。null のあいだは受付を閉じており、どの日に開かれた願い出も受けない（日付では終わらない）。
 * 2026-11-13 に利用者が法的リスクを限りなく小さくするよう求め、Claude が決めた：受付に戻る日を置かない。
 * 戻すときは { at: '<受付に戻る時刻（日本時間、+09:00）>', record: '<点検の記録で停止を解く行の「箇所」の欄の文>' } を書く。
 * 検査 63 が確かめる：at は改めた規程の効力の日（2026-11-22 0 時）より前でない。record の行が点検の記録の表にあり、
 * その行が at の日付と「受付に戻す」を書いている。2026-11-13 に Claude が決めた。 */
const REOPEN = null;
const PAUSE_TEXT = '2026-11-12 から、叙任の願い出の受付を止めています（叙任の規程「受付の停止」）。授けることに関わるイタリアの法令の一点が、条文からは決まらないためです。受付に戻る日は決めていません。この願い出は受けず、この issue を閉じます。';
const PAUSE_TEXT_EN = 'Since 2026-11-12, applications for knighting are not received (Rules on Knighting, "Pause in receiving applications"), because a point of Italian law concerning conferral is not settled by the texts. No date for reopening has been set. This application is not accepted, and this issue is closed.';
/* 様式の定義の置き場。受付を止めているあいだは .github/ISSUE_TEMPLATE/ に置かない。 */
const FORM = path.join('tools', 'knighting-form.yml');
/* 停止のあいだに届いた願い出の題と本文を替える断り。替えたあとに残るのは、GitHub が記す開いた人のアカウント名と開いた日である。 */
const PAUSE_TITLE = '叙任の願い出（受付の停止のあいだ） / Application received during the pause';
const PAUSE_BODY = '受付を止めているあいだに届いた叙任の願い出です（叙任の規程「受付の停止」）。受けていないので、自動の確認が題と本文をこの断りに替え、閉じました。運営者が残すのは、開いた人のアカウント名と開いた日だけです（個人情報の取り扱い「保存の期間」）。';
const PAUSE_BODY_EN = 'This application for knighting arrived while applications are paused (Rules on Knighting, "Pause in receiving applications"). It was not accepted, so the automatic check replaced its title and body with this note and closed it. The operator keeps only the account name of the person who opened it and the date it was opened (Privacy, "How long data is kept").';

/* 受付に戻すときの確かめ（2026-11-26 に Claude が決めた。点検の記録「2026-11-26：イタリアの法令で、授けることがどこまで罪になるか」）。
 * 受付に戻す決めは、点検の記録の表に FINDING を「箇所」の欄に持つ行があるときだけ効く。その行は、判定が「問題なし」で、
 * FINDING_POINTS のすべて（第 7 条第 5 号・第 7 条第 1 号・第 8 条・第 6 条と、オンラインで日本の国籍の人に授けること）を書き、
 * 「法令と条」の欄に一次資料の表（verification/sources.json）の名を挙げる。挙げた名は表になければならず、そのうち一つ以上は
 * READ_UNSETTLED（2026-11-26 までに読み、この点を決めなかった出典）にないものでなければならない。読んだ文がこの点を決めないことは、
 * 点検の記録の 2026-11-13 と 2026-11-26 の節にある。名を替えても 1951 年法律第 178 号第 8 条の「con qualsiasi forma e denominazione」に
 * 当たりうるので、呼び名や形を替えても、この確かめは要る。 */
const FINDING = 'イタリアの法令が叙任に及ばないことの確かめ';
const FINDING_POINTS = ['刑法典第7条第5号', '刑法典第7条第1号', '刑法典第8条', '刑法典第6条', 'オンライン', '日本の国籍'];
const READ_UNSETTLED = [
  'モンテビデオ条約 第1条',
  'モンテビデオ条約 第3条',
  'GDPR 第3条第2項',
  'イタリア 1951 年法律第178号 第8条',
  'CCPA 司法長官の説明',
  'Vercel Fair Use Guidelines',
  'Vercel Fair Use Guidelines（節の一覧）',
  'GDPR 第27条',
  'イタリア 2016 年委任立法第8号 第1条',
  'Vercel 利用規約 第4条',
  'イタリア 刑法典 第10条',
  'イタリア 刑法典 第6条',
  'イタリア 刑法典 第9条',
  'イタリア 1951 年法律第178号 第7条',
  'イタリア 2016 年委任立法第8号 第1条第3項',
  'イタリア 2016 年委任立法第8号 別表',
  'イタリア 首相府 勲章の使用の案内（使う者）',
  'イタリア 首相府 勲章の使用の案内（授ける者）',
  'モンテビデオ条約 当事国の一覧',
  'CCPA 第1798.140条(d)',
  'Vercel 利用規約 第8条',
  'Vercel 利用規約 第10.1条',
  'Vercel 許容される利用の方針（なりすまし）',
  'Vercel 許容される利用の方針（好ましくない目的）',
  '個人情報保護委員会 Q&A Q1-62',
  '個人情報保護委員会 Q&A Q12-3',
  '個人情報保護委員会 Q&A Q12-10',
  '個人情報保護委員会 Q&A Q13-2',
  '個人情報保護委員会 ガイドライン 通則編 2-5',
  '個人情報保護委員会 ガイドライン 外国第三者提供編 5-1',
  '個人情報保護委員会 ガイドライン 外国第三者提供編 5-2',
  '個人情報保護委員会 ガイドライン 外国第三者提供編 5-3-2',
  '個人情報保護委員会 ガイドライン 確認記録義務編 2-2-1-1',
  '個人情報保護委員会 ガイドライン 確認記録義務編 2-2-1-3',
  '個人情報保護委員会 ガイドライン 確認記録義務編 4-2-1-2',
  '個人情報保護委員会 外国制度 米国（指標）',
  '個人情報保護委員会 外国制度 米国（政府の情報収集）',
  '個人情報保護委員会 外国制度 米国（時点）',
  '総務省 電気通信事業参入マニュアル（事業）',
  '総務省 電気通信事業参入マニュアル（Webサイト）',
  '総務省 電気通信事業参入マニュアル（問合せの受付）',
  '総務省 電気通信事業参入マニュアル（電子掲示板）',
  '総務省 外部送信規律 FAQ 問1-8',
  'GitHub の利用規約 I 節',
  'GitHub の追加製品の規約 Actions（前置き）',
  'GitHub の追加製品の規約 Actions（負荷）',
  'GitHub の追加製品の規約 Actions（目的）',
  'GitHub の追加製品の規約 Actions（誤用）',
  'Internet Archive の利用規約（範囲）',
  'Internet Archive の利用規約（目的）',
  'Internet Archive の利用規約（負荷）',
  'Internet Archive の利用規約（個人データ）',
  'イタリア 刑法典 第7条（柱書き）',
  'イタリア 刑法典 第7条第1号',
  'イタリア 刑法典 第7条第5号',
  'イタリア 刑法典 第8条第1項',
  'イタリア 刑法典 第8条第3項',
  'イタリア 刑法典 第10条第2項',
  'イタリア 1951 年法律第178号 第8条第4段落',
  'イタリア 1951 年法律第178号 第9条',
  'イタリア 1981 年法律第689号 第32条',
  'イタリア 1981 年法律第689号 第32条第2項・第3項',
  'イタリア 1981 年法律第689号 第34条',
  'イタリア 破毀院検事総局 管轄の指針（インターネットの名誉毀損）',
  'イタリア 破毀院検事総局 管轄の指針（情報システムへの接続）',
  '欧州逮捕状の枠組み決定 第2条第1項',
  '欧州逮捕状の枠組み決定 第2条第4項',
  '欧州逮捕状の枠組み決定 第4条第7号',
  '法務省 犯罪白書 逃亡犯罪人の引渡し',
  '警察庁 犯罪人引渡条約',
  '個人情報保護委員会 ガイドライン（通則編）2-3（人種と国籍）',
  '個人情報保護委員会 ガイドライン（通則編）3-2（国籍による違法な差別的取扱い）',
];
const SOURCES_FILE = path.join('verification', 'sources.json');

/* 純：点検の記録に、受付に戻すための確かめの行があるか。あれば null、なければ理由。sources は一次資料の表の sources。 */
function findingProblem(record, sources) {
  const rows = String(record || '').split('\n').filter((l) => l.startsWith('| ' + FINDING + ' |')).map((l) => l.replace(/^\| | \|$/g, '').split(' | '));
  if (!rows.length) return 'イタリアの法令が叙任に及ばないことを確かめた行が、記録にない';
  const names = Object.keys(sources || {});
  for (const r of rows) {
    if (r.length !== 6 || r[4] !== '問題なし') continue;
    if (!FINDING_POINTS.every((p) => r.join(' ').includes(p))) continue;
    const cited = r[1].split('、').map((x) => x.trim()).filter((c) => names.includes(c));
    if (!cited.some((c) => !READ_UNSETTLED.includes(c))) continue;
    return null;
  }
  return '確かめの行が、問題なしの判定・確かめる点のすべて・まだ読んでいなかった一次資料のどれかを欠く';
}

/* 純：受付に戻す決めが、点検の記録の行に拠っているか。拠っていれば null、いなければ理由。
 * record は点検の記録の文（docs/legal-audit-2026-11-12.md）。sources は一次資料の表（既定は verification/sources.json）。 */
function reopenProblem(reopen, record, sources = JSON.parse(fs.readFileSync(path.join(ROOT, SOURCES_FILE), 'utf8')).sources) {
  if (reopen === null) return null;
  if (!reopen || typeof reopen.at !== 'string' || typeof reopen.record !== 'string' || !reopen.record.trim()) return '決めの形が違う';
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+09:00$/.test(reopen.at) || !Number.isFinite(Date.parse(reopen.at))) return '時刻が日本時間の形でない';
  if (Date.parse(reopen.at) < Date.parse(PRESENCE_FROM + 'T00:00:00+09:00')) return '改めた規程の効力の日より前に戻す';
  const row = String(record || '').split('\n').find((l) => l.startsWith('| ' + reopen.record + ' |'));
  if (!row) return '記録に行がない';
  if (!row.includes(reopen.at.slice(0, 10)) || !row.includes('受付に戻す')) return '記録の行が、その日に受付に戻すと書いていない';
  const finding = findingProblem(record, sources);
  if (finding) return finding;
  return null;
}

/* 純：issue を開いた時が受付の停止のあいだか。opened は ISO の時刻。reopen は受付に戻す決め（既定は REOPEN）。 */
function paused(opened, reopen = REOPEN) {
  const t = Date.parse(opened);
  if (!Number.isFinite(t) || t < Date.parse(PAUSE_FROM)) return false;
  return !(reopen && Number.isFinite(Date.parse(reopen.at)) && t >= Date.parse(reopen.at));
}

/* 純：停止のあいだに届いた願い出の、替えたあとの本文。 */
function pauseBody() {
  return `${MARK}
${PAUSE_BODY}

${PAUSE_BODY_EN}
`;
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

/* 日付から見る印。その日より前に開かれた願い出には求めないため、ここで日付を見て求める。
 * 効力を生じた印は、様式でも必須にする（2026-11-22 に、その日からの四つを必須にした）。必須でも requiredOaths はこれらを除く。
 * 除かないと、同じ印を「必ず印を付ける誓い」と日付の行で二度数え、その日より前の願い出にも求めてしまう。 */
const DATED = [
  { from: PRESENCE_FROM, text: PRESENCE, label: '日本に住み、いま日本にいる印がある' },
  { from: NATIONALITY_FROM, text: NATIONALITY, label: 'イタリアの国籍を持っていない印がある' },
  { from: PREMISE_FROM, text: PREMISE, label: '称号を遊びとして扱う印（良識の前提）がある' },
  { from: FOREIGN_FROM, text: FOREIGN, label: '外国の称号を縛る国の国籍を持っていない印がある' },
  { from: ABROAD_FROM, text: ABROAD, label: '生まれてから一度も日本の外に出たことがない印がある' },
  { from: JAPANESE_FROM, text: JAPANESE, label: '日本の国籍を持つ印がある' },
  { from: HURDLE_FROM, text: AGE, label: '18 歳以上の印がある' },
  { from: STRICT_FROM, text: OWN, label: '誤りの元の文が、自分が書いて公開した文である印がある' },
];

/* 純：様式の定義から、必ず印を付ける誓いの文を取り出す。日付から見る印（DATED）は、様式で必須でも除く。 */
function requiredOaths(yml = fs.readFileSync(path.join(ROOT, FORM), 'utf8')) {
  const out = [];
  const re = /- label: (.+)\n\s+required: (true|false)/g;
  let m;
  while ((m = re.exec(yml))) if (m[2] === 'true' && !DATED.some((d) => m[1].trim().startsWith(d.text))) out.push(m[1].trim());
  return out;
}

/* 純：様式の定義から、ラベルのない issue を叙任の願い出と見る目印を取り出す。
 * titles は題の頭（様式の title の「<」より前と、全角のコロンを半角にした形）、headings は項の見出し（GitHub が「### 」を付けて本文に書く）、
 * oaths は誓いの文（GitHub が「- [X] 」か「- [ ] 」を付けて本文に書く）。 */
function formMarkers(yml = fs.readFileSync(path.join(ROOT, FORM), 'utf8')) {
  const head = ((/^title: "([^"<]*)/m.exec(yml) || [])[1] || '').trim();
  const titles = head ? [...new Set([head, head.replace(/：$/, ':')])] : [];
  const headings = [...yml.matchAll(/^      label: (.+)$/gm)].map((m) => '### ' + m[1].trim());
  const oaths = [...yml.matchAll(/^        - label: (.+)$/gm)].map((m) => m[1].trim());
  return { titles, headings, oaths };
}

/* 純：ラベルのない issue の題か本文が、叙任の願い出の様式の目印を持つか。 */
function formLike(issue, markers = formMarkers()) {
  const title = String((issue && issue.title) || '').trim();
  if (markers.titles.some((t) => title.startsWith(t))) return true;
  const lines = String((issue && issue.body) || '').replace(/\r\n?/g, '\n').split('\n').map((l) => l.trim());
  if (lines.some((l) => markers.headings.includes(l))) return true;
  return lines.some((l) => { const m = /^- \[[ xX]\] (.+)$/.exec(l); return !!m && markers.oaths.includes(m[1].trim()); });
}

/* 純：この issue を、ここが扱うか。'label' は叙任のラベルの付いた願い出、'formlike' はラベルのない issue で、
 * 受付の停止のあいだに開かれ、様式の目印を持つもの。null はどちらでもなく、何もしない。 */
function target(issue, opened, reopen = REOPEN, markers) {
  const labels = ((issue && issue.labels) || []).map((l) => (typeof l === 'string' ? l : (l && l.name) || ''));
  if (labels.includes(LABEL)) return 'label';
  if (labels.length === 0 && paused(opened, reopen) && formLike(issue, markers)) return 'formlike';
  return null;
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

/* 純：「称号を使わない場所」の答えが挙げる規程の語の数。日本語の語は文字の上で、英語の言い方は語として（前後が英字でない所で）、大文字と小文字を問わずに見る。 */
function placesNamed(text) {
  const t = String(text || '');
  return PLACE_WORDS.filter((ws) => ws.some((w) => (/^[\x00-\x7f]+$/.test(w) ? new RegExp('(^|[^a-z])' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^a-z])', 'i').test(t) : t.toLowerCase().includes(w.toLowerCase())))).length;
}

/* 純：日本時間の日（YYYY-MM-DD）の通し番号。日の差を数えるために使う。 */
const dayNo = (day) => Math.round(Date.parse(day + 'T00:00:00Z') / DAY);

/* 純：同じアカウントの前の願い出から INTERVAL_DAYS 日たっているか。たっていれば null、いなければ理由（前の issue の番号は書かない）。
 * previous は、そのアカウントが開いた叙任のラベルの issue の、番号と開いた時刻の一覧。null は読めなかったことを表す。
 * いまの issue、受付の停止のあいだ（PAUSE_FROM から受付に戻るまで）に開かれたもの、いまの issue より後に開いたものは数えない。
 * 前の願い出を開いた日を数えずに INTERVAL_DAYS 日が過ぎるまで（日の差が INTERVAL_DAYS 以下のあいだ）は受けない。 */
function intervalProblem(previous, opened, number, reopen = REOPEN) {
  if (previous === null || previous === undefined) return '前の願い出を読めなかった';
  const t = Date.parse(opened);
  for (const p of previous) {
    if (!p || p.number === number) continue;
    const s = Date.parse(p.created_at);
    if (!Number.isFinite(s) || s > t || paused(p.created_at, reopen)) continue;
    if (dayNo(jstDay(opened)) - dayNo(jstDay(p.created_at)) <= INTERVAL_DAYS) return '前の願い出から ' + INTERVAL_DAYS + ' 日たっていない';
  }
  return null;
}

/* 純：叙任を決められる最も早い日（日本時間）。願い出の issue を開いた日を数えずに WAIT_DAYS 日が過ぎた、次の日。 */
function earliestDecision(opened) {
  return new Date(Date.parse(jstDay(opened) + 'T00:00:00Z') + (WAIT_DAYS + 1) * DAY).toISOString().slice(0, 10);
}

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

/* 純：訂正へのリンクが、前の版が残る場（VENUES）の形か。形なら場の種類（DOI は二つの種類に当たるので、・で並べる）、そうでなければ null。開かずに文字の上だけで見る。 */
function venueOf(link) {
  if (linkProblem(link) !== null) return null;
  const u = new URL(link);
  const h = u.hostname.toLowerCase().replace(/\.$/, '');
  const kinds = VENUES.filter((x) => x.forms.some((f) => f.host === h && f.path.test(u.pathname))).map((x) => x.kind);
  return kinds.length ? kinds.join('・') : null;
}

/* 純：年-月-日の形の、暦にある日か。 */
function realDay(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '').trim());
  if (!m) return null;
  const t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
  return new Date(t).toISOString().slice(0, 10) === m[0] ? m[0] : null;
}

/* 純：訂正を公開した日が、issue を開いた日（日本時間）の PUBLISHED_DAYS 日以上前か。初めの日を数えないので、日の差が PUBLISHED_DAYS より大きいときに通る。
 * 通れば null、通らなければ理由。 */
function publishedProblem(text, opened) {
  const d = realDay(text);
  if (!d) return '日付（2026-06-17 の形）として読めない';
  if (dayNo(jstDay(opened)) - dayNo(d) <= PUBLISHED_DAYS) return PUBLISHED_DAYS + ' 日以上前でない';
  return null;
}

/* 純：初めの日（YYYY-MM-DD）を数えずに years 年が過ぎ終えた次の日。初めの日の次の日の years 年後の同じ月日で、その月日がない 2 月 29 日は 3 月 1 日になる。 */
function yearsAfter(day, years) {
  const [y, m, d] = day.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return new Date(Date.UTC(next.getUTCFullYear() + years, next.getUTCMonth(), next.getUTCDate())).toISOString().slice(0, 10);
}

/* 純：アカウントが、issue を開いた日の ACCOUNT_YEARS 年以上前に作られたか。created は GitHub の API の created_at。通れば null、通らなければ理由。
 * 作られた日時は理由にも書かない。 */
function accountProblem(created, opened) {
  if (!created || !Number.isFinite(Date.parse(created))) return 'アカウントの作られた日を読めなかった';
  if (jstDay(opened) < yearsAfter(jstDay(created), ACCOUNT_YEARS)) return ACCOUNT_YEARS + ' 年以上前に作られていない';
  return null;
}

/* 純：同じアカウントの断った願い出（ラベル REFUSED_LABEL の issue の、番号と開いた時刻）があるか。なければ null、あれば理由（番号は書かない）。
 * いまの issue、いまの issue より後に開いたもの、受付の停止のあいだに開かれたものは数えない。null は読めなかったことを表す。 */
function refusedProblem(refused, opened, number, reopen = REOPEN) {
  if (refused === null || refused === undefined) return '断った願い出を読めなかった';
  const t = Date.parse(opened);
  for (const p of refused) {
    if (!p || p.number === number) continue;
    const s = Date.parse(p.created_at);
    if (!Number.isFinite(s) || s > t || paused(p.created_at, reopen)) continue;
    return '前に断った願い出がある';
  }
  return null;
}

/* 純：名簿（KNIGHTS.md）の行の叙任の日のうち、いちばん遅い日。行がなければ null。辞退した行も、叙任の日で数える。 */
function lastKnighted(roll) {
  const days = String(roll || '').split('\n').filter((l) => /^\| \d+ \|/.test(l)).map((l) => l.split('|').map((c) => c.trim())[3]).filter((d) => !!realDay(d)).sort();
  return days.length ? days[days.length - 1] : null;
}

/* 純：前の叙任の日を数えずに QUOTA_YEARS 年が過ぎ、次の叙任ができる最も早い日。前の叙任がなければ null。 */
function quotaEarliest(last) {
  return last ? yearsAfter(last, QUOTA_YEARS) : null;
}

/* 純：日本の国籍の書類による確かめが、この願い出に効くか。受付に戻る決め（reopen）があり、issue を開いた時刻がその時刻より後で、
 * 開いた日が JAPANESE_FROM より前でないときだけ効く。受付を止めているあいだ（reopen が null）は効かない。 */
function documentDue(opened, reopen = REOPEN) {
  if (!reopen || !reopen.at) return false;
  return Date.parse(opened) >= Date.parse(reopen.at) && jstDay(opened) >= JAPANESE_FROM;
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
  if (jstDay(opened) >= HURDLE_FROM) {
    const named = placesNamed(form[PLACES_FIELD]);
    add('「' + PLACES_FIELD + '」が規程の語を ' + PLACES_MIN + ' つ以上挙げる', named >= PLACES_MIN, named + ' つ');
  }
  const link = (form['訂正への公開のリンク'] || '').trim();
  const problem = linkProblem(link);
  add('訂正へのリンクが https の URL で、受けない先を指さない', problem === null, problem || '開いていない。リンク先は運営者が読む');
  if (jstDay(opened) >= STRICT_FROM) {
    const pub = publishedProblem(form[PUBLISHED_FIELD], opened);
    add('「' + PUBLISHED_FIELD + '」が、issue を開いた日の ' + PUBLISHED_DAYS + ' 日以上前', pub === null, pub || '');
    const venue = venueOf(link);
    add('訂正へのリンクが、前の版が残る場（叙任の規程の表）の形', venue !== null, venue || '表の場の形でない');
  }
  const what = (form['何を誤り、どう正したか'] || '').trim();
  add('何を誤り、どう正したかが書かれている', what.length >= 10 && what !== '_No response_');
  return { ok: rows.every((r) => r[1]), rows, earliest: jstDay(opened) >= HURDLE_FROM ? earliestDecision(opened) : null };
}

/* 純：日本の国籍の書類による確かめの行を、確かめた結果に足す（documentDue のときだけ）。受付に戻る決めは main が記録に照らしてから渡すので、
 * check とは分けてある。足すのは印のあるなしの行と、運営者が結果を記すまで済んでいないという印（result.document）だけで、画像は見ない。 */
function addDocument(result, form, opened, reopen = REOPEN) {
  if (!documentDue(opened, reopen)) return result;
  const oath = (form && form['誓い']) || '';
  const has = oath.split('\n').some((l) => /^- \[[xX]\] /.test(l) && l.includes(DOCUMENT));
  result.rows.push([DOCUMENT_LABEL, has, has ? '' : '受付に戻ったあと、この印のない願い出は受けません']);
  result.document = true;
  result.ok = result.rows.every((r) => r[1]);
  return result;
}

/* 純：前の願い出からの日数の行を、確かめた結果に足す（HURDLE_FROM から）。前の願い出の一覧は GitHub の API から読むので、check とは分けてある。 */
const INTERVAL_LABEL = '同じアカウントの前の願い出から ' + INTERVAL_DAYS + ' 日たっている';
function addInterval(result, previous, opened, number, reopen = REOPEN) {
  if (jstDay(opened) < HURDLE_FROM) return result;
  const gap = intervalProblem(previous, opened, number, reopen);
  result.rows.push([INTERVAL_LABEL, gap === null, gap || '']);
  result.ok = result.rows.every((r) => r[1]);
  return result;
}

/* 純：アカウントの作られた日の行を、確かめた結果に足す（STRICT_FROM から）。作られた日時は GitHub の API から読むので、check とは分けてある。 */
const ACCOUNT_LABEL = 'GitHub のアカウントが、issue を開いた日の ' + ACCOUNT_YEARS + ' 年以上前に作られている';
function addAccount(result, created, opened) {
  if (jstDay(opened) < STRICT_FROM) return result;
  const p = accountProblem(created, opened);
  result.rows.push([ACCOUNT_LABEL, p === null, p || '']);
  result.ok = result.rows.every((r) => r[1]);
  return result;
}

/* 純：断った願い出の行を、確かめた結果に足す（STRICT_FROM から）。 */
const REFUSED_ROW = '同じアカウントの叙任の願い出を、前に断っていない';
function addRefused(result, refused, opened, number, reopen = REOPEN) {
  if (jstDay(opened) < STRICT_FROM) return result;
  const p = refusedProblem(refused, opened, number, reopen);
  result.rows.push([REFUSED_ROW, p === null, p || '']);
  result.ok = result.rows.every((r) => r[1]);
  return result;
}

/* 純：叙任を決められる最も早い日に、前の叙任から QUOTA_YEARS 年が過ぎる日を入れる（STRICT_FROM から）。遅いほうを書く。 */
function addQuota(result, last, opened) {
  if (jstDay(opened) < STRICT_FROM || !result.earliest) return result;
  const q = quotaEarliest(last);
  if (q && q > result.earliest) { result.earliest = q; result.quota = true; }
  return result;
}

/* 純：コメントの本文。 */
function comment(result) {
  /* 前の願い出からの日数、アカウントの作られた日、前に断った願い出は、この issue を直しても変わらない。
   * それらの行だけが通らないときは、直すよう求めない（2026-11-19 の点検で改め、2026-11-24 にアカウントと断った願い出を足した）。 */
  const failed = result.rows.filter((r) => !r[1]).map((r) => r[0]);
  const FIXED = [INTERVAL_LABEL, ACCOUNT_LABEL, REFUSED_ROW];
  const waitOnly = failed.length > 0 && failed.every((l) => FIXED.includes(l));
  const fixedToo = failed.some((l) => FIXED.includes(l));
  const waitToo = failed.includes(INTERVAL_LABEL);
  const why = [
    waitToo ? '前の願い出から ' + INTERVAL_DAYS + ' 日たっていないので、この願い出は受けません。この issue を直しても変わりません。日がたってから、新しい issue で願い出ることができます（叙任の規程「参加のハードル」）。' : '',
    failed.includes(ACCOUNT_LABEL) ? 'この GitHub のアカウントは、issue を開いた日の ' + ACCOUNT_YEARS + ' 年以上前に作られたものと確かめられないので、この願い出は受けません。この issue を直しても変わりません（叙任の規程「参加のハードルの続き」）。' : '',
    failed.includes(REFUSED_ROW) ? 'このアカウントの叙任の願い出を前に断っているので、この願い出は受けません。この issue を直しても変わりません。断った願い出のアカウントからは、二度と願い出を受けません（叙任の規程「参加のハードルの続き」）。' : '',
  ].filter(Boolean).join('\n');
  const verdict = result.ok ? '様式は整っています。'
    : (waitOnly ? '' : '通らなかったところを直し、この issue を編集してください。' + (fixedToo ? '\n' : ''))
      + why;
  const rows = result.rows.map(([label, pass, detail]) => `| ${pass ? '通' : '**不**'} | ${label} | ${String(detail).replace(/[|<>`]/g, '')} |`).join('\n');
  return `${MARK}
**自動の確認**（この issue を直すたびに、もう一度動きます）

| | 確かめたこと | 詳しく |
| --- | --- | --- |
${rows}

${verdict}
${result.earliest ? '叙任を決められるのは、早くて ' + result.earliest + '（日本時間）です。' + (result.quota ? '前の叙任の日を数えずに ' + QUOTA_YEARS + ' 年が過ぎるまで、次の叙任をしません（叙任の規程「参加のハードルの続き」）。\n' : '願い出の issue を開いた日を数えずに ' + WAIT_DAYS + ' 日が過ぎるまで、叙任を決めません（叙任の規程「参加のハードル」）。\n') : ''}${result.document ? DOCUMENT_PENDING + '\n' : ''}この確認は何も決めません。叙任を決めるのは運営者です。この確認は、訂正へのリンクを開きません。運営者は、リンク先が願い出た人自身の誤りの訂正であると読めるかを確かめます（叙任の規程「運営者が確かめること」）。
これは創作であり、遊びです。称号に法的な効力はありません。
`;
}

/* 外へ出す要求は、この一つの fetch だけで、先は GitHub の API だけである。p は 'repos/<このリポジトリ>/…' か 'users/<アカウント>'。 */
async function githubApi(method, p, body) {
  const r = await fetch('https://api.github.com/' + p, {
    method, headers: { Authorization: 'Bearer ' + process.env.GITHUB_TOKEN, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json', 'User-Agent': 'nusquama-knighting' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(method + ' ' + p.replace(/^users\/.*/, 'users') + ': HTTP ' + r.status);
  return r.status === 204 ? null : r.json();
}

async function github(method, p, body) {
  return githubApi(method, 'repos/' + process.env.GITHUB_REPOSITORY + p, body);
}

/* 同じアカウントが開いた叙任のラベルの issue の、番号と開いた時刻。GitHub の API は issue の全体を返すが、この二つのほかは捨てる。
 * 一覧は終わりの頁まで読む。読めなければ throw する（実行が落ち、何も書かない）。 */
async function previousApplications(login, gh = github) {
  if (!login) return null;
  const out = [];
  for (let page = 1; page <= 50; page++) {
    const list = await gh('GET', '/issues?creator=' + encodeURIComponent(login) + '&labels=' + encodeURIComponent(LABEL) + '&state=all&per_page=100&page=' + page);
    if (!Array.isArray(list)) throw new Error('一覧でない答え');
    for (const i of list) out.push({ number: i.number, created_at: i.created_at });
    if (list.length < 100) return out;
  }
  throw new Error('一覧が長すぎる');
}

/* 同じアカウントが開き、運営者がラベル REFUSED_LABEL を付けた叙任の願い出の issue の、番号と開いた時刻。ラベルでの絞り込みは GitHub の API がする。
 * API は issue の全体を返すが、この二つのほかは捨てる。一覧は終わりの頁まで読む。読めなければ throw する（実行が落ち、何も書かない）。 */
async function refusedApplications(login, gh = github) {
  if (!login) return null;
  const out = [];
  for (let page = 1; page <= 50; page++) {
    const list = await gh('GET', '/issues?creator=' + encodeURIComponent(login) + '&labels=' + encodeURIComponent(LABEL + ',' + REFUSED_LABEL) + '&state=all&per_page=100&page=' + page);
    if (!Array.isArray(list)) throw new Error('一覧でない答え');
    for (const r of list) out.push({ number: r.number, created_at: r.created_at });
    if (list.length < 100) return out;
  }
  throw new Error('一覧が長すぎる');
}

/* アカウントが作られた日時。GitHub の公開の API（users）の答えのうち created_at だけを返し、ほかは捨てる。読めなければ throw する。 */
async function accountCreated(login, api = githubApi) {
  if (!login) return null;
  const j = await api('GET', 'users/' + encodeURIComponent(login));
  return (j && typeof j.created_at === 'string') ? j.created_at : null;
}

async function main() {
  const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  const issue = event.issue || {};
  const n = issue.number;
  const opened = issue.created_at || new Date().toISOString();
  /* 受付に戻す決めが点検の記録の行に拠っていなければ、戻さない（止めたままにする）。 */
  const record = fs.readFileSync(path.join(ROOT, 'docs', 'legal-audit-2026-11-12.md'), 'utf8');
  const reopen = reopenProblem(REOPEN, record) === null ? REOPEN : null;
  /* 叙任のラベルの付いた願い出と、受付の停止のあいだに開かれた様式の目印を持つラベルのない issue のほかには、何もしない。題も本文も記録に写さない。 */
  const kind = target(issue, opened, reopen);
  if (!kind) { console.log('扱わない issue'); return; }
  const mine0 = ((await github('GET', '/issues/' + n + '/comments?per_page=100')) || []).find((c) => c.user.type === 'Bot' && c.body.startsWith(MARK));
  /* ラベルのない issue（'formlike'）は、target が停止のあいだに開かれたものに限っている。 */
  if (paused(opened, reopen)) {
    /* 受付の停止のあいだに開かれた願い出：訂正へのリンクも開かず、停止を書いて閉じる（完了ではなく、受けないものとして）。 */
    const body = pauseComment();
    if (mine0) await github('PATCH', '/issues/comments/' + mine0.id, { body });
    else await github('POST', '/issues/' + n + '/comments', { body });
    /* 題と本文を断りに替え、閉じて、書き込みを止める。届いた中身を、issue の上に運営者の記録として残さない。 */
    await github('PATCH', '/issues/' + n, { title: PAUSE_TITLE, body: pauseBody() });
    await github('PATCH', '/issues/' + n, { state: 'closed', state_reason: 'not_planned' });
    await github('PUT', '/issues/' + n + '/lock', { lock_reason: 'resolved' });
    console.log('受付の停止のあいだ');
    return;
  }
  const form = parse(issue.body);
  const result = check(form, opened);
  addDocument(result, form, opened, reopen);
  if (jstDay(opened) >= HURDLE_FROM) addInterval(result, await previousApplications(issue.user && issue.user.login), opened, n, reopen);
  if (jstDay(opened) >= STRICT_FROM) {
    const login = issue.user && issue.user.login;
    addAccount(result, await accountCreated(login), opened);
    addRefused(result, await refusedApplications(login), opened, n, reopen);
    addQuota(result, lastKnighted(fs.readFileSync(path.join(ROOT, 'KNIGHTS.md'), 'utf8')), opened);
  }
  const body = comment(result);
  const mine = mine0;
  if (mine) await github('PATCH', '/issues/comments/' + mine.id, { body });
  else await github('POST', '/issues/' + n + '/comments', { body });
  console.log(result.ok ? '整っている' : '整っていない');
}

module.exports = { DOCUMENT, DOCUMENT_LABEL, DOCUMENT_DAYS, DOCUMENT_PENDING, documentDue, addDocument, STRICT_FROM, OWN, PUBLISHED_FIELD, PUBLISHED_DAYS, ACCOUNT_YEARS, QUOTA_YEARS, REFUSED_LABEL, VENUES, venueOf, realDay, publishedProblem, yearsAfter, accountProblem, refusedProblem, lastKnighted, quotaEarliest,
  ACCOUNT_LABEL, addAccount, REFUSED_ROW, addRefused, addQuota, refusedApplications, accountCreated, githubApi, FINDING, FINDING_POINTS, READ_UNSETTLED, findingProblem, JAPANESE_FROM, JAPANESE, ABROAD_FROM, ABROAD, HURDLE_FROM, AGE, PLACES_FIELD, PLACE_WORDS, PLACES_MIN, INTERVAL_DAYS, WAIT_DAYS, placesNamed, intervalProblem, INTERVAL_LABEL, addInterval, earliestDecision, previousApplications, LABEL, formMarkers, formLike, target, PAUSE_FROM, REOPEN, reopenProblem, PAUSE_TEXT, PAUSE_TEXT_EN, paused, pauseComment, FORM, PAUSE_TITLE, PAUSE_BODY, PAUSE_BODY_EN, pauseBody, github, main, MARK, PRESENCE_FROM, PRESENCE, NATIONALITY_FROM, NATIONALITY, PREMISE_FROM, PREMISE, FOREIGN_FROM, FOREIGN, DATED, CLOSED, linkProblem, requiredOaths, parse, check, comment, jstDay };

if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });

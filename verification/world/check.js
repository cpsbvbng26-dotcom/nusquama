#!/usr/bin/env node
/* The survey of the world's constitutions and codes (tools/world.js): the checks, and the break tests that show each
 * check can fail. verification/check.js runs it; it can also run alone.
 *
 *   node verification/world/check.js
 *
 * What it holds:
 * - the list of countries is the 193 members of the United Nations and the 2 observer states, each once;
 * - every kept provision has its country, instrument, article, language, text, source address, day and SHA-256,
 *   and the SHA-256 is the hash of the text;
 * - coverage.json is what tools/world.js makes from data/ (not edited by hand), with one row for each of the 195,
 *   and "none found" only where a fetched text was searched for that topic;
 * - every kept provision has a classification with a reason (a rule, or a decision made on the same text, the same
 *   SHA-256), classes.json is what the decisions make of data/, and every provision
 *   classified as applying or as possibly applying has a reason and a proposed action;
 * - the numbers the survey record writes in its prose are the numbers counted here.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..', '..');
const DIR = __dirname;
const sha = (x) => crypto.createHash('sha256').update(x, 'utf8').digest('hex');
const RECORD = 'docs/world-law-2026-11-12.md';
const CLASSES = ['applies', 'could apply', 'does not apply'];

function state() {
  const rd = (f) => fs.readFileSync(path.join(DIR, f), 'utf8');
  const data = {};
  for (const f of fs.readdirSync(path.join(DIR, 'data')).sort()) data[f] = JSON.parse(rd('data/' + f));
  return {
    countries: JSON.parse(rd('countries.json')).countries,
    sources: JSON.parse(rd('sources.json')),
    data,
    coverage: rd('coverage.json'),
    classes: JSON.parse(rd('classes.json')),
    decisions: JSON.parse(rd('decisions.json')),
    record: fs.readFileSync(path.join(ROOT, RECORD), 'utf8'),
  };
}

/* The numbers the record states, counted from the state. */
function counts(S) {
  const rows = JSON.parse(S.coverage).countries;
  const topics = Object.keys(S.sources.topics);
  const provs = Object.values(S.data).flatMap((d) => d.provisions);
  const cls = S.classes.provisions;
  const n = {
    countries: S.countries.length,
    constitutions: rows.filter((r) => r.constitution.some((c) => c.fetched)).length,
    provisions: provs.length,
    applies: provs.filter((p) => (cls[p.id] || {}).class === 'applies').length,
    could: provs.filter((p) => (cls[p.id] || {}).class === 'could apply').length,
    sources: Object.values(S.data).reduce((a, d) => a + Object.keys(d.sources).length, 0),
  };
  for (const t of topics) {
    n['fetched:' + t] = rows.filter((r) => r.topics[t].state !== 'not fetched').length;
    n['found:' + t] = rows.filter((r) => r.topics[t].state === 'found').length;
  }
  return n;
}

function verdict(S, coverageOf, classesOf) {
  const bad = [];
  /* The countries. */
  const isos = S.countries.map((c) => c.iso3);
  const members = S.countries.filter((c) => c.un === 'member').length, observers = S.countries.filter((c) => c.un === 'observer').length;
  if (S.countries.length !== 195 || members !== 193 || observers !== 2 || new Set(isos).size !== 195 || !isos.every((i) => /^[A-Z]{3}$/.test(i))) bad.push('国の一覧が加盟国 193 とオブザーバー 2 ではない（' + members + ' と ' + observers + '）');
  /* The provisions. */
  const ids = new Set();
  const need = ['id', 'source', 'country', 'instrument', 'article', 'lang', 'text', 'url', 'fetched', 'sha256'];
  for (const [f, d] of Object.entries(S.data)) {
    if (f !== d.country + '.json') bad.push(f + '：ファイルの名と国が違う');
    if (!d.country.startsWith('_') && !isos.includes(d.country)) bad.push(f + '：一覧にない国');
    for (const p of d.provisions) {
      const miss = need.filter((k) => typeof p[k] !== 'string' || !p[k]);
      if (miss.length) bad.push(p.id + '：欄がない（' + miss.join('・') + '）');
      if (sha(p.text || '') !== p.sha256) bad.push(p.id + '：SHA-256 が文と合わない');
      if (ids.has(p.id)) bad.push(p.id + '：同じ識別子が二つある');
      ids.add(p.id);
      if (!d.sources[p.source] || d.sources[p.source].error) bad.push(p.id + '：取り寄せた記録のない出典');
      if (!/^https?:\/\//.test(p.url || '') || !/^\d{4}-\d{2}-\d{2}$/.test(p.fetched || '')) bad.push(p.id + '：所在か日付の形が違う');
    }
  }
  /* The coverage table. */
  if (S.coverage !== coverageOf(S)) bad.push('coverage.json が data/ から作ったものと違う（手で直したか、作り直していない）');
  const rows = JSON.parse(S.coverage).countries;
  const topics = Object.keys(S.sources.topics);
  if (rows.length !== 195 || !isos.every((i) => rows.some((r) => r.country === i))) bad.push('網羅の表に、195 の国のどれかの行がない');
  for (const r of rows) {
    if (!r.constitution.length) bad.push(r.country + '：憲法の欄がない');
    for (const c of r.constitution) if (!c.fetched && !c.reason) bad.push(r.country + '：取り寄せなかった憲法に理由がない');
    for (const t of topics) {
      const x = r.topics[t];
      if (!x) { bad.push(r.country + '：' + t + ' の欄がない'); continue; }
      if (x.state === 'not fetched' && !x.reason) bad.push(r.country + '：' + t + ' を取り寄せなかった理由がない');
      if (x.state === 'none' && !(x.searched || []).length) bad.push(r.country + '：' + t + ' の「見当たらない」に、探した文がない');
      if (x.state === 'found' && !(x.provisions || []).every((id) => ids.has(id))) bad.push(r.country + '：' + t + ' に、記していない条');
    }
  }
  /* Classifications: classes.json is what the decisions make of data/ (not edited by hand). */
  if (JSON.stringify(S.classes.provisions) !== JSON.stringify(classesOf(S))) bad.push('classes.json が data/ と decisions.json から作ったものと違う（手で直したか、作り直していない）');
  const cls = S.classes.provisions || {};
  for (const d of Object.values(S.data)) for (const p of d.provisions) {
    const c = cls[p.id];
    if (!c) { bad.push(p.id + '：分類がない'); continue; }
    const src = c.by === 'read' ? (S.decisions.provisions || {})[p.id] : (S.decisions.rules || []).find((r) => r.id === c.by);
    if (c.by === 'read' && (!src || src.sha256 !== p.sha256)) bad.push(p.id + '：一つずつ読んだ決めが別の文に対するもの');
    if (!CLASSES.includes(c.class) || !src || !src.reason) bad.push(p.id + '：分類か理由の形が違う');
    if (c.class !== 'does not apply' && (!c.action || !['Nusquama', 'Sophaxis', 'both'].includes(c.project) || !['高', '中', '低'].includes(c.severity))) bad.push(p.id + '：当たる・当たりうる条に、計画・対象・重さがない');
  }
  for (const id of Object.keys(cls)) if (!ids.has(id)) bad.push(id + '：記していない条の分類');
  /* The record's numbers. */
  const n = counts(S);
  const say = [
    ['国と地域の数', '国連の加盟国 193 とオブザーバー国家 2 の、あわせて ' + n.countries + ' か国'],
    ['憲法', '憲法の文を取り寄せて調べたのは ' + n.constitutions + ' か国'],
    ['条の数', '当たった条は ' + n.provisions + ' 件'],
    ['当たる', '「当たる」が ' + n.applies + ' 件'],
    ['当たりうる', '「当たりうる」が ' + n.could + ' 件'],
  ];
  for (const t of topics) say.push([t, '| ' + S.sources.topics[t].split('：')[0].split('（')[0] + ' | ' + n['fetched:' + t] + ' | ' + n['found:' + t] + ' |']);
  for (const [k, s] of say) if (!S.record.includes(s)) bad.push('記録の数が数えた数と違う：' + k + '（「' + s + '」がない）');
  if (!S.record.includes('弁護士の確認は受けていません。')) bad.push('記録に、弁護士の確認を受けていないという文がない');
  return bad;
}

function run(ok) {
  const W = require('../../tools/world.js');
  const coverageOf = (S) => W.coverageText(S.countries, S.sources, S.data);
  const classesOf = (S) => { const { out } = W.classifyAll(S.data, S.decisions); return Object.fromEntries(Object.keys(out).sort((a, b) => a.localeCompare(b, 'en', { numeric: true })).map((k) => [k, out[k]])); };
  const S = state();
  const bad = verdict(S, coverageOf, classesOf);
  const n = counts(S);
  ok('各国の法令の調べ：195 の国の一覧、当たった ' + n.provisions + ' 件の条の SHA-256、網羅の表（data/ から作ったまま）、分類と計画、記録の数がそろう', bad.length === 0, bad.slice(0, 12).join(' / ') + (bad.length > 12 ? ' ほか ' + (bad.length - 12) + ' 件' : ''));
  /* Break tests: each change must make the verdict fail. */
  const clone = () => JSON.parse(JSON.stringify(Object.assign({}, S, { coverage: S.coverage, record: S.record })));
  const first = (T) => Object.values(T.data).find((d) => d.provisions.length);
  const breaks = [
    ['条の文を一字変える', (T) => { const p = first(T).provisions[0]; p.text = p.text.replace(/.$/, 'X'); }],
    ['条の SHA-256 を変える', (T) => { first(T).provisions[0].sha256 = '0'.repeat(64); }],
    ['条の所在を消す', (T) => { delete first(T).provisions[0].url; }],
    ['国を一つ一覧から消す', (T) => { T.countries.pop(); }],
    ['網羅の表から国の行を一つ消す', (T) => { const c = JSON.parse(T.coverage); c.countries.pop(); T.coverage = JSON.stringify(c); }],
    ['取り寄せていない主題を「見当たらない」に替える', (T) => { const c = JSON.parse(T.coverage); const r = c.countries.find((x) => Object.values(x.topics).some((y) => y.state === 'not fetched')); const k = Object.keys(r.topics).find((y) => r.topics[y].state === 'not fetched'); r.topics[k] = { state: 'none', searched: [] }; T.coverage = JSON.stringify(c); }],
    ['取り寄せた記録を失敗に替える', (T) => { const d = first(T); d.sources[d.provisions[0].source].error = 'x'; }],
    ['条の分類を消す', (T) => { delete T.classes.provisions[first(T).provisions[0].id]; }],
    ['分類の決めを、ない決めの名に替える', (T) => { T.classes.provisions[first(T).provisions[0].id].by = 'X-none'; }],
    ['当たりうる条から計画を消す', (T) => { const c = Object.values(T.classes.provisions).find((x) => x.class !== 'does not apply'); delete c.action; }],
    ['分類を手で「当たらない」に書き換える', (T) => { const c = Object.values(T.classes.provisions).find((x) => x.class !== 'does not apply'); c.class = 'does not apply'; }],
    ['一つずつ読んだ決めの元の文の値を変える', (T) => { const k = Object.keys(T.decisions.provisions)[0]; T.decisions.provisions[k].sha256 = '0'.repeat(64); }],
    ['記録の条の数を変える', (T) => { T.record = T.record.replace('当たった条は ' + n.provisions + ' 件', '当たった条は ' + (n.provisions + 1) + ' 件'); }],
    ['記録から弁護士の文を消す', (T) => { T.record = T.record.replace('弁護士の確認は受けていません。', ''); }],
  ];
  const caught = breaks.filter(([, f]) => { const T = clone(); f(T); return verdict(T, coverageOf, classesOf).length > 0; }).map(([k]) => k);
  ok('各国の法令の調べを壊して確かめる：文・値・所在・国・網羅の行・見当たらないの偽り・取り寄せの失敗・分類・計画・記録の数・弁護士の文のどれでも落ちる（' + caught.length + ' / ' + breaks.length + '）', caught.length === breaks.length, breaks.filter(([k]) => !caught.includes(k)).map(([k]) => k).join(' / '));
}

module.exports = { run, verdict, counts, state };
if (require.main === module) {
  let pass = 0, fail = 0;
  run((label, cond, detail) => { if (cond) { pass++; console.log('  通  ' + label); } else { fail++; console.log('  落  ' + label + (detail ? ' —— ' + detail : '')); } });
  if (fail) process.exit(1);
}

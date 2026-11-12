#!/usr/bin/env node
/* probe version */
'use strict';
const fs = require('fs');
const path = require('path');
const { pdfText } = require('./pdftext.js');
const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'verification', 'world');
const UA = 'nusquama-world-law-survey (https://github.com/cpsbvbng26-dotcom/nusquama)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, opt = {}) {
  let res, err;
  for (let k = 0; k < 3 && !res; k++) {
    try { res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': opt.lang || 'en', ...(opt.accept ? { Accept: opt.accept } : {}) }, redirect: 'follow', signal: AbortSignal.timeout(90000) }); }
    catch (e) { err = String(e.message || e) + (e.cause ? ' (' + (e.cause.code || e.cause.message) + ')' : ''); await sleep(5000); }
  }
  if (!res) return { error: err };
  const bytes = Buffer.from(await res.arrayBuffer());
  return { status: res.status, type: res.headers.get('content-type') || '', final: res.url, bytes };
}

function decode(r) {
  if (/pdf/i.test(r.type) || r.bytes.subarray(0, 5).toString('latin1') === '%PDF-') return pdfText(r.bytes);
  const cs = ((/charset=["']?([\w-]+)/i.exec(r.type) || /<meta[^>]+charset=["']?([\w-]+)/i.exec(r.bytes.subarray(0, 4096).toString('latin1')) || [])[1] || 'utf-8').toLowerCase();
  try { return new TextDecoder(['sjis', 'x-sjis'].includes(cs) ? 'shift_jis' : cs).decode(r.bytes); } catch (e) { return r.bytes.toString('utf8'); }
}

async function probe(urls) {
  for (const u of urls) {
    const r = await get(u);
    if (r.error) { console.log('PROBE', u, 'ERROR', r.error); continue; }
    const t = decode(r);
    const plain = t.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    console.log('PROBE', u, r.status, r.type, r.final === u ? '' : '-> ' + r.final, 'bytes=' + r.bytes.length, 'plain=' + plain.length);
    console.log('  HEAD ' + plain.slice(0, 500));
    console.log('  RAW ' + t.slice(+(process.env.RAW_FROM||0), +(process.env.RAW_FROM||0) + (+(process.env.RAW_LEN || 300))).replace(/\s+/g, ' '));
    await sleep(2000);
  }
}

async function main() {
  const req = JSON.parse(fs.readFileSync(path.join(DIR, 'request.json'), 'utf8'));
  const batch = process.env.WORLD_BATCH || req.batch;
  if (batch === 'probe') return probe(req.probe || []);
}
main();

#!/usr/bin/env node
/* Reads the text of a PDF with nothing but Node.js (zlib), for tools/sources.js.
 * It covers what the official PDFs read by the review use: object streams, Flate streams, Type0 fonts with a
 * ToUnicode map, simple fonts (WinAnsi), and text inside form XObjects. The order of the text is the order of the
 * content streams. Lines are joined with a space, except between two non-ASCII characters (Japanese lines break
 * inside words). It is not a general PDF reader: quotations are taken from what it gives, and the check compares
 * them with what it gives, so the two always agree.
 *
 *   node tools/pdftext.js file.pdf
 */
'use strict';
const zlib = require('zlib');

function inflate(b) {
  try { return zlib.inflateSync(b); } catch (e) {
    try { return zlib.inflateSync(b, { finishFlush: zlib.constants.Z_SYNC_FLUSH }); } catch (e2) { return Buffer.alloc(0); }
  }
}

/* The raw value of a key in a dictionary written as text: a balanced << >> or [ ], a reference, or one token. */
function entry(dict, key) {
  const m = new RegExp('/' + key + '(?![A-Za-z0-9])\\s*').exec(dict);
  if (!m) return null;
  let i = m.index + m[0].length;
  if (dict.startsWith('<<', i) || dict[i] === '[') {
    const open = dict[i] === '[' ? '[' : '<<', close = open === '[' ? ']' : '>>';
    let depth = 0, j = i;
    while (j < dict.length) {
      if (dict.startsWith(open, j)) { depth++; j += open.length; continue; }
      if (dict.startsWith(close, j)) { depth--; j += close.length; if (!depth) return dict.slice(i, j); continue; }
      j++;
    }
    return dict.slice(i);
  }
  const r = /^(\d+)\s+(\d+)\s+R/.exec(dict.slice(i));
  if (r) return r[0];
  return (/^[^\s/<>\[\]()]+|^\/[^\s/<>\[\]()]+/.exec(dict.slice(i)) || [''])[0];
}

function pdfText(buf) {
  const s = buf.toString('latin1');
  const objs = new Map();
  const re = /(\d+)\s+(\d+)\s+obj\b/g;
  let m;
  const lengthOf = (v) => {
    if (!v) return null;
    const r = /^(\d+)\s+\d+\s+R$/.exec(v);
    if (!r) return /^\d+$/.test(v) ? +v : null;
    const d = new RegExp('(?:^|\\s)' + r[1] + '\\s+\\d+\\s+obj\\s*(\\d+)\\s*endobj').exec(s);
    return d ? +d[1] : null;
  };
  while ((m = re.exec(s))) {
    const start = m.index + m[0].length;
    const si = s.indexOf('stream', start), ei = s.indexOf('endobj', start);
    if (ei < 0) break;
    if (si >= 0 && si < ei) {
      const dict = s.slice(start, si);
      let ds = si + 6;
      if (s[ds] === '\r') ds++;
      if (s[ds] === '\n') ds++;
      const n = lengthOf(entry(dict, 'Length'));
      const de = n !== null && /^\s*endstream/.test(s.slice(ds + n, ds + n + 20)) ? ds + n : s.indexOf('endstream', ds);
      objs.set(+m[1], { dict, raw: buf.subarray(ds, de) });
      re.lastIndex = s.indexOf('endobj', de) + 6;
    } else {
      objs.set(+m[1], { dict: s.slice(start, ei), raw: null });
      re.lastIndex = ei + 6;
    }
  }
  const data = (o) => (o.data || (o.data = /FlateDecode/.test(o.dict) ? inflate(o.raw) : o.raw));
  // Objects kept inside object streams.
  for (const o of [...objs.values()]) {
    if (!/\/Type\s*\/ObjStm/.test(o.dict)) continue;
    const t = data(o).toString('latin1');
    const first = +entry(o.dict, 'First'), n = +entry(o.dict, 'N');
    const head = t.slice(0, first).trim().split(/\s+/).map(Number);
    for (let k = 0; k < n; k++) {
      const num = head[2 * k], off = head[2 * k + 1], next = k + 1 < n ? head[2 * k + 3] : t.length - first;
      if (!objs.has(num)) objs.set(num, { dict: t.slice(first + off, first + next), raw: null });
    }
  }
  const ref = (v) => { const r = /^(\d+)\s+\d+\s+R/.exec(v || ''); return r ? objs.get(+r[1]) : null; };
  const resolve = (v) => { const o = ref(v); return o ? o.dict : v; };

  const cmapCache = new Map();
  function font(dictText) {
    if (cmapCache.has(dictText)) return cmapCache.get(dictText);
    const f = { map: new Map(), bytes: 1 };
    const tu = ref(entry(dictText, 'ToUnicode'));
    if (/\/Type0/.test(dictText)) f.bytes = 2;
    if (tu) {
      const c = data(tu).toString('latin1');
      const hex = (h) => { let out = ''; for (let i = 0; i + 4 <= h.length; i += 4) out += String.fromCharCode(parseInt(h.slice(i, i + 4), 16)); return out; };
      const cs = /begincodespacerange\s*<([0-9A-Fa-f]+)>/.exec(c);
      if (cs && f.bytes === 2) f.bytes = cs[1].length / 2; // a simple font reads one byte a code, whatever its map declares
      for (const b of c.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
        for (const p of b[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]*)>/g)) f.map.set(parseInt(p[1], 16), hex(p[2]));
      }
      for (const b of c.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
        for (const p of b[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*(<[0-9A-Fa-f]*>|\[[^\]]*\])/g)) {
          const lo = parseInt(p[1], 16), hi = parseInt(p[2], 16);
          if (p[3][0] === '[') {
            const list = [...p[3].matchAll(/<([0-9A-Fa-f]*)>/g)].map((x) => hex(x[1]));
            for (let c2 = lo; c2 <= hi && c2 - lo < list.length; c2++) f.map.set(c2, list[c2 - lo]);
          } else {
            const base = p[3].slice(1, -1);
            const last = parseInt(base.slice(-4), 16);
            for (let c2 = lo; c2 <= hi; c2++) f.map.set(c2, hex(base.slice(0, -4)) + String.fromCharCode(last + c2 - lo));
          }
        }
      }
    }
    cmapCache.set(dictText, f);
    return f;
  }
  const decode = (f, bytes) => {
    let out = '';
    for (let i = 0; i + f.bytes <= bytes.length; i += f.bytes) {
      const code = f.bytes === 2 ? (bytes[i] << 8) | bytes[i + 1] : bytes[i];
      out += f.map.has(code) ? f.map.get(code) : (f.bytes === 1 ? String.fromCharCode(code) : '');
    }
    return out;
  };
  function literal(t, i) { // t[i] === '('
    const out = [];
    let depth = 1; i++;
    while (i < t.length && depth) {
      const ch = t[i];
      if (ch === '\\') {
        const n = t[i + 1];
        const esc = { n: 10, r: 13, t: 9, b: 8, f: 12, '(': 40, ')': 41, '\\': 92 };
        if (n in esc) { out.push(esc[n]); i += 2; continue; }
        const o = /^[0-7]{1,3}/.exec(t.slice(i + 1, i + 4));
        if (o) { out.push(parseInt(o[0], 8) & 255); i += 1 + o[0].length; continue; }
        if (n === '\r' || n === '\n') { i += 2; if (n === '\r' && t[i] === '\n') i++; continue; }
        i++; continue;
      }
      if (ch === '(') depth++;
      if (ch === ')') { depth--; if (!depth) { i++; break; } }
      out.push(t.charCodeAt(i) & 255); i++;
    }
    return [Buffer.from(out), i];
  }

  const pieces = [];
  function run(content, resources, depth) {
    if (depth > 8) return;
    const fontsDict = resolve(entry(resources, 'Font') || '') || '';
    const xobjDict = resolve(entry(resources, 'XObject') || '') || '';
    const t = content.toString('latin1');
    let i = 0, cur = null, stack = [], lastY = null;
    const nl = () => pieces.push('\n');
    while (i < t.length) {
      const ch = t[i];
      if (/\s/.test(ch)) { i++; continue; }
      if (ch === '%') { while (i < t.length && t[i] !== '\n' && t[i] !== '\r') i++; continue; }
      if (ch === '(') { const [b, j] = literal(t, i); stack.push({ str: b }); i = j; continue; }
      if (ch === '<' && t[i + 1] !== '<') { const j = t.indexOf('>', i); const h = t.slice(i + 1, j).replace(/\s+/g, ''); stack.push({ str: Buffer.from(h.length % 2 ? h + '0' : h, 'hex') }); i = j + 1; continue; }
      if (ch === '<' || ch === '>') { i += 2; stack.push({ dict: true }); continue; }
      if (ch === '[') { stack.push({ mark: true }); i++; continue; }
      if (ch === ']') { const arr = []; while (stack.length && !stack[stack.length - 1].mark) arr.unshift(stack.pop()); stack.pop(); stack.push({ arr }); i++; continue; }
      if (ch === '/') { const mm = /^\/[^\s/<>\[\]()%{}]*/.exec(t.slice(i, i + 128)); stack.push({ name: mm[0].slice(1) }); i += mm[0].length; continue; }
      const mm = /^[^\s/<>\[\]()%{}]+/.exec(t.slice(i, i + 64));
      if (!mm) { i++; continue; }
      const tok = mm[0]; i += tok.length;
      if (/^[-+.\d]+$/.test(tok)) { stack.push({ num: +tok }); continue; }
      if (tok === 'BI') { const e = t.indexOf('EI', i); i = e < 0 ? t.length : e + 2; stack = []; continue; }
      if (tok === 'Tf') {
        const name = (stack[stack.length - 2] || {}).name;
        const fd = name ? resolve(entry(fontsDict, name) || '') : '';
        cur = font(fd || '');
      } else if ((tok === 'Tj' || tok === "'" || tok === '"') && cur) {
        if (tok !== 'Tj') nl();
        pieces.push(decode(cur, stack[stack.length - 1].str || Buffer.alloc(0)));
      } else if (tok === 'TJ' && cur) {
        for (const e of (stack[stack.length - 1].arr || [])) if (e.str) pieces.push(decode(cur, e.str));
      } else if (tok === 'T*' || tok === 'ET') nl();
      else if (tok === 'Td' || tok === 'TD') { if ((stack[stack.length - 1] || {}).num) nl(); }
      else if (tok === 'Tm') { const y = (stack[stack.length - 1] || {}).num; if (lastY !== null && y !== lastY) nl(); lastY = y; }
      else if (tok === 'Do') {
        const name = (stack[stack.length - 1] || {}).name;
        const x = name ? ref(entry(xobjDict, name)) : null;
        if (x && /\/Subtype\s*\/Form/.test(x.dict)) run(data(x), resolve(entry(x.dict, 'Resources') || '') || resources, depth + 1);
      }
      stack = [];
    }
  }

  // The pages, in the order of the page tree.
  const rootPages = [...objs.values()].find((o) => /\/Type\s*\/Pages\b/.test(o.dict) && !/\/Parent\s/.test(o.dict));
  const walk = (o, inherited) => {
    if (!o) return;
    const res = entry(o.dict, 'Resources') ? resolve(entry(o.dict, 'Resources')) : inherited;
    if (/\/Type\s*\/Pages\b/.test(o.dict)) {
      for (const k of (entry(o.dict, 'Kids') || '').matchAll(/(\d+)\s+\d+\s+R/g)) walk(objs.get(+k[1]), res);
      return;
    }
    const c = entry(o.dict, 'Contents') || '';
    const parts = [...c.matchAll(/(\d+)\s+\d+\s+R/g)].map((k) => objs.get(+k[1])).filter(Boolean);
    run(Buffer.concat(parts.map(data).flatMap((b) => [b, Buffer.from('\n')])), res || '', 0);
    pieces.push('\n');
  };
  walk(rootPages, '');
  return pieces.join('').replace(/[ \t]*\n[ \t]*/g, '\n')
    .replace(/([^\x00-\x7F])\n(?=[^\x00-\x7F])/g, '$1').replace(/\s+/g, ' ').trim();
}

module.exports = { pdfText };

if (require.main === module) process.stdout.write(pdfText(require('fs').readFileSync(process.argv[2])) + '\n');

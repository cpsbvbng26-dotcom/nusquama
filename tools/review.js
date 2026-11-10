#!/usr/bin/env node
/* 年一回の総点検の issue の本文を、国の仕組み「年一回の総点検」の節から作る。節の箇条を、そのまま印の欄にする。
 *
 *   node tools/review.js [年]
 */
'use strict';
const fs = require('fs');
const path = require('path');

function body(year) {
  const md = fs.readFileSync(path.join(__dirname, '..', 'INSTITUTIONS.md'), 'utf8');
  const i = md.indexOf('\n## 年一回の総点検\n');
  if (i < 0) throw new Error('国の仕組みに「年一回の総点検」の節がない');
  const part = md.slice(i + 1, md.indexOf('\n## ', i + 5));
  const items = part.split('\n').filter((l) => l.startsWith('- ')).map((l) => '- [ ] ' + l.slice(2));
  if (!items.length) throw new Error('点検の箇条がない');
  return '> これは創作であり、遊びです。この issue は、創作の国の決まりの点検です。\n\n'
    + year + ' 年の総点検です。国の仕組み「年一回の総点検」の箇条を、そのまま並べています。\n\n' + items.join('\n')
    + '\n\n点検を終えたら、結果を一行で書いて閉じます。\n';
}

module.exports = { body };
if (require.main === module) process.stdout.write(body(process.argv[2] || String(new Date().getUTCFullYear())));

# nusquama

無何有騎士王国ヌスクァマ。遊びとしての創作。研究の系列（Sophaxis・プロフィール・論文）とはつながない。

## 決めごと

1. 創作であることを、どの頁でも断る。実在の国家・王室・騎士団・叙勲・称号と紛れる書き方をしない。
2. 称号に法的な効力を持たせる書き方をしない。称号を売らない。寄付も広告も受けない。
3. 基本法の第一条・第六条・第八条は削らない。
4. 研究の系列の名やリンクを、ここに書かない。研究の系列からも、ここへつながない。
5. `site/` は生成物。README・KNIGHTS.md・policies/*.md を直して `node build.js`。手で直さない。
6. `assets/` は手で置いたもの。国章を変えたら `node tools/icons.js`（要 playwright）でアイコンを描き直す。
7. 規程の約束の文は `verification/check.js` が固めている。弱めない。
8. Claude を騎士・王・著者にしない。

```
node build.js
node verification/check.js
```

サイトは Vercel の `nusquama` プロジェクトが `site/` を根にして配る。

# Legal handling of the design

Last updated: 2026-11-23.

This is an English translation. The [Japanese version](./design.md) governs; if the two differ, the Japanese version applies.

## About this page

This page records, for each visual part of the site, who made it, where it came from, what rights and licence apply to it, and which articles of which laws it touches.
The parts are the typefaces, the emblem, the flag, the favicons, the icons and the image shown when a page is shared, the map of the domain and the figures inside pages, and the colours and the layout.
It sets out the operator's own understanding. It is not legal advice, and no lawyer has reviewed it.
The articles are quoted as they stand in the copy in [verification/statutes-texts.json](../verification/statutes-texts.json) in this repository (commit 85dd680, fetched from the e-Gov law API on 2026-11-22). The weekly watch fetched and recorded that copy.
The English descriptions of the articles on this page are summaries, not translations. Each article is quoted in the Japanese original.
The trade mark handling of the names, the flag and the emblem, the search record, and the steps when a rights holder writes are in [Names and rights](./names.en.md). This page does not repeat them; it links there.
The owner asked for this page on 2026-11-22, and Claude wrote it.

## List of parts

The only images the site serves are those listed in the "File" column of the table below.
The figures inside pages, the typefaces, and the colours and layout are not served as image files.

| Part | File | How it was made, and where it came from | Rights and licence | How it is checked |
| --- | --- | --- | --- | --- |
| Emblem | `emblem.svg` | Drawn by Claude Code at the operator's request, with rectangles and polygons only, and placed in assets/ | CC BY 4.0 | The checks confirm that it uses only the colours of the kingdom and no shapes other than rectangles and polygons |
| Flag | `flag.svg` | Drawn by Claude Code at the operator's request, with rectangles only, and placed in assets/ | CC BY 4.0 | As for the emblem |
| Square favicon | `favicon.svg` | Made by `tools/favicon.js`, which puts the emblem inside a navy square | CC BY 4.0 | The checks confirm that it is the same as one made again from the emblem |
| Small favicon | `favicon.ico` | Made by `tools/icons.js`, which draws the emblem in a browser (16, 32 and 48 px) | CC BY 4.0 | The checks confirm that no pixel is red or white |
| Icons | `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` | Made by `tools/icons.js` in the same way | CC BY 4.0 | As for the small favicon |
| Image shown when a page is shared | `og.png` | Made by `tools/icons.js` in the same way (1200 × 630 px) | CC BY 4.0 | As for the small favicon |
| Map of the domain | `territory.svg`, `territory-<year>.svg` | Drawn by `build.js` from the King's errata | CC BY 4.0 | As for the emblem. The checks also confirm that site/ is the same as the output of build.js |
| Figures inside pages | None | Drawn by `build.js` inside the pages of the errata, the domain year by year, and the construction of the symbols | CC BY 4.0 | As for the map of the domain |
| Typefaces | None | Not served. The site only names typefaces on the reader's device | The typefaces named belong to their owners | The checks confirm that there is no font file and no rule that loads a font file (font-face) |
| Colours and layout | None | The style in `build.js` is put into a `<style>` on each page | CC BY 4.0 | The checks confirm the contrast ratios, and that nothing is loaded from outside |

### Typefaces

The site serves no font file.
The style has no rule that loads a font file (font-face), and loads no typeface from outside.
The style sets typefaces in **2** places. Each only names, in order, typefaces that may be on the reader's device.
If none of the named typefaces is on the device, the generic typeface (`serif`, `ui-monospace` or `monospace`) is used.
The typefaces named are on the reader's device and belong to their owners.
The emblem, the flag and the map of the domain use no typeface ("Typeface" in [Symbols](../SYMBOLS.en.md)).

### Figures inside pages

The figures inside pages are drawn by `build.js` when it makes the pages of the errata, the domain year by year, and the construction of the symbols.
Every figure is made only of rectangles and polygons in the colours of the kingdom, and draws no letters.
Every figure has a title.

### Colours and layout

The colours and the layout are set by one style in `build.js`.
The style is put into a `<style>` on each page, and no outside stylesheet is read.
No page loads anything from another server (`default-src 'none'` in the CSP).

The depth of the pages is also set in the same style, as steps of height.
There are **4** steps of height. From back to front: the ground (the page background), surfaces (the notice boxes, the entry cards and the tables), raised surfaces (on wide screens, the sheet that carries the text; on the top page, the notice box, the flag and the map), and the front (the band at the top of the page, and a card under the pointer).
There are **3** shadows: `--e1`, `--e2` and `--e3`.
The ground has no shadow; surfaces use `--e1`, raised surfaces `--e2`, and the front `--e3`.
Light comes from one direction, the upper left, and every shadow falls to the lower right.
In the dark scheme, shadows are shorter, and height is shown by the difference in the lightness of surfaces and by a light on the top and left edges.
The emblem, the flag and the map of the domain keep their shapes and colours. Only a frame and a shadow bring them forward.
The entry cards, and the flag and the map on the top page, cast a deeper shadow and rise by **2** px when the pointer is over them or when they have the focus.
No motion (animation or transition) is used; the position changes at once. When the device asks for reduced motion, the position does not change, and only the shadow deepens.
Spacing is taken from **7** steps of variables, and the rounding of corners from **3**.
On screens **840** px wide or wider, the text sits on a sheet, and a line holds about **37** full-width characters.
In print, shadows, blurs and gradients of surfaces are removed, and the page is flat again.
The owner asked for the depth on 2026-11-23, and Claude decided it.

## Copyright

In summary, Article 2(1)(i) of the Copyright Act defines a work as a creative expression of thoughts or sentiments within the literary, scientific, artistic or musical domain.
In summary, Article 10(1)(iv) of the same Act gives paintings, engravings, sculptures and other artistic works as an example of works.
Whether the emblem, the flag, the icons, the map of the domain and the figures inside pages are artistic works is not decided by the text of the articles alone.
Each of them is a figure that arranges rectangles and polygons at the measurements written in the construction in [Symbols](../SYMBOLS.en.md).
That the reach of copyright over things made with a language model is unsettled is stated under "Licence" in [Names and rights](./names.en.md).

<!-- 条文 著作権法 第2条第1項第1号、著作権法 第10条第1項第4号 -->

### Licence

The [LICENSE](../LICENSE) of the repository is CC BY 4.0.
The images in the list of parts, the figures inside pages and the style are published under this licence.
CC BY 4.0 grants permission to the extent that rights exist.
The licence will not be changed.

### Moral rights of the author

In summary, Article 19 of the Copyright Act gives the author the right to show their real name or a pseudonym as the author's name, or to show no name.
In summary, Article 20 of the same Act gives the author the right to keep the work and its title as they are.
Section 2(b)(1) of CC BY 4.0 leaves moral rights, such as the right of integrity, outside the licence. It then says that, to the limited extent needed for the licensed use, the licensor waives those rights or agrees not to assert them.
The footer of every page names the operator, says that the text and the emblem are under CC BY 4.0, and says that they were written with Claude Code.

<!-- 条文 著作権法 第19条、著作権法 第20条 -->

### Material of others

The site uses no image, typeface, icon or figure of anyone else.
So this page gives no licence text or conditions for material of others.

## Trade marks, designs and unfair competition

### Trade marks

The operator has not applied to register the names and marks of Nusquama as trade marks, in Japan or anywhere else ("Names and trademarks" in [Names and rights](./names.en.md)).
In summary, Article 25 of the Trademark Act gives the holder of a trade mark right the exclusive right to use the registered trade mark for the designated goods or services.
Nusquama holds no right under this article.

<!-- 条文 商標法 第25条 -->

### Designs

In summary, Article 2(1) of the Design Act defines a design as the shape and similar features of an article or a building, or an image, that gives an aesthetic impression through the eye.
Under that paragraph, an image counts only if it is used to operate a device, or is shown as the result of a device performing its function.
In summary, Article 23 of the same Act gives the holder of a design right the exclusive right to work the registered design, and designs similar to it, as a business.
No record of an application for design registration of the emblem, the flag, the icons or the form of the pages exists in this repository.
No record of a comparison with registered designs of others exists either. It was not checked.
Nusquama sells nothing, and makes and hands out no objects ([Terms of Use](./terms.en.md)).

<!-- 条文 意匠法 第2条、意匠法 第23条 -->

### Indications and product forms

The handling of indications of goods or business under Article 2(1)(i) and (ii) of the Unfair Competition Prevention Act is in "Trademarks and indications (Trademark Act, Article 25; Unfair Competition Prevention Act, Article 2, paragraph 1, items 1 and 2)" in the [Legality Statement](./legality.en.md).
In summary, Article 2(1)(iii) of the same Act lists acts such as transferring, or providing through a telecommunications line, goods that imitate the form of another person's goods.
Nusquama makes no goods, and sells and hands out none.
No record of a comparison of the emblem, the flag or the icons with the forms of goods of others exists. It was not checked.
That the flag and the emblem do not copy any real flag or arms, and how that was checked, are in "The flag and the emblem" in [Names and rights](./names.en.md).

<!-- 条文 不正競争防止法 第2条第1項第1号・第2号、不正競争防止法 第2条第1項第3号 -->

## Accessibility

This page calls the Act for Eliminating Discrimination against Persons with Disabilities (障害を理由とする差別の解消の推進に関する法律) the Disability Discrimination Act.
In summary, Article 2(vii) of the Disability Discrimination Act defines a business operator as a person who carries out commerce or another business, other than the State, incorporated administrative agencies and similar bodies, local governments and local incorporated administrative agencies.
In summary, Article 8 of the same Act says that a business operator must not infringe the rights and interests of persons with disabilities by unfair discriminatory treatment, and must give necessary and reasonable accommodation for removing social barriers.
Whether the operator is a business operator under this Act is not decided by the text of the articles. This page does not decide it.

<!-- 条文 障害者差別解消法 第2条、障害者差別解消法 第8条 -->

### What the site does

Each of the following is checked by [verification/check.js](../verification/check.js) or by a separate job in CI.

- Colours: a light and a dark colour scheme, switched by the device setting. In both schemes, every pair of text and background is at least 4.5:1, and every pair of focus ring and background is at least 3:1. Every colour is taken from the variables of the two schemes.
- Not relying on colour alone: the parcels of the map of the domain are all gold, and the categories of mistakes are told apart by shape. Each category has a different shape.
- Motion: the style has no motion (animation or transition). When a card rises, its position changes at once. With reduced motion, the position does not change.
- Text alternatives: the emblem at the top of the page is decoration and has an empty alternative; each image in the content says what it is and adds "(fiction)". Each figure inside a page has a title.
- Language and headings: every page states its language, has one h1, and skips no heading level.
- Keyboard: every page starts with a "Skip to content" link. The style draws a ring where the focus is.
- Zoom: zoom is not blocked. A separate job in CI draws every page in a browser at widths of 360 px and 640 px (the latter matching 200%), and checks that nothing overflows sideways.

Listening with a screen reader, operating the whole site with a keyboard only, and how the site looks for each type of colour vision were not checked.

## People and organisations

The SVG images and the figures inside pages are made only of rectangles and polygons.
The PNG and ICO images are drawings of the emblem.
No image shows a portrait or a photograph of a real person.
That the flag and the emblem do not copy the arms or insignia of any real state, royal house, order of knighthood, decoration, university or company is in "The emblem" and "The flag and the emblem" in [Names and rights](./names.en.md).
That the site serves no logo of anyone else is in "Others' names" on the same page.

## When something changes

When a part is added, changed or removed, this page and the checks are corrected in the same PR.
The checks fail if the list of parts on this page and the images served differ.
The change is recorded in the [timeline](../README.md) and in the Gazette.

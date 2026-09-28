# Handoff: ihsan.cc prototype front page and /essays

Repo: `ihsan-sa/website` (Create React App, hand-written CSS). Built against `main` as of 28 Sep 2026.

## Overview

These are design updates to two surfaces that already exist in the repo.

1. **The prototype front page.** This is `Prototype` in `src/App.js`, rendered from the `prototype` block of `src/content.json` at `PREVIEW_PATH`. Changes:
   - A two-row links bar with a real theme switch.
   - Portfolio links beside the section headings.
   - An Essays section.
   - Shorter row text on phones.
   - A clearer fold marker.
   - A softer ink colour.
   - Some copy edits.
2. **The essays pages.** These are `src/writing/Writing.js`, now called "Essays". `Writing.css` is fully replaced; the markup is unchanged apart from a few additions.

The public front page (`Page`, from the `preview` block) must not change, because a snapshot test holds it.

## About the design files

`reference/` holds **static HTML design references**, not code to ship. Rebuild them in the repo's existing idiom (the React components and `content.json`).

The CSS files under `src/` are different. They are the **real, finished stylesheets** and are meant to replace the repo files one for one:

- `src/writing/Writing.css`: full replacement. It targets the `wr-*` classes `Writing.js` already emits.
- `src/Preview.css`: the repo file plus new rules appended at the end, all scoped under `.pv-proto`, so the public page is untouched. Two existing rules were edited in place: the fold marker and the links row. Diff it against `main`.
- `src/index.css`: the repo file plus a `.theme-switch` block at the end.

`reference/site/site.js` and `reference/site/demo.css` exist **only for the demo**. They provide the Desktop/Phone switch, the ink slider and a plain-JS copy of the fold and theme logic. Don't port them.

## Fidelity

High fidelity. Colours, sizes, spacing and copy are final.

---

## 1. Prototype front page (`Prototype` in App.js)

The column, type and spacing are unchanged: `.pv` is 620px max width, 17px/1.6 Newsreader, and the gap between blocks is 36px (30px at ≤640px).

### 1a. Links bar: two rows

This replaces the current single `nav.pv-links` row.

```html
<nav class="pv-links pv-links--compact" aria-label="Contact and profiles">
  <span class="pv-links__row">
    <span class="pv-links__rest">
      <a class="pv-link" href="mailto:hi@ihsan.cc">hi@ihsan.cc</a>
      <a class="pv-link" href="/images/Salari_Ihsan_Contact_Card.vcf" download title="Save my contact card (.vcf)">Save contact</a>
    </span>
    <button type="button" class="theme-switch" role="switch" aria-checked={isDark} aria-label="Dark theme" onClick={toggleTheme}></button>
  </span>
  <span class="pv-links__rest">
    <a class="pv-link" href={`${PREVIEW_PATH}/writing`}>Essays</a>
    <a class="pv-link" href="https://github.com/ihsan-sa" target="_blank" rel="noopener noreferrer">GitHub</a>
    <a class="pv-link" href="https://linkedin.com/in/ihsan-sa" target="_blank" rel="noopener noreferrer">LinkedIn</a>
    <a class="pv-link" href="/images/Ihsan_Salari_Resume.pdf" target="_blank" rel="noopener noreferrer">Résumé</a>
  </span>
</nav>
```

- **Row one:** email and "Save contact" (the .vcf, which moves up from the footer), with the theme switch at the right end.
- **Row two:** Essays, GitHub, LinkedIn and Résumé.
- **Removed:** the Portfolio link and the page counts. There are no `pages` in the link labels anywhere on this page.
- **Footer:** `footer.pv-foot` is removed, because the contact card now lives in row one.
- **Separators:**
  - On desktop, links within a row are joined by a middle dot. The dot is `.pv-link + .pv-link::before`: content `·`, 9px padding each side, opacity 0.5, no underline.
  - At ≤640px there are no dots, and the gap between links is 18px, so a wrapped line never starts with a dot.
- **No wrapping inside a label:** every link is `white-space: nowrap`.
- **Row spacing:** the gap between the two rows is 6px on desktop and 0 on phone, where each link is 32px tall.

**Theme switch.** Its styles are in `index.css` under `.theme-switch`, and it replaces the "Dark"/"Light" text button.

- **Track:** 34×20px pill with a 1px border in `--label` (turns `--ink` on hover) and a transparent fill.
- **Knob:** a 12px circle in `currentColor` (`--ink`), 3px from the edge. It moves 14px to the right when on (`aria-checked="true"`, dark theme), with a `transform` transition of 160ms ease that is skipped under reduced motion.
- **Hit area:** an invisible `::before` extends it 8px on every side.
- **Accessibility:** `role="switch"`, `aria-checked` true in dark, `aria-label="Dark theme"`.
- **Behaviour:** the same `useTheme()` as now.

### 1b. Intro copy

1. Subtitle: unchanged.
2. The first `about` paragraph goes back to the public page's wording: *"Engineering overlooks ethics and social impact far too often. I treat them as core to my work, along with environmental sustainability, and AI makes that matter more."*
3. The second `about` paragraph is unchanged (the Fab2 inverter sentence).

### 1c. Section headings with one document beside them

```html
<h2 class="pv-head-with-link">AI work <a class="pv-link pv-head-link" href="/docs/ai-portfolio.pdf" target="_blank" rel="noopener noreferrer">AI portfolio</a></h2>
<h2 class="pv-head-with-link">Projects <a class="pv-link pv-head-link" href="/images/Ihsan_Salari_Portfolio.pdf" target="_blank" rel="noopener noreferrer">Hardware portfolio</a></h2>
```

- **Layout:** the heading is `display: flex`, baselines aligned, with a 12px gap.
- **Link:** 15px, weight 400, colour `--label`, with the page's normal link underline. It turns ink on hover.
- **Removed:** the `aiWork.docs` line under the AI work heading (`p.pv-docs.pv-head-docs`, "AI portfolio • Overview").
- **content.json:** add an optional `headLink: { label, href }` to a section and render it inside the `h2`.

### 1d. Row text in two lengths (Experience and AI work)

Each row gains an optional `short`, which is shown only at ≤640px. The full `text` then moves to the top of the fold, so nothing is lost.

```html
<p class="pv-entry__head">
  <strong class="pv-strong">Arista Networks</strong><span class="pv-t-long">, SI and optics for AI datacenters. Fall ’25.</span><span class="pv-t-short">, optics, ’25.</span><button class="pv-entry__btn" …></button>
</p>
<div class="pv-fold" …><div class="pv-fold__inner">
  <p class="pv-result pv-fold__long">SI and optics for AI datacenters. Fall ’25.</p>   <!-- text, first letter capitalised -->
  <p class="pv-result">…existing result…</p>
  …
</div></div>
```

- The CSS hides `.pv-t-short` and `.pv-fold__long` by default. At ≤640px it swaps them: `.pv-t-long` is hidden, and `.pv-t-short` and `.pv-fold__long` are shown.
- The text is plain inline, never clipped, with no ellipsis. On a screen under ~360px wide a row wraps.
- Put the comma inside each span, so there's no stray whitespace between the name and the text.
- **content.json:** add `short` beside `text`. Only render the pair when `short` exists.

| name | text (desktop) | short (phone) |
|---|---|---|
| Fab2 (Atomic Semi) | RF for plasma generation. Summer ’26. | RF plasma, ’26. |
| Arista Networks | SI and optics for AI datacenters. Fall ’25. | optics, ’25. |
| aiRadar | power electronics for multi‑beam sonar. Winter ’25. | sonar power, ’25. |
| University of Waterloo | BASc Electrical Engineering. 2024–29. | EE, 2024–29. |
| hwde | an AI PCB engineer, from brief to fabricated board. | an AI PCB engineer. |
| autobox | an always‑on Claude Code agent box. | an always‑on agent box. |
| lesson-builder | course material into interactive lessons. | courses into lessons. |
| chip design flow | AI chip designers for digital, analog and mixed‑signal work. | AI chip designers. |

Copy edit: the chip design flow `text` loses "on open tools".

### 1e. Fold marker

The `::after` "+" is redrawn as a real plus sign, replacing the faint glyph at opacity 0.4.

- **Button:** 14×14px inline-block, 7px left margin, `vertical-align: -0.08em`, colour `--label`, turning `--ink` when the row is hovered.
- **Plus:** `::after` is a 10×10px box with 2px margin, drawn with two `linear-gradient(currentColor…)` backgrounds: bars 10×1.5px and 1.5×10px, centred.
- **Open:** `aria-expanded="true"` turns it `rotate(45deg)` into a ×, with the existing 160ms transition.
- **Click target:** unchanged. The button's `::before` still covers the whole line.

### 1f. Essays section (new, between AI work and Projects)

```html
<section class="pv-block">
  <h2><a class="pv-strong" href={`${base}/writing`}>Essays</a></h2>
  <p><a class="pv-strong pv-name-link" href={`${base}/writing/talking-to-my-server`}>Talking to my server all day</a>, what autobox is, what it runs and what I use it for. September ’26.</p>
</section>
```

- **Content:** one sentence per essay, newest first, in the same pattern as the other rows. The heading links to the index.
- **Source:** feed it from `essays.generated.json`: the title, a one-line blurb, and the month and year from `date`. The blurb could be a new optional `blurb` front-matter key, falling back to `summary`.
- **Drafts:** show them only at the preview path, as `Writing.js` already does.

### 1g. Ink colour (prototype only)

- **Light:** `.pv-proto { --pv-ink: #3a352f; color: var(--pv-ink); }`, a warm dark grey instead of `#1b1917`.
- **Dark:** `--pv-ink: #dcd7cb`, in both the `[data-theme="dark"]` block and the `prefers-color-scheme` block.

Both are above 4.5:1 contrast on the paper colour. These values are placeholders: the user was trying options with the demo's ink slider (range `oklch(0.21–0.50 0.012 70)` light, `oklch(0.95–0.70 0.012 85)` dark). **Ask Ihsan for the final value.**

---

## 2. Essays (`/writing` → "Essays")

`Writing.js` keeps its structure. Changes:

- **Labels:** rename the user-facing text to "Essays". That means the index `h1`, the page `<title>` ("Essays · Ihsan Salari"), the essay-page top link, and the pager's "All writing", which becomes "All essays".
  - **Optional:** change the route to `/essays`. That needs `matchWriting` in `Writing.js`, the `pages()` paths in `scripts/writing.js`, the `ui-check`, and a redirect from `/writing`.
- **Theme switch:** add the same `.theme-switch` to `nav.wr-top`. It sits at the right, via `.wr-top .theme-switch { margin-left: auto }`.
- **Fonts:** load Newsreader italic 400 and weight 600 on these pages: `ital,opsz,wght@0,6..72,400;0,6..72,600;1,6..72,400`. Captions are italic, and titles and links are 600. `index.html` currently loads only 300/400/500 upright.
- **Page counts:** drop them from Further reading. `pdfNote()` should return only `note`.

### Writing.css: what it does

It reads the `index.css` tokens (`--paper`, `--ink`, `--ink-soft`, `--label`, `--rule`, `--thumb-bg`, `--serif`, `--mono`) and adds its own:

| token | light | dark |
|---|---|---|
| `--wr-link-rule` | `#cac3b7` | `#4a463c` |
| `--wr-code-bg` | `#f2eee3` | `#1f1d17` |
| `--wr-diagram-paper` | `#faf8f3` | `#faf8f3`, the same in both themes, so diagrams are never inverted |

**Column and body text**
- Column 660px wide, padding 32/24/64px (80/24/96px at ≥720px).
- Body text 19/1.6, and 18px at ≤640px.

**Links and metadata**
- Links are ink with a hairline underline in `--wr-link-rule`, going to `currentColor` on hover, as on the front page. The accent blue is gone.
- Metadata ("date · N min read", labels) is 15px serif in `--label`.
- Mono is used only for code.

**Index**
- `h1` 34px (38px desktop), weight 600, `letter-spacing: -0.015em`, 20px padding below and a 1px `--ink` rule.
- Each row is 24px top and bottom with a 1px `--rule` line under it.
- Title 20px/1.3, weight 600. The whole row is clickable through a stretched `::after`, and the title underlines on hover.
- Summary 17px in `--ink-soft`.

**Essay head**
- Title 32px (38px desktop), weight 600. It's followed by the standfirst (19/1.5, `--ink-soft`), then the meta line.
- The order comes from flex `order`, so the JSX is unchanged. Closed by a 1px `--ink` rule, 20px below.

**Body**
- Blocks are in a flex column with a 16px gap (18px desktop).
- `h2` 23px (25px desktop), weight 400, 24px above.
- Inline `code` is 0.8em mono on `--wr-code-bg` with a 3px radius.
- `pre` is 13/1.55 mono on the same tint, with a 1px `--ink` top rule and wrapped lines.

**Pull quote**
- `blockquote.wr-pullquote`: 23px (25px desktop) regular.
- 1px `--ink` rules above and below, 18px padding, no stripe and no italics.

**Diagrams**
- `.wr-figure--diagram` fills the column on `--wr-diagram-paper` with a 3px radius and 12px padding. In light mode the panel is invisible against the page; in dark mode it shows as a light rounded panel.
- **Keep the diagrams fitting the column.** Remove the inline `minWidth: 560` style in `Writing.js`'s `Figure`, so they shrink to fit on phones instead of scrolling sideways. The user asked for this.

**Images**
- `.wr-figure--image` gets a 1px `--rule` border and a 3px radius.
- Centred, at most `min(640px, 80vh)` tall, with the caption centred and 30em max.

**Captions**
- 15/1.5 italic, `--ink-soft`, 12px above.

**Notes**
- A footnote list shows below the essay on narrow screens.
- At ≥1180px each note moves into the right margin as a sidenote: 220px wide, 40px from the column, 14/1.5, `--ink-soft`. The footnote list is then hidden.
- In print, the footnote list always shows.

**Further reading**
- A 1px `--rule` above it and a 15px label heading.
- Each item is a 19px/600 link with the note under it (17px, `--ink-soft`), 16px apart.

**Pager**
- A 1px `--ink` rule, 56px above.
- Previous and next links sit side by side (`flex: 1 1 220px`), each with a 15px label over a 19px/600 title.
- "All essays" goes on its own line.

---

## Interactions summary

- **Theme switch:** as now: it persists in `localStorage['ihsan-theme']`, and the OS setting applies when nothing is stored. The pre-paint script in `index.html` stays.
- **Fold rows:** as now. Clicking anywhere on the line toggles the row, and the panel is `inert` while folded. Only the marker's look changed.
- **Hover:**
  - Links: the underline goes to `currentColor`.
  - Index rows: the title underlines.
  - Project tiles: opacity 0.7, as now.
- **Motion:** only the switch knob, the fold and the marker rotation move, and each is skipped under `prefers-reduced-motion`.

## State

Nothing new. `useTheme()` also feeds the switch's `aria-checked`. The fold keeps its per-row `useState`.

## Assets

- **Diagrams:** `public/writing/talking-to-my-server/autobox-arch.svg` and `autobox-loop.svg` are already in the repo; copies are in `reference/public/…`.
- **Slack screenshot:** `screenshot-slack.png` is still missing, so the draft shows the placeholder.
- **Other images:** project photos and PDFs are the repo's existing `/images/` and `/docs/` files.

## Content consistency (please check before publishing)

The front page and the essay give different figures for the same things:

- **autobox:** "550 pieces of work, 27 Aug–20 Sep" on the front page, but "~810 PRs, 26 Aug–27 Sep" in the essay.
- **lesson-builder:** "41 lessons across 8 courses" on the front page, but "47 lessons across 14 courses" in the essay.
- **hwde:** "2 made" on the front page, but "2 ordered" in the essay.

Choose one date for each figure and use it in both places.

## Files

- `src/writing/Writing.css`: drop-in replacement.
- `src/Preview.css`: repo file with the prototype changes. Diff it against main.
- `src/index.css`: repo file with the `.theme-switch` block added.
- `reference/site/index.html`: the prototype front page, static.
- `reference/site/essays/index.html` and `talking-to-my-server.html`: the essays pages, static, using the same markup `Writing.js` emits.
- `reference/site/site.js` and `demo.css`: demo only (Desktop/Phone switch, ink slider, plain-JS fold and theme logic). Don't port them.

To view the references, open `reference/site/index.html` in a browser. The pages load the stylesheets from `src/` at the root of this folder, so keep the folder layout as it is.

#!/usr/bin/env node
// Static build: turns src/content.json into plain HTML + CSS that reads in
// full with JavaScript off. No React ships with it. The only script on the
// page is the theme switch's few lines (plus the pre-paint theme script and
// the analytics beacon copied from public/index.html); the draft's folded rows
// are <details>, so they open without any.
//
//   node scripts/build-static.js [buildDir]     (runs after `npm run build`)
//
// It writes, under buildDir (default build/):
//   STATIC_PATH/index.html                the front page (content.json `preview`)
//   STATIC_PATH/draft/index.html          the draft (content.json `prototype`, and an
//                                         Essays list from content/writing/*.md)
//   STATIC_PATH/writing/index.html        the essay list (content/writing/*.md)
//   STATIC_PATH/writing/<slug>/index.html each essay
//   STATIC_PATH/site.css                  src/index.css + src/Preview.css + the static-only rules
//   STATIC_PATH/writing.css               src/writing/Writing.css as it is, the essays' one
//                                         styling file, so a redesign swaps that file alone
//
// The essays render as the preview path renders them now: drafts are listed,
// marked Draft, because the whole of STATIC_PATH is a noindex review copy.
// renderWriting(essays, { preview: false }) is the public /writing rule, where
// a draft is neither listed nor given a page.
//
// STATIC_PATH is unguessable while the owner reviews it: nothing links to it,
// robots.txt does not name it, and every page carries a noindex meta. The
// files are real, so the host serves them without a _redirects rule. The
// <head> (tab title, link-preview tags, fonts, pre-paint theme script) and the
// analytics beacon are copied from public/index.html, so those stay edited in
// one place.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { loadEssays, withMeta } = require('./writing');

const ROOT = path.resolve(__dirname, '..');
const STATIC_PATH = '/fbl6b84nx8v09rotjh22t1jm6jpinmmk/';
const DRAFT_PATH = `${STATIC_PATH}draft/`;

// Headings and names are Newsreader 600 and captions italic 400, which
// index.html's font link lacks.
const PAGE_FONT =
  'https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;1,6..72,400&display=swap';

const NEW_TAB = ' target="_blank" rel="noopener noreferrer"';

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// The bullet travels with the link after it, never ending a line.
const BULLET = ' •&nbsp;';

// public/index.html's <head>, minus comments and the CRA placeholders, and the
// analytics <script> from its <body>.
function headFrom(indexHtml) {
  const head = indexHtml.match(/<head>([\s\S]*?)<\/head>/)[1]
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/%PUBLIC_URL%/g, '')
    .split('\n')
    .map((l) => l.trimEnd())
    .filter((l) => l.trim())
    .join('\n');
  const beacon = (indexHtml.match(/<script[^>]*cloudflareinsights[^>]*><\/script>/) || [''])[0];
  return { head, beacon };
}

// The toggle is hidden until this runs, so with JavaScript off the page just
// follows the OS theme and shows no dead button. Same rules as before: a
// click wins and persists in localStorage['ihsan-theme']. Two kinds: the front
// page's text button names where it goes ("Dark"); the draft's and the essays'
// role="switch" says whether dark is on through aria-checked.
const TOGGLE_SCRIPT = `<script>
(function () {
  var b = document.getElementById('theme-toggle'), d = document.documentElement;
  if (!b) return;
  var q = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function dark() { var t = d.getAttribute('data-theme'); return t ? t === 'dark' : !!(q && q.matches); }
  function show() {
    var k = dark();
    if (b.getAttribute('role') === 'switch') { b.setAttribute('aria-checked', String(k)); return; }
    var to = k ? b.getAttribute('data-to-light') : b.getAttribute('data-to-dark');
    b.textContent = to;
    b.setAttribute('aria-pressed', String(k));
    b.setAttribute('aria-label', 'Switch to ' + to + ' theme');
  }
  b.addEventListener('click', function () {
    var n = dark() ? 'light' : 'dark';
    d.setAttribute('data-theme', n);
    try { localStorage.setItem('ihsan-theme', n); } catch (e) {}
    show();
  });
  if (q && q.addEventListener) q.addEventListener('change', show);
  show();
  b.hidden = false;
})();
</script>`;

// The draft's and the essays' switch, hidden until the script above runs.
const THEME_SWITCH = '<button type="button" id="theme-toggle" class="theme-switch" role="switch" aria-checked="false" aria-label="Dark theme" title="Dark theme" hidden></button>';

function toggleButton(theme) {
  return `<button type="button" id="theme-toggle" class="pv-link pv-toggle" hidden data-to-dark="${esc(theme.toDark)}" data-to-light="${esc(theme.toLight)}">${esc(theme.toDark)}</button>`;
}

// Browsers keep a stylesheet for hours, so each link carries a hash of the
// file's contents and a changed stylesheet is fetched at once. build() sets it.
const cssVersion = { site: '', writing: '' };
const versionOf = (text) => `?v=${crypto.createHash('sha256').update(text).digest('hex').slice(0, 10)}`;

// `meta` swaps in one page's own title and link-preview tags (the essays).
function page({ head, beacon }, { mainClass, body, noindex, meta, essay = false }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
${meta ? withMeta(head, meta) : head}
${noindex ? '<meta name="robots" content="noindex" />\n' : ''}<link href="${PAGE_FONT}" rel="stylesheet" />\n<link rel="stylesheet" href="${STATIC_PATH}site.css${cssVersion.site}" />
${essay ? `<link rel="stylesheet" href="${STATIC_PATH}writing.css${cssVersion.writing}" />\n` : ''}</head>
<body>
<main class="${mainClass}">
${body}
</main>
${TOGGLE_SCRIPT}
${beacon}
</body>
</html>
`;
}

function nameHtml({ name, href }, linkClass) {
  return href
    ? `<a class="${linkClass}" href="${esc(href)}"${NEW_TAB}>${esc(name)}</a>`
    : `<strong class="pv-strong">${esc(name)}</strong>`;
}

function intro(block) {
  return `<header class="pv-intro">
<h1 class="pv-name">${esc(block.name)}</h1>
<p>${esc(block.subtitle)}</p>
${block.about.map((p) => `<p>${esc(p)}</p>`).join('\n')}
</header>`;
}

// Order is fixed by the design: links → name + intro → Experience → AI work → Hardware.
function renderFront(content) {
  const { theme, preview } = content;
  const links = preview.links
    .map(({ label, href, download }) =>
      `<a class="pv-link" href="${esc(href)}"${download ? ' download' : NEW_TAB}>${esc(label)}</a>`)
    .join('\n');
  const entry = (item) => {
    const docs = (item.docs || [])
      .map((d) => `<span>${BULLET}<a class="pv-link pv-doc" href="${esc(d.href)}"${NEW_TAB}>${esc(d.label)}</a></span>`)
      .join('');
    return `<p>${nameHtml(item, 'pv-strong')}, ${esc(item.text)}${docs}</p>`;
  };
  const sections = [preview.experience, preview.aiWork]
    .map(({ heading, items }) => `<section class="pv-block">
<h2>${esc(heading)}</h2>
${items.map(entry).join('\n')}
</section>`)
    .join('\n');
  const hw = preview.hardware.items
    .map(({ title, href, image }) => `<a class="pv-hw__item" href="${esc(href)}"${NEW_TAB}><img class="pv-hw__img" src="${esc(image)}" alt="" loading="lazy" /><span>${esc(title)}</span></a>`)
    .join('\n');
  return `<nav class="pv-links" aria-label="Contact and profiles">
<a class="pv-link" href="mailto:${esc(preview.email)}">${esc(preview.email)}</a>
${links}
${toggleButton(theme)}
</nav>
${intro(preview)}
${sections}
<section class="pv-block">
<h2>${esc(preview.hardware.heading)}</h2>
<div class="pv-hw">
${hw}
</div>
</section>`;
}

// The draft names each PDF by what it is, with no page count.
function docList(docs) {
  return docs
    .map((d, i) => `<span>${i > 0 ? BULLET : ''}${d.href
      ? `<a class="pv-link pv-doc" href="${esc(d.href)}"${NEW_TAB}>${esc(d.label)}</a>`
      : `<span class="pv-pending">${esc(d.label)} (${esc(d.pending)})</span>`}</span>`)
    .join('');
}

// A row's text after its name. With a `short`, the phone shows that and the
// fold opens on the full text (Preview.css swaps them at ≤640px); the comma
// sits inside each span so no stray space is left between them.
function rowText({ text, short }) {
  return short
    ? `<span class="pv-t-long">, ${esc(text)}</span><span class="pv-t-short">, ${esc(short)}</span>`
    : `, ${esc(text)}`;
}

// A draft row: its one line is the <summary>, and opening it shows the result,
// the longer sentences, the figure, the PDFs and where to start.
function protoEntry(item) {
  const { text, short, result, detail, figure, docs, start } = item;
  const line = `${nameHtml(item, 'pv-strong pv-name-link')}${rowText(item)}`;
  if (!(result || detail || figure || docs || start)) {
    return `<div class="pv-entry"><p class="pv-entry__head">${line}</p></div>`;
  }
  const inner = [
    short && `<p class="pv-result pv-fold__long">${esc(text[0].toUpperCase() + text.slice(1))}</p>`,
    result && `<p class="pv-result">${esc(result)}</p>`,
    detail && `<p class="pv-detail">${esc(detail)}</p>`,
    figure && `<figure class="pv-figure"><img src="${esc(figure.image)}" alt="${esc(figure.alt)}" loading="lazy" /><figcaption>${esc(figure.caption)}</figcaption></figure>`,
    docs && `<p class="pv-docs">${docList(docs)}</p>`,
    start && `<p class="pv-start">${esc(start)}</p>`,
  ].filter(Boolean).join('\n');
  return `<details class="pv-entry">
<summary class="pv-entry__head">${line}<span class="pv-entry__mark" aria-hidden="true"></span></summary>
<div class="pv-fold__inner">
${inner}
</div>
</details>`;
}

// A section heading with one document beside it (content.json `headLink`).
function heading({ heading: h, headLink }) {
  return headLink
    ? `<h2 class="pv-head-with-link">${esc(h)} <a class="pv-link pv-head-link" href="${esc(headLink.href)}"${NEW_TAB}>${esc(headLink.label)}</a></h2>`
    : `<h2>${esc(h)}</h2>`;
}

// "September ’26", from an essay's YYYY-MM-DD date.
function monthYear(iso) {
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];
  const [y, m] = iso.split('-');
  return `${MONTHS[Number(m) - 1]} ’${y.slice(2)}`;
}

// `essays` is newest first. Drafts are listed, because the whole of
// STATIC_PATH is the noindex review copy.
function renderDraft(content, essays = []) {
  const { prototype: pt } = content;
  const writing = `${STATIC_PATH}writing/`;
  const link = ({ label, href }) => `<a class="pv-link" href="${esc(href)}"${NEW_TAB}>${esc(label)}</a>`;
  const sections = [pt.experience, pt.aiWork]
    .map((sec) => `<section class="pv-block">
${heading(sec)}
${sec.items.map(protoEntry).join('\n')}
</section>`)
    .join('\n');
  const essayRows = essays
    .map((e) => `<p><a class="pv-strong pv-name-link" href="${writing}${e.slug}/">${esc(e.title)}</a>, ${esc(e.blurb || e.summary)} ${esc(monthYear(e.date))}.</p>`)
    .join('\n');
  const projects = pt.projects.items
    .map(({ title, href, image, result }) => `<a class="pv-hw__item" href="${esc(href)}"${NEW_TAB}><img class="pv-hw__img" src="${esc(image)}" alt="" loading="lazy" /><span class="pv-hw__title">${esc(title)}</span>${result ? `<span class="pv-hw__result">${esc(result)}</span>` : ''}</a>`)
    .join('\n');
  // Row one: how to reach me, and the theme switch. Row two: where to read more.
  return `<nav class="pv-links pv-links--compact" aria-label="Contact and profiles">
<span class="pv-links__row">
<span class="pv-links__rest">
<a class="pv-link" href="mailto:${esc(pt.email)}">${esc(pt.email)}</a>
<a class="pv-link" href="${esc(pt.contactCard.href)}" download title="${esc(pt.contactCard.title)}">${esc(pt.contactCard.label)}</a>
</span>
${THEME_SWITCH}
</span>
<span class="pv-links__rest">
<a class="pv-link" href="${writing}">${esc(pt.essays.heading)}</a>
${pt.links.map(link).join('\n')}
</span>
</nav>
${intro(pt)}
${sections}
${essays.length ? `<section class="pv-block">
<h2><a class="pv-strong" href="${writing}">${esc(pt.essays.heading)}</a></h2>
${essayRows}
</section>
` : ''}<section class="pv-block">
${heading(pt.projects)}
<div class="pv-hw">
${projects}
</div>
</section>`;
}

// ---- essays: the markup of src/writing/Writing.js, as strings ---------------

const SITE = 'https://ihsan.cc';

function inline(nodes, notes, seen) {
  return nodes.map((n) => {
    switch (n.t) {
      case 'em': return `<em>${inline(n.c, notes, seen)}</em>`;
      case 'strong': return `<strong>${inline(n.c, notes, seen)}</strong>`;
      case 'code': return `<code class="wr-code">${esc(n.v)}</code>`;
      case 'link': return `<a class="wr-link" href="${esc(n.href)}">${inline(n.c, notes, seen)}</a>`;
      case 'fn': {
        // The first reference carries the id the footnote's back-link returns to.
        const first = !seen.has(n.n);
        seen.add(n.n);
        const note = notes.find((f) => f.n === n.n);
        const side = first && note
          ? `<span class="wr-sidenote" aria-hidden="true"><span class="wr-sidenote__n">${n.n}</span> ${inline(note.c, notes, seen)}</span>`
          : '';
        return `<span class="wr-fn"><sup class="wr-fnref"><a href="#fn-${n.n}"${first ? ` id="fnref-${n.n}"` : ''} aria-label="Note ${n.n}">${n.n}</a></sup>${side}</span>`;
      }
      default: return esc(n.v);
    }
  }).join('');
}

function block(b, notes, seen) {
  const il = (nodes) => inline(nodes, notes, seen);
  switch (b.t) {
    case 'h2': return `<h2 class="wr-h2">${il(b.c)}</h2>`;
    case 'h3': return `<h3 class="wr-h3">${il(b.c)}</h3>`;
    case 'quote': return `<blockquote class="wr-pullquote">${il(b.c)}</blockquote>`;
    case 'code': return `<pre class="wr-pre"${b.lang ? ` data-lang="${esc(b.lang)}"` : ''}><code>${esc(b.v)}</code></pre>`;
    case 'ul':
    case 'ol': return `<${b.t} class="wr-list">${b.items.map((item) => `<li>${il(item)}</li>`).join('')}</${b.t}>`;
    case 'hr': return '<hr class="wr-rule" />';
    case 'figure': {
      const { kind, src, alt, caption, width, height, missing } = b;
      // A diagram shrinks to fit the column on a phone rather than scrolling sideways.
      const img = missing
        ? `<div class="wr-figure__missing">Figure not added yet: ${esc(src.split('/').pop())}</div>`
        : `<img class="wr-figure__img" src="${esc(src)}" alt="${esc(alt)}"${width ? ` width="${width}"` : ''}${height ? ` height="${height}"` : ''} loading="lazy" />`;
      return `<figure class="wr-figure wr-figure--${kind}"><div class="wr-figure__frame">${img}</div><figcaption class="wr-figure__caption">${il(caption)}</figcaption></figure>`;
    }
    default: return `<p class="wr-p">${il(b.c)}</p>`;
  }
}

function essayMeta(e) {
  return `<p class="wr-meta"><time datetime="${esc(e.date)}">${esc(e.dateLabel)}</time><span class="wr-meta__sep"> · </span>${e.readingMinutes} min read${e.draft ? '<span class="wr-meta__draft"> · Draft</span>' : ''}</p>`;
}

function renderEssay(e, { older, newer, base }) {
  const notes = e.footnotes;
  const seen = new Set();
  const foot = notes.length
    ? `<section class="wr-footnotes" aria-label="Notes"><ol>${notes.map((f) => `<li id="fn-${f.n}">${inline(f.c, notes, new Set([f.n]))} <a class="wr-footnotes__back" href="#fnref-${f.n}" aria-label="Back to note ${f.n}">↩</a></li>`).join('')}</ol></section>`
    : '';
  const reading = e.furtherReading.length
    ? `<section class="wr-reading"><h2 class="wr-reading__head">Further reading</h2><ul class="wr-reading__list">${e.furtherReading.map((r) => `<li class="wr-reading__item"><a class="wr-reading__link" href="${esc(r.href)}"${NEW_TAB}>${esc(r.title)}</a><span class="wr-reading__note">${esc(r.note)}</span></li>`).join('')}</ul></section>`
    : '';
  const pager = (x, dir, label) => (x
    ? `<a class="wr-pager__link wr-pager__link--${dir}" href="${base}writing/${x.slug}/"><span class="wr-pager__label">${label}</span><span class="wr-pager__title">${esc(x.title)}</span></a>`
    : '');
  return `<nav class="wr-top"><a class="wr-top__link" href="${base}writing/">Essays</a>${THEME_SWITCH}</nav>
<article>
<header class="wr-head"><h1 class="wr-title">${esc(e.title)}</h1>${essayMeta(e)}<p class="wr-standfirst">${esc(e.standfirst)}</p></header>
<div class="wr-body">
${e.blocks.map((b) => block(b, notes, seen)).join('\n')}
</div>
${foot}${reading}
</article>
<nav class="wr-pager" aria-label="More essays">${pager(older, 'prev', 'Previous')}${pager(newer, 'next', 'Next')}<a class="wr-pager__index" href="${base}writing/">All essays</a></nav>`;
}

function renderIndex(essays, { base, home }) {
  const list = essays.length
    ? `<ol class="wr-index__list">
${essays.map((e) => `<li class="wr-index__item"><a class="wr-index__link" href="${base}writing/${e.slug}/">${esc(e.title)}</a><p class="wr-index__summary">${esc(e.summary)}</p>${essayMeta(e)}</li>`).join('\n')}
</ol>`
    : '<p class="wr-index__empty">Nothing here yet.</p>';
  return `<nav class="wr-top"><a class="wr-top__link" href="${home}">Ihsan Salari</a>${THEME_SWITCH}</nav>
<h1 class="wr-index__title">Essays</h1>
${list}`;
}

// Every /writing page as { rel, html }, rel being the directory under base.
// "Draft essays never appear on the public site": with preview false a draft is
// neither listed nor given a page, and every page is noindex when preview is on.
// The list's name links home: the draft front page in the review copy, since
// that is the page the essays are linked from there.
function renderWriting(essays, shell, { base = STATIC_PATH, preview = true } = {}) {
  const home = preview ? `${base}draft/` : base;
  const shown = preview ? essays : essays.filter((e) => !e.draft);
  const out = [{
    rel: 'writing',
    html: page(shell, {
      mainClass: 'wr wr-index', body: renderIndex(shown, { base, home }), noindex: preview, essay: true,
      meta: { title: 'Essays · Ihsan Salari', description: 'Essays on the AI systems I build.', url: `${SITE}/writing`, type: 'website' },
    }),
  }];
  shown.forEach((e, i) => out.push({
    rel: `writing/${e.slug}`,
    html: page(shell, {
      mainClass: 'wr wr-essay',
      body: renderEssay(e, { newer: shown[i - 1], older: shown[i + 1], base }),
      noindex: preview || e.draft,
      essay: true,
      meta: { title: `${e.title} · Ihsan Salari`, description: e.summary, url: `${SITE}/writing/${e.slug}`, type: 'article', image: e.image },
    }),
  }));
  return out;
}

// Rules only the static pages need: the hidden switches, and the draft's rows
// folding with <details> in place of Preview.css's button-and-inert fold
// (whose rules match nothing on these pages). The fold marker is drawn as
// Preview.css draws .pv-entry__btn: a + that turns 45° to × when open.
const STATIC_CSS = `
/* A switch stays hidden until its script runs; the phone rule's inline-flex would show the text toggle. */
.pv-toggle[hidden], .theme-switch[hidden] { display: none !important; }
/* Static pages: a draft row is <details>; its <summary> is the one line. */
.pv-proto summary.pv-entry__head { display: block; list-style: none; cursor: pointer; text-wrap: pretty; }
/* A folded React row kept its panel's 4px top padding; keep the same rhythm. */
.pv-proto details.pv-entry:not([open]) { padding-bottom: 4px; }
.pv-proto summary.pv-entry__head::-webkit-details-marker { display: none; }
.pv-proto .pv-entry__mark { display: inline-block; width: 14px; height: 14px; margin-left: 7px; vertical-align: -0.08em; color: var(--label); }
.pv-proto .pv-entry__mark::after {
  content: ''; display: block; width: 10px; height: 10px; margin: 2px;
  background:
    linear-gradient(currentColor, currentColor) center / 10px 1.5px no-repeat,
    linear-gradient(currentColor, currentColor) center / 1.5px 10px no-repeat;
}
.pv-proto summary.pv-entry__head:hover .pv-entry__mark { color: var(--ink); }
.pv-proto details[open] > summary .pv-entry__mark::after { transform: rotate(45deg); }
@media (prefers-reduced-motion: no-preference) {
  .pv-proto .pv-entry__mark::after { transition: transform 160ms ease; }
}
/* Open and close by height and opacity, like the React fold (200ms / 160ms), where
   the browser can animate <details>. Elsewhere the row just snaps open. */
@supports selector(::details-content) {
  .pv-proto { interpolate-size: allow-keywords; }
  .pv-proto details.pv-entry::details-content { block-size: 0; opacity: 0; overflow: clip; }
  .pv-proto details.pv-entry[open]::details-content { block-size: auto; opacity: 1; }
  @media (prefers-reduced-motion: no-preference) {
    .pv-proto details.pv-entry::details-content {
      transition: block-size 200ms ease, opacity 160ms ease, content-visibility 200ms allow-discrete;
    }
  }
}
@media print { .pv-proto .pv-entry__mark { display: none; } }
`;

function build(buildDir = path.join(ROOT, 'build'), essays = loadEssays()) {
  const content = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/content.json'), 'utf8'));
  const shell = headFrom(fs.readFileSync(path.join(ROOT, 'public/index.html'), 'utf8'));
  const css = ['src/index.css', 'src/Preview.css']
    .map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8'))
    .join('\n') + STATIC_CSS;
  const out = path.join(buildDir, STATIC_PATH);
  fs.mkdirSync(path.join(buildDir, DRAFT_PATH), { recursive: true });
  const writingCss = fs.readFileSync(path.join(ROOT, 'src/writing/Writing.css'), 'utf8');
  cssVersion.site = versionOf(css);
  cssVersion.writing = versionOf(writingCss);
  fs.writeFileSync(path.join(out, 'site.css'), css);
  fs.writeFileSync(path.join(out, 'index.html'),
    page(shell, { mainClass: 'pv', body: renderFront(content), noindex: true }));
  fs.writeFileSync(path.join(buildDir, DRAFT_PATH, 'index.html'),
    page(shell, { mainClass: 'pv pv-proto', body: renderDraft(content, essays), noindex: true }));
  fs.writeFileSync(path.join(out, 'writing.css'), writingCss);
  for (const { rel, html } of renderWriting(essays, shell)) {
    fs.mkdirSync(path.join(out, rel), { recursive: true });
    fs.writeFileSync(path.join(out, rel, 'index.html'), html);
  }
  return out;
}

module.exports = { STATIC_PATH, DRAFT_PATH, build, renderFront, renderDraft, renderWriting, headFrom, page };

if (require.main === module) {
  console.log(`static pages -> ${build(process.argv[2] && path.resolve(process.argv[2]))}`);
}

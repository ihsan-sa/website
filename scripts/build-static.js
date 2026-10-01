#!/usr/bin/env node
// Static build: turns src/content.json into plain HTML + CSS that reads in
// full with JavaScript off. No React ships with it. The only script on the
// page is the theme switch's few lines (plus the pre-paint theme script and
// the analytics beacon copied from public/index.html, and on an essay the
// figures' click-to-enlarge); the draft's folded rows are <details>, so they
// open without any.
//
//   node scripts/build-static.js [buildDir]     (runs after `npm run build`)
//
// Stat placeholders in content.json's strings ({autobox.prs}) are filled from
// src/stats.json first, and one it lacks fails the build (src/fillStats.js).
//
// It writes, under buildDir (default build/):
//   STATIC_PATH/index.html                the front page (content.json `prototype` minus its
//                                         documents, src/frontPage.js; no essays)
//   STATIC_PATH/draft/index.html          the draft (content.json `prototype`, and an
//                                         Essays list from content/writing/*.md)
//   DRAFT_V2_PATH/index.html              the second draft: the same `prototype` block, laid
//                                         out for phones first (renderDraft's v2 option)
//   DRAFT_V2_PATH/v2.css                  its own rules, on top of site.css
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
// STATIC_PATH and DRAFT_V2_PATH are unguessable while the owner reviews it: nothing links to it,
// robots.txt does not name it, and every page carries a noindex meta. The
// files are real, so the host serves them without a _redirects rule. The
// <head> (tab title, link-preview tags, fonts, pre-paint theme script) and the
// analytics beacon are copied from public/index.html, so those stay edited in
// one place.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { loadEssays, withMeta } = require('./writing');
const { fillStats } = require('../src/fillStats');
const { frontPage } = require('../src/frontPage');

const ROOT = path.resolve(__dirname, '..');
const STATIC_PATH = '/fbl6b84nx8v09rotjh22t1jm6jpinmmk/';
const DRAFT_PATH = `${STATIC_PATH}draft/`;
// The second draft stands at its own path, so the first one's page and
// site.css stay exactly as they are.
const DRAFT_V2_PATH = '/h3e10faevt7op765cyaopvoli0w1wgo5/';

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

// The switch is hidden until this runs, so with JavaScript off the page just
// follows the OS theme and shows no dead button. Same rules as before: a
// click wins and persists in localStorage['ihsan-theme'], and aria-checked
// says whether dark is on.
const TOGGLE_SCRIPT = `<script>
(function () {
  var b = document.getElementById('theme-toggle'), d = document.documentElement;
  if (!b) return;
  var q = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function dark() { var t = d.getAttribute('data-theme'); return t ? t === 'dark' : !!(q && q.matches); }
  function show() { b.setAttribute('aria-checked', String(dark())); }
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

// An essay page's click-to-enlarge for its figures: src/writing/zoom.js, the
// same file the React essay pages import, inlined as it is.
const ZOOM_SCRIPT = `<script>\n${fs.readFileSync(path.join(__dirname, '../src/writing/zoom.js'), 'utf8').trim()}\n</script>`;

// The pages' switch, hidden until the script above runs.
const THEME_SWITCH = '<button type="button" id="theme-toggle" class="theme-switch" role="switch" aria-checked="false" aria-label="Dark theme" title="Dark theme" hidden></button>';

// Browsers keep a stylesheet for hours, so each link carries a hash of the
// file's contents and a changed stylesheet is fetched at once. build() sets it.
const cssVersion = { site: '', writing: '', v2: '' };
const versionOf = (text) => `?v=${crypto.createHash('sha256').update(text).digest('hex').slice(0, 10)}`;

// `meta` swaps in one page's own title and link-preview tags (the essays);
// `extraCss` is one more stylesheet after site.css (the second draft's);
// `extraScript` one more script after the theme switch's (an essay's zoom).
function page({ head, beacon }, { mainClass, body, noindex, meta, essay = false, extraCss, extraScript }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
${meta ? withMeta(head, meta) : head}
${noindex ? '<meta name="robots" content="noindex" />\n' : ''}<link href="${PAGE_FONT}" rel="stylesheet" />\n<link rel="stylesheet" href="${STATIC_PATH}site.css${cssVersion.site}" />
${extraCss ? `<link rel="stylesheet" href="${extraCss}" />\n` : ''}${essay ? `<link rel="stylesheet" href="${STATIC_PATH}writing.css${cssVersion.writing}" />\n` : ''}</head>
<body>
<main class="${mainClass}">
${body}
</main>
${TOGGLE_SCRIPT}
${extraScript ? `${extraScript}\n` : ''}${beacon}
</body>
</html>
`;
}

function nameHtml({ name, href }, linkClass, out = false) {
  return href
    ? `<a class="${linkClass}${out ? ' pv-name-link--out' : ''}" href="${esc(href)}"${NEW_TAB}>${esc(name)}${out ? '<span class="pv-name-link__out" aria-hidden="true">\u2197\uFE0E</span>' : ''}</a>`
    : `<strong class="pv-strong">${esc(name)}</strong>`;
}

function intro(block) {
  return `<header class="pv-intro">
<h1 class="pv-name">${esc(block.name)}</h1>
<p>${esc(block.subtitle)}</p>
${block.about.map((p) => `<p>${esc(p)}</p>`).join('\n')}
</header>`;
}

// The draft names each PDF by what it is, with no page count. `after` says
// something precedes the list on its line, so the first PDF gets a bullet too.
function docList(docs, after = false) {
  return docs
    .map((d, i) => `<span>${i > 0 || after ? BULLET : ''}${d.href
      ? `<a class="pv-link pv-doc" href="${esc(d.href)}"${NEW_TAB}>${esc(d.label)}</a>`
      : `<span class="pv-pending">${esc(d.label)} (${esc(d.pending)})</span>`}</span>`)
    .join('');
}

// A row's text after its name. With a `short`, the phone shows that in place of
// the full text (Preview.css swaps them at ≤640px); the separator (a comma, or a space after a linked name's arrow)
// sits inside each span so no stray space is left between them. A `where`
// (place and date) follows the full text, in italics; the phone line leaves it out.
function rowText({ text, where, short }, linked = false) {
  const sep = linked ? ' ' : ', ';
  const full = `${sep}${esc(text)}${where ? `, <em>${esc(where)}</em>` : ''}`;
  return short
    ? `<span class="pv-t-long">${full}</span><span class="pv-t-short">${sep}${esc(short)}</span>`
    : full;
}

// The second draft names a row's own link by where it goes.
const linkLabel = (href) => (/^https:\/\/github\.com\//.test(href) ? 'GitHub' : 'Project page');

// An AI row's visual, as App.js's RowVisual writes it: an animated WebP clip in a
// <picture> whose reduced-motion source is its poster (also the <img>'s background,
// shown until the clip loads), lazy and sized, in a link to its .mp4
// (no zoom script here, so the link opens the video itself), or a plain image.
const stillAttr = (poster) => (poster ? ` style="background-image:url(${esc(poster)});background-size:cover"` : '');

function rowVisual({ src, poster, video, width, height, alt, caption }) {
  const img = `<img src="${esc(src)}" width="${width}" height="${height}" alt="${esc(alt)}" loading="lazy" decoding="async"${stillAttr(poster)} />`;
  const media = poster
    ? `<picture><source media="(prefers-reduced-motion: reduce)" srcset="${esc(poster)}" />${img}</picture>`
    : img;
  const linked = video
    ? `<a class="wr-figure__zoom pv-visual__zoom" href="${esc(video)}" data-video="${esc(video)}" aria-label="${esc(`Play full size: ${alt}`)}">${media}</a>`
    : media;
  return `<figure class="pv-visual">${linked}${caption ? `<figcaption>${esc(caption)}</figcaption>` : ''}</figure>`;
}

// A row's diagram; its width and height, when given, hold its place.
function rowFigure({ image, width, height, alt, caption }) {
  const size = width && height ? ` width="${width}" height="${height}"` : '';
  return `<figure class="pv-figure"><img src="${esc(image)}"${size} alt="${esc(alt)}" loading="lazy" decoding="async" /><figcaption>${esc(caption)}</figcaption></figure>`;
}

// A draft row: its one line is the <summary>, and opening it shows the result,
// the visual, the longer sentences, the figure, the PDFs and where to start. In
// the second draft (v2) the whole line opens the row: the name is plain text, and
// its link waits in the panel, labelled, ahead of the PDFs.
function protoEntry(item, writing, v2 = false) {
  const { result, visual, detail, figure, docs, start, href, note } = item;
  const folds = result || visual || detail || figure || docs || start || note;
  const name = v2 && folds ? `<strong class="pv-strong">${esc(item.name)}</strong>` : nameHtml(item, 'pv-strong pv-name-link', true);
  const line = `${name}${rowText(item, Boolean(href) && !(v2 && folds))}`;
  // A <details> hides everything but its <summary> while shut, so a folded row's
  // subtitle sits inside the summary, as a block; a plain row's is a <p> as in the app.
  const subText = item.sub ? esc(item.sub) : '';
  if (!folds) {
    return `<div class="pv-entry"><p class="pv-entry__head">${line}</p>${subText ? `<p class="pv-entry__sub">${subText}</p>` : ''}</div>`;
  }
  const own = v2 && href
    ? `<span><a class="pv-link pv-doc pv-row-link" href="${esc(href)}"${NEW_TAB}>${linkLabel(href)}</a></span>`
    : '';
  const inner = [
    result && `<p class="pv-result">${esc(result)}</p>`,
    visual && rowVisual(visual),
    detail && `<p class="pv-detail">${esc(detail)}</p>`,
    figure && rowFigure(figure),
    (own || docs) && `<p class="pv-docs">${own}${docs ? docList(docs, !!own) : ''}</p>`,
    start && `<p class="pv-start">${esc(start)}</p>`,
    note && `<p class="pv-note">${esc(note.text)}<a class="pv-link" href="${writing}${esc(note.slug)}/">${esc(note.label)}</a></p>`,
  ].filter(Boolean).join('\n');
  return `<details class="pv-entry">
<summary class="pv-entry__head">${line}<span class="pv-entry__mark" aria-hidden="true"></span>${subText ? `<span class="pv-entry__sub">${subText}</span>` : ''}</summary>
<div class="pv-fold__inner">
${inner}
</div>
</details>`;
}

// A section heading with its documents beside it: content.json `headLink`, and
// `docs` (one with no href is a spot still waiting for its link).
function heading({ heading: h, headLink, docs }) {
  if (!headLink && !docs) return `<h2>${esc(h)}</h2>`;
  const head = headLink
    ? ` <a class="pv-link pv-head-link" href="${esc(headLink.href)}"${NEW_TAB}>${esc(headLink.label)}${headLink.arrow ? '<span class="pv-name-link__out" aria-hidden="true">\u2197\uFE0E</span>' : ''}</a>`
    : '';
  const rest = (docs || [])
    .map((d) => ` <span>${d.href
      ? `<a class="pv-link pv-head-link" href="${esc(d.href)}"${NEW_TAB}>${esc(d.label)}</a>`
      : `<span class="pv-head-link pv-pending">${esc(d.label)} (${esc(d.pending)})</span>`}</span>`)
    .join('');
  return `<h2 class="pv-head-with-link">${esc(h)}${head}${rest}</h2>`;
}

// "September ’26", from an essay's YYYY-MM-DD date.
function monthYear(iso) {
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];
  const [y, m] = iso.split('-');
  return `${MONTHS[Number(m) - 1]} ’${y.slice(2)}`;
}

// `essays` is newest first. Drafts are listed, because the whole of
// STATIC_PATH is the noindex review copy. With none, the Essays link in the
// bar and the Essays section are both left out. `v2` renders the second
// draft: rows that open on their whole line, and a contact card V2_CSS hides
// on desktop. `front` renders the front page: the block minus its documents.
function renderDraft(content, essays = [], { v2 = false, front = false } = {}) {
  const pt = front ? frontPage(content.prototype) : content.prototype;
  const writing = `${STATIC_PATH}writing/`;
  const link = ({ label, href }) => `<a class="pv-link" href="${esc(href)}"${NEW_TAB}>${esc(label)}</a>`;
  // The front page puts AI work first, as the React one does.
  const sections = (front ? [pt.aiWork, pt.experience] : [pt.experience, pt.aiWork])
    .map((sec) => `<section class="pv-block">
${heading(sec)}
${sec.items.map((item) => protoEntry(item, writing, v2)).join('\n')}
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
<a class="pv-link${v2 ? ' pv-contact' : ''}" href="${esc(pt.contactCard.href)}" download title="${esc(pt.contactCard.title)}">${esc(pt.contactCard.label)}</a>
</span>
${THEME_SWITCH}
</span>
<span class="pv-links__rest">
${essays.length ? `<a class="pv-link" href="${writing}">${esc(pt.essays.heading)}</a>\n` : ''}${pt.links.map(link).join('\n')}
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

// The front page is the draft minus its documents, with published essays only.
function renderFront(content, essays = []) {
  return renderDraft(content, essays.filter((e) => !e.draft), { front: true });
}

// ---- essays: the markup of src/writing/Writing.js, as strings ---------------

const SITE = 'https://ihsan.cc';

function inline(nodes, notes, seen) {
  return nodes.map((n) => {
    switch (n.t) {
      case 'em': return `<em>${inline(n.c, notes, seen)}</em>`;
      case 'strong': return `<strong>${inline(n.c, notes, seen)}</strong>`;
      case 'mark': return `<mark class="wr-added">${inline(n.c, notes, seen)}</mark>`;
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
      const { kind, src, alt, caption, width, height, missing, video, poster } = b;
      // A diagram shrinks to fit the column on a phone rather than scrolling sideways.
      // A click on the figure enlarges it, or plays its video (ZOOM_SCRIPT). A clip with
      // its .mp4 is a clip: the lazy image in a <picture>, its poster its background until
      // it loads, and in its place under reduced motion (Writing.js, Clip).
      const label = `${video ? 'Play full size' : 'Enlarge'}: ${alt}`;
      const size = `${width ? ` width="${width}"` : ''}${height ? ` height="${height}"` : ''}`;
      const gif = `<img class="wr-figure__img" src="${esc(src)}" alt="${esc(alt)}"${size} loading="lazy" decoding="async"${video ? stillAttr(poster) : ''} />`;
      const media = video
        ? `<picture class="wr-figure__clip">${poster ? `<source media="(prefers-reduced-motion: reduce)" srcset="${esc(poster)}" />` : ''}${gif}</picture>`
        : gif;
      const img = missing
        ? `<div class="wr-figure__missing">Figure not added yet: ${esc(src.split('/').pop())}</div>`
        : `<a class="wr-figure__zoom" href="${esc(video || src)}"${video ? ` data-video="${esc(video)}"` : ''} aria-label="${esc(label)}" aria-haspopup="dialog">${media}</a>`;
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
  return `${topBar(base, { title: e.title })}
<article>
<header class="wr-head"><h1 class="wr-title">${esc(e.title)}</h1>${essayMeta(e)}<p class="wr-standfirst">${esc(e.standfirst)}</p></header>
<div class="wr-body">
${e.blocks.map((b) => block(b, notes, seen)).join('\n')}
</div>
${foot}${reading}
</article>
<nav class="wr-pager" aria-label="More essays">${pager(older, 'prev', 'Previous')}${pager(newer, 'next', 'Next')}<a class="wr-pager__index" href="${base}writing/">All essays</a></nav>`;
}

// The bar above every essay page: the main site, then the essays index, then the
// theme switch (same markup as src/writing/Writing.js). ihsan.cc always goes to the
// real front page, even from the hidden preview path. The page you are on is text.
function topBar(base, { title } = {}) {
  const sep = '<span class="wr-top__sep" aria-hidden="true">/</span>';
  const here = (t) => `<span class="wr-top__here" aria-current="page">${esc(t)}</span>`;
  const essays = title
    ? `<a class="wr-top__link" href="${base}writing/">Essays</a>${sep}${here(title)}`
    : here('Essays');
  return `<nav class="wr-top" aria-label="Site"><span class="wr-top__crumbs"><a class="wr-top__link" href="/">ihsan.cc</a>${sep}${essays}</span>${THEME_SWITCH}</nav>`;
}

function renderIndex(essays, { base }) {
  const list = essays.length
    ? `<ol class="wr-index__list">
${essays.map((e) => `<li class="wr-index__item"><a class="wr-index__link" href="${base}writing/${e.slug}/">${esc(e.title)}</a><p class="wr-index__summary">${esc(e.summary)}</p>${essayMeta(e)}</li>`).join('\n')}
</ol>`
    : '<p class="wr-index__empty">Nothing here yet.</p>';
  return `${topBar(base)}
<h1 class="wr-index__title">Essays</h1>
${list}`;
}

// Every /writing page as { rel, html }, rel being the directory under base.
// "Draft essays never appear on the public site": with preview false a draft is
// neither listed nor given a page, and every page is noindex when preview is on.
function renderWriting(essays, shell, { base = STATIC_PATH, preview = true } = {}) {
  const shown = preview ? essays : essays.filter((e) => !e.draft);
  const out = [{
    rel: 'writing',
    html: page(shell, {
      mainClass: 'wr wr-index', body: renderIndex(shown, { base }), noindex: preview, essay: true,
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
      extraScript: ZOOM_SCRIPT,
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
/* A switch stays hidden until its script runs. */
.theme-switch[hidden] { display: none !important; }
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

// The second draft's own rules, on top of site.css. Phones (640px and under)
// are the main view, since an NFC card opens the site there: they keep the
// contact card in the top row and the two-across grid, and nothing here makes
// them taller. Wider screens drop the card and get bigger photos.
const V2_CSS = `/* Second draft: the fold marker sits on the column's right edge, level with the first line. */
.pv-v2 summary.pv-entry__head { position: relative; padding-right: 22px; }
.pv-v2 .pv-entry__mark { position: absolute; right: 0; top: calc((1.6em - 14px) / 2); margin-left: 0; }
.pv-v2 summary.pv-entry__head:hover .pv-strong { text-decoration: underline; text-underline-offset: 3px; text-decoration-color: var(--pv-link-rule); }
/* Projects two across at every width: on a phone that shows more per screen than one. */
.pv-v2 .pv-hw { grid-template-columns: repeat(2, minmax(0, 1fr)); }
@media (min-width: 641px) {
  .pv-v2 .pv-hw { gap: 26px 22px; }
  .pv-v2 .pv-hw__item { font-size: 16px; }
  /* Save contact is for the phone the card opens on; a desktop has no use for it. */
  .pv-v2 .pv-contact { display: none; }
}
`;

function build(buildDir = path.join(ROOT, 'build'), essays = loadEssays()) {
  const readJson = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
  // {autobox.prs} and the like become src/stats.json's numbers; a missing one throws.
  const content = fillStats(readJson('src/content.json'), readJson('src/stats.json'));
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
    page(shell, { mainClass: 'pv pv-proto', body: renderFront(content, essays), noindex: true }));
  fs.writeFileSync(path.join(buildDir, DRAFT_PATH, 'index.html'),
    page(shell, { mainClass: 'pv pv-proto', body: renderDraft(content, essays), noindex: true }));
  fs.mkdirSync(path.join(buildDir, DRAFT_V2_PATH), { recursive: true });
  cssVersion.v2 = versionOf(V2_CSS);
  fs.writeFileSync(path.join(buildDir, DRAFT_V2_PATH, 'v2.css'), V2_CSS);
  fs.writeFileSync(path.join(buildDir, DRAFT_V2_PATH, 'index.html'),
    page(shell, {
      mainClass: 'pv pv-proto pv-v2', body: renderDraft(content, essays, { v2: true }), noindex: true,
      extraCss: `${DRAFT_V2_PATH}v2.css${cssVersion.v2}`,
    }));
  fs.writeFileSync(path.join(out, 'writing.css'), writingCss);
  for (const { rel, html } of renderWriting(essays, shell)) {
    fs.mkdirSync(path.join(out, rel), { recursive: true });
    fs.writeFileSync(path.join(out, rel, 'index.html'), html);
  }
  return out;
}

module.exports = { STATIC_PATH, DRAFT_PATH, DRAFT_V2_PATH, build, renderFront, renderDraft, renderWriting, headFrom, page };

if (require.main === module) {
  console.log(`static pages -> ${build(process.argv[2] && path.resolve(process.argv[2]))}`);
}

// The static pages scripts/build-static.js writes: all copy in the HTML
// itself, no React bundle, hidden from search, the draft's rows as <details>,
// and /writing with drafts shown only in the review copy.
const { renderFront, renderDraft, renderWriting, page, headFrom, STATIC_PATH, DRAFT_V2_PATH } = require('../scripts/build-static');
const fs = require('fs');
const path = require('path');
const content = require('./content.json');
const { frontPage } = require('./frontPage');

const shell = headFrom(fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8'));
const decode = (s) => s.replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&amp;/g, '&');

test('the front page is the draft minus its documents, with all its copy in the HTML', () => {
  const body = renderFront(content);
  const html = decode(page(shell, { mainClass: 'pv pv-proto', body, noindex: true }));
  const pt = frontPage(content.prototype);
  [pt.name, pt.subtitle, ...pt.about,
    ...pt.experience.items.flatMap((i) => [i.name, i.text, i.result]),
    ...pt.aiWork.items.flatMap((i) => [i.name, i.text, i.result]),
    ...pt.projects.items.map((i) => i.title)].forEach((t) => expect(html).toContain(t));
  // Every AI row keeps its GitHub link; every project tile its own link.
  pt.aiWork.items.forEach(({ href }) => expect(html).toContain(`href="${href}"`));
  pt.projects.items.forEach(({ href }) => expect(html).toContain(`href="${href}"`));
  // The draft's documents beside AI work, and its essays, are not on it.
  expect(content.prototype.aiWork.docs).toBeUndefined();
  expect(body).not.toContain('AI portfolio');
  expect(body).not.toMatch(/pv-docs|pv-pending|pv-start/);
  expect(body).not.toContain(`href="${STATIC_PATH}writing/"`);
  expect(html).toContain('<meta name="robots" content="noindex" />');
  expect(html).toContain('property="og:image"');
  expect(html).toContain(`href="${STATIC_PATH}site.css"`);
  expect(html).not.toMatch(/src="\/static\/js\//);
  // The switch starts hidden, so a page without JavaScript shows no dead button.
  expect(html).toMatch(/<button[^>]*id="theme-toggle"[^>]*hidden/);
});

test('frontPage drops section and row documents, and keeps every link of its own and the row visuals', () => {
  const block = {
    experience: { heading: 'E', docs: [{ label: 'D', href: '/d.pdf' }], items: [{ name: 'a', href: '/a', docs: [{ label: 'x', href: '/x.pdf' }], start: 'S.' }] },
    aiWork: { heading: 'A', items: [{ name: 'b', href: 'https://github.com/ihsan-sa/b', result: 'R.', visual: { src: '/v.webp', width: 1, height: 1, alt: 'V' } }] },
    projects: { heading: 'P', headLink: { label: 'H', href: '/h' }, items: [] },
  };
  expect(frontPage(block)).toEqual({
    experience: { heading: 'E', items: [{ name: 'a', href: '/a' }] },
    aiWork: { heading: 'A', items: [{ name: 'b', href: 'https://github.com/ihsan-sa/b', result: 'R.', visual: { src: '/v.webp', width: 1, height: 1, alt: 'V' } }] },
    projects: { heading: 'P', headLink: { label: 'H', href: '/h' }, items: [] },
  });
});

test('the static pages show each AI row\'s clip, poster, video and diagram, sized', () => {
  [decode(renderFront(content)), decode(renderDraft(content)), decode(renderDraft(content, [], { v2: true }))].forEach((html) => {
    content.prototype.aiWork.items.filter((i) => i.visual).forEach(({ visual, figure }) => {
      expect(html).toContain(`<a class="wr-figure__zoom pv-visual__zoom" href="${visual.video}" data-video="${visual.video}"`);
      expect(html).toContain(`<picture><source media="(prefers-reduced-motion: reduce)" srcset="${visual.poster}" /><img src="${visual.src}" width="${visual.width}" height="${visual.height}" alt="${visual.alt}" loading="lazy" decoding="async" style="background-image:url(${visual.poster});background-size:cover" /></picture>`);
      expect(html).toContain(`<figcaption>${visual.caption}</figcaption>`);
      if (figure) expect(html).toContain(`<img src="${figure.image}" width="${figure.width}" height="${figure.height}" alt="${figure.alt}"`);
    });
  });
});

test('a static row visual with no poster or video is a plain image', () => {
  const block = {
    ...content.prototype,
    aiWork: { heading: 'A', items: [{ name: 'b', text: 't.', result: 'R.', visual: { src: '/v.webp', width: 4, height: 3, alt: 'V.' }, figure: { image: '/f.svg', alt: 'F.', caption: 'C.' } }] },
  };
  const html = renderDraft({ ...content, prototype: block });
  expect(html).toContain('<figure class="pv-visual"><img src="/v.webp" width="4" height="3" alt="V." loading="lazy" decoding="async" /></figure>');
  expect(html).toContain('<figure class="pv-figure"><img src="/f.svg" alt="F." loading="lazy" decoding="async" /><figcaption>C.</figcaption></figure>');
});

test('the AI work heading is plain, the Hardware portfolio link has the arrow and essay titles do not', () => {
  const html = renderDraft(content);
  expect(html).toContain('<h2>AI work</h2>');
  const head = html.match(/<h2 class="pv-head-with-link">Projects[\s\S]*?<\/h2>/)[0];
  expect(head).toContain('Hardware portfolio<span class="pv-name-link__out" aria-hidden="true">\u2197</span></a>');
  html.match(/<a class="pv-strong pv-name-link" href="[^"]*\/writing\/[^"]*">[^<]*<\/a>/g)?.forEach((a) => expect(a).not.toContain('__out'));
});

test('each AI row has its subtitle, in the summary of a folded row so a shut fold keeps it', () => {
  const html = renderDraft(content);
  content.prototype.aiWork.items.forEach(({ sub }) => {
    expect(sub).toBeTruthy();
    expect(html).toMatch(new RegExp(`<(span|p) class="pv-entry__sub">${sub.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</\\1>`));
  });
  expect(html).toMatch(/<summary class="pv-entry__head">[^]*?<span class="pv-entry__sub">[^]*?<\/summary>/);
  const plain = renderDraft({ ...content, prototype: { ...content.prototype, aiWork: { heading: 'A', items: [{ name: 'b', text: 't.', sub: 'S & s.' }] } } });
  expect(plain).toContain('<p class="pv-entry__sub">S &amp; s.</p>');
});

test('page() leaves noindex out when asked, for the day it moves to /', () => {
  const html = page(shell, { mainClass: 'pv', body: '', noindex: false });
  expect(html).not.toContain('noindex');
});

test('the draft folds its rows with <details> and keeps the folded copy', () => {
  const html = decode(renderDraft(content));
  const rows = [...content.prototype.experience.items, ...content.prototype.aiWork.items];
  const folded = rows.filter((r) => r.result || r.visual || r.detail || r.figure || r.docs || r.start);
  expect(html.match(/<details class="pv-entry">/g)).toHaveLength(folded.length);
  folded.forEach((r) => r.result && expect(html).toContain(r.result));
  folded.forEach((r) => r.detail && expect(html).toContain(r.detail));
  expect(html).not.toContain('<button type="button" class="pv-entry__btn"');
  // A row with a `short` carries both lengths; the fold opens on the result alone.
  // Its `where` follows the full text in italics, and stays off the phone line.
  expect(html).toContain('<span class="pv-t-long">, RF Plasma Generation, <em>San Francisco, Summer ’26</em></span><span class="pv-t-short">, RF plasma, ’26.</span>');
  expect(html).not.toContain('pv-fold__long');
  // A row without a `where` has no italic part.
  expect(html).toContain('<span class="pv-t-long">, BASc Electrical Engineering. 2024–2029.</span>');
  // No page counts anywhere, and no foot: the contact card is in the links bar.
  expect(html).not.toMatch(/PDF, \d+ page/);
  expect(html).not.toContain('pv-foot');
  // The switch starts hidden, so with JavaScript off the page follows the OS theme.
  expect(html).toMatch(/<button[^>]*class="theme-switch" role="switch"[^>]*hidden/);
});

test('the draft lists the essays it is given, and leaves the link and section out with none', () => {
  const html = decode(renderDraft(content, twoEssays()));
  expect(html).toContain(`<a class="pv-link" href="${STATIC_PATH}writing/">Essays</a>`);
  expect(html).toContain(`<h2><a class="pv-strong" href="${STATIC_PATH}writing/">Essays</a></h2>`);
  expect(html).toContain(`<a class="pv-strong pv-name-link" href="${STATIC_PATH}writing/second/">Second</a>, About Second. September ’26.`);
  const none = decode(renderDraft(content, []));
  expect(none).not.toContain('<h2><a class="pv-strong"');
  expect(none).not.toContain(`href="${STATIC_PATH}writing/"`);
});

test('the second draft is hidden, and opens each row on its whole line', () => {
  expect(DRAFT_V2_PATH).toMatch(/^\/[a-z0-9]{32}\/$/);
  expect(DRAFT_V2_PATH).not.toBe(STATIC_PATH);
  const body = renderDraft(content, [], { v2: true });
  const html = page(shell, { mainClass: 'pv pv-proto pv-v2', body, noindex: true, extraCss: `${DRAFT_V2_PATH}v2.css` });
  expect(html).toContain('<meta name="robots" content="noindex" />');
  expect(html).toContain(`<link rel="stylesheet" href="${DRAFT_V2_PATH}v2.css" />`);
  const rows = [...content.prototype.experience.items, ...content.prototype.aiWork.items];
  const folded = rows.filter((r) => r.result || r.visual || r.detail || r.figure || r.docs || r.start);
  expect(body.match(/<details class="pv-entry">\n<summary class="pv-entry__head">/g)).toHaveLength(folded.length);
  // No link in any row's line: the name is text, its link sits in the panel, labelled.
  body.match(/<summary[\s\S]*?<\/summary>/g).forEach((line) => expect(line).not.toContain('<a '));
  const linked = folded.find((r) => /^https:\/\/github\.com\//.test(r.href));
  expect(body).toContain(`<summary class="pv-entry__head"><strong class="pv-strong">${linked.name}</strong>`);
  expect(body).toContain(`<a class="pv-link pv-doc pv-row-link" href="${linked.href}" target="_blank" rel="noopener noreferrer">GitHub</a>`);
  // The contact card carries the class the desktop rule hides; the first draft's does not.
  expect(body).toContain('<a class="pv-link pv-contact" href="');
  expect(renderDraft(content)).not.toContain('pv-contact');
  // Nothing the site ships names the path.
  const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  ['public/robots.txt', 'public/_redirects', 'public/index.html', 'src/content.json', 'src/App.js'].forEach((f) =>
    expect(read(f)).not.toContain(DRAFT_V2_PATH.slice(1, -1)));
  expect(renderDraft(content)).not.toContain(DRAFT_V2_PATH);
});

// Each case builds its own two essays: one published, one draft.
function twoEssays() {
  const { parseEssay } = require('../scripts/writing');
  const md = (title, date, draft) => `---\ntitle: ${title}\ndate: ${date}\nsummary: About ${title}.\nstandfirst: Why ${title}.\ndraft: ${draft}\n---\n\nA paragraph of ${title} with *emphasis*.\n`;
  return [
    parseEssay(md('Second', '2026-09-02', true), 'second').essay,
    parseEssay(md('First', '2026-09-01', false), 'first').essay,
  ];
}

test('the review copy of /writing lists and renders drafts, all noindex', () => {
  const pages = renderWriting(twoEssays(), shell);
  expect(pages.map((p) => p.rel)).toEqual(['writing', 'writing/second', 'writing/first']);
  const index = decode(pages[0].html);
  expect(index).toContain('Second');
  expect(index).toContain(' · Draft');
  const essay = decode(pages[1].html);
  expect(essay).toContain('A paragraph of Second with <em>emphasis</em>.');
  expect(essay).toContain('<title>Second · Ihsan Salari</title>');
  expect(essay).toContain(`href="${STATIC_PATH}writing.css"`);
  // The bar is a trail: ihsan.cc, Essays, then the essay; the page you are on is text.
  const home = '<a class="wr-top__link" href="/">ihsan.cc</a><span class="wr-top__sep" aria-hidden="true">/</span>';
  expect(essay).toContain(`<nav class="wr-top" aria-label="Site"><span class="wr-top__crumbs">${home}<a class="wr-top__link" href="${STATIC_PATH}writing/">Essays</a><span class="wr-top__sep" aria-hidden="true">/</span><span class="wr-top__here" aria-current="page">Second</span></span>`);
  expect(index).toContain(`<nav class="wr-top" aria-label="Site"><span class="wr-top__crumbs">${home}<span class="wr-top__here" aria-current="page">Essays</span></span>`);
  expect(essay).toMatch(/<\/span><button[^>]*role="switch"[^>]*hidden/);
  expect(essay).toContain('All essays');
  expect(index).toContain('<h1 class="wr-index__title">Essays</h1>');
  expect(index).toContain('<title>Essays · Ihsan Salari</title>');
  pages.forEach((p) => expect(p.html).toContain('content="noindex"'));
});

test('a static essay enlarges its figures with the same script the app imports', () => {
  const { parseEssay } = require('../scripts/writing');
  const md = '---\ntitle: Z\ndate: 2026-09-03\nsummary: S.\nstandfirst: W.\ndraft: true\n---\n\n![Moving.](m.gif)\n\n![Drawn.](d.svg)\n';
  // No poster beside the GIF: the clip has no reduced-motion source, and plays its .mp4 when clicked.
  const { essay } = parseEssay(md, 'z', (slug, file) => ({ exists: !/-poster\.webp$/.test(file) }));
  const [index, html] = renderWriting([essay], shell).map((p) => p.html);
  expect(html).toContain('<a class="wr-figure__zoom" href="/writing/z/m.mp4" data-video="/writing/z/m.mp4" aria-label="Play full size: Moving." aria-haspopup="dialog"><picture class="wr-figure__clip"><img class="wr-figure__img" src="/writing/z/m.gif"');
  expect(html).toContain('<a class="wr-figure__zoom" href="/writing/z/d.svg" aria-label="Enlarge: Drawn." aria-haspopup="dialog"><img');
  const zoom = fs.readFileSync(path.join(__dirname, 'writing/zoom.js'), 'utf8').trim();
  expect(html).toContain(`<script>\n${zoom}\n</script>`);
  expect(zoom).not.toMatch(/^\s*(import|export)\b|<\/script/m);
  // No video loads with the page, and the list of essays carries no script for it.
  expect(html).not.toContain('<video');
  expect(index).not.toContain('wrZoom');
});

test('a static essay shows a GIF with an .mp4 as the lazy GIF, its poster under reduced motion', () => {
  const { parseEssay } = require('../scripts/writing');
  const md = '---\ntitle: Z\ndate: 2026-09-03\nsummary: S.\nstandfirst: W.\ndraft: true\n---\n\n![Moving.](m.gif)\n';
  const { essay } = parseEssay(md, 'z', (slug, file) => (file === 'm-poster.webp' ? { exists: true, width: 1280, height: 720 } : { exists: true, width: 640, height: 360 }));
  const html = renderWriting([essay], shell)[1].html;
  expect(html).toContain('<a class="wr-figure__zoom" href="/writing/z/m.mp4" data-video="/writing/z/m.mp4" aria-label="Play full size: Moving." aria-haspopup="dialog">'
    + '<picture class="wr-figure__clip"><source media="(prefers-reduced-motion: reduce)" srcset="/writing/z/m-poster.webp" />'
    + '<img class="wr-figure__img" src="/writing/z/m.gif" alt="Moving." width="640" height="360" loading="lazy" decoding="async" style="background-image:url(/writing/z/m-poster.webp);background-size:cover" /></picture></a>');
  // No <video> loads with the page; the script opens the .mp4 on a click.
  expect(html).not.toContain('<video');
  expect(html).toContain('wrZoom');
});

test('a static essay marks an added passage as the app does', () => {
  const { parseEssay } = require('../scripts/writing');
  const md = '---\ntitle: Z\ndate: 2026-09-03\nsummary: S.\nstandfirst: W.\ndraft: true\n---\n\nOld. <mark class="wr-added">New *em*.</mark>\n';
  const { essay } = parseEssay(md, 'z');
  const html = renderWriting([essay], shell)[1].html;
  expect(html).toContain('<p class="wr-p">Old. <mark class="wr-added">New <em>em</em>.</mark></p>');
});

test('the public /writing rule leaves drafts unlisted and without a page', () => {
  const pages = renderWriting(twoEssays(), shell, { preview: false });
  expect(pages.map((p) => p.rel)).toEqual(['writing', 'writing/first']);
  expect(pages[0].html).not.toContain('Second');
  expect(pages[1].html).toContain('Why First.');
  pages.forEach((p) => expect(p.html).not.toContain('noindex'));
});

test('the static pages mark a linked row name with the arrow, and the autobox note links to its essay', () => {
  [decode(renderFront(content)), decode(renderDraft(content))].forEach((html) => {
    expect(html).toContain('pv-name-link--out" href="https://github.com/ihsan-sa/autobox" target="_blank" rel="noopener noreferrer">autobox<span class="pv-name-link__out" aria-hidden="true">\u2197</span></a>');
    expect(html).toMatch(/<p class="pv-note">For more details, read <a class="pv-link" href="[^"]*writing\/autobox\/">the essay<\/a><\/p>/);
  });
});

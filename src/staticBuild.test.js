// The static pages scripts/build-static.js writes: all copy in the HTML
// itself, no React bundle, hidden from search, the draft's rows as <details>,
// and /writing with drafts shown only in the review copy.
const { renderFront, renderDraft, renderWriting, page, headFrom, STATIC_PATH } = require('../scripts/build-static');
const fs = require('fs');
const path = require('path');
const content = require('./content.json');

const shell = headFrom(fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8'));
const decode = (s) => s.replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&amp;/g, '&');

test('the front page carries its copy in the HTML', () => {
  const html = decode(page(shell, { mainClass: 'pv', body: renderFront(content), noindex: true }));
  const { preview } = content;
  [preview.name, preview.subtitle, ...preview.about,
    ...preview.experience.items.flatMap((i) => [i.name, i.text]),
    ...preview.aiWork.items.flatMap((i) => [i.name, i.text]),
    ...preview.hardware.items.map((i) => i.title)].forEach((t) => expect(html).toContain(t));
  expect(html).toContain('<meta name="robots" content="noindex" />');
  expect(html).toContain('property="og:image"');
  expect(html).toContain(`href="${STATIC_PATH}site.css"`);
  expect(html).not.toMatch(/src="\/static\/js\//);
  // The toggle starts hidden, so a page without JavaScript shows no dead button.
  expect(html).toMatch(/<button[^>]*id="theme-toggle"[^>]*hidden/);
});

test('page() leaves noindex out when asked, for the day it moves to /', () => {
  const html = page(shell, { mainClass: 'pv', body: '', noindex: false });
  expect(html).not.toContain('noindex');
});

test('the draft folds its rows with <details> and keeps the folded copy', () => {
  const html = decode(renderDraft(content));
  const rows = [...content.prototype.experience.items, ...content.prototype.aiWork.items];
  const folded = rows.filter((r) => r.result || r.detail || r.figure || r.docs || r.start);
  expect(html.match(/<details class="pv-entry">/g)).toHaveLength(folded.length);
  folded.forEach((r) => r.result && expect(html).toContain(r.result));
  folded.forEach((r) => r.detail && expect(html).toContain(r.detail));
  expect(html).not.toContain('<button type="button" class="pv-entry__btn"');
  // A row with a `short` carries both lengths; the fold opens on the full text.
  expect(html).toContain('<span class="pv-t-long">, RF for plasma generation. Summer ’26.</span><span class="pv-t-short">, RF plasma, ’26.</span>');
  expect(html).toContain('<p class="pv-result pv-fold__long">RF for plasma generation. Summer ’26.</p>');
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
  expect(essay).toMatch(/<nav class="wr-top"><a class="wr-top__link" href="[^"]+">Essays<\/a><button[^>]*role="switch"[^>]*hidden/);
  expect(essay).toContain('All essays');
  expect(index).toContain('<h1 class="wr-index__title">Essays</h1>');
  expect(index).toContain('<title>Essays · Ihsan Salari</title>');
  pages.forEach((p) => expect(p.html).toContain('content="noindex"'));
});

test('the public /writing rule leaves drafts unlisted and without a page', () => {
  const pages = renderWriting(twoEssays(), shell, { preview: false });
  expect(pages.map((p) => p.rel)).toEqual(['writing', 'writing/first']);
  expect(pages[0].html).not.toContain('Second');
  expect(pages[1].html).toContain('Why First.');
  pages.forEach((p) => expect(p.html).not.toContain('noindex'));
});

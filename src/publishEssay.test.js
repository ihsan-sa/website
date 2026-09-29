// The essay template (content/essay-template/essay.tex) and scripts/publish-essay.js, which
// turns an essay written from it into the site's markdown.
const fs = require('fs');
const path = require('path');
const { convert } = require('../scripts/publish-essay');
const { parseEssay } = require('../scripts/writing');

const TEMPLATE = fs.readFileSync(path.join(__dirname, '..', 'content', 'essay-template', 'essay.tex'), 'utf8');
const doc = (body) => `\\documentclass{article}\n\\begin{document}\n${body}\n\\end{document}\n`;
const DETAILS = '\\essayslug{s}\\essaydate{2026-10-01}\\essaysummary{Sum.}\\essaytitle{T}\\essaystandfirst{Stand.}';

test('the template converts with nothing to settle, and the site parses every piece it shows', () => {
  const { slug, markdown, figures, problems } = convert(TEMPLATE);
  expect(problems).toEqual([]);
  expect(slug).toBe('a-short-slug');
  expect(figures).toEqual([{ from: 'figures/diagram.svg', name: 'diagram.svg' }, { from: 'figures/photo.png', name: 'photo.png' }]);
  const { essay: e, problems: parsed } = parseEssay(markdown, slug);
  expect(parsed).toEqual([]);
  expect(e).toMatchObject({ title: "The essay's title", date: '2026-10-01', draft: true, blurb: 'what the essay is about, in a clause.' });
  expect(e.blocks.map((b) => b.t)).toEqual(['p', 'h2', 'p', 'figure', 'h3', 'p', 'ul', 'quote', 'figure', 'h2', 'p', 'code', 'p']);
  expect(e.blocks.filter((b) => b.t === 'figure').map((b) => b.kind)).toEqual(['diagram', 'image']);
  expect(e.blocks[11]).toEqual({ t: 'code', lang: 'sh', v: 'echo "a line of code"' });
  expect(e.footnotes.map((f) => f.n)).toEqual([1, 2]);
  expect(e.furtherReading).toEqual([{ title: 'A library document', href: 'https://library.ihsan.cc/d/006-0032-A', note: 'what the reader finds in it', pages: 4 }]);
});

test('draft false publishes: the draft line is left out, and anything but false keeps it', () => {
  expect(convert(doc(`${DETAILS}\\essaydraft{false}\nText.`)).markdown).not.toMatch(/^draft:/m);
  expect(convert(doc(`${DETAILS}\\essaydraft{no}\nText.`)).markdown).toMatch(/^draft: true$/m);
  expect(convert(doc(`${DETAILS}\nText.`)).markdown).toMatch(/^draft: true$/m);
});

test('inline LaTeX becomes markdown, and a command the site has no form for is listed', () => {
  const { markdown, problems } = convert(doc(`${DETAILS}\nA \\href{https://a.b}{\\emph{link}}, 10\\% and E\\&M --- \`\`quoted''.\\essaynote{See \\texttt{a\\_b}.}\n\n\\begin{tabular}{c}x\\end{tabular}`));
  expect(markdown).toContain('A [*link*](https://a.b), 10% and E&M — “quoted”.[^1]');
  expect(markdown).toContain('[^1]: See `a_b`.');
  expect(problems).toEqual(['by hand: \\begin has no place in the site\'s format', 'by hand: \\end has no place in the site\'s format']);
});

test('missing details are named, and a comment is not read as text', () => {
  const { markdown, problems } = convert(doc('\\essaytitle{T}\nKept. % not this\n\\% this'));
  expect(markdown).toContain('Kept. % this');
  expect(problems).toEqual(expect.arrayContaining(['\\essayslug is missing or empty', '\\essaysummary is missing or empty']));
  expect(problems).not.toContain('\\essaytitle is missing or empty');
});

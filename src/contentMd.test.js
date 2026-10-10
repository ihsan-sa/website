// The site text's Markdown form (scripts/content-md.js), which the library keeps and carries
// back: the committed .md must be what src/content.json renders to, and an edit to it must
// change that one string and nothing else.
const fs = require('fs');
const path = require('path');
const { toMd, fromMd, renderMd, applyEdits } = require('../scripts/content-md');

const text = fs.readFileSync(path.join(__dirname, 'content.json'), 'utf8');
const md = renderMd(JSON.parse(text));

test('every character the site uses survives the trip through Markdown', () => {
  ['Lorentz E&M, 89% · 10–50 V — $5 #1 a_b {x} ~ ^ \\ multi‑beam ’26 é *b* [l](h) <i> `c` &amp;',
    '# not a heading', '- not a list', '1. not a list', 'read ', ' both ', '&#32; literal']
    .forEach((s) => expect(fromMd(toMd(s))).toBe(s));
});

test('the committed content/site-text.md is what src/content.json renders to (else run npm run content-md -- md)', () => {
  expect(fs.readFileSync(path.join(__dirname, '..', 'content', 'site-text.md'), 'utf8')).toBe(md);
});

test('the untouched document reads back to the same file, and a round trip is byte-identical', () => {
  expect(applyEdits(text, md)).toEqual({ out: text, changed: [], problems: [] });
  const edited = md.replace('GPA 87%.', 'GPA 87%, *and* E&M.').replace('*and*', '\\*and\\*');
  const { out } = applyEdits(text, edited);
  expect(renderMd(JSON.parse(out))).toBe(edited);
});

test('headings in page order, prose plain, and no links or images in the text', () => {
  const heads = md.split('\n').filter((l) => /^#{1,2} /.test(l)).map((l) => l.replace(/ <!--.*/, ''));
  expect(heads).toEqual(['# Ihsan Salari', '## Experience', '## AI work', '## Essays', '## Projects']);
  expect(md).not.toMatch(/https?:|\.webp|\.jpg|hi@ihsan/);
  expect(md).toContain('*On a phone:* RF plasma, ’26. <!-- prototype.experience.items.0.short -->');
});

test('an edit changes that one string, rewrapped and with its label, and keeps the file layout', () => {
  const edited = md.replace('GPA 87%.', 'GPA 87%,\nand E&M in first year.')
    .replace('*On a phone:* RF plasma', '*On a phone:* RF plasmas');
  const { out, changed, problems } = applyEdits(text, edited);
  expect(changed).toEqual(['prototype.experience.items.0.short', 'prototype.experience.items.3.result']);
  expect(problems).toEqual([]);
  const p = JSON.parse(out).prototype;
  expect(p.experience.items[3].result).toBe('Class academic rep and WEEF engineering fund rep. GPA 87%, and E&M in first year.');
  expect(p.experience.items[0].short).toBe('RF plasmas, ’26.');
  expect(out.replace('GPA 87%, and E&M in first year.', 'GPA 87%.').replace('RF plasmas', 'RF plasma')).toBe(text);
});

test('a trailing space is kept: the note runs straight into its link', () => {
  expect(md).toContain('*Note:* For more details, read&#32; <!--');
  expect(JSON.parse(applyEdits(text, md.replace('details, read', 'detail, read')).out)
    .prototype.aiWork.items[1].note.text).toBe('For more detail, read ');
});

test('what it cannot map is listed, and the mapped edits are not written either', () => {
  const edited = md
    .replace('GPA 87%.', 'GPA **87%**.')
    .replace('Hardware portfolio <!-- prototype.projects.headLink.label -->', 'Portfolio <!-- prototype.projects.headLink.title -->')
    .replace('## Essays', 'A new paragraph.\n\n## Essays')
    .replace('*Link:* GitHub', '*Link:* Git Hub')
    .replace('<!-- prototype.links.1.label -->', '<!-- prototype.links.0.label -->');
  const { out, changed, problems } = applyEdits(text, edited);
  expect(out).not.toBe(text); // the mapped edit is computed; pull() writes nothing while problems are listed
  expect(changed).toEqual(['prototype.links.0.label']);
  expect(problems.map((m) => m.split(':')[0])).toEqual([
    'a paragraph with no marker, so no place in content.json',
    'prototype.links.0.label',
    'prototype.experience.items.3.result',
    'prototype.projects.headLink.title',
    'prototype.links.1.label',
    'prototype.projects.headLink.label',
  ]);
});

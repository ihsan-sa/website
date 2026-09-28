// The site-content PDF (scripts/content-pdf.js): the .tex it writes must read back to the
// same content.json, and an edit in the .tex must change that one string and nothing else.
const fs = require('fs');
const path = require('path');
const { toTex, fromTex, renderTex, applyEdits } = require('../scripts/content-pdf');

const text = fs.readFileSync(path.join(__dirname, 'content.json'), 'utf8');
const tex = renderTex(JSON.parse(text), new Date('2026-09-28T12:00:00Z'));

test('every character the site uses survives the trip through LaTeX', () => {
  const s = 'Lorentz E&M, 89% · 10–50 V — $5 #1 a_b {x} ~ ^ \\ multi‑beam ’26 é';
  expect(fromTex(toTex(s))).toBe(s);
});

test('the untouched document reads back to the same file', () => {
  expect(applyEdits(text, tex)).toEqual({ out: text, changed: [], problems: [] });
});

test('an edit changes that one string, reflowed and unescaped, and keeps the file layout', () => {
  const edited = tex.replace('GPA 89\\%.', 'GPA 89\\%,\n  and E\\&M in first year.');
  const { out, changed, problems } = applyEdits(text, edited);
  expect(changed).toEqual(['prototype.experience.items.3.result']);
  expect(problems).toEqual([]);
  expect(JSON.parse(out).prototype.experience.items[3].result).toBe('GPA 89%, and E&M in first year.');
  expect(out.replace('GPA 89%, and E&M in first year.', 'GPA 89%.')).toBe(text);
});

test('what it cannot map is listed and not written', () => {
  const edited = tex
    .replace('GPA 89\\%.', 'GPA \\emph{89}\\%.')
    .replace('\\cf{prototype.projects.items.4.title}', '\\cf{prototype.projects.items.4.result}');
  const { out, changed, problems } = applyEdits(text, edited);
  expect(out).toBe(text);
  expect(changed).toEqual([]);
  expect(problems.map((m) => m.split(':')[0])).toEqual([
    'prototype.experience.items.3.result',
    'prototype.projects.items.4.result',
    'prototype.projects.items.4.title',
  ]);
});

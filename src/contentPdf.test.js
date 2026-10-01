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

test('the phone text, heading links and Essays heading are editable too', () => {
  ['prototype.aiWork.items.0.short', 'prototype.aiWork.docs.0.label', 'prototype.projects.headLink.label',
    'prototype.essays.heading', 'prototype.contactCard.label'].forEach((k) => expect(tex).toContain(`\\cf{${k}}`));
});

test('a row’s place and date is italic in the .tex and an edit to it reads back', () => {
  expect(tex).toContain('\\emph{\\cf{prototype.experience.items.0.where}{San Francisco, Summer ’26}}');
  expect(tex).not.toContain('prototype.experience.items.3.where');
  const edited = tex.replace('{San Francisco, Summer ’26}', '{San Francisco, Summer ’27}');
  const { out, changed, problems } = applyEdits(text, edited);
  expect(changed).toEqual(['prototype.experience.items.0.where']);
  expect(problems).toEqual([]);
  expect(JSON.parse(out).prototype.experience.items[0].where).toBe('San Francisco, Summer ’27');
  expect(out.replace('Summer ’27', 'Summer ’26')).toBe(text);
});

test('an edit changes that one string, reflowed and unescaped, and keeps the file layout', () => {
  const edited = tex.replace('GPA 87\\%.', 'GPA 87\\%,\n  and E\\&M in first year.');
  const { out, changed, problems } = applyEdits(text, edited);
  expect(changed).toEqual(['prototype.experience.items.3.result']);
  expect(problems).toEqual([]);
  expect(JSON.parse(out).prototype.experience.items[3].result).toBe('Class academic rep and WEEF engineering fund rep. GPA 87%, and E&M in first year.');
  expect(out.replace('GPA 87%, and E&M in first year.', 'GPA 87%.')).toBe(text);
});

test('what it cannot map is listed and not written', () => {
  const edited = tex
    .replace('GPA 87\\%.', 'GPA \\emph{87}\\%.')
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

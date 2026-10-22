#!/usr/bin/env node
// The site's body text as a Markdown document the library keeps, and the way back into
// src/content.json. library.json at the repo root declares it; see docs/content-pdf.md.
//
//   node scripts/content-md.js md            write content/site-text.md from the `prototype`
//                                            block of src/content.json, in the page's order
//   node scripts/content-md.js pull [file]   read an edited content/site-text.md (or file)
//                                            back into src/content.json
//
// Every prose string of the block is one paragraph (or heading) in the .md, ending in a
// hidden <!-- <json path> --> marker. Links, images, the e-mail and numbers are not in it.
// A short italic label such as *On a phone:* before a paragraph says what the string is;
// it is not part of the string. `pull` reads each marked paragraph back and writes a
// changed value over that one string in src/content.json, so the file's own layout is
// kept. It never adds, removes or reorders entries: a marker whose path is not a string in
// the file, a path the .md no longer has, a path marked twice, a paragraph with no marker
// and text still carrying Markdown formatting (not written) are listed. Exit 0 when it
// wrote or found nothing to write, 1 when anything is listed, so the library's carry-back
// opens no PR on an edit it cannot map.

const fs = require('fs');
const path = require('path');
const { stringSpans } = require('./content-pdf');

const ROOT = path.resolve(__dirname, '..');
const CONTENT = path.join(ROOT, 'src', 'content.json');
const MD = path.join(ROOT, 'content', 'site-text.md');
const BLOCK = 'prototype';

// Keys that are not prose: links, media, the slug of an essay, the e-mail and notes to editors.
const SKIP = new Set(['href', 'src', 'poster', 'video', 'image', 'slug', 'email']);

// The label shown before a string, by its key (or parent.key); none for plain prose.
const LABELS = {
  'aboutFold.more': 'Fold button, closed',
  'aboutFold.less': 'Fold button, open',
  'contactCard.label': 'Contact button',
  'contactCard.title': 'Contact button tooltip',
  'note.text': 'Note',
  'note.label': 'Note link',
  'headLink.label': 'Heading link',
  where: 'Where and when',
  short: 'On a phone',
  sub: 'Under the name',
  alt: 'Image description',
  caption: 'Caption',
  label: 'Link',
  pending: 'Waiting for its link',
  banner: 'Banner',
  start: 'Start here',
  detail: 'Detail',
  title: 'Title',
};

// ---- text <-> Markdown -----------------------------------------------------

// Characters that would format the text are written with a backslash, which Markdown drops.
function toMd(s) {
  let t = s.replace(/[\\`*_[\]<~]/g, '\\$&').replace(/&(?=#?\w+;)/g, '\\&');
  // What would start a heading, a quote or a list at the head of a paragraph.
  t = t.replace(/^([#>+-])/, '\\$1').replace(/^(\d+)([.)])(?=\s|$)/, '$1\\$2');
  // A space at either end would be trimmed away, so it goes as the entity Markdown shows as one.
  return t.replace(/^ +| +$/g, (sp) => '&#32;'.repeat(sp.length));
}

// The inverse of toMd: &#32; is a space and a backslash before ASCII punctuation is dropped.
const fromMd = (s) => s.replace(/(^|[^\\])((?:\\\\)*)((?:&#32;)+)/g, (m, a, b, sp) => a + b + ' '.repeat(sp.length / 5))
  .replace(/\\([!-/:-@[-`{-~])/g, '$1');

// Markdown formatting left in a paragraph: an unescaped character toMd would have escaped.
const formatted = (s) => /(^|[^\\])(\\\\)*[`*_[\]<~]/.test(s);

// ---- rendering -------------------------------------------------------------

// Every prose string of the block in the file's own order, as { keys, value }.
function strings(block) {
  const out = [];
  const walk = (v, keys) => {
    if (typeof v === 'string') out.push({ keys, value: v });
    else if (Array.isArray(v)) v.forEach((x, i) => walk(x, [...keys, i]));
    else if (v && typeof v === 'object') {
      Object.entries(v).forEach(([k, x]) => {
        if (!SKIP.has(k) && !k.startsWith('_')) walk(x, [...keys, k]);
      });
    }
  };
  walk(block, []);
  return out;
}

function renderMd(content) {
  const L = [
    '<!-- The site\'s text, built by scripts/content-md.js from src/content.json (the draft of',
    'the next front page). Edit the words; each paragraph ends in a hidden marker saying where it',
    'lives in the file, so leave the markers, and keep the text plain (no bold, links or lists).',
    'A label in italics before a paragraph says what it is and is not part of the text. -->',
  ];
  for (const { keys, value } of strings(content[BLOCK])) {
    const key = keys[keys.length - 1];
    const parent = keys[keys.length - 2];
    const mark = ` <!-- ${[BLOCK, ...keys].join('.')} -->`;
    let line;
    if (keys.length === 1 && key === 'name') line = `# ${toMd(value)}`;
    else if (key === 'heading') line = `## ${toMd(value)}`;
    else if (keys[keys.length - 3] === 'items' && (key === 'name' || key === 'title')) line = `### ${toMd(value)}`;
    else {
      const label = LABELS[`${parent}.${key}`] || (typeof key === 'string' && LABELS[key]);
      line = label ? `*${label}:* ${toMd(value)}` : toMd(value);
    }
    L.push('', line + mark);
  }
  return `${L.join('\n')}\n`;
}

// ---- writing back into content.json ----------------------------------------

const MARK = /\s*<!--\s*([\w.]+)\s*-->\s*$/;

// Each marked paragraph of a .md, in order, as { path, value }, and the paragraphs it cannot place.
function readFields(md) {
  const fields = [];
  const stray = [];
  for (const block of md.split(/\n[ \t]*\n/).map((b) => b.trim()).filter(Boolean)) {
    const m = block.match(MARK);
    if (!m) {
      if (!/^<!--[\s\S]*-->$/.test(block)) stray.push(block.replace(/\s+/g, ' '));
      continue;
    }
    let text = block.slice(0, m.index).split('\n').map((l) => l.trim()).join(' ');
    text = text.replace(/^#{1,6}\s+/, '').replace(/^\*[^*\n]*:\*\s?/, '');
    fields.push({ path: m[1], text });
  }
  return { fields, stray };
}

// The edits a .md makes to a content.json text: the new text, what changed and what was not mapped.
function applyEdits(text, md) {
  const spans = stringSpans(text);
  const { fields, stray } = readFields(md);
  const edits = [];
  const problems = stray.map((b) => `a paragraph with no marker, so no place in content.json: ${b}`);
  const seen = new Set();
  for (const { path: p, text: raw } of fields) {
    if (seen.has(p)) { problems.push(`${p}: marked twice`); continue; }
    seen.add(p);
    const value = fromMd(raw);
    if (!spans.has(p)) { problems.push(`${p}: not a string in content.json (a new or moved entry): ${value}`); continue; }
    if (formatted(raw)) { problems.push(`${p}: not written, it has Markdown formatting; write it as plain text: ${raw}`); continue; }
    const [a, b] = spans.get(p);
    if (JSON.parse(text.slice(a, b)) !== value) edits.push({ p, a, b, value });
  }
  const expected = readFields(renderMd(JSON.parse(text))).fields.map((f) => f.path);
  expected.filter((p) => !seen.has(p)).forEach((p) => problems.push(`${p}: gone from the document`));

  let out = text;
  for (const e of [...edits].sort((x, y) => y.a - x.a)) {
    out = out.slice(0, e.a) + JSON.stringify(e.value) + out.slice(e.b);
  }
  JSON.parse(out); // never hand back a file the site cannot read
  return { out, changed: edits.map((e) => e.p), problems };
}

// Nothing is written while anything is listed, so a bad edit leaves the tree clean.
function pull(md) {
  const { out, changed, problems } = applyEdits(fs.readFileSync(CONTENT, 'utf8'), md);
  if (problems.length) {
    problems.forEach((m) => console.log(`not mapped  ${m}`));
    console.log(`${problems.length} paragraph(s) not mapped; src/content.json left as it was`);
    return 1;
  }
  if (changed.length) fs.writeFileSync(CONTENT, out);
  changed.forEach((p) => console.log(`changed  ${p}`));
  console.log(`${changed.length} field(s) written to src/content.json`);
  return 0;
}

function main([cmd, arg]) {
  if (cmd === 'md') {
    fs.writeFileSync(MD, renderMd(JSON.parse(fs.readFileSync(CONTENT, 'utf8'))));
    console.log(`wrote ${path.relative(ROOT, MD)}`);
    return 0;
  }
  if (cmd === 'pull') return pull(fs.readFileSync(arg ? path.resolve(arg) : MD, 'utf8'));
  console.error('usage: content-md.js md | pull [file.md]');
  return 2;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));

module.exports = { toMd, fromMd, renderMd, applyEdits };

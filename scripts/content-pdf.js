#!/usr/bin/env node
// The site's body text as a PDF you can read and edit in the document library,
// and the way back into src/content.json. See docs/content-pdf.md.
//
//   node scripts/content-pdf.js tex    write content-pdf/site-content.tex from the `prototype`
//                                      block of src/content.json, in the page's order
//   node scripts/content-pdf.js file   write the .tex, build it with pdf-material-builder's
//                                      build.sh and file it in the library (project Website,
//                                      title "Website content"); an unchanged build files nothing
//   node scripts/content-pdf.js pull <PPP-NNNN-R | file.tex | source.tar.gz>
//                                      read an edited revision back into src/content.json
//
// Every editable string sits in the .tex as \cf{<json path>}{<text>}, which prints just the
// text. `pull` reads each \cf back, and writes a changed value over that one string in
// src/content.json, so the file's own layout is kept. It never adds, removes or reorders
// entries: a \cf whose path is not a string in the file, a path the .tex no longer has, and
// text still carrying a LaTeX command (not written) are listed for the session to settle by hand. Exit 0
// when it wrote or found nothing to write, 1 when anything is listed.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const CONTENT = path.join(ROOT, 'src', 'content.json');
const OUT_DIR = path.join(ROOT, 'content-pdf');
const TEX = path.join(OUT_DIR, 'site-content.tex');
const BUILD = path.join(os.homedir(), '.claude', 'skills', 'pdf-material-builder', 'scripts', 'build.sh');
const PROJECT = 'Website';
const TITLE = 'Website content';
const BLOCK = 'prototype';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'];

// ---- text <-> LaTeX --------------------------------------------------------

// U+2011 (non-breaking hyphen) is written as \nbh{} so the fonts need no glyph for it.
const ESCAPES = [
  ['\\', '\\textbackslash{}'], ['{', '\\{'], ['}', '\\}'], ['&', '\\&'], ['%', '\\%'],
  ['$', '\\$'], ['#', '\\#'], ['_', '\\_'], ['~', '\\textasciitilde{}'],
  ['^', '\\textasciicircum{}'], ['\u2011', '\\nbh{}'],
];

function toTex(s) {
  let out = '';
  for (const ch of s) {
    const hit = ESCAPES.find(([c]) => c === ch);
    out += hit ? hit[1] : ch;
  }
  return out;
}

function fromTex(s) {
  let t = s.replace(/(^|[^\\])%.*$/gm, '$1'); // an unescaped % starts a comment
  t = t.replace(/\s+/g, ' ').trim();
  // Longest escapes first, so \textbackslash{} is not read as \t... anything shorter.
  for (const [ch, esc] of [...ESCAPES].sort((a, b) => b[1].length - a[1].length)) {
    t = t.split(esc).join(ch);
  }
  t = t.replace(/\\nbh\b\s*/g, '\u2011');
  return t;
}

// Each \cf{path}{text} in a .tex, in order, with the raw text between the braces.
function readFields(source) {
  const tex = source.replace(/(^|[^\\])%.*$/gm, '$1'); // a \cf in a comment is not a field
  const fields = [];
  const re = /\\cf\{([^}]*)\}\{/g;
  let m;
  while ((m = re.exec(tex))) {
    let depth = 1;
    let i = re.lastIndex;
    for (; i < tex.length && depth > 0; i++) {
      if (tex[i] === '\\') i++;
      else if (tex[i] === '{') depth++;
      else if (tex[i] === '}') depth--;
    }
    if (depth > 0) throw new Error(`\\cf{${m[1]}} is never closed: a brace is missing`);
    fields.push({ path: m[1], raw: tex.slice(re.lastIndex, i - 1) });
    re.lastIndex = i;
  }
  return fields;
}

// ---- rendering -------------------------------------------------------------

function renderTex(content, date = new Date()) {
  const p = content[BLOCK];
  const at = (...keys) => [BLOCK, ...keys].join('.');
  const cf = (value, ...keys) => `\\cf{${at(...keys)}}{${toTex(value)}}`;
  const L = [];

  const docList = (docs, ...keys) => docs.map((d, i) => {
    const label = cf(d.label, ...keys, i, 'label');
    if (!d.href) return `\\textcolor{inkfiftyfive}{${label} (${cf(d.pending, ...keys, i, 'pending')})}`;
    return d.pages ? `${label} \\textcolor{inkfiftyfive}{(${d.pages}\\,pp)}` : label;
  }).join(' \\textbullet\\ ');

  L.push(
    '% Built by scripts/content-pdf.js from src/content.json (the `prototype` block, the draft of',
    '% the next front page). Edit the text inside the second braces of each \\cf{...}{...}, then',
    '% say "publish site content rev <R>". The first braces name where the text lives in the file.',
    '\\documentclass[11pt]{article}',
    '\\usepackage{housestyle}',
    '\\newcommand{\\cf}[2]{#2}',
    '\\newcommand{\\nbh}{\\mbox{-}}',
    '\\hsslug{Website content}',
    '\\renewcommand{\\sectionmark}[1]{\\markboth{#1}{}}',
    '\\hssection{\\leftmark}',
    '\\graphicspath{{../public/}}',
    '\\begin{document}',
    '',
    `\\hstitleblock{ihsan.cc \\textperiodcentered\\ ${MONTHS[date.getMonth()]} ${date.getFullYear()}}{${cf(p.name, 'name')}}%`,
    `{${cf(p.subtitle, 'subtitle')}}`,
    '',
  );
  p.about.forEach((para, i) => L.push(cf(para, 'about', i), ''));
  L.push(`{\\small\\color{inkseventy}${toTex(p.email)} \\textbullet\\ ${cf(p.contactCard.label, 'contactCard', 'label')} \\textbullet\\ ${docList(p.links, 'links')}}`, '');
  // A document beside a section heading, as the page shows it.
  const headLink = (s, key) => (s.headLink ? [`{\\small ${cf(s.headLink.label, key, 'headLink', 'label')}}`, ''] : []);

  for (const key of ['experience', 'aiWork']) {
    const s = p[key];
    L.push(`\\section{${cf(s.heading, key, 'heading')}}`, ...headLink(s, key));
    s.items.forEach((it, i) => {
      const k = [key, 'items', i];
      L.push(`\\needspace{4\\baselineskip}\\noindent\\textbf{${cf(it.name, ...k, 'name')}}, ${cf(it.text, ...k, 'text')}`
        + (it.short ? ` {\\small\\color{inkfiftyfive}(on a phone: ${cf(it.short, ...k, 'short')})}` : ''), '');
      if (it.result) L.push(cf(it.result, ...k, 'result'), '');
      if (it.detail) L.push(`{\\color{inkseventy}${cf(it.detail, ...k, 'detail')}}`, '');
      if (it.figure) {
        L.push(
          `\\begin{center}\\includegraphics[width=0.6\\linewidth]{${it.figure.image.replace(/^\//, '')}}\\end{center}`,
          `{\\small\\color{inkfiftyfive}${cf(it.figure.caption, ...k, 'figure', 'caption')}}`, '',
        );
      }
      if (it.docs) L.push(`{\\small ${docList(it.docs, ...k, 'docs')}}`, '');
      if (it.start) L.push(`{\\small\\itshape\\color{inkseventy}${cf(it.start, ...k, 'start')}}`, '');
      L.push('\\vspace{6pt}', '');
    });
  }

  L.push(
    `\\section{${cf(p.essays.heading, 'essays', 'heading')}}`,
    '{\\small\\color{inkfiftyfive}The list itself is built from content/writing, where each essay is edited.}', '',
  );
  L.push(`\\section{${cf(p.projects.heading, 'projects', 'heading')}}`, ...headLink(p.projects, 'projects'), '\\noindent');
  p.projects.items.forEach((it, i) => {
    const k = ['projects', 'items', i];
    L.push(
      '\\begin{minipage}[t]{0.31\\linewidth}\\raggedright',
      // The site crops each photo to 4:3; here it sits whole inside a 4:3 box, so the titles line up.
      `\\parbox[b][0.75\\linewidth][c]{\\linewidth}{\\centering\\includegraphics[width=\\linewidth,height=0.75\\linewidth,keepaspectratio]{${it.image.replace(/^\//, '')}}}\\par\\vspace{4pt}`,
      `\\textbf{${cf(it.title, ...k, 'title')}}\\par`,
      it.result ? `{\\small ${cf(it.result, ...k, 'result')}}` : '',
      '\\end{minipage}' + (i % 3 === 2 ? '\\par\\vspace{12pt}\\noindent' : '\\hfill'),
    );
  });
  L.push(
    '',
    `\\hsprovenance{Built from src/content.json on ${date.toISOString().slice(0, 10)}. Edit the text here and say “publish site content rev <R>” to put it on the site's draft page.}`,
    '\\end{document}', '',
  );
  return L.join('\n');
}

// ---- writing back into content.json ----------------------------------------

// The [start, end) offset of every string value in a JSON text, keyed by its dotted path.
function stringSpans(text) {
  const spans = new Map();
  let i = 0;
  const ws = () => { while (/\s/.test(text[i])) i++; };
  const str = () => {
    const start = i++;
    while (text[i] !== '"') i += text[i] === '\\' ? 2 : 1;
    i++;
    return [start, i];
  };
  const value = (p) => {
    ws();
    if (text[i] === '"') { spans.set(p.join('.'), str()); return; }
    if (text[i] === '{' || text[i] === '[') {
      const obj = text[i] === '{';
      i++;
      for (let n = 0; ; n++) {
        ws();
        if (text[i] === (obj ? '}' : ']')) { i++; return; }
        let key = n;
        if (obj) { const [a, b] = str(); key = JSON.parse(text.slice(a, b)); ws(); i++; }
        value([...p, key]);
        ws();
        if (text[i] === ',') i++;
      }
    }
    while (i < text.length && !/[\s,}\]]/.test(text[i])) i++; // number, true, false, null
  };
  value([]);
  return spans;
}

// The edits a .tex makes to a content.json text: the new text, what changed and what to settle by hand.
function applyEdits(text, tex) {
  const spans = stringSpans(text);
  const edits = [];
  const problems = [];
  const seen = new Set();
  for (const { path: p, raw } of readFields(tex)) {
    seen.add(p);
    const value = fromTex(raw);
    if (!spans.has(p)) { problems.push(`${p}: not a string in content.json (a new or moved entry); add it by hand: ${value}`); continue; }
    if (/\\[a-zA-Z]/.test(value)) { problems.push(`${p}: not written, it has a LaTeX command; write it as plain text: ${value}`); continue; }
    const [a, b] = spans.get(p);
    if (JSON.parse(text.slice(a, b)) !== value) edits.push({ p, a, b, value });
  }
  const expected = readFields(renderTex(JSON.parse(text))).map((f) => f.path);
  expected.filter((p) => !seen.has(p)).forEach((p) => problems.push(`${p}: gone from the document; delete it by hand if that was meant`));

  let out = text;
  for (const e of [...edits].sort((x, y) => y.a - x.a)) {
    out = out.slice(0, e.a) + JSON.stringify(e.value) + out.slice(e.b);
  }
  JSON.parse(out); // never hand back a file the site cannot read
  return { out, changed: edits.map((e) => e.p), problems };
}

function pull(tex) {
  const { out, changed, problems } = applyEdits(fs.readFileSync(CONTENT, 'utf8'), tex);
  if (changed.length) fs.writeFileSync(CONTENT, out);
  changed.forEach((p) => console.log(`changed  ${p}`));
  problems.forEach((m) => console.log(`by hand  ${m}`));
  console.log(`${changed.length} field(s) written to src/content.json, ${problems.length} to settle by hand`);
  return problems.length ? 1 : 0;
}

// A library number, a .tex or a source tarball, as the text of the .tex.
function readSource(arg) {
  if (arg.endsWith('.tex')) return fs.readFileSync(arg, 'utf8');
  let tarball = arg;
  if (/^\d{3}-\d{4}-[A-Z]+$/.test(arg)) {
    const pdf = execFileSync('cc-docs', ['find', arg], { encoding: 'utf8' }).trim().split(/\s+/).pop();
    tarball = path.join(path.dirname(pdf), '..', '..', 'sources', arg.slice(0, 3), `${arg}.tar.gz`);
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'content-pdf-'));
  execFileSync('tar', ['-xzf', tarball, '-C', dir]);
  const meta = path.join(dir, '.source.json');
  const main = fs.existsSync(meta) ? JSON.parse(fs.readFileSync(meta, 'utf8')).main : 'site-content.tex';
  return fs.readFileSync(path.join(dir, main), 'utf8');
}

function main([cmd, arg]) {
  if (cmd === 'tex' || cmd === 'file') {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(TEX, renderTex(JSON.parse(fs.readFileSync(CONTENT, 'utf8'))));
    console.log(`wrote ${path.relative(ROOT, TEX)}`);
    if (cmd === 'file') {
      execFileSync(BUILD, [TEX], {
        stdio: 'inherit',
        env: { ...process.env, DOC_PROJECT: PROJECT, DOC_TITLE: TITLE, DOC_KIND: 'work' },
      });
    }
    return 0;
  }
  if (cmd === 'pull' && arg) return pull(readSource(arg));
  console.error('usage: content-pdf.js tex | file | pull <PPP-NNNN-R | file.tex | source.tar.gz>');
  return 2;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));

module.exports = { toTex, fromTex, renderTex, applyEdits };

#!/usr/bin/env node
// An essay written in the library, from content/essay-template/essay.tex, turned into the
// site's format. See docs/publish-essay.md.
//
//   node scripts/publish-essay.js <PPP-NNNN-R | essay.tex | source.tar.gz> [--out DIR]
//   node scripts/publish-essay.js start "<title>" [--no-file]
//
// `start` begins an essay: it copies content/essay-template/ to a new temporary directory,
// writes the title, a slug made from it and today's date into the copy, builds it with
// pdf-material-builder's build.sh and files it in the library as a new document (project
// Website, title "Essay: <title>"), then prints its number. --no-file builds without filing,
// to look at it first. The owner then writes in the library's edit mode.
//
// It reads the revision's kept LaTeX source (as scripts/content-pdf.js's pull does), writes
// content/writing/<slug>.md, and copies each figure it names into public/writing/<slug>/:
// a diagram as the .svg beside its PDF, an image as it is. With --out DIR both go under DIR
// instead (DIR/content/writing, DIR/public/writing), which is how a dry run is kept out of
// the repo. Each template macro maps to one piece of the format scripts/writing.js reads:
//
//   \essayslug \essaydate \essaysummary \essayblurb \essaytitle \essaystandfirst
//                                  front matter (a blurb left empty is left out)
//   \essaydraft{true|false}        `draft: true`, or no draft line when it says false
//   \section \subsection           ## and ###
//   \emph \textbf \texttt \href    *em*, **strong**, `code`, [text](url)
//   itemize, enumerate             - and 1. lists
//   \includesvg[caption]{figures/x}   ![caption](x.svg)
//   \essayimage{figures/x.png}{caption}   ![caption](x.png)
//   \essayquote{...}               > the pull quote
//   \essaycode{lang} + Verbatim    a ``` fenced block
//   \essaynote{...}                [^n] where it is cited, [^n]: text at the end
//   essayreading, \readingitem{title}{href}{note}{pages}
//                                  ## Further reading, - [title](href): note (N pages).
//
// Anything else with a backslash is left in the markdown and listed as `by hand`, and so is
// a figure whose file is not in the source. The written essay is then parsed as the build
// would parse it and its problems listed the same way. Exit 0 when nothing is listed, 1 when
// anything is, 2 on bad usage.

const fs = require('fs');
const path = require('path');
const { sourcePath } = require('./content-pdf');
const { parseEssay } = require('./writing');

const ROOT = path.resolve(__dirname, '..');
const rel = (p) => (p.startsWith(`${ROOT}/`) ? path.relative(ROOT, p) : p);
const META = ['slug', 'date', 'summary', 'blurb', 'draft', 'title', 'standfirst'];

// The braced argument at s[i] (after any spaces), as [text, index after the closing brace].
function braced(s, i) {
  while (/\s/.test(s[i])) i++;
  if (s[i] !== '{') return null;
  let depth = 1;
  let j = i + 1;
  for (; j < s.length && depth; j++) {
    if (s[j] === '\\') j++;
    else if (s[j] === '{') depth++;
    else if (s[j] === '}') depth--;
  }
  return depth ? null : [s.slice(i + 1, j - 1), j];
}

// An optional [argument] at s[i], as [text, index after it], or ['', i] when there is none.
function bracketed(s, i) {
  let k = i;
  while (/\s/.test(s[k])) k++;
  if (s[k] !== '[') return ['', i];
  let depth = 0;
  for (let j = k; j < s.length; j++) {
    if (s[j] === '\\') j++;
    else if (s[j] === '{') depth++;
    else if (s[j] === '}') depth--;
    else if (s[j] === ']' && !depth) return [s.slice(k + 1, j), j + 1];
  }
  return ['', i];
}

// `n` braced arguments from s[i], as [args, index after them], or null when one is missing.
function args(s, i, n) {
  const out = [];
  for (let k = 0; k < n; k++) {
    const a = braced(s, i);
    if (!a) return null;
    out.push(a[0]);
    i = a[1];
  }
  return [out, i];
}

const CHARS = { '&': '&', '%': '%', $: '$', '#': '#', _: '_', '{': '{', '}': '}', ' ': ' ', ',': ' ', '\\': ' ' };
const WORDS = { textperiodcentered: '·', ldots: '…', dots: '…', textbackslash: '\\', textasciitilde: '~', LaTeX: 'LaTeX', TeX: 'TeX' };

function convert(tex) {
  const problems = [];
  const figures = [];
  const notes = [];
  const meta = {};

  let body = tex.replace(/\r\n/g, '\n');
  const doc = body.match(/\\begin\{document\}([\s\S]*)\\end\{document\}/);
  if (!doc) return { problems: ['no \\begin{document} ... \\end{document}'] };
  body = doc[1];

  // Code first, before comments are stripped: a % inside it is code.
  const code = [];
  body = body.replace(/\\essaycode\s*\{([^}]*)\}\s*\\begin\{Verbatim\}(?:\[[^\]]*\])?\n([\s\S]*?)\n?\\end\{Verbatim\}/g, (m, lang, v) => {
    code.push(`\`\`\`${lang.trim()}\n${v.replace(/\n$/, '')}\n\`\`\``);
    return `\n\n@@CODE${code.length - 1}@@\n\n`;
  });
  if (/\\begin\{Verbatim\}/.test(body)) problems.push('a Verbatim block without \\essaycode{<language>} before it');
  body = body.replace(/(^|[^\\])%.*$/gm, '$1');

  // The details: each \essay<key>{...} anywhere in the body.
  for (const key of META) {
    const re = new RegExp(`\\\\essay${key}(?![a-zA-Z])`);
    const m = re.exec(body);
    if (!m) continue;
    const a = braced(body, m.index + m[0].length);
    if (!a) { problems.push(`\\essay${key} has no {argument}`); continue; }
    meta[key] = a[0];
    body = body.slice(0, m.index) + body.slice(a[1]);
  }
  body = body.replace(/\\essayhead\b|\\essaynotes\b/g, '');

  // Inline LaTeX to markdown. Footnotes are numbered in the order they are cited.
  const inline = (s) => {
    let out = '';
    for (let i = 0; i < s.length;) {
      const ch = s[i];
      if (ch === '~') { out += ' '; i++; continue; }
      if (s.startsWith('---', i)) { out += '—'; i += 3; continue; }
      if (s.startsWith('--', i)) { out += '–'; i += 2; continue; }
      if (s.startsWith('``', i)) { out += '“'; i += 2; continue; }
      if (s.startsWith("''", i)) { out += '”'; i += 2; continue; }
      if (ch === '{' || ch === '}') { i++; continue; }
      if (ch !== '\\') { out += ch; i++; continue; }
      const name = (s.slice(i + 1).match(/^[a-zA-Z]+/) || [''])[0];
      if (!name) { out += CHARS[s[i + 1]] ?? s[i + 1]; i += 2; continue; }
      let j = i + 1 + name.length;
      const wrap = { emph: ['*', '*'], textit: ['*', '*'], textbf: ['**', '**'], texttt: ['`', '`'] }[name];
      if (wrap) {
        const a = braced(s, j);
        if (a) { out += wrap[0] + (name === 'texttt' ? plain(a[0]) : inline(a[0])) + wrap[1]; i = a[1]; continue; }
      } else if (name === 'href') {
        const a = args(s, j, 2);
        if (a) { out += `[${inline(a[0][1])}](${a[0][0]})`; i = a[1]; continue; }
      } else if (name === 'url') {
        const a = braced(s, j);
        if (a) { out += `[${a[0]}](${a[0]})`; i = a[1]; continue; }
      } else if (name === 'essaynote') {
        const a = braced(s, j);
        if (a) {
          notes.push(inline(a[0]).replace(/\s+/g, ' ').trim());
          out += `[^${notes.length}]`;
          i = a[1];
          continue;
        }
      } else if (name in WORDS) {
        if (s.slice(j, j + 2) === '{}') j += 2;
        else if (/^[a-zA-Z]/.test(WORDS[name].slice(-1))) while (s[j] === ' ') j++;
        out += WORDS[name];
        i = j;
        continue;
      }
      problems.push(`by hand: \\${name} has no place in the site's format`);
      out += `\\${name}`;
      i = j;
    }
    return out;
  };
  // Text inside `code`: only the escapes come back.
  const plain = (s) => s.replace(/\\textbackslash\{\}/g, '\\').replace(/\\([&%$#_{} ])/g, '$1');
  const para = (s) => inline(s).replace(/\s+/g, ' ').trim();

  // Further reading, which leaves the body.
  const reading = [];
  body = body.replace(/\\begin\{essayreading\}([\s\S]*?)\\end\{essayreading\}/g, (m, inner) => {
    for (let k = inner.indexOf('\\readingitem'); k >= 0; k = inner.indexOf('\\readingitem', k + 1)) {
      const a = args(inner, k + '\\readingitem'.length, 4);
      if (!a) { problems.push('a \\readingitem without its four {arguments}'); continue; }
      const [title, href, note, pages] = a[0].map((x) => x.trim());
      const n = para(note).replace(/\.$/, '');
      reading.push(`- [${para(title)}](${href})${n ? `: ${n}` : ''}${pages ? ` (${pages} pages)` : ''}.`);
    }
    return '';
  });

  // Blocks: headings, figures, the quote and lists stand alone; anything else is paragraph text.
  const blocks = [];
  let text = '';
  const endPara = () => {
    text.split(/\n\s*\n/).map(para).filter(Boolean).forEach((p) => blocks.push(p));
    text = '';
  };
  const figure = (file, caption, diagram) => {
    const name = path.basename(file) + (diagram && !/\.svg$/i.test(file) ? '.svg' : '');
    const from = diagram ? path.join(path.dirname(file), name) : file;
    figures.push({ from, name });
    blocks.push(`![${para(caption)}](${name})`);
  };
  const BLOCK = /\\(section|subsection|includesvg|essayimage|essayquote|begin\{(?:itemize|enumerate)\})|@@CODE(\d+)@@/g;
  let at = 0;
  for (let m; (m = BLOCK.exec(body));) {
    text += body.slice(at, m.index);
    endPara();
    let end = m.index + m[0].length;
    if (m[2] !== undefined) {
      blocks.push(code[+m[2]]);
    } else if (m[1] === 'section' || m[1] === 'subsection') {
      if (body[end] === '*') end++;
      const a = braced(body, end);
      if (a) { blocks.push(`${m[1] === 'section' ? '##' : '###'} ${para(a[0])}`); end = a[1]; }
      else problems.push(`\\${m[1]} has no {heading}`);
    } else if (m[1] === 'includesvg') {
      const [caption, k] = bracketed(body, end);
      const a = braced(body, k);
      if (a) { figure(a[0].trim(), caption, true); end = a[1]; }
      else problems.push('\\includesvg has no {figures/<name>}');
      if (!caption.trim()) problems.push(`the diagram ${a ? a[0] : ''} has no [caption]`);
    } else if (m[1] === 'essayimage') {
      const a = args(body, end, 2);
      if (a) { figure(a[0][0].trim(), a[0][1], false); end = a[1]; }
      else problems.push('\\essayimage needs {file}{caption}');
    } else if (m[1] === 'essayquote') {
      const a = braced(body, end);
      if (a) { blocks.push(`> ${para(a[0])}`); end = a[1]; }
      else problems.push('\\essayquote has no {text}');
    } else {
      const env = m[1].match(/\{(\w+)\}/)[1];
      const close = body.indexOf(`\\end{${env}}`, end);
      if (close < 0) { problems.push(`\\begin{${env}} is never closed`); break; }
      const items = body.slice(end, close).split(/\\item\b/).slice(1).map(para);
      blocks.push(items.map((it, n) => `${env === 'itemize' ? '-' : `${n + 1}.`} ${it}`).join('\n'));
      end = close + `\\end{${env}}`.length;
    }
    at = end;
    BLOCK.lastIndex = end;
  }
  text += body.slice(at);
  endPara();

  for (const key of ['slug', 'title', 'date', 'summary', 'standfirst']) {
    if (!meta[key] || !meta[key].trim()) problems.push(`\\essay${key} is missing or empty`);
  }
  const front = ['---'];
  for (const key of ['title', 'date', 'summary', 'blurb', 'standfirst']) {
    const v = para(meta[key] || '');
    if (v) front.push(`${key}: ${v}`);
  }
  // "\essaydraft{true|false}": only false takes the essay off the preview path and onto /writing.
  if ((meta.draft || 'true').trim() !== 'false') front.push('draft: true');
  front.push('---');

  const parts = [front.join('\n'), ...blocks];
  if (reading.length) parts.push('## Further reading', reading.join('\n'));
  if (notes.length) parts.push(notes.map((n, k) => `[^${k + 1}]: ${n}`).join('\n'));
  const markdown = `${parts.join('\n\n')}\n`;
  return { slug: (meta.slug || '').trim(), markdown, figures, problems };
}

const TEMPLATE = path.join(ROOT, 'content', 'essay-template');
const BUILD = path.join(require('os').homedir(), '.claude', 'skills', 'pdf-material-builder', 'scripts', 'build.sh');

// Today on the box's own clock, YYYY-MM-DD (toISOString would give UTC's date).
const today = (d = new Date()) => [d.getFullYear(), d.getMonth() + 1, d.getDate()].map((n) => String(n).padStart(2, '0')).join('-');

function start(title, file) {
  const slug = title.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const dir = fs.mkdtempSync(path.join(require('os').tmpdir(), `essay-${slug}-`));
  fs.cpSync(TEMPLATE, dir, { recursive: true });
  const tex = path.join(dir, 'essay.tex');
  // A title's own braces and specials would break the line it is written into.
  const safe = title.replace(/[\\{}]/g, '').replace(/([&%$#_])/g, '\\$1');
  const set = { essayslug: slug, essaydate: today(), essaytitle: safe };
  let src = fs.readFileSync(tex, 'utf8');
  for (const [k, v] of Object.entries(set)) src = src.replace(new RegExp(`^\\\\${k}\\{.*\\}$`, 'm'), () => `\\${k}{${v}}`);
  fs.writeFileSync(tex, src);
  const env = { ...process.env };
  if (file) Object.assign(env, { DOC_PROJECT: 'Website', DOC_TITLE: `Essay: ${title}`, DOC_KIND: 'work' });
  require('child_process').execFileSync(BUILD, [tex], { stdio: 'inherit', env });
  console.log(`${file ? 'filed' : 'built, not filed'}: ${path.join(dir, 'essay.pdf')} (slug ${slug})`);
  return 0;
}

function main(argv) {
  if (argv[0] === 'start') {
    const title = argv.slice(1).filter((a) => a !== '--no-file').join(' ').trim();
    if (!title) { console.error('usage: publish-essay.js start "<title>" [--no-file]'); return 2; }
    return start(title, !argv.includes('--no-file'));
  }
  const outAt = argv.indexOf('--out');
  const out = outAt >= 0 ? path.resolve(argv[outAt + 1] || '') : ROOT;
  const src = argv.find((a, k) => !a.startsWith('--') && k !== outAt + 1);
  if (!src || (outAt >= 0 && !argv[outAt + 1])) {
    console.error('usage: publish-essay.js <PPP-NNNN-R | essay.tex | source.tar.gz> [--out DIR]');
    return 2;
  }
  const tex = sourcePath(src, 'essay.tex');
  const { slug, markdown, figures, problems } = convert(fs.readFileSync(tex, 'utf8'));
  if (!markdown) {
    problems.forEach((p) => console.log(`by hand  ${p}`));
    return 1;
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    console.log(`by hand  the slug "${slug}" is not lowercase words joined by hyphens; nothing written`);
    return 1;
  }
  const md = path.join(out, 'content', 'writing', `${slug}.md`);
  const figDir = path.join(out, 'public', 'writing', slug);
  fs.mkdirSync(path.dirname(md), { recursive: true });
  fs.writeFileSync(md, markdown);
  console.log(`wrote    ${rel(md)}`);
  for (const f of figures) {
    const from = path.join(path.dirname(tex), f.from);
    if (!fs.existsSync(from)) { problems.push(`${f.from} is not in the source; put ${f.name} in ${rel(figDir)}/ by hand`); continue; }
    fs.mkdirSync(figDir, { recursive: true });
    fs.copyFileSync(from, path.join(figDir, f.name));
    console.log(`wrote    ${rel(path.join(figDir, f.name))}`);
  }
  const parsed = parseEssay(markdown, slug, (s, file) => ({ exists: fs.existsSync(path.join(figDir, file)) }));
  parsed.problems.filter((p) => !/is not in public\/writing/.test(p)).forEach((p) => problems.push(`the site's parser: ${p}`));
  problems.forEach((p) => console.log(`by hand  ${p.replace(/^by hand: /, '')}`));
  console.log(`${slug}: ${parsed.essay.blocks.length} block(s), ${figures.length} figure(s), ${parsed.essay.footnotes.length} footnote(s); ${problems.length} to settle by hand`);
  return problems.length ? 1 : 0;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));

module.exports = { convert };

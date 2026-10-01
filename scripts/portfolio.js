#!/usr/bin/env node
// The AI portfolio: one markdown file, content/portfolio/ai.md, that the owner writes and
// edits, shown as a page and as a PDF. See docs/portfolio.md.
//
//   node scripts/portfolio.js build    parse ai.md into src/writing/portfolio.generated.json
//                                      (run by prestart, prebuild and pretest; the file is ignored)
//   node scripts/portfolio.js pdf      build the PDF from ai.md and copy it to public/ at PDF_HREF,
//                                      the file the page's PDF link opens
//   node scripts/portfolio.js file     build the PDF and file it in the library as the document
//                                      the owner edits (project "Career/AI Portfolio", title
//                                      "AI portfolio"), its kept source ai.md itself; unchanged
//                                      text files nothing
//   node scripts/portfolio.js pull <PPP-NNNN-R | source.tar.gz>
//                                      write an edited revision's markdown over ai.md
//
// The markdown: one `# title`, the paragraph after it the standfirst, then `## project`
// headings, each with its repo link alone on the next line (`[github.com/x/y](https://...)`),
// paragraphs with *em*, **strong**, `code` and [links](url), - and 1. lists, and `---`.
// Media are HTML comments alone on a line, as the owner's drafts write them:
//   <!-- FIGURE: portfolio/figures/x.svg -->          a diagram (any .svg)
//   <!-- FIGURE: a.png, b.png, caption -->           images side by side, with a caption
//   <!-- GIF: /writing/autobox/hero.gif, caption --> a clip, as the essays show it
//   <!-- VIDEO: portfolio/x.mp4, caption -->         a video with controls
//   <!-- LINK: ... -->                               where the link to the PDF goes
// A path names a file under public/ (a leading / is optional), and whatever is not a path is
// the caption. A comment naming no file is a placeholder: it is listed and not shown. Plain
// markdown works too: `![caption](file)` alone in its paragraph, an .mp4 as a video. Any other
// comment is a note to the editor and shown nowhere.
//
// A GIF with a same-named .mp4 beside it opens that video on a click, and a <name>-poster.webp
// stands in for it when reduced motion is asked for, as on the essays. In the PDF a GIF or a
// video is its poster still (the -poster.webp, else its first frame), and an .svg is the .pdf
// of the same path under content/portfolio/print/.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { parseInline, plainText, rasterSize, svgSize } = require('./writing');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(ROOT, 'content', 'portfolio', 'ai.md');
const PRINT = path.join(ROOT, 'content', 'portfolio', 'print');
const PUBLIC = path.join(ROOT, 'public');
const OUT = path.join(ROOT, 'src', 'writing', 'portfolio.generated.json');
const BUILD_DIR = path.join(ROOT, 'content-pdf', 'portfolio');
const BUILD = path.join(os.homedir(), '.claude', 'skills', 'pdf-material-builder', 'scripts', 'build.sh');
// Unguessable while the page is a preview; it moves beside /aiportfolio when that goes live.
const PDF_HREF = '/portfolio/ai-portfolio-r4xq8m2vt6.pdf';
const PROJECT = 'Career/AI Portfolio';
const TITLE = 'AI portfolio';

const MEDIA = /(?:^|[\s,(])(\/?[\w./-]+\.(?:svg|png|jpe?g|webp|gif|mp4|webm))(?=$|[\s,)])/gi;
const KINDS = ['FIGURE', 'IMAGE', 'GIF', 'VIDEO', 'LINK'];

// ---- media -----------------------------------------------------------------

function diskAssets(src) {
  const p = path.join(PUBLIC, src);
  if (!fs.existsSync(p)) return { exists: false };
  if (/\.svg$/i.test(p)) {
    const title = fs.readFileSync(p, 'utf8').slice(0, 4000).match(/<title>([^<]*)<\/title>/);
    return { exists: true, ...svgSize(p), ...(title ? { title: title[1].trim() } : {}) };
  }
  return { exists: true, ...(/\.(mp4|webm)$/i.test(p) ? {} : rasterSize(p)) };
}

// One file of a media block, as the page shows it.
function mediaItem(file, assets) {
  const src = file.startsWith('/') ? file : `/${file}`;
  const a = assets(src);
  const item = { src, kind: /\.svg$/i.test(src) ? 'diagram' : /\.(mp4|webm)$/i.test(src) ? 'video' : 'image' };
  if (a.width) Object.assign(item, { width: a.width, height: a.height });
  if (a.title) item.title = a.title;
  if (!a.exists) item.missing = true;
  const video = src.replace(/\.gif$/i, '.mp4');
  if (video !== src && assets(video).exists) {
    item.video = video;
    const poster = src.replace(/\.gif$/i, '-poster.webp');
    if (assets(poster).exists) item.poster = poster;
  }
  return item;
}

// A media comment's body: its files, and the rest as the caption.
function splitMedia(body) {
  const files = [...body.matchAll(MEDIA)].map((m) => m[1]);
  const caption = body.replace(MEDIA, (m, f) => m.slice(0, m.length - f.length))
    .replace(/\(\s*\)/g, '').replace(/\s*,\s*(?=,|$)/g, '').replace(/^[\s,]+|[\s,]+$/g, '').replace(/\s{2,}/g, ' ');
  return { files, caption };
}

function mediaBlock(files, caption, assets, problems) {
  const items = files.map((f) => mediaItem(f, assets));
  items.filter((i) => i.missing).forEach((i) => problems.push(`media ${i.src} is not in public/`));
  const cap = parseInline(caption);
  // The alt says what the picture shows: its caption, else a diagram's own <title>.
  const alt = plainText(cap) || items.map((i) => i.title).filter(Boolean).join('; ') || 'Figure';
  const block = { t: 'media', items, alt, caption: cap };
  return block;
}

// ---- parse -----------------------------------------------------------------

function parsePortfolio(source, assets = diskAssets) {
  const problems = [];
  const placeholders = [];
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let title = '';
  let standfirst = null;
  let para = [];

  const endPara = () => {
    if (!para.length) return;
    const text = para.join(' ').trim();
    para = [];
    const img = text.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
    if (img) blocks.push(mediaBlock([img[2]], img[1], assets, problems));
    else if (title && standfirst === null && !blocks.length) standfirst = parseInline(text);
    else blocks.push({ t: 'p', c: parseInline(text) });
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    let m;
    if (line.trim().startsWith('<!--')) {
      endPara();
      let text = line.trim();
      while (!text.includes('-->') && i + 1 < lines.length) text += ` ${lines[++i].trim()}`;
      const body = text.replace(/^<!--\s*/, '').replace(/\s*-->.*$/, '');
      const kind = body.match(/^([A-Z]+)\s*:\s*([\s\S]*)$/);
      if (!kind || !KINDS.includes(kind[1])) continue; // a note to the editor
      if (kind[1] === 'LINK') {
        blocks.push({ t: 'pdf', href: PDF_HREF });
        continue;
      }
      const { files, caption } = splitMedia(kind[2]);
      if (!files.length) placeholders.push(`${kind[1]}: ${kind[2]}`);
      else blocks.push(mediaBlock(files, caption, assets, problems));
    } else if ((m = line.match(/^#\s+(.*)$/))) {
      endPara();
      if (title) problems.push('more than one # title');
      title = m[1].trim();
    } else if ((m = line.match(/^(#{2,3})\s+(.*)$/))) {
      endPara();
      const block = { t: m[1] === '##' ? 'h2' : 'h3', c: parseInline(m[2].trim()) };
      // The repo link alone on the next line belongs to the heading.
      let j = i + 1;
      while (j < lines.length && !lines[j].trim()) j += 1;
      const repo = j < lines.length && lines[j].trim().match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
      if (repo) {
        block.repo = { label: repo[1], href: repo[2] };
        i = j;
      }
      blocks.push(block);
    } else if ((m = line.match(/^(?:([-*])|(\d+)\.)\s+(.*)$/))) {
      endPara();
      const ordered = !m[1];
      const items = [m[3]];
      while (i + 1 < lines.length) {
        const item = lines[i + 1].match(ordered ? /^\d+\.\s+(.*)$/ : /^[-*]\s+(.*)$/);
        if (item) items.push(item[1]);
        else if (/^\s{2,}\S/.test(lines[i + 1])) items[items.length - 1] += ` ${lines[i + 1].trim()}`;
        else break;
        i += 1;
      }
      blocks.push({ t: ordered ? 'ol' : 'ul', items: items.map(parseInline) });
    } else if (/^(-{3,}|\*{3,})\s*$/.test(line)) {
      endPara();
      blocks.push({ t: 'hr' });
    } else if (!line.trim()) {
      endPara();
    } else {
      para.push(line.trim());
    }
  }
  endPara();
  if (!title) problems.push('no # title');
  return { page: { title, standfirst: standfirst || [], pdf: PDF_HREF, blocks }, problems, placeholders };
}

function build() {
  const { page, problems, placeholders } = parsePortfolio(fs.readFileSync(SOURCE, 'utf8'));
  problems.forEach((p) => console.warn(`portfolio: ${p}`));
  placeholders.forEach((p) => console.log(`portfolio: placeholder, not shown: ${p}`));
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(page, null, 1)}\n`);
  console.log(`portfolio: ${page.blocks.filter((b) => b.t === 'h2').length} section(s), ${problems.length} problem(s)`);
}

// ---- the PDF ---------------------------------------------------------------

const ESCAPES = { '\\': '\\textbackslash{}', '{': '\\{', '}': '\\}', '&': '\\&', '%': '\\%', $: '\\$', '#': '\\#', _: '\\_', '~': '\\textasciitilde{}', '^': '\\textasciicircum{}' };
const esc = (s) => s.replace(/[\\{}&%$#_~^]/g, (c) => ESCAPES[c]);
const escUrl = (s) => s.replace(/[\\%#{}]/g, (c) => `\\${c}`);

function inlineTex(nodes) {
  return nodes.map((n) => {
    switch (n.t) {
      case 'em': return `\\emph{${inlineTex(n.c)}}`;
      case 'strong': return `\\textbf{${inlineTex(n.c)}}`;
      case 'mark': return inlineTex(n.c);
      case 'code': return `\\texttt{${esc(n.v)}}`;
      case 'link': return `\\href{${escUrl(n.href.startsWith('/') ? `https://ihsan.cc${n.href}` : n.href)}}{${inlineTex(n.c)}}`;
      default: return esc(n.v || '');
    }
  }).join('');
}

// Each media file as a picture LaTeX can place, written into dir/figures: an .svg as its
// print .pdf, a GIF or video as its poster still. Returns the name under figures/.
function printFile(item, dir) {
  const name = item.src.replace(/^\//, '').replace(/\//g, '-');
  const figures = path.join(dir, 'figures');
  fs.mkdirSync(figures, { recursive: true });
  if (item.kind === 'diagram') {
    const pdf = path.join(PRINT, item.src.replace(/\.svg$/i, '.pdf'));
    if (!fs.existsSync(pdf)) throw new Error(`portfolio: ${item.src} has no print copy at ${path.relative(ROOT, pdf)}`);
    const out = name.replace(/\.svg$/i, '.pdf');
    fs.copyFileSync(pdf, path.join(figures, out));
    return out;
  }
  if (/\.(png|jpe?g)$/i.test(item.src)) {
    fs.copyFileSync(path.join(PUBLIC, item.src), path.join(figures, name));
    return name;
  }
  const still = item.poster || item.src;
  const out = name.replace(/\.\w+$/, '.png');
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', path.join(PUBLIC, still), '-frames:v', '1', path.join(figures, out)]);
  return out;
}

function renderTex(page, dir, date = new Date()) {
  const month = date.toLocaleString('en-GB', { month: 'long', year: 'numeric' });
  const L = [
    '% Built by scripts/portfolio.js from content/portfolio/ai.md. Edit the markdown, not this file.',
    '\\documentclass[11pt]{article}',
    '\\usepackage{housestyle}',
    `\\hsslug{${esc(page.title)}}`,
    '\\begin{document}',
    '',
    `\\hstitleblock{Ihsan Salari \\textperiodcentered\\ ${month}}{${esc(page.title)}}{${inlineTex(page.standfirst)}}`,
    '',
  ];
  for (const b of page.blocks) {
    if (b.t === 'h2' || b.t === 'h3') {
      L.push(`\\${b.t === 'h2' ? 'section' : 'subsection'}{${inlineTex(b.c)}}`);
      if (b.repo) L.push(`{\\small\\href{${escUrl(b.repo.href)}}{${esc(b.repo.label)}}}\\par\\medskip`);
      L.push('');
    } else if (b.t === 'p') {
      L.push(inlineTex(b.c), '');
    } else if (b.t === 'ul' || b.t === 'ol') {
      const env = b.t === 'ul' ? 'itemize' : 'enumerate';
      L.push(`\\begin{${env}}`, ...b.items.map((it) => `\\item ${inlineTex(it)}`), `\\end{${env}}`, '');
    } else if (b.t === 'hr') {
      L.push('\\medskip\\noindent\\rule{\\linewidth}{0.4pt}\\medskip', '');
    } else if (b.t === 'media') {
      const shown = b.items.filter((it) => !it.missing);
      if (!shown.length) continue;
      const w = (0.98 / shown.length).toFixed(3);
      // A diagram at its own size (\\hsdiagram never scales one up); a still or photo smaller,
      // so a heading and its first lines are not pushed onto the next page ahead of it.
      const pics = shown.map((it) => (it.kind === 'diagram'
        ? `\\hsdiagram{figures/${printFile(it, dir)}}`
        : `\\includegraphics[width=${shown.length === 1 ? '0.6' : w}\\linewidth,height=0.3\\textheight,keepaspectratio]{figures/${printFile(it, dir)}}`));
      const caption = inlineTex(b.caption);
      L.push('\\begin{center}', pics.join('\\hfill'), caption ? `\\par\\smallskip{\\small\\itshape ${caption}}` : '', '\\end{center}', '');
    }
  }
  L.push('\\end{document}', '');
  return L.join('\n');
}

// Writes BUILD_DIR/ai-portfolio.tex with its figures and builds it; returns the PDF's path.
function buildPdf() {
  const { page, problems } = parsePortfolio(fs.readFileSync(SOURCE, 'utf8'));
  if (problems.length) throw new Error(`portfolio:\n  ${problems.join('\n  ')}`);
  fs.rmSync(BUILD_DIR, { recursive: true, force: true });
  fs.mkdirSync(BUILD_DIR, { recursive: true });
  const tex = path.join(BUILD_DIR, 'ai-portfolio.tex');
  fs.writeFileSync(tex, renderTex(page, BUILD_DIR));
  execFileSync(BUILD, [tex], { stdio: 'inherit' });
  return tex.replace(/\.tex$/, '.pdf');
}

function pdf() {
  const built = buildPdf();
  const out = path.join(PUBLIC, PDF_HREF);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.copyFileSync(built, out);
  console.log(`portfolio: wrote ${path.relative(ROOT, out)}`);
}

// The PDF is filed from a directory of its own: with a .tex of its name beside it, cc-docs
// would keep that .tex as the source, and the owner would edit LaTeX instead of ai.md.
function file() {
  const built = buildPdf();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-'));
  const copy = path.join(dir, 'ai-portfolio.pdf');
  fs.copyFileSync(built, copy);
  execFileSync('cc-docs', ['file', copy, '--project', PROJECT, '--title', TITLE, '--source', SOURCE], { stdio: 'inherit' });
}

// The markdown kept with a library revision (or in a source tarball), written over ai.md.
function pull(arg) {
  let tarball = arg;
  if (/^\d{3}-\d{4}-[A-Z]+$/.test(arg)) {
    const found = execFileSync('cc-docs', ['find', arg], { encoding: 'utf8' }).trim().split(/\s+/).pop();
    tarball = path.join(path.dirname(found), '..', '..', 'sources', arg.slice(0, 3), `${arg}.tar.gz`);
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-'));
  execFileSync('tar', ['-xzf', tarball, '-C', dir]);
  const md = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
  if (md.length !== 1) throw new Error(`portfolio: ${arg} keeps ${md.length} markdown files at its root, not one`);
  const text = fs.readFileSync(path.join(dir, md[0]), 'utf8');
  const { problems } = parsePortfolio(text);
  fs.writeFileSync(SOURCE, text);
  console.log(`portfolio: wrote ${path.relative(ROOT, SOURCE)} from ${arg}`);
  problems.forEach((p) => console.error(`portfolio: ${p}`));
  return problems.length ? 1 : 0;
}

module.exports = { parsePortfolio, splitMedia, PDF_HREF };

if (require.main === module) {
  const [cmd, arg] = process.argv.slice(2);
  try {
    if (cmd === 'build') build();
    else if (cmd === 'pdf') pdf();
    else if (cmd === 'file') file();
    else if (cmd === 'pull' && arg) process.exit(pull(arg));
    else {
      console.error('usage: node scripts/portfolio.js build|pdf|file|pull <PPP-NNNN-R | source.tar.gz>');
      process.exit(2);
    }
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}

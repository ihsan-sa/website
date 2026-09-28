#!/usr/bin/env node
// The essay pipeline for /writing. Essays are markdown files in
// content/writing/<slug>.md; their figures sit in public/writing/<slug>/.
//
//   node scripts/writing.js build   parse every essay into src/writing/essays.generated.json
//                                   (run by prestart, prebuild and pretest; the file is ignored)
//   node scripts/writing.js pages   after `react-scripts build`: write build/writing/index.html
//                                   and build/writing/<slug>/index.html with link-preview tags
//
// An essay starts with a front-matter block of `key: value` lines between `---`:
//   title, date (YYYY-MM-DD), summary (one line, for the index and link previews),
//   blurb (optional: the clause after the title in the draft front page's Essays list;
//   the summary stands in without it),
//   standfirst (one line under the title), draft (true keeps it off /writing), image (optional
//   link-preview image path under public/).
// The body is markdown: ## and ### headings, paragraphs, *em*, **strong**, `code`, [links](url),
// - and 1. lists, ``` fenced code, one > pull quote, footnotes ([^id] with `[^id]: text` lines),
// and figures: an image alone in its paragraph, `![caption](file)`. A .svg figure is a diagram,
// anything else an image. A `## Further reading` section of `- [title](href): note (N pages)`
// items becomes the further-reading block. A draft whose figure file is missing still builds,
// with a placeholder; a published essay with any problem fails the build.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CONTENT = path.join(ROOT, 'content', 'writing');
const PUBLIC = path.join(ROOT, 'public');
const OUT = path.join(ROOT, 'src', 'writing', 'essays.generated.json');
const SITE = 'https://ihsan.cc';
const WORDS_PER_MINUTE = 230;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'];

// ---- inline markdown -------------------------------------------------------

// Returns a list of nodes: {t:'text',v} {t:'em',c} {t:'strong',c} {t:'code',v}
// {t:'link',href,c} {t:'fn',id}. Footnote numbers are filled in later.
function parseInline(src) {
  const out = [];
  let text = '';
  const flush = () => {
    if (text) out.push({ t: 'text', v: text });
    text = '';
  };
  let i = 0;
  while (i < src.length) {
    const rest = src.slice(i);
    let m;
    if ((m = rest.match(/^`([^`]+)`/))) {
      flush();
      out.push({ t: 'code', v: m[1] });
    } else if ((m = rest.match(/^\[\^([^\]\s]+)\]/))) {
      flush();
      out.push({ t: 'fn', id: m[1] });
    } else if ((m = rest.match(/^\[([^\]]+)\]\(([^)\s]+)\)/))) {
      flush();
      out.push({ t: 'link', href: m[2], c: parseInline(m[1]) });
    } else if ((m = rest.match(/^\*\*(.+?)\*\*/))) {
      flush();
      out.push({ t: 'strong', c: parseInline(m[1]) });
    } else if ((m = rest.match(/^\*([^*\s](?:[^*]*[^*\s])?)\*/)) || (m = rest.match(/^_([^_\s](?:[^_]*[^_\s])?)_(?![A-Za-z0-9])/))) {
      flush();
      out.push({ t: 'em', c: parseInline(m[1]) });
    } else {
      text += src[i];
      i += 1;
      continue;
    }
    i += m[0].length;
  }
  flush();
  return out;
}

function plainText(nodes) {
  return nodes.map((n) => (n.c ? plainText(n.c) : n.v || '')).join('');
}

// ---- front matter ----------------------------------------------------------

function parseFrontMatter(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return { meta: {}, body: src };
  const meta = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim().replace(/^"(.*)"$/, '$1');
    if (v === 'true') v = true;
    else if (v === 'false') v = false;
    meta[kv[1]] = v;
  }
  return { meta, body: src.slice(m[0].length) };
}

function formatDate(iso) {
  const [y, mo, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[mo - 1]} ${y}`;
}

// The page count read out of a further-reading item's trailing "(N pages)".
function parseReading(line) {
  const m = line.match(/^\[([^\]]+)\]\(([^)\s]+)\)\s*:?\s*(.*)$/);
  if (!m) return null;
  let note = m[3].trim();
  let pages = null;
  const p = note.match(/\s*\((\d+)\s+pages?\)\.?$/);
  if (p) {
    pages = Number(p[1]);
    note = note.slice(0, p.index).trim();
  }
  return { title: m[1], href: m[2], note: note.replace(/\.$/, ''), pages };
}

// ---- blocks ----------------------------------------------------------------

// Parse one essay. `assets(slug, file)` answers {exists, width, height} for a figure.
function parseEssay(source, slug, assets = () => ({ exists: true })) {
  const problems = [];
  const { meta, body } = parseFrontMatter(source.replace(/\r\n/g, '\n'));
  for (const key of ['title', 'date', 'summary', 'standfirst']) {
    if (!meta[key]) problems.push(`front matter has no ${key}`);
  }
  if (meta.date && !/^\d{4}-\d{2}-\d{2}$/.test(meta.date)) problems.push(`date "${meta.date}" is not YYYY-MM-DD`);

  const lines = body.split('\n');
  const blocks = [];
  const footnoteText = {};
  const furtherReading = [];
  let inReading = false;
  let para = [];
  let words = 0;

  const count = (s) => {
    words += s.split(/\s+/).filter(Boolean).length;
  };
  const endPara = () => {
    if (!para.length) return;
    const text = para.join(' ').trim();
    para = [];
    count(text);
    const fig = text.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
    if (!fig) {
      blocks.push({ t: 'p', c: parseInline(text) });
      return;
    }
    const file = fig[2];
    const a = assets(slug, file);
    const block = {
      t: 'figure',
      kind: /\.svg$/i.test(file) ? 'diagram' : 'image',
      src: `/writing/${slug}/${file}`,
      alt: plainText(parseInline(fig[1])),
      caption: parseInline(fig[1]),
    };
    if (a.width) Object.assign(block, { width: a.width, height: a.height });
    if (!a.exists) {
      block.missing = true;
      problems.push(`figure ${file} is not in public/writing/${slug}/`);
    }
    if (!fig[1]) problems.push(`figure ${file} has no caption`);
    blocks.push(block);
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    let m;
    if ((m = line.match(/^\[\^([^\]\s]+)\]:\s*(.*)$/))) {
      endPara();
      let text = m[2];
      while (i + 1 < lines.length && /^\s{2,}\S/.test(lines[i + 1])) text += ` ${lines[++i].trim()}`;
      footnoteText[m[1]] = text;
    } else if (line.startsWith('```')) {
      endPara();
      const lang = line.slice(3).trim();
      const code = [];
      while (i + 1 < lines.length && !lines[i + 1].startsWith('```')) code.push(lines[++i]);
      i += 1;
      blocks.push({ t: 'code', lang, v: code.join('\n') });
    } else if ((m = line.match(/^(#{2,3})\s+(.*)$/))) {
      endPara();
      inReading = m[1] === '##' && /^further reading$/i.test(m[2].trim());
      if (!inReading) {
        count(m[2]);
        blocks.push({ t: m[1] === '##' ? 'h2' : 'h3', c: parseInline(m[2]) });
      }
    } else if (/^#\s/.test(line)) {
      endPara();
      problems.push('the title belongs in front matter, not a # heading');
    } else if (inReading) {
      if ((m = line.match(/^[-*]\s+(.*)$/))) {
        const item = parseReading(m[1].trim());
        if (item) furtherReading.push(item);
        else problems.push(`further-reading item is not [title](href): note — ${m[1]}`);
      } else if (line.trim()) {
        problems.push(`further reading holds only list items — ${line}`);
      }
    } else if ((m = line.match(/^>\s?(.*)$/))) {
      endPara();
      const quote = [m[1]];
      while (i + 1 < lines.length && /^>/.test(lines[i + 1])) quote.push(lines[++i].replace(/^>\s?/, ''));
      const text = quote.join(' ').trim();
      count(text);
      blocks.push({ t: 'quote', c: parseInline(text) });
    } else if ((m = line.match(/^(?:([-*])|(\d+)\.)\s+(.*)$/))) {
      endPara();
      const ordered = !m[1];
      const items = [m[3]];
      while (i + 1 < lines.length) {
        const next = lines[i + 1];
        const item = next.match(ordered ? /^\d+\.\s+(.*)$/ : /^[-*]\s+(.*)$/);
        if (item) items.push(item[1]);
        else if (/^\s{2,}\S/.test(next)) items[items.length - 1] += ` ${next.trim()}`;
        else break;
        i += 1;
      }
      items.forEach(count);
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

  if (blocks.filter((b) => b.t === 'quote').length > 1) problems.push('more than one pull quote');

  // Number footnotes by first reference, and check every ref has text and vice versa.
  const footnotes = [];
  const number = {};
  const walk = (nodes) => nodes.forEach((n) => {
    if (n.t === 'fn') {
      if (!(n.id in number)) {
        number[n.id] = footnotes.length + 1;
        if (!(n.id in footnoteText)) problems.push(`footnote [^${n.id}] has no text`);
        footnotes.push({ id: n.id, n: number[n.id], c: parseInline(footnoteText[n.id] || '') });
      }
      n.n = number[n.id];
    }
    if (n.c) walk(n.c);
  });
  blocks.forEach((b) => {
    if (b.c) walk(b.c);
    if (b.items) b.items.forEach(walk);
  });
  Object.keys(footnoteText).forEach((id) => {
    if (!(id in number)) problems.push(`footnote [^${id}] is never referenced`);
  });

  const essay = {
    slug,
    title: meta.title || slug,
    date: meta.date || '',
    dateLabel: meta.date ? formatDate(meta.date) : '',
    summary: meta.summary || '',
    blurb: meta.blurb || meta.summary || '',
    standfirst: meta.standfirst || '',
    draft: meta.draft === true,
    readingMinutes: Math.max(1, Math.round(words / WORDS_PER_MINUTE)),
    blocks,
    footnotes,
    furtherReading,
  };
  if (meta.image) essay.image = meta.image;
  return { essay, problems };
}

// ---- files -----------------------------------------------------------------

function svgSize(file) {
  const head = fs.readFileSync(file, 'utf8').slice(0, 2000);
  const w = head.match(/<svg[^>]*\swidth="([\d.]+)"/);
  const h = head.match(/<svg[^>]*\sheight="([\d.]+)"/);
  return w && h ? { width: Math.round(+w[1]), height: Math.round(+h[1]) } : {};
}

function diskAssets(slug, file) {
  const p = path.join(PUBLIC, 'writing', slug, file);
  if (!fs.existsSync(p)) return { exists: false };
  return { exists: true, ...(/\.svg$/i.test(p) ? svgSize(p) : {}) };
}

// Every essay, newest first. Throws when a published essay has a problem.
function loadEssays(dir = CONTENT, assets = diskAssets) {
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.md')) : [];
  const essays = [];
  const errors = [];
  for (const f of files) {
    const slug = f.slice(0, -3);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      errors.push(`${f}: a slug is lowercase words joined by hyphens`);
      continue;
    }
    const { essay, problems } = parseEssay(fs.readFileSync(path.join(dir, f), 'utf8'), slug, assets);
    problems.forEach((p) => (essay.draft ? console.warn(`writing: ${f} (draft): ${p}`) : errors.push(`${f}: ${p}`)));
    essays.push(essay);
  }
  if (errors.length) throw new Error(`writing:\n  ${errors.join('\n  ')}`);
  return essays.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.slug.localeCompare(b.slug)));
}

function build() {
  const essays = loadEssays();
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(essays, null, 1)}\n`);
  const live = essays.filter((e) => !e.draft).length;
  console.log(`writing: ${essays.length} essay(s), ${live} published, ${essays.length - live} draft`);
}

// ---- link-preview pages ----------------------------------------------------

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Swap the head tags a link preview reads, in build/index.html, for one page's own.
// scripts/build-static.js uses it too, for its plain-HTML essay pages.
function withMeta(html, { title, description, url, type, image }) {
  const set = (re, tag) => {
    if (!re.test(html)) throw new Error(`writing: build/index.html has no ${re}`);
    html = html.replace(re, tag);
  };
  set(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`);
  set(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/, `<meta name="description" content="${esc(description)}"/>`);
  set(/<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${esc(title)}"/>`);
  set(/<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/, `<meta property="og:description" content="${esc(description)}"/>`);
  set(/<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/, `<meta property="og:url" content="${esc(url)}"/><link rel="canonical" href="${esc(url)}"/>`);
  set(/<meta\s+property="og:type"\s+content="[^"]*"\s*\/?>/, `<meta property="og:type" content="${type}"/>`);
  if (image) set(/<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/, `<meta property="og:image" content="${esc(SITE + image)}"/>`);
  return html;
}

function pages(buildDir = path.join(ROOT, 'build'), essays = loadEssays()) {
  const shell = fs.readFileSync(path.join(buildDir, 'index.html'), 'utf8');
  const write = (rel, html) => {
    fs.mkdirSync(path.join(buildDir, rel), { recursive: true });
    fs.writeFileSync(path.join(buildDir, rel, 'index.html'), html);
  };
  write('writing', withMeta(shell, {
    title: 'Writing · Ihsan Salari',
    description: 'Essays on the AI systems I build.',
    url: `${SITE}/writing`,
    type: 'website',
  }));
  // A draft gets no page: it is served only at the preview path, as the app.
  const live = essays.filter((e) => !e.draft);
  for (const e of live) {
    write(path.join('writing', e.slug), withMeta(shell, {
      title: `${e.title} · Ihsan Salari`,
      description: e.summary,
      url: `${SITE}/writing/${e.slug}`,
      type: 'article',
      image: e.image,
    }));
  }
  console.log(`writing: link-preview pages for /writing and ${live.length} essay(s)`);
}

module.exports = { parseEssay, parseReading, loadEssays, pages, withMeta };

if (require.main === module) {
  const cmd = process.argv[2];
  try {
    if (cmd === 'build') build();
    else if (cmd === 'pages') pages();
    else {
      console.error('usage: node scripts/writing.js build|pages');
      process.exit(2);
    }
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}

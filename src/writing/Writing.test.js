import { render, screen } from '@testing-library/react';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Writing, { matchWriting } from './Writing';
import App, { PREVIEW_PATH } from '../App';
import generated from './essays.generated.json';

const { parseEssay, parseReading, loadEssays, pages } = require('../../scripts/writing');

beforeEach(() => window.history.pushState({}, '', '/'));

const essay = (front, body) => `---\n${front}\n---\n${body}`;
const FRONT = 'title: A title\ndate: 2026-09-01\nsummary: One line.\nstandfirst: The standfirst.';

test('an essay parses its front matter, figures, pull quote, code, footnotes and further reading', () => {
  const src = essay(`${FRONT}\ndraft: true`, [
    'Some *em* and **strong** and `code` and a [link](https://x.y).[^a]',
    '',
    '![The *caption*.](arch.svg)',
    '',
    '![A photo.](shot.png)',
    '',
    '> The pull quote.',
    '',
    '```sh',
    'cc go',
    '```',
    '',
    '## Further reading',
    '',
    '- [Note](https://library.ihsan.cc/d/1): what it covers (4 pages).',
    '',
    '[^a]: The note, with `code`.',
  ].join('\n'));
  const { essay: e, problems } = parseEssay(src, 'a-title', (slug, file) =>
    file === 'arch.svg' ? { exists: true, width: 900, height: 300 } : { exists: true });
  expect(problems).toEqual([]);
  expect(e).toMatchObject({ slug: 'a-title', dateLabel: '1 September 2026', draft: true, summary: 'One line.' });
  expect(e.blocks.map((b) => b.t)).toEqual(['p', 'figure', 'figure', 'quote', 'code']);
  expect(e.blocks[1]).toMatchObject({ kind: 'diagram', src: '/writing/a-title/arch.svg', alt: 'The caption.', width: 900 });
  expect(e.blocks[2]).toMatchObject({ kind: 'image', src: '/writing/a-title/shot.png' });
  expect(e.blocks[4]).toEqual({ t: 'code', lang: 'sh', v: 'cc go' });
  expect(e.blocks[0].c.map((n) => n.t)).toEqual(['text', 'em', 'text', 'strong', 'text', 'code', 'text', 'link', 'text', 'fn']);
  expect(e.blocks[0].c[9]).toEqual({ t: 'fn', id: 'a', n: 1 });
  expect(e.footnotes).toHaveLength(1);
  // The further-reading section leaves the body and becomes its own block.
  expect(e.furtherReading).toEqual([{ title: 'Note', href: 'https://library.ihsan.cc/d/1', note: 'what it covers', pages: 4 }]);
});

test('a further-reading item may leave out its note and page count', () => {
  expect(parseReading('[T](https://a.b)')).toEqual({ title: 'T', href: 'https://a.b', note: '', pages: null });
  expect(parseReading('not a link')).toBeNull();
});

test('the parser names each problem: missing figure, loose footnotes, two pull quotes, no summary', () => {
  const src = essay('title: T\ndate: 2026-09-01\nstandfirst: S', [
    '![cap](gone.svg)', '', 'Ref.[^x]', '', '> one', '', '> two', '', '[^y]: unused',
  ].join('\n'));
  const { problems } = parseEssay(src, 't', () => ({ exists: false }));
  expect(problems).toEqual([
    'front matter has no summary',
    'figure gone.svg is not in public/writing/t/',
    'more than one pull quote',
    'footnote [^x] has no text',
    'footnote [^y] is never referenced',
  ]);
});

test('a problem fails the build for a published essay and only warns for a draft', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'writing-'));
  const broken = '\n![cap](gone.svg)\n';
  fs.writeFileSync(path.join(dir, 'draft-one.md'), essay(`${FRONT}\ndraft: true`, broken));
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  expect(loadEssays(dir, () => ({ exists: false })).map((e) => e.slug)).toEqual(['draft-one']);
  expect(warn).toHaveBeenCalledWith(expect.stringContaining('gone.svg'));

  fs.writeFileSync(path.join(dir, 'live-one.md'), essay(FRONT, broken));
  expect(() => loadEssays(dir, () => ({ exists: false }))).toThrow(/live-one\.md: figure gone\.svg/);
  warn.mockRestore();
});

test('the build writes a link-preview page for /writing and each published essay, never a draft', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'writing-build-'));
  fs.copyFileSync(path.join(__dirname, '..', '..', 'public', 'index.html'), path.join(dir, 'index.html'));
  const log = jest.spyOn(console, 'log').mockImplementation(() => {});
  pages(dir, [
    { slug: 'live', title: 'Live & well', summary: 'A "summary".', draft: false },
    { slug: 'secret', title: 'Secret', summary: 'Not yet.', draft: true },
  ]);
  log.mockRestore();
  const live = fs.readFileSync(path.join(dir, 'writing', 'live', 'index.html'), 'utf8');
  expect(live).toContain('<title>Live &amp; well · Ihsan Salari</title>');
  expect(live).toContain('<meta property="og:description" content="A &quot;summary&quot;."/>');
  expect(live).toContain('<meta property="og:url" content="https://ihsan.cc/writing/live"/>');
  expect(live).toContain('<meta property="og:type" content="article"/>');
  expect(fs.existsSync(path.join(dir, 'writing', 'index.html'))).toBe(true);
  expect(fs.existsSync(path.join(dir, 'writing', 'secret'))).toBe(false);
});

test('matchWriting takes /writing paths, with or without the preview path, and nothing else', () => {
  expect(matchWriting('/writing', PREVIEW_PATH)).toEqual({ preview: false, slug: null });
  expect(matchWriting('/writing/a-b/', PREVIEW_PATH)).toEqual({ preview: false, slug: 'a-b' });
  expect(matchWriting(`${PREVIEW_PATH}/writing/a-b`, PREVIEW_PATH)).toEqual({ preview: true, slug: 'a-b' });
  expect(matchWriting('/', PREVIEW_PATH)).toBeNull();
  expect(matchWriting(PREVIEW_PATH, PREVIEW_PATH)).toBeNull();
  expect(matchWriting('/writing/a/b', PREVIEW_PATH)).toBeNull();
  expect(matchWriting('/writingx', PREVIEW_PATH)).toBeNull();
});

const FIXTURE = [
  { slug: 'newest', title: 'Newest', date: '2026-09-03', dateLabel: '3 September 2026', summary: 'N.', standfirst: 'N.', draft: true, readingMinutes: 2, blocks: [], footnotes: [], furtherReading: [] },
  {
    slug: 'middle', title: 'Middle', date: '2026-09-02', dateLabel: '2 September 2026', summary: 'M sum.', standfirst: 'M stand.', draft: false, readingMinutes: 4,
    blocks: [
      { t: 'p', c: [{ t: 'text', v: 'Body.' }, { t: 'fn', id: 'a', n: 1 }] },
      { t: 'figure', kind: 'diagram', src: '/writing/middle/a.svg', alt: 'Cap', caption: [{ t: 'text', v: 'Cap' }], width: 900, height: 300 },
      { t: 'figure', kind: 'image', src: '/writing/middle/b.png', alt: 'Shot', caption: [{ t: 'text', v: 'Shot' }], missing: true },
    ],
    footnotes: [{ id: 'a', n: 1, c: [{ t: 'text', v: 'The note.' }] }],
    furtherReading: [{ title: 'Tech note', href: 'https://library.ihsan.cc/d/1', note: 'How it works', pages: 4 }],
  },
  { slug: 'oldest', title: 'Oldest', date: '2026-09-01', dateLabel: '1 September 2026', summary: 'O.', standfirst: 'O.', draft: false, readingMinutes: 1, blocks: [], footnotes: [], furtherReading: [] },
];

const at = (route) => render(<Writing route={route} previewPath={PREVIEW_PATH} essays={FIXTURE} />);

test('the index lists published essays only, each with title, summary, date and reading time', () => {
  const { container } = at({ preview: false, slug: null });
  const items = [...container.querySelectorAll('.wr-index__item')];
  expect(items.map((li) => li.querySelector('a').getAttribute('href'))).toEqual(['/writing/middle', '/writing/oldest']);
  expect(items[0]).toHaveTextContent('M sum.');
  expect(items[0]).toHaveTextContent('2 September 2026 · 4 min read');
  expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
});

test('the preview index lists drafts too, marked, and asks not to be indexed', () => {
  const { container } = at({ preview: true, slug: null });
  const links = [...container.querySelectorAll('.wr-index__link')].map((a) => a.getAttribute('href'));
  expect(links).toEqual([`${PREVIEW_PATH}/writing/newest`, `${PREVIEW_PATH}/writing/middle`, `${PREVIEW_PATH}/writing/oldest`]);
  expect(container.querySelector('.wr-index__item')).toHaveTextContent('Draft');
  expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
});

test('a draft is not found at /writing/<slug> but renders at the preview path', () => {
  const { container, unmount } = at({ preview: false, slug: 'newest' });
  expect(container.querySelector('.wr-missing')).not.toBeNull();
  unmount();
  at({ preview: true, slug: 'newest' });
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Newest');
});

test('an essay page has its head, figures, notes, further reading and pager', () => {
  const { container } = at({ preview: false, slug: 'middle' });
  expect(document.title).toBe('Middle · Ihsan Salari');
  expect(container.querySelector('.wr-standfirst')).toHaveTextContent('M stand.');
  const diagram = container.querySelector('.wr-figure--diagram img');
  expect(diagram).toHaveAttribute('src', '/writing/middle/a.svg');
  expect(diagram.style.minWidth).toBe('560px');
  expect(container.querySelector('.wr-figure--diagram figcaption')).toHaveTextContent('Cap');
  // A missing image renders a placeholder, never a broken request.
  expect(container.querySelector('.wr-figure--image img')).toBeNull();
  expect(container.querySelector('.wr-figure__missing')).toHaveTextContent('b.png');
  // The note is both a sidenote (wide screens) and a footnote (phones).
  expect(container.querySelector('.wr-sidenote')).toHaveTextContent('The note.');
  expect(container.querySelector('#fn-1')).toHaveTextContent('The note.');
  expect(container.querySelector('#fnref-1')).toHaveAttribute('href', '#fn-1');
  const reading = container.querySelector('.wr-reading__item');
  expect(reading.querySelector('a')).toHaveAttribute('target', '_blank');
  expect(reading).toHaveTextContent('How it works · 4 pages');
  // Previous is the older essay; the draft above it is not "next" on the public site.
  expect(container.querySelector('.wr-pager__link--prev')).toHaveAttribute('href', '/writing/oldest');
  expect(container.querySelector('.wr-pager__link--next')).toBeNull();
  expect(container.querySelector('.wr-pager__index')).toHaveAttribute('href', '/writing');
});

test('the app routes /writing to the essays and leaves the front page and prototype alone', () => {
  window.history.pushState({}, '', '/writing');
  const { container, unmount } = render(<App />);
  expect(container.querySelector('.wr-index')).not.toBeNull();
  unmount();
  window.history.pushState({}, '', PREVIEW_PATH);
  const proto = render(<App />);
  expect(proto.container.querySelector('.pv-proto')).not.toBeNull();
  expect(proto.container.querySelector('.wr')).toBeNull();
});

test('every essay in the repo is a draft until the owner approves it', () => {
  // Flip this when an essay is approved and its draft line removed.
  expect(generated.filter((e) => !e.draft).map((e) => e.slug)).toEqual([]);
  expect(generated.map((e) => e.slug)).toContain('talking-to-my-server');
});

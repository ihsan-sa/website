import { render, screen } from '@testing-library/react';
import fs from 'fs';
import path from 'path';
import App, { PORTFOLIO_PREVIEW_PATH, PREVIEW_PATH } from './App';

const { parsePortfolio, splitMedia, PDF_HREF } = require('../scripts/portfolio');

const ROOT = path.join(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(ROOT, ...parts), 'utf8');

beforeEach(() => window.history.pushState({}, '', '/'));

// Every file exists but one named "missing", and only hero.webp has an .mp4 and a poster beside it.
const assets = (src) => {
  if (/missing/.test(src)) return { exists: false };
  if (/-poster\.webp$|\.mp4$/.test(src) && !/(hero|clip)/.test(src)) return { exists: false };
  return { exists: true, width: 10, height: 5 };
};

const SAMPLE = `<!-- a note to the editor -->

# AI work

The standfirst.

<!-- LINK: the PDF goes here -->

Intro with *em*.

## autobox

[github.com/ihsan-sa/autobox](https://github.com/ihsan-sa/autobox)

<!-- GIF: /writing/autobox/hero.webp, autobox at work -->

<!-- FIGURE: portfolio/figures/a.png, portfolio/figures/b.png, two boards -->

<!-- FIGURE: one post before and after -->

![a clip](portfolio/clip.mp4)

## No repo

Text.
`;

test('a media comment splits into its files and its caption', () => {
  expect(splitMedia('/writing/autobox/hero.webp, autobox at work')).toEqual({ files: ['/writing/autobox/hero.webp'], caption: 'autobox at work' });
  expect(splitMedia("the SPI FIFO's layout in 3D (/writing/autobox/chip.webp)")).toEqual({ files: ['/writing/autobox/chip.webp'], caption: "the SPI FIFO's layout in 3D" });
  expect(splitMedia('portfolio/figures/x.svg')).toEqual({ files: ['portfolio/figures/x.svg'], caption: '' });
  expect(splitMedia('one post before and after')).toEqual({ files: [], caption: 'one post before and after' });
});

test('the markdown becomes a title, a standfirst, the PDF link, headed sections and media', () => {
  const { page, problems, placeholders } = parsePortfolio(SAMPLE, assets);
  expect(problems).toEqual([]);
  expect(page.title).toBe('AI work');
  expect(page.standfirst).toEqual([{ t: 'text', v: 'The standfirst.' }]);
  expect(page.blocks.map((b) => b.t)).toEqual(['pdf', 'p', 'h2', 'media', 'media', 'media', 'h2', 'p']);
  expect(page.blocks[0].href).toBe(PDF_HREF);
  // The repo link alone under a heading belongs to it; a heading without one has none.
  expect(page.blocks[2].repo).toEqual({ label: 'github.com/ihsan-sa/autobox', href: 'https://github.com/ihsan-sa/autobox' });
  expect(page.blocks[6].repo).toBeUndefined();
  const [gif, row, video] = page.blocks.filter((b) => b.t === 'media');
  expect(gif.items[0]).toMatchObject({ src: '/writing/autobox/hero.webp', video: '/writing/autobox/hero.mp4', poster: '/writing/autobox/hero-poster.webp' });
  expect(gif.alt).toBe('autobox at work');
  expect(row.items.map((i) => i.src)).toEqual(['/portfolio/figures/a.png', '/portfolio/figures/b.png']);
  expect(video.items[0].kind).toBe('video');
  // A comment naming no file is a placeholder: listed, never shown.
  expect(placeholders).toEqual(['FIGURE: one post before and after']);
});

test('a media file that is not in public/ is a problem', () => {
  const { problems } = parsePortfolio('# T\n\nS.\n\n<!-- FIGURE: portfolio/missing.svg -->\n', assets);
  expect(problems).toEqual(['media /portfolio/missing.svg is not in public/']);
});

test('the owner\'s markdown parses with every file it names in the repo', () => {
  const { page, problems } = parsePortfolio(read('content', 'portfolio', 'ai.md'));
  expect(problems).toEqual([]);
  expect(page.blocks.filter((b) => b.t === 'h2').every((b) => b.repo)).toBe(true);
  expect(page.blocks.filter((b) => b.t === 'pdf')).toHaveLength(1);
  expect(fs.existsSync(path.join(ROOT, 'public', PDF_HREF))).toBe(true);
});

test('the portfolio is shown only at its preview path, with noindex', () => {
  window.history.pushState({}, '', PORTFOLIO_PREVIEW_PATH);
  render(<App />);
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('AI work');
  expect(screen.getByRole('link', { name: 'Read this as a PDF' })).toHaveAttribute('href', PDF_HREF);
  expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  expect(PORTFOLIO_PREVIEW_PATH.startsWith(`${PREVIEW_PATH}/`)).toBe(true);
});

test('/aiportfolio is not the portfolio yet, and the old portfolio PDF stays where it was', () => {
  window.history.pushState({}, '', '/aiportfolio');
  const { container } = render(<App />);
  expect(container.querySelector('.wr-portfolio')).toBeNull();
  expect(read('public', '_redirects')).not.toMatch(/^\/aiportfolio\b/m);
  expect(fs.existsSync(path.join(ROOT, 'public', 'docs', 'ai-portfolio.pdf'))).toBe(true);
});

import { act, fireEvent, render, screen } from '@testing-library/react';
import fs from 'fs';
import path from 'path';
import App, { PREVIEW_PATH } from './App';
import content from './content.json';
import shelved from './content.shelved.json';

beforeEach(() => {
  document.documentElement.removeAttribute('data-theme');
  localStorage.clear();
  window.history.pushState({}, '', '/');
});

const { preview } = content;
const aiItems = preview.aiWork.items;
const aiDocs = aiItems.flatMap(({ docs }) => docs || []);

test('the page renders links, intro, Experience, AI work and Hardware in that order', () => {
  const { container, unmount } = render(<App />);

  const nav = screen.getByRole('navigation', { name: /contact and profiles/i });
  const h1 = screen.getByRole('heading', { level: 1, name: preview.name });
  const h2s = screen.getAllByRole('heading', { level: 2 });
  expect(h2s.map((h) => h.textContent)).toEqual([
    preview.experience.heading,
    preview.aiWork.heading,
    preview.hardware.heading,
  ]);
  const order = [nav, h1, ...h2s];
  order.slice(1).forEach((el, i) => {
    // eslint-disable-next-line no-bitwise
    expect(order[i].compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  // The index's two-column page is not rendered here.
  expect(container.querySelector('.body-grid')).toBeNull();
  expect(screen.getByText(preview.subtitle)).toBeInTheDocument();
  preview.about.forEach((para) => expect(screen.getByText(para)).toBeInTheDocument());

  expect(screen.getByRole('link', { name: preview.email })).toHaveAttribute('href', `mailto:${preview.email}`);
  preview.links.forEach(({ label, href }) => {
    expect(screen.getByRole('link', { name: label })).toHaveAttribute('href', href);
  });

  // The page is the site now, so nothing keeps it out of search results.
  expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
  unmount();
});

test('the page links each AI name to GitHub, chip design flow to its PDF, plus the PDFs', () => {
  render(<App />);

  const expected = {
    autobox: 'https://github.com/ihsan-sa/autobox',
    hwde: 'https://github.com/ihsan-sa/hwde',
    'lesson-builder': 'https://github.com/ihsan-sa/lesson-builder',
    'chip design flow': '/docs/chip-design-flow.pdf',
  };
  expect(aiItems.map(({ name }) => name).sort()).toEqual(Object.keys(expected).sort());
  Object.entries(expected).forEach(([name, href]) => {
    const link = screen.getByRole('link', { name });
    expect(link).toHaveAttribute('href', href);
    expect(link).toHaveAttribute('target', '_blank');
  });

  expect(aiDocs.map(({ label }) => label)).toEqual(['Overview', 'Deeper look', 'Map', 'Showcase', 'Brief']);
  aiDocs.forEach(({ label, href }) => {
    expect(screen.getByRole('link', { name: label })).toHaveAttribute('href', href);
    expect(screen.getByRole('link', { name: label })).toHaveClass('pv-doc');
  });
});

test('experience names link only where a real page exists', () => {
  render(<App />);
  preview.experience.items.forEach(({ name, href }) => {
    if (href) {
      expect(screen.getByRole('link', { name })).toHaveAttribute('href', href);
    } else {
      expect(screen.getByText(name).closest('a')).toBeNull();
    }
  });
  expect(screen.getByRole('link', { name: 'aiRadar' }).getAttribute('href')).toMatch(/^https:\/\/docs\.ihsan\.cc\//);
});

test('the page hardware grid has six tiles, no radar, each with its photo', () => {
  const { container } = render(<App />);

  const tiles = container.querySelectorAll('.pv-hw a');
  expect(tiles).toHaveLength(6);
  tiles.forEach((tile) => expect(tile).not.toHaveTextContent(/radar/i));
  expect(container.querySelector('a[href*="FMCW_Radar"]')).toBeNull();

  preview.hardware.items.forEach(({ title, href, image }) => {
    const tile = screen.getByText(title).closest('a');
    expect(tile).toHaveAttribute('href', href);
    expect(href).toMatch(/^https:\/\/docs\.ihsan\.cc\//);
    expect(image).toMatch(/^\/images\//);
    expect(tile.querySelector('img')).toHaveAttribute('src', image);
  });
});

test('the page theme toggle names its destination and persists the choice', () => {
  render(<App />);

  const toggle = screen.getByRole('button', { name: /switch to dark theme/i });
  expect(toggle).toHaveTextContent(content.theme.toDark);
  expect(toggle).toHaveAttribute('aria-pressed', 'false');

  fireEvent.click(toggle);
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  expect(localStorage.getItem('ihsan-theme')).toBe('dark');
  expect(toggle).toHaveTextContent(content.theme.toLight);
  expect(toggle).toHaveAttribute('aria-pressed', 'true');
});

test('shelved AI rows do not render', () => {
  expect(shelved.ai.length).toBeGreaterThan(0);
  render(<App />);
  // The live rows do render, so the check below is not vacuous.
  aiItems.forEach(({ name }) => expect(screen.getByText(name)).toBeInTheDocument());
  shelved.ai.forEach(({ title, href }) => {
    expect(screen.queryByText(title)).not.toBeInTheDocument();
    expect(document.querySelector(`a[href="${href}"]`)).toBeNull();
  });
});

// The front page must stay byte-for-byte what it was while the prototype sits
// at its hidden path. The snapshot was taken from the front page before the
// prototype existed; a diff here means the prototype leaked onto it.
test('the front page is unchanged', () => {
  const { container, unmount } = render(<App />);
  expect(container.innerHTML).toMatchSnapshot();
  expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
  unmount();
});

// ---- The prototype at the hidden path -------------------------------------

const { prototype } = content;
const read = (...parts) => fs.readFileSync(path.join(__dirname, '..', ...parts), 'utf8');

test('the prototype path is unguessable, served by one rule and published nowhere', () => {
  expect(PREVIEW_PATH).toMatch(/^\/[a-z0-9]{32}$/);
  expect(read('public', '_redirects').trim().split('\n')).toEqual([
    `${PREVIEW_PATH}    /index.html    200`,
  ]);
  // robots.txt would publish the path, so it must not name it.
  expect(read('public', 'robots.txt')).not.toContain(PREVIEW_PATH.slice(1));
  // Nothing the site ships links to it: only App.js and _redirects carry it.
  ['public/index.html', 'public/manifest.json', 'src/content.json'].forEach((f) =>
    expect(read(f)).not.toContain(PREVIEW_PATH.slice(1))
  );
});

test('the prototype renders only at its path, and asks not to be indexed', () => {
  window.history.pushState({}, '', PREVIEW_PATH);
  const { container, unmount } = render(<App />);
  expect(container.querySelector('.pv-proto')).not.toBeNull();
  expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  unmount();
  expect(document.head.querySelector('meta[name="robots"]')).toBeNull();

  // Any other path, including one a character short, is the front page.
  window.history.pushState({}, '', PREVIEW_PATH.slice(0, -1));
  const front = render(<App />);
  expect(front.container.querySelector('.pv-proto')).toBeNull();
  expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
  front.unmount();
});

test('the prototype puts a result under every experience row and AI project', () => {
  window.history.pushState({}, '', PREVIEW_PATH);
  render(<App />);
  expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
    prototype.experience.heading,
    prototype.aiWork.heading,
    prototype.projects.heading,
  ]);
  prototype.experience.items.forEach(({ result }) => {
    expect(result).toBeTruthy();
    expect(screen.getByText(result)).toHaveClass('pv-result');
  });
  prototype.aiWork.items.forEach(({ result }) => {
    expect(result).toBeTruthy();
    expect(screen.getByText(result)).toHaveClass('pv-result');
  });
});

test('the prototype orders AI work hwde, autobox, lesson-builder, then the chip proposal', () => {
  window.history.pushState({}, '', PREVIEW_PATH);
  const { container } = render(<App />);
  expect(prototype.aiWork.items.map(({ name }) => name)).toEqual([
    'hwde',
    'autobox',
    'lesson-builder',
    'chip design flow',
  ]);
  const names = [...container.querySelectorAll('.pv-block:nth-of-type(2) .pv-entry .pv-strong')];
  expect(names.map((n) => n.textContent)).toEqual(prototype.aiWork.items.map(({ name }) => name));

  // The chip proposal links its PDF once, not from both the name and "Brief".
  expect(container.querySelectorAll('a[href="/docs/chip-design-flow.pdf"]')).toHaveLength(1);
  expect(screen.queryByRole('link', { name: 'chip design flow' })).toBeNull();

  // lesson-builder keeps its repo link and shows the lesson spot without inventing a URL.
  expect(screen.getByRole('link', { name: 'lesson-builder' })).toHaveAttribute(
    'href',
    'https://github.com/ihsan-sa/lesson-builder'
  );
  expect(screen.getByText(/See a generated lesson/)).not.toHaveAttribute('href');
  expect(screen.getByText(/See a generated lesson/).closest('a')).toBeNull();

  // hwde carries its board render.
  expect(container.querySelector('img[src="/images/hwde-lumina-carrier.jpg"]')).not.toBeNull();
});

test('every prototype PDF says what it is and how many pages', () => {
  window.history.pushState({}, '', PREVIEW_PATH);
  render(<App />);
  const pdfs = [
    ...prototype.links.filter(({ href }) => href.endsWith('.pdf')),
    ...prototype.aiWork.docs,
    ...prototype.aiWork.items.flatMap(({ docs }) => docs || []).filter(({ href }) => href),
  ];
  expect(pdfs).toHaveLength(8);
  pdfs.forEach(({ label, href, pages }) => {
    expect(Number.isInteger(pages)).toBe(true);
    const name = `${label} · PDF, ${pages} ${pages === 1 ? 'page' : 'pages'}`;
    expect(screen.getByRole('link', { name })).toHaveAttribute('href', href);
  });
  expect(screen.getByText(prototype.aiWork.items[1].start)).toHaveClass('pv-start');
});

test('the prototype opens AI work with the AI portfolio, and pdf-material-builder stays shelved', () => {
  window.history.pushState({}, '', PREVIEW_PATH);
  render(<App />);
  const head = screen.getByRole('link', { name: 'AI portfolio · PDF, 5 pages' });
  expect(head).toHaveAttribute('href', '/docs/ai-portfolio.pdf');
  expect(read('public', 'docs', 'ai-portfolio.pdf').startsWith('%PDF')).toBe(true);
  // It comes before the first AI row.
  const first = screen.getByRole('link', { name: prototype.aiWork.items[0].name });
  // eslint-disable-next-line no-bitwise
  expect(head.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(screen.queryByText(/pdf-material-builder/)).toBeNull();
});

test('the prototype moves the contact card out of the top links to the foot', () => {
  window.history.pushState({}, '', PREVIEW_PATH);
  render(<App />);
  const nav = screen.getByRole('navigation', { name: /contact and profiles/i });
  expect(nav.querySelector('a[download]')).toBeNull();
  const card = screen.getByRole('link', { name: prototype.contactCard.label });
  expect(card).toHaveAttribute('download');
  expect(card).toHaveAttribute('href', prototype.contactCard.href);
  // eslint-disable-next-line no-bitwise
  expect(nav.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

test('the prototype linked names are marked visibly clickable, and Projects covers the solver', () => {
  window.history.pushState({}, '', PREVIEW_PATH);
  const { container } = render(<App />);
  [...container.querySelectorAll('.pv-entry a.pv-strong')].forEach((a) =>
    expect(a).toHaveClass('pv-name-link')
  );
  expect(prototype.projects.heading).not.toMatch(/hardware/i);
  expect(screen.getByText('Lorentz E&M solver')).toBeInTheDocument();
});

// ---- Folded sections on the prototype --------------------------------------

const FOLDS = ['experience', 'ai-work', 'projects'];
const foldButton = (id) => document.querySelector(`#${id} h2 button`);
const foldBody = (id) => document.getElementById(foldButton(id).getAttribute('aria-controls'));

test('every prototype section starts folded to its heading; links, intro and card stay open', () => {
  window.history.pushState({}, '', PREVIEW_PATH);
  render(<App />);
  const buttons = screen.getAllByRole('heading', { level: 2 }).map((h) => h.querySelector('button'));
  expect(buttons.map((b) => b.closest('section').id)).toEqual(FOLDS);
  FOLDS.forEach((id) => {
    const button = foldButton(id);
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(foldBody(id)).toHaveAttribute('inert');
  });
  // Nothing outside the sections is folded.
  expect(document.querySelectorAll('[inert]')).toHaveLength(FOLDS.length);
  const nav = screen.getByRole('navigation', { name: /contact and profiles/i });
  const card = screen.getByRole('link', { name: prototype.contactCard.label });
  [nav, card, screen.getByRole('heading', { level: 1 })].forEach((el) =>
    expect(el.closest('[inert]')).toBeNull()
  );
});

test('a click opens one prototype section and a second click folds it again', () => {
  window.history.pushState({}, '', PREVIEW_PATH);
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: prototype.aiWork.heading }));
  expect(foldButton('ai-work')).toHaveAttribute('aria-expanded', 'true');
  expect(foldBody('ai-work')).not.toHaveAttribute('inert');
  // The others stay folded.
  ['experience', 'projects'].forEach((id) => {
    expect(foldButton(id)).toHaveAttribute('aria-expanded', 'false');
    expect(foldBody(id)).toHaveAttribute('inert');
  });
  fireEvent.click(foldButton('ai-work'));
  expect(foldButton('ai-work')).toHaveAttribute('aria-expanded', 'false');
  expect(foldBody('ai-work')).toHaveAttribute('inert');
});

test('a hash naming a prototype section opens it, on load and on change', () => {
  window.history.pushState({}, '', `${PREVIEW_PATH}#projects`);
  render(<App />);
  expect(foldButton('projects')).toHaveAttribute('aria-expanded', 'true');
  expect(foldButton('experience')).toHaveAttribute('aria-expanded', 'false');

  window.history.pushState({}, '', `${PREVIEW_PATH}#experience`);
  act(() => window.dispatchEvent(new HashChangeEvent('hashchange')));
  expect(foldButton('experience')).toHaveAttribute('aria-expanded', 'true');
  expect(foldButton('ai-work')).toHaveAttribute('aria-expanded', 'false');
});

test('the front page has no folded sections', () => {
  render(<App />);
  expect(document.querySelector('[inert], [aria-expanded], .pv-fold')).toBeNull();
});

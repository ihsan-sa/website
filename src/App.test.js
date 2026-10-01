import { fireEvent, render, screen } from '@testing-library/react';
import fs from 'fs';
import path from 'path';
import App, { PREVIEW_PATH, Prototype, RowVisual } from './App';
import content from './content.json';
import shelved from './content.shelved.json';
import { ESSAY_BANNER } from './essayBanner';
import { PROJECT_THUMBS } from './projectThumbs';
import { SIDE_PHOTOS } from './sidePhotos';

beforeEach(() => {
  document.documentElement.removeAttribute('data-theme');
  localStorage.clear();
  window.history.pushState({}, '', '/');
});

const { prototype } = content;
const { rasterSize } = require('../scripts/writing');
const read = (...parts) => fs.readFileSync(path.join(__dirname, '..', ...parts), 'utf8');
const LIVE_ESSAY = { slug: 'live', title: 'Live one', blurb: 'the published one.', summary: 'S.', date: '2026-10-02', draft: false };
const DRAFT_ESSAY = { slug: 'secret', title: 'Secret one', summary: 'Not yet.', date: '2026-09-01', draft: true };

// ---- The front page: the draft minus its documents --------------------------

// ihsan.cc/ is the draft at PREVIEW_PATH with its documents taken off (the AI
// portfolio and Overview beside AI work, any row's docs and start) and only
// published essays, of which there are none yet.
test('the front page is the draft minus its documents, essays and noindex', () => {
  const { container } = render(<App essays={[DRAFT_ESSAY]} />);
  expect(container.querySelector('main.pv.pv-proto')).not.toBeNull();
  const withLink = ({ heading, headLink }) => (headLink ? `${heading} ${headLink.label}${headLink.arrow ? '\u2197' : ''}` : heading);
  expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
    prototype.aiWork.heading,
    prototype.experience.heading,
    withLink(prototype.projects),
  ]);
  [prototype.name, prototype.subtitle, ...prototype.about].forEach((t) => expect(screen.getByText(t)).toBeInTheDocument());
  [...prototype.experience.items, ...prototype.aiWork.items].forEach(({ name, result }) => {
    expect(screen.getAllByText(name).length).toBeGreaterThan(0);
    expect(screen.getByText(result)).toBeInTheDocument();
  });
  // No documents: AI work has none beside it, on the draft or here.
  expect(container.textContent).not.toContain('AI portfolio');
  expect(container.querySelector(`a[href="/docs/notes/overview.pdf"]`)).toBeNull();
  expect(container.querySelector('.pv-docs, .pv-pending, .pv-start')).toBeNull();
  // No essays: neither the bar's link nor the section, and no draft by name.
  expect(screen.queryByRole('link', { name: prototype.essays.heading })).toBeNull();
  expect(screen.queryByRole('heading', { name: prototype.essays.heading })).toBeNull();
  expect(container.textContent).not.toContain(DRAFT_ESSAY.title);
  // The draft path is not linked from it.
  expect(container.innerHTML).not.toContain(PREVIEW_PATH);
  // It is the page search should find.
  expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
});

test('every AI row on the front page links its name to its GitHub repo', () => {
  render(<App />);
  expect(prototype.aiWork.items.length).toBeGreaterThan(0);
  prototype.aiWork.items.forEach(({ name, href }) => {
    expect(href).toMatch(/^https:\/\/github\.com\/ihsan-sa\/[\w.-]+$/);
    expect(screen.getByRole('link', { name })).toHaveAttribute('href', href);
  });
  expect(screen.getByRole('link', { name: 'GitHub' })).toHaveAttribute('href', 'https://github.com/ihsan-sa');
});

test('the front page project tiles keep their links and show the small copies of their photos', () => {
  const { container } = render(<App />);
  const tiles = [...container.querySelectorAll('.pv-hw__item')];
  expect(tiles.map((a) => a.getAttribute('href'))).toEqual(prototype.projects.items.map(({ href }) => href));
  expect(tiles.map((a) => a.querySelector('img').getAttribute('src'))).toEqual(prototype.projects.items.map(({ image }) => PROJECT_THUMBS[image].src));
  expect(screen.getByRole('link', { name: prototype.projects.headLink.label })).toHaveAttribute('href', prototype.projects.headLink.href);
});

test('the front page rows fold like the draft', () => {
  render(<App />);
  ROWS().forEach(({ name }) => expect(rowButton(name)).toHaveAttribute('aria-expanded', 'false'));
  expect(document.querySelectorAll('[inert]')).toHaveLength(ROWS().length);
});

// The day the owner publishes an essay, it shows on the front page at /writing;
// a draft never does.
test('the front page lists published essays only, linked under /writing', () => {
  render(<App essays={[LIVE_ESSAY, DRAFT_ESSAY]} />);
  const heading = screen.getByRole('heading', { name: prototype.essays.heading });
  expect(heading.querySelector('a')).toHaveAttribute('href', '/writing');
  expect(screen.getByRole('link', { name: LIVE_ESSAY.title })).toHaveAttribute('href', '/writing/live');
  expect(screen.queryByText(DRAFT_ESSAY.title)).toBeNull();
  expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
});

test('shelved AI rows do not render', () => {
  expect(shelved.ai.length).toBeGreaterThan(0);
  render(<App />);
  // The live rows do render, so the check below is not vacuous.
  prototype.aiWork.items.forEach(({ name }) => expect(screen.getByRole('link', { name })).toBeInTheDocument());
  shelved.ai.forEach(({ title, href }) => {
    expect(screen.queryByText(title)).not.toBeInTheDocument();
    expect(document.querySelector(`a[href="${href}"]`)).toBeNull();
  });
});

// ---- The prototype at the hidden path -------------------------------------

test('the prototype path is unguessable, served by its own rules and published nowhere', () => {
  expect(PREVIEW_PATH).toMatch(/^\/[a-z0-9]{32}$/);
  // The path itself, the draft essays and the AI portfolio under it, and the app for any /writing
  // path the build wrote no page for.
  expect(read('public', '_redirects').trim().split('\n')).toEqual([
    '/airesume    https://library.ihsan.cc/p/HJ_OcIicMe1DrL_-tcArV8pt31HHd_oz    302',
    '/hwresume    https://library.ihsan.cc/p/LbEFG8VoyJBO8bhkpaexDsIKFWM_Oa_d    302',
    '/hwportfolio    /images/Ihsan_Salari_Portfolio.pdf    302',
    '/portfolio    /hwportfolio    302',
    `${PREVIEW_PATH}    /index.html    200`,
    `${PREVIEW_PATH}/writing    /index.html    200`,
    `${PREVIEW_PATH}/aiportfolio    /index.html    200`,
    `${PREVIEW_PATH}/writing/*    /index.html    200`,
    '/writing/*    /index.html    200',
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

  // Any other path, including one a character short, is the front page: no
  // documents, and no noindex.
  window.history.pushState({}, '', PREVIEW_PATH.slice(0, -1));
  const front = render(<App />);
  expect(front.container.querySelector('.pv-proto')).not.toBeNull();
  expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
  front.unmount();
});

// The owner's photos sit in the margins of the front page and the draft. Each is a
// small web copy that exists in public/, lazy, sized so nothing shifts as it loads,
// and described.
test('the side photos are on the front page and the draft, lazy, sized and described', () => {
  const all = [...SIDE_PHOTOS.left, ...SIDE_PHOTOS.right];
  expect(all.length).toBeGreaterThan(0);

  const front = render(<App />);
  expect(front.container.querySelector('main')).toHaveClass('pv-proto--photos');
  expect(front.container.querySelectorAll('.pv-side')).toHaveLength(2);
  [...all, ...SIDE_PHOTOS.strip].forEach(({ src }) => expect(front.container.querySelector(`img[src="${src}"]`)).not.toBeNull());
  front.unmount();

  window.history.pushState({}, '', PREVIEW_PATH);
  const { container } = render(<App />);
  expect(container.querySelector('main')).toHaveClass('pv-proto--photos');
  ['left', 'right'].forEach((side) => {
    const imgs = [...container.querySelectorAll(`.pv-side--${side} img`)];
    expect(imgs.map((img) => img.getAttribute('src'))).toEqual(SIDE_PHOTOS[side].map(({ src }) => src));
  });
  // The phone strip sits between the links bar and the name, in its own order.
  const strip = container.querySelector('.pv-strip');
  expect(strip.previousElementSibling).toHaveClass('pv-links');
  expect(strip.nextElementSibling).toHaveClass('pv-intro');
  const stripImgs = [...strip.querySelectorAll('img')];
  expect(stripImgs.map((img) => img.getAttribute('src'))).toEqual(SIDE_PHOTOS.strip.map(({ src }) => src));
  stripImgs.forEach((img, i) => {
    const { width, height, alt } = SIDE_PHOTOS.strip[i];
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img).toHaveAttribute('width', String(width));
    expect(img).toHaveAttribute('height', String(height));
    expect(img).toHaveAttribute('alt', alt);
    expect(img.classList.contains('pv-strip__img--tall')).toBe(height > width);
  });
  all.forEach(({ src, alt, width, height }) => {
    const img = container.querySelector(`.pv-side img[src="${src}"]`);
    expect(src).toMatch(/^\/images\/side\/[a-z0-9-]+\.webp$/);
    const file = path.join(__dirname, '..', 'public', src);
    expect(fs.existsSync(file)).toBe(true);
    expect(fs.statSync(file).size).toBeLessThanOrEqual(150 * 1024);
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img).toHaveAttribute('width', String(width));
    expect(img).toHaveAttribute('height', String(height));
    expect(Math.max(width, height)).toBeLessThanOrEqual(900);
    expect(alt.length).toBeGreaterThan(10);
    expect(img).toHaveAttribute('alt', alt);
    expect(img.classList.contains('pv-side__img--tall')).toBe(height > width);
  });
});

const ONE_ESSAY =[{ slug: 'a', title: 'First', summary: 'the one.', date: '2026-09-01' }];

test('the prototype puts a result under every experience row and AI project', () => {
  window.history.pushState({}, '', PREVIEW_PATH);
  render(<Prototype essays={ONE_ESSAY} />);
  // A heading with documents beside it reads "AI work Overview"; one still
  // waiting for its link says why.
  const doc = ({ label, pending }) => (pending ? `${label} (${pending})` : label);
  const withLink = ({ heading, headLink, docs }) =>
    [heading, ...(headLink ? [headLink.label + (headLink.arrow ? '\u2197' : '')] : []), ...(docs || []).map(doc)].join(' ');
  expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
    withLink(prototype.aiWork),
    withLink(prototype.experience),
    prototype.essays.heading,
    withLink(prototype.projects),
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
  const names = [...container.querySelectorAll('.pv-block:nth-of-type(1) .pv-entry .pv-strong')];
  expect(names.map((n) => n.firstChild.textContent)).toEqual(prototype.aiWork.items.map(({ name }) => name));

  // Every AI name links its GitHub repo.
  prototype.aiWork.items.forEach(({ name, href }) => {
    expect(screen.getByRole('link', { name })).toHaveAttribute('href', href);
    expect(href).toMatch(/^https:\/\/github\.com\/ihsan-sa\//);
  });
});

test('the draft names each document by what it is, beside its heading, with no page count', () => {
  window.history.pushState({}, '', PREVIEW_PATH);
  const { container } = render(<App />);
  // The résumés are short addresses that redirect to the library's pinned links.
  expect(screen.getByRole('link', { name: 'AI résumé' })).toHaveAttribute('href', '/airesume');
  expect(screen.getByRole('link', { name: 'HW résumé' })).toHaveAttribute('href', '/hwresume');
  const aiHead = screen.getByRole('heading', { name: new RegExp(`^${prototype.aiWork.heading}`) });
  // AI work is a plain heading: no documents, no links beside it.
  expect(prototype.aiWork.docs).toBeUndefined();
  expect(aiHead).toHaveTextContent(/^AI work$/);
  expect(aiHead.querySelector('a, .pv-pending')).toBeNull();
  expect(screen.getByRole('link', { name: 'Hardware portfolio' }).closest('h2')).toHaveTextContent(prototype.projects.heading);
  expect(container.querySelector('main').textContent).not.toMatch(/\bPDF, \d+ pages?\b/);
  expect(container.querySelector('main').textContent).not.toMatch(/\d+ pages?\b/);
});

test('each AI row has a subtitle under its head line, outside the fold; essays and Hardware portfolio arrows', () => {
  window.history.pushState({}, '', PREVIEW_PATH);
  const { container } = render(<App essays={ONE_ESSAY} />);
  prototype.aiWork.items.forEach(({ name, sub }) => {
    expect(sub).toBeTruthy();
    const p = screen.getByText(sub);
    expect(p).toHaveClass('pv-entry__sub');
    expect(p.tagName).toBe('P');
    expect(p.previousElementSibling).toHaveClass('pv-entry__head');
    expect(p.previousElementSibling).toHaveTextContent(name);
    expect(p.closest('.pv-fold')).toBeNull();
  });
  expect(container.querySelectorAll('.pv-entry__sub').length).toBe(prototype.aiWork.items.length);
  // Hardware portfolio ends in the aria-hidden arrow; an essay title does not.
  const hw = screen.getByRole('link', { name: /Hardware portfolio/ });
  expect(hw.querySelector('.pv-name-link__out[aria-hidden="true"]')).not.toBeNull();
  const essay = container.querySelector('.pv-name-link:not(.pv-name-link--out)');
  expect(essay).not.toBeNull();
  expect(essay.querySelector('.pv-name-link__out')).toBeNull();
});

test('the prototype links bar: email and contact card beside the switch, then Essays and the profiles', () => {
  window.history.pushState({}, '', PREVIEW_PATH);
  render(<Prototype essays={ONE_ESSAY} />);
  const nav = screen.getByRole('navigation', { name: /contact and profiles/i });
  const [first, second] = nav.querySelectorAll(':scope > span');
  expect([...first.querySelectorAll('a')].map((a) => a.textContent)).toEqual([prototype.email, prototype.contactCard.label]);
  const card = screen.getByRole('link', { name: prototype.contactCard.label });
  expect(card).toHaveAttribute('download');
  expect(card).toHaveAttribute('href', prototype.contactCard.href);
  expect(first).toContainElement(screen.getByRole('switch', { name: 'Dark theme' }));
  expect([...second.querySelectorAll('a')].map((a) => a.textContent)).toEqual([
    prototype.essays.heading, ...prototype.links.map(({ label }) => label)]);
  expect(document.querySelector('.pv-foot')).toBeNull();
});

test('with no essays the prototype shows neither the Essays link nor its section', () => {
  window.history.pushState({}, '', PREVIEW_PATH);
  render(<Prototype essays={[]} />);
  expect(screen.queryByRole('link', { name: prototype.essays.heading })).toBeNull();
  expect(screen.queryByRole('heading', { name: prototype.essays.heading })).toBeNull();
  expect(screen.getByRole('link', { name: prototype.links[0].label })).toBeInTheDocument();
});

test('the prototype theme switch says whether dark is on and persists the choice', () => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  window.history.pushState({}, '', PREVIEW_PATH);
  render(<App />);
  const sw = screen.getByRole('switch', { name: 'Dark theme' });
  expect(sw).toHaveAttribute('aria-checked', 'false');
  fireEvent.click(sw);
  expect(sw).toHaveAttribute('aria-checked', 'true');
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  expect(localStorage.getItem('ihsan-theme')).toBe('dark');
  document.documentElement.removeAttribute('data-theme');
  localStorage.clear();
});

test('a prototype row with a short text carries both, and the fold opens on its result alone', () => {
  window.history.pushState({}, '', PREVIEW_PATH);
  render(<App />);
  ROWS().filter(({ short }) => short).forEach(({ name, text, short }) => {
    const head = rowButton(name).closest('.pv-entry__head');
    expect(head.querySelector('.pv-t-long')).toHaveTextContent(`, ${text}`);
    expect(head.querySelector('.pv-t-short')).toHaveTextContent(`, ${short}`);
    expect(rowPanel(name).querySelector('.pv-fold__long')).toBeNull();
    expect(rowPanel(name)).not.toHaveTextContent(text);
  });
  expect(ROWS().filter(({ short }) => short).length).toBeGreaterThan(0);
});

test('a prototype row shows its place and date in italics after the full text, not on a phone', () => {
  window.history.pushState({}, '', PREVIEW_PATH);
  render(<App />);
  const withWhere = ROWS().filter(({ where }) => where);
  withWhere.forEach(({ name, text, where }) => {
    const head = rowButton(name).closest('.pv-entry__head');
    expect(head.querySelector('.pv-t-long').textContent).toBe(`, ${text}, ${where}`);
    expect(head.querySelector('.pv-t-long em')).toHaveTextContent(where);
    expect(head.querySelector('.pv-t-short em')).toBeNull();
  });
  expect(withWhere.length).toBeGreaterThan(0);
  // A row without one has no italic part.
  ROWS().filter(({ where }) => !where).forEach(({ name }) => {
    expect(rowButton(name).closest('.pv-entry__head').querySelector('em')).toBeNull();
  });
});

test('the prototype lists each essay newest first, linked, with its month', () => {
  window.history.pushState({}, '', PREVIEW_PATH);
  const essays = [
    { slug: 'b', title: 'Second', blurb: 'the newer one.', summary: 'S.', date: '2026-10-02' },
    { slug: 'a', title: 'First', summary: 'the older one.', date: '2026-09-01' },
  ];
  render(<Prototype essays={essays} />);
  const heading = screen.getByRole('heading', { name: prototype.essays.heading });
  expect(heading.querySelector('a')).toHaveAttribute('href', `${PREVIEW_PATH}/writing`);
  const rows = [...heading.closest('section').querySelectorAll('p')].map((p) => p.textContent);
  expect(rows).toEqual(['Second, the newer one. October ’26.', 'First, the older one. September ’26.']);
  expect(screen.getByRole('link', { name: 'Second' })).toHaveAttribute('href', `${PREVIEW_PATH}/writing/b`);
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

// ---- Folded rows on the prototype ------------------------------------------

const ROWS = () => [...prototype.experience.items, ...prototype.aiWork.items];
const rowButton = (name) => screen.getByRole('button', { name: `More about ${name}` });
const rowPanel = (name) => document.getElementById(rowButton(name).getAttribute('aria-controls'));

test('every experience and AI row starts folded to its one line; sections and projects stay open', () => {
  window.history.pushState({}, '', PREVIEW_PATH);
  render(<App />);
  ROWS().forEach(({ name, text, result }) => {
    const button = rowButton(name);
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    // The one line holds the name, the short description and the toggle.
    const head = button.closest('.pv-entry__head');
    expect(head).toHaveTextContent(name);
    expect(head).toHaveTextContent(text);
    expect(head.closest('[inert]')).toBeNull();
    // The rest sits in the folded panel.
    const panel = rowPanel(name);
    expect(panel).toHaveAttribute('inert');
    expect(panel).toContainElement(screen.getByText(result));
  });
  // Only the rows fold: headings, the project grid, the links and the card do not.
  expect(document.querySelectorAll('[inert]')).toHaveLength(ROWS().length);
  expect(document.querySelectorAll('h2 button')).toHaveLength(0);
  const tile = screen.getByText('Lorentz E&M solver').closest('a');
  const nav = screen.getByRole('navigation', { name: /contact and profiles/i });
  const card = screen.getByRole('link', { name: prototype.contactCard.label });
  [tile, nav, card].forEach((el) => expect(el.closest('[inert]')).toBeNull());
});

test('a click opens one prototype row and a second click folds it again', () => {
  window.history.pushState({}, '', PREVIEW_PATH);
  render(<App />);
  const [first, ...others] = ROWS();
  fireEvent.click(rowButton(first.name));
  expect(rowButton(first.name)).toHaveAttribute('aria-expanded', 'true');
  expect(rowPanel(first.name)).not.toHaveAttribute('inert');
  others.forEach(({ name }) => {
    expect(rowButton(name)).toHaveAttribute('aria-expanded', 'false');
    expect(rowPanel(name)).toHaveAttribute('inert');
  });
  fireEvent.click(rowButton(first.name));
  expect(rowButton(first.name)).toHaveAttribute('aria-expanded', 'false');
  expect(rowPanel(first.name)).toHaveAttribute('inert');
});

test('the name link on a folded row stays a link and does not toggle the row', () => {
  window.history.pushState({}, '', PREVIEW_PATH);
  render(<App />);
  const link = screen.getByRole('link', { name: 'lesson-builder' });
  expect(link).toHaveAttribute('href', 'https://github.com/ihsan-sa/lesson-builder');
  expect(link.closest('[inert]')).toBeNull();
  fireEvent.click(link);
  expect(rowButton('lesson-builder')).toHaveAttribute('aria-expanded', 'false');
});

// ---- The draft reworked for outreach -----------------------------------------
// Everything below is on the draft only, until the owner moves the whole draft to
// the front page in one step.

const AUTOBOX_ESSAY = {
  slug: 'autobox', title: 'Autobox', summary: 'how I built it.', standfirst: 'How I built Autobox.', date: '2026-09-30', draft: true,
};
const h2s = () => screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);

test('the draft puts AI work above Experience', () => {
  window.history.pushState({}, '', PREVIEW_PATH);
  render(<App />);
  const headings = h2s();
  const ai = headings.findIndex((h) => h.startsWith(prototype.aiWork.heading));
  const exp = headings.findIndex((h) => h.startsWith(prototype.experience.heading));
  expect(ai).toBe(0);
  expect(exp).toBe(1);
  // Experience keeps its folded one-line rows.
  prototype.experience.items.forEach(({ name }) => expect(rowButton(name)).toHaveAttribute('aria-expanded', 'false'));
});

test('the front page is the draft: AI work first, the banner to the published essay, Show more and the row visuals, but no documents', () => {
  const { container } = render(<App essays={[{ ...AUTOBOX_ESSAY, draft: false }]} />);
  expect(h2s()).toEqual([
    prototype.aiWork.heading,
    prototype.experience.heading,
    prototype.essays.heading,
    `${prototype.projects.heading} ${prototype.projects.headLink.label}\u2197`,
  ]);
  const banner = container.querySelector('a.pv-banner');
  expect(banner).toHaveAttribute('href', '/writing/autobox');
  expect(banner.querySelector('img.pv-banner__video')).toHaveAttribute('src', ESSAY_BANNER.gif);
  expect(screen.getByRole('button', { name: prototype.aboutFold.more })).toHaveAttribute('aria-expanded', 'false');
  expect(container.querySelector('.pv-docs, .pv-pending, .pv-start, .pv-doc')).toBeNull();
  // Each AI row still opens on its clip, and on its diagram where it has one.
  prototype.aiWork.items.forEach(({ name, visual, figure }) => {
    if (visual) expect(rowPanel(name).querySelector('.pv-visual img')).toHaveAttribute('src', visual.src);
    if (figure) expect(rowPanel(name).querySelector('.pv-figure img')).toHaveAttribute('src', figure.image);
  });
  expect(container.innerHTML).not.toContain(PREVIEW_PATH);
  // Every row's fold still holds its result, so none opens on nothing.
  ROWS().forEach(({ name, result }) => expect(rowPanel(name)).toHaveTextContent(result));
});

test('the draft banner shows the essay clip as a lazy, sized GIF, and links the draft essay', () => {
  window.history.pushState({}, '', PREVIEW_PATH);
  const { container } = render(<Prototype essays={[AUTOBOX_ESSAY]} />);
  const banner = container.querySelector('a.pv-banner');
  expect(banner).toHaveAttribute('href', `${PREVIEW_PATH}/writing/autobox`);
  expect(banner.previousElementSibling).toHaveClass('pv-intro');
  expect(banner.nextElementSibling.tagName).toBe('SECTION');
  expect(banner).toHaveTextContent(prototype.essays.banner);
  expect(banner).toHaveTextContent(AUTOBOX_ESSAY.title);
  expect(banner).toHaveTextContent(AUTOBOX_ESSAY.standfirst);
  // A GIF, never a <video>: a GIF autoplays where Low Power Mode refuses muted video.
  expect(banner.querySelector('video')).toBeNull();
  const picture = banner.querySelector('picture.pv-banner__media');
  const img = picture.querySelector('img.pv-banner__video');
  expect(img).toHaveAttribute('src', ESSAY_BANNER.gif);
  expect(ESSAY_BANNER.gif).toMatch(/\.webp$/);
  expect(img).toHaveAttribute('loading', 'lazy');
  expect(img).toHaveAttribute('decoding', 'async');
  expect(img).toHaveAttribute('width', String(ESSAY_BANNER.width));
  expect(img).toHaveAttribute('height', String(ESSAY_BANNER.height));
  expect(ESSAY_BANNER.width / ESSAY_BANNER.height).toBeCloseTo(16 / 9, 2);
  // Decorative: the link's text names the essay.
  expect(img).toHaveAttribute('alt', '');
  // With reduced motion asked for, the still poster stands in and the GIF never loads.
  const sources = picture.querySelectorAll('source');
  expect(sources).toHaveLength(1);
  expect(sources[0]).toHaveAttribute('media', '(prefers-reduced-motion: reduce)');
  expect(sources[0]).toHaveAttribute('srcset', ESSAY_BANNER.poster);
  expect(picture.lastElementChild).toBe(img);
  // The poster is also the <img>'s background, so it shows until the GIF loads.
  expect(img.style.backgroundImage).toBe(`url(${ESSAY_BANNER.poster})`);
  expect(img.style.backgroundSize).toBe('cover');
  // The GIF and its light poster ship with the site.
  [ESSAY_BANNER.gif, ESSAY_BANNER.poster].forEach((src) =>
    expect(fs.existsSync(path.join(__dirname, '..', 'public', src))).toBe(true));
  expect(ESSAY_BANNER.poster).toMatch(/\.webp$/);
  expect(fs.statSync(path.join(__dirname, '..', 'public', ESSAY_BANNER.poster)).size).toBeLessThanOrEqual(60 * 1024);
  expect(fs.statSync(path.join(__dirname, '..', 'public', ESSAY_BANNER.gif)).size).toBeLessThanOrEqual(4 * 1024 * 1024);
});

test('with no Autobox essay the draft shows no banner', () => {
  window.history.pushState({}, '', PREVIEW_PATH);
  const { container } = render(<Prototype essays={ONE_ESSAY} />);
  expect(container.querySelector('.pv-banner')).toBeNull();
});

test('the draft about folds behind a Show more button that says whether it is open', () => {
  window.history.pushState({}, '', PREVIEW_PATH);
  const { container } = render(<App />);
  const button = screen.getByRole('button', { name: prototype.aboutFold.more });
  expect(button).toHaveAttribute('type', 'button');
  expect(button).toHaveAttribute('aria-expanded', 'false');
  const about = document.getElementById(button.getAttribute('aria-controls'));
  expect(about).toHaveClass('pv-about');
  expect(about).not.toHaveClass('pv-about--open');
  // The subtitle stays out, above the fold; the about paragraphs are in it.
  expect(about.previousElementSibling).toHaveTextContent(prototype.subtitle);
  prototype.about.forEach((t) => expect(about).toContainElement(screen.getByText(t)));
  expect(container.querySelector('.pv-intro')).toContainElement(button);
  fireEvent.click(button);
  expect(button).toHaveAttribute('aria-expanded', 'true');
  expect(button).toHaveTextContent(prototype.aboutFold.less);
  expect(about).toHaveClass('pv-about--open');
  fireEvent.click(button);
  expect(button).toHaveAttribute('aria-expanded', 'false');
  expect(about).not.toHaveClass('pv-about--open');
  // Folded, the text is display: none (all of it on a phone, all but the first
  // paragraph on desktop), so neither tabbable nor read out; the button shows at every width.
  const css = read('src', 'Preview.css');
  const phone = css.match(/@media \(max-width: 640px\) \{\n {2}\.pv-proto \.pv-about:not\(\.pv-about--open\) \{ display: none; \}/);
  expect(phone).not.toBeNull();
  expect(css).toMatch(/^\.pv-proto \.pv-about:not\(\.pv-about--open\) > p:nth-child\(n\+2\) \{ display: none; \}$/m);
  expect(css).not.toMatch(/\.pv-about__btn \{ display: none; \}/);
});

// Text first: every image on the draft waits until it nears the screen, holds its box
// from the first paint, and decodes off the main thread. None is eager; the only
// thing fetched up front is the banner's small poster (App.js, imgProps).
test('every image on the draft is lazy, sized and decoded off the main thread', () => {
  window.history.pushState({}, '', PREVIEW_PATH);
  const { container } = render(<App />);
  const imgs = [...container.querySelectorAll('img')];
  expect(imgs.length).toBeGreaterThan(SIDE_PHOTOS.strip.length + prototype.projects.items.length);
  imgs.forEach((img) => {
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img).toHaveAttribute('decoding', 'async');
    expect(Number(img.getAttribute('width'))).toBeGreaterThan(0);
    expect(Number(img.getAttribute('height'))).toBeGreaterThan(0);
  });
  // The project tiles show their small web copies, each one on disk and light.
  const tiles = [...container.querySelectorAll('.pv-hw__img')];
  expect(tiles.map((t) => t.getAttribute('src'))).toEqual(prototype.projects.items.map(({ image }) => PROJECT_THUMBS[image].src));
  Object.values(PROJECT_THUMBS).forEach(({ src }) => {
    const file = path.join(__dirname, '..', 'public', src);
    expect(fs.statSync(file).size).toBeLessThanOrEqual(80 * 1024);
  });
  // Every placeholder fill follows the theme.
  const css = read('src', 'Preview.css');
  ['.pv-hw__img', '.pv-side__img', '.pv-strip__img', '.pv-proto .pv-visual img', '.pv-proto .pv-banner__video'].forEach((sel) => {
    const rule = css.slice(css.indexOf(`${sel} {`));
    expect(rule.slice(0, rule.indexOf('}'))).toContain('background: var(--thumb-bg)');
  });
});

test('the front page shows the small project images, lazy and sized', () => {
  const { container } = render(<App essays={[]} />);
  const tiles = [...container.querySelectorAll('.pv-hw__img')];
  expect(tiles.length).toBe(prototype.projects.items.length);
  tiles.forEach((t) => {
    expect(t).toHaveAttribute('loading', 'lazy');
    expect(t).toHaveAttribute('width');
  });
});

test('every AI row opens on a light GIF clip, lazy and sized, its poster under reduced motion and its video a click away', () => {
  window.history.pushState({}, '', PREVIEW_PATH);
  render(<App />);
  const pub = (src) => path.join(__dirname, '..', 'public', src);
  prototype.aiWork.items.filter(({ visual }) => visual).forEach(({ name, visual }) => {
    const img = rowPanel(name).querySelector('.pv-visual picture > img');
    expect(img).toHaveAttribute('src', visual.src);
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img.style.backgroundImage).toBe(`url(${visual.poster})`);
    // The GIF's own pixel size, so the box is right before it loads.
    expect(visual.src).toMatch(/\.webp$/);
    expect(rasterSize(pub(visual.src))).toEqual({ width: visual.width, height: visual.height });
    expect(img).toHaveAttribute('width', String(visual.width));
    expect(img).toHaveAttribute('height', String(visual.height));
    expect(visual.alt.length).toBeGreaterThan(20);
    expect(img).toHaveAttribute('alt', visual.alt);
    // Light enough for a fold the owner opens on a phone.
    expect(fs.statSync(pub(visual.src)).size).toBeLessThanOrEqual(3.5 * 1024 * 1024);
    // Under reduced motion the still poster stands in, at the clip's shape.
    const source = img.previousElementSibling;
    expect(source.tagName).toBe('SOURCE');
    expect(source).toHaveAttribute('media', '(prefers-reduced-motion: reduce)');
    expect(source).toHaveAttribute('srcset', visual.poster);
    const still = rasterSize(pub(visual.poster));
    expect(still.width / still.height).toBeCloseTo(visual.width / visual.height, 2);
    expect(fs.statSync(pub(visual.poster)).size).toBeLessThanOrEqual(200 * 1024);
    // A click plays the .mp4 full size (zoom.js); without the script the link opens it.
    const link = img.closest('a');
    expect(link).toHaveClass('wr-figure__zoom');
    expect(link).toHaveAttribute('href', visual.video);
    expect(link).toHaveAttribute('data-video', visual.video);
    expect(fs.existsSync(pub(visual.video))).toBe(true);
  });
  // Experience rows carry none.
  prototype.experience.items.forEach(({ name, visual }) => {
    expect(visual).toBeUndefined();
    expect(rowPanel(name).querySelector('.pv-visual')).toBeNull();
  });
});

test('the autobox row has no clip, but keeps its diagram', () => {
  window.history.pushState({}, '', PREVIEW_PATH);
  render(<App />);
  const item = prototype.aiWork.items.find((i) => i.name === 'autobox');
  expect(item.visual).toBeUndefined();
  expect(rowPanel('autobox').querySelector('.pv-visual')).toBeNull();
  expect(rowPanel('autobox').querySelector('.pv-figure img')).toHaveAttribute('src', item.figure.image);
});

test('a row name that links out ends in a hidden arrow, and an essay title does not', () => {
  const { container } = render(<App essays={[{ slug: 'x', title: 'An essay', blurb: 'B.', date: '2026-09-01' }]} />);
  const names = [...container.querySelectorAll('.pv-entry__head a.pv-name-link')];
  expect(names.length).toBeGreaterThan(0);
  names.forEach((a) => {
    expect(a).toHaveClass('pv-name-link--out');
    const arrow = a.querySelector('span[aria-hidden="true"]');
    expect(arrow.textContent).toBe('\u2197');
  });
  const essay = screen.getByRole('link', { name: 'An essay' });
  expect(essay).toHaveClass('pv-name-link');
  expect(essay).not.toHaveClass('pv-name-link--out');
  expect(essay.querySelector('span')).toBeNull();
});

test('the autobox fold ends with a note that links to the essay', () => {
  const { container } = render(<App essays={[]} />);
  const note = rowPanel('autobox').querySelector('.pv-fold__inner > .pv-note:last-child');
  expect(note.textContent).toBe('For more details, read the essay');
  expect(note.querySelector('a')).toHaveAttribute('href', '/writing/autobox');
  expect(container.querySelectorAll('.pv-note').length).toBe(1);
});

test('a visual with no poster or video is a plain sized image, no link', () => {
  const { container } = render(<RowVisual visual={{ src: '/a.webp', width: 4, height: 3, alt: 'A plain still.', caption: 'Cap.' }} />);
  const img = container.querySelector('figure.pv-visual > img');
  expect(img).toHaveAttribute('src', '/a.webp');
  expect(img).toHaveAttribute('width', '4');
  expect(img).toHaveAttribute('loading', 'lazy');
  expect(container.querySelector('picture, a')).toBeNull();
  expect(container.querySelector('figcaption')).toHaveTextContent('Cap.');
});

test('a click on a row clip plays its video full size', () => {
  window.history.pushState({}, '', PREVIEW_PATH);
  render(<App />);
  const { name, visual } = prototype.aiWork.items[0];
  fireEvent.click(rowButton(name));
  fireEvent.click(rowPanel(name).querySelector('.pv-visual__zoom'));
  const dialog = screen.getByRole('dialog');
  expect(dialog).toHaveAttribute('aria-label', visual.alt);
  expect(dialog.querySelector('video')).toHaveAttribute('src', visual.video);
  fireEvent.keyDown(document.activeElement, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).toBeNull();
});

test('a row diagram is sized, so opening the row does not jump', () => {
  window.history.pushState({}, '', PREVIEW_PATH);
  render(<App />);
  const withFigure = prototype.aiWork.items.filter((i) => i.figure);
  expect(withFigure.length).toBeGreaterThan(0);
  withFigure.forEach(({ name, figure }) => {
    const img = rowPanel(name).querySelector('.pv-figure img');
    expect(img).toHaveAttribute('width', String(figure.width));
    expect(img).toHaveAttribute('height', String(figure.height));
    expect(img).toHaveAttribute('alt', figure.alt);
    expect(fs.existsSync(path.join(__dirname, '..', 'public', figure.image))).toBe(true);
  });
  const css = read('src', 'Preview.css');
  const rule = css.slice(css.indexOf('.pv-proto .pv-figure img {'));
  expect(rule.slice(0, rule.indexOf('}'))).toContain('height: auto');
});

test('the Autobox essay is published with the owner\'s OK and carries its standfirst', () => {
  const md = read('content', 'writing', 'autobox.md');
  const front = md.match(/^---\n([\s\S]*?)\n---\n/)[1];
  expect(front).not.toMatch(/^draft: true$/m);
  expect(front).toMatch(/^approved_by: Ihsan$/m);
  expect(front).toContain('standfirst: "How I built Autobox, the AI agents on a small home server that run my projects, and how I use it."');
});

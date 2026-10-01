import { fireEvent, render, screen } from '@testing-library/react';
import fs from 'fs';
import path from 'path';
import App, { PREVIEW_PATH, Prototype } from './App';
import content from './content.json';
import shelved from './content.shelved.json';
import { SIDE_PHOTOS } from './sidePhotos';

beforeEach(() => {
  document.documentElement.removeAttribute('data-theme');
  localStorage.clear();
  window.history.pushState({}, '', '/');
});

const { prototype } = content;
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
  const withLink = ({ heading, headLink }) => (headLink ? `${heading} ${headLink.label}` : heading);
  expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
    prototype.experience.heading,
    prototype.aiWork.heading,
    withLink(prototype.projects),
  ]);
  [prototype.name, prototype.subtitle, ...prototype.about].forEach((t) => expect(screen.getByText(t)).toBeInTheDocument());
  [...prototype.experience.items, ...prototype.aiWork.items].forEach(({ name, result }) => {
    expect(screen.getAllByText(name).length).toBeGreaterThan(0);
    expect(screen.getByText(result)).toBeInTheDocument();
  });
  // No documents: the ones the draft shows beside AI work are gone.
  expect(prototype.aiWork.docs.length).toBeGreaterThan(0);
  prototype.aiWork.docs.forEach(({ label, href }) => {
    expect(container.textContent).not.toContain(label);
    if (href) expect(container.querySelector(`a[href="${href}"]`)).toBeNull();
  });
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

test('the front page project tiles keep their links and photos exactly as content.json has them', () => {
  const { container } = render(<App />);
  const tiles = [...container.querySelectorAll('.pv-hw__item')];
  expect(tiles.map((a) => a.getAttribute('href'))).toEqual(prototype.projects.items.map(({ href }) => href));
  expect(tiles.map((a) => a.querySelector('img').getAttribute('src'))).toEqual(prototype.projects.items.map(({ image }) => image));
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
  // The path itself, the draft essays under it, and the app for any /writing
  // path the build wrote no page for.
  expect(read('public', '_redirects').trim().split('\n')).toEqual([
    '/airesume    https://library.ihsan.cc/p/HJ_OcIicMe1DrL_-tcArV8pt31HHd_oz    302',
    '/hwresume    https://library.ihsan.cc/p/LbEFG8VoyJBO8bhkpaexDsIKFWM_Oa_d    302',
    '/hwportfolio    /images/Ihsan_Salari_Portfolio.pdf    302',
    '/portfolio    /hwportfolio    302',
    `${PREVIEW_PATH}    /index.html    200`,
    `${PREVIEW_PATH}/writing    /index.html    200`,
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
  expect(container.querySelector(`a[href="${prototype.aiWork.docs[1].href}"]`)).not.toBeNull();
  unmount();
  expect(document.head.querySelector('meta[name="robots"]')).toBeNull();

  // Any other path, including one a character short, is the front page: no
  // documents, and no noindex.
  window.history.pushState({}, '', PREVIEW_PATH.slice(0, -1));
  const front = render(<App />);
  expect(front.container.querySelector('.pv-proto')).not.toBeNull();
  expect(front.container.querySelector(`a[href="${prototype.aiWork.docs[1].href}"]`)).toBeNull();
  expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
  front.unmount();
});

// The owner's photos sit in the margins of the draft only, until he approves
// them for ihsan.cc/. Each is a small web copy that exists in public/, lazy, sized
// so nothing shifts as it loads, and described.
test('the side photos are on the draft only, lazy, sized and described', () => {
  const all = [...SIDE_PHOTOS.left, ...SIDE_PHOTOS.right];
  expect(all.length).toBeGreaterThan(0);

  const front = render(<App />);
  expect(front.container.querySelector('.pv-side, .pv-side__img, .pv-strip, .pv-strip__img')).toBeNull();
  expect(front.container.querySelector('main')).not.toHaveClass('pv-proto--photos');
  [...all, ...SIDE_PHOTOS.strip].forEach(({ src }) => expect(front.container.innerHTML).not.toContain(src));
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
    [heading, ...(headLink ? [headLink.label] : []), ...(docs || []).map(doc)].join(' ');
  expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
    withLink(prototype.experience),
    withLink(prototype.aiWork),
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
  const names = [...container.querySelectorAll('.pv-block:nth-of-type(2) .pv-entry .pv-strong')];
  expect(names.map((n) => n.textContent)).toEqual(prototype.aiWork.items.map(({ name }) => name));

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
  prototype.aiWork.docs.forEach(({ label, href, pending }) => {
    if (href) {
      const link = screen.getByRole('link', { name: label });
      expect(link).toHaveAttribute('href', href);
      expect(aiHead).toContainElement(link);
      // A local document ships with the site.
      if (href.startsWith('/docs/')) expect(read('public', href).startsWith('%PDF')).toBe(true);
    } else {
      // A spot still waiting for its link is text, not a link.
      const spot = screen.getByText(`${label} (${pending})`);
      expect(spot).toHaveClass('pv-pending');
      expect(spot.closest('a')).toBeNull();
      expect(aiHead).toContainElement(spot);
    }
  });
  expect(screen.getByRole('link', { name: 'Hardware portfolio' }).closest('h2')).toHaveTextContent(prototype.projects.heading);
  expect(container.querySelector('main').textContent).not.toMatch(/\bPDF, \d+ pages?\b/);
  expect(container.querySelector('main').textContent).not.toMatch(/\d+ pages?\b/);
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

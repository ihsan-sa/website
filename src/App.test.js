import { fireEvent, render, screen } from '@testing-library/react';
import App, { PREVIEW_PATH } from './App';
import content from './content.json';
import shelved from './content.shelved.json';

beforeEach(() => {
  document.documentElement.removeAttribute('data-theme');
  localStorage.clear();
  window.history.pushState({}, '', '/');
});

test('renders the name, subtitle and the contact email', () => {
  render(<App />);
  expect(screen.getByRole('heading', { level: 1, name: content.name })).toBeInTheDocument();
  expect(screen.getByText(content.subtitle)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: content.email })).toHaveAttribute(
    'href',
    `mailto:${content.email}`
  );
});

test('renders every experience entry and project from content.json', () => {
  render(<App />);

  content.experience.entries.forEach(({ org, role }) => {
    expect(screen.getByText(org)).toBeInTheDocument();
    expect(screen.getByText(role)).toBeInTheDocument();
  });

  // The card's accessible name is title + meta, so match the title node's anchor.
  content.projects.items.forEach(({ title, href }) => {
    expect(screen.getByText(title).closest('a')).toHaveAttribute('href', href);
  });
});

test('experience rows start collapsed and open independently', () => {
  render(<App />);

  // Every row is a <details>, whether or not it has points (none do today).
  const rows = content.experience.entries;
  expect(rows.length).toBeGreaterThan(1);

  const rowFor = (org) => screen.getByText(org).closest('details');

  rows.forEach(({ org }) => expect(rowFor(org)).not.toHaveAttribute('open'));

  // Opening one must not close any other — rows are independent.
  fireEvent.click(screen.getByText(rows[0].org));
  expect(rowFor(rows[0].org)).toHaveAttribute('open');

  fireEvent.click(screen.getByText(rows[1].org));
  expect(rowFor(rows[0].org)).toHaveAttribute('open');
  expect(rowFor(rows[1].org)).toHaveAttribute('open');
});

test('bio collapses everything past the fold until "See more"', () => {
  const { fold, paragraphs, moreLabel, lessLabel } = content.bio;
  expect(paragraphs.length).toBeGreaterThan(fold); // otherwise there is no toggle

  render(<App />);

  expect(screen.getByText(paragraphs[0])).toBeVisible();
  expect(screen.getByText(paragraphs[fold])).not.toBeVisible();

  fireEvent.click(screen.getByRole('button', { name: moreLabel }));
  expect(screen.getByText(paragraphs[fold])).toBeVisible();

  fireEvent.click(screen.getByRole('button', { name: lessLabel }));
  expect(screen.getByText(paragraphs[fold])).not.toBeVisible();
});

test('theme switch names its destination and persists the choice', () => {
  render(<App />);

  // No stored choice and a light OS preference (see setupTests.js).
  const toggle = screen.getByRole('switch', {
    name: new RegExp(`switch to ${content.theme.toDark} theme`, 'i'),
  });
  expect(toggle).toHaveAttribute('aria-checked', 'false');

  fireEvent.click(toggle);

  expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  expect(localStorage.getItem('ihsan-theme')).toBe('dark');
  expect(toggle).toHaveAttribute('aria-checked', 'true');
  expect(toggle).toHaveAccessibleName(
    new RegExp(`switch to ${content.theme.toLight} theme`, 'i')
  );

  fireEvent.click(toggle);

  expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  expect(localStorage.getItem('ihsan-theme')).toBe('light');
  expect(toggle).toHaveAttribute('aria-checked', 'false');
});

test('picks up a theme already applied to <html> before React mounted', () => {
  document.documentElement.setAttribute('data-theme', 'dark');
  render(<App />);

  const toggle = screen.getByRole('switch', {
    name: new RegExp(`switch to ${content.theme.toLight} theme`, 'i'),
  });
  expect(toggle).toHaveAttribute('aria-checked', 'true');
});

const { preview } = content;
const aiItems = preview.aiWork.items;
const aiDocs = aiItems.flatMap(({ docs }) => docs || []);

test('the index at / renders none of the preview and no noindex tag', () => {
  render(<App />);
  expect(screen.queryByRole('heading', { name: preview.aiWork.heading })).not.toBeInTheDocument();
  aiItems.forEach(({ href }) => expect(document.querySelector(`a[href="${href}"]`)).toBeNull());
  aiDocs.forEach(({ href }) => expect(document.querySelector(`a[href="${href}"]`)).toBeNull());
  expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
  // The index itself is untouched.
  expect(screen.getByRole('heading', { name: content.projects.heading })).toBeInTheDocument();
});

test('the preview renders links, intro, Experience, AI work and Hardware in that order', () => {
  window.history.pushState({}, '', PREVIEW_PATH);
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

  expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  unmount();
  expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
});

test('the preview links each AI name to GitHub, chip design flow to its PDF, plus the PDFs', () => {
  window.history.pushState({}, '', PREVIEW_PATH);
  render(<App />);

  const expected = {
    autobox: 'https://github.com/ihsan-sa/autobox',
    hwde: 'https://github.com/ihsan-sa/hwde',
    'lesson-builder': 'https://github.com/ihsan-sa/lesson-builder',
    'pdf-material-builder': 'https://github.com/ihsan-sa/pdf-material-builder',
    'Chip design flow': '/docs/chip-design-flow.pdf',
  };
  expect(aiItems.map(({ name }) => name).sort()).toEqual(Object.keys(expected).sort());
  Object.entries(expected).forEach(([name, href]) => {
    const link = screen.getByRole('link', { name });
    expect(link).toHaveAttribute('href', href);
    expect(link).toHaveAttribute('target', '_blank');
  });

  expect(aiDocs.map(({ label }) => label)).toEqual(['Pitch', 'Deeper look', 'Showcase']);
  aiDocs.forEach(({ label, href }) => {
    expect(screen.getByRole('link', { name: label })).toHaveAttribute('href', href);
  });
});

test('experience names link only where a real page exists', () => {
  window.history.pushState({}, '', PREVIEW_PATH);
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

test('the preview hardware grid has six tiles, no radar, each with its index image', () => {
  window.history.pushState({}, '', PREVIEW_PATH);
  const { container } = render(<App />);

  const tiles = container.querySelectorAll('.pv-hw a');
  expect(tiles).toHaveLength(6);
  tiles.forEach((tile) => expect(tile).not.toHaveTextContent(/radar/i));
  expect(container.querySelector('a[href*="FMCW_Radar"]')).toBeNull();

  preview.hardware.items.forEach(({ title, href, image }) => {
    const tile = screen.getByText(title).closest('a');
    expect(tile).toHaveAttribute('href', href);
    expect(href).toMatch(/^https:\/\/docs\.ihsan\.cc\//);
    // Same photo the index uses for that project.
    expect(content.projects.items.some((p) => p.href === href && p.image === image)).toBe(true);
    expect(tile.querySelector('img')).toHaveAttribute('src', image);
  });
});

test('the preview theme toggle names its destination and persists the choice', () => {
  window.history.pushState({}, '', PREVIEW_PATH);
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

test('shelved AI rows render on neither path', () => {
  expect(shelved.ai.length).toBeGreaterThan(0);
  [PREVIEW_PATH, '/'].forEach((path) => {
    window.history.pushState({}, '', path);
    const { unmount } = render(<App />);
    // The live rows do render on the preview, so the check below is not vacuous there.
    if (path === PREVIEW_PATH) {
      aiItems.forEach(({ name }) => expect(screen.getByText(name)).toBeInTheDocument());
    }
    shelved.ai.forEach(({ title, href }) => {
      expect(screen.queryByText(title)).not.toBeInTheDocument();
      expect(document.querySelector(`a[href="${href}"]`)).toBeNull();
    });
    unmount();
  });
});

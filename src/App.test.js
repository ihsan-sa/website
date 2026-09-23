import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';
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
    'pdf-material-builder': 'https://github.com/ihsan-sa/pdf-material-builder',
    'Chip design flow': '/docs/chip-design-flow.pdf',
  };
  expect(aiItems.map(({ name }) => name).sort()).toEqual(Object.keys(expected).sort());
  Object.entries(expected).forEach(([name, href]) => {
    const link = screen.getByRole('link', { name });
    expect(link).toHaveAttribute('href', href);
    expect(link).toHaveAttribute('target', '_blank');
  });

  expect(aiDocs.map(({ label }) => label)).toEqual(['Overview', 'Deeper look', 'Showcase']);
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

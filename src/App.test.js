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

test('the index at / does not render the AI section or a noindex tag', () => {
  render(<App />);
  expect(screen.queryByRole('heading', { name: content.ai.heading })).not.toBeInTheDocument();
  content.ai.items.forEach(({ title }) => expect(screen.queryByText(title)).not.toBeInTheDocument());
  expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
  // The index itself is untouched.
  expect(screen.getByRole('heading', { name: content.projects.heading })).toBeInTheDocument();
});

test('the preview path renders the AI section with every link opening in a new tab', () => {
  window.history.pushState({}, '', PREVIEW_PATH);
  const { unmount } = render(<App />);

  expect(screen.getByRole('heading', { level: 2, name: content.ai.heading })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: content.ai.link.label })).toHaveAttribute(
    'href',
    content.ai.link.href
  );

  content.ai.items.forEach(({ title, blurb, meta, href }) => {
    const link = screen.getByText(title).closest('a');
    expect(link).toHaveAttribute('href', href);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByText(blurb)).toBeInTheDocument();
    expect(screen.getByText(meta)).toBeInTheDocument();
  });

  // The rest of the page still renders around it.
  expect(screen.getByRole('heading', { level: 1, name: content.name })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: content.projects.heading })).toBeInTheDocument();

  expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  unmount();
  expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
});

// Every { label, href } listed under an AI row's optional `docs`.
const aiDocs = content.ai.items.flatMap(({ docs }) => docs || []);

test('the preview path renders every AI row doc link, opening in a new tab', () => {
  expect(aiDocs.length).toBeGreaterThan(0);
  window.history.pushState({}, '', PREVIEW_PATH);
  render(<App />);

  aiDocs.forEach(({ label, href }) => {
    const link = screen.getByRole('link', { name: label });
    expect(link).toHaveAttribute('href', href);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
});

test('the index at / renders none of the AI row doc links', () => {
  render(<App />);
  aiDocs.forEach(({ label, href }) => {
    expect(screen.queryByRole('link', { name: label })).not.toBeInTheDocument();
    expect(document.querySelector(`a[href="${href}"]`)).toBeNull();
  });
});

test('shelved AI rows render on neither path', () => {
  expect(shelved.ai.length).toBeGreaterThan(0);
  [PREVIEW_PATH, '/'].forEach((path) => {
    window.history.pushState({}, '', path);
    const { unmount } = render(<App />);
    // The live rows do render on the preview, so the check below is not vacuous there.
    if (path === PREVIEW_PATH) {
      content.ai.items.forEach(({ title }) => expect(screen.getByText(title)).toBeInTheDocument());
    }
    shelved.ai.forEach(({ title, href }) => {
      expect(screen.queryByText(title)).not.toBeInTheDocument();
      expect(document.querySelector(`a[href="${href}"]`)).toBeNull();
    });
    unmount();
  });
});

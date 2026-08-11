import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';
import content from './content.json';

beforeEach(() => {
  document.documentElement.removeAttribute('data-theme');
  localStorage.clear();
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

  const withPoints = content.experience.entries.filter((e) => e.points && e.points.length);
  expect(withPoints.length).toBeGreaterThan(1);

  const rowFor = (org) => screen.getByText(org).closest('details');

  withPoints.forEach(({ org }) => expect(rowFor(org)).not.toHaveAttribute('open'));

  // Opening one must not close any other — rows are independent.
  fireEvent.click(screen.getByText(withPoints[0].org));
  expect(rowFor(withPoints[0].org)).toHaveAttribute('open');

  fireEvent.click(screen.getByText(withPoints[1].org));
  expect(rowFor(withPoints[0].org)).toHaveAttribute('open');
  expect(rowFor(withPoints[1].org)).toHaveAttribute('open');
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

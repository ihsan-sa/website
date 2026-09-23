import { useEffect, useState } from 'react';
import './Preview.css';
import content from './content.json';

// All copy lives in content.json — edit there, not here.
const { theme, preview } = content;

const THEME_KEY = 'ihsan-theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

// jsdom (tests) ships no matchMedia; treat a missing implementation as light.
function systemPrefersDark() {
  return typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches;
}

// An explicit choice wins and persists; with no choice, the OS decides.
// The inline script in index.html has already applied any stored choice to
// <html> before React mounts, so read it back rather than re-deriving it.
function useTheme() {
  const [choice, setChoice] = useState(() =>
    document.documentElement.getAttribute('data-theme')
  );
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const query = window.matchMedia(DARK_QUERY);
    const onChange = (event) => setSystemDark(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const isDark = choice ? choice === 'dark' : systemDark;

  const toggle = () => {
    const next = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch (e) {
      // Private browsing can reject writes; the toggle still works for this visit.
    }
    setChoice(next);
  };

  return [isDark, toggle];
}

// Headings and names are Newsreader 600; index.html's font link does not carry
// that weight, so the page asks Google Fonts for it at mount.
const PREVIEW_FONT =
  'https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,600&display=swap';

function usePreviewFont() {
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = PREVIEW_FONT;
    document.head.appendChild(link);
    return () => link.remove();
  }, []);
}

const NEW_TAB = { target: '_blank', rel: 'noopener noreferrer' };

// One sentence: bold name (linked when it has an href), then text, then any PDFs.
function Entry({ name: entryName, text, href, docs }) {
  return (
    <p>
      {href ? (
        <a className="pv-strong" href={href} {...NEW_TAB}>
          {entryName}
        </a>
      ) : (
        <strong className="pv-strong">{entryName}</strong>
      )}
      , {text}
      {docs &&
        docs.map(({ label, href: docHref }, i) => (
          <span key={label}>
            {' • '}
            <a className="pv-link pv-doc" href={docHref} {...NEW_TAB}>
              {label}
            </a>
          </span>
        ))}
    </p>
  );
}

// Order is fixed by the design: links → name + intro → Experience → AI work → Hardware.
function Page() {
  const [isDark, toggleTheme] = useTheme();
  usePreviewFont();

  const sections = [preview.experience, preview.aiWork];

  return (
    <main className="pv">
      <nav className="pv-links" aria-label="Contact and profiles">
        <a className="pv-link" href={`mailto:${preview.email}`}>{preview.email}</a>
        {preview.links.map(({ label, href, download }) => (
          <a key={label} className="pv-link" href={href} {...(download ? { download: true } : NEW_TAB)}>
            {label}
          </a>
        ))}
        {/* Looks like a link; the label names the destination. */}
        <button
          type="button"
          className="pv-link pv-toggle"
          onClick={toggleTheme}
          aria-pressed={isDark}
          aria-label={`Switch to ${isDark ? theme.toLight : theme.toDark} theme`}
        >
          {isDark ? theme.toLight : theme.toDark}
        </button>
      </nav>

      <header className="pv-intro">
        <h1 className="pv-name">{preview.name}</h1>
        <p>{preview.subtitle}</p>
        {preview.about.map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </header>

      {sections.map(({ heading, items }) => (
        <section className="pv-block" key={heading}>
          <h2>{heading}</h2>
          {items.map((item) => (
            <Entry key={item.name} {...item} />
          ))}
        </section>
      ))}

      {/* The only imagery on the page. The whole tile is one link. */}
      <section className="pv-block">
        <h2>{preview.hardware.heading}</h2>
        <div className="pv-hw">
          {preview.hardware.items.map(({ title, href, image }) => (
            <a className="pv-hw__item" href={href} key={title} {...NEW_TAB}>
              <img className="pv-hw__img" src={image} alt="" loading="lazy" />
              <span>{title}</span>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}

function App() {
  return <Page />;
}

export default App;

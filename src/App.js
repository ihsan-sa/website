import { useEffect, useState } from 'react';
import './App.css';
import './Preview.css';
import content from './content.json';

// All copy lives in content.json — edit there, not here.
const { name, subtitle, bio, email, theme, links, experience, projects, preview } = content;

// Hidden preview of the next version of the page, for review on the live site:
// the single-column page built from content.json's `preview` block. Nothing
// links here; public/_redirects serves index.html at this path.
// Everything else renders exactly what renders today.
export const PREVIEW_PATH = '/exzmkculs1gj2fdzj01zwef439r7sb1p';

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

// Keep the preview out of search results. Added at mount rather than listed in
// robots.txt, because listing the path there would publish it.
function useNoindex(active) {
  useEffect(() => {
    if (!active) return undefined;
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, [active]);
}

// The preview's headings and names are Newsreader 600, a weight the index does
// not use, so only the preview asks Google Fonts for it.
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
function Preview() {
  const [isDark, toggleTheme] = useTheme();
  useNoindex(true);
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

// Layout: masthead (contact) → identity + experience | projects.
// Source order is deliberate — contact first. See the design handoff.
function Index() {
  const [isDark, toggleTheme] = useTheme();
  const [bioExpanded, setBioExpanded] = useState(false);

  const visibleBio = bio.paragraphs.slice(0, bio.fold);
  const foldedBio = bio.paragraphs.slice(bio.fold);

  return (
    <main className="page">
      <header className="masthead">
        <a className="masthead__email" href={`mailto:${email}`}>{email}</a>

        <div className="masthead__right">
          <nav className="masthead__links" aria-label="Profiles">
            {links.items.map(({ label, href, download }) => (
              <a
                key={label}
                href={href}
                {...(download
                  ? { download: true }
                  : { target: '_blank', rel: 'noopener noreferrer' })}
              >
                {label}
              </a>
            ))}
          </nav>

          {/* A switch: aria-checked carries the state, so the accessible
              name still names the destination the click takes you to. */}
          <button
            type="button"
            className="theme-toggle"
            role="switch"
            onClick={toggleTheme}
            aria-checked={isDark}
            aria-label={`Switch to ${isDark ? theme.toLight : theme.toDark} theme`}
          >
            <span className="theme-toggle__track" aria-hidden="true">
              <span className="theme-toggle__knob" />
            </span>
          </button>
        </div>
      </header>

      <div className="body-grid">
        <section className="identity">
          <div className="identity__head">
            <h1 className="name">{name}</h1>

            {/* Subtitle = the one-line identity claim. Large, dark. */}
            <p className="subtitle">{subtitle}</p>

            {/* Bio = secondary. Hairline above, smaller, softer, looser. */}
            <div className="bio">
              {visibleBio.map((para, i) => (
                <p key={i}>{para}</p>
              ))}

              {foldedBio.length > 0 && (
                <>
                  <div className="bio__fold" id="bio-more" hidden={!bioExpanded}>
                    {foldedBio.map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="bio__more"
                    aria-expanded={bioExpanded}
                    aria-controls="bio-more"
                    onClick={() => setBioExpanded((open) => !open)}
                  >
                    <span>{bioExpanded ? bio.lessLabel : bio.moreLabel}</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Each row is a <details>: click the summary to reveal the panel.
              Native element, so keyboard and screen-reader support come free. */}
          <section className="exp">
            <h2 className="label">{experience.heading}</h2>

            <ul className="exp__list">
              {experience.entries.map(({ when, org, role, points, tags, href }) => (
                <li key={org}>
                  <details className="exp__item">
                    <summary className="exp__row">
                      <span className="exp__when">
                        {when.map((part) => (
                          <span key={part}>{part}</span>
                        ))}
                      </span>
                      <span>
                        <span className="exp__org">{org}</span>
                        <span className="exp__role">{role}</span>
                      </span>
                      <span className="exp__mark" aria-hidden="true" />
                    </summary>

                    <div className="exp__detail">
                      {points && points.length > 0 && (
                        <ul className="exp__points">
                          {points.map((point, i) => (
                            <li key={i}>{point}</li>
                          ))}
                        </ul>
                      )}

                      {tags && tags.length > 0 && (
                        <div className="exp__tags">
                          {tags.map((tag) => (
                            <span key={tag}>{tag}</span>
                          ))}
                        </div>
                      )}

                      {href && (
                        <a
                          className="exp__link"
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {experience.readMoreLabel}
                        </a>
                      )}
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          </section>
        </section>

        <section className="showcase">
          <div className="section-head">
            <h2 className="label">{projects.heading}</h2>
            <a href={projects.link.href} target="_blank" rel="noopener noreferrer">
              {projects.link.label}
            </a>
          </div>

          {/* Whole card is one link. Images are the only assets on the page. */}
          <div className="projects">
            {projects.items.map(({ title, meta, href, image }) => (
              <a className="project" href={href} key={title} target="_blank" rel="noopener noreferrer">
                <img className="project__thumb" src={image} alt="" loading="lazy" />
                <span className="project__text">
                  <span className="project__title">{title}</span>
                  <span className="project__meta">{meta}</span>
                </span>
              </a>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function App() {
  // Read at render, not at import, so a test can pushState before rendering.
  return window.location.pathname === PREVIEW_PATH ? <Preview /> : <Index />;
}

export default App;

import { useEffect, useState } from 'react';
import './App.css';
import content from './content.json';

// All copy lives in content.json — edit there, not here.
const { name, subtitle, bio, email, theme, links, experience, ai, projects } = content;

// Hidden preview of the next version of the page, for review on the live site.
// Nothing links here; public/_redirects serves index.html at this path.
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

// AI work: one link row per project, in the style of the Experience rows.
function AiWork() {
  return (
    <section className="ai">
      <div className="section-head">
        <h2 className="label">{ai.heading}</h2>
        <a href={ai.link.href} target="_blank" rel="noopener noreferrer">
          {ai.link.label}
        </a>
      </div>

      <ul className="ai__list">
        {ai.items.map(({ title, meta, blurb, href }) => (
          <li key={title}>
            <a className="ai__row" href={href} target="_blank" rel="noopener noreferrer">
              <span className="ai__title">{title}</span>
              <span className="ai__blurb">{blurb}</span>
              <span className="ai__meta">{meta}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

// Layout: masthead (contact) → identity + experience | projects.
// Source order is deliberate — contact first. See the design handoff.
function App() {
  const [isDark, toggleTheme] = useTheme();
  const [bioExpanded, setBioExpanded] = useState(false);
  // Read at render, not at import, so a test can pushState before rendering.
  const isPreview = window.location.pathname === PREVIEW_PATH;
  useNoindex(isPreview);

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
          {isPreview && <AiWork />}

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

export default App;

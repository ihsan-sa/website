import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import './Preview.css';
import rawContent from './content.json';
import { ESSAY_BANNER } from './essayBanner';
import { fillStats } from './fillStats';
import { frontPage } from './frontPage';
import { PROJECT_THUMBS } from './projectThumbs';
import { SIDE_PHOTOS } from './sidePhotos';
import stats from './stats.json';
import Writing, { matchWriting } from './writing/Writing';
import allEssays from './writing/essays.generated.json';

// All copy lives in content.json — edit there, not here. Its {autobox.prs}-style
// placeholders are filled from stats.json, which the box refreshes (docs/stats.md).
const content = fillStats(rawContent, stats);
const { prototype } = content;
// The front page is the draft minus its documents (src/frontPage.js).
const front = frontPage(prototype);
// Only an essay the owner approved for publishing (no `draft: true`) is ever
// shown off the preview path.
const published = allEssays.filter((e) => !e.draft);

// The draft lives at this unguessable path, with its documents and every essay,
// drafts too. Nothing links here and robots.txt does not name it;
// public/_redirects serves index.html at it. Every other path renders the
// front page.
export const PREVIEW_PATH = '/ua6x0zhyeewlevzyh9c87r3wb29m9qlu';

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

// Keep the draft out of search results. Added at mount rather than listed in
// robots.txt, because listing the path there would publish it. The front page
// passes false: it is the page search should find.
function useNoindex(on) {
  useEffect(() => {
    if (!on) return undefined;
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, [on]);
}

// Headings and names are Newsreader 600; index.html's font link does not carry
// that weight, so the page asks Google Fonts for it at mount.
const PREVIEW_FONT =
  'https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;1,6..72,400&display=swap';

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

// The draft's banner under the intro: the essay's clip (src/essayBanner.js) as a
// looping GIF over its title and standfirst, the whole of it one link to the essay.
// A GIF, not a <video>, because a GIF plays everywhere, Safari's Low Power Mode
// included, which refuses muted video autoplay. It loads lazily, after the text, and
// its width and height and a light fill hold its 16:9 box so nothing shifts. With
// reduced motion asked for, <picture> swaps in the still poster and the GIF never
// loads. It is decorative (alt=""): the link's own text names the essay.
function EssayBanner({ essay, href, label }) {
  const { gif, poster, width, height } = ESSAY_BANNER;
  return (
    <a className="pv-banner pv-banner--apart" href={href}>
      <picture className="pv-banner__media">
        <source media="(prefers-reduced-motion: reduce)" srcSet={poster} />
        <img
          className="pv-banner__video"
          src={gif}
          alt=""
          width={width}
          height={height}
          loading="lazy"
          decoding="async"
        />
      </picture>
      <span className="pv-banner__text">
        <span className="pv-banner__label">{label}</span>
        <span className="pv-banner__title">{essay.title}</span>
        <span className="pv-banner__stand">{essay.standfirst || essay.summary}</span>
      </span>
    </a>
  );
}

// The intro. A phone shows the name and subtitle with the about paragraphs
// folded behind a button; Preview.css hides them with display: none, so while
// folded they are neither tabbable nor read out. Above 640px the button is
// hidden and the paragraphs always show.
function Intro({ block }) {
  const [open, setOpen] = useState(false);
  const aboutId = useId();
  const paragraphs = block.about.map((para, i) => <p key={i}>{para}</p>);
  return (
    <header className="pv-intro">
      <h1 className="pv-name">{block.name}</h1>
      <p>{block.subtitle}</p>
      <div id={aboutId} className={open ? 'pv-about pv-about--open' : 'pv-about'}>
        {paragraphs}
      </div>
      <button
        type="button"
        className="pv-about__btn"
        aria-expanded={open}
        aria-controls={aboutId}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? block.aboutFold.less : block.aboutFold.more}
      </button>
    </header>
  );
}

// The owner's photos (src/sidePhotos.js). Preview.css places the two side columns
// (desktop) and the strip (phone) and hides each where it does not fit.
// Every image on the page is lazy, even the strip above the name: a lazy image already
// on screen loads at once, while an eager one would load in the layout that hides it
// too (the strip on a desktop, the columns on a phone). The one thing fetched up front
// is the banner's small poster. Each has its width and height, and a light fill holds
// its place, so the text paints first and nothing shifts.
const imgProps = ({ src, width, height, alt }) => ({ src, width, height, alt, loading: 'lazy', decoding: 'async' });

function SidePhotos({ side }) {
  return (
    <aside className={`pv-side pv-side--${side}`} aria-label="Photos">
      {SIDE_PHOTOS[side].map((p) => (
        <img key={p.src} className={p.height > p.width ? 'pv-side__img pv-side__img--tall' : 'pv-side__img'} {...imgProps(p)} alt={p.alt} />
      ))}
    </aside>
  );
}

// Phone only: one row of six photos between the links bar and the name. Pure CSS.
function PhotoStrip() {
  return (
    <div className="pv-strip" aria-label="Photos">
      {SIDE_PHOTOS.strip.map((p) => (
        <img key={p.src} className={p.height > p.width ? 'pv-strip__img pv-strip__img--tall' : 'pv-strip__img'} {...imgProps(p)} alt={p.alt} />
      ))}
    </div>
  );
}

const MAX_STRETCH = 1.15;

// Fit one column to height H: show the leading photos whose stacked height (plus
// gaps) comes closest to H, then give each the same small stretch so it ends at H.
function fitColumn(aside, H) {
  const W = aside.clientWidth;
  const imgs = [...aside.querySelectorAll('.pv-side__img')];
  if (!W || !H || !imgs.length) return;
  const gap = parseFloat(getComputedStyle(aside).rowGap) || 0;
  const ratios = imgs.map((img) => Number(img.getAttribute('height')) / Number(img.getAttribute('width')));
  let sum = 0;
  let n = 1;
  let bestErr = Infinity;
  let bestSum = W * ratios[0];
  for (let i = 0; i < imgs.length; i += 1) {
    sum += W * ratios[i];
    const total = sum + i * gap;
    const err = Math.abs(total - H);
    if (err < bestErr) { bestErr = err; n = i + 1; bestSum = sum; }
    if (total > H) break;
  }
  const k = Math.min((H - (n - 1) * gap) / bestSum, MAX_STRETCH);
  aside.style.bottom = 'auto';
  aside.style.height = `${H}px`;
  imgs.forEach((img, j) => {
    img.style.display = j < n ? '' : 'none';
    img.style.height = j < n ? `${(W * ratios[j] * k).toFixed(2)}px` : '';
  });
}

// Fit both columns once, with every row closed, and again only when the window's
// width changes or the fonts arrive; opening a row does not move them.
function useFitSidePhotos(ref) {
  useLayoutEffect(() => {
    const main = ref.current;
    if (!main) return undefined;
    const fitAll = () => {
      const cs = getComputedStyle(main);
      let open = 0;
      main.querySelectorAll('.pv-fold:not([inert])').forEach((f) => { open += f.offsetHeight; });
      const H = main.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - open;
      main.querySelectorAll('.pv-side').forEach((a) => fitColumn(a, H));
    };
    fitAll();
    let alive = true;
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => alive && fitAll());
    let lastW = window.innerWidth;
    let timer;
    const onResize = () => {
      if (window.innerWidth === lastW) return;
      lastW = window.innerWidth;
      clearTimeout(timer);
      timer = setTimeout(fitAll, 120);
    };
    window.addEventListener('resize', onResize);
    return () => { alive = false; clearTimeout(timer); window.removeEventListener('resize', onResize); };
  }, [ref]);
}

// A project tile's image: its small web copy (src/projectThumbs.js), sized, lazy
// and decoded off the main thread, or the original where there is no copy.
// Preview.css gives the tile its 4:3 box and a light fill, so nothing shifts while
// it loads.
function ProjectImage({ image }) {
  const thumb = PROJECT_THUMBS[image];
  if (!thumb) return <img className="pv-hw__img" src={image} alt="" loading="lazy" />;
  return <img className="pv-hw__img" {...imgProps(thumb)} alt="" />;
}

// A PDF link on the prototype names what it is, with no page count.
function DocLink({ label, href }) {
  return (
    <a className="pv-link pv-doc" href={href} {...NEW_TAB}>
      {label}
    </a>
  );
}

// A section heading with its documents beside it: content.json `headLink`, and
// `docs` (a doc with no href is a spot still waiting for its link).
function Heading({ heading, headLink, docs }) {
  if (!headLink && !docs) return <h2>{heading}</h2>;
  return (
    <h2 className="pv-head-with-link">
      {heading}
      {headLink && (
        <>
          {' '}
          <a className="pv-link pv-head-link" href={headLink.href} {...NEW_TAB}>
            {headLink.label}
          </a>
        </>
      )}
      {docs &&
        docs.map((doc) => (
          <span key={doc.label}>
            {' '}
            {doc.href ? (
              <a className="pv-link pv-head-link" href={doc.href} {...NEW_TAB}>
                {doc.label}
              </a>
            ) : (
              <span className="pv-head-link pv-pending">
                {doc.label} ({doc.pending})
              </span>
            )}
          </span>
        ))}
    </h2>
  );
}

// "September ’26", from an essay's YYYY-MM-DD date.
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];
function monthYear(iso) {
  const [y, m] = iso.split('-');
  return `${MONTHS[Number(m) - 1]} ’${y.slice(2)}`;
}

// An AI row's visual: an image, or a GIF clip as the essay shows its clips (see
// EssayBanner): a lazy, sized <img> in a <picture> whose reduced-motion source is
// the still poster, so the GIF never loads then. A clip with a `video` sits in the
// essay figures' link, so a click plays the .mp4 full size with its controls
// (src/writing/zoom.js, which Writing.js loads for every page); without the script
// the link still opens the video.
export function RowVisual({ visual }) {
  const { src, poster, video, width, height, alt, caption } = visual;
  const img = <img src={src} width={width} height={height} alt={alt} loading="lazy" decoding="async" />;
  const media = poster ? (
    <picture>
      <source media="(prefers-reduced-motion: reduce)" srcSet={poster} />
      {img}
    </picture>
  ) : img;
  return (
    <figure className="pv-visual">
      {video ? (
        <a className="wr-figure__zoom pv-visual__zoom" href={video} data-video={video} aria-label={`Play full size: ${alt}`} aria-haspopup="dialog">
          {media}
        </a>
      ) : media}
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

// A prototype row, folded to one line until opened: the linked name and what
// it is. Opening it shows one concrete result, then a visual, optional longer
// sentences, a small figure, the PDFs (draft only: src/frontPage.js drops them)
// and a pointer to the one to open first. A doc with
// no href is a spot still waiting for its link. With a `short`, a phone shows
// that on the line in place of the full text (Preview.css). A
// `where` (place and date) follows the full text on the line, in italics.
//
// The toggle is a real button at the end of the line; its ::before stretches
// over the whole line, so a click anywhere on it opens the row, while the name
// link sits above that layer and still just opens its page. The panel is inert
// while folded, so its links are neither tabbable nor read out.
function ProtoEntry({ name: entryName, text, where, short, href, result, visual, detail, figure, docs, start }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const hasMore = Boolean(result || visual || detail || figure || docs || start);
  const place = where && <>, <em>{where}</em></>;

  return (
    <div className="pv-entry">
      <p className="pv-entry__head">
        {href ? (
          <a className="pv-strong pv-name-link" href={href} {...NEW_TAB}>
            {entryName}
          </a>
        ) : (
          <strong className="pv-strong">{entryName}</strong>
        )}
        {short ? (
          <>
            <span className="pv-t-long">, {text}{place}</span>
            <span className="pv-t-short">, {short}</span>
          </>
        ) : (
          <>, {text}{place}</>
        )}
        {hasMore && (
          <button
            type="button"
            className="pv-entry__btn"
            aria-expanded={open}
            aria-controls={panelId}
            aria-label={`More about ${entryName}`}
            onClick={() => setOpen((o) => !o)}
          />
        )}
      </p>
      {hasMore && (
        <div className="pv-fold" id={panelId} inert={!open}>
          <div className="pv-fold__inner">
            {result && <p className="pv-result">{result}</p>}
            {visual && <RowVisual visual={visual} />}
            {detail && <p className="pv-detail">{detail}</p>}
            {figure && (
              <figure className="pv-figure">
                <img src={figure.image} width={figure.width} height={figure.height} alt={figure.alt} loading="lazy" decoding="async" />
                <figcaption>{figure.caption}</figcaption>
              </figure>
            )}
            {docs && (
              <p className="pv-docs">
                {docs.map((doc, i) => (
                  <span key={doc.label}>
                    {i > 0 && ' • '}
                    {doc.href ? (
                      <DocLink {...doc} />
                    ) : (
                      <span className="pv-pending">{doc.label} ({doc.pending})</span>
                    )}
                  </span>
                ))}
              </p>
            )}
            {start && <p className="pv-start">{start}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// The page: a two-row links bar with the theme switch, the intro, Experience,
// AI work, Essays, Projects. Every experience and AI row starts folded to one
// line; the sections themselves and the project grid stay open. With no essays,
// neither the list nor the Essays link in the bar is shown.
//
// Both pages have the owner's photos in the side margins (a strip on a phone),
// AI work above Experience, the about folded on a phone and an essay banner
// under the intro. `front` renders ihsan.cc/: the draft minus its documents
// (src/frontPage.js), published essays only, linked at /writing, and no noindex.
// Without it, this is the draft at PREVIEW_PATH: documents, every essay (drafts
// too), and noindex. Both show a visual in each AI row.
export function Prototype({ front: isFront = false, essays = isFront ? published : allEssays }) {
  const [isDark, toggleTheme] = useTheme();
  useNoindex(!isFront);
  usePreviewFont();
  const mainRef = useRef(null);
  useFitSidePhotos(mainRef);

  const block = isFront ? front : prototype;
  const sections = [block.aiWork, block.experience];
  const writing = isFront ? '/writing' : `${PREVIEW_PATH}/writing`;
  const bannerEssay = essays.find((e) => e.slug === ESSAY_BANNER.slug);

  return (
    <main ref={mainRef} className="pv pv-proto pv-proto--photos">
      <nav className="pv-links pv-links--compact" aria-label="Contact and profiles">
        <span className="pv-links__row">
          <span className="pv-links__rest">
            <a className="pv-link" href={`mailto:${block.email}`}>{block.email}</a>
            <a className="pv-link" href={block.contactCard.href} download title={block.contactCard.title}>
              {block.contactCard.label}
            </a>
          </span>
          <button
            type="button"
            className="theme-switch"
            role="switch"
            aria-checked={isDark}
            aria-label="Dark theme"
            title="Dark theme"
            onClick={toggleTheme}
          />
        </span>
        <span className="pv-links__rest">
          {essays.length > 0 && <a className="pv-link" href={writing}>{block.essays.heading}</a>}
          {block.links.map(({ label, href }) => (
            <a key={label} className="pv-link" href={href} {...NEW_TAB}>
              {label}
            </a>
          ))}
        </span>
      </nav>

      <PhotoStrip />

      <Intro block={block} />

      {bannerEssay && (
        <EssayBanner essay={bannerEssay} href={`${writing}/${bannerEssay.slug}`} label={block.essays.banner} />
      )}

      {sections.map((section) => (
        <section className="pv-block" key={section.heading}>
          <Heading {...section} />
          {section.items.map((item) => (
            <ProtoEntry key={item.name} {...item} />
          ))}
        </section>
      ))}

      {essays.length > 0 && (
        <section className="pv-block">
          <h2>
            <a className="pv-strong" href={writing}>{block.essays.heading}</a>
          </h2>
          {essays.map((e) => (
            <p key={e.slug}>
              <a className="pv-strong pv-name-link" href={`${writing}/${e.slug}`}>{e.title}</a>
              , {e.blurb || e.summary} {monthYear(e.date)}.
            </p>
          ))}
        </section>
      )}

      <section className="pv-block">
        <Heading {...block.projects} />
        <div className="pv-hw">
          {block.projects.items.map(({ title, href, image, result }) => (
            <a className="pv-hw__item" href={href} key={title} {...NEW_TAB}>
              <ProjectImage image={image} />
              <span className="pv-hw__title">{title}</span>
              {result && <span className="pv-hw__result">{result}</span>}
            </a>
          ))}
        </div>
      </section>

      <SidePhotos side="left" />
      <SidePhotos side="right" />
    </main>
  );
}

// Off the preview path, /writing answers only once an essay is published;
// until then it falls through to the front page like any unknown path.
// `essays` is for tests.
function App({ essays = allEssays }) {
  // Read at render, not at import, so a test can pushState before rendering.
  // A trailing slash is the same page: /path/ must not fall through to the front page.
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
  const live = essays.filter((e) => !e.draft);
  const writing = matchWriting(pathname, PREVIEW_PATH);
  if (writing && (writing.preview || live.length > 0)) {
    return <Writing route={writing} previewPath={PREVIEW_PATH} essays={essays} />;
  }
  return pathname === PREVIEW_PATH ? <Prototype essays={essays} /> : <Prototype front essays={live} />;
}

export default App;

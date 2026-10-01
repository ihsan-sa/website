import { useEffect } from 'react';
import { useTheme } from '../theme';
import './Writing.css';
import './zoom';
import allEssays from './essays.generated.json';
import portfolio from './portfolio.generated.json';

// The essays at /writing. essays.generated.json is built from content/writing/*.md
// by scripts/writing.js (see its header for the markdown the pipeline takes).
//
// A draft is never listed or served at /writing: it renders only under the
// preview path, as <preview>/writing and <preview>/writing/<slug>, and asks not
// to be indexed there. Structure only: every class is `wr-*` and Writing.css
// holds all of its look, so the design can be swapped without touching this file.

const NEW_TAB = { target: '_blank', rel: 'noopener noreferrer' };

// '/writing' or '/writing/<slug>', with or without the preview path in front.
// Returns { preview, slug } (slug null for the index), or null for any other path.
export function matchWriting(pathname, previewPath) {
  const path = pathname.replace(/\/+$/, '');
  const preview = path.startsWith(`${previewPath}/`);
  const rest = preview ? path.slice(previewPath.length) : path;
  const m = rest.match(/^\/writing(?:\/([a-z0-9-]+))?$/);
  return m ? { preview, slug: m[1] || null } : null;
}

// Title, description and robots for this page, restored on unmount. The static
// copies scripts/writing.js writes carry the same tags for link previews.
function useHead({ title, description, noindex }) {
  useEffect(() => {
    const prevTitle = document.title;
    const desc = document.head.querySelector('meta[name="description"]');
    const prevDesc = desc && desc.getAttribute('content');
    document.title = title;
    if (desc && description) desc.setAttribute('content', description);
    let robots = null;
    if (noindex) {
      robots = document.createElement('meta');
      robots.name = 'robots';
      robots.content = 'noindex';
      document.head.appendChild(robots);
    }
    return () => {
      document.title = prevTitle;
      if (desc && prevDesc !== null) desc.setAttribute('content', prevDesc);
      if (robots) robots.remove();
    };
  }, [title, description, noindex]);
}

function Inline({ nodes, notes, seen }) {
  return nodes.map((n, i) => {
    switch (n.t) {
      case 'em':
        return <em key={i}><Inline nodes={n.c} notes={notes} seen={seen} /></em>;
      case 'strong':
        return <strong key={i}><Inline nodes={n.c} notes={notes} seen={seen} /></strong>;
      case 'mark':
        return <mark key={i} className="wr-added"><Inline nodes={n.c} notes={notes} seen={seen} /></mark>;
      case 'code':
        return <code key={i} className="wr-code">{n.v}</code>;
      case 'link':
        return (
          <a key={i} className="wr-link" href={n.href}>
            <Inline nodes={n.c} notes={notes} seen={seen} />
          </a>
        );
      case 'fn': {
        // The first reference carries the id the footnote's back-link returns to.
        const first = !seen.has(n.n);
        seen.add(n.n);
        const note = notes.find((f) => f.n === n.n);
        return (
          <span key={i} className="wr-fn">
            <sup className="wr-fnref">
              <a href={`#fn-${n.n}`} id={first ? `fnref-${n.n}` : undefined} aria-label={`Note ${n.n}`}>
                {n.n}
              </a>
            </sup>
            {first && note && (
              <span className="wr-sidenote" aria-hidden="true">
                <span className="wr-sidenote__n">{n.n}</span> <Inline nodes={note.c} notes={notes} seen={seen} />
              </span>
            )}
          </span>
        );
      }
      default:
        return n.v;
    }
  });
}

// A GIF with its .mp4 beside it (scripts/writing.js) is a clip: the GIF itself, lazy
// and sized, because a GIF autoplays everywhere (Safari's Low Power Mode refuses muted
// video). Its poster is the <img>'s background, shown until the GIF loads; with reduced
// motion asked for, the poster stands in and the GIF never loads.
// A click still opens the .mp4 full size with its controls (zoom.js).
function Clip({ src, poster, alt, width, height }) {
  return (
    <picture className="wr-figure__clip">
      {poster && <source media="(prefers-reduced-motion: reduce)" srcSet={poster} />}
      <img className="wr-figure__img" src={src} alt={alt} width={width} height={height} loading="lazy" decoding="async"
        style={poster ? { backgroundImage: `url(${poster})`, backgroundSize: 'cover' } : undefined} />
    </picture>
  );
}

function Figure({ block, notes, seen }) {
  const { kind, src, alt, caption, width, height, missing, video, poster } = block;
  // A diagram shrinks to fit the column on a phone rather than scrolling sideways.
  // A click on the figure enlarges it, or plays its video (zoom.js).
  return (
    <figure className={`wr-figure wr-figure--${kind}`}>
      <div className="wr-figure__frame">
        {missing ? (
          <div className="wr-figure__missing">Figure not added yet: {src.split('/').pop()}</div>
        ) : (
          <a className="wr-figure__zoom" href={video || src} data-video={video} aria-label={`${video ? 'Play full size' : 'Enlarge'}: ${alt}`} aria-haspopup="dialog">
            {video ? (
              <Clip src={src} poster={poster} alt={alt} width={width} height={height} />
            ) : (
              <img className="wr-figure__img" src={src} alt={alt} width={width} height={height} loading="lazy" decoding="async" />
            )}
          </a>
        )}
      </div>
      <figcaption className="wr-figure__caption">
        <Inline nodes={caption} notes={notes} seen={seen} />
      </figcaption>
    </figure>
  );
}

function Block({ block, notes, seen }) {
  const inline = (nodes) => <Inline nodes={nodes} notes={notes} seen={seen} />;
  switch (block.t) {
    case 'h2':
      return <h2 className="wr-h2">{inline(block.c)}</h2>;
    case 'h3':
      return <h3 className="wr-h3">{inline(block.c)}</h3>;
    case 'quote':
      return <blockquote className="wr-pullquote">{inline(block.c)}</blockquote>;
    case 'code':
      return (
        <pre className="wr-pre" data-lang={block.lang || undefined}>
          <code>{block.v}</code>
        </pre>
      );
    case 'ul':
    case 'ol': {
      const List = block.t;
      return (
        <List className="wr-list">
          {block.items.map((item, i) => <li key={i}>{inline(item)}</li>)}
        </List>
      );
    }
    case 'hr':
      return <hr className="wr-rule" />;
    case 'figure':
      return <Figure block={block} notes={notes} seen={seen} />;
    default:
      return <p className="wr-p">{inline(block.c)}</p>;
  }
}

function Meta({ essay }) {
  return (
    <p className="wr-meta">
      <time dateTime={essay.date}>{essay.dateLabel}</time>
      <span className="wr-meta__sep"> · </span>
      {essay.readingMinutes} min read
      {essay.draft && <span className="wr-meta__draft"> · Draft</span>}
    </p>
  );
}

// The bar above every essay page: the main site, then the essays index, then the
// theme switch. ihsan.cc always goes to the real front page, even from the hidden
// preview path. On the index, "Essays" is where you are, so it is text, not a link.
function TopBar({ base, onIndex, title }) {
  return (
    <nav className="wr-top" aria-label="Site">
      <span className="wr-top__crumbs">
        <a className="wr-top__link" href="/">ihsan.cc</a>
        <span className="wr-top__sep" aria-hidden="true">/</span>
        {onIndex ? (
          <span className="wr-top__here" aria-current="page">Essays</span>
        ) : (
          <a className="wr-top__link" href={`${base}/writing`}>Essays</a>
        )}
        {title && (
          <>
            <span className="wr-top__sep" aria-hidden="true">/</span>
            <span className="wr-top__here" aria-current="page">{title}</span>
          </>
        )}
      </span>
      <ThemeSwitch />
    </nav>
  );
}

// Same switch and storage key as the front page (theme.js).
function ThemeSwitch() {
  const [isDark, toggle] = useTheme();
  return (
    <button type="button" className="theme-switch" role="switch" aria-checked={isDark}
      aria-label="Dark theme" title="Dark theme" onClick={toggle} />
  );
}

function Index({ essays, base, preview }) {
  useHead({ title: 'Essays · Ihsan Salari', description: 'Essays on the AI systems I build.', noindex: preview });
  return (
    <main className="wr wr-index">
      <TopBar base={base} onIndex />
      <h1 className="wr-index__title">Essays</h1>
      {essays.length === 0 ? (
        <p className="wr-index__empty">Nothing here yet.</p>
      ) : (
        <ol className="wr-index__list">
          {essays.map((e) => (
            <li className="wr-index__item" key={e.slug}>
              <a className="wr-index__link" href={`${base}/writing/${e.slug}`}>{e.title}</a>
              <p className="wr-index__summary">{e.summary}</p>
              <Meta essay={e} />
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}

function Essay({ essay, older, newer, base, preview }) {
  useHead({ title: `${essay.title} · Ihsan Salari`, description: essay.summary, noindex: preview || essay.draft });
  const notes = essay.footnotes;
  const seen = new Set();
  return (
    <main className="wr wr-essay">
      <TopBar base={base} title={essay.title} />
      <article>
        <header className="wr-head">
          <h1 className="wr-title">{essay.title}</h1>
          <Meta essay={essay} />
          <p className="wr-standfirst">{essay.standfirst}</p>
        </header>
        <div className="wr-body">
          {essay.blocks.map((b, i) => (
            <Block key={i} block={b} notes={notes} seen={seen} />
          ))}
        </div>
        {notes.length > 0 && (
          <section className="wr-footnotes" aria-label="Notes">
            <ol>
              {notes.map((f) => (
                <li key={f.n} id={`fn-${f.n}`}>
                  <Inline nodes={f.c} notes={notes} seen={new Set([f.n])} />{' '}
                  <a className="wr-footnotes__back" href={`#fnref-${f.n}`} aria-label={`Back to note ${f.n}`}>↩</a>
                </li>
              ))}
            </ol>
          </section>
        )}
        {essay.furtherReading.length > 0 && (
          <section className="wr-reading">
            <h2 className="wr-reading__head">Further reading</h2>
            <ul className="wr-reading__list">
              {essay.furtherReading.map((r) => (
                <li className="wr-reading__item" key={r.href}>
                  <a className="wr-reading__link" href={r.href} {...NEW_TAB}>{r.title}</a>
                  <span className="wr-reading__note">{r.note}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
      <nav className="wr-pager" aria-label="More essays">
        {older && (
          <a className="wr-pager__link wr-pager__link--prev" href={`${base}/writing/${older.slug}`}>
            <span className="wr-pager__label">Previous</span>
            <span className="wr-pager__title">{older.title}</span>
          </a>
        )}
        {newer && (
          <a className="wr-pager__link wr-pager__link--next" href={`${base}/writing/${newer.slug}`}>
            <span className="wr-pager__label">Next</span>
            <span className="wr-pager__title">{newer.title}</span>
          </a>
        )}
        <a className="wr-pager__index" href={`${base}/writing`}>All essays</a>
      </nav>
    </main>
  );
}

function NotFound({ base }) {
  useHead({ title: 'Not found · Ihsan Salari', noindex: true });
  return (
    <main className="wr wr-missing">
      <p className="wr-p">There's no essay at this address.</p>
      <a className="wr-link" href={`${base}/writing`}>All essays</a>
    </main>
  );
}

// One media block of the AI portfolio (scripts/portfolio.js): a single file is shown as an
// essay figure is; several sit side by side under one caption, each enlarging on its own.
function Media({ block }) {
  const { items, alt, caption } = block;
  if (items.length === 1 && items[0].kind !== 'video') {
    const it = items[0];
    return <Figure block={{ ...it, alt, caption }} notes={[]} seen={new Set()} />;
  }
  return (
    <figure className={`wr-figure wr-figure--image${items.length > 1 ? ' wr-figure--row' : ''}`}>
      <div className="wr-figure__frame">
        {items.map((it) => {
          const label = items.length > 1 ? `${alt}: ${it.src.split('/').pop().replace(/\.\w+$/, '')}` : alt;
          if (it.missing) return <div key={it.src} className="wr-figure__missing">Figure not added yet: {it.src.split('/').pop()}</div>;
          if (it.kind === 'video') {
            return <video key={it.src} className="wr-figure__img" src={it.src} poster={it.poster} width={it.width} height={it.height} controls preload="none" aria-label={label} />;
          }
          return (
            <a key={it.src} className="wr-figure__zoom" href={it.video || it.src} data-video={it.video} aria-label={`${it.video ? 'Play full size' : 'Enlarge'}: ${label}`} aria-haspopup="dialog">
              {it.video ? (
                <Clip src={it.src} poster={it.poster} alt={label} width={it.width} height={it.height} />
              ) : (
                <img className="wr-figure__img" src={it.src} alt={label} width={it.width} height={it.height} loading="lazy" decoding="async" />
              )}
            </a>
          );
        })}
      </div>
      {caption.length > 0 && (
        <figcaption className="wr-figure__caption">
          <Inline nodes={caption} notes={[]} seen={new Set()} />
        </figcaption>
      )}
    </figure>
  );
}

// The AI portfolio, built from content/portfolio/ai.md: shaped like an essay, with a
// repo link under each project's heading and the PDF of the same text linked at the top.
// It is served only at the preview path for now, so it always asks not to be indexed.
export function Portfolio({ page = portfolio }) {
  useHead({ title: `${page.title} · Ihsan Salari`, description: page.standfirst.map((n) => n.v || '').join(''), noindex: true });
  const seen = new Set();
  return (
    <main className="wr wr-essay wr-portfolio">
      <nav className="wr-top">
        <span className="wr-top__crumbs">
          <a className="wr-top__link" href="/">ihsan.cc</a>
        </span>
      </nav>
      <article>
        <header className="wr-head">
          <h1 className="wr-title">{page.title}</h1>
          <p className="wr-standfirst"><Inline nodes={page.standfirst} notes={[]} seen={seen} /></p>
        </header>
        <div className="wr-body">
          {page.blocks.map((b, i) => {
            if (b.t === 'pdf') {
              return (
                <p key={i} className="wr-p wr-portfolio__pdf">
                  <a className="wr-link" href={b.href} {...NEW_TAB}>Read this as a PDF</a>
                </p>
              );
            }
            if (b.t === 'media') return <Media key={i} block={b} />;
            if ((b.t === 'h2' || b.t === 'h3') && b.repo) {
              return (
                <div key={i} className="wr-portfolio__head">
                  <Block block={b} notes={[]} seen={seen} />
                  <a className="wr-portfolio__repo" href={b.repo.href} {...NEW_TAB}>{b.repo.label}</a>
                </div>
              );
            }
            return <Block key={i} block={b} notes={[]} seen={seen} />;
          })}
        </div>
      </article>
    </main>
  );
}

// `route` is what matchWriting returned; `essays` is newest first.
export default function Writing({ route, previewPath, essays = allEssays }) {
  const { preview, slug } = route;
  const base = preview ? previewPath : '';
  // "Draft essays never appear on the public site": they are dropped here unless
  // this is the preview path.
  const shown = preview ? essays : essays.filter((e) => !e.draft);
  if (!slug) return <Index essays={shown} base={base} preview={preview} />;
  const i = shown.findIndex((e) => e.slug === slug);
  if (i < 0) return <NotFound base={base} />;
  return <Essay essay={shown[i]} newer={shown[i - 1]} older={shown[i + 1]} base={base} preview={preview} />;
}

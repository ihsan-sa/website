# ihsan.cc

Single-page personal index. Built with [Create React App](https://github.com/facebook/create-react-app).

## Editing the content

**All the text on the site is in [`src/content.json`](src/content.json).** Its `prototype`
block is the page: name, subtitle, about paragraphs, the link row, experience, AI work
and projects — edit that one file and you are done. You never need to touch `App.js`.

The file opens with a `_readme` block explaining the JSON rules (quotes, commas) and how
to add or remove an entry. Every `_note` and `_readme` key is documentation only; the site
ignores them.

Two exceptions, both in [`public/index.html`](public/index.html):

- the **browser-tab title**
- the **description shown when you paste the link** into Slack, LinkedIn, iMessage, etc.

Those have to be plain HTML because link-preview bots read the page without running it.

Images go in `public/images/`. A path of `/images/foo.jpg` in the JSON means
`public/images/foo.jpg`. Hardware photos are cropped to 4:3 from the centre, so export
them around 480×360.
PDFs go in `public/docs/`: `/docs/foo.pdf` in the JSON means `public/docs/foo.pdf`.

To read and edit the text as a PDF in the document library instead, see
[`docs/content-pdf.md`](docs/content-pdf.md).

A string can carry a number the box counts, written `{autobox.prs}` or `{autobox.repos}`;
[`docs/stats.md`](docs/stats.md) says where the numbers come from.

To see your changes: `npm start`, then open http://localhost:3000. The page reloads as you
save. To publish them you still need `npm run build`.

## Essays (/writing)

Each essay is a markdown file, `content/writing/<slug>.md`, served at `/writing/<slug>`. Its
figures go in `public/writing/<slug>/` and the markdown names them by file name:
`![caption](diagram.svg)` alone on a line. An `.svg` is shown as a diagram, anything else as
an image. The file starts with `title`, `date`, `summary`, `standfirst` and `draft` lines
between `---`, and a `## Further reading` list of `- [title](pdf link): note (N pages)`
becomes the reading block. The header of
[`scripts/writing.js`](scripts/writing.js) has the full format.

An essay with `draft: true` is kept off `/writing`. You can read it only at the preview path,
under `<preview>/writing/<slug>`. To publish an essay, delete its draft line and update the
last test in `src/writing/Writing.test.js`, which is there so nothing goes out by accident.
The look lives in `src/writing/Writing.css` alone.

`content/writing/_examples/` holds the worked example of the format, with its figures beside
it. The build never reads it, so it is on no page, and the tests parse it. While there are no
essays, the draft page leaves out its Essays link and section, and `/writing` says "Nothing
here yet."

Essays are written in the library, from the essay template, and published by PR:
[`docs/publish-essay.md`](docs/publish-essay.md) says how.

## The AI portfolio

The AI portfolio is one markdown file, `content/portfolio/ai.md`, shown as an essay-like page
with clips and figures, and as a PDF. For now it's live only at a hidden preview path.
[`docs/portfolio.md`](docs/portfolio.md) explains where it's shown, how it's edited in the
library and how to carry an edit to the site.

## Checks

Every pull request and every push to `main` runs the tests and a production build on
GitHub Actions (`.github/workflows/ci.yml`). The result is the tick or cross beside the
commit, and the PR's **Checks** tab; the full logs are under the repo's
[Actions](https://github.com/ihsan-sa/website/actions) tab. A newer push cancels the run
it replaces. Nothing is deployed from there.

To check the pages in a real browser: `npm run build && npm run ui-check`. It serves the
build, opens the front page, the preview, `/writing` and every essay (drafts at the preview
path) at phone (390×844) and desktop (1440×900)
widths in light and dark, opens every folded row, flips the theme, and checks every link
and PDF answers. It covers the two static pages too, and loads each with JavaScript off to
check that all its `content.json` copy is in the raw HTML and on screen. Screenshots and `report.json` land in `ui-check-out/`; it exits non-zero
when something is off. It needs Playwright's Chromium 1234 (`npx playwright-core@1.62.1
install chromium`); it runs on this machine, not in CI.

## The page

One single-column page built from `content.json`'s `prototype` block and styled by
`src/Preview.css`. It loads Newsreader 600 from Google Fonts itself. Each experience and AI
row starts folded to its one line and opens on a click; the project grid is never folded.

The front page is that block minus its documents (`src/frontPage.js`): the PDFs beside the
AI work heading and any row's `docs` and `start` are left off, and it lists only published
essays, of which there are none yet. Until one is published, `/writing` and anything under
it show the front page, like any unknown path.

The draft renders the whole block, documents and draft essays included, only at the
unguessable `PREVIEW_PATH` in `src/App.js`. `public/_redirects` serves `index.html` there,
the page adds `noindex` at runtime, and nothing links to it.

The draft also shows the owner's photos down both side margins, on screens 1280px wide and
up; the front page does not, until he approves them. The list, with each photo's alt text, is
`src/sidePhotos.js`, and the files are `public/images/side/`: web copies about 900px on the
long edge, under 150 kB, with no EXIF or GPS. Never add a camera original.

### The static version (under review)

`npm run build` also runs `scripts/build-static.js`, which writes the same two pages from
`content.json` as plain HTML + CSS, with no React: the front page (no documents, no
essays) at `STATIC_PATH` in that script and the draft at `STATIC_PATH/draft/`. It writes `/writing` and each essay there too,
at `STATIC_PATH/writing/`, styled by `src/writing/Writing.css` alone; as at the preview
path, drafts are listed there, marked Draft. They read in full with JavaScript off, so
scrapers, crawlers and link previewers see the text. The only script is the theme toggle's
few lines (hidden until it runs; without it the OS theme applies), and the draft's rows fold
with `<details>`. The `<head>` (tab title, link-preview tags, fonts) and the analytics beacon
are copied from `public/index.html`. Both pages carry a `noindex` meta, nothing links to
them and robots.txt does not name them; they are real files, so no `_redirects` rule is
needed. `/` stays the React page.

## Where everything else lives

| File | What's in it |
|---|---|
| `src/content.json` | all copy and links |
| `src/stats.json` | the counted numbers the `{autobox.prs}`-style placeholders show ([docs](docs/stats.md)) |
| `scripts/stats.js` | counts the box's merged PRs and opens a PR when the rounded text changes ([docs](docs/stats.md)) |
| `scripts/content-pdf.js` | the text as a library PDF, and an edited revision back into `content.json` ([docs](docs/content-pdf.md)) |
| `src/content.shelved.json` | AI work rows taken off the site; nothing imports it, so none of it ships |
| `src/App.js` | page structure and the theme toggle — rarely needs changing |
| `src/Preview.css` | the page's styling, every rule scoped under `.pv` |
| `src/index.css` | colours (light **and** dark), fonts, spacing — the design tokens |
| `public/index.html` | tab title, link-preview description, web fonts, analytics, theme pre-paint script |

## Dark mode

Light and dark, warm in both. Two rules:

1. An explicit click on the toggle wins and persists in `localStorage['ihsan-theme']`,
   applied as `data-theme` on `<html>`.
2. With no stored choice, the OS preference decides — handled purely in CSS, so it works
   before any JavaScript runs.

Both palettes are token blocks at the top of `src/index.css`; the dark values appear twice
(once for the explicit choice, once for the OS default) and **must be kept in sync**.

The small inline `<script>` in `public/index.html` applies the stored theme *before first
paint*. Without it, dark-mode visitors get a white flash on every load. Don't move it into
a component, and don't make it `defer`/`async`.

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)

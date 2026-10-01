# The AI portfolio

The AI portfolio is one markdown file, `content/portfolio/ai.md`. The page and its PDF are
both built from it, and the owner edits it as the library document **AI portfolio** in the
project **Career/AI Portfolio**. The header of [`scripts/portfolio.js`](../scripts/portfolio.js)
has the markdown format, the media comments included.

## Where it is shown

Only at the preview path plus `/aiportfolio` (`PORTFOLIO_PREVIEW_PATH` in `src/App.js`), with
noindex. `/aiportfolio` and the front page don't know about it until the owner says it may go
live. The page's PDF link opens `PDF_HREF` in `scripts/portfolio.js`, a file under
`public/portfolio/` with an unguessable name for the same reason. The older portfolio PDF stays
at `/docs/ai-portfolio.pdf`.

## Media

A path in a media comment names a file under `public/`: the figures the page uses sit in
`public/portfolio/`, and the clips are the Autobox essay's own, under `/writing/autobox/`.
Each `.svg` also needs its PDF at the same path under `content/portfolio/print/`, because the
PDF build places that instead. A comment that names no file is a placeholder: the build lists
it and the page leaves it out.

## Commands

```
npm run portfolio -- pdf     rebuild the PDF the page links to, from ai.md
npm run portfolio -- file    file ai.md in the library as the next revision of AI portfolio
npm run portfolio -- pull <PPP-NNNN-R>
                             write that revision's markdown over content/portfolio/ai.md
```

`npm start`, `npm run build` and `npm test` parse `ai.md` themselves (`portfolio.js build`).

## "publish portfolio rev R"

The owner edits the markdown in the library's editor, and each send files a revision. To carry
one to the site, a session in this repo:

1. Finds the revision's number with `cc-docs list --project "Career/AI Portfolio"`.
2. On a branch, runs `npm run portfolio -- pull <number>`, then `npm run portfolio -- pdf`.
   The pull exits 1 and lists any media file the markdown names that `public/` lacks; copy it in.
3. Reads `git diff content/portfolio/ai.md` against his edits, runs `npm test`, and opens a PR.

`file` is only for a change made to `ai.md` in the repo. Run it after that change merges, so
the library's current revision matches the site again. It files nothing when they already match.

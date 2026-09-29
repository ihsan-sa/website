# Writing an essay in the library, and publishing it

Essays are written as PDFs in the document library, in project **Website**, and reach the
site as markdown through a PR. The template is **Essay template** (012-0002), built from
`content/essay-template/`. It shows every piece the site's essay format has, with short
placeholder text, and its comments name the macro for each.

## "start essay <title>"

A session in this repo runs

```
node scripts/publish-essay.js start "<title>"
```

It copies the template, writes the title, a slug made from it and today's date into the copy,
builds it and files it as a new library document titled `Essay: <title>`. It prints the
number; tell the owner, who writes in the library's edit mode. Each save there files the next
revision. `--no-file` builds the copy without filing it, to look at first.

## "publish essay <number> rev <R>"

1. The revision is `<number>-<R>`, such as `012-0003-B` (`cc-docs list --project Website`).
2. On a branch, run `node scripts/publish-essay.js 012-0003-B`. It reads that revision's kept
   LaTeX source, writes `content/writing/<slug>.md`, and copies the figures into
   `public/writing/<slug>/`: each diagram as the SVG the build made beside its PDF, each
   image as it is. It prints `by hand <what>` for anything it could not map, then parses the
   essay as the build will and lists that parser's problems too.
3. Settle every `by hand` line in the markdown: a table or an equation has no form on the
   site, so write it as prose or a figure. The command exits 1 while any are listed.
4. A revision that says `\essaydraft{true}` (the default) goes up as a draft, shown only at
   the preview path. When it says `false`, the essay is published: also update the last test
   in `src/writing/Writing.test.js`, which lists the published essays so none goes out by
   accident.
5. Run `npm test`, read the markdown against the PDF, and open a PR. Its UI check screenshots
   every essay page.

A later revision of the same essay is the same command on the new letter; it overwrites the
markdown and the figures, so `git diff` shows what changed.

## How each piece maps

| In the template | In `content/writing/<slug>.md` |
|---|---|
| `\essaytitle`, `\essaydate`, `\essaysummary`, `\essayblurb`, `\essaystandfirst` | the front matter lines of the same names (an empty blurb is left out) |
| `\essayslug{s}` | the file name, `s.md`, and the address `/writing/s` |
| `\essaydraft{true}` / `{false}` | `draft: true` / no draft line |
| `\section{}`, `\subsection{}` | `##`, `###` |
| `\emph{}`, `\textbf{}`, `\texttt{}`, `\href{url}{text}` | `*em*`, `**strong**`, `` `code` ``, `[text](url)` |
| `itemize`, `enumerate` | `- ` and `1. ` lists |
| `\includesvg[caption]{figures/x}` | `![caption](x.svg)`, with `figures/x.svg` copied |
| `\essayimage{figures/x.png}{caption}` | `![caption](x.png)`, with the file copied |
| `\essayquote{}` | `> ` the one pull quote |
| `\essaycode{lang}` and a `Verbatim` block | a fenced block, `` ```lang `` |
| `\essaynote{}` | `[^n]` where it is cited, `[^n]: text` at the end |
| `essayreading` with `\readingitem{title}{href}{note}{pages}` | `## Further reading` and `- [title](href): note (N pages).` |

A diagram is written as `\includesvg` because that name is what makes the library keep the
SVG with the source; the template defines it to show the PDF, and no svg package is loaded.
Its figure is a diagram-maker spec, `figures/<name>.json`, which the build renders to both.

`content/writing/_examples/` has a worked essay in the markdown form, which the tests parse.

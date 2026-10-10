# Editing the site's text in the document library

The site's body text (the name and subtitle, the about paragraphs, experience, AI work,
projects, the link labels, captions and image descriptions) is the document **Website
content** in the project **Website**. The library keeps it as Markdown,
[`content/site-text.md`](../content/site-text.md), laid out in the page's order: plain
prose under headings, which the library renders to a PDF and lets the owner edit as text.

It renders the `prototype` block, the draft of the next front page served at the hidden
path, because that block holds everything the front page has plus a result and detail per
row. Publishing a revision changes the draft page, never the front page.

## The Markdown form (the site text goes this way now)

[`library.json`](../library.json) at the repo root declares the document for the library:
its `content` is `content/site-text.md` and its `rebuild` is
`node scripts/content-md.js pull`. So:

- **Filing.** Whenever the document is filed from this repo, the library keeps the `.md`
  as it is committed. Run `npm run content-md -- md` after any change to the
  `prototype` block and commit the `.md` with it; `npm test` fails while the committed
  file is not what `src/content.json` renders to.
- **Carry-back.** When the owner saves an edited revision, the library checks out a
  branch `library/<number>` from `main`, writes the edited Markdown to `content/site-text.md`,
  runs the `rebuild` there, commits what changed and opens a PR, which lands the usual way.
  Nobody has to run anything by hand.

Each string is one paragraph or heading ending in a hidden marker,
`<!-- prototype.experience.items.0.result -->`, which names where it lives in
`src/content.json`. A short italic label such as `*On a phone:*` before a paragraph says
what the string is and is not part of it. Line breaks inside a paragraph don't matter.
Characters Markdown would read as formatting are written with a backslash (`\*`, `\_`),
and a space at either end of a string as `&#32;`; both come back as the plain text.

`pull` writes each changed string over that one string in `src/content.json`, keeping the
file's layout, and a pull of the untouched `.md` changes nothing. It never adds, removes
or reorders entries. When anything cannot be mapped (a paragraph with no marker, a marker
whose path is not a string in the file or appears twice, a marker gone from the document,
or text with Markdown formatting such as `**bold**`), it lists each one, writes nothing at
all and exits 1, so the carry-back opens no PR on that edit. A new or removed entry, a
link, an image or a number is changed in `src/content.json` directly, followed by
`npm run content-md -- md`.

A number the box counts stays as its placeholder, `{autobox.prs}`, in the Markdown as in
`src/content.json`; [`stats.md`](stats.md) lists the names.

## The LaTeX form (essays, and the earlier route)

The LaTeX PDF below was the first way the site text went through the library. Essays
still go through LaTeX ([`publish-essay.md`](publish-essay.md)), and the site text's
LaTeX route still works for a revision filed before the Markdown form, but a new filing of
**Website content** is the Markdown one, so don't run `content-pdf -- file` for it.

### Building a LaTeX revision from the file

```
npm run content-pdf -- file
```

This writes `content-pdf/site-content.tex` (ignored by git), builds it with
pdf-material-builder's `build.sh` and files it with `cc-docs`. When the text is unchanged
since the current revision, nothing new is filed. `npm run content-pdf -- tex` writes the
`.tex` alone.

Run `file` only once every revision the owner edited has been published: it files what
`src/content.json` says, so an unpublished edit would stop being the current revision
(it stays in the library as the earlier one, and can still be pulled by its number).

### "publish site content rev R" (a LaTeX revision)

When the owner says this, a session in this repo:

1. Finds the revision's number: `cc-docs list --project Website` shows the current one;
   rev R of it is the same number with R as its last letter (`0NN-0001-C`).
2. Runs `npm run content-pdf -- pull <number>` on a branch. It reads that revision's kept
   LaTeX source from the library and writes each changed string into `src/content.json`,
   keeping the file's layout. It prints `changed <path>` per field it wrote and
   `by hand <path>: <why>` for anything it could not map.
3. Settles every `by hand` line in `src/content.json` itself: a new entry (copy a
   neighbour's block, give it its link and image), a removed one, or text written with a
   LaTeX command such as `\emph{}`, which the site cannot show (write it as plain text).
   The command exits 1 while any are listed; that is expected, not a failure.
4. Reads `git diff src/content.json` against the owner's edits, runs `npm test`, and opens
   a PR. The site's usual checks run on it, the UI check included; nothing else is needed.
5. After the merge, runs `npm run content-pdf -- file` so the library's current revision
   matches the site again (it files nothing when the text already matches).

### How the text is marked in the LaTeX

Each editable string sits in the `.tex` as `\cf{<json path>}{<text>}`, and `\cf` prints
only the text. Edit inside the second braces; leave the first alone, since it says where
the text lives in `src/content.json`. Line breaks inside the text don't matter, and `\&`,
`\%` and the like come back as the plain character. Links, page counts and images are not
in the document, so they are changed in `src/content.json` directly.

A number the box counts goes in as its placeholder, such as `\{autobox.prs\}`: the PDF
prints it as `{autobox.prs}`, and a pull writes it into `src/content.json` unchanged (bare
braces, `{autobox.prs}`, come back the same way). The site fills it in when it builds;
[`stats.md`](stats.md) lists the names.

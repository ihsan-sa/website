# Editing the site's text as a PDF

The site's body text (the name and subtitle, the about paragraphs, experience, AI work,
projects and the link labels) can be read and edited as a PDF in the document library,
laid out in the page's order. It's the document **Website content** in the project
**Website**. The library's edit mode changes its LaTeX and files a new revision; a session
then carries that revision's text into `src/content.json` through a PR.

It renders the `prototype` block, the draft of the next front page served at the hidden
path, because that block holds everything the front page has plus a result and detail per
row. Publishing a revision changes the draft page, never the front page.

## Building a revision from the file

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

## "publish site content rev R"

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

## How the text is marked

Each editable string sits in the `.tex` as `\cf{<json path>}{<text>}`, and `\cf` prints
only the text. Edit inside the second braces; leave the first alone, since it says where
the text lives in `src/content.json`. Line breaks inside the text don't matter, and `\&`,
`\%` and the like come back as the plain character. Links, page counts and images are not
in the document, so they are changed in `src/content.json` directly.

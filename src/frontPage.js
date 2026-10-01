// The front page (ihsan.cc/) is content.json's `prototype` block as the draft at
// PREVIEW_PATH shows it, minus its documents: a section's `docs` beside its
// heading and a row's `docs` and `start` in its fold. The owner kept the PDFs
// off the front page; the draft still shows them. A section's `headLink` (the
// Hardware portfolio), every row's own link (GitHub, project pages) and each AI
// row's `visual` and `figure` stay.
// Both builds call it: App.js for the React page and scripts/build-static.js
// for the static one. CommonJS, like fillStats.js, so the script can require it.

function withoutDocs(section) {
  const { docs, ...rest } = section;
  return {
    ...rest,
    items: rest.items.map(({ docs: rowDocs, start, ...row }) => row),
  };
}

function frontPage(block) {
  return {
    ...block,
    experience: withoutDocs(block.experience),
    aiWork: withoutDocs(block.aiWork),
  };
}

module.exports = { frontPage };

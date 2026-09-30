// Fills the stat placeholders in content.json's strings from src/stats.json, so a line such
// as "over {autobox.prs} PRs across {autobox.repos} repos" shows the number the box last
// counted (scripts/stats.js writes the file; docs/stats.md). Both builds call it: App.js for
// the React page and scripts/build-static.js for the static ones.
//
// A placeholder is {<group>.<name>} in lower-case letters, digits and underscores. One that
// src/stats.json does not have throws, so a typo or a stat nobody counts fails the build
// instead of printing braces on the site. CommonJS, so scripts/build-static.js can require it.

const PLACEHOLDER = /\{([a-z][a-z0-9_]*)\.([a-z][a-z0-9_]*)\}/g;

function fillString(s, stats, where) {
  return s.replace(PLACEHOLDER, (whole, group, name) => {
    const v = stats[group] && stats[group][name];
    if (typeof v !== 'string' && typeof v !== 'number') {
      throw new Error(`${where}: ${whole} is not in src/stats.json`);
    }
    return String(v);
  });
}

// A copy of `content` with every placeholder in every string filled.
function fillStats(content, stats, where = 'content.json') {
  if (typeof content === 'string') return fillString(content, stats, where);
  if (Array.isArray(content)) return content.map((v, i) => fillStats(v, stats, `${where}.${i}`));
  if (content && typeof content === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(content)) out[k] = fillStats(v, stats, `${where}.${k}`);
    return out;
  }
  return content;
}

module.exports = { fillStats };

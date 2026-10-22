#!/usr/bin/env node
// Counts the numbers the front page's AI rows show and keeps src/stats.json current.
// See docs/stats.md.
//
//   node scripts/stats.js count     print the counts and the text they round to; writes nothing
//   node scripts/stats.js update    when the shown text differs from origin/main's
//                                   src/stats.json, open a PR that changes it and queue the
//                                   PR on the lander (cc-land queue website <n>); otherwise
//                                   print "unchanged" and do nothing, so a quiet night makes
//                                   no commit
//
// The PR counts come from GitHub, not the lander's queue.log: every repo the gh account owns,
// each one's merged pull requests. queue.log only starts on 2026-09-01, so it misses every PR
// merged before the lander ran them and could not reach the "1,100 PRs" the line first said.
// The Hive's PRs are the ones from a dispatch/ branch, which each of its runs pushes; they are
// the Hive's count and are left out of autobox's. `repos` counts the repos with at least one.
//
// The other counts are files in the projects' own repos: hwde's boards are the products in
// ihsan-sa/boards' register.yaml, lesson-builder's lessons the directories under
// lessons/<course>/claude_lessons/ in ihsan-sa/lessons (a topic is a course with a lesson), and
// the chip flow's circuits the designs under corpus/<skill>/ in ihsan-sa/chip-flow.
//
// src/stats.json holds what the site shows: prs is rounded down to the hundred below the count
// ("over 1,100" for 1,100 up to 1,199, and for exactly 1,100 it says 1,000, since "over 1,100"
// would then be false); the rest are exact. merged is the exact PR count at asOf, the day the
// shown text last changed, and hive.day is that day as the page writes it.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { formatDate } = require('./writing');

const ROOT = path.resolve(__dirname, '..');
const STATS = 'src/stats.json';
const REPO = 'website';
const BRANCH_PREFIX = 'stats/';
const HIVE_BRANCH = 'dispatch/';

const QUERY = `query($after: String) {
  viewer { repositories(first: 100, after: $after, ownerAffiliations: OWNER) {
    pageInfo { hasNextPage endCursor }
    nodes { nameWithOwner pullRequests(states: MERGED) { totalCount } }
  } }
}`;

const TREES = `
  boards: repository(owner: "ihsan-sa", name: "boards") { object(expression: "HEAD:register.yaml") { ... on Blob { text } } }
  lessons: repository(owner: "ihsan-sa", name: "lessons") { object(expression: "HEAD:lessons") { ... on Tree {
    entries { type object { ... on Tree { entries { name object { ... on Tree { entries { type } } } } } } } } } }
  chip: repository(owner: "ihsan-sa", name: "chip-flow") { object(expression: "HEAD:corpus") { ... on Tree {
    entries { object { ... on Tree { entries { type } } } } } } }`;

// [{ pullRequests: { totalCount }, hive }] → { autobox: { merged, repos }, hive: { merged, repos } }
function tally(nodes) {
  const sum = (count) => {
    const ns = nodes.map(count).filter((n) => n > 0);
    return { merged: ns.reduce((s, n) => s + n, 0), repos: ns.length };
  };
  return { autobox: sum((n) => n.pullRequests.totalCount - (n.hive || 0)), hive: sum((n) => n.hive || 0) };
}

// The TREES answer → { boards, lessons, topics, circuits }
function fromTrees({ boards, lessons, chip }) {
  const dirs = (o) => (o?.entries || []).filter((e) => e.type === 'tree');
  const perCourse = (lessons.object?.entries || []).filter((e) => e.type === 'tree')
    .map((c) => dirs((c.object?.entries || []).find((e) => e.name === 'claude_lessons')?.object).length)
    .filter((n) => n > 0);
  return {
    boards: (boards.object.text.match(/^ {2}PCB-\d{4}:/gm) || []).length,
    lessons: perCourse.reduce((s, n) => s + n, 0),
    topics: perCourse.length,
    circuits: (chip.object?.entries || []).reduce((s, skill) => s + dirs(skill.object).length, 0),
  };
}

// The number the line can say it is "over": the hundred strictly below n.
function roundOver(n) {
  return Math.max(0, Math.floor((n - 1) / 100) * 100);
}

const withCommas = (n) => n.toLocaleString('en-US');

// What src/stats.json should say for counts taken on `date`.
function statsFor({ autobox, hive, boards, lessons, topics, circuits }, date = new Date()) {
  const asOf = date.toISOString().slice(0, 10);
  const prs = ({ merged, repos }) => ({ prs: withCommas(roundOver(merged)), repos: String(repos), merged, asOf });
  return {
    autobox: prs(autobox),
    hive: { ...prs(hive), day: formatDate(asOf) },
    hwde: { boards },
    lessons: { count: lessons, topics },
    chip: { circuits },
  };
}

// Only the counts the site shows decide whether a new file lands; the exact PR count and the
// dates go along with them.
const UNSHOWN = ['merged', 'asOf', 'day'];
const shown = (s) => JSON.stringify(Object.keys(s || {}).sort()
  .map((g) => [g, Object.keys(s[g]).sort().filter((k) => !UNSHOWN.includes(k)).map((k) => [k, s[g][k]])]));
const shownChanged = (a, b) => shown(a) !== shown(b);

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { encoding: 'utf8', cwd: ROOT, ...opts }).trim();
const graphql = (query, vars = {}) => JSON.parse(run('gh', ['api', 'graphql', '-f', `query=${query}`,
  ...Object.entries(vars).flatMap(([k, v]) => ['-f', `${k}=${v}`])])).data;

function countFromGitHub() {
  const nodes = [];
  let after = null;
  for (;;) {
    const page = graphql(QUERY, after ? { after } : {}).viewer.repositories;
    nodes.push(...page.nodes.filter((n) => n.pullRequests.totalCount > 0));
    if (!page.pageInfo.hasNextPage) break;
    after = page.pageInfo.endCursor;
  }
  // One query: the Hive's merged PRs in each repo (one search each) and the projects' files.
  const searches = nodes.map((n, i) => `r${i}: search(query: ${JSON.stringify(`repo:${n.nameWithOwner} is:pr is:merged head:${HIVE_BRANCH}`)}, type: ISSUE, first: 1) { issueCount }`);
  const d = graphql(`query { ${searches.join('\n')} ${TREES} }`);
  nodes.forEach((n, i) => { n.hive = d[`r${i}`].issueCount; });
  return { ...tally(nodes), ...fromTrees(d) };
}

const summary = (s) => `autobox over ${s.autobox.prs} PRs across ${s.autobox.repos} repos (${s.autobox.merged} merged), `
  + `the Hive over ${s.hive.prs} across ${s.hive.repos} (${s.hive.merged}), ${s.hwde.boards} boards, `
  + `${s.lessons.count} lessons across ${s.lessons.topics} topics, ${s.chip.circuits} circuits`;

function update() {
  const fresh = statsFor(countFromGitHub());
  run('git', ['fetch', '--quiet', 'origin', 'main']);
  const current = JSON.parse(run('git', ['show', `origin/main:${STATS}`]));
  if (!shownChanged(current, fresh)) {
    console.log(`unchanged: ${summary(fresh)}`);
    return 0;
  }
  // One stats PR at a time: a night whose PR has not landed yet leaves the next night alone.
  const open = JSON.parse(run('gh', ['pr', 'list', '--state', 'open', '--json', 'headRefName']))
    .filter((p) => p.headRefName.startsWith(BRANCH_PREFIX));
  if (open.length) {
    console.log(`waiting: ${open[0].headRefName} is still open`);
    return 0;
  }
  const branch = `${BRANCH_PREFIX}${fresh.autobox.asOf}`;
  const title = `Front page counts as of ${fresh.autobox.asOf}`;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'website-stats-'));
  run('git', ['worktree', 'add', '--quiet', '-B', branch, dir, 'origin/main']);
  try {
    fs.writeFileSync(path.join(dir, STATS), `${JSON.stringify(fresh, null, 2)}\n`);
    run('git', ['commit', '--quiet', '-m', title, '--', STATS], { cwd: dir });
    run('git', ['push', '--quiet', '--force', '-u', 'origin', branch], { cwd: dir });
  } finally {
    run('git', ['worktree', 'remove', '--force', dir]);
  }
  const body = `scripts/stats.js counted ${summary(fresh)} on ${fresh.autobox.asOf}, which changes what the front page shows. Only src/stats.json changes.`;
  const url = run('gh', ['pr', 'create', '--base', 'main', '--head', branch, '--title', title, '--body', body]);
  const pr = url.split('/').pop();
  run('cc-land', ['queue', REPO, pr]);
  console.log(`opened and queued ${url}`);
  return 0;
}

function main([cmd]) {
  if (cmd === 'count') {
    console.log(summary(statsFor(countFromGitHub())));
    return 0;
  }
  if (cmd === 'update') return update();
  console.error('usage: stats.js count | update');
  return 2;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));

module.exports = { tally, fromTrees, roundOver, statsFor, shownChanged };

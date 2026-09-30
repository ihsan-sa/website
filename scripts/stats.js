#!/usr/bin/env node
// Counts the box's merged PRs for the autobox line and keeps src/stats.json current.
// See docs/stats.md.
//
//   node scripts/stats.js count     print the count and the text it rounds to; writes nothing
//   node scripts/stats.js update    when the rounded text differs from origin/main's
//                                   src/stats.json, open a PR that changes it and queue the
//                                   PR on the lander (cc-land queue website <n>); otherwise
//                                   print "unchanged" and do nothing, so a quiet night makes
//                                   no commit
//
// The count comes from GitHub, not the lander's queue.log: every repo the gh account owns,
// each one's merged pull requests. queue.log only starts on 2026-09-01, so it misses every PR
// merged before the lander ran them and could not reach the "1,100 PRs" the line first said.
// `repos` counts the repos with at least one merged PR.
//
// src/stats.json holds what the site shows, as text: prs is rounded down to the hundred below
// the count ("over 1,100" for 1,100 up to 1,199, and for exactly 1,100 it says 1,000, since
// "over 1,100" would then be false); repos is the exact count. merged is the exact count at
// asOf, the day the rounded text last changed.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const STATS = 'src/stats.json';
const REPO = 'website';
const BRANCH_PREFIX = 'stats/';

const QUERY = `query($after: String) {
  viewer { repositories(first: 100, after: $after, ownerAffiliations: OWNER) {
    pageInfo { hasNextPage endCursor }
    nodes { name pullRequests(states: MERGED) { totalCount } }
  } }
}`;

// [{ name, pullRequests: { totalCount } }] → { merged, repos }
function tally(nodes) {
  const withPrs = nodes.filter((n) => n.pullRequests.totalCount > 0);
  return { merged: withPrs.reduce((s, n) => s + n.pullRequests.totalCount, 0), repos: withPrs.length };
}

// The number the line can say it is "over": the hundred strictly below n.
function roundOver(n) {
  return Math.max(0, Math.floor((n - 1) / 100) * 100);
}

const withCommas = (n) => n.toLocaleString('en-US');

// What src/stats.json should say for a count taken on `date`.
function statsFor({ merged, repos }, date = new Date()) {
  return {
    autobox: {
      prs: withCommas(roundOver(merged)),
      repos: String(repos),
      merged,
      asOf: date.toISOString().slice(0, 10),
    },
  };
}

// Only the text the site shows decides whether a new file lands.
const shownChanged = (a, b) => ['prs', 'repos'].some((k) => (a?.autobox?.[k] ?? null) !== (b?.autobox?.[k] ?? null));

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { encoding: 'utf8', cwd: ROOT, ...opts }).trim();

function countFromGitHub() {
  const nodes = [];
  let after = null;
  for (;;) {
    const args = ['api', 'graphql', '-f', `query=${QUERY}`];
    if (after) args.push('-f', `after=${after}`);
    const page = JSON.parse(run('gh', args)).data.viewer.repositories;
    nodes.push(...page.nodes);
    if (!page.pageInfo.hasNextPage) break;
    after = page.pageInfo.endCursor;
  }
  return tally(nodes);
}

function update() {
  const fresh = statsFor(countFromGitHub());
  run('git', ['fetch', '--quiet', 'origin', 'main']);
  const current = JSON.parse(run('git', ['show', `origin/main:${STATS}`]));
  if (!shownChanged(current, fresh)) {
    console.log(`unchanged: over ${fresh.autobox.prs} PRs across ${fresh.autobox.repos} repos (${fresh.autobox.merged} merged)`);
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
  const title = `Autobox line now reads over ${fresh.autobox.prs} PRs across ${fresh.autobox.repos} repos`;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'website-stats-'));
  run('git', ['worktree', 'add', '--quiet', '-B', branch, dir, 'origin/main']);
  try {
    fs.writeFileSync(path.join(dir, STATS), `${JSON.stringify(fresh, null, 2)}\n`);
    run('git', ['commit', '--quiet', '-m', title, '--', STATS], { cwd: dir });
    run('git', ['push', '--quiet', '--force', '-u', 'origin', branch], { cwd: dir });
  } finally {
    run('git', ['worktree', 'remove', '--force', dir]);
  }
  const body = `scripts/stats.js counted ${fresh.autobox.merged} merged PRs across ${fresh.autobox.repos} repos on ${fresh.autobox.asOf}, `
    + `so the line's rounded text changed from "over ${current.autobox.prs} PRs across ${current.autobox.repos} repos". Only src/stats.json changes.`;
  const url = run('gh', ['pr', 'create', '--base', 'main', '--head', branch, '--title', title, '--body', body]);
  const pr = url.split('/').pop();
  run('cc-land', ['queue', REPO, pr]);
  console.log(`opened and queued ${url}`);
  return 0;
}

function main([cmd]) {
  if (cmd === 'count') {
    const s = statsFor(countFromGitHub()).autobox;
    console.log(`${s.merged} merged PRs across ${s.repos} repos: over ${s.prs} PRs across ${s.repos} repos`);
    return 0;
  }
  if (cmd === 'update') return update();
  console.error('usage: stats.js count | update');
  return 2;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));

module.exports = { tally, roundOver, statsFor, shownChanged };

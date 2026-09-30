// The autobox line's numbers: counting (scripts/stats.js) and filling them into the page
// (src/fillStats.js, used by both builds).
const fs = require('fs');
const os = require('os');
const path = require('path');
const { tally, roundOver, statsFor, shownChanged } = require('../scripts/stats');
const { fillStats } = require('./fillStats');
const { build } = require('../scripts/build-static');
const { toTex, applyEdits, renderTex } = require('../scripts/content-pdf');

const repo = (name, n) => ({ name, pullRequests: { totalCount: n } });

test('the count adds merged PRs and counts only repos that have one', () => {
  expect(tally([repo('a', 794), repo('b', 0), repo('c', 306), repo('d', 1)])).toEqual({ merged: 1101, repos: 3 });
  expect(tally([])).toEqual({ merged: 0, repos: 0 });
});

test('it rounds to the hundred the count is over, as the line reads', () => {
  expect(roundOver(1199)).toBe(1100);
  expect(roundOver(1101)).toBe(1100);
  expect(roundOver(1100)).toBe(1000); // "over 1,100" would be false
  expect(roundOver(1394)).toBe(1300);
  expect(roundOver(0)).toBe(0);
  expect(statsFor({ merged: 1394, repos: 24 }, new Date('2026-09-30T23:00:00Z')))
    .toEqual({ autobox: { prs: '1,300', repos: '24', merged: 1394, asOf: '2026-09-30' } });
});

test('only a change in the shown text makes a new file', () => {
  const was = statsFor({ merged: 1310, repos: 24 }, new Date('2026-09-01'));
  expect(shownChanged(was, statsFor({ merged: 1394, repos: 24 }))).toBe(false);
  expect(shownChanged(was, statsFor({ merged: 1401, repos: 24 }))).toBe(true);
  expect(shownChanged(was, statsFor({ merged: 1394, repos: 25 }))).toBe(true);
  expect(shownChanged({}, was)).toBe(true);
});

const stats = { autobox: { prs: '1,100', repos: '18' } };

test('placeholders in every string are filled, and the rest is left alone', () => {
  const content = { a: 'over {autobox.prs} PRs across {autobox.repos} repos', b: ['{x}', 'plain'], n: 3, t: true, z: null };
  expect(fillStats(content, stats)).toEqual({ a: 'over 1,100 PRs across 18 repos', b: ['{x}', 'plain'], n: 3, t: true, z: null });
  expect(content.a).toContain('{autobox.prs}'); // the input is not changed
});

test('a placeholder with no stat fails, naming where it is', () => {
  expect(() => fillStats({ p: { items: ['{autobox.stars}'] } }, stats))
    .toThrow('content.json.p.items.0: {autobox.stars} is not in src/stats.json');
  expect(() => fillStats({ s: '{nobox.prs}' }, stats)).toThrow('{nobox.prs}');
});

test('the repo\'s own content.json and stats.json build together', () => {
  const content = JSON.parse(fs.readFileSync(path.join(__dirname, 'content.json'), 'utf8'));
  expect(() => fillStats(content, require('./stats.json'))).not.toThrow();
});

test('the static build fills a placeholder and fails on a missing one', () => {
  const root = path.join(__dirname, '..');
  const real = fs.readFileSync(path.join(root, 'src/content.json'), 'utf8');
  const withLine = (s) => {
    const c = JSON.parse(real);
    c.prototype.subtitle = s;
    return JSON.stringify(c);
  };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stats-build-'));
  const read = fs.readFileSync;
  const spy = jest.spyOn(fs, 'readFileSync');
  try {
    spy.mockImplementation((f, ...rest) => (String(f).endsWith(path.join('src', 'content.json'))
      ? withLine('over {autobox.prs} PRs across {autobox.repos} repos') : read(f, ...rest)));
    const { DRAFT_PATH } = require('../scripts/build-static');
    build(dir, []);
    const { prs, repos } = require('./stats.json').autobox;
    const html = read(path.join(dir, DRAFT_PATH, 'index.html'), 'utf8');
    expect(html).toContain(`over ${prs} PRs across ${repos} repos`);
    expect(html).not.toContain('{autobox.');
    spy.mockImplementation((f, ...rest) => (String(f).endsWith(path.join('src', 'content.json'))
      ? withLine('over {autobox.stars}') : read(f, ...rest)));
    expect(() => build(dir, [])).toThrow('{autobox.stars} is not in src/stats.json');
  } finally {
    spy.mockRestore();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('the content PDF keeps a placeholder through edit and pull', () => {
  const text = fs.readFileSync(path.join(__dirname, 'content.json'), 'utf8');
  const tex = renderTex(JSON.parse(text), new Date('2026-09-30T12:00:00Z'));
  const field = `\\cf{prototype.subtitle}{${toTex(JSON.parse(text).prototype.subtitle)}}`;
  expect(tex).toContain(field);
  // Written escaped, as the PDF prints it, or as bare braces: both come back as the placeholder.
  for (const typed of ['over \\{autobox.prs\\} PRs across \\{autobox.repos\\} repos',
    'over {autobox.prs} PRs across {autobox.repos} repos']) {
    const { out, changed, problems } = applyEdits(text, tex.replace(field, `\\cf{prototype.subtitle}{${typed}}`));
    expect(problems).toEqual([]);
    expect(changed).toEqual(['prototype.subtitle']);
    expect(JSON.parse(out).prototype.subtitle).toBe('over {autobox.prs} PRs across {autobox.repos} repos');
  }
  // And a document built from a file that has one prints it escaped, so it reads back unchanged.
  const withLine = JSON.parse(text);
  withLine.prototype.subtitle = 'over {autobox.prs} PRs';
  const back = JSON.stringify(withLine, null, 2);
  expect(applyEdits(back, renderTex(withLine)).changed).toEqual([]);
});

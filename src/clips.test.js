// The clips sync (scripts/clips.js): which drop files are newer than the site's, and turning one
// into the site's files. Each test builds its own drop and site in a temp dir from the tiny
// fixture clip (3 frames, 32x18).
const fs = require('fs');
const os = require('os');
const path = require('path');
const { plan, probe, toWebp, updateRefs, apply, titleFor } = require('../scripts/clips');
const real = require('./clips.json');

const FIXTURE = path.join(__dirname, 'fixtures', 'tiny-clip.gif');
const FIXTURE_SHA = require('crypto').createHash('sha256').update(fs.readFileSync(FIXTURE)).digest('hex');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'clips-test-'));

const manifest = (from) => ({
  drop: 'unused',
  maxBytes: 2500000,
  posterMaxBytes: 60000,
  videoMaxBytes: 1000,
  ignore: ['hero-full'],
  clips: {
    hero: { webp: 'public/c/hero.webp', poster: 'public/c/hero-poster.webp', video: 'public/c/hero.mp4', from },
  },
});

test('the real manifest maps every slot to a file the site has', () => {
  for (const slot of Object.values(real.clips)) {
    for (const k of ['webp', 'poster', 'video']) if (slot[k]) expect(fs.existsSync(path.join(__dirname, '..', slot[k]))).toBe(true);
    expect(slot.from.gif).toMatch(/^[0-9a-f]{64}$/);
  }
});

test('a drop file is newer only when its hash differs from the one the slot was made from', () => {
  const drop = tmp();
  fs.copyFileSync(FIXTURE, path.join(drop, 'hero.gif'));
  fs.writeFileSync(path.join(drop, 'hero-full.gif'), 'ignored');
  fs.writeFileSync(path.join(drop, 'board.gif'), 'unmapped');
  fs.writeFileSync(path.join(drop, 'board-poster.webp'), 'unmapped');

  const same = plan(manifest({ gif: FIXTURE_SHA }), drop);
  expect(same.changed).toEqual([]);
  expect(same.unmapped).toEqual(['board-poster.webp', 'board.gif']);

  const stale = plan(manifest({ gif: 'f'.repeat(64) }), drop);
  expect(stale.changed).toEqual([{ name: 'hero', kind: 'gif', file: path.join(drop, 'hero.gif'), sha: FIXTURE_SHA }]);
});

test('a video or poster in the drop counts only for a slot that has one', () => {
  const drop = tmp();
  fs.writeFileSync(path.join(drop, 'hero.mp4'), 'video');
  fs.writeFileSync(path.join(drop, 'hero-poster.webp'), 'still');
  expect(plan(manifest({}), drop).changed.map((c) => c.kind)).toEqual(['video', 'poster']);
  const m = manifest({});
  delete m.clips.hero.video;
  delete m.clips.hero.poster;
  expect(plan(m, drop).changed).toEqual([]);
});

test('the GIF becomes an animated WebP with the same frames and size', () => {
  const out = path.join(tmp(), 'out.webp');
  const got = toWebp(FIXTURE, out, 2500000);
  expect(got).toMatchObject({ frames: 3, width: 32, height: 18, quality: 70 });
  expect(probe(out)).toEqual({ frames: 3, width: 32, height: 18 });
});

test('a size change moves the width and height beside that clip, and nothing else', () => {
  const root = tmp();
  fs.mkdirSync(path.join(root, 'src'));
  const content = { a: { visual: { src: '/c/hero.webp', width: 640, height: 360 } }, b: { visual: { src: '/c/other.webp', width: 640, height: 360 } } };
  fs.writeFileSync(path.join(root, 'src/content.json'), `${JSON.stringify(content, null, 2)}\n`);
  const banner = "const B = {\n  gif: '/c/hero.webp',\n  width: 720,\n  height: 405,\n};\n";
  fs.writeFileSync(path.join(root, 'src/essayBanner.js'), banner);
  fs.writeFileSync(path.join(root, 'src/other.js'), "const O = { gif: '/c/other.webp', width: 1, height: 1 };\n");

  const touched = updateRefs(root, '/c/hero.webp', { width: 32, height: 18 }, ['src/content.json', 'src/essayBanner.js', 'src/other.js']);
  expect(touched).toEqual(['src/content.json', 'src/essayBanner.js']);
  const after = JSON.parse(fs.readFileSync(path.join(root, 'src/content.json'), 'utf8'));
  expect(after.a.visual).toMatchObject({ width: 32, height: 18 });
  expect(after.b.visual).toMatchObject({ width: 640, height: 360 });
  expect(fs.readFileSync(path.join(root, 'src/essayBanner.js'), 'utf8')).toContain('width: 32,\n  height: 18,');
  expect(fs.readFileSync(path.join(root, 'src/other.js'), 'utf8')).toContain('width: 1, height: 1');
});

test('applying a new clip writes the WebP, a poster, the new hash and the new size', () => {
  const root = tmp();
  fs.mkdirSync(path.join(root, 'src'));
  fs.mkdirSync(path.join(root, 'public/c'), { recursive: true });
  // The site's current clip is 64x36, so the fixture's 32x18 is a size change.
  require('child_process').execFileSync('ffmpeg', ['-v', 'error', '-i', FIXTURE, '-vf', 'scale=64:36', '-c:v', 'libwebp', '-loop', '0', path.join(root, 'public/c/hero.webp')]);
  fs.writeFileSync(path.join(root, 'src/content.json'), `${JSON.stringify({ v: { src: '/c/hero.webp', width: 64, height: 36 } }, null, 2)}\n`);
  const drop = tmp();
  fs.copyFileSync(FIXTURE, path.join(drop, 'hero.gif'));
  fs.writeFileSync(path.join(drop, 'hero.mp4'), 'x'.repeat(2000)); // over this manifest's 1000-byte video cap
  const m = manifest({ gif: 'old', video: 'old' });

  const { files, lines } = apply(root, m, plan(m, drop).changed);
  expect(files.sort()).toEqual(['public/c/hero-poster.webp', 'public/c/hero.webp', 'src/clips.json', 'src/content.json']);
  expect(probe(path.join(root, 'public/c/hero.webp'))).toEqual({ frames: 3, width: 32, height: 18 });
  expect(probe(path.join(root, 'public/c/hero-poster.webp'))).toMatchObject({ frames: 1, width: 32, height: 18 });
  expect(JSON.parse(fs.readFileSync(path.join(root, 'src/content.json'), 'utf8')).v).toMatchObject({ width: 32, height: 18 });
  // The skipped video keeps its old hash, so the next run tries it again.
  expect(JSON.parse(fs.readFileSync(path.join(root, 'src/clips.json'), 'utf8')).clips.hero.from).toEqual({ gif: FIXTURE_SHA, video: 'old' });
  expect(lines.join('\n')).toMatch(/skipped, hero\.mp4 is/);
});

test('a poster in the drop is used as it is, so none is made from the clip', () => {
  const root = tmp();
  fs.mkdirSync(path.join(root, 'src'));
  const drop = tmp();
  fs.copyFileSync(FIXTURE, path.join(drop, 'hero.gif'));
  fs.writeFileSync(path.join(drop, 'hero-poster.webp'), 'the agent picked this frame');
  const m = manifest({});
  apply(root, m, plan(m, drop).changed);
  expect(fs.readFileSync(path.join(root, 'public/c/hero-poster.webp'), 'utf8')).toBe('the agent picked this frame');
});

test('the PR title names the clips it swaps', () => {
  expect(titleFor([{ name: 'hero', kind: 'gif' }, { name: 'hero', kind: 'video' }])).toBe('Swap in the newest hero clip');
  expect(titleFor([{ name: 'hero' }, { name: 'library' }, { name: 'lessons' }])).toBe('Swap in the newest hero, library and lessons clips');
});

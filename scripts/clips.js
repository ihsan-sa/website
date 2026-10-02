#!/usr/bin/env node
// Keeps the site's clips in step with the video agent's drop. See docs/clips.md.
//
//   node scripts/clips.js check [--drop DIR]     print each clip in the drop that differs from the one
//                                                the site was made from, or "nothing newer"; writes nothing
//   node scripts/clips.js update [--drop DIR] [--dry-run]
//                                                when a clip differs from origin/main's src/clips.json,
//                                                convert it in a worktree off origin/main, commit it on
//                                                clips/<date>, open a PR and queue it on the lander
//                                                (cc-land queue website <n>); with --dry-run, build the
//                                                commit off HEAD instead, print its diff and push nothing
//
// The drop (src/clips.json "drop", ~/.cc/state/website/clips-gif) is where the video agent puts
// <name>.gif, and optionally <name>.mp4 and <name>-poster.webp. src/clips.json maps each <name> to
// the files on the site it fills ("webp", "poster", "video") and records, under "from", the sha256
// of each drop file the site's copy was made from. A drop file is newer when its hash differs from
// that record: a checkout resets file times, so times cannot say which is newer. A name the
// manifest neither maps nor lists under "ignore" is printed as unmapped and left alone.
//
// <name>.gif becomes an animated WebP (ffmpeg libwebp, lossy, -q:v 70, compression 6, looping),
// stepping the quality down by 10 to 40 until it is under maxBytes; it fails when the WebP's frame
// count or size differs from the GIF's. The poster is <name>-poster.webp when the drop has one,
// and otherwise the new clip's first frame. <name>.mp4 is copied as it is, up to videoMaxBytes.
// When a clip's width or height changes, the width and height beside its URL in src/content.json
// and src/essayBanner.js change with it; the essay's markdown names files and no sizes.

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST = 'src/clips.json';
const REFS = ['src/content.json', 'src/essayBanner.js'];
const REPO = 'website';
const BRANCH_PREFIX = 'clips/';
const QUALITIES = [70, 60, 50, 40];
const KINDS = { gif: '.gif', video: '.mp4', poster: '-poster.webp' };

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { encoding: 'utf8', cwd: ROOT, ...opts }).trim();
const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const expand = (p) => p.replace(/^~(?=\/|$)/, os.homedir());
const urlOf = (publicPath) => publicPath.replace(/^public/, '');

// Each drop file whose hash differs from what the manifest says its slot was made from.
// → { changed: [{ name, kind, file, sha }], unmapped: [file names] }
function plan(manifest, dropDir) {
  const changed = [];
  for (const [name, slot] of Object.entries(manifest.clips)) {
    for (const [kind, suffix] of Object.entries(KINDS)) {
      if (kind !== 'gif' && !slot[kind]) continue; // a slot without a poster or video takes only the clip
      const file = path.join(dropDir, name + suffix);
      if (!fs.existsSync(file)) continue;
      const sha = sha256(file);
      if (sha !== slot.from?.[kind]) changed.push({ name, kind, file, sha });
    }
  }
  const known = new Set([...Object.keys(manifest.clips), ...(manifest.ignore || [])]);
  const stem = (f) => Object.values(KINDS).reduce((s, suf) => (s.endsWith(suf) ? s.slice(0, -suf.length) : s), f);
  const unmapped = fs.existsSync(dropDir) ? fs.readdirSync(dropDir).filter((f) => !known.has(stem(f))).sort() : [];
  return { changed, unmapped };
}

// Frame count and size of a GIF or WebP, read with PIL as the hand-made conversions were checked.
function probe(file) {
  const py = 'import json,sys\nfrom PIL import Image\ni=Image.open(sys.argv[1])\n'
    + 'print(json.dumps({"frames":getattr(i,"n_frames",1),"width":i.size[0],"height":i.size[1]}))';
  return JSON.parse(run('python3', ['-c', py, file]));
}

// <gif> → animated WebP at <out>, under maxBytes if any quality step gets there.
function toWebp(gif, out, maxBytes) {
  const want = probe(gif);
  let q;
  for (q of QUALITIES) {
    run('ffmpeg', ['-y', '-v', 'error', '-i', gif, '-c:v', 'libwebp', '-lossless', '0', '-q:v', String(q),
      '-compression_level', '6', '-loop', '0', out]);
    if (fs.statSync(out).size <= maxBytes) break;
  }
  const got = probe(out);
  if (got.frames !== want.frames || got.width !== want.width || got.height !== want.height) {
    throw new Error(`${out}: ${got.frames} frames at ${got.width}x${got.height}, but the GIF has ${want.frames} at ${want.width}x${want.height}`);
  }
  return { ...got, quality: q, bytes: fs.statSync(out).size };
}

// The first frame of <clip> as a still WebP under maxBytes, or the smallest the steps reach.
function posterFrom(clip, out, maxBytes) {
  for (const q of [75, 60, 45]) {
    run('ffmpeg', ['-y', '-v', 'error', '-i', clip, '-frames:v', '1', '-c:v', 'libwebp', '-q:v', String(q), out]);
    if (fs.statSync(out).size <= maxBytes) break;
  }
  return fs.statSync(out).size;
}

// Sets width and height beside <url> in each reference file that has them. → the files it changed.
function updateRefs(root, url, { width, height }, refs = REFS) {
  const touched = [];
  for (const rel of refs) {
    const file = path.join(root, rel);
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, 'utf8');
    let next = text;
    if (rel.endsWith('.json')) {
      const walk = (v) => {
        if (Array.isArray(v)) return v.forEach(walk);
        if (!v || typeof v !== 'object') return;
        if ((v.src === url || v.gif === url) && typeof v.width === 'number' && typeof v.height === 'number') {
          v.width = width;
          v.height = height;
        }
        Object.values(v).forEach(walk);
      };
      const data = JSON.parse(text);
      walk(data);
      next = `${JSON.stringify(data, null, 2)}\n`;
    } else if (text.includes(`'${url}'`)) {
      // A JS module that names the clip once, with one width and one height beside it (essayBanner.js).
      const once = (re) => (text.match(new RegExp(re.source, 'g')) || []).length === 1;
      if (!once(/\bwidth: \d+/) || !once(/\bheight: \d+/)) throw new Error(`${rel}: cannot tell which width and height belong to ${url}`);
      next = text.replace(/\bwidth: \d+/, `width: ${width}`).replace(/\bheight: \d+/, `height: ${height}`);
    }
    if (next !== text) {
      fs.writeFileSync(file, next);
      touched.push(rel);
    }
  }
  return touched;
}

// Writes every changed drop file into its slot under <root> and records its hash in the manifest
// there. → { files: paths it wrote, lines: one line per slot for the PR body }
function apply(root, manifest, changed) {
  const files = new Set([MANIFEST]);
  const lines = [];
  const write = (rel) => {
    files.add(rel);
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    return path.join(root, rel);
  };
  for (const c of changed.filter((x) => x.kind === 'gif')) {
    const slot = manifest.clips[c.name];
    const out = write(slot.webp);
    const was = fs.existsSync(out) ? probe(out) : null;
    const got = toWebp(c.file, out, manifest.maxBytes);
    const mb = (got.bytes / 1e6).toFixed(2);
    lines.push(`${slot.webp}: from ${c.name}.gif, ${got.frames} frames at ${got.width}x${got.height}, ${mb} MB at quality ${got.quality}`
      + (got.bytes > manifest.maxBytes ? `, over the ${(manifest.maxBytes / 1e6).toFixed(1)} MB budget` : ''));
    if (was && (was.width !== got.width || was.height !== got.height)) {
      for (const rel of updateRefs(root, urlOf(slot.webp), got)) files.add(rel);
      lines.push(`  ${urlOf(slot.webp)} was ${was.width}x${was.height}, so its references now say ${got.width}x${got.height}`);
    }
    if (slot.poster && !changed.some((x) => x.name === c.name && x.kind === 'poster')
      && !fs.existsSync(c.file.replace(/\.gif$/, KINDS.poster))) {
      const bytes = posterFrom(c.file, write(slot.poster), manifest.posterMaxBytes);
      lines.push(`${slot.poster}: the new clip's first frame, ${Math.round(bytes / 1000)} KB`);
    }
  }
  for (const c of changed.filter((x) => x.kind !== 'gif')) {
    const slot = manifest.clips[c.name];
    const bytes = fs.statSync(c.file).size;
    if (c.kind === 'video' && bytes > manifest.videoMaxBytes) {
      lines.push(`${slot.video}: skipped, ${c.name}.mp4 is ${(bytes / 1e6).toFixed(1)} MB, over the ${(manifest.videoMaxBytes / 1e6).toFixed(0)} MB cap`);
      continue;
    }
    fs.copyFileSync(c.file, write(slot[c.kind]));
    lines.push(`${slot[c.kind]}: ${path.basename(c.file)} as it is, ${Math.round(bytes / 1000)} KB`);
  }
  for (const c of changed) {
    const slot = manifest.clips[c.name];
    if (c.kind === 'video' && !files.has(slot.video)) continue; // skipped above, so it is not what the site has
    slot.from = { ...slot.from, [c.kind]: c.sha };
  }
  fs.writeFileSync(path.join(root, MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`);
  return { files: [...files], lines };
}

function titleFor(changed) {
  const names = [...new Set(changed.map((c) => c.name))];
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  return `Swap in the newest ${list} clip${names.length === 1 ? '' : 's'}`;
}

function report(changed, unmapped) {
  for (const c of changed) console.log(`newer: ${path.basename(c.file)} (${c.name} ${c.kind}, ${fs.statSync(c.file).mtime.toISOString()})`);
  if (!changed.length) console.log('nothing newer');
  if (unmapped.length) console.log(`unmapped in the drop, left alone: ${unmapped.join(', ')}`);
}

function update(dropArg, dryRun) {
  const base = dryRun ? 'HEAD' : 'origin/main';
  if (!dryRun) run('git', ['fetch', '--quiet', 'origin', 'main']);
  const manifest = JSON.parse(run('git', ['show', `${base}:${MANIFEST}`]));
  const dropDir = expand(dropArg || manifest.drop);
  const { changed, unmapped } = plan(manifest, dropDir);
  report(changed, unmapped);
  if (!changed.length) return 0;
  // One clips PR at a time: a newer clip waits for the open one to land.
  const open = dryRun ? [] : JSON.parse(run('gh', ['pr', 'list', '--state', 'open', '--json', 'headRefName']))
    .filter((p) => p.headRefName.startsWith(BRANCH_PREFIX));
  if (open.length) {
    console.log(`waiting: ${open[0].headRefName} is still open`);
    return 0;
  }
  const branch = `${BRANCH_PREFIX}${new Date().toISOString().slice(0, 10)}`;
  const title = titleFor(changed);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'website-clips-'));
  let lines;
  run('git', ['worktree', 'add', '--quiet', '--detach', dir, base]);
  try {
    ({ lines } = apply(dir, manifest, changed));
    run('git', ['add', '-A', '--', 'src', 'public'], { cwd: dir });
    if (dryRun) {
      console.log(run('git', ['diff', '--cached', '--stat'], { cwd: dir }));
      console.log(run('git', ['diff', '--cached', '--', MANIFEST, ...REFS], { cwd: dir }));
      console.log(`dry run: would open "${title}"\n${lines.join('\n')}`);
      return 0;
    }
    run('git', ['commit', '--quiet', '-m', title], { cwd: dir });
    run('git', ['push', '--quiet', '--force', 'origin', `HEAD:refs/heads/${branch}`], { cwd: dir });
  } finally {
    run('git', ['worktree', 'remove', '--force', dir]);
  }
  const body = `scripts/clips.js found clips in the video agent's drop that differ from the ones the site was made from, `
    + `so it converted them (docs/clips.md):\n\n${lines.map((l) => (l.startsWith('  ') ? l : `- ${l}`)).join('\n')}\n\n`
    + 'src/clips.json now records the hashes of the files these were made from.';
  const url = run('gh', ['pr', 'create', '--base', 'main', '--head', branch, '--title', title, '--body', body]);
  run('cc-land', ['queue', REPO, url.split('/').pop()]);
  console.log(`opened and queued ${url}`);
  return 0;
}

function main(argv) {
  const [cmd, ...rest] = argv;
  const i = rest.indexOf('--drop');
  const drop = i >= 0 ? rest[i + 1] : null;
  if (cmd === 'check') {
    const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, MANIFEST), 'utf8'));
    const { changed, unmapped } = plan(manifest, expand(drop || manifest.drop));
    report(changed, unmapped);
    return 0;
  }
  if (cmd === 'update') return update(drop, rest.includes('--dry-run'));
  console.error('usage: clips.js check [--drop DIR] | update [--drop DIR] [--dry-run]');
  return 2;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));

module.exports = { plan, probe, toWebp, updateRefs, apply, titleFor };

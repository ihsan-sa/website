#!/usr/bin/env node
// UI check: serves build/ the way the host does, then drives the pages (front
// page, the preview path, /writing, the draft essays under the preview path,
// and the static front page, both drafts, /writing and essays that
// scripts/build-static.js writes)
// with Playwright at 360, 414, 768, 1024, 1440 and 1920 px wide, in light and
// dark. It screenshots each page, opens every folded row and essay figure, flips the theme, and
// checks every href on the page for a 2xx. Then it loads each static page with
// JavaScript off and checks that all its text (from content.json, or the
// essay's markdown) is in the raw HTML and on screen, and that no React ships.
// Last, it screenshots one essay, when it is published, beside the design
// handoff's reference HTML (docs/design-handoff/reference, read with the repo's
// own CSS) and compares the two pixel by pixel.
//
//   npm run build && node scripts/ui-check.js [outDir]
//
// Screenshots and report.json go to outDir (default ui-check-out/, ignored).
// Exit 1 when anything is off: a console error, a failed request, sideways
// scroll (a diagram included: it must fit the column), a local link or PDF that is not 200, a fold that does not open, or
// a standalone tap target under 24px on a phone, a static page missing
// text without JavaScript, or a page that strays from its reference design. External links that answer 4xx/5xx
// are listed as warnings only, since LinkedIn and friends refuse bots.

const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const ROOT = path.resolve(__dirname, '..');
const BUILD = path.join(ROOT, 'build');
const OUT = path.resolve(process.argv[2] || path.join(ROOT, 'ui-check-out'));
const { PREVIEW_PATH } = (() => {
  const src = fs.readFileSync(path.join(ROOT, 'src/App.js'), 'utf8');
  return { PREVIEW_PATH: src.match(/PREVIEW_PATH = '([^']+)'/)[1] };
})();

// Every essay, drafts included, is checked at the preview path.
const ESSAYS = fs.readdirSync(path.join(ROOT, 'content/writing'))
  .filter((f) => f.endsWith('.md'))
  .map((f) => f.slice(0, -3));

const { STATIC_PATH, DRAFT_PATH, DRAFT_V2_PATH } = require('./build-static');
const content = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/content.json'), 'utf8'));
const { frontPage } = require('../src/frontPage');

const PAGES = [
  { name: 'front', path: '/' },
  { name: 'preview', path: PREVIEW_PATH },
  // Nothing published yet, so this is the front page: the app falls through.
  { name: 'writing', path: '/writing' },
  ...ESSAYS.map((slug) => ({ name: `essay-${slug}`, path: `${PREVIEW_PATH}/writing/${slug}` })),
  // The static front page lists no essays, so its Essays heading is not expected.
  { name: 'static', path: STATIC_PATH, block: { ...frontPage(content.prototype), essays: undefined } },
  { name: 'static-draft', path: DRAFT_PATH, block: content.prototype },
  { name: 'static-draft-v2', path: DRAFT_V2_PATH, block: content.prototype, v2: true },
  { name: 'static-writing', path: `${STATIC_PATH}writing/`, index: true },
  ...ESSAYS.map((slug) => ({ name: `static-essay-${slug}`, path: `${STATIC_PATH}writing/${slug}/`, essay: slug })),
];

// Every piece of copy a page shows, from its content.json block.
const TEXT_KEYS = new Set(['name', 'subtitle', 'about', 'email', 'heading', 'text', 'short', 'label', 'title',
  'result', 'detail', 'caption', 'start', 'pending']);
function copyOf(node, key, out = []) {
  if (typeof node === 'string') { if (TEXT_KEYS.has(key)) out.push(node); }
  else if (Array.isArray(node)) node.forEach((v) => copyOf(v, key, out));
  else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) if (!k.startsWith('_')) copyOf(v, k, out);
  }
  return out;
}
const VIEWPORTS = [
  { name: '360', width: 360, height: 780, isMobile: true, hasTouch: true },
  { name: '414', width: 414, height: 896, isMobile: true, hasTouch: true },
  { name: '768', width: 768, height: 1024, isMobile: true, hasTouch: true },
  { name: '1024', width: 1024, height: 768 },
  { name: '1440', width: 1440, height: 900 },
  { name: '1920', width: 1920, height: 1080 },
];
const THEMES = ['light', 'dark'];

// Google Fonts may be unreachable offline, and the Cloudflare beacon refuses
// any origin but the live site; both are the network, not the page.
const THIRD_PARTY = /fonts\.(googleapis|gstatic)\.com|cloudflareinsights\.com/;

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon', '.pdf': 'application/pdf', '.vcf': 'text/vcard',
  '.txt': 'text/plain', '.svg': 'image/svg+xml', '.map': 'application/json',
  '.gif': 'image/gif', '.mp4': 'video/mp4', '.webp': 'image/webp',
};

// The design handoff's reference HTML, served at /__ref/ with the repo's own
// src/ CSS in place of the handoff's copies, and its ../../public/ images from
// the build, so a difference from our page is the markup's.
const REF_DIR = path.join(ROOT, 'docs/design-handoff');
const REF_ESSAY = 'talking-to-my-server';
function refFile(url) {
  const rest = url.slice('/__ref/'.length);
  if (rest.startsWith('src/')) return { root: path.join(ROOT, 'src'), file: path.join(ROOT, rest) };
  if (rest.startsWith('reference/public/')) return { root: BUILD, file: path.join(BUILD, rest.slice('reference/public/'.length)) };
  return { root: REF_DIR, file: path.join(REF_DIR, rest) };
}

// The short links in _redirects (/airesume, /hwportfolio): a path with no
// wildcard and a 301 or 302, as the host answers it. A rule to another site is
// checked as that site's link, so it can only warn, like any external link.
const SHORT_LINKS = new Map(
  (fs.existsSync(path.join(BUILD, '_redirects')) ? fs.readFileSync(path.join(BUILD, '_redirects'), 'utf8') : '')
    .split('\n')
    .map((l) => l.trim().split(/\s+/))
    .filter(([from, to, code]) => from && to && !from.startsWith('#') && !from.includes('*') && /^30[12]$/.test(code))
    .map(([from, to, code]) => [from, { to, code: Number(code) }]),
);

// Static server: a short link answers with its redirect, a real file (or a
// directory's index.html) wins, the preview path, anything under it and any
// other /writing path get index.html (as _redirects says, and as the host's
// fallback does for /writing itself), and anything else is a 404 so broken
// links show up.
function serve() {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    const short = SHORT_LINKS.get(url);
    if (short) {
      res.writeHead(short.code, { Location: short.to });
      return res.end();
    }
    const { root, file: refPath } = url.startsWith('/__ref/') ? refFile(url) : { root: BUILD };
    let file = refPath || path.join(BUILD, url);
    if (fs.existsSync(path.join(file, 'index.html'))) file = path.join(file, 'index.html');
    else if (url === '/' || url === PREVIEW_PATH || url.startsWith(`${PREVIEW_PATH}/writing`) || url === '/writing' || url.startsWith('/writing/')) {
      if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(BUILD, 'index.html');
    }
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404);
      return res.end('not found');
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function status(url) {
  for (const method of ['HEAD', 'GET']) {
    try {
      const r = await fetch(url, {
        method,
        redirect: 'follow',
        signal: AbortSignal.timeout(15000),
        headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) ui-check' },
      });
      if (r.ok || method === 'GET') return r.status;
    } catch (e) {
      if (method === 'GET') return `error: ${e.cause?.code || e.message}`;
    }
  }
  return 'error';
}

async function main() {
  if (!fs.existsSync(path.join(BUILD, 'index.html'))) {
    console.error('No build/ — run `npm run build` first.');
    process.exit(2);
  }
  fs.mkdirSync(OUT, { recursive: true });
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const problems = [];
  const warnings = [];
  const hrefs = new Map(); // absolute url -> first place seen
  const shots = [];

  for (const pg of PAGES) {
    for (const vp of VIEWPORTS) {
      for (const theme of THEMES) {
        const tag = `${pg.name}-${vp.name}-${theme}`;
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          isMobile: !!vp.isMobile,
          hasTouch: !!vp.hasTouch,
          deviceScaleFactor: 1,
          colorScheme: theme,
          reducedMotion: 'reduce',
        });
        const page = await context.newPage();
        const where = (msg) => `${tag}: ${msg}`;
        page.on('console', (m) => {
          if (m.type() !== 'error') return;
          const third = THIRD_PARTY.test(m.text()) || (m.text() === 'Failed to load resource: net::ERR_FAILED');
          (third ? warnings : problems).push(where(`console: ${m.text()}`));
        });
        page.on('pageerror', (e) => problems.push(where(`pageerror: ${e.message}`)));
        page.on('requestfailed', (r) => {
          // Closing a figure's overlay drops its video mid-download, which aborts the load by design.
          const dropped = r.resourceType() === 'media' && r.failure()?.errorText === 'net::ERR_ABORTED';
          const bad = !THIRD_PARTY.test(r.url()) && !dropped;
          (bad ? problems : warnings).push(where(`request failed: ${r.url()} (${r.failure()?.errorText})`));
        });
        page.on('response', (r) => {
          if (r.url().startsWith(base) && r.status() >= 400) problems.push(where(`${r.status()} ${r.url()}`));
        });

        await page.goto(base + pg.path, { waitUntil: 'networkidle' });
        // Lazy images: scroll through so every one loads before the shot.
        await page.evaluate(async () => {
          for (let y = 0; y < document.body.scrollHeight; y += 400) {
            window.scrollTo(0, y);
            await new Promise((r) => setTimeout(r, 30));
          }
          window.scrollTo(0, 0);
        });
        await page.waitForLoadState('networkidle');

        const layout = await page.evaluate(() => {
          const out = { overflow: [], brokenImgs: [], smallTargets: [] };
          const vw = document.documentElement.clientWidth;
          if (document.documentElement.scrollWidth > vw) out.overflow.push(`page scrollWidth ${document.documentElement.scrollWidth} > ${vw}`);
          for (const el of document.querySelectorAll('main *')) {
            // A long code line scrolls sideways inside its own box, by design.
            if (el.closest('.wr-pre')) continue;
            const r = el.getBoundingClientRect();
            if (r.width && r.right > vw + 1) out.overflow.push(`${el.tagName.toLowerCase()}.${el.className} right=${Math.round(r.right)}`);
          }
          for (const img of document.images) {
            if (img.closest('[inert], details:not([open])')) continue; // lazy, loads when its fold opens
            if (!img.getClientRects().length) continue; // not shown at this width (the draft's side photos), so lazy never loads it
            if (!img.complete || img.naturalWidth === 0) out.brokenImgs.push(img.getAttribute('src'));
          }
          // Inline links inside a sentence are exempt (WCAG 2.5.8); the fold
          // button's target is its whole line, measured via the line itself.
          // The theme switch is 34x20 but its ::before widens the target 8px
          // on every side, which a bounding box does not see.
          const targets = '.pv-links a, .pv-links button, .wr-top a, .wr-top button, .pv-foot a, .pv-hw__item, .pv-head-docs a, .pv-entry__head';
          for (const el of document.querySelectorAll(targets)) {
            if (el.closest('[inert]')) continue;
            const r = el.getBoundingClientRect();
            const pad = el.classList.contains('theme-switch') ? 16 : 0;
            if (r.width && r.height && (r.height + pad < 24 || r.width + pad < 24)) {
              out.smallTargets.push(`${el.tagName.toLowerCase()} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 40)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
            }
          }
          out.hrefs = [...document.querySelectorAll('a[href]')].map((a) => a.href);
          return out;
        });
        layout.overflow.forEach((o) => problems.push(where(`overflow: ${o}`)));
        layout.brokenImgs.forEach((s) => problems.push(where(`image did not load: ${s}`)));
        // Phones only: at 640px and under, where the CSS makes links 32px tall.
        if (vp.width <= 640) layout.smallTargets.forEach((s) => problems.push(where(`tap target under 24px: ${s}`)));
        layout.hrefs.forEach((h) => { if (!hrefs.has(h)) hrefs.set(h, tag); });

        const shot = path.join(OUT, `${tag}.png`);
        await page.screenshot({ path: shot, fullPage: true });
        shots.push(shot);

        // Essay figures, at a phone and a desktop width: the first with a video
        // and the first without open large in the overlay, focus inside and the
        // page held still, and close (Escape, then the backdrop) with focus back
        // on the figure. Each open overlay is shot as <tag>-zoom-<kind>.png. Only an
        // essay's figures (.wr-figure): an AI row's clip uses the same link, but sits
        // in a fold that is shut here.
        if ((vp.width === 360 || vp.width === 1440) && (await page.locator('.wr-figure .wr-figure__zoom').count())) {
          for (const kind of ['video', 'image']) {
            const fig = page.locator(`.wr-figure .wr-figure__zoom${kind === 'video' ? '[data-video]' : ':not([data-video])'}`).first();
            if (!(await fig.count())) continue;
            if ((await fig.evaluate((a) => getComputedStyle(a).cursor)) !== 'zoom-in') problems.push(where(`${kind} figure has no zoom-in cursor`));
            await fig.click();
            const z = await page.evaluate(async () => {
              const root = document.querySelector('.wr-zoom');
              if (!root) return null;
              const media = root.querySelector('.wr-zoom__media');
              const v = media.tagName === 'VIDEO' ? media : null;
              // The video has a few seconds to start; a browser without H.264 is noted, not failed.
              const playable = v ? v.canPlayType('video/mp4; codecs="avc1.640028"') : '';
              for (let i = 0; v && playable && i < 50 && (v.readyState < 2 || v.paused); i++) await new Promise((r) => setTimeout(r, 100));
              const r = media.getBoundingClientRect();
              return {
                tag: media.tagName.toLowerCase(), w: r.width, h: r.height, vw: window.innerWidth, vh: window.innerHeight,
                focus: root.contains(document.activeElement), locked: getComputedStyle(document.documentElement).overflow === 'hidden',
                playable, playing: v ? v.readyState >= 2 && !v.paused : null, muted: v ? v.muted : null,
              };
            });
            if (!z) { problems.push(where(`${kind} figure did not open the overlay`)); continue; }
            const zoomShot = path.join(OUT, `${tag}-zoom-${kind}.png`);
            await page.screenshot({ path: zoomShot });
            shots.push(zoomShot);
            if (z.tag !== (kind === 'video' ? 'video' : 'img')) problems.push(where(`${kind} figure opened a ${z.tag}`));
            if (z.w > z.vw * 0.92 + 1 || z.h > z.vh * 0.9 + 1) problems.push(where(`overlay ${kind} ${Math.round(z.w)}x${Math.round(z.h)} overflows 92vw/90vh`));
            if (z.w < z.vw * 0.5 && z.h < z.vh * 0.5) problems.push(where(`overlay ${kind} only ${Math.round(z.w)}x${Math.round(z.h)}`));
            if (!z.focus) problems.push(where(`focus did not move into the ${kind} overlay`));
            if (!z.locked) problems.push(where(`the page scrolls behind the ${kind} overlay`));
            if (kind === 'video' && !z.muted) problems.push(where('overlay video is not muted'));
            if (kind === 'video' && z.playable && !z.playing) problems.push(where('overlay video did not start playing'));
            if (kind === 'video' && !z.playable) warnings.push(where('this browser cannot play H.264; overlay video not played'));
            if (kind === 'video') await page.keyboard.press('Escape');
            else await page.mouse.click(4, z.vh - 4);
            const after = await page.evaluate(() => ({
              open: !!document.querySelector('.wr-zoom'),
              back: !!(document.activeElement && document.activeElement.classList.contains('wr-figure__zoom')),
              locked: getComputedStyle(document.documentElement).overflow === 'hidden',
            }));
            if (after.open) problems.push(where(`${kind} overlay did not close`));
            if (!after.back) problems.push(where(`focus did not return to the ${kind} figure`));
            if (after.locked) problems.push(where(`the page stays locked after the ${kind} overlay closed`));
          }
        }

        // Every folded row: open it, check the panel shows and its links are
        // reachable, then close it again.
        const buttons = page.locator('.pv-entry__btn');
        const n = await buttons.count();
        for (let i = 0; i < n; i++) {
          const btn = buttons.nth(i);
          const panel = page.locator(`[id="${await btn.getAttribute('aria-controls')}"]`);
          // Row 0 is opened by clicking the line's text away from any link, as
          // a reader would; the rest by the + button itself.
          if (i === 0) {
            const head = btn.locator('xpath=..');
            // elementFromPoint sees only the viewport, and on a short screen the
            // intro can push the first row below it.
            await head.scrollIntoViewIfNeeded();
            const spot = await head.evaluate((p) => {
              const r = p.getBoundingClientRect();
              for (let x = r.right - 2; x > r.left; x -= 4) {
                for (let y = r.top + 4; y < r.bottom; y += 6) {
                  const hit = document.elementFromPoint(x, y);
                  if (hit && !hit.closest('a') && p.contains(hit)) return { x: x - r.left, y: y - r.top };
                }
              }
              return null;
            });
            if (!spot) problems.push(where('no clickable text on the first row'));
            else await head.click({ position: spot });
          } else {
            await btn.click();
          }
          if ((await btn.getAttribute('aria-expanded')) !== 'true' || (await panel.getAttribute('inert')) !== null) {
            problems.push(where(`fold ${i} did not open`));
            continue;
          }
          const h = await panel.evaluate((el) => el.getBoundingClientRect().height);
          if (h < 10) problems.push(where(`fold ${i} opened but is ${h}px tall`));
          const hidden = await panel.evaluate((el) => {
            const inner = el.firstElementChild;
            return inner.scrollHeight > inner.clientHeight + 1 ? `${inner.scrollHeight} > ${inner.clientHeight}` : null;
          });
          if (hidden) problems.push(where(`fold ${i} content clipped: ${hidden}`));
          (await panel.locator('a[href]').evaluateAll((as) => as.map((a) => a.href))).forEach((u) => { if (!hrefs.has(u)) hrefs.set(u, tag); });
        }
        if (n) {
          await page.evaluate(async () => {
            for (let y = 0; y < document.body.scrollHeight; y += 400) {
              window.scrollTo(0, y);
              await new Promise((r) => setTimeout(r, 30));
            }
            window.scrollTo(0, 0);
          });
          await page.waitForLoadState('networkidle');
          const broken = await page.evaluate(() => [...document.images].filter((i) => i.getClientRects().length && (!i.complete || i.naturalWidth === 0)).map((i) => i.getAttribute('src')));
          broken.forEach((s) => problems.push(where(`image did not load with folds open: ${s}`)));
          const openShot = path.join(OUT, `${tag}-open.png`);
          await page.screenshot({ path: openShot, fullPage: true });
          shots.push(openShot);
          for (let i = 0; i < n; i++) {
            const btn = buttons.nth(i);
            await btn.click();
            if ((await btn.getAttribute('aria-expanded')) !== 'false') problems.push(where(`fold ${i} did not close`));
          }
          // Clicking the name link must open the page, not the fold.
          const link = page.locator('.pv-entry__head a.pv-name-link').first();
          if (await link.count()) {
            const [popup] = await Promise.all([context.waitForEvent('page', { timeout: 5000 }).catch(() => null), link.click({ modifiers: [] })]);
            if (!popup) problems.push(where('name link did not open a new tab'));
            else await popup.close();
            const btn = page.locator('.pv-entry__head').first().locator('.pv-entry__btn');
            if ((await btn.getAttribute('aria-expanded')) === 'true') problems.push(where('clicking the name link also opened the fold'));
          }
        }

        // Static draft: every <details> row opens on a click on its line away
        // from the link, shows its panel, and closes again; the name link opens
        // its page without opening the row.
        const rows = page.locator('details.pv-entry');
        const nd = await rows.count();
        for (let i = 0; i < nd; i++) {
          const row = rows.nth(i);
          await row.locator('summary .pv-entry__mark').click();
          if (!(await row.evaluate((d) => d.open))) { problems.push(where(`details ${i} did not open`)); continue; }
          const h = await row.locator('.pv-fold__inner').evaluate((el) => el.getBoundingClientRect().height);
          if (h < 10) problems.push(where(`details ${i} opened but is ${h}px tall`));
          (await row.locator('.pv-fold__inner a[href]').evaluateAll((as) => as.map((a) => a.href))).forEach((u) => { if (!hrefs.has(u)) hrefs.set(u, tag); });
        }
        if (nd) {
          await page.evaluate(async () => {
            for (let y = 0; y < document.body.scrollHeight; y += 400) {
              window.scrollTo(0, y);
              await new Promise((r) => setTimeout(r, 30));
            }
            window.scrollTo(0, 0);
          });
          await page.waitForLoadState('networkidle');
          const broken = await page.evaluate(() => [...document.images].filter((i) => i.getClientRects().length && (!i.complete || i.naturalWidth === 0)).map((i) => i.getAttribute('src')));
          broken.forEach((s) => problems.push(where(`image did not load with rows open: ${s}`)));
          const openShot = path.join(OUT, `${tag}-open.png`);
          await page.screenshot({ path: openShot, fullPage: true });
          shots.push(openShot);
          for (let i = 0; i < nd; i++) {
            const row = rows.nth(i);
            await row.locator('summary .pv-entry__mark').click();
            if (await row.evaluate((d) => d.open)) problems.push(where(`details ${i} did not close`));
          }
          const link = page.locator('details.pv-entry summary a.pv-name-link').first();
          if (await link.count()) {
            const [popup] = await Promise.all([context.waitForEvent('page', { timeout: 5000 }).catch(() => null), link.click()]);
            if (!popup) problems.push(where('name link did not open a new tab'));
            else await popup.close();
            if (await link.evaluate((a) => a.closest('details').open)) problems.push(where('clicking the name link also opened the row'));
          }
        }

        // Second draft: a click on the row's name opens it (the whole line is
        // the control), each + sits on the column's right edge, the grid is
        // two across, and Save contact shows on phones only.
        if (pg.v2) {
          const row = rows.first();
          await row.locator('summary .pv-strong').click();
          if (!(await row.evaluate((d) => d.open))) problems.push(where('clicking the row name did not open it'));
          await row.locator('summary .pv-strong').click();
          if (await row.evaluate((d) => d.open)) problems.push(where('clicking the row name did not close it'));
          if (await page.locator('summary a').count()) problems.push(where('a row line still holds a link'));
          const edges = await page.evaluate(() => {
            const col = document.querySelector('.pv-block').getBoundingClientRect().right;
            return [...document.querySelectorAll('.pv-entry__mark')].map((m) => Math.round(col - m.getBoundingClientRect().right));
          });
          if (edges.some((d) => Math.abs(d) > 1)) problems.push(where(`fold markers off the right edge by ${edges.join(',')}px`));
          const cols = await page.evaluate(() => getComputedStyle(document.querySelector('.pv-hw')).gridTemplateColumns.split(' ').length);
          if (cols !== 2) problems.push(where(`projects grid is ${cols} across, not 2`));
          const card = await page.locator('.pv-contact').isVisible();
          if (card !== (vp.width <= 640)) problems.push(where(`Save contact ${card ? 'shows' : 'is hidden'} at ${vp.width}px`));
        }

        // Theme toggle flips data-theme and the page background; a switch
        // also flips aria-checked.
        const toggle = page.locator('.theme-switch');
        if (!(await toggle.count())) {
          await context.close();
          continue;
        }
        const before = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
        await toggle.click();
        const after = await page.evaluate(() => ({ bg: getComputedStyle(document.body).backgroundColor, t: document.documentElement.dataset.theme }));
        if (after.bg === before) problems.push(where('theme toggle did not change the background'));
        if (after.t !== (theme === 'light' ? 'dark' : 'light')) problems.push(where(`theme toggle set data-theme=${after.t}`));
        const checked = await toggle.getAttribute('aria-checked');
        if (checked !== null && checked !== String(after.t === 'dark')) problems.push(where(`theme switch aria-checked=${checked} in ${after.t}`));
        await page.reload({ waitUntil: 'networkidle' });
        const kept = await page.evaluate(() => document.documentElement.dataset.theme);
        if (kept !== after.t) problems.push(where(`theme choice not kept across reload (${kept})`));

        await context.close();
      }
    }
  }

  // JavaScript off: each static page's copy is in the HTML the server sends
  // (what a scraper or link previewer reads), its visible copy is on screen,
  // and no script bundle ships.
  const decode = (s) => s.replace(/&nbsp;/g, '\u00a0').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  const essays = require('./writing').loadEssays();
  const leaves = (nodes) => nodes.flatMap((n) => (n.c ? leaves(n.c) : n.t === 'text' || n.t === 'code' ? [n.v] : []));
  for (const pg of PAGES.filter((p) => p.essay || p.index)) {
    const where = (msg) => `${pg.name}-nojs: ${msg}`;
    const raw = decode(await (await fetch(base + pg.path)).text());
    const shown = pg.index ? essays : essays.filter((e) => e.slug === pg.essay);
    const copy = pg.index
      ? shown.flatMap((e) => [e.title, e.summary])
      : shown.flatMap((e) => [e.title, e.standfirst, ...e.blocks.flatMap((b) => leaves(b.c || b.caption || (b.items || []).flat())),
        ...e.furtherReading.map((r) => r.title)]);
    copy.filter((t) => t.trim() && !raw.includes(t)).forEach((t) => problems.push(where(`not in the raw HTML: "${t.slice(0, 60)}"`)));
    if (!/<meta name="robots" content="noindex"/.test(raw)) problems.push(where('no noindex meta'));
    if (/<script[^>]+src="\/static\/js\//.test(raw)) problems.push(where('ships the React bundle'));
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto(base + pg.path, { waitUntil: 'networkidle' });
    const seen = await page.evaluate(() => document.querySelector('main').innerText.replace(/\s+/g, ' '));
    if (await page.locator('.theme-switch:visible').count()) problems.push(where('theme switch shows with JavaScript off'));
    shown.flatMap((e) => (pg.index ? [e.title] : [e.title, e.standfirst]))
      .filter((t) => !seen.includes(t.replace(/\s+/g, ' '))).forEach((t) => problems.push(where(`not on screen: "${t.slice(0, 60)}"`)));
    const shot = path.join(OUT, `${pg.name}-nojs.png`);
    await page.screenshot({ path: shot, fullPage: true });
    shots.push(shot);
    await context.close();
  }
  for (const pg of PAGES.filter((p) => p.block)) {
    const where = (msg) => `${pg.name}-nojs: ${msg}`;
    const raw = decode(await (await fetch(base + pg.path)).text());
    // With no essay built, the draft rightly leaves its Essays link and section out.
    const block = pg.block.essays && !essays.length ? { ...pg.block, essays: undefined } : pg.block;
    const copy = copyOf(block);
    copy.filter((t) => !raw.includes(t)).forEach((t) => problems.push(where(`not in the raw HTML: "${t.slice(0, 60)}"`)));
    if (/<script[^>]+src="\/static\/js\//.test(raw)) problems.push(where('ships the React bundle'));
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto(base + pg.path, { waitUntil: 'networkidle' });
    const seen = await page.evaluate(() => document.querySelector('main').innerText.replace(/\s+/g, ' '));
    const heads = [pg.block.name, pg.block.subtitle, ...pg.block.about, pg.block.experience.heading,
      // At 390px a row with a `short` shows that; its full text waits in the fold.
      ...pg.block.experience.items.map((i) => i.short || i.text), ...pg.block.aiWork.items.map((i) => i.name)];
    heads.filter((t) => !seen.includes(t.replace(/\s+/g, ' '))).forEach((t) => problems.push(where(`not on screen: "${t.slice(0, 60)}"`)));
    if (await page.locator('.theme-switch:visible').count()) problems.push(where('theme toggle shows with JavaScript off'));
    const shot = path.join(OUT, `${pg.name}-nojs.png`);
    await page.screenshot({ path: shot, fullPage: true });
    shots.push(shot);
    await context.close();
  }

  // The design reference: one essay beside the handoff's
  // HTML, at a phone and a desktop width in both themes. Its demo-only site.js
  // and demo.css are left out, and its https://ihsan.cc images come from this
  // build. A page whose height strays by more than 2%, or whose pixels differ
  // on more than REF_TOLERANCE of the page, fails; each pair's two shots and a
  // diff image (differing pixels in red) are saved.
  const REF_TOLERANCE = 0.03;
  // The draft's pair is retired: the owner has reshaped the draft since the 28 Sep
  // handoff (photos, AI work first, the essay banner, live stats), so it no longer
  // matches reference/site/index.html by design, and the pair failed on every run
  // from then on.
  const refs = [
    // The reference essay is the worked example now, off the site, so its pair runs only if it is published again.
    ...(ESSAYS.includes(REF_ESSAY)
      ? [{ name: `essay-${REF_ESSAY}`, ours: `${STATIC_PATH}writing/${REF_ESSAY}/`, ref: `/__ref/reference/site/essays/${REF_ESSAY}.html` }]
      : []),
  ];
  const refReport = [];
  for (const pair of refs) {
    for (const vp of VIEWPORTS.filter((v) => v.width === 360 || v.width === 1440)) {
      for (const theme of THEMES) {
        const tag = `ref-${pair.name}-${vp.name}-${theme}`;
        const shot = async (url) => {
          const context = await browser.newContext({
            viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch,
            deviceScaleFactor: 1, colorScheme: theme, reducedMotion: 'reduce',
          });
          await context.route(/\/(site\.js|demo\.css)$/, (r) => r.fulfill({ status: 200, body: '' }));
          await context.route(/^https:\/\/ihsan\.cc\//, async (r) => r.fulfill({ response: await r.fetch({ url: base + new URL(r.request().url()).pathname }) }));
          const page = await context.newPage();
          await page.goto(base + url, { waitUntil: 'networkidle' });
          await page.evaluate(async () => {
            for (let y = 0; y < document.body.scrollHeight; y += 400) {
              window.scrollTo(0, y);
              await new Promise((r) => setTimeout(r, 30));
            }
            window.scrollTo(0, 0);
            await document.fonts.ready;
          });
          await page.waitForLoadState('networkidle');
          const png = await page.screenshot({ fullPage: true });
          await context.close();
          return png;
        };
        const [ours, ref] = [await shot(pair.ours), await shot(pair.ref)];
        fs.writeFileSync(path.join(OUT, `${tag}-ours.png`), ours);
        fs.writeFileSync(path.join(OUT, `${tag}-reference.png`), ref);
        const context = await browser.newContext();
        const page = await context.newPage();
        const d = await page.evaluate(async ([a, b]) => {
          const load = (src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = src; });
          const [ia, ib] = await Promise.all([load(a), load(b)]);
          const w = Math.max(ia.width, ib.width);
          const h = Math.max(ia.height, ib.height);
          const pixels = (img) => {
            const c = document.createElement('canvas');
            c.width = w; c.height = h;
            const x = c.getContext('2d');
            x.fillStyle = '#f0f';
            x.fillRect(0, 0, w, h);
            x.drawImage(img, 0, 0);
            return x.getImageData(0, 0, w, h).data;
          };
          const pa = pixels(ia);
          const pb = pixels(ib);
          const out = document.createElement('canvas');
          out.width = w; out.height = h;
          const ox = out.getContext('2d');
          const od = ox.createImageData(w, h);
          let n = 0;
          for (let i = 0; i < pa.length; i += 4) {
            const diff = Math.max(Math.abs(pa[i] - pb[i]), Math.abs(pa[i + 1] - pb[i + 1]), Math.abs(pa[i + 2] - pb[i + 2]));
            if (diff > 48) { n++; od.data[i] = 255; od.data[i + 3] = 255; } else { od.data[i] = od.data[i + 1] = od.data[i + 2] = pa[i]; od.data[i + 3] = 50; }
          }
          ox.putImageData(od, 0, 0);
          return { ratio: n / (w * h), ours: ia.height, reference: ib.height, png: out.toDataURL('image/png') };
        }, [ours, ref].map((b) => `data:image/png;base64,${b.toString('base64')}`));
        await context.close();
        fs.writeFileSync(path.join(OUT, `${tag}-diff.png`), Buffer.from(d.png.split(',')[1], 'base64'));
        shots.push(path.join(OUT, `${tag}-diff.png`));
        refReport.push({ tag, ratio: Number(d.ratio.toFixed(4)), ours: d.ours, reference: d.reference });
        if (Math.abs(d.ours - d.reference) > 0.02 * d.reference) problems.push(`${tag}: page is ${d.ours}px tall, the reference ${d.reference}px`);
        if (d.ratio > REF_TOLERANCE) problems.push(`${tag}: ${(d.ratio * 100).toFixed(1)}% of pixels differ from the reference`);
      }
    }
  }

  // Every href once. Local ones must be 200; mailto is checked for shape.
  const links = [];
  for (const [url, seen] of hrefs) {
    if (url.startsWith('mailto:')) {
      if (!/^mailto:[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(url)) problems.push(`${seen}: bad mailto ${url}`);
      links.push({ url, status: 'mailto' });
      continue;
    }
    const short = url.startsWith(base) && SHORT_LINKS.get(new URL(url).pathname);
    const away = short && /^https?:/.test(short.to) ? short.to : null;
    const s = await status(away || url);
    links.push({ url, status: s });
    const ok = typeof s === 'number' && s >= 200 && s < 400;
    if (!ok) (url.startsWith(base) && !away ? problems : warnings).push(`${seen}: link ${url}${away ? ` (${away})` : ''} -> ${s}`);
  }

  await browser.close();
  server.close();
  const report = { base, problems, warnings, reference: refReport, links: links.map((l) => ({ ...l, url: l.url.replace(base, '') })), shots };
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  for (const w of warnings) console.log(`warn  ${w.replace(base, '')}`);
  for (const p of problems) console.log(`FAIL  ${p.replace(base, '')}`);
  console.log(`${shots.length} screenshots, ${links.length} links, ${problems.length} problems, ${warnings.length} warnings -> ${OUT}`);
  // process.exit() here once cut a piped stdout short in CI, so the FAIL lines and this
  // summary never showed. Set the code and let Node drain stdout before it exits.
  finish(problems.length ? 1 : 0);
}

// Exit with <code> once stdout has drained. A socket left open (a link check's keep-alive)
// may hold the process, so a timer that does not itself keep it alive ends it after 30s.
function finish(code) {
  process.exitCode = code;
  setTimeout(() => process.exit(code), 30000).unref();
}

main().catch((e) => {
  console.error(e);
  finish(2);
});

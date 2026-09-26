#!/usr/bin/env node
// UI check: serves build/ the way public/_redirects does, then drives both
// pages (front page and the preview path) with Playwright at phone and
// desktop widths, in light and dark. It screenshots each page, opens every
// folded row, flips the theme, and checks every href on the page for a 2xx.
//
//   npm run build && node scripts/ui-check.js [outDir]
//
// Screenshots and report.json go to outDir (default ui-check-out/, ignored).
// Exit 1 when anything is off: a console error, a failed request, sideways
// scroll, a local link or PDF that is not 200, a fold that does not open, or
// a standalone tap target under 24px on the phone. External links that answer 4xx/5xx
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

const PAGES = [
  { name: 'front', path: '/' },
  { name: 'preview', path: PREVIEW_PATH },
];
const VIEWPORTS = [
  { name: 'phone', width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: 'desktop', width: 1440, height: 900 },
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
};

// Static server: a real file wins, the preview path gets index.html (as
// _redirects says), and anything else is a 404 so broken links show up.
function serve() {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    let file = path.join(BUILD, url);
    if (url === '/' || url === PREVIEW_PATH) file = path.join(BUILD, 'index.html');
    if (!file.startsWith(BUILD) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
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
          const bad = !THIRD_PARTY.test(r.url());
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
            const r = el.getBoundingClientRect();
            if (r.width && r.right > vw + 1) out.overflow.push(`${el.tagName.toLowerCase()}.${el.className} right=${Math.round(r.right)}`);
          }
          for (const img of document.images) {
            if (img.closest('[inert]')) continue; // lazy, loads when its fold opens
            if (!img.complete || img.naturalWidth === 0) out.brokenImgs.push(img.getAttribute('src'));
          }
          // Inline links inside a sentence are exempt (WCAG 2.5.8); the fold
          // button's target is its whole line, measured via the line itself.
          const targets = '.pv-links a, .pv-links button, .pv-foot a, .pv-hw__item, .pv-head-docs a, .pv-entry__head';
          for (const el of document.querySelectorAll(targets)) {
            if (el.closest('[inert]')) continue;
            const r = el.getBoundingClientRect();
            if (r.width && r.height && (r.height < 24 || r.width < 24)) {
              out.smallTargets.push(`${el.tagName.toLowerCase()} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 40)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
            }
          }
          out.hrefs = [...document.querySelectorAll('a[href]')].map((a) => a.href);
          return out;
        });
        layout.overflow.forEach((o) => problems.push(where(`overflow: ${o}`)));
        layout.brokenImgs.forEach((s) => problems.push(where(`image did not load: ${s}`)));
        if (vp.name === 'phone') layout.smallTargets.forEach((s) => problems.push(where(`tap target under 24px: ${s}`)));
        layout.hrefs.forEach((h) => { if (!hrefs.has(h)) hrefs.set(h, tag); });

        const shot = path.join(OUT, `${tag}.png`);
        await page.screenshot({ path: shot, fullPage: true });
        shots.push(shot);

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
          const broken = await page.evaluate(() => [...document.images].filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.getAttribute('src')));
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

        // Theme toggle flips data-theme and the page background.
        const toggle = page.locator('.pv-toggle');
        const before = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
        await toggle.click();
        const after = await page.evaluate(() => ({ bg: getComputedStyle(document.body).backgroundColor, t: document.documentElement.dataset.theme }));
        if (after.bg === before) problems.push(where('theme toggle did not change the background'));
        if (after.t !== (theme === 'light' ? 'dark' : 'light')) problems.push(where(`theme toggle set data-theme=${after.t}`));
        await page.reload({ waitUntil: 'networkidle' });
        const kept = await page.evaluate(() => document.documentElement.dataset.theme);
        if (kept !== after.t) problems.push(where(`theme choice not kept across reload (${kept})`));

        await context.close();
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
    const s = await status(url);
    links.push({ url, status: s });
    const ok = typeof s === 'number' && s >= 200 && s < 400;
    if (!ok) (url.startsWith(base) ? problems : warnings).push(`${seen}: link ${url} -> ${s}`);
  }

  await browser.close();
  server.close();
  const report = { base, problems, warnings, links: links.map((l) => ({ ...l, url: l.url.replace(base, '') })), shots };
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  for (const w of warnings) console.log(`warn  ${w.replace(base, '')}`);
  for (const p of problems) console.log(`FAIL  ${p.replace(base, '')}`);
  console.log(`${shots.length} screenshots, ${links.length} links, ${problems.length} problems, ${warnings.length} warnings -> ${OUT}`);
  process.exit(problems.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});

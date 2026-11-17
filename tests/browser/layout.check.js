'use strict';
// Layout checks at iPhone screen widths. These run in Chromium (not Safari/WebKit) with a phone-sized, touch-enabled
// screen, so they catch overflow and small-font problems but cannot prove how a real iPhone behaves.
// Run:  node tests/browser/layout.check.js     (needs Playwright with Chromium)
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium, devices } = require('playwright');
const ROOT = path.join(__dirname, '..', '..');
const server = http.createServer((req, res) => {
  const f = path.join(ROOT, req.url.split('?')[0] === '/' ? 'index.html' : req.url.split('?')[0]);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); res.end(fs.readFileSync(f));
});
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((m || 'mismatch') + ': expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a)); };
const ok = (c, m) => { if (!c) throw new Error(m || 'assertion failed'); };
const tests = []; const test = (n, f) => tests.push({ n, f });
let browser, base;
const SIZES = [[320, 568], [375, 667], [390, 844], [430, 932]];
async function open(w, h, init) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  const page = await ctx.newPage(); page.errors = []; page.on('pageerror', e => page.errors.push(e.message));
  if (init) await page.addInitScript(init);
  await page.goto(base + '/index.html'); await page.waitForTimeout(200); return { ctx, page };
}
const set = async (page, id, v) => { await page.evaluate(([i, x]) => { const e = document.getElementById(i); e.value = x; e.dispatchEvent(new Event('input', { bubbles: true })); }, [id, v]); await page.waitForTimeout(120); };
const goto = async (page, h) => { await page.evaluate((x) => { location.hash = x; }, h); await page.waitForTimeout(250); };
// Returns problems found on the current screen.
const audit = (page) => page.evaluate(() => {
  const out = [], W = window.innerWidth;
  if (document.documentElement.scrollWidth > W) out.push('page scrolls sideways (' + document.documentElement.scrollWidth + ' > ' + W + ')');
  const scrolls = (el) => { for (let p = el.parentElement; p; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll') return true; } return false; };
  document.querySelectorAll('main *, nav *, header *').forEach(el => {
    if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') return;
    const r = el.getBoundingClientRect(); if (!r.width || !r.height || scrolls(el)) return;
    if (r.right > W + 1 || r.left < -1) out.push('off screen: <' + el.tagName.toLowerCase() + (el.id ? ' id=' + el.id : '') + '> ' + Math.round(r.left) + '..' + Math.round(r.right));
  });
  document.querySelectorAll('input:not([type=range]):not([type=radio]):not([type=checkbox]), select, textarea').forEach(el => {
    if (!el.offsetParent) return;
    const fs = parseFloat(getComputedStyle(el).fontSize); if (fs < 16) out.push('font under 16px (iOS zooms the page on focus): #' + el.id + ' ' + fs + 'px');
  });
  return out.slice(0, 6);
});

for (const [w, h] of SIZES) {
  test('no sideways scrolling, nothing off screen, no input under 16px at ' + w + ' x ' + h, async () => {
    const { ctx, page } = await open(w, h);
    for (const hash of ['#hud', '#chart', '#rifle']) { await goto(page, hash); eq(await audit(page), [], hash); }
    await page.click('.tab#tabHud'); await page.click('#togWind'); await page.click('#togShot'); await page.waitForTimeout(150); eq(await audit(page), [], 'HUD with Wind and Shot open');
    await goto(page, '#rifle'); await page.evaluate(() => document.getElementById('exportBtn').click()); await page.waitForTimeout(100); eq(await audit(page), [], 'Rifle with backup code shown');
    eq(page.errors, []); await ctx.close();
  });
  test('warnings fit at ' + w + ' x ' + h + ' (invalid input, save failure, preset message, chart range error)', async () => {
    const { ctx, page } = await open(w, h, () => { const o = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (window.__fail) throw new Error('q'); return o.call(this, k, v); }; });
    await set(page, 'bc', ''); await set(page, 'dist', '5'); eq(await audit(page), [], 'invalid input notice');
    await set(page, 'bc', '0.462'); await set(page, 'dist', '400');
    await page.evaluate(() => { window.__fail = true; }); await set(page, 'dist', '410'); eq(await audit(page), [], 'save failure message');
    await goto(page, '#rifle'); await page.evaluate(() => { const e = document.getElementById('preset'); e.value = 'p65cm'; e.dispatchEvent(new Event('input', { bubbles: true })); }); await page.waitForTimeout(150); eq(await audit(page), [], 'preset message');
    await goto(page, '#chart'); await set(page, 'cStep', '2'); await page.waitForTimeout(250); eq(await audit(page), [], 'chart range error');
    eq(page.errors, []); await ctx.close();
  });
}
test('the HUD fits on a 390 x 844 screen without scrolling (Wind and Shot closed)', async () => {
  const { ctx, page } = await open(390, 844);
  const m = await page.evaluate(() => ({ sh: document.documentElement.scrollHeight, ih: window.innerHeight }));
  ok(m.sh <= m.ih + 1, 'page is ' + m.sh + ' tall on a ' + m.ih + ' screen'); await ctx.close();
});
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r)); base = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch(); let fail = 0;
  for (const t of tests) { try { await t.f(); console.log('PASS  ' + t.n); } catch (e) { fail++; console.log('FAIL  ' + t.n + '\n      ' + e.message); } }
  console.log('\n' + (tests.length - fail) + ' passed, ' + fail + ' failed, ' + tests.length + ' total');
  await browser.close(); server.close(); process.exit(fail ? 1 : 0);
})();

'use strict';
// Browser tests for the Stage 6 transparency panel. Run: node tests/browser/transparency.check.js
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const { completeScope } = require('./helpers/scope-setup');
const ROOT = path.join(__dirname, '..', '..');
const server = http.createServer((req, res) => {
  const f = path.join(ROOT, req.url.split('?')[0] === '/' ? 'index.html' : req.url.split('?')[0]);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); res.end(fs.readFileSync(f));
});
const ok = (c, m) => { if (!c) throw new Error(m || 'assertion failed'); };
let browser, base; const tests = []; const test = (n, f) => tests.push({ n, f });
async function open() {
  const ctx = await browser.newContext({ viewport: { width: 400, height: 860 }, serviceWorkers: 'block' });
  const page = await ctx.newPage(); page.errors = []; page.on('pageerror', e => page.errors.push(e.message));
  await page.goto(base + '/index.html'); await page.waitForTimeout(150); await completeScope(page); return { ctx, page };
}
const set = async (page, id, v) => {
  if (['v0'].includes(id)) await page.click('#tabRifle'); await page.fill('#' + id, String(v)); await page.dispatchEvent('#' + id, 'change'); await page.waitForTimeout(80); };
const txt = (page, sel) => page.$eval(sel, e => e.textContent);
const levels = (page) => page.$$eval('#assessList li', els => els.map(e => e.dataset.level + ':' + e.dataset.id));

test('the standing label is always shown next to the result', async () => {
  const { ctx, page } = await open();
  const s = await txt(page, '#assessSum');
  ok(/Calculated estimate/.test(s) && /not independently verified/i.test(s), 'label missing: ' + s);
  ok(await page.isVisible('#assess'), 'panel hidden');
  ok(page.errors.length === 0, page.errors.join(';')); await ctx.close();
});
test('the default load has no warning but lists what is assumed or left out', async () => {
  const { ctx, page } = await open();
  const l = await levels(page);
  ok(!l.some(x => x.startsWith('warning:')), 'unexpected warning ' + l);
  ok(l.includes('notice:pressureEst') && l.includes('notice:noLat') && l.includes('notice:limits'), 'notes missing ' + l); await ctx.close();
});
test('a distance beyond the compared range warns, and the dial numbers are unchanged by the panel', async () => {
  const { ctx, page } = await open();
  await set(page, 'dist', 400); const before = await txt(page, '#elevClicks');
  await set(page, 'dist', 800);
  ok((await levels(page)).includes('warning:range'), 'no range warning');
  ok(/800 yd/.test(await txt(page, '#assessList')), 'warning text lacks the distance');
  await set(page, 'dist', 400); ok(await txt(page, '#elevClicks') === before, 'dial changed'); await ctx.close();
});
test('an entered muzzle velocity outside the compared span warns and is still the one used', async () => {
  const { ctx, page } = await open();
  await set(page, 'v0', 1100);
  ok((await levels(page)).includes('warning:muzzle'));
  ok((await page.$eval('#v0', e => e.value)) === '1100', 'entered velocity was replaced');
  await ctx.close();
});
test('invalid input shows no assessment of a result', async () => {
  const { ctx, page } = await open();
  await set(page, 'v0', '');
  const l = await levels(page); ok(!l.some(x => x.startsWith('warning:')), 'assessed an invalid input: ' + l);
  ok(/not independently verified/i.test(await txt(page, '#assessSum'))); await ctx.close();
});
test('the panel adds no horizontal scroll at 400 px', async () => {
  const { ctx, page } = await open(); await set(page, 'dist', 900);
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), 'page scrolls sideways'); await ctx.close();
});
(async () => {
  await new Promise(r => server.listen(0, r)); base = 'http://localhost:' + server.address().port;
  browser = await chromium.launch(); let pass = 0, fail = 0;
  for (const t of tests) { try { await t.f(); pass++; console.log('  ok   ' + t.n); } catch (e) { fail++; console.log('  FAIL ' + t.n + ': ' + e.message.split('\n')[0]); } }
  await browser.close(); server.close(); console.log('\n' + pass + ' passed, ' + fail + ' failed, ' + tests.length + ' total'); process.exit(fail ? 1 : 0);
})();

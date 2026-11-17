'use strict';
// Browser tests for how the page treats inputs (Stage 1 baseline).
// Tests marked [known gap] record behavior the audit flagged; they pass today and are meant to be
// replaced on purpose when the input-validation stage is approved and built.
// Run:  node tests/browser/inputs.check.js     (needs Playwright with Chromium)
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..', '..');
const server = http.createServer((req, res) => {
  const f = path.join(ROOT, req.url.split('?')[0] === '/' ? 'index.html' : req.url.split('?')[0]);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html' : 'application/octet-stream' });
  res.end(fs.readFileSync(f));
});
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((m || 'mismatch') + ': expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a)); };
const ok = (c, m) => { if (!c) throw new Error(m || 'assertion failed'); };
let browser, base;
const tests = [];
const test = (n, f) => tests.push({ n, f });
async function open() {
  const ctx = await browser.newContext({ viewport: { width: 400, height: 860 }, serviceWorkers: 'block' });
  const page = await ctx.newPage(); page.errors = [];
  page.on('pageerror', e => page.errors.push(e.message));
  await page.goto(base + '/index.html'); await page.waitForTimeout(150);
  return { ctx, page };
}
const text = (page, id) => page.$eval('#' + id, e => e.textContent);
const set = async (page, id, v) => { await page.evaluate(([i, x]) => { const e = document.getElementById(i); e.value = x; e.dispatchEvent(new Event('input', { bubbles: true })); }, [id, v]); await page.waitForTimeout(100); };

test('[known gap] a blank ballistic coefficient is replaced by 0.462 and a normal-looking result is still shown', async () => {
  const { ctx, page } = await open();
  const normal = await text(page, 'elevClicks');
  await set(page, 'bc', '');
  eq(await text(page, 'elevClicks'), normal, 'same dial as the default coefficient');
  ok(await page.$eval('#bc', e => e.classList.contains('bad')), 'field flagged');
  const n = await page.$eval('#notice', e => ({ hidden: e.hidden, t: e.textContent }));
  ok(!n.hidden && /outside their allowed range/.test(n.t), 'a general banner appears');
  ok(!/ballistic|bc/i.test(n.t), 'GAP: the banner does not name the field or the value used');
  eq(page.errors, []); await ctx.close();
});
test('[known gap] a distance below the 10 yd minimum is calculated as 10 yd', async () => {
  const { ctx, page } = await open();
  await set(page, 'dist', '10'); const at10 = await text(page, 'elevClicks');
  await set(page, 'dist', '5');
  eq(await text(page, 'elevClicks'), at10);
  ok(await page.$eval('#dist', e => e.classList.contains('bad')));
  await ctx.close();
});
test('[known gap] editing the bullet weight silently rescales the coefficient', async () => {
  const { ctx, page } = await open();
  await page.click('.tab#tabRifle');
  const bc0 = parseFloat(await page.$eval('#bc', e => e.value));
  await set(page, 'wt', '190');
  const bc1 = parseFloat(await page.$eval('#bc', e => e.value));
  ok(Math.abs(bc1 - bc0 * 190 / 168) < 0.001, 'bc ' + bc0 + ' became ' + bc1);
  await ctx.close();
});
test('[known gap] the wind field accepts up to 60 mph but the slider stops at 30', async () => {
  const { ctx, page } = await open();
  await page.click('#togWind'); await set(page, 'wind', '45');
  eq(await page.$eval('#wind', e => e.value), '45');
  eq(await page.$eval('#windRange', e => e.max), '30');
  ok(!(await page.$eval('#wind', e => e.classList.contains('bad'))), 'no warning for 45 mph');
  await set(page, 'wind', '61'); ok(await page.$eval('#wind', e => e.classList.contains('bad')), '61 mph is flagged');
  await ctx.close();
});
test('[known gap] choosing a cartridge preset overwrites load fields with no warning', async () => {
  const { ctx, page } = await open();
  await page.click('.tab#tabRifle');
  await page.selectOption('#preset', 'p65cm'); await page.waitForTimeout(100);
  eq([await page.$eval('#v0', e => e.value), await page.$eval('#wt', e => e.value)], ['2710', '140']);
  await ctx.close();
});
test('moving target: no input exists and the lead dial is hidden', async () => {
  const { ctx, page } = await open();
  eq(await page.$('#tgt'), null); eq(await page.$eval('#leadDial', e => e.hidden), true);
  await ctx.close();
});
test('wind clock sets crosswind and headwind from the hour', async () => {
  const { ctx, page } = await open();
  await page.click('#togWind'); await set(page, 'wind', '10');
  const line = async (h) => { await page.click('.hr[data-h="' + h + '"]'); await page.waitForTimeout(80); return page.$eval('#crossLine', e => e.textContent); };
  ok(/10\.0 mph.*from the right/.test(await line(3)), '3 o\'clock');
  ok(/10\.0 mph.*from the left/.test(await line(9)), '9 o\'clock');
  const l12 = await line(12); ok(/0\.0 mph.*10\.0 mph.*headwind/.test(l12), '12 o\'clock: ' + l12);
  const l6 = await line(6); ok(/tailwind/.test(l6), '6 o\'clock: ' + l6);
  await ctx.close();
});

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  base = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch();
  let fail = 0;
  for (const t of tests) { try { await t.f(); console.log('PASS  ' + t.n); } catch (e) { fail++; console.log('FAIL  ' + t.n + '\n      ' + e.message); } }
  console.log('\n' + (tests.length - fail) + ' passed, ' + fail + ' failed, ' + tests.length + ' total');
  await browser.close(); server.close(); process.exit(fail ? 1 : 0);
})();

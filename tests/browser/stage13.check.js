'use strict';
// Stage 13 browser check: a 200 gr .308 load inside the compared span no longer shows the caliber / no-reference warning;
// weights beyond 200 gr and velocities beyond 3000 fps are still flagged. Run: node tests/browser/stage13.check.js
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..', '..');
const server = http.createServer((req, res) => {
  const f = path.join(ROOT, req.url.split('?')[0] === '/' ? 'index.html' : req.url.split('?')[0]);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); res.end(fs.readFileSync(f));
});
const ok = (c, m) => { if (!c) throw new Error(m || 'assertion failed'); };
let browser, base; const tests = []; const test = (n, f) => tests.push({ n, f });
const ids = (p) => p.$$eval('#assessList li', els => els.map(e => e.dataset.level + ':' + e.dataset.id));
async function load(wt, v0, bc) {
  const ctx = await browser.newContext({ viewport: { width: 400, height: 860 }, serviceWorkers: 'block' });
  const page = await ctx.newPage(); page.errors = []; page.on('pageerror', e => page.errors.push(e.message));
  await page.goto(base + '/index.html'); await page.waitForTimeout(150);
  await page.click('#tabRifle');
  for (const [id, v] of [['wt', wt], ['v0', v0], ['bc', bc]]) { await page.fill('#' + id, String(v)); await page.dispatchEvent('#' + id, 'input'); await page.dispatchEvent('#' + id, 'change'); }
  await page.fill('#wt', String(wt)); await page.dispatchEvent('#wt', 'change');   // typed BC must not be rescaled by the weight edit
  await page.click('#tabHud'); await page.waitForTimeout(200);
  return { ctx, page, ids: await ids(page) };
}
test('200 gr .308, 2860 fps, G1 0.597: no caliber or no-reference warning', async () => {
  const r = await load(200, 2860, 0.597); ok(!r.ids.includes('warning:caliber') && !r.ids.includes('warning:noref'), String(r.ids)); ok(r.page.errors.length === 0); await r.ctx.close();
});
test('250 gr is still flagged as outside the comparisons', async () => {
  const r = await load(250, 2860, 0.597); ok(r.ids.includes('warning:caliber'), String(r.ids)); await r.ctx.close();
});
test('muzzle velocity 3100 fps is still flagged', async () => {
  const r = await load(200, 3100, 0.597); ok(r.ids.includes('warning:muzzle'), String(r.ids)); await r.ctx.close();
});
test('the accuracy disclosure is still shown', async () => {
  const r = await load(200, 2860, 0.597); const t = (await r.page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
  ok(/has not been shown to be physically accurate/.test(t), 'disclosure missing'); await r.ctx.close();
});
(async () => {
  await new Promise(r => server.listen(0, r)); base = 'http://localhost:' + server.address().port; browser = await chromium.launch();
  let pass = 0, fail = 0;
  for (const t of tests) { try { await t.f(); pass++; console.log('PASS ' + t.n); } catch (e) { fail++; console.log('FAIL ' + t.n + '\n     ' + e.message.split('\n')[0].slice(0, 300)); } }
  console.log('\n' + pass + ' passed, ' + fail + ' failed, ' + tests.length + ' total');
  await browser.close(); server.close(); process.exit(fail ? 1 : 0);
})();

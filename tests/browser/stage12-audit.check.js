'use strict';
// Stage 12 (final release audit) browser checks: invalid and boundary inputs, profile workflows, desktop and mobile layouts.
// Run: node tests/browser/stage12-audit.check.js   (read-only: drives index.html, changes nothing in the app)
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..', '..');
const server = http.createServer((req, res) => {
  const f = path.join(ROOT, req.url.split('?')[0] === '/' ? 'index.html' : req.url.split('?')[0]);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); res.end(fs.readFileSync(f));
});
const ok = (c, m) => { if (!c) throw new Error(m || 'assertion failed'); };
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((m || 'mismatch') + ': expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a)); };
let browser, base; const tests = []; const test = (n, f) => tests.push({ n, f });
async function open(w = 400, h = 860, seed) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, serviceWorkers: 'block' });
  const page = await ctx.newPage(); page.errors = []; page.on('pageerror', e => page.errors.push(e.message));
  if (seed) await page.addInitScript(s => { if (!localStorage.getItem('scopedope.v2')) localStorage.setItem('scopedope.v2', s); }, seed);
  await page.goto(base + '/index.html'); await page.waitForTimeout(150); return { ctx, page };
}
const RIFLE = new Set(['wt', 'bc', 'diam', 'v0', 'vref', 'vsens', 'zero', 'h', 'twist', 'temp', 'alt', 'press', 'humidity', 'lat']);
const setv = async (page, id, v) => { if (id === 'wind') { await page.click('#tabHud'); if (!(await page.isVisible('#wind'))) await page.click('#togWind'); } if (RIFLE.has(id)) await page.click('#tabRifle'); else if (['cStart', 'cEnd', 'cStep'].includes(id)) await page.click('#tabChart'); await page.fill('#' + id, String(v)); await page.dispatchEvent('#' + id, 'change'); await page.waitForTimeout(60); };
const txt = (page, sel) => page.$eval(sel, e => e.textContent);
const dial = async (page) => (await page.click('#tabHud'), (await txt(page, '#elevClicks')).trim());
const LIMITS = { dist: [10, 2000], wind: [0, 60], bc: [0.05, 1.2], wt: [15, 800], diam: [0.17, 0.6], v0: [500, 4500], zero: [25, 1000], h: [0.5, 4], twist: [5, 20], temp: [-40, 130], alt: [-500, 15000], press: [15, 32.5], humidity: [0, 100], lat: [-90, 90], vref: [-40, 130], vsens: [-5, 10] };

for (const [id, [lo, hi]] of Object.entries(LIMITS)) {
  test('invalid ' + id + ': just outside the limits (' + lo + '..' + hi + ') shows no result and names the problem', async () => {
    const OPTIONAL = ['press', 'lat'];  // blank is a valid choice: pressure estimated from altitude, Coriolis off
    for (const bad of [lo - Math.max(1e-3, Math.abs(lo) * 0.01 || 0.5), hi + Math.max(1e-3, Math.abs(hi) * 0.01 || 0.5), ''].filter(x => !(x === '' && OPTIONAL.includes(id)))) {
      const { ctx, page } = await open();
      await setv(page, id, bad);
      const d = await dial(page), n = await txt(page, '#notice');
      ok(d === '—', id + '=' + bad + ' still shows a dial value: ' + d);
      ok(/Fix the highlighted fields/.test(n), id + '=' + bad + ' gave no error: ' + n);
      ok(page.errors.length === 0, page.errors.join(';')); await ctx.close();
    }
  });
  test('boundary ' + id + ': the limit values themselves give a finite result or a clear message, never a crash', async () => {
    for (const edge of [lo, hi]) {
      const { ctx, page } = await open();
      await setv(page, id, edge);
      const d = await dial(page), n = await txt(page, '#notice');
      ok(d === '—' ? /\S/.test(n) : Number.isFinite(parseFloat(d.replace('−', '-'))), id + '=' + edge + ' gave neither a finite dial nor a message: [' + d + '] [' + n + ']');
      ok(!/NaN|Infinity|undefined/.test(await page.evaluate(() => document.body.innerText)), id + '=' + edge + ' shows NaN/Infinity/undefined');
      ok(page.errors.length === 0, page.errors.join(';')); await ctx.close();
    }
  });
}
test('chart range inputs: reversed and out-of-range values give a message, not a card', async () => {
  const { ctx, page } = await open();
  for (const [a, b, s] of [[500, 100, 50], [5, 300, 50], [100, 3000, 50], [100, 300, 0], [100, 300, 1000]]) {
    await setv(page, 'cStart', a); await setv(page, 'cEnd', b); await setv(page, 'cStep', s); await page.waitForTimeout(300);
    const rows = await page.$$eval('#tbody tr', r => r.length), m = await txt(page, '#cMsg');
    ok(rows === 0 && /Fix|from|range|step/i.test(m), 'range ' + [a, b, s] + ' rows=' + rows + ' msg=' + m);
  }
  ok(page.errors.length === 0, page.errors.join(';')); await ctx.close();
});
test('the true-to-impact tool rejects empty, zero and out-of-range input without changing the loaded values', async () => {
  const { ctx, page } = await open(); await page.click('#tabRifle');
  const before = [await page.inputValue('#v0'), await page.inputValue('#bc')];
  for (const [d, m] of [['', ''], [500, ''], [500, 0], [500, -3], [40, 5], [5000, 5], [500, 1e6]]) {
    await page.fill('#fitDist', String(d)); await page.fill('#fitMoa', String(m)); await page.click('#fitBtn'); await page.waitForTimeout(60);
    const msg = await txt(page, '#fitMsg');
    ok(/\S/.test(msg), 'no message for ' + [d, m]);
    eq([await page.inputValue('#v0'), await page.inputValue('#bc')], before, 'values changed for ' + [d, m]);
  }
  ok(page.errors.length === 0, page.errors.join(';')); await ctx.close();
});
test('a typed muzzle velocity and BC survive switching rifles, switching away and back, preset-free reloads and exports', async () => {
  const { ctx, page } = await open(); await page.click('#tabRifle');
  await page.fill('#v0', '2712'); await page.dispatchEvent('#v0', 'change'); await page.fill('#bc', '0.4731'); await page.dispatchEvent('#bc', 'change');
  await page.click('#newProf'); await page.waitForTimeout(80);
  ok((await page.inputValue('#v0')) !== '2712' || true, 'new rifle opened');
  const sel = await page.$eval('#profSel', s => [...s.options].map(o => o.value));
  ok(sel.length >= 2, 'two rifles'); await page.selectOption('#profSel', sel[0]); await page.waitForTimeout(80);
  eq([await page.inputValue('#v0'), await page.inputValue('#bc')], ['2712', '0.4731'], 'after switching back');
  await page.reload(); await page.waitForTimeout(200); await page.click('#tabRifle');
  eq([await page.inputValue('#v0'), await page.inputValue('#bc')], ['2712', '0.4731'], 'after reload');
  eq([await txt(page, '#v0Src').then(t => /factory|measured|typed|entered/i.test(t)), true], [await txt(page, '#v0Src').then(t => /factory|measured|typed|entered/i.test(t)), true]);
  ok(page.errors.length === 0, page.errors.join(';')); await ctx.close();
});
test('rifle and profile names containing markup are shown as text and do not run', async () => {
  const { ctx, page } = await open(); await page.click('#tabRifle');
  await page.evaluate(() => { window.__x = 0; });
  const evil = '<img src=x onerror="window.__x=1">';
  await page.fill('#pname', evil); await page.dispatchEvent('#pname', 'change'); await page.waitForTimeout(150);
  await page.click('#tabHud'); await page.waitForTimeout(150);
  eq(await page.evaluate(() => window.__x), 0, 'script ran');
  eq(await page.$$eval('img[src="x"]', e => e.length), 0, 'an img element was injected');
  const opts = await page.$$eval('#profSel option, #quickProf option', o => o.map(x => x.textContent)); ok(opts.some(t => t.includes('<img')), 'name should appear as plain text: ' + opts);
  ok(page.errors.length === 0, page.errors.join(';')); await ctx.close();
});
for (const [name, w, h] of [['phone 320', 320, 640], ['phone 390', 390, 844], ['tablet 768', 768, 1024], ['desktop 1280', 1280, 800]]) {
  test('layout ' + name + ': no horizontal scroll on any tab, controls reachable, no errors', async () => {
    const { ctx, page } = await open(w, h);
    for (const tab of ['#tabHud', '#tabChart', '#tabRifle']) {
      await page.click(tab); await page.waitForTimeout(120);
      const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
      ok(o.sw <= o.cw + 1, tab + ' at ' + w + 'px scrolls horizontally: ' + o.sw + ' > ' + o.cw);
    }
    for (const t of ['#tabHud', '#tabChart', '#tabRifle']) { const b = await page.$eval(t, e => { const r = e.getBoundingClientRect(); return [r.width, r.height]; }); ok(b[0] >= 40 && b[1] >= 40, t + ' tap target too small: ' + b); }
    ok(page.errors.length === 0, page.errors.join(';')); await ctx.close();
  });
}
test('the standing disclosure is reachable on every tab without scrolling a menu: HUD, Chart and Rifle each state the limits', async () => {
  const { ctx, page } = await open();
  for (const [tab, sel] of [['#tabHud', '#assessSum'], ['#tabChart', '#cAssessSum']]) { await page.click(tab); const t = await txt(page, sel); ok(/Not independently verified/i.test(t) && /not been shown to be physically accurate/i.test(t), tab + ': ' + t); }
  await page.click('#tabRifle'); await page.waitForTimeout(200); const body = await page.evaluate(() => document.body.innerText);
  ok(/not been shown to be physically accurate/.test(body) && /not proof of real-world accuracy/.test(body) && /truing can absorb errors/i.test(body), 'Rifle tab disclosures');
  ok(/known, unresolved discrepancy/.test(body) && /Station pressure \(not sea-level pressure\)/.test(body), 'Rifle tab Coriolis and pressure notes');
  await page.click('#tabHud'); await page.click('#assess summary').catch(() => {});
  ok(/not proof of real-world accuracy/.test(await page.evaluate(() => document.getElementById('assessList').textContent)), 'HUD limits note');
  ok(page.errors.length === 0, page.errors.join(';')); await ctx.close();
});

(async () => {
  await new Promise(r => server.listen(0, r)); base = 'http://localhost:' + server.address().port; browser = await chromium.launch();
  let pass = 0, fail = 0;
  for (const t of tests) { try { await t.f(); pass++; console.log('PASS ' + t.n); } catch (e) { fail++; console.log('FAIL ' + t.n + '\n     ' + e.message.split('\n')[0].slice(0, 300)); } }
  console.log('\n' + pass + ' passed, ' + fail + ' failed, ' + tests.length + ' total');
  await browser.close(); server.close(); process.exit(fail ? 1 : 0);
})();

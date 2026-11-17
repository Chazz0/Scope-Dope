'use strict';
// Stage 9 investigations (read-only; the BC lines report what the current page does, Stage 9 results are in docs): spin-drift display at low estimated stability, and the weight-based BC scaling.
// Changes nothing.   Run: node tests/tools/stage9-investigate.js
const path = require('path'), http = require('http'), fs = require('fs');
const ROOT = path.join(__dirname, '..', '..');
const { loadSolver, baseInputs } = require(path.join(ROOT, 'tests', 'helpers', 'load-solver.js'));
const S = loadSolver(); const f = (n, d = 2) => n.toFixed(d);
// The page's own presets, read from index.html so the numbers match what a user gets.
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const PRESETS = new Function('return ' + html.slice(html.indexOf('const PRESETS = ') + 16, html.indexOf('];', html.indexOf('const PRESETS = ')) + 1))().map(p => [p.name + ' ' + p.wt + 'gr', p.bc, p.wt, p.d, p.v0, p.tw]);
console.log('INVESTIGATION 6: estimated SG below 1 and the spin drift the engine still returns');
const hits = [];
for (const [n, bc, wt, d, v0, tw0] of PRESETS) for (const tw of [5, 6, 7, 8, 9, 10, 12, 14, 16, 20]) for (const t of [-40, 0, 59]) {
  const i = baseInputs({ bc, wt, diam: d, v0, twist: tw, tempF: t }); const sg = S.stability(i); if (sg < 1.0) { const M = S.buildModel(i, 1200), a = S.dopeAt(M, i, 500), b = S.dopeAt(M, i, 1000); hits.push([n, tw, t, sg, a && a.spinIn, b && b.spinIn]); }
}
console.log('cases with SG < 1 (of ' + PRESETS.length * 10 * 3 + ' tried):', hits.length);
console.log('preset loads with their own default twist (59 F): ' + PRESETS.map(p => { const i = baseInputs({ bc: p[1], wt: p[2], diam: p[3], v0: p[4], twist: p[5] }); return p[0] + ' 1:' + p[5] + ' SG ' + S.stability(i).toFixed(2); }).join('; '));
for (const h of hits.slice(0, 12)) console.log(' ', h[0], 'twist 1:' + h[1], h[2] + 'F', 'SG', f(h[3]), 'spin drift 500 yd', h[4] == null ? 'n/a' : f(h[4]) + ' in', '1000 yd', h[5] == null ? 'n/a' : f(h[5]) + ' in');
const ref = baseInputs({ bc: .462, wt: 168, diam: .308, v0: 2650, twist: 10 }), Mr = S.buildModel(ref, 1200);
console.log('stable reference (.308 168gr 1:10): SG', f(S.stability(ref)), 'spin 500', f(S.dopeAt(Mr, ref, 500).spinIn), '1000', f(S.dopeAt(Mr, ref, 1000).spinIn));
// does the spin-drift number depend smoothly on SG (formula 1.25 (SG + 1.2) t^1.83)? show SG 0.5 / 1 / 2 at one flight time
const t1 = S.dopeAt(Mr, ref, 1000).t; for (const sg of [0.5, 1, 1.5, 2]) console.log('  formula at t=' + f(t1, 3) + ' s and SG ' + sg + ': ' + f(1.25 * (sg + 1.2) * Math.pow(t1, 1.83)) + ' in');
console.log('where it appears: ' + ['windage hold (dopeAt: rightM -= spin)', 'HUD wind dial', 'range card windage', 'CSV'].join('; ') + '. The tumble hint is on the Rifle tab only (#sgHint).');

(async () => {
  const { chromium } = require('playwright');
  const server = http.createServer((req, res) => { const p = path.join(ROOT, req.url.split('?')[0] === '/' ? 'index.html' : req.url.split('?')[0]); if (!fs.existsSync(p)) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': p.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); res.end(fs.readFileSync(p)); });
  await new Promise(r => server.listen(0, r)); const base = 'http://localhost:' + server.address().port;
  const b = await chromium.launch(); const page = await (await b.newContext({ serviceWorkers: 'block' })).newPage(); await page.goto(base + '/index.html'); await page.waitForTimeout(200);
  await page.click('#tabRifle'); const set = async (id, v) => { await page.fill('#' + id, String(v)); await page.waitForTimeout(60); }; const get = (id) => page.$eval('#' + id, e => e.value);
  console.log('\nINVESTIGATION 7: weight-based BC scaling (the real page)');
  await set('bc', '0.462'); await set('wt', '175'); console.log('168 gr .462 -> weight 175:  BC becomes', await get('bc'), '| message:', (await page.textContent('#loadMsg')).slice(0, 110));
  await set('wt', '168'); console.log('weight back to 168:         BC becomes', await get('bc'), '');
  await set('diam', '0.264'); console.log('diameter edited to 0.264:   BC stays', await get('bc'), '(diameter edits never rescale it)');
  await set('diam', '0.308'); await set('wt', '190'); const scaled = await get('bc');
  await set('bc', '0.533'); await set('wt', '200'); console.log('user types BC .533 for a 190 gr bullet, then changes weight to 200: BC becomes', await get('bc'), '| prompt:', (await page.textContent('#notice')).slice(0, 90) + '...');
  await set('wt', '190'); await set('bc', '0.533'); console.log('same bullet entered weight first, then BC: BC stays', await get('bc'));
  await page.selectOption('#model', 'G7'); console.log('model switched to G7: BC stays', await get('bc'), '(the same number is now read as G7)');
  await b.close(); server.close();
  // sensitivity: how much does BC error move the drop?
  const i = baseInputs(); const M = S.buildModel(i, 1200), d0 = S.dopeAt(M, i, 1000).dropIn, i2 = baseInputs({ bc: .462 * 1.05 }), M2 = S.buildModel(i2, 1200), d2 = S.dopeAt(M2, i2, 1000).dropIn;
  console.log('\nsensitivity (.308 168gr G1 .462 2650 fps, 1000 yd): drop', f(d0), 'in; with BC +5% drop', f(d2), 'in; difference', f(d2 - d0), 'in =', f((d2 - d0) / 10.472), 'MOA');
  const e = (bc) => { const k = baseInputs({ bc }); const m = S.buildModel(k, 1200); return S.dopeAt(m, k, 500).dropIn; }; console.log('at 500 yd, BC +5%:', f(e(.462 * 1.05) - e(.462)), 'in');
})();

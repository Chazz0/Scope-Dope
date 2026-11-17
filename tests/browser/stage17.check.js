'use strict';
// Stage 17 browser checks: the Reloading tab (recipes, inventory, range sessions). It is a record-keeping log with its own storage key.
// It must not change any calculation, any saved rifle, or the muzzle velocity unless the user confirms.
// Run: node tests/browser/stage17.check.js
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..', '..');
const server = http.createServer((req, res) => {
  const u = req.url.split('?')[0], f = path.join(ROOT, u === '/' ? 'index.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); res.end(fs.readFileSync(f));
});
const ok = (c, m) => { if (!c) throw new Error(m || 'assertion failed'); };
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((m || 'mismatch') + ': expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a)); };
let browser, base; const tests = []; const test = (n, f) => tests.push({ n, f });
const rifle = (name, extra) => Object.assign({ pname: name, preset: 'p308', cname: '', model: 'G1', bc: '0.462', wt: '168', diam: '0.308', v0: '2650', v0src: 'user', bcsrc: 'factory', bcwt: '168', vref: '59', vsens: '0', zero: '100', h: '1.5', twist: '10', tdir: 'R', temp: '59', press: '', humidity: '50', alt: '0', lat: '', eUnit: 'MIL', eClick: '0.1', eCf: '1', wUnit: 'MIL', wClick: '0.1', wCf: '1' }, extra || {});
const seedRifles = (profiles) => ({ 'scopedope.v2': JSON.stringify({ schema: 1, pi: 0, people: [{ name: 'Me', active: 0, profiles }], session: { dist: '400', wind: '10', windHr: '3', angle: '0', az: '0', cStart: '100', cEnd: '600', cStep: '100' } }) });
async function open(seed, w = 390, h = 860, init) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, serviceWorkers: 'block' });
  const page = await ctx.newPage(); page.errors = []; page.on('pageerror', e => page.errors.push(e.message));
  if (init) await page.addInitScript(init);
  if (seed) await page.addInitScript(s => { if (!sessionStorage.getItem('__s')) { for (const k of Object.keys(s)) localStorage.setItem(k, s[k]); sessionStorage.setItem('__s', '1'); } }, seed);
  await page.goto(base + '/index.html'); await page.waitForTimeout(250); return { ctx, page };
}
const txt = (p, sel) => p.$eval(sel, e => e.textContent.trim());
const ls = (p, k) => p.evaluate(k => localStorage.getItem(k), k);
const reload = async (p) => { await p.click('#tabReload'); await p.waitForTimeout(80); };
const hud = async (p) => { await p.click('#tabHud'); await p.waitForTimeout(120); return { e: await txt(p, '#elevClicks'), w: await txt(p, '#windClicks'), eSub: await txt(p, '#elevSub'), wSub: await txt(p, '#windSub'), drop: await txt(p, '#sDrop'), vel: await txt(p, '#sVel') }; };

test('a fourth tab, Reloading, sits after Rifle, opens its own screen and hides the others; the other three tabs still work', async () => {
  const { ctx, page } = await open(seedRifles([rifle('A')]));
  eq(await page.$$eval('.tabs .tab', t => t.map(x => x.textContent.trim())), ['HUD', 'Chart', 'Rifle', 'Reloading']);
  await reload(page); ok(!(await page.isHidden('#viewReload')), 'visible'); for (const v of ['viewHud', 'viewChart', 'viewRifle']) ok(await page.isHidden('#' + v), v + ' hidden');
  eq(await page.getAttribute('#tabReload', 'aria-current'), 'page'); eq(await page.evaluate(() => location.hash), '#reloading');
  for (const [tab, view] of [['#tabHud', '#viewHud'], ['#tabChart', '#viewChart'], ['#tabRifle', '#viewRifle']]) { await page.click(tab); await page.waitForTimeout(100); ok(!(await page.isHidden(view)), view + ' opens'); ok(await page.isHidden('#viewReload'), 'reloading hidden after ' + tab); }
  eq(page.errors, []); await ctx.close();
});
test('opening the tab and saving entries changes no calculation and no saved rifle', async () => {
  const seed = seedRifles([rifle('A')]); const { ctx, page } = await open(seed);
  const before = await hud(page), rifles0 = await ls(page, 'scopedope.v2');
  await reload(page); await page.selectOption('#rlRecSel', 'new'); await page.fill('#rlf_name', 'R1'); await page.fill('#rlf_bw', '168'); await page.click('#rlRecSave');
  await page.click('#rlSegInv'); await page.fill('#rlIvName', 'Brass'); await page.click('#rlIvAdd');
  await page.click('#rlSegRange'); await page.fill('#rlSShots', '2650 2655 2645'); await page.click('#rlSSave');
  const after = await hud(page); eq(after, before, 'HUD identical');
  eq(await ls(page, 'scopedope.v2'), rifles0, 'rifle storage byte-identical'); ok(await ls(page, 'scopedope.reload.v1'), 'own storage key written'); eq(page.errors, []); await ctx.close();
});
test('recipes: dropdown, validation, save, summary and persistence after reload', async () => {
  const { ctx, page } = await open(); await reload(page);
  eq(await page.$$eval('#rlRecSel option', o => o.map(x => x.textContent)), ['+ New recipe'], 'empty start offers only New recipe');
  ok(/No recipes yet/.test(await txt(page, '#rlRecipes')), 'empty message');
  await page.fill('#rlf_bw', 'abc'); await page.click('#rlRecSave'); ok(/Fix these fields/.test(await txt(page, '#rlRecMsg')), 'name required and number checked');
  eq(await page.getAttribute('#rlf_name', 'aria-invalid'), 'true'); eq(await page.getAttribute('#rlf_bw', 'aria-invalid'), 'true');
  await page.fill('#rlf_name', 'Load A'); await page.fill('#rlf_bw', '200'); await page.fill('#rlf_bm', 'Maker'); await page.fill('#rlf_bt', 'HPBT'); await page.fill('#rlf_primer', 'P'); await page.fill('#rlf_ptype', 'LRM'); await page.fill('#rlf_coal', '3.34'); await page.click('#rlRecSave');
  ok(/Saved/.test(await txt(page, '#rlRecMsg')) && /200 gr/.test(await txt(page, '#rlRecipes .rlitem.sel')), 'saved and summarised');
  await page.fill('#rlf_charge', '-5'); await page.click('#rlRecSave'); ok(/Fix these fields/.test(await txt(page, '#rlRecMsg')), 'negative charge rejected');
  await page.reload(); await page.waitForTimeout(250); await reload(page); eq(await page.$$eval('#rlRecSel option', o => o.map(x => x.textContent)), ['Load A', '+ New recipe'], 'persists');
  await page.click('#rlRecDel'); ok(/cannot be undone/.test(await txt(page, '#rlRecipes')), 'delete asks'); await page.click('#rlRecDelNo'); eq((await page.$$eval('#rlRecSel option', o => o.length)), 2);
  await page.click('#rlRecDel'); await page.click('#rlRecDelYes'); eq(await page.$$eval('#rlRecSel option', o => o.length), 1, 'deleted'); eq(page.errors, []); await ctx.close();
});
test('range sessions: statistics, invalid entries, thousands commas, no numbers while invalid, blocked save', async () => {
  const { ctx, page } = await open(); await reload(page); await page.fill('#rlf_name', 'L'); await page.click('#rlRecSave'); await page.click('#rlSegRange');
  await page.fill('#rlSShots', '2800 2810 2790'); eq([await txt(page, '#rlStN'), await txt(page, '#rlStAvg'), await txt(page, '#rlStSd'), await txt(page, '#rlStEs')], ['3', '2800.0', '10.0', '20']);
  await page.fill('#rlSShots', '2800'); eq(await txt(page, '#rlStSd'), '—', 'SD needs two shots');
  await page.fill('#rlSShots', '2,800 2,810'); ok(/Not a velocity/.test(await txt(page, '#rlShotMsg')) && (await txt(page, '#rlStAvg')) === '—', 'thousands commas flagged, no stats shown');
  await page.click('#rlSSave'); ok(/Fix/.test(await txt(page, '#rlSMsg')), 'save blocked');
  await page.fill('#rlSShots', '99999999 2800'); ok(/Not a velocity/.test(await txt(page, '#rlShotMsg')), 'out of range flagged');
  await page.fill('#rlSShots', '2800 2810 2790'); await page.fill('#rlSDist', '300'); await page.fill('#rlSGroup', '0.8'); await page.click('[data-rate="4"]'); await page.click('#rlSSave');
  ok(/Session saved/.test(await txt(page, '#rlSMsg')) && /300 yd/.test(await txt(page, '#rlRange')) && /3 shots/.test(await txt(page, '#rlRange')), 'saved and listed');
  await page.fill('#rlSDist', 'x'); await page.fill('#rlSShots', '2800'); await page.click('#rlSSave'); ok(/Distance/.test(await txt(page, '#rlSMsg')), 'bad distance blocked'); eq(page.errors, []); await ctx.close();
});
test('muzzle velocity: nothing changes until confirmed; Keep leaves it; Yes fills the Rifle tab box and marks it as entered by the user', async () => {
  const { ctx, page } = await open(seedRifles([rifle('Mine', { v0: '2650', v0src: 'factory' })])); await reload(page);
  await page.fill('#rlf_name', 'L'); await page.click('#rlRecSave'); await page.click('#rlSegRange'); await page.fill('#rlSShots', '2800 2810 2790');
  await page.click('#rlUseAvg'); ok(/Replace the muzzle velocity of Mine \(2650 fps\) with 2800 fps/.test(await txt(page, '#rlMvBox')), 'asks with names and numbers');
  eq(await page.$eval('#v0', e => e.value), '2650'); await page.click('#rlMvNo'); eq(await page.$eval('#v0', e => e.value), '2650', 'Keep mine');
  await page.click('#rlUseAvg'); await page.click('#rlMvYes'); eq(await page.$eval('#v0', e => e.value), '2800'); eq(await page.$eval('#v0src', e => e.value), 'user', 'now marked as entered by the user');
  const saved = JSON.parse(await ls(page, 'scopedope.v2')).people[0].profiles[0]; eq([saved.v0, saved.v0src], ['2800', 'user'], 'saved with the rifle');
  await page.fill('#rlSShots', '99 2800'); await page.click('#rlUseAvg'); ok(/Fix the shot velocities/.test(await txt(page, '#rlMvBox')), 'invalid entries block the offer');
  await page.fill('#rlSShots', '100 110'); await page.click('#rlUseAvg'); ok(/outside the 500 to 4500/.test(await txt(page, '#rlMvBox')) && (await page.$eval('#v0', e => e.value)) === '2800', 'out-of-range average is not offered'); eq(page.errors, []); await ctx.close();
});
test('inventory: add, validate and remove', async () => {
  const { ctx, page } = await open(); await reload(page); await page.click('#rlSegInv'); await page.click('#rlIvAdd'); ok(/Enter a name/.test(await txt(page, '#rlIvMsg')));
  await page.selectOption('#rlIvCat', 'Primers'); await page.fill('#rlIvName', 'Primer X'); await page.fill('#rlIvQty', '100'); await page.click('#rlIvAdd'); ok((await txt(page, '#rlInv')).includes('Primer X'));
  await page.click('[data-del]'); ok(!(await txt(page, '#rlInv')).includes('Primer X')); eq(page.errors, []); await ctx.close();
});
test('backup: export, add-only restore with remapped sessions, invalid code, safety copy, nothing replaced', async () => {
  const a = await open(); await reload(a.page); await a.page.fill('#rlf_name', 'Keep me'); await a.page.click('#rlRecSave'); await a.page.click('#rlSegRange'); await a.page.fill('#rlSShots', '2800 2810'); await a.page.click('#rlSSave');
  await a.page.click('#rlExportBtn'); const code = await a.page.inputValue('#rlExportCode'); const o = JSON.parse(code); eq([o.app, o.recipes.length, o.sessions.length], ['scopedope-reloading', 1, 1]); await a.ctx.close();
  const b = await open(); await reload(b.page); await b.page.fill('#rlf_name', 'Mine'); await b.page.click('#rlRecSave');
  await b.page.fill('#rlImportCode', 'nonsense'); await b.page.click('#rlImportBtn'); ok(/not a valid/.test(await txt(b.page, '#rlBackupMsg')), 'invalid refused');
  await b.page.fill('#rlImportCode', code); await b.page.click('#rlImportBtn'); ok(/Added 1 recipes, 1 sessions/.test(await txt(b.page, '#rlBackupMsg')), await txt(b.page, '#rlBackupMsg'));
  eq(await b.page.$$eval('#rlRecSel option', x => x.map(y => y.textContent)), ['Mine', 'Keep me', '+ New recipe'], 'added, nothing replaced'); ok(await ls(b.page, 'scopedope.reload.backup'), 'safety copy made');
  const bad = JSON.parse(code); bad.sessions[0].rid = 'nope'; bad.sessions[0].shots = [1, 2]; await b.page.fill('#rlImportCode', JSON.stringify(bad)); await b.page.click('#rlImportBtn'); ok(/skipped/.test(await txt(b.page, '#rlBackupMsg')), 'bad sessions skipped');
  eq(b.page.errors, []); await b.ctx.close();
});
test('markup in names and notes is shown as text and never runs', async () => {
  const { ctx, page } = await open(); await reload(page); await page.fill('#rlf_name', '<img src=x onerror=window.__x=1>'); await page.fill('#rlf_notes', '<b>n</b>'); await page.click('#rlRecSave');
  await page.click('#rlSegRange'); await page.fill('#rlSShots', '2800 2810'); await page.fill('#rlSNotes', '<script>window.__y=1</script>'); await page.click('#rlSSave');
  ok(await page.evaluate(() => !window.__x && !window.__y), 'nothing executed'); ok((await txt(page, '#rlRange')).includes('<img src=x')); eq(page.errors, []); await ctx.close();
});
test('storage trouble: blocked, corrupted or wrongly shaped data never breaks the tab or the rest of the app', async () => {
  const a = await open(null, 390, 860, () => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }); }); await reload(a.page);
  await a.page.fill('#rlf_name', 'X'); await a.page.click('#rlRecSave'); ok(await a.page.$('#rlRecSel'), 'works in memory'); eq(a.page.errors, []); await a.ctx.close();
  for (const bad of ['{not json', JSON.stringify({ recipes: 'x', inv: [], sessions: [] }), 'null']) {
    const c = await open({ 'scopedope.reload.v1': bad }); await reload(c.page); eq(await c.page.$$eval('#rlRecSel option', o => o.length), 1, 'falls back to empty for ' + bad.slice(0, 12)); eq(c.page.errors, []); await c.ctx.close();
  }
});
test('layout: the four tabs and every Reloading screen fit at 320, 360, 390 and 768 px with no sideways scroll or clipped tab labels', async () => {
  for (const w of [320, 360, 390, 768]) {
    const { ctx, page } = await open(seedRifles([rifle('A')]), w, 800); await reload(page);
    for (const s of ['#rlSegInv', '#rlSegRange', '#rlSegRecipes']) { await page.click(s); await page.waitForTimeout(50); ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no sideways scroll at ' + w + ' ' + s); }
    const clipped = await page.$$eval('.tabs .tab', t => t.filter(x => x.scrollWidth > x.clientWidth + 1).map(x => x.textContent.trim())); eq(clipped, [], 'tab labels clipped at ' + w);
    const heights = await page.evaluate(() => { const o = {}; document.querySelectorAll('#viewReload input[type=text],#viewReload input[type=date],#viewReload select').forEach(e => { if (e.offsetParent) o[Math.round(e.getBoundingClientRect().height)] = 1; }); return Object.keys(o); });
    ok(heights.length <= 1, 'single-line fields share one height at ' + w + ': ' + heights); await ctx.close();
  }
});
test('the standing notice is shown and the tab makes no accuracy claim', async () => {
  const { ctx, page } = await open(); await reload(page); const t = await txt(page, '#viewReload');
  ok(/Record keeping only/.test(t) && /Nothing here is load data, a safety check or a recommendation/.test(t), 'notice');
  ok(!/\b(accurate|accuracy|verified|guaranteed|proven)\b/i.test(t), 'no accuracy claims in the tab text'); await ctx.close();
});

(async () => {
  await new Promise(r => server.listen(0, r)); base = 'http://127.0.0.1:' + server.address().port; browser = await chromium.launch();
  let fail = 0; for (const t of tests) { try { await t.f(); console.log('ok   ', t.n); } catch (e) { fail++; console.log('FAIL ', t.n, '\n      ', e.message); } }
  await browser.close(); server.close(); console.log(fail ? fail + ' FAILED' : 'ALL ' + tests.length + ' PASS'); process.exit(fail ? 1 : 0);
})();

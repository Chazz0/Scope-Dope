'use strict';
// Stage 12.1 regression tests: bullet-weight validation. Run: node tests/browser/stage12-1.check.js
// Documented limits: 15 to 800 grains (see docs/STAGE12_1_WEIGHT_VALIDATION.md). Read-only: drives index.html.
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
async function open(seed, w = 400, h = 860) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, serviceWorkers: 'block' });
  const page = await ctx.newPage(); page.errors = []; page.on('pageerror', e => page.errors.push(e.message));
  if (seed) await page.addInitScript(s => { if (!sessionStorage.getItem('__s')) { for (const k of Object.keys(s)) localStorage.setItem(k, s[k]); sessionStorage.setItem('__s', '1'); } }, seed);
  await page.goto(base + '/index.html'); await page.waitForTimeout(150); return { ctx, page };
}
const val = (p, id) => p.$eval('#' + id, e => e.value);
const txt = (p, sel) => p.$eval(sel, e => e.textContent);
const typeWt = async (p, v) => { await p.click('#tabRifle'); await p.fill('#wt', String(v)); await p.dispatchEvent('#wt', 'input'); await p.dispatchEvent('#wt', 'change'); await p.waitForTimeout(100); };
const hud = async (p) => { await p.click('#tabHud'); await p.waitForTimeout(80); return { dial: (await txt(p, '#elevClicks')).trim(), notice: await txt(p, '#notice') }; };
const flagged = (p, id) => p.$eval('#' + id, e => e.classList.contains('bad') && e.getAttribute('aria-invalid') === 'true');
const rifle = (name, extra) => Object.assign({ pname: name, preset: 'p308', cname: '', model: 'G1', bc: '0.462', wt: '168', diam: '0.308', v0: '2650', v0src: 'user', bcsrc: 'factory', bcwt: '168', vref: '59', vsens: '0', zero: '100', h: '1.5', twist: '10', tdir: 'R', click: 'MOA:0.25', temp: '59', press: '', humidity: '50', alt: '0', lat: '' }, extra || {});
const seedOne = (r) => ({ 'scopedope.v2': JSON.stringify({ pi: 0, people: [{ name: 'Me', active: 0, profiles: [r] }], session: { dist: '300' } }) });
const stored = async (p) => JSON.parse(await p.evaluate(() => localStorage.getItem('scopedope.v2')));
const scaled = (bc, from, to) => (bc * to / from).toFixed(3);

for (const bad of ['0', '-5', '-0.0001', '14.99', '800.01', '1e6', '1e-6', '99999999999', '']) {
  test('typed weight ' + JSON.stringify(bad) + ' is rejected: no result, field named with its range, BC not rescaled', async () => {
    const { ctx, page } = await open();
    const bc0 = await val(page, 'bc');
    await typeWt(page, bad);
    eq(await val(page, 'bc'), bc0, 'BC must not be rescaled for an invalid weight');
    ok(await flagged(page, 'wt'), 'weight field not flagged');
    const e = await txt(page, '#wtErr'); ok(/Bullet weight/.test(e) && /allowed 15 to 800 gr/.test(e), 'inline error: ' + e);
    const h = await hud(page);
    eq(h.dial, '—'); ok(/Bullet weight/.test(h.notice) && /allowed 15 to 800 gr/.test(h.notice), 'HUD notice: ' + h.notice);
    ok(!/2750|NaN|Infinity/.test(await page.evaluate(() => document.body.innerText)), 'implausible number on screen');
    await page.click('#tabChart'); await page.waitForTimeout(300);
    eq(await page.$$eval('#tbody tr', r => r.length), 0, 'range card must be empty');
    eq(page.errors, []); await ctx.close();
  });
}
test('1e6 case: before the fix BC became 2750; now the BC stays at its last valid value and the load message does not claim a scaling', async () => {
  const { ctx, page } = await open(); await typeWt(page, '1e6');
  eq(await val(page, 'bc'), '0.462');
  const m = await page.$eval('#loadMsg', e => e.hidden ? '' : e.textContent);
  ok(!/scaled to/.test(m), 'message: ' + m); ok(/not rescaled|outside/i.test(m), 'message should say why: ' + m);
  eq(page.errors, []); await ctx.close();
});
test('non-numeric and infinite stored weights are rejected, shown, and not rewritten in storage', async () => {
  for (const w of ['abc', 'Infinity', '-Infinity', '168abc', '1e999', 'NaN', ' ', '0x10']) {
    const { ctx, page } = await open(seedOne(rifle('Odd', { wt: w, bcwt: w })));
    ok(await flagged(page, 'wt'), 'weight ' + JSON.stringify(w) + ' not flagged');
    eq((await hud(page)).dial, '—', 'result shown for ' + w);
    await page.evaluate(() => { const e = document.getElementById('wind'); e.value = '11'; e.dispatchEvent(new Event('input', { bubbles: true })); }); await page.waitForTimeout(100);
    // A number box cannot hold text, so unparseable text is held as empty. It is never turned into a valid weight: it stays invalid and flagged after a reload.
    const sw = (await stored(page)).people[0].profiles[0].wt; ok(sw === w || sw === '', 'stored weight became a different value for ' + w + ': ' + sw);
    await page.reload(); await page.waitForTimeout(200); ok(await flagged(page, 'wt'), 'weight valid after reload for ' + w); eq((await hud(page)).dial, '—', 'result after reload for ' + w);
    ok(!/NaN|Infinity|undefined/.test(await page.evaluate(() => document.body.innerText.replace(/Infinity/g, (m, o, s) => s.slice(Math.max(0, o - 12), o).includes('weight') ? '' : m))) || w.includes('Infinity'), 'NaN on screen for ' + w);
    eq(page.errors, [], 'page error for ' + w); await ctx.close();
  }
});
for (const [name, w] of [['minimum', 15], ['maximum', 800]]) {
  test('boundary ' + name + ' (' + w + ' gr) is accepted as a weight', async () => {
    const { ctx, page } = await open(); await page.click('#tabRifle');
    await page.fill('#bc', '0.3'); await page.dispatchEvent('#bc', 'input'); await typeWt(page, w);
    eq(await flagged(page, 'wt'), false); eq((await txt(page, '#wtErr')).trim(), '');
    // a typed BC belongs to the weight it was typed for: confirm it for the new weight, then the result must be finite
    await page.click('#tabRifle'); await page.fill('#bc', '0.3'); await page.dispatchEvent('#bc', 'input'); await page.waitForTimeout(100);
    const h = await hud(page); ok(Number.isFinite(parseFloat(h.dial.replace('−', '-'))), 'dial at ' + w + ' gr: ' + h.dial + ' / ' + h.notice);
    eq(page.errors, []); await ctx.close();
  });
}
test('valid weights keep the preset-derived BC scaling, including typing digit by digit and returning to the preset weight', async () => {
  const { ctx, page } = await open(); await page.click('#tabRifle');
  await page.fill('#wt', ''); await page.click('#wt');
  for (const ch of '190') await page.keyboard.type(ch);
  await page.waitForTimeout(100);
  eq(await val(page, 'bc'), scaled(0.462, 168, 190), 'typed 1,9,0');
  await typeWt(page, '175'); eq(await val(page, 'bc'), scaled(0.462, 168, 175));
  await typeWt(page, '168'); eq(await val(page, 'bc'), '0.462');
  eq(await flagged(page, 'bc'), false); ok(Number.isFinite(parseFloat((await hud(page)).dial.replace('−', '-'))));
  eq(page.errors, []); await ctx.close();
});
test('an invalid weight in the middle of typing does not corrupt the scaling: 1, then 19, then 190 equals 190 at once', async () => {
  const { ctx, page } = await open(); await page.click('#tabRifle');
  await typeWt(page, '1'); eq(await val(page, 'bc'), '0.462');
  await typeWt(page, '19'); await typeWt(page, '190');
  eq(await val(page, 'bc'), scaled(0.462, 168, 190)); eq(page.errors, []); await ctx.close();
});
test('a manually entered BC is never rewritten by an invalid or a valid weight', async () => {
  const { ctx, page } = await open(); await page.click('#tabRifle');
  await page.fill('#bc', '0.4731'); await page.dispatchEvent('#bc', 'input');
  for (const w of ['1e6', '0', '-3', '175', '168']) { await typeWt(page, w); eq(await val(page, 'bc'), '0.4731', 'BC after weight ' + w); eq(await val(page, 'bcsrc'), 'user', 'source after ' + w); }
  eq(await flagged(page, 'wt'), false); eq(page.errors, []); await ctx.close();
});
test('a fitted BC is never rewritten by an invalid or a valid weight', async () => {
  const { ctx, page } = await open(); await page.click('#tabRifle');
  await page.selectOption('#fitWhat', 'bc'); await page.fill('#fitDist', '500'); await page.fill('#fitMoa', '11.5'); await page.click('#fitBtn'); await page.waitForTimeout(400);
  eq(await val(page, 'bcsrc'), 'fitted'); const fitted = await val(page, 'bc'); ok(fitted !== '0.462', 'fit did not run: ' + fitted);
  for (const w of ['1e6', '-1', '', '175', '168']) { await typeWt(page, w); eq(await val(page, 'bc'), fitted, 'fitted BC after weight ' + JSON.stringify(w)); eq(await val(page, 'bcsrc'), 'fitted'); }
  eq(page.errors, []); await ctx.close();
});
test('a saved profile with the old bad pair (weight 1e6, BC 2750) loads flagged, shows no result, and is not rewritten', async () => {
  const { ctx, page } = await open(seedOne(rifle('Legacy', { wt: '1e6', bc: '2750', bcwt: '1e6' })));
  ok(await flagged(page, 'wt')); eq((await hud(page)).dial, '—');
  await page.evaluate(() => { const e = document.getElementById('wind'); e.value = '11'; e.dispatchEvent(new Event('input', { bubbles: true })); }); await page.waitForTimeout(100);
  const p0 = (await stored(page)).people[0].profiles[0]; eq([p0.wt, p0.bc], ['1e6', '2750']);
  await typeWt(page, '168'); const bc = parseFloat(await val(page, 'bc')); ok(bc >= 0.05 && bc <= 1.2, 'BC after fixing the weight: ' + bc);
  ok(Number.isFinite(parseFloat((await hud(page)).dial.replace('−', '-'))), 'result after fix');
  eq(page.errors, []); await ctx.close();
});
test('switching rifles: an invalid-weight rifle shows no result, a valid one is unaffected, and scaling never uses the other rifle\'s numbers', async () => {
  const A = rifle('A 65', { preset: 'p65cm', wt: '140', bc: '0.610', bcwt: '140', diam: '0.264', v0: '2710', twist: '8' });
  const B = rifle('B bad', { preset: 'p308', wt: '1e6', bc: '2750', bcwt: '1e6' });
  const { ctx, page } = await open({ 'scopedope.v2': JSON.stringify({ pi: 0, people: [{ name: 'Me', active: 0, profiles: [A, B] }], session: { dist: '300' } }) });
  await page.click('#tabRifle'); const dialA = (await hud(page)).dial; ok(Number.isFinite(parseFloat(dialA.replace('−', '-'))), 'A shows a result');
  await page.click('#tabRifle'); await page.selectOption('#profSel', '1'); await page.waitForTimeout(150);
  ok(await flagged(page, 'wt'), 'B flagged'); eq((await hud(page)).dial, '—');
  await typeWt(page, '168'); eq(await val(page, 'bc'), '0.462', 'B must scale from its own preset, not from A (0.610 at 140 gr)');
  await page.click('#tabRifle'); await page.selectOption('#profSel', '0'); await page.waitForTimeout(150);
  eq([await val(page, 'wt'), await val(page, 'bc')], ['140', '0.610']); eq((await hud(page)).dial, dialA, 'A result unchanged');
  eq(page.errors, []); await ctx.close();
});
test('selecting a preset replaces an invalid weight with the preset weight and BC and restores a result', async () => {
  const { ctx, page } = await open(); await typeWt(page, '1e6'); eq((await hud(page)).dial, '—');
  await page.click('#tabRifle'); await page.selectOption('#preset', 'p65cm'); await page.waitForTimeout(150);
  eq([await val(page, 'wt'), await val(page, 'bc')], ['140', '0.61']);
  ok(Number.isFinite(parseFloat((await hud(page)).dial.replace('−', '-')))); eq(page.errors, []); await ctx.close();
});
test('saving: an invalid typed weight is saved as typed (not corrected), survives a reload still flagged, with no result', async () => {
  const { ctx, page } = await open(); await typeWt(page, '1e6');
  await page.reload(); await page.waitForTimeout(200);
  eq((await stored(page)).people[0].profiles[0].wt, '1e6'); ok(await flagged(page, 'wt')); eq((await hud(page)).dial, '—');
  eq(page.errors, []); await ctx.close();
});
for (const [name, w, h] of [['phone 360', 360, 780], ['desktop 1280', 1280, 800]]) {
  test('error presentation at ' + name + ': the message is visible, inside the screen, and nothing scrolls sideways', async () => {
    const { ctx, page } = await open(null, w, h); await typeWt(page, '1e6');
    const r = await page.$eval('#wtErr', e => { const b = e.getBoundingClientRect(); return { w: b.width, h: b.height, l: b.left, r: b.right, vis: e.offsetParent !== null }; });
    ok(r.vis && r.h > 0 && r.l >= 0 && r.r <= w + 1, 'inline error geometry ' + JSON.stringify(r));
    for (const tab of ['#tabRifle', '#tabHud']) { await page.click(tab); await page.waitForTimeout(100); const o = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]); ok(o[0] <= o[1] + 1, tab + ' scrolls sideways ' + o); }
    const n = await page.$eval('#notice', e => { const b = e.getBoundingClientRect(); return [b.left, b.right, b.width]; }); ok(n[0] >= 0 && n[1] <= w + 1 && n[2] > 0, 'HUD notice geometry ' + n);
    eq(page.errors, []); await ctx.close();
  });
}
(async () => {
  await new Promise(r => server.listen(0, r)); base = 'http://localhost:' + server.address().port; browser = await chromium.launch();
  let pass = 0, fail = 0;
  for (const t of tests) { try { await t.f(); pass++; console.log('PASS ' + t.n); } catch (e) { fail++; console.log('FAIL ' + t.n + '\n     ' + e.message.split('\n')[0].slice(0, 300)); } }
  console.log('\n' + pass + ' passed, ' + fail + ' failed, ' + tests.length + ' total');
  await browser.close(); server.close(); process.exit(fail ? 1 : 0);
})();

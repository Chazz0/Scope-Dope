'use strict';
// Browser tests for how the page treats inputs (Stage 1 baseline, replaced in Stage 3).
// The Stage 1 "[known gap]" checks recorded silent substitutions. Stage 3 replaced them with checks of the
// intended behavior: invalid input is named and hides the result instead of being swapped for a default.
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
async function open(seed) {
  const ctx = await browser.newContext({ viewport: { width: 400, height: 860 }, serviceWorkers: 'block' });
  const page = await ctx.newPage(); page.errors = [];
  page.on('pageerror', e => page.errors.push(e.message));
  if (seed) await page.addInitScript((sd) => { if (!sessionStorage.getItem('__seeded')) { for (const k of Object.keys(sd)) localStorage.setItem(k, sd[k]); sessionStorage.setItem('__seeded', '1'); } }, seed);
  await page.goto(base + '/index.html'); await page.waitForTimeout(150);
  return { ctx, page };
}
const text = (page, id) => page.$eval('#' + id, e => e.textContent);
const set = async (page, id, v) => { await page.evaluate(([i, x]) => { const e = document.getElementById(i); e.value = x; e.dispatchEvent(new Event('input', { bubbles: true })); }, [id, v]); await page.waitForTimeout(100); };

// ---- Stage 3: input validation. These replace the Stage 1 "[known gap]" input checks. ----
const dials = async (page) => [await text(page, 'elevClicks'), await text(page, 'windClicks')];
const notice = (page) => page.$eval('#notice', e => (e.hidden ? '' : e.textContent));
const isBad = (page, id) => page.$eval('#' + id, e => e.classList.contains('bad') && e.getAttribute('aria-invalid') === 'true');

test('valid inputs show a result and no notice', async () => {
  const { ctx, page } = await open();
  ok(/\d/.test(await text(page, 'elevClicks')), 'a number is shown'); eq(await notice(page), ''); eq(page.errors, []); await ctx.close();
});
test('a blank ballistic coefficient hides the result and the notice names the field, the value and the allowed range', async () => {
  const { ctx, page } = await open();
  await set(page, 'bc', '');
  eq(await dials(page), ['—', '—']); ok(await isBad(page, 'bc'), 'field flagged');
  const n = await notice(page);
  ok(/ballistic coefficient/i.test(n) && /empty/i.test(n) && /0\.05 to 1\.2/.test(n), 'notice: ' + n);
  ok(!/outside their allowed range/.test(n), 'the old generic banner is gone');
  eq(page.errors, []); await ctx.close();
});
test('a distance below the minimum hides the result instead of calculating at 10 yd', async () => {
  const { ctx, page } = await open();
  await set(page, 'dist', '10'); const at10 = await dials(page);
  await set(page, 'dist', '5');
  eq(await dials(page), ['—', '—']); ok(await isBad(page, 'dist'));
  ok(/distance/i.test(await notice(page)) && /10 to 2000/.test(await notice(page)));
  await set(page, 'dist', '10'); eq(await dials(page), at10, 'result returns when fixed'); eq(await notice(page), '');
  await ctx.close();
});
test('every bad field is named, and fixing them all brings the original result back', async () => {
  const { ctx, page } = await open();
  const normal = await dials(page);
  await set(page, 'bc', ''); await set(page, 'temp', '500');
  const n = await notice(page);
  ok(/ballistic coefficient/i.test(n) && /temperature/i.test(n), 'both named: ' + n);
  await set(page, 'bc', '0.462'); ok(/temperature/i.test(await notice(page)) && !/ballistic/i.test(await notice(page)), 'only the remaining one');
  await set(page, 'temp', '59'); eq(await dials(page), normal); eq(await notice(page), ''); await ctx.close();
});
// Stage 9: the pressure lower limit is now 15 inHg so station pressure at 15,000 ft is accepted.
test('an invalid pressure or latitude is flagged and hides the result instead of being treated as blank', async () => {
  const { ctx, page } = await open();
  await set(page, 'press', '99'); eq(await dials(page), ['—', '—']); ok(/pressure/i.test(await notice(page)) && /15 to 32\.5/.test(await notice(page)));
  await set(page, 'press', ''); await set(page, 'lat', '95'); eq(await dials(page), ['—', '—']); ok(/latitude/i.test(await notice(page)));
  ok(!/Coriolis is off/.test(await text(page, 'coriLine')), 'does not claim Coriolis is off for an invalid latitude');
  await set(page, 'lat', ''); ok(/\d/.test(await text(page, 'elevClicks'))); await ctx.close();
});
test('a velocity that the temperature adjustment pushes out of range is flagged, not silently capped', async () => {
  const { ctx, page } = await open();
  await set(page, 'v0', '4400'); await set(page, 'vsens', '5'); await set(page, 'temp', '100');
  eq(await dials(page), ['—', '—']); ok(/velocity at the current temperature/i.test(await notice(page)) && /500 to 4500/.test(await notice(page)), await notice(page));
  await set(page, 'temp', '59'); ok(/\d/.test(await text(page, 'elevClicks'))); await ctx.close();
});
test('the wind field and the slider share one limit, 0 to 60 mph', async () => {
  const { ctx, page } = await open();
  await page.click('#togWind');
  eq(await page.$eval('#wind', e => e.max), '60'); eq(await page.$eval('#windRange', e => e.max), '60');
  await set(page, 'wind', '60'); ok(/\d/.test(await text(page, 'elevClicks')) && !(await isBad(page, 'wind')), '60 is accepted');
  await set(page, 'wind', '61'); ok(await isBad(page, 'wind'), '61 is flagged'); eq(await dials(page), ['—', '—']);
  ok(/wind speed/i.test(await notice(page)) && /0 to 60/.test(await notice(page)));
  ok(/61/.test(await page.$eval('#togWind', e => e.textContent)), 'the toggle shows what was typed, not a capped value');
  await set(page, 'wind', '60'); await page.click('#windUp'); eq(await page.$eval('#wind', e => e.value), '60', 'stepper stops at 60');
  await ctx.close();
});
test('the range card is not built from substituted values and says why', async () => {
  const { ctx, page } = await open();
  await set(page, 'bc', ''); await page.click('.tab#tabChart'); await page.waitForTimeout(250);
  eq(await page.$$eval('#tbody tr', r => r.length), 0); ok(/fix/i.test(await text(page, 'cMsg')), await text(page, 'cMsg'));
  await ctx.close();
});
test('matching a real impact refuses to run on invalid settings', async () => {
  const { ctx, page } = await open();
  await set(page, 'bc', ''); await set(page, 'fitMoa', '10');
  await page.click('.tab#tabRifle'); await page.click('#fitBtn'); await page.waitForTimeout(100);
  ok(/fix/i.test(await text(page, 'fitMsg')), await text(page, 'fitMsg'));
  eq(await page.$eval('#bc', e => e.value), '', 'nothing was changed'); await ctx.close();
});
test('editing the bullet weight scales the coefficient from the starting values and says so', async () => {
  const { ctx, page } = await open();
  await page.click('.tab#tabRifle');
  const bc0 = parseFloat(await page.$eval('#bc', e => e.value));
  await set(page, 'wt', '190');
  const bc1 = parseFloat(await page.$eval('#bc', e => e.value));
  ok(Math.abs(bc1 - bc0 * 190 / 168) < 0.001, 'bc ' + bc0 + ' became ' + bc1);
  const m = await text(page, 'loadMsg');
  ok(/scaled/i.test(m) && m.includes(bc0.toFixed(3)) && m.includes('168') && m.includes('190'), 'message: ' + m);
  await ctx.close();
});
test('typing a new weight digit by digit gives the same coefficient as entering it at once', async () => {
  const { ctx, page } = await open();
  await page.click('.tab#tabRifle');
  const bc0 = parseFloat(await page.$eval('#bc', e => e.value));
  await page.click('#wt', { clickCount: 3 }); await page.keyboard.type('190'); await page.waitForTimeout(100);
  const bc1 = parseFloat(await page.$eval('#bc', e => e.value));
  ok(Math.abs(bc1 - bc0 * 190 / 168) < 0.001, 'typed 190: bc ' + bc0 + ' became ' + bc1 + ', expected ' + (bc0 * 190 / 168).toFixed(3));
  await ctx.close();
});
test('a coefficient you type becomes the new starting point for later weight changes', async () => {
  const { ctx, page } = await open();
  await page.click('.tab#tabRifle');
  await set(page, 'bc', '0.5'); await set(page, 'wt', '190');
  ok(Math.abs(parseFloat(await page.$eval('#bc', e => e.value)) - 0.5 * 190 / 168) < 0.001); await ctx.close();
});
test('choosing a cartridge preset says which values were replaced and what they were', async () => {
  const { ctx, page } = await open();
  await page.click('.tab#tabRifle');
  await page.selectOption('#preset', 'p65cm'); await page.waitForTimeout(100);
  eq([await page.$eval('#v0', e => e.value), await page.$eval('#wt', e => e.value)], ['2710', '140']);
  const m = await text(page, 'loadMsg');
  ok(/replaced/i.test(m) && m.includes('2710') && m.includes('2650') && m.includes('168') && m.includes('140'), 'message: ' + m);
  await ctx.close();
});

// ---- Follow-up checks: the coefficient logic must never touch saved values just because they are opened or viewed ----
const R = (name, e) => Object.assign({ pname: name, preset: 'p308', cname: '', model: 'G1', bc: '0.462', wt: '168', diam: '0.308', v0: '2650', vref: '59', vsens: '0', zero: '100', h: '1.5', twist: '10', tdir: 'R', click: 'MOA:0.25', temp: '59', press: '', humidity: '50', alt: '0', lat: '' }, e);
const odd = () => [
  { name: 'Alex', active: 0, profiles: [R('A', { wt: '190', bc: '0.4625' }), R('B', { preset: 'p65cm', wt: '140', bc: '0.9', model: 'G7' })] },
  { name: 'Sam', active: 0, profiles: [R('C', { preset: 'p223', wt: '55', bc: '0.123', v0: '3240' })] }
];
const oddSeed = () => ({ 'scopedope.v2': JSON.stringify({ schema: 1, pi: 0, people: odd(), session: { dist: '400' } }) });
const snap = (people) => people.map(p => p.profiles.map(r => [r.pname, r.wt, r.bc, r.model, r.v0]));
test('opening, viewing and switching rifles and profiles never changes a saved weight or coefficient', async () => {
  const { ctx, page } = await open(oddSeed());
  const want = snap(odd());
  eq(await page.$eval('#bc', e => e.value), '0.4625', 'shown on open');
  await page.click('.tab#tabRifle');
  await page.selectOption('#profSel', '1'); await page.waitForTimeout(100); eq(await page.$eval('#bc', e => e.value), '0.9');
  await page.selectOption('#profSel', '0'); await page.waitForTimeout(100); eq(await page.$eval('#bc', e => e.value), '0.4625');
  await page.selectOption('#person', '1'); await page.waitForTimeout(100); eq(await page.$eval('#bc', e => e.value), '0.123');
  await page.selectOption('#person', '0'); await page.waitForTimeout(100);
  await page.reload(); await page.waitForTimeout(200);
  const saved = JSON.parse(await page.evaluate(() => localStorage.getItem('scopedope.v2')));
  eq(snap(saved.people), want, 'every saved weight and coefficient is exactly as seeded');
  eq(await page.evaluate(() => document.getElementById('loadMsg').hidden), true, 'no coefficient message appeared');
  eq(page.errors, []); await ctx.close();
});
test('focusing and leaving the weight field without typing changes nothing', async () => {
  const { ctx, page } = await open(oddSeed());
  await page.click('.tab#tabRifle'); await page.click('#wt'); await page.click('#pname'); await page.waitForTimeout(100);
  eq(await page.$eval('#bc', e => e.value), '0.4625'); eq(await page.$eval('#wt', e => e.value), '190');
  const saved = JSON.parse(await page.evaluate(() => localStorage.getItem('scopedope.v2')));
  eq(snap(saved.people), snap(odd())); await ctx.close();
});
test('re-entering the same weight puts back the exact coefficient text, not a rounded one', async () => {
  const { ctx, page } = await open(oddSeed());
  await page.click('.tab#tabRifle');
  await set(page, 'wt', '200'); await set(page, 'wt', '190');
  eq(await page.$eval('#bc', e => e.value), '0.4625'); await ctx.close();
});
test('a blank or invalid coefficient is left alone when the weight changes', async () => {
  const { ctx, page } = await open();
  await page.click('.tab#tabRifle');
  await set(page, 'bc', ''); await set(page, 'wt', '190');
  eq(await page.$eval('#bc', e => e.value), '', 'still blank, not filled in for you'); eq(await page.evaluate(() => document.getElementById('loadMsg').hidden), true);
  await ctx.close();
});

// ---- Chart tab From / To / Every: same rule as every other field. Named, flagged, no table, nothing swapped in ----
const rows = (page) => page.$$eval('#tbody tr', r => r.length);
const chart = async (page) => { await page.click('.tab#tabChart'); await page.waitForTimeout(250); };
const setC = async (page, id, v) => { await set(page, id, v); await page.waitForTimeout(250); };
test('chart: a From below 10 yd is flagged and named, the table is empty, and the typed value is kept', async () => {
  const { ctx, page } = await open(); await chart(page);
  ok((await rows(page)) > 0, 'the default range card has rows');
  await setC(page, 'cStart', '5');
  ok(await isBad(page, 'cStart')); eq(await rows(page), 0); eq(await page.$eval('#cStart', e => e.value), '5', 'not replaced with 100');
  const m = await text(page, 'cMsg'); ok(/from/i.test(m) && /10 to 2000/.test(m) && /fix/i.test(m), m);
  eq(page.errors, []); await ctx.close();
});
test('chart: a To below From is flagged on To and says so', async () => {
  const { ctx, page } = await open(); await chart(page);
  await setC(page, 'cStart', '500'); await setC(page, 'cEnd', '400');
  ok(await isBad(page, 'cEnd')); eq(await rows(page), 0);
  const m = await text(page, 'cMsg'); ok(/to \(400 yd\)/i.test(m) && /at or above from \(500 yd\)/i.test(m), m);
  await ctx.close();
});
test('chart: Every must be 5 to 500 yd; blank, too small and too large are all flagged', async () => {
  const { ctx, page } = await open(); await chart(page);
  for (const v of ['2', '600', '']) {
    await setC(page, 'cStep', v);
    ok(await isBad(page, 'cStep'), 'flagged for "' + v + '"'); eq(await rows(page), 0, 'no rows for "' + v + '"');
    ok(/every/i.test(await text(page, 'cMsg')) && /5 to 500/.test(await text(page, 'cMsg')));
    eq(await page.$eval('#cStep', e => e.value), v, 'typed value kept');
  }
  await ctx.close();
});
test('chart: To above 2000 yd is flagged, matching the limit the page already declares', async () => {
  const { ctx, page } = await open(); await chart(page);
  await setC(page, 'cEnd', '2500'); ok(await isBad(page, 'cEnd')); eq(await rows(page), 0); ok(/10 to 2000/.test(await text(page, 'cMsg')));
  await ctx.close();
});
test('chart: fixing the fields brings back the same table and clears the flags and message', async () => {
  const { ctx, page } = await open(); await chart(page);
  const n0 = await rows(page), first = await page.$eval('#tbody tr', r => r.textContent);
  await setC(page, 'cStep', '2'); eq(await rows(page), 0);
  await setC(page, 'cStep', '50');
  eq(await rows(page), n0); eq(await page.$eval('#tbody tr', r => r.textContent), first);
  ok(!(await isBad(page, 'cStep'))); eq(await text(page, 'cMsg'), ''); await ctx.close();
});
test('chart: a very long range is still shown, cut at 120 rows with a message saying so', async () => {
  const { ctx, page } = await open(); await chart(page);
  await setC(page, 'cStart', '10'); await setC(page, 'cEnd', '2000'); await setC(page, 'cStep', '5');
  ok((await rows(page)) > 100 && (await rows(page)) <= 121); ok(/first 120 rows/.test(await text(page, 'cMsg'))); await ctx.close();
});
test('chart: a problem with the range fields does not hide the HUD result', async () => {
  const { ctx, page } = await open(); await chart(page);
  await setC(page, 'cStep', '2');
  await page.click('.tab#tabHud'); await page.waitForTimeout(100);
  ok(/\d/.test(await text(page, 'elevClicks')), 'dials still show a result'); eq(await notice(page), ''); await ctx.close();
});
test('moving target is gone: no input, no Lead dial, no Lead text, two equal dials, no Lead columns in the range card', async () => {
  const { ctx, page } = await open();
  for (const id of ['tgt', 'tgtAng', 'tgtDir', 'leadDial', 'leadClicks', 'leadDir', 'leadSub']) eq(await page.$('#' + id), null, '#' + id + ' is gone');
  eq(await page.$$eval('.dials .dial', d => d.length), 2, 'two dials'); eq(await page.$eval('.dials', d => d.classList.contains('three')), false);
  const w = await page.$$eval('.dials .dial', d => d.map(x => Math.round(x.getBoundingClientRect().width))); ok(Math.abs(w[0] - w[1]) <= 1, 'dials are equal width: ' + w);
  ok(!/\blead\b/i.test(await page.$eval('body', b => b.innerText)), 'the word Lead does not appear on the HUD');
  await page.click('.tab#tabChart'); await page.waitForTimeout(250);
  eq(await page.$$eval('#thead th', t => t.map(x => x.textContent)), ['Yd', 'Drop in', 'Up MOA', 'Up mil', 'Up clicks', 'Wind MOA', 'Wind clicks', 'fps', 'ft·lb', 'Time s', 'Mach']);
  ok(!/moving target/i.test(await page.$eval('body', b => b.innerText)), 'no mention of moving target anywhere');
  eq(page.errors, []); await ctx.close();
});
test('a saved session that still carries old moving-target keys loads normally and does not keep them', async () => {
  const sess = { dist: '500', wind: '8', windHr: '3', angle: '0', az: '0', cStart: '100', cEnd: '1000', cStep: '50', tgt: '20', tgtAng: '45', tgtDir: 'RL' };
  const people = [{ name: 'Me', active: 0, profiles: [R('Keep', { wt: '190', bc: '0.4625' })] }];
  const { ctx, page } = await open({ 'scopedope.v2': JSON.stringify({ schema: 1, pi: 0, people, session: sess }) });
  eq(await page.$eval('#dist', e => e.value), '500'); eq(await page.$eval('#bc', e => e.value), '0.4625');
  await set(page, 'dist', '510');
  const saved = JSON.parse(await page.evaluate(() => localStorage.getItem('scopedope.v2')));
  eq(saved.people[0].profiles[0].bc, '0.4625', 'rifle untouched'); eq(saved.session.dist, '510');
  eq(Object.keys(saved.session).sort(), ['angle', 'az', 'cEnd', 'cStart', 'cStep', 'dist', 'windHr', 'wind'].sort(), 'session holds only the settings the app uses');
  eq(page.errors, []); await ctx.close();
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

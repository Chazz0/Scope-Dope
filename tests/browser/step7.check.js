'use strict';
// Step 7 browser tests: protect the user's entered muzzle velocity, keep rifles and loads separate, chart transparency,
// unit clarity and phone layout. Written before the app change.   Run: node tests/browser/step7.check.js
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
async function open(seed, w, h) {
  const ctx = await browser.newContext({ viewport: { width: w || 400, height: h || 860 }, serviceWorkers: 'block' });
  const page = await ctx.newPage(); page.errors = []; page.on('pageerror', e => page.errors.push(e.message));
  if (seed) await page.addInitScript((sd) => { if (!sessionStorage.getItem('__seeded')) { for (const k of Object.keys(sd)) localStorage.setItem(k, sd[k]); sessionStorage.setItem('__seeded', '1'); } }, seed);
  await page.goto(base + '/index.html'); await page.waitForTimeout(150); return { ctx, page };
}
const go = async (page, tab) => { await page.click('#tab' + tab); await page.waitForTimeout(80); };
const type = async (page, id, v) => { await page.fill('#' + id, String(v)); await page.waitForTimeout(60); };
const pick = async (page, id, v) => { await page.selectOption('#' + id, v); await page.waitForTimeout(80); };
const val = (page, id) => page.$eval('#' + id, e => e.value);
const txt = (page, sel) => page.$eval(sel, e => e.textContent);
const dial = async (page) => { await go(page, 'Hud'); return [await txt(page, '#elevClicks'), await txt(page, '#sVel'), await txt(page, '#sDrop')]; };
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('scopedope.v2')));
const rifles = async (page) => (await stored(page)).people.map(p => p.profiles);
const assessIds = (page) => page.$$eval('#assessList li', els => els.map(e => e.dataset.level + ':' + e.dataset.id));
const chartIds = (page) => page.$$eval('#cAssessList li', els => els.map(e => e.dataset.level + ':' + e.dataset.id));

// ---- 1. Entered velocity survives preset selection ----
for (const [fps, preset, factory] of [[2713, 'p223', 3240], [2588, 'p65cm', 2710], [2713, 'p300', 2900], [2588, 'p243', 2950]]) {
  test('entered ' + fps + ' fps survives picking ' + preset + ' and is what the solver uses', async () => {
    const { ctx, page } = await open();
    await go(page, 'Rifle'); await type(page, 'v0', fps); await pick(page, 'preset', preset);
    eq(await val(page, 'v0'), String(fps), 'velocity was replaced');
    const a = await dial(page);
    // Same cartridge picked first, then the velocity typed: the solver must give the same answer.
    const b = await open(); await go(b.page, 'Rifle'); await pick(b.page, 'preset', preset); await type(b.page, 'v0', fps);
    eq(await dial(b.page), a, 'solver did not use the entered velocity'); await b.ctx.close();
    const c = await open(); await go(c.page, 'Rifle'); await pick(c.page, 'preset', preset);   // starting value follows the preset
    eq(await val(c.page, 'v0'), String(factory)); ok(JSON.stringify(await dial(c.page)) !== JSON.stringify(a), 'factory value must differ'); await c.ctx.close();
    ok(page.errors.length === 0, page.errors.join(';')); await ctx.close();
  });
}
test('the preset says the entered velocity was kept and shows the factory value as reference only', async () => {
  const { ctx, page } = await open(); await go(page, 'Rifle'); await type(page, 'v0', 2713); await pick(page, 'preset', 'p223');
  const m = await txt(page, '#loadMsg'); ok(/2713 fps/.test(m) && /kept/i.test(m) && /3240 fps/.test(m) && /reference/i.test(m), m);
  ok(!/replaced your entries[^.]*2713/.test(m), 'message still claims replacement: ' + m);
  ok(/3240/.test(await txt(page, '#v0Factory')) && /reference only/i.test(await txt(page, '#v0Factory')), 'factory line missing'); await ctx.close();
});
test('a velocity that was only a starting value follows the preset and is labelled as not measured', async () => {
  const { ctx, page } = await open(); await go(page, 'Rifle');
  ok(/not (yet )?your|starting value/i.test(await txt(page, '#v0Src')), 'starting-value label missing');
  await pick(page, 'preset', 'p223'); eq(await val(page, 'v0'), '3240');
  await go(page, 'Hud'); ok((await assessIds(page)).includes('notice:v0factory'), 'panel does not say the velocity is a factory starting value');
  await go(page, 'Rifle'); await type(page, 'v0', 3150);
  ok(/your/i.test(await txt(page, '#v0Src')) && !/starting value/i.test(await txt(page, '#v0Src')), 'label did not switch to entered');
  await go(page, 'Hud'); ok(!(await assessIds(page)).includes('notice:v0factory'), 'still flagged after the user entered a value'); await ctx.close();
});
test('replacing an entered velocity needs an explicit confirmation, and can be cancelled', async () => {
  const { ctx, page } = await open(); await go(page, 'Rifle'); await type(page, 'v0', 2713); await pick(page, 'preset', 'p223');
  ok(await page.isVisible('#v0Use'), 'no offer to use the factory value'); eq(await val(page, 'v0'), '2713');
  await page.click('#v0Use'); eq(await val(page, 'v0'), '2713', 'replaced on the first tap');
  ok(await page.isVisible('#v0Confirm') && await page.isVisible('#v0Cancel'), 'no confirmation step');
  await page.click('#v0Cancel'); eq(await val(page, 'v0'), '2713', 'cancel replaced it');
  await page.click('#v0Use'); await page.click('#v0Confirm'); eq(await val(page, 'v0'), '3240');
  ok(!(await page.isVisible('#v0Use')), 'offer still shown after replacing'); await ctx.close();
});
test('the velocity field says it is your measured velocity and in fps', async () => {
  const { ctx, page } = await open(); await go(page, 'Rifle');
  const l = await txt(page, 'label[for="v0"]'); ok(/your/i.test(l) && /measured|chronograph/i.test(l) && /fps/i.test(l), l); await ctx.close();
});

// ---- 2. Save, reload, profiles ----
test('entered velocity survives saving and reopening, and picking a preset afterwards', async () => {
  const { ctx, page } = await open(); await go(page, 'Rifle'); await type(page, 'v0', 2713); await page.waitForTimeout(150);
  await page.reload(); await page.waitForTimeout(200); await go(page, 'Rifle');
  eq(await val(page, 'v0'), '2713'); const s = await stored(page); eq(s.people[0].profiles[0].v0, '2713'); eq(s.people[0].profiles[0].v0src, 'user');
  await pick(page, 'preset', 'p65cm'); eq(await val(page, 'v0'), '2713', 'reopened, then preset replaced it');
  await page.reload(); await page.waitForTimeout(200); await go(page, 'Rifle'); eq(await val(page, 'v0'), '2713'); await ctx.close();
});
test('two rifles keep their own velocity, weight, coefficient, twist and name; switching loads the right one', async () => {
  const { ctx, page } = await open(); await go(page, 'Rifle');
  await type(page, 'pname', 'Rifle A'); await type(page, 'v0', 2713); await type(page, 'bc', 0.5); await type(page, 'twist', 8);
  await page.click('#newProf'); await page.waitForTimeout(100);
  await type(page, 'pname', 'Rifle B'); await type(page, 'v0', 2588); await type(page, 'wt', 140); await type(page, 'bc', 0.61); await type(page, 'twist', 9); await pick(page, 'model', 'G7');
  await pick(page, 'profSel', '0'); eq([await val(page, 'pname'), await val(page, 'v0'), await val(page, 'bc'), await val(page, 'twist'), await val(page, 'model'), await val(page, 'wt')], ['Rifle A', '2713', '0.5', '8', 'G1', '168'], 'rifle A changed');
  await pick(page, 'profSel', '1'); eq([await val(page, 'pname'), await val(page, 'v0'), await val(page, 'bc'), await val(page, 'twist'), await val(page, 'model'), await val(page, 'wt')], ['Rifle B', '2588', '0.61', '9', 'G7', '140'], 'rifle B wrong');
  await page.waitForTimeout(150); const r = (await rifles(page))[0];
  eq([r[0].v0, r[0].bc, r[0].twist, r[1].v0, r[1].bc, r[1].twist], ['2713', '0.5', '8', '2588', '0.61', '9']);
  await page.reload(); await page.waitForTimeout(200); await go(page, 'Rifle'); await pick(page, 'profSel', '0'); eq(await val(page, 'v0'), '2713'); await pick(page, 'profSel', '1'); eq(await val(page, 'v0'), '2588');
  await pick(page, 'preset', 'p223'); await pick(page, 'profSel', '0'); eq(await val(page, 'v0'), '2713', 'a preset on rifle B touched rifle A'); await ctx.close();
});
test('two loads for the same rifle are stored separately and can be told apart', async () => {
  const { ctx, page } = await open(); await go(page, 'Rifle');
  await type(page, 'pname', 'Tikka'); await type(page, 'wt', 168); await type(page, 'v0', 2713);
  await page.click('#newProf'); await page.waitForTimeout(100);
  await type(page, 'pname', 'Tikka'); await type(page, 'wt', 175); await type(page, 'v0', 2588);
  const opts = await page.$$eval('#profSel option', o => o.map(x => x.textContent)); ok(new Set(opts).size === 2, 'two loads of one rifle look identical in the list: ' + opts);
  ok(/168/.test(opts[0]) && /175/.test(opts[1]), 'list does not say which load is which: ' + opts);
  await pick(page, 'profSel', '0'); eq([await val(page, 'wt'), await val(page, 'v0')], ['168', '2713']);
  await pick(page, 'profSel', '1'); eq([await val(page, 'wt'), await val(page, 'v0')], ['175', '2588']); await ctx.close();
});
test('a copied load tells the user its velocity was copied', async () => {
  const { ctx, page } = await open(); await go(page, 'Rifle'); await type(page, 'v0', 2713); await page.click('#newProf'); await page.waitForTimeout(100);
  ok(/velocity/i.test(await txt(page, '#profMsg')) && /2713/.test(await txt(page, '#profMsg')), await txt(page, '#profMsg')); await ctx.close();
});
test('separate profiles (people) keep their own rifles and velocities', async () => {
  const { ctx, page } = await open(); await go(page, 'Rifle'); await type(page, 'v0', 2713);
  await page.click('#newPerson'); await page.waitForTimeout(100); await type(page, 'v0', 2588);
  await pick(page, 'person', '0'); eq(await val(page, 'v0'), '2713'); await pick(page, 'person', '1'); eq(await val(page, 'v0'), '2588'); await ctx.close();
});
test('profiles saved before Step 7 load unchanged, keep every field, and their velocity is protected', async () => {
  const legacy = { schema: 1, pi: 0, people: [{ name: 'Me', active: 1, profiles: [
    { pname: 'Old A', preset: 'p308', cname: '', model: 'G1', bc: '0.451', wt: '175', diam: '0.308', v0: '2640', vref: '59', vsens: '0.5', zero: '100', h: '1.6', twist: '11', tdir: 'R', click: 'MOA:0.25', temp: '59', press: '', humidity: '50', alt: '0', lat: '' },
    { pname: 'Old B', preset: 'p65cm', cname: '', model: 'G7', bc: '0.3', wt: '140', diam: '0.264', v0: '2688', vref: '59', vsens: '0', zero: '200', h: '1.5', twist: '8', tdir: 'R', click: 'MOA:0.25', temp: '59', press: '', humidity: '50', alt: '0', lat: '' }] }],
    session: { dist: '400', wind: '10', windHr: '3', angle: '0', az: '0', cStart: '100', cEnd: '1000', cStep: '50' } };
  const { ctx, page } = await open({ 'scopedope.v2': JSON.stringify(legacy) }); await go(page, 'Rifle');
  eq([await val(page, 'pname'), await val(page, 'v0'), await val(page, 'bc'), await val(page, 'vsens'), await val(page, 'h')], ['Old B', '2688', '0.3', '0', '1.5']);
  await pick(page, 'profSel', '0'); eq([await val(page, 'v0'), await val(page, 'bc'), await val(page, 'vsens'), await val(page, 'twist'), await val(page, 'h')], ['2640', '0.451', '0.5', '11', '1.6']);
  await pick(page, 'preset', 'p223'); eq(await val(page, 'v0'), '2640', 'preset replaced an old saved velocity');
  await page.waitForTimeout(150); const s = await stored(page); eq(s.people[0].profiles.length, 2); eq(s.people[0].profiles[1].pname, 'Old B'); eq(s.people[0].profiles[1].v0, '2688');
  await go(page, 'Hud'); ok(!(await assessIds(page)).includes('notice:v0factory'), 'legacy velocity labelled as factory'); await ctx.close();
});

// ---- 3. Chart tab transparency ----
test('the Chart tab says it is a calculated estimate, not verified against measured flight, with limited comparison ranges', async () => {
  const { ctx, page } = await open(); await go(page, 'Chart');
  ok(await page.isVisible('#cAssess'), 'no transparency box on the chart');
  const t = (await txt(page, '#cAssessSum')) + ' ' + (await txt(page, '#cAssessNote'));
  for (const re of [/calculated estimate/i, /not independently verified/i, /measured bullet flight/i, /limited conditions/i, /inside[^.]*(does not|doesn.t) establish accuracy/i]) ok(re.test(t), 'missing ' + re + ' in: ' + t);
  ok(page.errors.length === 0, page.errors.join(';')); await ctx.close();
});
test('chart warnings appear for a range beyond the compared conditions and for out-of-range loads', async () => {
  const { ctx, page } = await open(); await go(page, 'Chart');
  ok((await chartIds(page)).includes('warning:range'), 'default 100 to 1000 yd should warn');
  ok(/500 yd/.test(await txt(page, '#cAssessList')), 'range warning lacks the compared limit');
  await type(page, 'cEnd', 500); ok(!(await chartIds(page)).includes('warning:range'), 'warned inside the compared range');
  await go(page, 'Rifle'); await type(page, 'v0', 1100); await go(page, 'Chart'); ok((await chartIds(page)).includes('warning:muzzle'), 'no velocity warning on chart');
  await go(page, 'Rifle'); await type(page, 'v0', ''); await go(page, 'Chart'); ok(!(await chartIds(page)).some(x => x.startsWith('warning:')), 'assessed invalid input');
  await ctx.close();
});
test('the range card keeps its numbers and does not scroll sideways at phone width with the new text', async () => {
  for (const [w, h] of [[360, 740], [390, 844]]) {
    const { ctx, page } = await open(null, w, h); await go(page, 'Chart');
    ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), 'page scrolls sideways at ' + w);
    ok((await page.$$('#tbody tr')).length > 5, 'range card rows missing');
    const box = await page.$eval('#cAssess', e => { const r = e.getBoundingClientRect(); return [r.left, r.right]; }); ok(box[0] >= 0 && box[1] <= w, 'transparency box clipped'); await ctx.close();
  }
});

// ---- 4. Input clarity ----
test('units are spelled out on the main inputs', async () => {
  const { ctx, page } = await open(); await go(page, 'Rifle');
  const want = { v0: /fps/i, wt: /grains/i, diam: /inches/i, h: /inches/i, zero: /yards/i, twist: /inches/i };
  for (const [id, re] of Object.entries(want)) { const l = await txt(page, 'label[for="' + id + '"]'); ok(re.test(l), id + ' label: ' + l); }
  await go(page, 'Hud'); ok(/yards/i.test(await txt(page, 'label[for="dist"]')), 'distance label');
  await go(page, 'Chart'); for (const id of ['cStart', 'cEnd', 'cStep']) ok(/yards/i.test(await txt(page, 'label[for="' + id + '"]')), id); await ctx.close();
});
test('empty, non-numeric and out-of-range inputs are described differently and never replaced by a default', async () => {
  const { ctx, page } = await open(); await go(page, 'Rifle');
  await type(page, 'v0', ''); await go(page, 'Hud'); let n = await txt(page, '#notice'); ok(/Muzzle velocity is empty/i.test(n), n);
  await go(page, 'Rifle'); eq(await val(page, 'v0'), '', 'blank was replaced');
  await type(page, 'v0', '9000'); await go(page, 'Hud'); n = await txt(page, '#notice'); ok(/9000 fps/.test(n) && /allowed/.test(n) && !/empty/.test(n), n);
  await go(page, 'Rifle'); eq(await val(page, 'v0'), '9000'); await page.waitForTimeout(150); eq((await stored(page)).people[0].profiles[0].v0, '9000', 'typed value was not kept as typed'); await ctx.close();
});

// ---- 5. Phone layout of the new controls ----
test('profile screen, preset offer and warning panel fit at 360 px with comfortable touch targets', async () => {
  const { ctx, page } = await open(null, 360, 740); await go(page, 'Rifle'); await type(page, 'v0', 2713); await pick(page, 'preset', 'p223');
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), 'sideways scroll on Rifle tab');
  for (const sel of ['#v0Use', '#profSel', '#newProf', '#delProf', '#preset', '#v0']) {
    const b = await page.$eval(sel, e => { const r = e.getBoundingClientRect(); return [r.width, r.height, r.left, r.right]; });
    ok(b[1] >= 40 && b[0] >= 44 && b[2] >= 0 && b[3] <= 360, sel + ' size/position ' + b);
  }
  await go(page, 'Hud'); ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), 'sideways scroll on HUD'); await ctx.close();
});
(async () => {
  await new Promise(r => server.listen(0, r)); base = 'http://localhost:' + server.address().port;
  browser = await chromium.launch(); let pass = 0, fail = 0;
  for (const t of tests) { try { await t.f(); pass++; console.log('  ok   ' + t.n); } catch (e) { fail++; console.log('  FAIL ' + t.n + ': ' + e.message.split('\n')[0].slice(0, 220)); } }
  await browser.close(); server.close(); console.log('\n' + pass + ' passed, ' + fail + ' failed, ' + tests.length + ' total'); process.exit(fail ? 1 : 0);
})();

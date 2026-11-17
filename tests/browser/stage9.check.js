'use strict';
// Stage 9 browser tests: C5 missing profile fields, C2 unreachable zero, C6 fitted velocity and BC labels, C4/C6b station
// pressure, stability wording, phone layout. Written before the app changes.   Run: node tests/browser/stage9.check.js
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


const FULL = (o) => Object.assign({ pname: 'X', preset: 'p308', cname: '', model: 'G1', bc: '0.462', wt: '168', diam: '0.308', v0: '2650', v0src: 'user', vref: '59',
  vsens: '0', zero: '100', h: '1.5', twist: '10', tdir: 'R', click: 'MOA:0.25', temp: '59', press: '', humidity: '50', alt: '0', lat: '', bcsrc: '' }, o);
const seedOf = (people, session) => ({ 'scopedope.v2': JSON.stringify({ schema: 1, pi: 0, people, session: session || {} }) });
const FIELDS = ['bc', 'wt', 'diam', 'v0', 'vref', 'vsens', 'zero', 'h', 'twist', 'tdir', 'click', 'temp', 'press', 'humidity', 'alt', 'lat', 'model'];
const readAll = (page) => page.evaluate((f) => Object.fromEntries(f.map(k => [k, document.getElementById(k).value])), FIELDS);
let DEFAULTS;
async function defaults() { if (DEFAULTS) return DEFAULTS; const { ctx, page } = await open(); DEFAULTS = await readAll(page); await ctx.close(); return DEFAULTS; }

// ---- C5: a profile with missing fields must never inherit another rifle's values ----
test('C5 switching to a rifle with missing fields shows defaults, not the previous rifle values (between profiles)', async () => {
  const d = await defaults();
  const a = FULL({ pname: 'A', bc: '0.55', wt: '190', v0: '2713', twist: '7', h: '2.2', zero: '200', humidity: '10', alt: '4000', lat: '45', click: 'MRAD:0.1', tdir: 'L', temp: '30' });
  const b = FULL({ pname: 'B' }); for (const k of ['bc', 'wt', 'twist', 'h', 'zero', 'humidity', 'alt', 'lat', 'click', 'tdir', 'temp', 'v0', 'diam']) delete b[k];
  const { ctx, page } = await open(seedOf([{ name: 'One', active: 0, profiles: [a] }, { name: 'Two', active: 0, profiles: [b] }]));
  await go(page, 'Rifle'); eq((await readAll(page)).v0, '2713'); await pick(page, 'person', '1');
  const got = await readAll(page);
  for (const k of ['bc', 'wt', 'twist', 'h', 'zero', 'humidity', 'alt', 'lat', 'click', 'tdir', 'temp', 'v0', 'diam']) eq(got[k], d[k], 'field ' + k + ' carried over from the other rifle');
  ok(page.errors.length === 0, page.errors.join(';')); await ctx.close();
});
test('C5 same person, two rifles: back and forth keeps A exact and B at defaults, also after save and reload', async () => {
  const d = await defaults();
  const a = FULL({ pname: 'A', bc: '0.55', wt: '190', v0: '2713', twist: '7', h: '2.2', zero: '200' });
  const b = FULL({ pname: 'B' }); for (const k of ['bc', 'twist', 'h', 'zero', 'v0']) delete b[k]; delete b.v0src;
  const { ctx, page } = await open(seedOf([{ name: 'One', active: 0, profiles: [a, b] }]));
  await go(page, 'Rifle');
  for (let n = 0; n < 3; n++) {
    await pick(page, 'profSel', '1'); const gb = await readAll(page);
    for (const k of ['bc', 'twist', 'h', 'zero', 'v0']) eq(gb[k], d[k], 'round ' + n + ': B field ' + k + ' is not the default');
    await pick(page, 'profSel', '0'); const ga = await readAll(page);
    eq([ga.bc, ga.v0, ga.twist, ga.h, ga.zero, ga.wt], ['0.55', '2713', '7', '2.2', '200', '190'], 'round ' + n + ': A changed');
  }
  eq(await val(page, 'v0src'), 'user', 'A velocity source lost');
  await pick(page, 'profSel', '1'); await page.waitForTimeout(200);
  const st = (await stored(page)).people[0].profiles; eq(st[0].v0, '2713'); eq(st[0].bc, '0.55'); eq(st[1].twist, d.twist, 'B saved with another rifle value');
  await page.reload(); await page.waitForTimeout(200); await go(page, 'Rifle');
  const gb = await readAll(page); for (const k of ['bc', 'twist', 'h', 'zero']) eq(gb[k], d[k], 'after reload B ' + k);
  await pick(page, 'profSel', '0'); eq((await readAll(page)).v0, '2713', 'entered 2713 lost'); await ctx.close();
});
test('C5 null and non-string stored values are treated as missing', async () => {
  const d = await defaults();
  const a = FULL({ pname: 'A', twist: '7', h: '2.2', v0: '2588' }); const b = FULL({ pname: 'B', twist: null, h: null });
  const { ctx, page } = await open(seedOf([{ name: 'One', active: 0, profiles: [a, b] }])); await go(page, 'Rifle');
  await pick(page, 'profSel', '1'); const g = await readAll(page); eq([g.twist, g.h], [d.twist, d.h]);
  await pick(page, 'profSel', '0'); eq((await readAll(page)).v0, '2588'); await ctx.close();
});
test('C5 a profile saved without any velocity gets the factory starting value labelled as not measured', async () => {
  const a = FULL({ pname: 'A', v0: '2713' }); const b = FULL({ pname: 'B' }); delete b.v0; delete b.v0src;
  const { ctx, page } = await open(seedOf([{ name: 'One', active: 0, profiles: [a, b] }])); await go(page, 'Rifle');
  await pick(page, 'profSel', '1'); eq(await val(page, 'v0src'), 'factory'); ok(/starting value|not yet your own/i.test(await txt(page, '#v0Src')), await txt(page, '#v0Src'));
  await pick(page, 'profSel', '0'); eq(await val(page, 'v0'), '2713'); eq(await val(page, 'v0src'), 'user'); await ctx.close();
});

// ---- C2: an unreachable zero distance shows a named error and no ballistic result ----
const NUMS = ['#elevClicks', '#windClicks', '#sDrop', '#sVel', '#sEn', '#sTime'];
test('C2 500 fps, BC 0.05, zero 1000 yd shows a named error and no result', async () => {
  const { ctx, page } = await open(seedOf([{ name: 'One', active: 0, profiles: [FULL({ v0: '500', bc: '0.05', zero: '1000' })] }], { dist: '500' }));
  const n = await txt(page, '#notice'); ok(/zero/i.test(n) && /cannot be reached|can.t be reached|not reachable/i.test(n), 'no named error: ' + n);
  for (const s of NUMS) eq(await txt(page, s), '—', s + ' still shows a number');
  ok(/check inputs/i.test(await txt(page, '#elevDir')), 'dial direction not off');
  await go(page, 'Rifle'); ok(await page.$eval('#zero', e => e.classList.contains('bad')), 'zero field not flagged'); eq(await val(page, 'zero'), '1000', 'zero value was substituted');
  await go(page, 'Chart'); ok(/fix the highlighted/i.test(await txt(page, '#cMsg')), await txt(page, '#cMsg')); eq(await page.$$eval('#tbody tr', r => r.length), 0, 'range card rows shown');
  await ctx.close();
});
test('C2 lowering the zero clears the error and a result appears; stored values stay as typed', async () => {
  const { ctx, page } = await open(seedOf([{ name: 'One', active: 0, profiles: [FULL({ v0: '500', bc: '0.05', zero: '1000' })] }], { dist: '300' }));
  await go(page, 'Rifle'); await type(page, 'zero', '100'); await go(page, 'Hud');
  ok(!/zero/i.test(await txt(page, '#notice')), 'error still shown'); ok((await txt(page, '#elevClicks')) !== '—', 'no result after fixing');
  await go(page, 'Rifle'); await type(page, 'zero', '1000'); await page.waitForTimeout(200); eq((await stored(page)).people[0].profiles[0].zero, '1000'); await ctx.close();
});
test('C2 reachable long zeros still give a result (22 LR style load at 1000 yd, default load at 1000 yd, 20 mph headwind)', async () => {
  for (const [p, sess] of [[{ v0: '1050', bc: '0.12', zero: '1000', diam: '0.224', wt: '40' }, {}], [{ zero: '1000' }, {}], [{ zero: '1000' }, { wind: '20', windHr: '12' }]]) {
    const { ctx, page } = await open(seedOf([{ name: 'One', active: 0, profiles: [FULL(p)] }], Object.assign({ dist: '500' }, sess)));
    const n = await txt(page, '#notice'); ok(!/zero/i.test(n), JSON.stringify(p) + ' wrongly flagged: ' + n); ok((await txt(page, '#elevClicks')) !== '—', JSON.stringify(p) + ' shows no result'); await ctx.close();
  }
});
test('C2 the match tool does not fit against an unreachable zero', async () => {
  const { ctx, page } = await open(seedOf([{ name: 'One', active: 0, profiles: [FULL({ v0: '500', bc: '0.05', zero: '1000' })] }])); await go(page, 'Rifle');
  const before = await val(page, 'v0');
  await page.evaluate(() => { const m = document.getElementById('fitMoa'); m.value = '11'; m.dispatchEvent(new Event('input', { bubbles: true })); document.getElementById('fitBtn').click(); });
  await page.waitForTimeout(100); eq(await val(page, 'v0'), before, 'fit changed the velocity'); ok(/zero|fix/i.test(await txt(page, '#fitMsg')), await txt(page, '#fitMsg')); await ctx.close();
});

// ---- C6: fitted velocity and BC are labelled as fitted, not as measured ----
const fit = async (page, what, moa) => page.evaluate(([w, m]) => {
  document.getElementById('fitWhat').value = w; const e = document.getElementById('fitMoa'); e.value = String(m); e.dispatchEvent(new Event('input', { bubbles: true }));
  document.getElementById('fitBtn').click(); }, [what, moa]);
test('C6 a fitted velocity is labelled fitted, not "your entered velocity", and the panel and message explain truing', async () => {
  const { ctx, page } = await open(seedOf([{ name: 'One', active: 0, profiles: [FULL({ v0: '2600' })] }])); await go(page, 'Rifle');
  await fit(page, 'v0', 12.2); await page.waitForTimeout(150);
  eq(await val(page, 'v0src'), 'fitted'); const l = await txt(page, '#v0Src');
  ok(/fitted/i.test(l) && !/^Your entered velocity/i.test(l) && /not (a )?measured/i.test(l), l);
  ok(/absorb/i.test(l + await txt(page, '#fitMsg')) && /ballistic coefficient|drag/i.test(l + await txt(page, '#fitMsg')), 'no explanation of what truing absorbs');
  await go(page, 'Hud'); ok((await assessIds(page)).includes('notice:v0fitted'), 'panel has no fitted-velocity note');
  eq((await stored(page)).people[0].profiles[0].v0src, 'fitted', 'not saved as fitted');
  await go(page, 'Rifle'); await type(page, 'v0', 2713); eq(await val(page, 'v0src'), 'user'); ok(/^Your entered/i.test(await txt(page, '#v0Src')), await txt(page, '#v0Src'));
  await go(page, 'Hud'); ok(!(await assessIds(page)).includes('notice:v0fitted'), 'note stays after the user typed a velocity'); await ctx.close();
});
test('C6 a fitted velocity survives reload as fitted and a preset does not silently replace it', async () => {
  const { ctx, page } = await open(seedOf([{ name: 'One', active: 0, profiles: [FULL({ v0: '2600' })] }])); await go(page, 'Rifle');
  await fit(page, 'v0', 12.2); await page.waitForTimeout(150); const v = await val(page, 'v0');
  await page.reload(); await page.waitForTimeout(200); await go(page, 'Rifle'); eq(await val(page, 'v0'), v); eq(await val(page, 'v0src'), 'fitted'); ok(/fitted/i.test(await txt(page, '#v0Src')));
  await pick(page, 'preset', 'p223'); eq(await val(page, 'v0'), v, 'preset replaced a fitted velocity'); await ctx.close();
});
test('C6 a fitted BC is labelled fitted, noted in the panel, saved, and cleared when the user types or picks a preset', async () => {
  const { ctx, page } = await open(seedOf([{ name: 'One', active: 0, profiles: [FULL({ v0: '2650' })] }])); await go(page, 'Rifle');
  ok(/^\s*$/.test(await txt(page, '#bcSrc')), 'label shown before any fit');
  await fit(page, 'bc', 11.0); await page.waitForTimeout(150);
  eq(await val(page, 'bcsrc'), 'fitted'); const l = await txt(page, '#bcSrc'); ok(/fitted/i.test(l) && /not (a )?(published|measured)/i.test(l) && /absorb/i.test(l), l);
  ok(/absorb/i.test(await txt(page, '#fitMsg')), 'fit message lacks the explanation');
  await go(page, 'Hud'); ok((await assessIds(page)).includes('notice:bcfitted'), 'panel has no fitted-BC note');
  eq((await stored(page)).people[0].profiles[0].bcsrc, 'fitted');
  await page.reload(); await page.waitForTimeout(200); await go(page, 'Rifle'); ok(/fitted/i.test(await txt(page, '#bcSrc')), 'lost on reload');
  await type(page, 'bc', 0.5); eq(await val(page, 'bcsrc'), ''); ok(/^\s*$/.test(await txt(page, '#bcSrc')), 'label stays after typing');
  await fit(page, 'bc', 11.0); await page.waitForTimeout(100); eq(await val(page, 'bcsrc'), 'fitted'); await pick(page, 'preset', 'p65cm'); eq(await val(page, 'bcsrc'), '', 'preset left the fitted flag'); await ctx.close();
});
test('C6 old profiles without the BC flag load as not fitted', async () => {
  const a = FULL({ pname: 'A' }); delete a.bcsrc; const { ctx, page } = await open(seedOf([{ name: 'One', active: 0, profiles: [a] }])); await go(page, 'Rifle');
  eq(await val(page, 'bcsrc'), ''); ok(/^\s*$/.test(await txt(page, '#bcSrc'))); await ctx.close();
});

// ---- C4 / C6b: station pressure ----
test('C4 the pressure field is labelled Station pressure (not sea-level pressure)', async () => {
  const { ctx, page } = await open(); await go(page, 'Rifle'); eq((await txt(page, 'label[for="press"]')).trim(), 'Station pressure (not sea-level pressure)'); await ctx.close();
});
for (const [alt, press] of [[0, '29.92'], [5000, '24.9'], [10000, '20.6'], [12000, '19.0'], [15000, '16.9'], [15000, '16.2']]) {
  test('C4 station pressure ' + press + ' inHg at ' + alt + ' ft is accepted, kept as typed and gives a result', async () => {
    const { ctx, page } = await open(seedOf([{ name: 'One', active: 0, profiles: [FULL({ alt: String(alt), press })] }], { dist: '400' }));
    const n = await txt(page, '#notice'); ok(!/pressure/i.test(n), 'rejected: ' + n); ok((await txt(page, '#elevClicks')) !== '—', 'no result');
    await go(page, 'Rifle'); ok(!(await page.$eval('#press', e => e.classList.contains('bad'))), 'flagged invalid'); eq(await val(page, 'press'), press, 'pressure was substituted');
    ok(page.errors.length === 0, page.errors.join(';')); await ctx.close();
  });
}
test('C4 out-of-range pressure is still rejected with the allowed range and is not replaced', async () => {
  const { ctx, page } = await open(seedOf([{ name: 'One', active: 0, profiles: [FULL({ alt: '0', press: '12' })] }]));
  const n = await txt(page, '#notice'); ok(/Pressure is 12 inHg/.test(n) && /allowed 15 to 32\.5 inHg/.test(n), n); eq(await txt(page, '#elevClicks'), '—');
  await go(page, 'Rifle'); eq(await val(page, 'press'), '12'); await ctx.close();
});
test('C6b a pressure that looks like a sea-level value at altitude gets a note, but is still used as typed', async () => {
  const hi = await open(seedOf([{ name: 'One', active: 0, profiles: [FULL({ alt: '5000', press: '29.92' })] }]));
  ok((await assessIds(hi.page)).includes('notice:pressureAltitude'), 'no note: ' + await assessIds(hi.page)); ok(/sea-level/i.test(await txt(hi.page, '#assessList')), 'note does not mention sea-level');
  await go(hi.page, 'Rifle'); eq(await val(hi.page, 'press'), '29.92'); await hi.ctx.close();
  const ok1 = await open(seedOf([{ name: 'One', active: 0, profiles: [FULL({ alt: '5000', press: '24.9' })] }]));
  ok(!(await assessIds(ok1.page)).includes('notice:pressureAltitude'), 'flagged a consistent station pressure'); await ok1.ctx.close();
  const lo = await open(seedOf([{ name: 'One', active: 0, profiles: [FULL({ alt: '0', press: '29.5' })] }]));
  ok(!(await assessIds(lo.page)).includes('notice:pressureAltitude'), 'flagged a normal sea-level reading'); await lo.ctx.close();
});

// ---- Stability wording ----
test('stability text says it is estimated from an assumed bullet length and does not claim the twist is fast enough', async () => {
  for (const tw of ['5', '10', '14']) {
    const { ctx, page } = await open(seedOf([{ name: 'One', active: 0, profiles: [FULL({ twist: tw })] }])); await go(page, 'Rifle');
    const t = await txt(page, '#sgHint'); ok(/estimated/i.test(t) && /assumed bullet length/i.test(t), tw + ': ' + t);
    ok(!/fast enough|is likely too slow|may tumble|will tumble|safe/i.test(t), tw + ' still certain: ' + t); await ctx.close();
  }
});

// ---- Phone layout ----
for (const [w, h] of [[360, 740], [390, 844]]) {
  test('new labels, notes and errors fit at ' + w + ' px with no sideways scroll and no clipping', async () => {
    const people = [{ name: 'One', active: 0, profiles: [FULL({ v0: '500', bc: '0.05', zero: '1000', alt: '15000', press: '16.9' })] }];
    const { ctx, page } = await open(seedOf(people, { dist: '500' }), w, h);
    const noScroll = () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
    ok(await noScroll(), 'HUD error view scrolls sideways');
    const r = await page.$eval('#notice', e => { const b = e.getBoundingClientRect(); return [b.left, b.right, e.scrollWidth <= e.clientWidth + 1]; }); ok(r[0] >= 0 && r[1] <= w && r[2], 'notice clipped ' + r);
    await go(page, 'Rifle'); ok(await noScroll(), 'Rifle tab scrolls sideways');
    await page.evaluate(() => { const m = document.getElementById('fitMoa'); m.value = '11'; m.dispatchEvent(new Event('input', { bubbles: true })); });
    await type(page, 'zero', '100'); await fit(page, 'bc', 11); await page.waitForTimeout(150);
    for (const sel of ['#bcSrc', '#v0Src', '#sgHint', '#fitMsg']) { const b = await page.$eval(sel, e => { const x = e.getBoundingClientRect(); return [x.left, x.right, e.scrollWidth <= e.clientWidth + 1]; }); ok(b[0] >= 0 && b[1] <= w && b[2], sel + ' clipped ' + b); }
    const lab = await page.$eval('label[for="press"]', e => { const x = e.getBoundingClientRect(); return [x.left, x.right, e.scrollWidth <= e.clientWidth + 1]; }); ok(lab[0] >= 0 && lab[1] <= w && lab[2], 'pressure label clipped ' + lab);
    ok(await noScroll(), 'Rifle tab with notes scrolls sideways'); await go(page, 'Hud'); ok(await noScroll(), 'HUD with notes scrolls sideways');
    await go(page, 'Chart'); ok(await noScroll(), 'Chart scrolls sideways'); await ctx.close();
  });
}
(async () => {
  await new Promise(r => server.listen(0, r)); base = 'http://localhost:' + server.address().port;
  browser = await chromium.launch(); let pass = 0, fail = 0;
  for (const t of tests) { try { await t.f(); pass++; console.log('  ok   ' + t.n); } catch (e) { fail++; console.log('  FAIL ' + t.n + ': ' + e.message.split('\n')[0].slice(0, 220)); } }
  await browser.close(); server.close(); console.log('\n' + pass + ' passed, ' + fail + ' failed, ' + tests.length + ' total'); process.exit(fail ? 1 : 0);
})();

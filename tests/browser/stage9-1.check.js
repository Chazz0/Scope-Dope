'use strict';
// Stage 9.1 browser tests: display-only warning when estimated stability is below 1.0, and no automatic overwrite of a typed or
// fitted ballistic coefficient when the bullet weight changes. Written before the app changes.   Run: node tests/browser/stage9-1.check.js
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..', '..');
const { execFileSync } = require('child_process');
const STAGE9 = '9fca2372faaf4a9cba3e048190d659e738821cab';   // the approved Stage 9 page, for before/after comparison
const server = http.createServer((req, res) => {
  if (req.url.split('?')[0] === '/__stage9.html') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(execFileSync('git', ['show', STAGE9 + ':index.html'], { cwd: ROOT, maxBuffer: 1 << 26 })); }
  const f = path.join(ROOT, req.url.split('?')[0] === '/' ? 'index.html' : req.url.split('?')[0]);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); res.end(fs.readFileSync(f));
});
const ok = (c, m) => { if (!c) throw new Error(m || 'assertion failed'); };
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((m || 'mismatch') + ': expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a)); };
let browser, base; const tests = []; const test = (n, f) => tests.push({ n, f });
async function open(seed, w, h, file) {
  const ctx = await browser.newContext({ viewport: { width: w || 400, height: h || 860 }, serviceWorkers: 'block' });
  const page = await ctx.newPage(); page.errors = []; page.on('pageerror', e => page.errors.push(e.message));
  if (seed) await page.addInitScript((sd) => { if (!sessionStorage.getItem('__seeded')) { for (const k of Object.keys(sd)) localStorage.setItem(k, sd[k]); sessionStorage.setItem('__seeded', '1'); } }, seed);
  await page.goto(base + '/' + (file || 'index.html')); await page.waitForTimeout(150); return { ctx, page };
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
  vsens: '0', zero: '100', h: '1.5', twist: '10', tdir: 'R', click: 'MOA:0.25', temp: '59', press: '', humidity: '50', alt: '0', lat: '', bcsrc: 'user', bcwt: '168' }, o);
const seedOf = (people, session) => ({ 'scopedope.v2': JSON.stringify({ schema: 1, pi: 0, people, session: session || {} }) });
const one = (o, s) => seedOf([{ name: 'One', active: 0, profiles: [FULL(o)] }], s);
const NUMS = ['#elevClicks', '#windClicks', '#sDrop', '#sVel', '#sEn', '#sTime'];
const snap = async (page) => { await go(page, 'Hud'); const a = []; for (const s of NUMS) a.push(await txt(page, s)); await go(page, 'Chart'); await page.waitForTimeout(250); a.push(await page.$$eval('#tbody tr', r => r.map(x => x.textContent).join('|'))); return a; };
const low = { bc: '0.243', wt: '55', diam: '0.224', v0: '3240', twist: '16', bcwt: '55', preset: 'p223' };   // estimated stability below 1.0

// ---- 1. Display-only warning when estimated stability is below 1.0 ----
test('SG<1 the panel and the chart both warn that the spin-drift estimate may be unreliable', async () => {
  const { ctx, page } = await open(one(low, { dist: '500', wind: '10', windHr: '3' }));
  ok(/0\.[0-9]+/.test(await txt(page, '#sgHint').catch(() => '0.5')) || true);
  const ids = await assessIds(page); ok(ids.includes('warning:stability'), 'no stability warning on the panel: ' + ids);
  const t = await page.$eval('#assessList li[data-id="stability"]', e => e.textContent);
  ok(/below 1\.0/.test(t) && /spin.drift/i.test(t) && /may be unreliable/i.test(t) && /assumed bullet length/i.test(t), t);
  await go(page, 'Chart'); ok((await chartIds(page)).includes('warning:stability'), 'no stability warning on the Chart tab: ' + await chartIds(page));
  await ctx.close();
});
test('SG<1 no warning for the default load, a fast twist, or twist 0 (no spin drift)', async () => {
  for (const o of [{}, { twist: '8' }, Object.assign({}, low, { twist: '8' }), Object.assign({}, low, { twist: '0' })]) {
    const { ctx, page } = await open(one(o)); ok(!(await assessIds(page)).includes('warning:stability'), JSON.stringify(o) + ' wrongly warned'); await ctx.close();
  }
});
test('SG<1 the numbers shown are identical to the approved Stage 9 page (HUD dials and the whole range card)', async () => {
  for (const [o, s] of [[low, { dist: '500', wind: '10', windHr: '3' }], [Object.assign({}, low, { twist: '20', tempF: '0', temp: '0' }), { dist: '800', wind: '15', windHr: '9' }], [{}, { dist: '600', wind: '8', windHr: '3' }]]) {
    const a = await open(one(o, s)), b = await open(one(o, s), 400, 860, '__stage9.html');
    eq(await snap(a.page), await snap(b.page), 'values changed for ' + JSON.stringify(o)); await a.ctx.close(); await b.ctx.close();
  }
});

// ---- 2. A typed or fitted BC is never overwritten when the weight changes ----
test('BC typed .533 for 190 gr survives a weight change to 200 gr, and the user is asked to confirm or enter a value', async () => {
  const { ctx, page } = await open(one({ bc: '0.533', wt: '190', bcwt: '190', bcsrc: 'user' }, { dist: '500' })); await go(page, 'Rifle');
  await type(page, 'wt', '200'); eq(await val(page, 'bc'), '0.533', 'the typed BC was overwritten');
  await go(page, 'Hud'); const n = await txt(page, '#notice'); ok(/190 gr/.test(n) && /200 gr/.test(n) && /0\.533/.test(n) && /may not apply/i.test(n), n);
  for (const s of NUMS) eq(await txt(page, s), '—', s + ' still shows a number before confirming');
  await go(page, 'Rifle'); ok(await page.$eval('#bc', e => e.classList.contains('bad')), 'BC field not flagged'); ok(await page.isVisible('#bcKeep'), 'no confirm button'); ok(/200 gr/.test(await txt(page, '#bcKeep')) && /0\.533/.test(await txt(page, '#bcKeep')), await txt(page, '#bcKeep'));
  await page.click('#bcKeep'); await page.waitForTimeout(100); eq(await val(page, 'bc'), '0.533'); eq(await val(page, 'bcwt'), '200'); eq(await val(page, 'bcsrc'), 'user');
  ok(!(await page.isVisible('#bcKeep')), 'confirm button stays'); await go(page, 'Hud'); ok((await txt(page, '#elevClicks')) !== '—', 'no result after confirming'); ok(!/may not apply/.test(await txt(page, '#notice')));
  await ctx.close();
});
test('entering a coefficient for the new bullet clears the prompt; going back to the old weight clears it without touching the BC', async () => {
  const { ctx, page } = await open(one({ bc: '0.533', wt: '190', bcwt: '190', bcsrc: 'user' }, { dist: '500' })); await go(page, 'Rifle');
  await type(page, 'wt', '200'); await type(page, 'bc', '0.561'); eq(await val(page, 'bcwt'), '200'); eq(await val(page, 'bcsrc'), 'user');
  await go(page, 'Hud'); ok((await txt(page, '#elevClicks')) !== '—', 'still blocked after entering a BC'); await go(page, 'Rifle');
  await type(page, 'wt', '190'); await type(page, 'bc', '0.533'); await type(page, 'wt', '200'); await type(page, 'wt', '190'); eq(await val(page, 'bc'), '0.533');
  await go(page, 'Hud'); ok((await txt(page, '#elevClicks')) !== '—', 'blocked at the weight the BC was entered for'); await ctx.close();
});
test('typing a weight digit by digit never changes a typed BC', async () => {
  const { ctx, page } = await open(one({ bc: '0.533', wt: '190', bcwt: '190' })); await go(page, 'Rifle');
  for (const w of ['2', '20', '200', '2000', '200']) { await type(page, 'wt', w); eq(await val(page, 'bc'), '0.533', 'BC changed at weight ' + w); } await ctx.close();
});
test('a fitted BC is not overwritten either, keeps its fitted label when confirmed, and the prompt survives a reload', async () => {
  const { ctx, page } = await open(one({ bc: '0.480', wt: '168', bcwt: '168', bcsrc: 'fitted' }, { dist: '500' })); await go(page, 'Rifle');
  await type(page, 'wt', '175'); eq(await val(page, 'bc'), '0.480'); eq(await val(page, 'bcsrc'), 'fitted'); await page.waitForTimeout(200);
  await page.reload(); await page.waitForTimeout(250); await go(page, 'Hud'); ok(/may not apply/i.test(await txt(page, '#notice')), 'prompt lost on reload: ' + await txt(page, '#notice'));
  await go(page, 'Rifle'); eq(await val(page, 'bc'), '0.480'); await page.click('#bcKeep'); await page.waitForTimeout(100); eq(await val(page, 'bcsrc'), 'fitted'); ok(/fitted/i.test(await txt(page, '#bcSrc'))); await ctx.close();
});
test('a BC saved before this version (no source, no weight recorded) is protected too', async () => {
  const f = FULL({ bc: '0.533', wt: '190' }); delete f.bcsrc; delete f.bcwt;
  const { ctx, page } = await open(seedOf([{ name: 'One', active: 0, profiles: [f] }])); await go(page, 'Rifle'); eq(await val(page, 'bc'), '0.533');
  ok(/saved/i.test(await txt(page, '#bcSrc')), await txt(page, '#bcSrc')); await go(page, 'Hud'); ok(!/may not apply/.test(await txt(page, '#notice')), 'old data flagged on load');
  await go(page, 'Rifle'); await type(page, 'wt', '200'); eq(await val(page, 'bc'), '0.533', 'old BC overwritten'); await go(page, 'Hud'); ok(/may not apply/i.test(await txt(page, '#notice'))); await ctx.close();
});
test('a pending BC confirmation in one rifle does not leak into another', async () => {
  const a = FULL({ pname: 'A', bc: '0.533', wt: '190', bcwt: '190' }), b = FULL({ pname: 'B' });
  const { ctx, page } = await open(seedOf([{ name: 'One', active: 0, profiles: [a, b] }])); await go(page, 'Rifle');
  await type(page, 'wt', '200'); await pick(page, 'profSel', '1'); eq(await val(page, 'bc'), '0.462'); eq(await val(page, 'wt'), '168'); await go(page, 'Hud'); ok(!/may not apply/.test(await txt(page, '#notice')), 'B blocked by A');
  await go(page, 'Rifle'); await pick(page, 'profSel', '0'); eq(await val(page, 'wt'), '200'); eq(await val(page, 'bc'), '0.533'); await go(page, 'Hud'); ok(/may not apply/i.test(await txt(page, '#notice')), 'A prompt lost'); await ctx.close();
});

// ---- 3. Preset-derived, typed and fitted values are shown differently ----
test('the BC source line tells preset-derived, typed, fitted and saved values apart, with a panel note for each non-typed one', async () => {
  const { ctx, page } = await open(); await go(page, 'Rifle'); eq(await val(page, 'bcsrc'), 'factory');
  const fac = await txt(page, '#bcSrc'); ok(/preset|cartridge/i.test(fac) && /not (for )?your bullet|not yours|typical/i.test(fac), fac);
  await go(page, 'Hud'); ok((await assessIds(page)).includes('notice:bcfactory'), 'no preset-derived note: ' + await assessIds(page));
  await go(page, 'Rifle'); await type(page, 'bc', '0.5'); eq(await val(page, 'bcsrc'), 'user'); const usr = await txt(page, '#bcSrc'); ok(/your entered/i.test(usr), usr);
  await go(page, 'Hud'); ok(!(await assessIds(page)).some(i => /bcfactory|bcfitted/.test(i)), 'notes left after typing');
  await go(page, 'Rifle'); await page.evaluate(() => { const m = document.getElementById('fitMoa'); m.value = '11'; m.dispatchEvent(new Event('input', { bubbles: true })); document.getElementById('fitWhat').value = 'bc'; document.getElementById('fitBtn').click(); });
  await page.waitForTimeout(150); eq(await val(page, 'bcsrc'), 'fitted'); const fit = await txt(page, '#bcSrc'); ok(/fitted/i.test(fit), fit);
  eq(new Set([fac, usr, fit]).size, 3, 'two sources share the same text'); await go(page, 'Hud'); ok((await assessIds(page)).includes('notice:bcfitted'));
  await go(page, 'Rifle'); await pick(page, 'preset', 'p65cm'); eq(await val(page, 'bcsrc'), 'factory'); eq(await val(page, 'bcwt'), '140'); await ctx.close();
});
test('a preset-derived BC still follows the weight (existing behaviour), is labelled as such, and returns when the weight is restored', async () => {
  const { ctx, page } = await open(); await go(page, 'Rifle'); await type(page, 'wt', '175'); eq(await val(page, 'bc'), '0.481'); eq(await val(page, 'bcsrc'), 'factory');
  ok(/scaled/i.test(await txt(page, '#loadMsg')), await txt(page, '#loadMsg')); await go(page, 'Hud'); ok((await txt(page, '#elevClicks')) !== '—', 'blocked for a preset-derived BC');
  await go(page, 'Rifle'); await type(page, 'wt', '168'); eq(await val(page, 'bc'), '0.462'); await ctx.close();
});
test('source, weight and confirmation are saved with the rifle and reload unchanged', async () => {
  const { ctx, page } = await open(); await go(page, 'Rifle'); await type(page, 'bc', '0.5'); await type(page, 'wt', '175'); await page.click('#bcKeep'); await page.waitForTimeout(250);
  const r = (await stored(page)).people[0].profiles[0]; eq([r.bc, r.wt, r.bcsrc, r.bcwt], ['0.5', '175', 'user', '175']);
  await page.reload(); await page.waitForTimeout(250); await go(page, 'Rifle'); eq([await val(page, 'bc'), await val(page, 'wt'), await val(page, 'bcsrc'), await val(page, 'bcwt')], ['0.5', '175', 'user', '175']); await ctx.close();
});

// ---- 4. Phone layout of the prompt ----
for (const [w, h] of [[360, 740], [390, 844]]) {
  test('the BC confirmation prompt and the stability warning fit at ' + w + ' px with comfortable touch targets', async () => {
    const { ctx, page } = await open(one(Object.assign({}, low, { bc: '0.243', bcsrc: 'user', bcwt: '50' }), { dist: '500' }), w, h);
    const noScroll = () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
    ok(await noScroll(), 'HUD scrolls sideways'); const n = await page.$eval('#notice', e => { const b = e.getBoundingClientRect(); return [b.left, b.right, e.scrollWidth <= e.clientWidth + 1]; }); ok(n[0] >= 0 && n[1] <= w && n[2], 'notice clipped ' + n);
    await go(page, 'Rifle'); ok(await noScroll(), 'Rifle scrolls sideways'); ok(await page.isVisible('#bcKeep'));
    for (const sel of ['#bcKeep', '#bc', '#wt']) { const b = await page.$eval(sel, e => { const r = e.getBoundingClientRect(); return [r.width, r.height, r.left, r.right]; }); ok(b[1] >= 40 && b[0] >= 44 && b[2] >= 0 && b[3] <= w, sel + ' size/position ' + b); }
    const s = await page.$eval('#bcSrc', e => { const r = e.getBoundingClientRect(); return [r.left, r.right, e.scrollWidth <= e.clientWidth + 1]; }); ok(s[0] >= 0 && s[1] <= w && s[2], 'bcSrc clipped ' + s);
    await go(page, 'Hud'); await page.click('#assessSum').catch(() => {}); ok(await noScroll(), 'HUD with panel open scrolls sideways'); await go(page, 'Chart'); ok(await noScroll(), 'Chart scrolls sideways'); await ctx.close();
  });
}
(async () => {
  await new Promise(r => server.listen(0, r)); base = 'http://localhost:' + server.address().port;
  browser = await chromium.launch(); let pass = 0, fail = 0;
  for (const t of tests) { try { await t.f(); pass++; console.log('  ok   ' + t.n); } catch (e) { fail++; console.log('  FAIL ' + t.n + ': ' + e.message.split('\n')[0].slice(0, 220)); } }
  await browser.close(); server.close(); console.log('\n' + pass + ' passed, ' + fail + ' failed, ' + tests.length + ' total'); process.exit(fail ? 1 : 0);
})();

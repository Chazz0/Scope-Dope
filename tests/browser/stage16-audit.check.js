'use strict';
// Stage 16 pre-merge safeguard audit (browser side): saved rifles survive save, reload, export and import; the legacy click value never makes
// scope adjustments; incomplete or invalid scope settings never produce clicks; the module running in the page is the tested one.
// Run: node tests/browser/stage16-audit.check.js
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
const rifle = (name, extra) => Object.assign({ pname: name, preset: 'p308', cname: '', model: 'G1', bc: '0.462', wt: '168', diam: '0.308', v0: '2650', v0src: 'user', bcsrc: 'factory', bcwt: '168', vref: '59', vsens: '0', zero: '100', h: '1.5', twist: '10', tdir: 'R', temp: '59', press: '', humidity: '50', alt: '0', lat: '' }, extra || {});
const NEW = ['eUnit', 'eClick', 'eCf', 'wUnit', 'wClick', 'wCf'];
const full = (o) => Object.assign({ click: '', eUnit: '', eClick: '', eCf: '', wUnit: '', wClick: '', wCf: '' }, o);
const R = {
  mil: full(rifle('Mil', { eUnit: 'MIL', eClick: '0.1', eCf: '1.0345', wUnit: 'MIL', wClick: '0.1', wCf: '1', click: 'MRAD:0.1' })),
  moa: full(rifle('Moa', { eUnit: 'TRUE_MOA', eClick: '0.25', eCf: '1', wUnit: 'SHOOTER_MOA', wClick: '0.5', wCf: '1' })),
  partial: full(rifle('Partial', { eUnit: 'MIL' })),
  legacy: full(rifle('Legacy', { click: 'MOA:0.25' })),
  badunit: full(rifle('BadUnit', { eUnit: 'MOA', eClick: '0.25', eCf: '1', wUnit: 'TRUE_MOA', wClick: '0.25', wCf: '1' })),
  badnum: full(rifle('BadNum', { eUnit: 'MIL', eClick: '0.25abc', eCf: '1', wUnit: 'MIL', wClick: '0.1', wCf: '1' })),
  badwcf: full(rifle('BadWcf', { eUnit: 'MIL', eClick: '0.1', eCf: '1', wUnit: 'MIL', wClick: '0.1', wCf: '1.0000001' }))
};
const ALL = [R.mil, R.moa, R.partial, R.legacy, R.badunit, R.badnum, R.badwcf];
const COMPLETE = new Set(['Mil', 'Moa']);
const store = (profiles) => ({ 'scopedope.v2': JSON.stringify({ schema: 1, pi: 0, people: [{ name: 'Me', active: 0, profiles }], session: { dist: '400', wind: '10', windHr: '3', angle: '0', az: '0', cStart: '100', cEnd: '600', cStep: '100' } }) });
async function open(seed, init) {
  const ctx = await browser.newContext({ viewport: { width: 400, height: 860 }, serviceWorkers: 'block' });
  const page = await ctx.newPage(); page.errors = []; page.on('pageerror', e => page.errors.push(e.message));
  if (seed) await page.addInitScript(s => { if (!sessionStorage.getItem('__s')) { for (const k of Object.keys(s)) localStorage.setItem(k, s[k]); sessionStorage.setItem('__s', '1'); } }, seed);
  await page.goto(base + '/index.html'); await page.waitForTimeout(250); return { ctx, page };
}
const stored = async (p) => JSON.parse(await p.evaluate(() => localStorage.getItem('scopedope.v2'))).people[0].profiles;
const storedAll = async (p) => JSON.parse(await p.evaluate(() => localStorage.getItem('scopedope.v2'))).people.flatMap(x => x.profiles);
const wait = (p, ms) => p.waitForTimeout(ms || 150);
const pick = async (p, i) => { await p.click('#tabRifle'); await wait(p, 100); await p.selectOption('#profSel', String(i)); await wait(p, 250); };
const hudE = async (p) => { await p.click('#tabHud'); await wait(p); return (await p.$eval('#elevClicks', e => e.textContent)).trim() + '|' + (await p.$eval('#windClicks', e => e.textContent)).trim(); };
const same = (got, want, label) => { for (const k of Object.keys(want)) { if (k === 'v0src' || k === 'bcwt') continue;
  // FINDING: a <select> or number input cannot hold text that is not one of its options or not a number, so an invalid stored value (never written by the app itself)
  // is either kept as it was (rifle not opened) or saved back as "" (rifle opened), and the rifle is incomplete either way. Every other field is compared exactly.
  const invalidText = (want.pname === 'BadUnit' && k === 'eUnit') || (want.pname === 'BadNum' && k === 'eClick');
  if (invalidText) { ok(got[k] === want[k] || got[k] === '', label + ' ' + k + ': ' + JSON.stringify(got[k])); continue; }
  eq(got[k], want[k], label + ' field ' + k); } };
const heads = async (p) => { await p.click('#tabChart'); await wait(p, 400); return p.$$eval('#thead th', e => e.map(x => x.textContent)); };

test('save and reload: every field of every rifle is unchanged (including the legacy value and invalid strings), nothing is filled in', async () => {
  const { ctx, page } = await open(store(ALL));
  await page.click('#tabRifle'); await page.fill('#h', '1.6'); await page.dispatchEvent('#h', 'input'); await wait(page, 250); await page.fill('#h', '1.5'); await page.dispatchEvent('#h', 'input'); await wait(page, 250);   // forces saves
  for (let round = 0; round < 2; round++) { for (let i = 0; i < ALL.length; i++) await pick(page, i); await page.reload(); await wait(page, 300); }
  const got = await stored(page); eq(got.length, ALL.length);
  ALL.forEach((r, i) => same(got[i], r, r.pname)); eq(page.errors, []); await ctx.close();
});
test('export then import: the code carries every field, and the imported rifles are the same, with the same complete or incomplete status', async () => {
  const a = await open(store(ALL)); await a.page.click('#tabRifle'); await wait(a.page, 100);
  await a.page.click('#exportBtn'); await wait(a.page, 200);
  const code = await a.page.$eval('#exportCode', e => e.value); const parsed = JSON.parse(code);
  const exported = parsed.people[0].profiles; eq(exported.length, ALL.length); ALL.forEach((r, i) => same(exported[i], r, 'export ' + r.pname));
  const b = await open(); await b.page.click('#tabRifle'); await wait(b.page, 100);
  await b.page.fill('#importCode', code); await b.page.dispatchEvent('#importCode', 'input'); await b.page.click('#importBtn'); await wait(b.page, 400);
  const got = await storedAll(b.page); const imported = got.filter(r => ALL.some(x => x.pname === r.pname)); eq(imported.length, ALL.length, 'all rifles imported');
  for (const r of ALL) same(imported.find(x => x.pname === r.pname), r, 'import ' + r.pname);
  const labels = []; const np = await b.page.$$eval('#person option', o => o.length);
  for (let pi = 0; pi < np; pi++) { await b.page.selectOption('#person', String(pi)); await wait(b.page, 250); labels.push(...await b.page.$$eval('#profSel option', o => o.map(x => x.textContent))); }
  for (const r of ALL) { const l = labels.find(x => x.startsWith(r.pname)); ok(l, 'listed ' + r.pname); eq(/scope not set/.test(l), !COMPLETE.has(r.pname), 'status of ' + r.pname + ' after import: ' + l); }
  eq(a.page.errors, []); eq(b.page.errors, []); await a.ctx.close(); await b.ctx.close();
});
test('an old backup code (rifles with only the legacy click value) imports as incomplete rifles and the value is kept, not applied', async () => {
  const old = JSON.stringify({ app: 'scopedope', schema: 1, people: [{ name: 'Dad', active: 0, profiles: [rifle('Dad 308', { click: 'MOA:0.25' }), rifle('Dad mil', { click: 'MRAD:0.1' })] }] });
  const { ctx, page } = await open(); await page.click('#tabRifle'); await wait(page, 100);
  await page.fill('#importCode', old); await page.dispatchEvent('#importCode', 'input'); await page.click('#importBtn'); await wait(page, 400);
  await page.selectOption('#person', { label: 'Dad' }).catch(() => {}); await wait(page, 250);
  const people = JSON.parse(await page.evaluate(() => localStorage.getItem('scopedope.v2'))).people; const dad = people.find(p => p.name === 'Dad'); ok(dad, 'Dad imported');
  eq(dad.profiles.map(r => r.click), ['MOA:0.25', 'MRAD:0.1']); for (const r of dad.profiles) for (const k of NEW) eq(r[k], '', k + ' stays empty');
  eq(await hudE(page), '—|—'); ok(/scope not set/.test(await page.$eval('#profSel', e => e.options[0].textContent)), 'marked'); await ctx.close();
});
test('legacy click value never produces clicks: on load, after reload, after switching, partly filled, and after import; only the button changes anything, and not a factor', async () => {
  const { ctx, page } = await open(store([R.legacy, R.partial, R.mil]));
  eq(await hudE(page), '—|—', 'legacy on load'); await page.reload(); await wait(page, 300); eq(await hudE(page), '—|—', 'legacy after reload');
  await pick(page, 1); eq(await hudE(page), '—|—', 'partial'); await pick(page, 2); ok((await hudE(page)) !== '—|—', 'complete rifle shows clicks'); await pick(page, 0); eq(await hudE(page), '—|—', 'legacy after switching back');
  const th = await heads(page); ok(!th.some(t => /Dial|clicks/.test(t)), 'range card has no dial or click columns: ' + th);
  await page.click('#tabRifle'); await wait(page, 100); await page.click('#scopeLegacy'); await wait(page, 200);
  eq(await hudE(page), '—|—', 'still no clicks after filling units and clicks: the factors are empty');
  eq(await page.$eval('#eCf', e => e.value) + '|' + await page.$eval('#wCf', e => e.value), '|'); await ctx.close();
});
test('every incomplete or invalid stored scope setting gives no clicks, no Dial columns, and says why', async () => {
  const cases = [['eUnit', ''], ['eUnit', 'MOA'], ['eUnit', 'mil'], ['eUnit', 'true_moa'], ['eUnit', 'TRUE_MOA '], ['eClick', ''], ['eClick', '0'], ['eClick', '-0'], ['eClick', '-1'], ['eClick', '10.01'], ['eClick', '1,5'], ['eClick', '0x10'], ['eClick', '0.25abc'], ['eClick', 'Infinity'], ['eClick', 'NaN'], ['eClick', '.'], ['eClick', '1e400'],
    ['eCf', ''], ['eCf', '0'], ['eCf', '0.49'], ['eCf', '2.01'], ['eCf', 'abc'], ['eCf', '1.0.0'], ['wUnit', ''], ['wUnit', 'MRAD'], ['wClick', ''], ['wClick', '0'], ['wClick', '11'], ['wCf', ''], ['wCf', '0.9999999'], ['wCf', '1.0000001'], ['wCf', '1.075'], ['wCf', '2']];
  const base0 = { eUnit: 'MIL', eClick: '0.1', eCf: '1', wUnit: 'MIL', wClick: '0.1', wCf: '1' };
  { const { ctx, page } = await open(store([full(rifle('OK', base0))])); ok((await hudE(page)) !== '—|—', 'control: the valid rifle shows clicks'); await ctx.close(); }
  const { ctx, page } = await open(store(cases.map(([f, v], i) => full(rifle('C' + i, { ...base0, [f]: v })))));
  for (let i = 0; i < cases.length; i++) {
    await pick(page, i); eq(await hudE(page), '—|—', 'HUD for ' + cases[i]);
    ok(/incomplete/.test(await page.$eval('#scopeStatus', e => e.textContent)), 'status for ' + cases[i]);
    ok(/scope not set/.test(await page.$eval('#profSel', (e, n) => e.options[n].textContent, i)), 'label for ' + cases[i]);
    ok(await page.$eval('#' + cases[i][0], e => e.classList.contains('needs')), 'flag for ' + cases[i]);
  }
  await pick(page, 0); const th = await heads(page); ok(!th.some(t => /Dial|clicks/.test(t)), 'no dial columns: ' + th); eq(page.errors, []); await ctx.close();
});
test('production page: the module running in the browser behaves as the tested library, including exact half clicks on both axes', async () => {
  const { ctx, page } = await open();
  const r = await page.evaluate(() => {
    const out = [];
    for (let k = -9; k <= 9; k++) { const v = k * 0.125; const a = ScopeAdjust.scopeAdjustment(ScopeAdjust.ballisticCorrection(v, 'TRUE_MOA'), ScopeAdjust.ballisticCorrection(v, 'TRUE_MOA'),
      { elevation: { unit: 'TRUE_MOA', clickValue: 0.25, trackingCorrectionFactor: 1 }, windage: { unit: 'TRUE_MOA', clickValue: 0.25, trackingCorrectionFactor: 1 } }); out.push([k, a.elevation.clicks, a.windage.clicks]); }
    let threw = false; try { ScopeAdjust.adjustAxis(ScopeAdjust.ballisticCorrection(1, 'MIL'), { unit: 'TRUE_MOA', clickValue: 0.25, trackingCorrectionFactor: 1 }, 'elevation'); } catch (e) { threw = e.name === 'ScopeAdjustError'; }
    return { out, threw, keys: Object.keys(ScopeAdjust).sort() };
  });
  const lib = require('../../lib/scope-adjust');
  for (const [k, e, w] of r.out) { const want = (k / 2 < 0 ? -Math.round(-k / 2) : Math.round(k / 2)) + 0; eq([e, w], [want, want], 'half-click ' + k * 0.125); }
  ok(r.threw, 'unit mixing refused in the page'); eq(r.keys, Object.keys(lib).sort()); await ctx.close();
});
(async () => {
  await new Promise(r => server.listen(0, r)); base = 'http://localhost:' + server.address().port; browser = await chromium.launch();
  let pass = 0, fail = 0;
  for (const t of tests) { try { await t.f(); pass++; console.log('PASS ' + t.n); } catch (e) { fail++; console.log('FAIL ' + t.n + '\n     ' + e.message.split('\n')[0].slice(0, 400)); } }
  console.log('\n' + pass + ' passed, ' + fail + ' failed, ' + tests.length + ' total');
  await browser.close(); server.close(); process.exit(fail ? 1 : 0);
})();

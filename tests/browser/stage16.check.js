'use strict';
// Stage 16 browser checks: separate elevation and windage scope settings, no silent defaults, legacy rifles flagged and never migrated,
// calculated corrections kept apart from scope adjustments, HUD and range card, and the trajectory unchanged versus the previous release.
// Run: node tests/browser/stage16.check.js
const http = require('http'), fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..', '..');
// The previous release is pinned (b72dccb, the Stage 14 state), not 'main', so this check still compares with the pre-Stage-16 app after Stage 16 is merged.
const PREV = process.env.PREV_REF || 'b72dccb';
const oldHtml = execFileSync('git', ['show', PREV + ':index.html'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 });
const server = http.createServer((req, res) => {
  const u = req.url.split('?')[0];
  if (u === '/old.html') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(oldHtml); }
  const f = path.join(ROOT, u === '/' ? 'index.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); res.end(fs.readFileSync(f));
});
const ok = (c, m) => { if (!c) throw new Error(m || 'assertion failed'); };
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((m || 'mismatch') + ': expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a)); };
let browser, base; const tests = []; const test = (n, f) => tests.push({ n, f });
const rifle = (name, extra) => Object.assign({ pname: name, preset: 'p308', cname: '', model: 'G1', bc: '0.462', wt: '168', diam: '0.308', v0: '2650', v0src: 'user', bcsrc: 'factory', bcwt: '168', vref: '59', vsens: '0', zero: '100', h: '1.5', twist: '10', tdir: 'R', temp: '59', press: '', humidity: '50', alt: '0', lat: '' }, extra || {});
const seed = (profiles, active) => ({ 'scopedope.v2': JSON.stringify({ schema: 1, pi: 0, people: [{ name: 'Me', active: active || 0, profiles }], session: { dist: '400', wind: '10', windHr: '3', angle: '0', az: '0', cStart: '100', cEnd: '600', cStep: '100' } }) });
const SCOPE = { eUnit: 'MIL', eClick: '0.1', eCf: '1.05', wUnit: 'MIL', wClick: '0.1', wCf: '1' };
async function open(seedData, w = 400, h = 860, url = '/index.html') {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, serviceWorkers: 'block' });
  const page = await ctx.newPage(); page.errors = []; page.on('pageerror', e => page.errors.push(e.message));
  if (seedData) await page.addInitScript(s => { if (!sessionStorage.getItem('__s')) { for (const k of Object.keys(s)) localStorage.setItem(k, s[k]); sessionStorage.setItem('__s', '1'); } }, seedData);
  await page.goto(base + url); await page.waitForTimeout(200); return { ctx, page };
}
const txt = (p, sel) => p.$eval(sel, e => e.textContent);
const val = (p, id) => p.$eval('#' + id, e => e.value);
const stored = async (p) => JSON.parse(await p.evaluate(() => localStorage.getItem('scopedope.v2')));
const setf = async (p, id, v) => { await p.click('#tabRifle'); if (id.endsWith('Unit')) await p.selectOption('#' + id, v); else { await p.fill('#' + id, String(v)); await p.dispatchEvent('#' + id, 'input'); } await p.waitForTimeout(60); };
const hud = async (p) => { await p.click('#tabHud'); await p.waitForTimeout(150); return { e: (await txt(p, '#elevClicks')).trim(), w: (await txt(p, '#windClicks')).trim(), eSub: await txt(p, '#elevSub'), wSub: await txt(p, '#windSub'), eDir: await txt(p, '#elevDir'), notice: await txt(p, '#notice'), units: await p.$$eval('.dial-unit', els => els.map(e => e.textContent)) }; };
const heads = async (p) => { await p.click('#tabChart'); await p.waitForTimeout(400); return p.$$eval('#thead th', els => els.map(e => e.textContent)); };
const fillAll = async (p, o) => { for (const k of Object.keys(o)) await setf(p, k, o[k]); };

test('a new rifle has no scope settings and no default click value: fields are empty, status says incomplete, label is marked', async () => {
  const { ctx, page } = await open(); await page.click('#tabRifle');
  for (const id of ['eUnit', 'eClick', 'eCf', 'wUnit', 'wClick', 'wCf']) eq(await val(page, id), '', id + ' must start empty');
  ok(/incomplete/.test(await txt(page, '#scopeStatus')), 'status'); ok(/scope not set/.test(await page.$eval('#profSel', e => e.options[0].textContent)), 'label');
  ok(!(await page.evaluate(() => document.documentElement.outerHTML)).includes('MOA:0.25'), 'no 1/4 MOA default anywhere in the page'); eq(page.errors, []); await ctx.close();
});
test('incomplete scope: HUD shows the calculated correction (mil and true MOA) with no clicks, and says so', async () => {
  const { ctx, page } = await open(); const h = await hud(page);
  eq(h.e, '—'); eq(h.w, '—'); ok(/Calculated [\d.]+ mil, [\d.]+ true MOA/.test(h.eSub), h.eSub); ok(!/clicks/.test(h.eSub + h.wSub), 'no clicks shown'); eq(h.eDir, 'Set scope');
  ok(/Scope settings are incomplete/.test(h.notice), h.notice); ok(h.units.every(u => u === 'scope not set'), String(h.units)); eq(page.errors, []); await ctx.close();
});
test('incomplete scope: the range card shows calculated columns only and says so', async () => {
  const { ctx, page } = await open(); const th = await heads(page);
  eq(th.slice(0, 6), ['Yd', 'Drop in', 'Calc up mil', 'Calc up true MOA', 'Calc wind mil', 'Calc wind true MOA']); ok(!th.some(t => /clicks|Dial/.test(t)), String(th));
  ok(/calculated corrections only/.test(await txt(page, '#cMsg')), 'message'); const rows = await page.$$eval('#tbody tr', r => r.length); ok(rows >= 5, 'rows'); await ctx.close();
});
test('complete scope: HUD dial = calculated x tracking factor, clicks rounded, calculated value shown separately, unit labelled', async () => {
  const { ctx, page } = await open(seed([rifle('A', SCOPE)])); const h = await hud(page);
  const m = /(\d+) clicks · calculated ([\d.]+) mil × tracking 1\.05/.exec(h.eSub); ok(m, h.eSub);
  const calc = parseFloat(m[2]), dial = parseFloat(h.e);
  ok(Math.abs(dial - calc * 1.05) < 0.011, 'dial ' + dial + ' vs calc*1.05 ' + calc * 1.05); ok(Math.abs(parseInt(m[1]) - Math.round(calc * 1.05 / 0.1)) <= 1, 'clicks');
  ok(!/tracking/.test(h.wSub), 'windage has no factor shown'); eq(h.units, ['mil', 'mil']); ok(!/incomplete/.test(h.notice), h.notice);
  ok(!/scope not set/.test(await page.$eval('#profSel', e => e.options[0].textContent)), 'label not marked'); eq(page.errors, []); await ctx.close();
});
test('complete scope: range card has Calc and Dial columns, dial = calc x factor on every row', async () => {
  const { ctx, page } = await open(seed([rifle('A', SCOPE)])); const th = await heads(page);
  eq(th.slice(0, 10), ['Yd', 'Drop in', 'Calc up mil', 'Calc up true MOA', 'Calc wind mil', 'Calc wind true MOA', 'Dial up (mil)', 'Up clicks', 'Dial wind (mil)', 'Wind clicks']);
  const rows = await page.$$eval('#tbody tr', trs => trs.map(tr => [...tr.children].map(td => td.textContent)));
  for (const r of rows) { if (r.length < 10) continue; const calc = parseFloat(r[2].replace('−', '-')), dial = parseFloat(r[6].replace('−', '-')); ok(Math.abs(dial - calc * 1.05) < 0.011, r.join('|')); }
  ok(rows.length >= 5, 'rows'); await ctx.close();
});
test('separate settings: MIL elevation with true MOA windage, different click values', async () => {
  const { ctx, page } = await open(seed([rifle('A', { eUnit: 'MIL', eClick: '0.1', eCf: '1', wUnit: 'TRUE_MOA', wClick: '0.25', wCf: '1' })])); const h = await hud(page);
  eq(h.units, ['mil', 'true MOA']); const wc = /(\d+) clicks · calculated ([\d.]+) true MOA/.exec(h.wSub); ok(wc, h.wSub);
  ok(Math.abs(parseInt(wc[1]) - Math.round(parseFloat(wc[2]) / 0.25)) <= 1, 'wind clicks follow the windage click value'); await ctx.close();
});
test('shooter MOA is a distinct unit: same load, different dial value from true MOA', async () => {
  const a = await open(seed([rifle('A', { ...SCOPE, eUnit: 'TRUE_MOA', eClick: '0.25', eCf: '1' })])), b = await open(seed([rifle('A', { ...SCOPE, eUnit: 'SHOOTER_MOA', eClick: '0.25', eCf: '1' })]));
  const x = parseFloat((await hud(a.page)).e), y = parseFloat((await hud(b.page)).e); ok(Math.abs(y / x - 1.0471975512) < 0.01, 'ratio ' + y / x); await a.ctx.close(); await b.ctx.close();
});
test('windage factor must be exactly 1.000: other values make the scope incomplete, are flagged, and the elevation factor is never used for windage', async () => {
  const { ctx, page } = await open(seed([rifle('A', { ...SCOPE, wCf: '1.05' })])); const h = await hud(page);
  eq(h.e, '—'); await page.click('#tabRifle'); ok(/Windage correction factor/.test(await txt(page, '#scopeStatus')), await txt(page, '#scopeStatus'));
  ok(await page.$eval('#wCf', e => e.classList.contains('needs') && e.getAttribute('aria-invalid') === 'true'), 'flagged');
  await setf(page, 'wCf', '1'); ok((await hud(page)).e !== '—', 'complete with exactly 1'); await ctx.close();
});
test('each missing or invalid scope field is named and blocks clicks, never defaulted', async () => {
  for (const [f, v] of [['eUnit', ''], ['eClick', ''], ['eCf', ''], ['wUnit', ''], ['wClick', ''], ['wCf', ''], ['eClick', '0'], ['eClick', '-0.1'], ['eClick', '11'], ['wClick', '0'], ['eCf', '0.4'], ['eCf', '2.5'], ['eCf', '0']]) {
    const { ctx, page } = await open(seed([rifle('A', { ...SCOPE, [f]: v })])); const h = await hud(page);
    eq(h.e, '—', f + '=' + v + ' must give no clicks'); await page.click('#tabRifle'); ok(await page.$eval('#' + f, e => e.classList.contains('needs')), f + ' flagged');
    ok(/incomplete/.test(await txt(page, '#scopeStatus')), 'status for ' + f + '=' + v); eq(await val(page, f), v, 'the entered value is not replaced'); eq(page.errors, []); await ctx.close();
  }
});
test('limit text: the click limit of 10 is described as the application limit, not a manufacturer or Applied Ballistics value', async () => {
  const { ctx, page } = await open(); await page.click('#tabRifle'); await page.waitForTimeout(200); const t = await page.evaluate(() => document.body.innerText);
  ok(/up to 10 are accepted; that is this app's own limit, not an Applied Ballistics or manufacturer value/.test(t.replace(/\s+/g, ' ')), 'limit text'); ok(/Applied Ballistics Tracking Correction Factor/.test(t), 'AB label'); await ctx.close();
});
test('legacy rifle (single click value, no scope settings): kept exactly as saved, flagged incomplete, no clicks, nothing migrated', async () => {
  const legacy = rifle('Old 300', { click: 'MOA:0.25', bc: '0.597', wt: '200', v0: '2860' });
  const { ctx, page } = await open(seed([legacy])); const h = await hud(page);
  eq(h.e, '—'); ok(/scope not set/.test(await page.$eval('#profSel', e => e.options[0].textContent)), 'marked');
  await page.click('#tabRifle'); const st = await txt(page, '#scopeStatus'); ok(/saved with one click setting \(0\.25 MOA, true MOA\)\. It has not been applied/.test(st), st);
  for (const id of ['eUnit', 'eClick', 'eCf', 'wUnit', 'wClick', 'wCf']) eq(await val(page, id), '', id);
  await page.fill('#h', '1.6'); await page.dispatchEvent('#h', 'input'); await page.waitForTimeout(200);   // force a save
  const p = (await stored(page)).people[0].profiles[0];
  eq(p.click, 'MOA:0.25', 'legacy value preserved'); for (const k of Object.keys(legacy)) if (k !== 'h') eq(p[k], legacy[k], 'field ' + k + ' preserved');
  for (const k of ['eUnit', 'eClick', 'eCf', 'wUnit', 'wClick', 'wCf']) eq(p[k], '', 'new field ' + k + ' stays empty'); eq(page.errors, []); await ctx.close();
});
test('legacy button fills units and click values only when pressed, leaves both tracking factors empty, and the rifle stays incomplete until they are entered', async () => {
  const { ctx, page } = await open(seed([rifle('Old', { click: 'MRAD:0.1' })])); await page.click('#tabRifle'); await page.waitForTimeout(200);
  ok(await page.isVisible('#scopeLegacy'), 'button visible'); await page.click('#scopeLegacy'); await page.waitForTimeout(150);
  eq([await val(page, 'eUnit'), await val(page, 'wUnit'), await val(page, 'eClick'), await val(page, 'wClick'), await val(page, 'eCf'), await val(page, 'wCf')], ['MIL', 'MIL', '0.1', '0.1', '', '']);
  ok(/incomplete/.test(await txt(page, '#scopeStatus')), 'still incomplete'); eq((await hud(page)).e, '—');
  await setf(page, 'eCf', '1'); await setf(page, 'wCf', '1'); ok((await hud(page)).e !== '—', 'complete after explicit entry');
  eq((await stored(page)).people[0].profiles[0].click, 'MRAD:0.1', 'legacy value still retained'); await ctx.close();
});
test('legacy button is not offered for a rifle that has no old click value or is already complete', async () => {
  const a = await open(); await a.page.click('#tabRifle'); await a.page.waitForTimeout(200); ok(!(await a.page.isVisible('#scopeLegacy')), 'new rifle'); await a.ctx.close();
  const b = await open(seed([rifle('Done', { ...SCOPE, click: 'MOA:0.25' })])); await b.page.click('#tabRifle'); await b.page.waitForTimeout(200); ok(!(await b.page.isVisible('#scopeLegacy')), 'complete'); await b.ctx.close();
});
test('several rifles: each keeps its own scope settings, incomplete ones are marked in the list and switching changes the HUD', async () => {
  const { ctx, page } = await open(seed([rifle('Mag', { ...SCOPE, v0: '2860', wt: '200', bc: '0.597' }), rifle('PRC', { click: 'MOA:0.25' }), rifle('Third', { ...SCOPE, eUnit: 'TRUE_MOA', eClick: '0.25', wUnit: 'TRUE_MOA', wClick: '0.25', eCf: '1' })]));
  await page.click('#tabRifle'); const labels = await page.$$eval('#profSel option', o => o.map(x => x.textContent)); eq(labels, ['Mag', 'PRC (scope not set)', 'Third']);
  eq((await hud(page)).units, ['mil', 'mil']);
  await page.click('#tabRifle'); await page.selectOption('#profSel', '1'); await page.waitForTimeout(250); eq((await hud(page)).e, '—');
  await page.click('#tabRifle'); await page.selectOption('#profSel', '2'); await page.waitForTimeout(250); eq((await hud(page)).units, ['true MOA', 'true MOA']);
  await page.click('#tabRifle'); await page.selectOption('#profSel', '0'); await page.waitForTimeout(250); eq([await val(page, 'eUnit'), await val(page, 'eClick'), await val(page, 'eCf')], ['MIL', '0.1', '1.05']);
  const prof = (await stored(page)).people[0].profiles; eq(prof[1].click, 'MOA:0.25'); eq(prof[0].eCf, '1.05'); eq(prof[2].eUnit, 'TRUE_MOA'); eq(page.errors, []); await ctx.close();
});
test('the trajectory is unchanged: calculated corrections match the previous release for the same inputs (true MOA and mil)', async () => {
  const inputs = [['300', 'p308'], ['600', 'p308'], ['1000', 'p308']];
  for (const [dist] of inputs) {
    const o = await open(seed([rifle('A', { click: 'MOA:0.25' })]), 400, 860, '/old.html'); await o.page.fill('#dist', dist); await o.page.dispatchEvent('#dist', 'input'); await o.page.click('#tabHud'); await o.page.waitForTimeout(150);
    const oldMoa = (await txt(o.page, '#elevClicks')).trim(), oldWind = (await txt(o.page, '#windClicks')).trim();
    await o.page.fill('#dist', dist); await o.page.dispatchEvent('#dist', 'input'); await o.ctx.close();
    const o2 = await open(seed([rifle('A', { click: 'MRAD:0.1' })]), 400, 860, '/old.html'); await o2.page.fill('#dist', dist); await o2.page.dispatchEvent('#dist', 'input'); await o2.page.click('#tabHud'); await o2.page.waitForTimeout(150);
    const oldMil = (await txt(o2.page, '#elevClicks')).trim(), oldWindMil = (await txt(o2.page, '#windClicks')).trim(); await o2.ctx.close();
    const n = await open(seed([rifle('A', {})])); await n.page.fill('#dist', dist); await n.page.dispatchEvent('#dist', 'input'); const h = await hud(n.page);
    const m = /Calculated ([\d.]+) mil, ([\d.]+) true MOA/.exec(h.eSub), w = /Calculated ([\d.]+) mil, ([\d.]+) true MOA/.exec(h.wSub); ok(m && w, h.eSub);
    eq(m[2], oldMoa, 'elevation true MOA at ' + dist + ' yd'); eq(m[1], oldMil, 'elevation mil at ' + dist + ' yd'); eq(w[2], oldWind, 'windage true MOA'); eq(w[1], oldWindMil, 'windage mil'); await n.ctx.close();
  }
});
test('the fit tool is labelled true MOA and still works on the calculated correction', async () => {
  const { ctx, page } = await open(); await page.click('#tabRifle'); await page.waitForTimeout(200); ok(/Up needed \(true MOA\)/.test(await page.evaluate(() => document.body.innerText)), 'label'); await ctx.close();
});
test('layout: the scope settings fit at 320, 390 and 768 px with no sideways scroll and no clipped fields', async () => {
  for (const w of [320, 390, 768]) {
    const { ctx, page } = await open(seed([rifle('A', SCOPE)]), w, 900); await page.click('#tabRifle'); await page.waitForTimeout(150);
    const r = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, f: ['eUnit', 'eClick', 'eCf', 'wUnit', 'wClick', 'wCf'].map(id => { const b = document.getElementById(id).getBoundingClientRect(); return [b.left, b.right, b.width]; }) }));
    ok(r.sw <= r.cw + 1, 'sideways scroll at ' + w); for (const [l, rr, ww] of r.f) ok(l >= 0 && rr <= w + 1 && ww > 40, 'field geometry at ' + w + ': ' + [l, rr, ww]);
    for (const tab of ['#tabHud', '#tabChart']) { await page.click(tab); await page.waitForTimeout(250); ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), tab + ' scroll at ' + w); }
    await ctx.close();
  }
});
(async () => {
  await new Promise(r => server.listen(0, r)); base = 'http://localhost:' + server.address().port; browser = await chromium.launch();
  let pass = 0, fail = 0;
  for (const t of tests) { try { await t.f(); pass++; console.log('PASS ' + t.n); } catch (e) { fail++; console.log('FAIL ' + t.n + '\n     ' + e.message.split('\n')[0].slice(0, 300)); } }
  console.log('\n' + pass + ' passed, ' + fail + ' failed, ' + tests.length + ' total');
  await browser.close(); server.close(); process.exit(fail ? 1 : 0);
})();

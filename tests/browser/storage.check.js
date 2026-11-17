'use strict';
// Browser tests for saved-data behavior (Stage 1 baseline).
// Needs Playwright with Chromium installed. Run:  node tests/browser/storage.check.js
// It serves the repository folder on a local port and drives index.html. It changes nothing in the app.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..', '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  const f = path.join(ROOT, req.url.split('?')[0] === '/' ? 'index.html' : req.url.split('?')[0]);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
});

const results = [];
let browser, base;
const eq = (a, b, msg) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((msg || 'mismatch') + ': expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a)); };
const ok = (c, msg) => { if (!c) throw new Error(msg || 'assertion failed'); };

async function open(seed, init) {
  const ctx = await browser.newContext({ viewport: { width: 400, height: 860 }, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', e => page.errors.push(e.message));
  if (init) await page.addInitScript(init);
  if (seed) {
    // Seed storage before the app's first run, once per tab (a reload must not re-seed).
    await page.addInitScript((s) => {
      if (!sessionStorage.getItem('__seeded')) { for (const k of Object.keys(s)) localStorage.setItem(k, s[k]); sessionStorage.setItem('__seeded', '1'); }
    }, seed);
  }
  await page.goto(base + '/index.html');
  await page.waitForTimeout(150);
  return { ctx, page };
}
const stored = (page) => page.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return o; });
const parsed = async (page) => JSON.parse((await stored(page))['scopedope.v2']);
const go = async (page, hash) => { await page.evaluate((h) => { location.hash = h; }, hash); await page.waitForTimeout(80); };
const val = (page, id) => page.$eval('#' + id, e => e.value);
const opts = (page, id) => page.$$eval('#' + id + ' option', o => o.map(x => x.textContent));
const nudge = async (page) => { await page.evaluate(() => { const e = document.getElementById('wind'); e.value = '11'; e.dispatchEvent(new Event('input', { bubbles: true })); }); await page.waitForTimeout(80); }; // forces a save

function test(name, fn) { results.push({ name, fn }); }

const oldShape = (profiles, active, session) => JSON.stringify({ active: active || 0, profiles, session: session || { dist: '300' } });
const rifle = (name, extra) => Object.assign({ pname: name, preset: 'p308', cname: '', model: 'G1', bc: '0.462', wt: '168', diam: '0.308', v0: '2650', vref: '59', vsens: '0', zero: '100', h: '1.5', twist: '10', tdir: 'R', click: 'MOA:0.25', temp: '59', press: '', humidity: '50', alt: '0', lat: '' }, extra || {});

test('fresh start creates one profile and the app writes it to storage at startup', async () => {
  const { ctx, page } = await open();
  const s = await parsed(page);
  eq(s.people.length, 1); eq(s.people[0].name, 'Me'); eq(s.people[0].profiles.length, 1);
  eq(page.errors, []); await ctx.close();
});
test('old v1 data migrates to the current format', async () => {
  const { ctx, page } = await open({ 'scopedope.v1': JSON.stringify({ v0: '3000', bc: '0.5', wt: '150', dist: '250', wind: '7', side: 'L' }) });
  eq(await val(page, 'v0'), '3000'); eq(await val(page, 'bc'), '0.5'); eq(await val(page, 'dist'), '250');
  eq(await page.$eval('.hr[aria-pressed="true"]', e => e.dataset.h), '9', 'left wind becomes 9 o\'clock');
  eq(page.errors, []); await ctx.close();
});
test('[known gap] old formats are rewritten in place at startup with no backup of the original', async () => {
  const seed = { 'scopedope.v2': oldShape([rifle('Old A')], 0) };
  const { ctx, page } = await open(seed);
  const all = await stored(page);
  ok(!Object.values(all).includes(seed['scopedope.v2']), 'GAP: the original old-format text is no longer stored');
  ok(!Object.keys(all).some(k => /backup|bak/i.test(k)), 'GAP: no backup key exists');
  await ctx.close();
});
test('old v2 data (profiles list) migrates under a profile named Me, keeping every rifle and the active one', async () => {
  const seed = { 'scopedope.v2': oldShape([rifle('Old A', { v0: '2650' }), rifle('Old B', { v0: '2900', wt: '190', bc: '0.5' })], 1) };
  const { ctx, page } = await open(seed);
  await go(page, '#rifle');
  eq(await opts(page, 'profSel'), ['Old A', 'Old B']); eq(await val(page, 'v0'), '2900'); eq(await val(page, 'profSel'), '1');
  await nudge(page);
  const s = await parsed(page);
  eq(s.people[0].name, 'Me'); eq(s.people[0].profiles.map(p => p.pname), ['Old A', 'Old B']);
  eq(s.people[0].profiles[0].v0, '2650', 'inactive rifle untouched'); eq(s.people[0].active, 1);
  eq(page.errors, []); await ctx.close();
});
test('current people format: profiles and rifles stay separate when switching', async () => {
  const people = [{ name: 'Alex', active: 0, profiles: [rifle('Alex 308', { v0: '2650' })] }, { name: 'Sam', active: 0, profiles: [rifle('Sam 65', { v0: '2960', bc: '0.315', model: 'G7' }), rifle('Sam 223', { v0: '3240' })] }];
  const { ctx, page } = await open({ 'scopedope.v2': JSON.stringify({ pi: 0, people, session: { dist: '400' } }) });
  await go(page, '#rifle');
  eq(await opts(page, 'person'), ['Alex', 'Sam']); eq(await opts(page, 'profSel'), ['Alex 308']);
  await page.selectOption('#person', '1'); await page.waitForTimeout(100);
  eq(await opts(page, 'profSel'), ['Sam 65', 'Sam 223']); eq(await val(page, 'v0'), '2960');
  await page.fill('#v0', '3000'); await page.waitForTimeout(80);
  await page.selectOption('#person', '0'); await page.waitForTimeout(100);
  eq(await val(page, 'v0'), '2650', 'first profile unchanged');
  const s = await parsed(page);
  eq(s.people[1].profiles[0].v0, '3000'); eq(s.people[0].profiles[0].v0, '2650'); eq(s.people[1].profiles[1].v0, '3240');
  eq(page.errors, []); await ctx.close();
});
test('session inputs survive a reload', async () => {
  const { ctx, page } = await open();
  await page.fill('#dist', '650'); await page.click('#togWind'); await page.fill('#wind', '12'); await page.click('.hr[data-h="9"]');
  await page.click('#togShot'); await page.selectOption('#angle', '-10'); await page.selectOption('#az', '90'); await page.waitForTimeout(100);
  await page.reload(); await page.waitForTimeout(150);
  eq([await val(page, 'dist'), await val(page, 'wind'), await val(page, 'angle'), await val(page, 'az')], ['650', '12', '-10', '90']);
  eq(await page.$eval('.hr[aria-pressed="true"]', e => e.dataset.h), '9');
  eq(page.errors, []); await ctx.close();
});
test('adding, renaming and deleting profiles and rifles persists across reload', async () => {
  const { ctx, page } = await open();
  await go(page, '#rifle');
  await page.click('#newPerson'); await page.fill('#personName', 'Dad'); await page.waitForTimeout(80);
  await page.fill('#pname', 'Dad rifle'); await page.click('#newProf'); await page.fill('#pname', 'Dad second'); await page.waitForTimeout(80);
  await page.reload(); await page.waitForTimeout(150); await go(page, '#rifle');
  eq(await opts(page, 'person'), ['Me', 'Dad']); eq(await opts(page, 'profSel'), ['Dad rifle', 'Dad second']);
  await page.click('#delProf'); await page.click('#delProf'); await page.waitForTimeout(80);
  eq(await opts(page, 'profSel'), ['Dad rifle']);
  await page.reload(); await page.waitForTimeout(150); await go(page, '#rifle');
  eq(await opts(page, 'profSel'), ['Dad rifle']); eq(await opts(page, 'person'), ['Me', 'Dad']);
  eq(page.errors, []); await ctx.close();
});
test('the last rifle and the last profile cannot be deleted', async () => {
  const { ctx, page } = await open();
  await go(page, '#rifle'); await nudge(page);
  const before = (await stored(page))['scopedope.v2'];
  await page.click('#delProf'); await page.click('#delProf'); await page.click('#delPerson'); await page.click('#delPerson'); await page.waitForTimeout(80);
  eq((await parsed(page)).people[0].profiles.length, 1); eq((await parsed(page)).people.length, 1);
  eq(page.errors, []); await ctx.close();
});
test('a stored out-of-range value is not silently rewritten', async () => {
  const { ctx, page } = await open({ 'scopedope.v2': oldShape([rifle('Odd', { v0: '99999' })], 0) });
  await nudge(page);
  eq((await parsed(page)).people[0].profiles[0].v0, '99999');
  ok(await page.$eval('#v0', e => e.classList.contains('bad')), 'field is flagged');
  eq(page.errors, []); await ctx.close();
});
test('[known gap] damaged saved data: app starts with defaults and overwrites the damaged text at startup, keeping no copy', async () => {
  const raw = '{"active":0,"profiles":[{"pname":"Precious","v0":"2900"';
  const { ctx, page } = await open({ 'scopedope.v2': raw });
  eq(page.errors, []);
  eq(await val(page, 'v0'), '2650', 'defaults are shown');
  const all = await stored(page);
  ok(!Object.values(all).some(v => v.includes('Precious')), 'GAP: the damaged text is gone and not preserved anywhere');
  await ctx.close();
});
test('[known gap] saving fails silently when storage refuses writes; the app keeps working', async () => {
  const { ctx, page } = await open(null, () => { Storage.prototype.setItem = function () { throw new Error('quota'); }; });
  await page.fill('#dist', '500'); await page.waitForTimeout(100);
  ok((await page.$eval('#elevClicks', e => e.textContent)).length > 0, 'still computes');
  ok(!(await page.$eval('body', b => /could not save|not saved|storage/i.test(b.innerText))), 'GAP: no message tells the user saving failed');
  eq(page.errors, []); await ctx.close();
});
test('[known gap] reading storage fails: the app starts with defaults', async () => {
  const { ctx, page } = await open(null, () => { Storage.prototype.getItem = function () { throw new Error('blocked'); }; });
  eq(await val(page, 'v0'), '2650'); eq(page.errors, []); await ctx.close();
});

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  base = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch();
  let fail = 0;
  for (const t of results) {
    try { await t.fn(); console.log('PASS  ' + t.name); }
    catch (e) { fail++; console.log('FAIL  ' + t.name + '\n      ' + e.message); }
  }
  console.log('\n' + (results.length - fail) + ' passed, ' + fail + ' failed, ' + results.length + ' total');
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
})();

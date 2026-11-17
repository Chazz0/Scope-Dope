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
// ---- Stage 2: data protection (these replace the Stage 1 "[known gap]" checks for saved data) ----
const keysWith = (all, prefix) => Object.keys(all).filter(k => k.startsWith(prefix));
const msgOf = (page) => page.$eval('#storeMsg', e => (e.hidden ? '' : e.textContent));
const CUR_SCHEMA = 1;
test('saved data carries a schema number', async () => {
  const { ctx, page } = await open();
  eq((await parsed(page)).schema, CUR_SCHEMA); eq(page.errors, []); await ctx.close();
});
test('old-format data is copied unchanged to a backup key before it is migrated', async () => {
  const seed = { 'scopedope.v2': oldShape([rifle('Old A'), rifle('Old B', { v0: '2900' })], 1) };
  const { ctx, page } = await open(seed);
  const all = await stored(page);
  const b = keysWith(all, 'scopedope.backup.');
  eq(b.length, 1, 'one backup key'); eq(all[b[0]], seed['scopedope.v2'], 'backup is the exact original text');
  eq((await parsed(page)).schema, CUR_SCHEMA); eq((await parsed(page)).people[0].profiles.map(p => p.pname), ['Old A', 'Old B']);
  eq(await msgOf(page), '', 'no warning for a clean migration'); eq(page.errors, []); await ctx.close();
});
test('current-format data is not backed up again on every start', async () => {
  const people = [{ name: 'Me', active: 0, profiles: [rifle('Cur')] }];
  const { ctx, page } = await open({ 'scopedope.v2': JSON.stringify({ schema: CUR_SCHEMA, pi: 0, people, session: { dist: '400' } }) });
  eq(keysWith(await stored(page), 'scopedope.backup.').length, 0); eq(page.errors, []); await ctx.close();
});
test('data from a newer schema is backed up and its rifles still load', async () => {
  const people = [{ name: 'Me', active: 0, profiles: [rifle('Future', { v0: '2800' })], extra: 'x' }];
  const raw = JSON.stringify({ schema: 99, pi: 0, people, session: { dist: '400' }, newThing: 1 });
  const { ctx, page } = await open({ 'scopedope.v2': raw });
  const all = await stored(page); const b = keysWith(all, 'scopedope.backup.');
  eq(b.length, 1); eq(all[b[0]], raw); eq(await val(page, 'v0'), '2800');
  ok(/newer/i.test(await msgOf(page)), 'tells the user the data came from a newer version'); eq(page.errors, []); await ctx.close();
});
test('old v1 data is kept in storage after migration', async () => {
  const v1 = JSON.stringify({ v0: '3000', bc: '0.5', wt: '150', dist: '250', wind: '7' });
  const { ctx, page } = await open({ 'scopedope.v1': v1 });
  eq((await stored(page))['scopedope.v1'], v1); eq(await val(page, 'v0'), '3000'); eq(page.errors, []); await ctx.close();
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
test('damaged saved data is preserved unchanged, the user is told, and the app starts with defaults', async () => {
  const raw = '{"active":0,"profiles":[{"pname":"Precious","v0":"2900"';
  const { ctx, page } = await open({ 'scopedope.v2': raw });
  eq(page.errors, []); eq(await val(page, 'v0'), '2650', 'defaults are shown');
  const all = await stored(page); const d = keysWith(all, 'scopedope.damaged.');
  eq(d.length, 1); eq(all[d[0]], raw, 'damaged text kept exactly');
  ok(/could not be read/i.test(await msgOf(page)) && /copy/i.test(await msgOf(page)), 'message says what happened and that a copy was kept');
  await ctx.close();
});
test('valid JSON in an unrecognized shape is preserved as damaged, not discarded', async () => {
  const raw = JSON.stringify({ foo: 1, rifles: [{ name: 'Mystery' }] });
  const { ctx, page } = await open({ 'scopedope.v2': raw });
  const all = await stored(page); const d = keysWith(all, 'scopedope.damaged.');
  eq(d.length, 1); eq(all[d[0]], raw); eq(page.errors, []); await ctx.close();
});
test('the same damaged text is not copied again on the next start', async () => {
  const raw = '{"broken":';
  const { ctx, page } = await open({ 'scopedope.v2': raw });
  const n1 = keysWith(await stored(page), 'scopedope.damaged.').length;
  await page.evaluate((r) => localStorage.setItem('scopedope.v2', r), raw); // put the same damaged text back
  await page.reload(); await page.waitForTimeout(150);
  eq(keysWith(await stored(page), 'scopedope.damaged.').length, n1, 'no duplicate copy'); await ctx.close();
});
test('profiles dropped while loading are preserved in a backup copy', async () => {
  const people = [{ name: 'Good', active: 0, profiles: [rifle('Keep')] }, { name: 'Lost', active: 0, profiles: 'oops' }];
  const raw = JSON.stringify({ schema: CUR_SCHEMA, pi: 0, people, session: { dist: '400' } });
  const { ctx, page } = await open({ 'scopedope.v2': raw });
  const all = await stored(page); const b = keysWith(all, 'scopedope.backup.');
  eq(b.length, 1); eq(all[b[0]], raw); eq(await val(page, 'pname'), 'Keep'); eq(page.errors, []); await ctx.close();
});
test('saving fails: the user is told, the app keeps working', async () => {
  const { ctx, page } = await open(null, () => { Storage.prototype.setItem = function () { throw new Error('quota'); }; });
  await page.fill('#dist', '500'); await page.waitForTimeout(100);
  ok((await page.$eval('#elevClicks', e => e.textContent)).length > 0, 'still computes');
  ok(/not saved/i.test(await msgOf(page)), 'a visible message says changes are not saved');
  eq(page.errors, []); await ctx.close();
});
test('the save-failure message clears once saving works again', async () => {
  const { ctx, page } = await open(null, () => {
    window.__fail = true; const orig = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) { if (window.__fail) throw new Error('quota'); return orig.call(this, k, v); };
  });
  await page.fill('#dist', '500'); await page.waitForTimeout(100);
  ok(/not saved/i.test(await msgOf(page)));
  await page.evaluate(() => { window.__fail = false; }); await nudge(page);
  eq(await msgOf(page), ''); eq((await parsed(page)).schema, CUR_SCHEMA); eq(page.errors, []); await ctx.close();
});
test('reading storage fails: defaults are shown, the user is told, and nothing is written over saved data', async () => {
  const { ctx, page } = await open(null, () => {
    window.__sets = []; const orig = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) { window.__sets.push(k); return orig.call(this, k, v); };
    Storage.prototype.getItem = function () { throw new Error('blocked'); };
  });
  eq(await val(page, 'v0'), '2650'); await page.fill('#dist', '500'); await page.waitForTimeout(100);
  eq(await page.evaluate(() => window.__sets), [], 'no writes at all');
  ok(/could not be read|not saved/i.test(await msgOf(page))); eq(page.errors, []); await ctx.close();
});
test('if the safety copy cannot be written, the original saved data is left exactly as it was', async () => {
  const seed = { 'scopedope.v2': oldShape([rifle('Old A'), rifle('Old B')], 0) };
  const { ctx, page } = await open(seed, () => {
    const orig = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) { if (String(k).startsWith('scopedope.backup.')) throw new Error('quota'); return orig.call(this, k, v); };
  });
  await page.fill('#dist', '500'); await page.waitForTimeout(100); await nudge(page);
  eq((await stored(page))['scopedope.v2'], seed['scopedope.v2'], 'original text untouched');
  ok(/safety copy|not saved/i.test(await msgOf(page))); eq(page.errors, []); await ctx.close();
});

// ---- Stage 2: export and import of rifles (import only ever adds; it never replaces) ----
const twoPeople = () => [{ name: 'Alex', active: 0, profiles: [rifle('Alex 308')] }, { name: 'Sam', active: 1, profiles: [rifle('Sam 65', { v0: '2960', bc: '0.315', model: 'G7' }), rifle('Sam 223', { v0: '3240' })] }];
const seedTwo = () => ({ 'scopedope.v2': JSON.stringify({ schema: CUR_SCHEMA, pi: 0, people: twoPeople(), session: { dist: '400' } }) });
const doExport = async (page) => { await go(page, '#rifle'); await page.click('#exportBtn'); await page.waitForTimeout(80); return page.$eval('#exportCode', e => e.value); };
const doImport = async (page, text) => { await go(page, '#rifle'); await page.fill('#importCode', text); await page.click('#importBtn'); await page.waitForTimeout(120); };
const backupMsg = (page) => page.$eval('#backupMsg', e => e.textContent);

test('export produces a backup code holding every profile and rifle', async () => {
  const { ctx, page } = await open(seedTwo());
  const code = JSON.parse(await doExport(page));
  eq(code.app, 'scopedope'); eq(code.schema, CUR_SCHEMA);
  eq(code.people.map(p => p.name), ['Alex', 'Sam']); eq(code.people[1].profiles.map(p => p.pname), ['Sam 65', 'Sam 223']);
  eq(code.people[1].profiles[0].model, 'G7'); eq(page.errors, []); await ctx.close();
});
test('a backup code from one device restores into another without touching what is there', async () => {
  const a = await open(seedTwo()); const code = await doExport(a.page); await a.ctx.close();
  const { ctx, page } = await open({ 'scopedope.v2': oldShape([rifle('Mine', { v0: '2711' })], 0) });
  await doImport(page, code);
  await go(page, '#rifle');
  eq(await opts(page, 'person'), ['Me', 'Alex', 'Sam']);
  const s = await parsed(page);
  eq(s.people[0].profiles.map(p => p.pname), ['Mine']); eq(s.people[0].profiles[0].v0, '2711', 'existing rifle untouched');
  eq(s.people[2].profiles.map(p => p.pname), ['Sam 65', 'Sam 223']); eq(s.people[2].profiles[0].bc, '0.315');
  ok(/imported/i.test(await backupMsg(page)), 'message confirms'); eq(page.errors, []); await ctx.close();
});
test('importing a profile with a name that already exists adds it under a new name', async () => {
  const { ctx, page } = await open(seedTwo());
  const code = await doExport(page); await doImport(page, code);
  const names = (await parsed(page)).people.map(p => p.name);
  eq(names.length, 4); eq(new Set(names).size, 4, 'all names distinct'); eq(names.slice(0, 2), ['Alex', 'Sam']);
  ok(names[2].startsWith('Alex') && names[3].startsWith('Sam')); eq(page.errors, []); await ctx.close();
});
test('importing first saves a copy of the current data', async () => {
  const seed = seedTwo(); const { ctx, page } = await open(seed);
  await nudge(page); const before = (await stored(page))['scopedope.v2'];
  await doImport(page, await doExport(page));
  const all = await stored(page);
  ok(keysWith(all, 'scopedope.backup.').some(k => all[k] === before), 'a backup holds the pre-import text'); await ctx.close();
});
test('bad backup codes are rejected with a message and change nothing', async () => {
  const { ctx, page } = await open(seedTwo()); await nudge(page);
  const before = (await stored(page))['scopedope.v2'];
  const bad = ['hello', '{"a":1}', '', JSON.stringify({ app: 'scopedope', schema: 1, people: 'x' }), JSON.stringify({ app: 'scopedope', schema: 1, people: [{ name: 'N', profiles: [] }] }),
    JSON.stringify({ app: 'other', schema: 1, people: [{ name: 'N', profiles: [rifle('R')] }] })];
  for (const b of bad) {
    await doImport(page, b);
    ok(/not a valid|could not|nothing was imported/i.test(await backupMsg(page)), 'message for ' + b.slice(0, 20));
    eq((await stored(page))['scopedope.v2'], before, 'storage unchanged for ' + b.slice(0, 20));
  }
  eq(page.errors, []); await ctx.close();
});
test('imported text is shown as plain text and unknown fields are dropped', async () => {
  const evil = rifle('<img src=x onerror="window.__x=1">', { sneaky: 'yes', v0: 2800 });
  const code = JSON.stringify({ app: 'scopedope', schema: CUR_SCHEMA, people: [{ name: '<b>Eve</b>', active: 0, profiles: [evil] }] });
  const { ctx, page } = await open();
  await doImport(page, code); await go(page, '#rifle');
  ok((await opts(page, 'person')).includes('<b>Eve</b>'), 'name kept literally');
  eq(await page.evaluate(() => window.__x), undefined, 'nothing executed');
  const p = (await parsed(page)).people[1].profiles[0];
  eq(p.sneaky, undefined); eq(p.v0, '2800', 'numbers become text like every other saved value'); eq(page.errors, []); await ctx.close();
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

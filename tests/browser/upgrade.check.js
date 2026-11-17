'use strict';
// Upgrade check: data saved by the LIVE app (the copy of index.html on main) must load in the new code with every
// person, rifle, setting and session value intact. The live app builds the data through its own screens, the new
// code then loads it, and every stored field is compared. Needs git (to read main) and Playwright with Chromium.
// Run:  node tests/browser/upgrade.check.js          (set OLD_REF to compare against another git ref; default main)
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os'), cp = require('child_process');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..', '..');
const REF = process.env.OLD_REF || 'main';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sd-old-'));
fs.writeFileSync(path.join(tmp, 'index.html'), cp.execSync('git show ' + REF + ':index.html', { cwd: ROOT, maxBuffer: 1 << 26 }));
const serve = (root) => http.createServer((req, res) => { const f = path.join(root, req.url.split('?')[0] === '/' ? 'index.html' : req.url.split('?')[0]);
  if (!f.startsWith(root) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); res.end(fs.readFileSync(f)); });
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((m || 'mismatch') + '\n   expected ' + JSON.stringify(b).slice(0, 400) + '\n   got      ' + JSON.stringify(a).slice(0, 400)); };
const ok = (c, m) => { if (!c) throw new Error(m || 'assertion failed'); };
const tests = []; const test = (n, f) => tests.push({ n, f });
let browser, oldBase, newBase;
const ctxOpts = { viewport: { width: 400, height: 860 }, serviceWorkers: 'block' };
const set = async (page, id, v) => { await page.evaluate(([i, x]) => { const e = document.getElementById(i); e.value = x; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }, [id, v]); await page.waitForTimeout(60); };
const dump = (page) => page.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return o; });

// Build realistic saved data by using the old app the way a person would.
async function buildOldData() {
  const ctx = await browser.newContext(ctxOpts), page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(oldBase + '/index.html'); await page.waitForTimeout(200);
  await page.evaluate(() => { location.hash = '#rifle'; }); await page.waitForTimeout(100);
  const clicks = await page.$$eval('#click option', o => o.map(x => x.value));
  const first = { pname: 'Deer rifle', v0: '2750', wt: '150', bc: '0.5', zero: '200', h: '1.7', twist: '9', temp: '35', humidity: '30', press: '29.5', alt: '4500', lat: '45.5', vsens: '1.5', vref: '70' };
  for (const k of Object.keys(first)) await set(page, k, first[k]);
  await page.selectOption('#model', 'G7'); await page.selectOption('#click', clicks[clicks.length - 1]); await page.selectOption('#tdir', 'L');
  await page.click('#newProf'); await page.waitForTimeout(80);
  for (const [k, v] of Object.entries({ pname: 'Coyote 223', v0: '3240', wt: '55', zero: '100', temp: '20' })) await set(page, k, v);
  await page.click('#newPerson'); await page.waitForTimeout(80); await set(page, 'personName', 'Dad');
  for (const [k, v] of Object.entries({ pname: 'Dad 30-06', v0: '2910', wt: '165', bc: '0.45', alt: '800', lat: '33' })) await set(page, k, v);
  await page.click('#newProf'); await page.waitForTimeout(80); await set(page, 'pname', 'Dad backup'); 
  await page.evaluate(() => { location.hash = '#hud'; }); await page.waitForTimeout(100);
  for (const [k, v] of Object.entries({ dist: '650', wind: '17' })) await set(page, k, v);
  await page.click('#togWind'); await page.click('#togShot');
  await page.click('.hr[data-h="9"]'); await page.selectOption('#angle', '-10'); await page.selectOption('#az', '90');
  await page.evaluate(() => { location.hash = '#chart'; }); await page.waitForTimeout(100);
  for (const [k, v] of Object.entries({ cStart: '50', cEnd: '1200', cStep: '25' })) await set(page, k, v);
  await page.waitForTimeout(200);
  const d = await dump(page); await ctx.close();
  if (errs.length) throw new Error('old app errors: ' + errs.join('; '));
  return d;
}
const newPageWith = async (data) => {
  const ctx = await browser.newContext(ctxOpts), page = await ctx.newPage(); page.errors = []; page.on('pageerror', e => page.errors.push(e.message));
  await page.addInitScript((sd) => { if (!sessionStorage.getItem('__seeded')) { for (const k of Object.keys(sd)) localStorage.setItem(k, sd[k]); sessionStorage.setItem('__seeded', '1'); } }, data);
  await page.goto(newBase + '/index.html'); await page.waitForTimeout(250); return { ctx, page };
};

let OLD;
test('the old app built realistic saved data: 2 profiles, 3 rifles, non-default settings', async () => {
  OLD = await buildOldData(); const o = JSON.parse(OLD['scopedope.v2']);
  eq(o.people.map(p => p.name), ['Me', 'Dad']); eq(o.people.map(p => p.profiles.length), [2, 2]);
  eq(o.people[0].profiles.map(r => r.pname), ['Deer rifle', 'Coyote 223']); eq(o.session.dist, '650'); eq(o.session.cStep, '25');
});
test('loading it in the new code keeps every person, rifle field and session value exactly as saved', async () => {
  const { ctx, page } = await newPageWith(OLD);
  await page.evaluate(() => { location.hash = '#rifle'; }); await page.waitForTimeout(150);
  const before = JSON.parse(OLD['scopedope.v2']), after = JSON.parse((await dump(page))['scopedope.v2']);
  eq(after.people, before.people, 'people and every rifle field'); eq(after.session, before.session, 'session values'); eq(after.pi, before.pi, 'selected profile');
  eq(after.schema, 1, 'only addition is the schema number');
  eq(Object.keys(after).sort(), Object.keys(before).concat(['schema']).sort(), 'no other top-level change');
  eq(page.errors, []); await ctx.close();
});
test('the original saved text is kept verbatim as a backup, and the screens show the saved values', async () => {
  const { ctx, page } = await newPageWith(OLD); const all = await dump(page);
  const b = Object.keys(all).filter(k => k.startsWith('scopedope.backup.')); eq(b.length, 1); eq(all[b[0]], OLD['scopedope.v2'], 'backup is byte-identical to the old data');
  eq(await page.$eval('#dist', e => e.value), '650'); eq(await page.$eval('#wind', e => e.value), '17');
  eq(await page.$$eval('#person option', o => o.map(x => x.textContent)), ['Me', 'Dad']); { const o = JSON.parse(OLD['scopedope.v2']), cur = o.people[o.pi]; eq(await page.$eval('#pname', e => e.value), cur.profiles[cur.active].pname, 'shows the rifle that was selected'); }
  await ctx.close();
});
test('using every profile and rifle in the new code (viewing, switching, reloading) changes no saved field', async () => {
  const { ctx, page } = await newPageWith(OLD);
  await page.evaluate(() => { location.hash = '#rifle'; }); await page.waitForTimeout(100);
  for (const person of ['1', '0']) { await page.selectOption('#person', person); await page.waitForTimeout(80);
    const n = await page.$$eval('#profSel option', o => o.length);
    for (let i = 0; i < n; i++) { await page.selectOption('#profSel', String(i)); await page.waitForTimeout(80); } }
  await page.reload(); await page.waitForTimeout(250);
  const before = JSON.parse(OLD['scopedope.v2']), after = JSON.parse((await dump(page))['scopedope.v2']);
  eq(after.people.map(p => p.profiles), before.people.map(p => p.profiles), 'every rifle, all fields'); eq(after.people.map(p => p.name), before.people.map(p => p.name));
  eq(page.errors, []); await ctx.close();
});
test('rolling back is safe: the OLD app reads data the new code saved, with every rifle intact', async () => {
  const { ctx, page } = await newPageWith(OLD); const saved = await dump(page); await ctx.close();
  const c2 = await browser.newContext(ctxOpts), p2 = await c2.newPage(); const errs = []; p2.on('pageerror', e => errs.push(e.message));
  await p2.addInitScript((sd) => { if (!sessionStorage.getItem('__s')) { localStorage.setItem('scopedope.v2', sd['scopedope.v2']); sessionStorage.setItem('__s', '1'); } }, saved);
  await p2.goto(oldBase + '/index.html'); await p2.waitForTimeout(250);
  const names = await p2.$$eval('#person option', o => o.map(x => x.textContent)); eq(names, ['Me', 'Dad']);
  await p2.evaluate(() => { location.hash = '#rifle'; }); await p2.waitForTimeout(80);
  { const o = JSON.parse(OLD['scopedope.v2']); eq(await p2.$$eval('#profSel option', x => x.map(y => y.textContent)), o.people[o.pi].profiles.map(r => r.pname)); }
  eq(errs, []); await c2.close();
});

(async () => {
  const so = serve(tmp), sn = serve(ROOT);
  await Promise.all([new Promise(r => so.listen(0, '127.0.0.1', r)), new Promise(r => sn.listen(0, '127.0.0.1', r))]);
  oldBase = 'http://127.0.0.1:' + so.address().port; newBase = 'http://127.0.0.1:' + sn.address().port;
  browser = await chromium.launch(); let fail = 0;
  for (const t of tests) { try { await t.f(); console.log('PASS  ' + t.n); } catch (e) { fail++; console.log('FAIL  ' + t.n + '\n      ' + e.message); } }
  console.log('\n' + (tests.length - fail) + ' passed, ' + fail + ' failed, ' + tests.length + ' total  (old = git ' + REF + ')');
  await browser.close(); so.close(); sn.close(); fs.rmSync(tmp, { recursive: true, force: true }); process.exit(fail ? 1 : 0);
})();

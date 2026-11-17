'use strict';
// Stage 17 guards (Node side): the Reloading tab must not touch the solver, the assessment block, the scope module, the reference data,
// the tolerances, the golden baseline, the model version or the rifle storage key.
const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), path = require('path'), crypto = require('crypto'), { execFileSync } = require('child_process');
const root = path.join(__dirname, '..');
const PRE = '3f8b9bc';   // main as merged at the end of Stage 16 (the last released-to-review state)
const show = (rev, f) => execFileSync('git', ['show', rev + ':' + f], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26 });
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const between = (t, a, b) => t.slice(t.indexOf(a), t.indexOf(b) + b.length);
const sha = (t) => crypto.createHash('sha256').update(t).digest('hex');
const now = read('index.html'), pre = show(PRE, 'index.html');
const reload = between(now, '/*RELOAD_START*/', '/*RELOAD_END*/');

test('solver, assessment block and embedded scope module are byte-identical to the Stage 16 merge', () => {
  for (const [a, b] of [['/*SOLVER_START*/', '/*SOLVER_END*/'], ['/*ASSESS_START*/', '/*ASSESS_END*/'], ['/*SCOPE_START*/', '/*SCOPE_END*/']]) {
    assert.ok(now.includes(a) && now.includes(b), a); assert.strictEqual(between(now, a, b), between(pre, a, b), a);
  }
  assert.strictEqual(sha(between(now, '/*SOLVER_START*/', '/*SOLVER_END*/')), sha(between(pre, '/*SOLVER_START*/', '/*SOLVER_END*/')));
});
test('reference data, tolerances, golden baseline, scope library and the model version are unchanged', () => {
  for (const f of ['tests/validation/references.json', 'tests/baseline.json', 'lib/scope-adjust.js', 'sw.js', 'manifest.webmanifest']) {
    if (!fs.existsSync(path.join(root, f))) continue;
    assert.strictEqual(read(f), show(PRE, f), f);
  }
  assert.strictEqual(now.match(/MODEL_VERSION\s*=\s*'([^']+)'/)[1], pre.match(/MODEL_VERSION\s*=\s*'([^']+)'/)[1]);
  assert.strictEqual(now.match(/MODEL_VERSION\s*=\s*'([^']+)'/)[1], '1.0.0');
});
test('removing only the Reloading additions gives back the Stage 16 file exactly (nothing else was edited)', () => {
  let t = now;
  const cut = (from, to) => { const i = t.indexOf(from), j = t.indexOf(to, i); assert.ok(i >= 0 && j > i, from); t = t.slice(0, i) + t.slice(j); };
  cut('/* Reloading tab: a separate record-keeping log.', '/* Bottom tabs */');
  cut('    <a class="tab" id="tabReload"', '  </div>\n</nav>');
  cut('    <section id="viewReload"', '  </main>');
  cut('<script>\n/*RELOAD_START*/', '<script>if("serviceWorker"');
  t = t.replace("location.hash === '#reloading' ? 'reloading' : ", '').replace("    $('viewReload').hidden = v !== 'reloading';\n", '').replace(",['reloading','tabReload']]", ']');
  t = t.replace("\n\n<script>if(\"serviceWorker\"", "\n\n<script>if(\"serviceWorker\"");
  assert.strictEqual(t.replace(/\n{3,}/g, '\n\n'), pre.replace(/\n{3,}/g, '\n\n'));
});
test('the Reloading code uses its own storage key and never touches the rifle key, the solver, the scope module or the rifle fields (except the confirmed velocity box)', () => {
  assert.ok(/scopedope\.reload\.v1/.test(reload)); assert.ok(!/scopedope\.v[12]/.test(reload), 'must not read or write the rifle storage');
  for (const sym of ['dopeAt', 'getModel', 'solve', 'ScopeAdjust', 'MODEL_VERSION', 'saveAll', 'syncState', 'serialize', 'profileDefaults', 'PKEYS']) assert.ok(!new RegExp('\\b' + sym + '\\b').test(reload), sym);
  const touched = [...reload.matchAll(/\$\('([A-Za-z0-9_]+)'\)/g)].map(m => m[1]).filter(id => !/^rl/.test(id));
  assert.deepStrictEqual([...new Set(touched)].sort(), ['pname', 'v0'], 'only the rifle name (read) and the velocity box (confirmed write)');
  const writes = reload.match(/v0\.value\s*=/g) || []; assert.strictEqual(writes.length, 1, 'one write, inside the confirm handler');
  assert.ok(/rlMvYes'\)\.onclick = function \(\) \{[\s\S]{0,300}v0\.value = String\(newV\)/.test(reload), 'the write is only inside the Yes handler');
});
test('shot velocity limits and the muzzle-velocity range are stated and enforced', () => {
  assert.ok(/VMIN = 100, VMAX = 5000/.test(reload)); assert.ok(/newV < 500 \|\| newV > 4500/.test(reload));
  assert.ok(/id="v0"[^>]*min="500" max="4500"/.test(now), 'the Rifle tab range is the one we mirror');
});
test('the tab states it is record keeping and makes no accuracy, safety or load recommendation claim', () => {
  const sec = between(now, '<section id="viewReload"', '</section>\n  </main>');
  assert.ok(/Record keeping only/.test(sec) && /Nothing here is load data, a safety check or a recommendation/.test(sec) && /nothing here changes a calculation/.test(sec));
  assert.ok(!/\b(accurate|accuracy|verified|guaranteed|proven)\b/i.test(sec.replace(/<[^>]+>/g, ' ') + reload), 'no accuracy claims');
  assert.ok(!/charge[^'"]{0,40}\d+(\.\d+)?\s*gr/i.test(reload.replace(/'charge ' \+ r\.charge \+ ' gr'/g, '')), 'no load numbers shipped in the code');
});
test('four tabs, in order, with the new one after Rifle', () => {
  const nav = between(now, '<nav class="tabs"', '</nav>');
  assert.deepStrictEqual([...nav.matchAll(/id="(tab[A-Za-z]+)"/g)].map(m => m[1]), ['tabHud', 'tabChart', 'tabRifle', 'tabReload']);
  assert.ok(/>\s*Reloading\s*</.test(nav));
});

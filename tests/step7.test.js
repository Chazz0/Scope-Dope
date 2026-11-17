'use strict';
// Step 7 (UX and data integrity) Node tests. Written before the app change.
const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { loadAssess } = require('./helpers/load-assess');
const { baseInputs } = require('./helpers/load-solver');
const root = path.join(__dirname, '..');
const { withoutRound3 } = require('./helpers/refs-pin');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const { assessResult } = loadAssess();
const base = (o) => ({ ...baseInputs(), v0nom: 2650, windMph: 0, headMph: 0, ...(o || {}) });
const ids = (r) => r.findings.map(f => f.level + ':' + f.id);

test('the panel says the velocity is a factory starting value only when it is not the user\'s own', () => {
  assert.ok(ids(assessResult(base({ v0src: 'factory' }), { rangeYd: 400 })).includes('notice:v0factory'));
  assert.ok(!ids(assessResult(base({ v0src: 'user' }), { rangeYd: 400 })).includes('notice:v0factory'));
  assert.ok(!ids(assessResult(base({ v0src: '' }), { rangeYd: 400 })).includes('notice:v0factory'), 'legacy profiles are not labelled');
  assert.ok(!ids(assessResult(base(), { rangeYd: 400 })).includes('notice:v0factory'));
  const t = assessResult(base({ v0src: 'factory' }), { rangeYd: 400 }).findings.find(f => f.id === 'v0factory').text;
  assert.match(t, /not a velocity you measured/i); assert.match(t, /starting value/i);
});

test('the chart reuses the same assessment with its own range wording and the same limits', () => {
  const r = assessResult(base(), { rangeYd: 1000, rangeLabel: 'The range card reaches' });
  const f = r.findings.find(x => x.id === 'range');
  assert.match(f.text, /The range card reaches 1000 yd/); assert.match(f.text, /500 yd/);
  assert.ok(!assessResult(base(), { rangeYd: 500, rangeLabel: 'The range card reaches' }).findings.some(x => x.id === 'range'));
});

test('the preset handler never assigns a factory velocity unconditionally', () => {
  assert.ok(!/\$\('v0'\)\.value = p\.v0; \$\('bc'\)/.test(html), 'old unconditional overwrite is still present');
  assert.ok(/v0src/.test(html));
  // Factory velocities are only ever read from PRESETS for display and for starting values; the solver input comes from the field.
  assert.ok(html.includes("const v0nom = num('v0');"));
  assert.ok(!/PRESETS[^;]*\.v0[^;]*(buildModel|dopeAt)/.test(html));
});

test('the calculation block is byte-identical to the Stage 5 version', () => {
  const grab = (h) => h.slice(h.indexOf('/*SOLVER_START*/'), h.indexOf('/*SOLVER_END*/'));
  for (const rev of ['9f37df7', '9ab52a6']) {
    const then = execFileSync('git', ['show', rev + ':index.html'], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26 });
    assert.strictEqual(grab(html), grab(then), rev);
  }
  assert.ok(grab(html).length > 1000);
  assert.match(html, /const MODEL_VERSION = '1\.0\.0';/);
  for (const f of ['tests/golden/baseline.json', 'tests/helpers/load-solver.js', 'tests/solver.test.js']) {
    assert.strictEqual(execFileSync('git', ['diff', '9ab52a6', '--stat', '--', f], { cwd: root, encoding: 'utf8' }).trim(), '', f);
  }
  const refsNow = withoutRound3(fs.readFileSync(path.join(root, 'tests', 'validation', 'references.json'), 'utf8'));
  const refsThen = JSON.parse(execFileSync('git', ['show', '9ab52a6:tests/validation/references.json'], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26 }));
  assert.deepStrictEqual(refsNow, refsThen);
});

test('Step 7 messages never call a result accurate, verified, guaranteed or safe', () => {
  const m = html.slice(html.indexOf('id="cAssess"') - 50, html.indexOf('id="cAssess"') + 1500) || '';
  for (const t of [m, ...[assessResult(base({ v0src: 'factory' }), { rangeYd: 900 })].flatMap(r => [r.badge, ...r.findings.map(f => f.text)])]) {
    assert.doesNotMatch(t, /\b(guarantee|guaranteed|safe|proven)\b/i);
    for (const x of t.matchAll(/verified|accurate\b/gi)) assert.ok(/(not|never|no|un|neither|nor|cannot|without|does not)[^.]*$/i.test(t.slice(0, x.index)), 'unnegated: ' + t.slice(Math.max(0, x.index - 40), x.index + 20));
  }
});

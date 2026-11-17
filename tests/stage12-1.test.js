'use strict';
// Stage 12.1 (bullet-weight validation) guards: interface validation only. No solver, table, data, tolerance, baseline or version change.
const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const root = path.join(__dirname, '..');
const { withoutRound3 } = require('./helpers/refs-pin');
const STAGE12 = 'f6cbe5ca009de5058039400602c6ed3e86a75b67';
const show = (rev, f) => execFileSync('git', ['show', rev + ':' + f], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26 });
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const solverBlock = (t) => t.slice(t.indexOf('/*SOLVER_START*/'), t.indexOf('/*SOLVER_END*/') + '/*SOLVER_END*/'.length);
test('the solver block is byte-identical to the approved Stage 12 commit and the model version is 1.0.0', () => {
  const now = solverBlock(read('index.html')); assert.ok(now.length > 5000);
  assert.strictEqual(now, solverBlock(show(STAGE12, 'index.html')));
  assert.match(now, /const MODEL_VERSION = '1\.0\.0';/);
});
test('drag tables, reference data, tolerances, golden baseline, helpers, Stage 10 to 12 results and earlier sources are unchanged', () => {
  for (const f of ['tests/validation/references.json', 'tests/validation/source-reads.json', 'tests/validation/measured-doppler.json', 'tests/golden/baseline.json', 'tests/golden/cases.js',
    'tests/validation/third-party-tables/g1.csv', 'tests/validation/third-party-tables/g7.csv', 'tests/helpers/load-solver.js', 'tests/validation/stage11/results.json', 'tests/validation/stage11/datasets.json',
    'docs/MODEL_SOURCES.md', 'docs/STAGE10_SCIENTIFIC_VERIFICATION.md', 'docs/STAGE11_MEASURED_TRAJECTORY_VALIDATION.md'])
    if (f === 'tests/validation/references.json') assert.deepStrictEqual(withoutRound3(read(f)), withoutRound3(show(STAGE12, f)), f + ' (earlier data) must not change');
    else assert.strictEqual(read(f), show(STAGE12, f), f);
});
test('the documented weight limits are 15 to 800 grains in the code, the field and the documentation', () => {
  const h = read('index.html');
  assert.match(h, /wt:\[15,800,168\]/); assert.match(h, /id="wt"[^>]*min="15" max="800"/);
  const d = read('docs/STAGE12_1_WEIGHT_VALIDATION.md'); assert.match(d, /15 grains/); assert.match(d, /800 grains/); assert.match(d, /NOT DEMONSTRATED/);
});
test('every accuracy disclosure added or kept through Stage 12 is still in the interface', () => {
  const h = read('index.html').replace(/\s+/g, ' ');
  for (const re of [/Not independently verified/, /has not been shown to be physically accurate/, /not proof of real-world accuracy/, /unresolved/, /assumed bullet length/, /fitting can absorb errors/, /Station pressure \(not sea-level pressure\)/])
    assert.match(h, re, String(re));
});
test('the weight must be read strictly: no loose parse of the weight text remains in the validation path', () => {
  const h = read('index.html'); assert.match(h, /function weightOk\(/); assert.match(h, /id="wtErr"/);
});

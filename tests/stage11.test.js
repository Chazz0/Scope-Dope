'use strict';
// Stage 11 (measured-trajectory validation) guard tests. Stage 11 compares the UNCHANGED solver with measured data.
// It must not change the solver, index.html, drag tables, reference data, tolerances, golden baseline or model version,
// and its report must state limits honestly, never call manufacturer/calculated tables measured, and make no accuracy claim.
const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const root = path.join(__dirname, '..');
const STAGE10 = '6dbcc740b2619f319173a0166c0e4ee2a3e64804';
const show = (rev, f) => execFileSync('git', ['show', rev + ':' + f], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26 });
const solverBlock = (t) => t.slice(t.indexOf('/*SOLVER_START*/'), t.indexOf('/*SOLVER_END*/') + '/*SOLVER_END*/'.length);
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

test('the solver block is byte-identical to the approved Stage 10 commit', () => {
  const now = solverBlock(read('index.html')), then = solverBlock(show(STAGE10, 'index.html'));
  assert.ok(now.length > 5000);
  assert.strictEqual(now, then);
});
test('model version is still 1.0.0 and index.html is unchanged', () => {
  assert.match(solverBlock(read('index.html')), /const MODEL_VERSION = '1\.0\.0';/);
  assert.strictEqual(read('index.html'), show(STAGE10, 'index.html'));
});
test('reference data, tolerances, measured data and golden baseline are unchanged from Stage 10', () => {
  for (const f of ['tests/validation/references.json', 'tests/validation/source-reads.json', 'tests/validation/measured-doppler.json',
    'tests/golden/baseline.json', 'tests/golden/cases.js', 'tests/validation/third-party-tables/g1.csv', 'tests/validation/third-party-tables/g7.csv',
    'tests/helpers/load-solver.js', 'docs/MODEL_SOURCES.md'])
    assert.strictEqual(read(f), show(STAGE10, f), f + ' must not change in Stage 11');
});

const report = () => read('docs/STAGE11_MEASURED_TRAJECTORY_VALIDATION.md');
test('the report has the required sections', () => {
  const t = report();
  for (const h of [/sources/i, /quality assessment/i, /reproduc/i, /measured.{0,12}(vs|versus).{0,12}predicted/i, /uncertainty/i, /limitations/i, /unresolved questions/i, /conclusion/i, /discrepanc/i, /excluded/i])
    assert.match(t, h);
  assert.match(t, /NOT DEMONSTRATED/);
  assert.match(t, /1\.0\.0/);
});
test('every dataset in the data file appears in the report with a classification', () => {
  const d = JSON.parse(read('tests/validation/stage11/datasets.json'));
  const t = report();
  assert.ok(d.datasets.length >= 3);
  for (const ds of d.datasets) {
    assert.ok(t.includes(ds.id), 'report mentions ' + ds.id);
    assert.match(ds.kind, /^(measured-trajectory|measured-drag|calculated-table|unconfirmed-status|anecdotal)/);
    assert.ok(ds.url && /^https:\/\//.test(ds.url));
  }
});
test('the saved results file matches the model version and carries every dataset, including unusable ones', () => {
  const d = JSON.parse(read('tests/validation/stage11/datasets.json'));
  const r = JSON.parse(read('tests/validation/stage11/results.json'));
  assert.strictEqual(r.modelVersion, '1.0.0');
  for (const ds of d.datasets) assert.ok(r.datasets[ds.id], 'results for ' + ds.id);
});
test('the report does not call calculated or predicted tables measured, and makes no accuracy claim', () => {
  const t = report().replace(/\bUNVERIFIED\b|\bPARTIALLY VERIFIED\b|\bVERIFIED\b|\bunverified\b|\bverified\b/g, 'STATUS');
  for (const m of t.matchAll(/\b(accurate|accuracy|guaranteed|safe|proven|validated)\b/gi)) {
    const around = t.slice(Math.max(0, m.index - 140), m.index + 60);
    assert.ok(/\b(not|never|no|neither|nor|cannot|without|does not|until|if|whether|physical|limited|only|specific|which|what|has been|have been|has not|have not|claim)\b/i.test(around),
      'unqualified "' + m[0] + '" near: ' + around.replace(/\n/g, ' '));
  }
});
test('the comparison tool exists and is read-only (does not write outside tests/validation/stage11)', () => {
  const s = read('tests/tools/stage11-compare.js');
  assert.ok(/stage11/.test(s));
  for (const m of s.matchAll(/writeFileSync\(([^)]*)\)/g)) assert.ok(/stage11|dir|OUT/i.test(m[1]), 'write target: ' + m[1]);
});

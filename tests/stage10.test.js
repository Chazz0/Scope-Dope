'use strict';
// Stage 10 (scientific verification) guard tests. Stage 10 is an audit: it must not change the solver, the drag tables,
// the reference data, the tolerances, the golden baseline or the model version. These tests fail if it does, and they
// check that the report states a status for every required component and makes no accuracy claim.
const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const root = path.join(__dirname, '..');
const STAGE9_1 = '1732d7941fbdb054f555b186aa382a032d355967';
const show = (rev, f) => execFileSync('git', ['show', rev + ':' + f], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26 });
const solverBlock = (t) => t.slice(t.indexOf('/*SOLVER_START*/'), t.indexOf('/*SOLVER_END*/') + '/*SOLVER_END*/'.length);
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

test('the solver block is byte-identical to the approved Stage 9.1 commit', () => {
  const now = solverBlock(read('index.html')), then = solverBlock(show(STAGE9_1, 'index.html'));
  assert.ok(now.length > 5000, 'solver block found');
  assert.strictEqual(now, then);
});

test('model version is still 1.0.0', () => {
  assert.match(solverBlock(read('index.html')), /const MODEL_VERSION = '1\.0\.0';/);
});

test('reference data, tolerances, measured data and golden baseline are unchanged from Stage 9.1', () => {
  for (const f of ['tests/validation/references.json', 'tests/validation/source-reads.json', 'tests/validation/measured-doppler.json',
    'tests/golden/baseline.json', 'tests/golden/cases.js', 'tests/validation/third-party-tables/g1.csv', 'tests/validation/third-party-tables/g7.csv'])
    assert.strictEqual(read(f), show(STAGE9_1, f), f + ' must not change in Stage 10');
});

test('Stage 10 changed no part of index.html', () => {
  assert.strictEqual(read('index.html'), show(STAGE9_1, 'index.html'));
});

const report = () => read('docs/STAGE10_SCIENTIFIC_VERIFICATION.md');

test('the report exists and gives one of the four allowed statuses for every required component', () => {
  const t = report();
  const required = ['G1 drag table', 'G7 drag table', 'Interpolation', 'Altitude to pressure', 'Moist-air density', 'Vapor pressure',
    'Speed of sound', 'Station pressure', 'Miller stability formula', 'Assumed bullet length', 'Spin drift', 'Coriolis', 'Crosswind', 'Angled',
    'Independent implementation', 'Manufacturer reference data'];
  const rows = t.split('\n').filter(l => /^\|/.test(l));
  for (const name of required) {
    const row = rows.find(l => l.toLowerCase().includes(name.toLowerCase()));
    assert.ok(row, 'status row for: ' + name);
    assert.match(row, /\b(VERIFIED|PARTIALLY VERIFIED|UNVERIFIED|DISCREPANCY FOUND)\b/, 'status in row for: ' + name);
  }
  assert.match(t, /NOT DEMONSTRATED/);
});

test('the report records inaccessible sources and unresolved questions, and separates facts from conclusions', () => {
  const t = report();
  for (const h of [/inaccessible sources/i, /unresolved questions/i, /verified facts/i, /assumptions/i, /conclusions/i, /recommended corrections/i, /reproduc/i])
    assert.match(t, h);
});

test('the report never says the app or its results are accurate, verified, guaranteed, safe or proven', () => {
  const t = report().replace(/\bUNVERIFIED\b|\bPARTIALLY VERIFIED\b|\bVERIFIED\b|\bunverified\b|\bverified\b/g, 'STATUS');
  for (const m of t.matchAll(/\b(accurate|accuracy|guaranteed|safe|proven)\b/gi)) {
    const before = t.slice(Math.max(0, m.index - 140), m.index);
    assert.ok(/(not|never|no|neither|nor|cannot|without|does not|doesn't|until|if|whether|physical|real-world|any claim|claims?|ballistic|about|of)\b[^.]*$/i.test(before) || /physical accuracy|real-world|accuracy of|accuracy claim|accuracy is/i.test(t.slice(Math.max(0, m.index - 40), m.index + 40)),
      'unqualified use of "' + m[0] + '" near: ' + t.slice(Math.max(0, m.index - 80), m.index + 60).replace(/\n/g, ' '));
  }
});

test('the independent comparison tool and its saved results exist and the results file matches the model version', () => {
  assert.ok(fs.existsSync(path.join(root, 'tests/tools/stage10-independent.py')));
  assert.ok(fs.existsSync(path.join(root, 'tests/tools/stage10-app-outputs.js')));
  const out = JSON.parse(read('tests/validation/stage10/app-outputs.json'));
  assert.strictEqual(out.modelVersion, '1.0.0');
});

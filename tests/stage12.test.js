'use strict';
// Stage 12 (final release audit) guard tests. Stage 12 may change interface wording and documentation only. It must not change
// the solver, the drag tables, the reference data, the tolerances, the golden baseline or the model version, and it must not
// remove or soften a disclosure. These tests fail if it does.
const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const root = path.join(__dirname, '..');
const { withoutRound3 } = require('./helpers/refs-pin');
const STAGE11 = 'ba0594c252a49df1fe552a5f3f98529d38a70af8';
const show = (rev, f) => execFileSync('git', ['show', rev + ':' + f], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26 });
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const solverBlock = (t) => t.slice(t.indexOf('/*SOLVER_START*/'), t.indexOf('/*SOLVER_END*/') + '/*SOLVER_END*/'.length);

test('the solver block is byte-identical to the approved Stage 11 commit', () => {
  const now = solverBlock(read('index.html')), then = solverBlock(show(STAGE11, 'index.html'));
  assert.ok(now.length > 5000);
  assert.strictEqual(now, then);
});
test('model version is still 1.0.0', () => {
  assert.match(solverBlock(read('index.html')), /const MODEL_VERSION = '1\.0\.0';/);
});
test('drag tables, reference data, measured data, tolerances, golden baseline and test helpers are unchanged from Stage 11', () => {
  for (const f of ['tests/validation/references.json', 'tests/validation/source-reads.json', 'tests/validation/measured-doppler.json', 'tests/golden/baseline.json',
    'tests/golden/cases.js', 'tests/validation/third-party-tables/g1.csv', 'tests/validation/third-party-tables/g7.csv', 'tests/helpers/load-solver.js',
    'tests/validation/stage11/datasets.json', 'tests/validation/stage11/results.json', 'docs/MODEL_SOURCES.md'])
    if (f === 'tests/validation/references.json') assert.deepStrictEqual(withoutRound3(read(f)), withoutRound3(show(STAGE11, f)), f + ' (earlier data) must not change');
    else assert.strictEqual(read(f), show(STAGE11, f), f + ' must not change in Stage 12');
});
test('the reference-data hashes recorded in the Stage 12 report are the real ones', () => {
  const crypto = require('crypto'), t = read('docs/STAGE12_FINAL_RELEASE_AUDIT.md');
  // Stage 13 added round-3 data to references.json, so the Stage 12 report's hash is checked against the Stage 12 version of that file.
  const { execFileSync } = require('child_process');
  const bytes = (f) => f === 'tests/validation/references.json' ? execFileSync('git', ['show', 'f6cbe5c:' + f], { cwd: root, maxBuffer: 1 << 26 }) : fs.readFileSync(path.join(root, f));
  for (const f of ['tests/validation/references.json', 'tests/golden/baseline.json', 'tests/validation/measured-doppler.json'])
    assert.ok(t.includes(crypto.createHash('sha256').update(bytes(f)).digest('hex')), 'hash of ' + f);
});

const html = () => read('index.html');
const ui = () => html().replace(/\s+/g, ' ');
test('the interface states that physical accuracy has not been demonstrated', () => {
  assert.match(ui(), /has not been shown to be physically accurate/);
  assert.match(ui(), /Not independently verified/);   // the earlier wording is kept, not replaced
});
test('the interface says manufacturer comparisons are not proof of real-world accuracy', () => assert.match(ui(), /not proof of real-world accuracy/i));
test('the interface says the Coriolis discrepancy is unresolved', () => assert.match(ui(), /Coriolis[^.]{0,200}(unresolved|not resolved)/i));
test('the interface keeps the stability, spin-drift, fitted-value, truing and station-pressure disclosures', () => {
  for (const re of [/assumed bullet length/, /below 1\.0[^']{0,120}may be unreliable/, /fitting can absorb errors/, /Matching one observation can absorb errors/,
    /Station pressure \(not sea-level pressure\)/, /not the sea-level pressure from weather reports/, /fitted value, not a measured one/, /never with measured bullet flight/])
    assert.match(ui(), re, String(re));
});

const need = ['What Scope Dope does', 'What the model calculates', 'What has been tested', 'What has not been validated', 'Known defects', 'Supported inputs', 'How to interpret', 'Model version'];
test('the release notes exist, cover the required topics and claim no accuracy', () => {
  const t = read('docs/RELEASE_NOTES.md');
  for (const h of need) assert.match(t, new RegExp(h, 'i'), h);
  assert.match(t, /NOT DEMONSTRATED/);
  assert.match(t, /1\.0\.0/);
  const stripped = t.replace(/\bUNVERIFIED\b|\bVERIFIED\b|\bunverified\b|\bverified\b/g, 'STATUS');
  for (const m of stripped.matchAll(/\b(accurate|accuracy|guaranteed|safe|proven|validated|certified)\b/gi)) {
    const around = stripped.slice(Math.max(0, m.index - 140), m.index + 60);
    assert.ok(/\b(not|never|no|neither|nor|cannot|without|does not|until|if|whether|physical|has not|have not|claim|claims)\b/i.test(around), 'unqualified "' + m[0] + '" near: ' + around.replace(/\n/g, ' '));
  }
});
test('the Stage 12 report has the required sections, a recommendation, and claims no accuracy', () => {
  const t = read('docs/STAGE12_FINAL_RELEASE_AUDIT.md');
  for (const h of [/software audit/i, /calculation and data integrity/i, /safety and transparency/i, /remaining defects/i, /release blockers/i, /before and after/i, /test results/i, /recommendation/i, /NOT DEMONSTRATED/])
    assert.match(t, h);
  assert.match(t, /READY FOR PRELIMINARY RELEASE|NOT READY/);
  const stripped = t.replace(/\bUNVERIFIED\b|\bVERIFIED\b|\bunverified\b|\bverified\b/g, 'STATUS');
  for (const m of stripped.matchAll(/\b(accurate|accuracy|guaranteed|safe|proven|validated|certified)\b/gi)) {
    const around = stripped.slice(Math.max(0, m.index - 140), m.index + 60);
    assert.ok(/\b(not|never|no|neither|nor|cannot|without|does not|until|if|whether|physical|has not|have not|claim|claims|limited|only|which|what)\b/i.test(around), 'unqualified "' + m[0] + '" near: ' + around.replace(/\n/g, ' '));
  }
});

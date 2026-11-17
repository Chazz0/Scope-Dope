'use strict';
// Stage 5: calculation-model versioning.
// These tests tie the engine's version to the recorded golden numbers and to a written changelog,
// so a calculation change cannot happen without a deliberate version bump and a recorded reason.
// They check bookkeeping only. They say nothing about whether the ballistics are accurate.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { loadSolver, DEFAULT_FILE } = require('./helpers/load-solver');

const root = path.join(__dirname, '..');
const S = loadSolver();
const baseline = JSON.parse(fs.readFileSync(path.join(__dirname, 'golden', 'baseline.json'), 'utf8'));
const changelog = () => fs.readFileSync(path.join(root, 'docs', 'MODEL_CHANGELOG.md'), 'utf8');

test('the engine exposes a model version in x.y.z form', () => {
  assert.match(String(S.MODEL_VERSION), /^\d+\.\d+\.\d+$/);
});

test('the golden baseline records the model version its numbers belong to', () => {
  assert.match(String(baseline.modelVersion), /^\d+\.\d+\.\d+$/, 'baseline.json has no modelVersion');
  assert.strictEqual(baseline.modelVersion, S.MODEL_VERSION,
    'The engine says ' + S.MODEL_VERSION + ' but the baseline says ' + baseline.modelVersion +
    '. If a calculation changed on purpose, bump MODEL_VERSION, regenerate the baseline and add a changelog entry.');
});

test('the changelog has an entry for the current model version', () => {
  assert.ok(changelog().includes('## ' + S.MODEL_VERSION), 'docs/MODEL_CHANGELOG.md has no "## ' + S.MODEL_VERSION + '" heading');
});

test('the changelog entry says what the version is and is not', () => {
  const text = changelog();
  const i = text.indexOf('## ' + S.MODEL_VERSION);
  const entry = text.slice(i, i + 2500);
  assert.match(entry, /No calculated value changed|Numbers changed/, 'entry must state whether any calculated value changed');
});

test('the engine version is a single definition, not repeated', () => {
  const html = fs.readFileSync(DEFAULT_FILE, 'utf8');
  const hits = html.match(/const MODEL_VERSION\s*=/g) || [];
  assert.strictEqual(hits.length, 1);
});

test('the screen label shows the model version and does not claim verification', () => {
  const html = fs.readFileSync(DEFAULT_FILE, 'utf8');
  assert.ok(html.includes('id="modelTag"'), 'no element with id="modelTag"');
  assert.ok(/MODEL_VERSION/.test(html.slice(html.indexOf('modelTag') - 0)), 'modelTag is not filled from MODEL_VERSION');
  const m = html.match(/<[^>]*id="modelTag"[^>]*>([^<]*)</);
  const initial = m ? m[1] : '';
  assert.doesNotMatch(initial, /verified|accurate|validated|proven/i, 'the label must not claim verification');
});

test('adding the version changed no calculated number', () => {
  const { cases, FIELDS } = require('./golden/cases');
  for (const c of cases) {
    const M = S.buildModel(c.inp, Math.max(...c.ranges) * 1.05);
    for (const r of c.ranges) {
      const d = S.dopeAt(M, c.inp, r);
      const want = baseline.cases[c.id].rows[r];
      if (!d) { assert.strictEqual(want, null); continue; }
      for (const f of FIELDS) assert.strictEqual(Number(d[f].toPrecision(12)), want[f], c.id + ' ' + r + ' ' + f);
    }
  }
});

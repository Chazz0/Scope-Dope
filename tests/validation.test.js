'use strict';
// Guards for the validation work. These check that the evidence files and the labels stay honest.
// They do not judge whether the ballistics are accurate. A passing test is not evidence of accuracy.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { DEFAULT_FILE } = require('./helpers/load-solver');

const root = path.join(__dirname, '..');
const refs = JSON.parse(fs.readFileSync(path.join(__dirname, 'validation', 'references.json'), 'utf8'));
const sources = fs.readFileSync(path.join(root, 'docs', 'MODEL_SOURCES.md'), 'utf8');

test('the tolerances are the ones written before the comparison was run', () => {
  assert.deepStrictEqual(refs.tolerances.tableCd.abs, 0.005);
  assert.deepStrictEqual(refs.tolerances.velocityPct.value, 1.0);
  assert.deepStrictEqual(refs.tolerances.dropIn.pct, 2.0);
  assert.deepStrictEqual(refs.tolerances.dropIn.minAbs, 0.3);
});

test('the owner-confirmed distance labels are recorded, and the discarded reading is history only', () => {
  const c = refs.trajectoryCases.find(x => x.id === 'HORNADY-LE-140-OTMA');
  assert.deepStrictEqual(c.labelsConfirmed.distancesYd, ['Muzzle', 50, 100, 200, 300, 400, 500]);
  assert.ok(c.discardedReadings.A_shifted_one_column && c.discardedReadings.B_hundred_yard_steps, 'discarded readings must stay recorded as history');
  assert.ok(!Object.keys(c.readings).some(k => /^(A_|B_)/.test(k)), 'a discarded reading must not be in the readings that are run');
  assert.strictEqual(c.readings.confirmed_distances.rows['50'], null, 'the placeholder 50 yd column must stay invalid, not become a number');
  assert.ok(c.readings.confirmed_distances.rowNotes['50'].includes('0 / N/A / 0'));
  assert.match(c.valuePairing, /not seen by the author/, 'what the author did not see must stay disclosed');
});

test('every reference names its source, a URL and what could not be read', () => {
  for (const p of refs.tablePoints) { assert.ok(p.source && /^https:\/\//.test(p.url) && p.quote, p.id); }
  for (const c of refs.trajectoryCases) {
    assert.ok(c.source && /^https:\/\//.test(c.url), c.id);
    assert.ok(Array.isArray(c.inputsNotPublished) && c.inputsNotPublished.length > 0, c.id + ' must list what the source does not publish');
    assert.ok(c.assumptions && c.assumptions.why, c.id + ' must say why each assumption was made');
  }
});

test('the validation runner reports every comparison, including the ones that differ and the ones not obtained', () => {
  const out = JSON.parse(execFileSync('node', [path.join(root, 'tests', 'tools', 'run-validation.js'), '--json'], { encoding: 'utf8' }));
  assert.strictEqual(out.filter(x => x.kind === 'table').length, refs.tablePoints.length);
  const rows = refs.trajectoryCases.flatMap(c => Object.values(c.readings).flatMap(r => Object.values(r.rows)));
  assert.strictEqual(out.filter(x => x.kind === 'trajectory').length, rows.filter(x => x !== null).length);
  assert.strictEqual(out.filter(x => x.kind === 'notObtained').length, rows.filter(x => x === null).length);
  assert.ok(!out.some(x => /^(A_|B_)/.test(String(x.reading || ''))), 'a discarded reading was run');
});

test('the BC unit factor in the app matches the exact definitions of the pound and the inch', () => {
  const exact = 0.45359237 / (0.0254 * 0.0254);
  assert.ok(Math.abs(exact - 703.0696) < 1e-4, 'exact value is ' + exact);
  const html = fs.readFileSync(DEFAULT_FILE, 'utf8');
  assert.ok(html.includes('inp.bc * 703.0696'), 'the app no longer uses 703.0696');
});

test('the sources document states that software tests are not proof of accuracy', () => {
  assert.ok(sources.includes('Passing software tests is not proof of ballistic accuracy.'));
});

test('the sources document defines Tested, Verified and Unverified', () => {
  for (const w of ['**Tested**', '**Verified**', '**Unverified**']) assert.ok(sources.includes('| ' + w + ' |'), w + ' is not defined');
});

test('every component labeled Verified states its scope', () => {
  const rows = sources.split('\n').filter(l => l.startsWith('|') && /\*\*Verified\*\*,/.test(l));
  assert.ok(rows.length >= 1);
  for (const r of rows) assert.match(r, /scope:/i, 'a Verified row has no scope: ' + r.slice(0, 60));
});

test('no drag table is labeled Verified while only one point has been compared', () => {
  const g = sources.split('\n').filter(l => /^\| G[17] drag table/.test(l));
  assert.strictEqual(g.length, 2);
  for (const l of g) assert.ok(/\*\*Unverified\*\*/.test(l) && !/\*\*Verified\*\*/.test(l), l.slice(0, 40));
});

test('evidence ids named in the sources document exist in the reference data', () => {
  const ids = new Set(refs.tablePoints.map(p => p.id));
  const named = sources.match(/\b[A-Z]{2}-G[17]-M\d\b/g) || [];
  assert.ok(named.length > 0);
  for (const id of named) assert.ok(ids.has(id), id + ' is not in references.json');
});

test('transcription check: each Hornady row\'s energy matches its velocity (this checks the copy, not ballistics)', () => {
  const c = refs.trajectoryCases.find(x => x.id === 'HORNADY-LE-140-OTMA');
  const wt = c.inputsPublished.weightGr;
  const energy = (v) => v * v * wt / 450240;
  assert.ok(Math.abs(energy(c.inputsPublished.v0Fps) - c.inputsPublished.muzzleEnergyFtLb) <= 2, 'muzzle row');
  for (const [r, w] of Object.entries(c.readings.confirmed_distances.rows)) {
    if (!w) continue;
    assert.ok(Math.abs(energy(w.v) - w.e) <= 2, r + ' yd: ' + w.v + ' fps gives ' + energy(w.v).toFixed(1) + ' ft-lb but the copy says ' + w.e + '. Whole-fps rounding allows about 1.');
  }
});

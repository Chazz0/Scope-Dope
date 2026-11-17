'use strict';
// Stage 16 guards: the scope-adjustment module is connected to the app without changing the ballistic solver or any calculation data.
const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const root = path.join(__dirname, '..');
const show = (f) => execFileSync('git', ['show', 'main:' + f], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26 });
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const between = (t, a, b) => t.slice(t.indexOf(a), t.indexOf(b) + b.length);
const html = read('index.html');

test('the ballistic solver block is byte-identical to main, and the model version is 1.0.0', () => {
  const now = between(html, '/*SOLVER_START*/', '/*SOLVER_END*/');
  assert.ok(now.length > 5000); assert.strictEqual(now, between(show('index.html'), '/*SOLVER_START*/', '/*SOLVER_END*/'));
  assert.match(now, /const MODEL_VERSION = '1\.0\.0';/);
});
test('the assessment block, reference data, tolerances, golden baseline and helpers are unchanged', () => {
  assert.strictEqual(between(html, '/*ASSESS_START*/', '/*ASSESS_END*/'), between(show('index.html'), '/*ASSESS_START*/', '/*ASSESS_END*/'));
  for (const f of ['tests/validation/references.json', 'tests/golden/baseline.json', 'tests/golden/cases.js', 'tests/helpers/load-solver.js', 'tests/helpers/load-assess.js']) assert.strictEqual(read(f), show(f), f);
});
test('the module embedded in the page is exactly lib/scope-adjust.js', () => {
  const block = between(html, '/*SCOPE_START*/', '/*SCOPE_END*/');
  assert.ok(block.includes(read('lib/scope-adjust.js').trimEnd()), 'embedded copy differs from lib/scope-adjust.js');
  assert.strictEqual(html.split('/*SCOPE_START*/').length, 2);
});
test('the old single click dropdown and its silent default are gone; legacy value is kept in a hidden field and never converted by code', () => {
  assert.ok(!/<select id="click"/.test(html)); assert.ok(!html.includes('MOA:0.25'));
  assert.match(html, /<input type="hidden" id="click" value="">/);
  assert.ok(!/function clicksFor/.test(html));
  const keys = /const PKEYS = \[([^\]]*)\]/.exec(html)[1];
  for (const k of ['click', 'eUnit', 'eClick', 'eCf', 'wUnit', 'wClick', 'wCf']) assert.match(keys, new RegExp("'" + k + "'"));
  const d = /function profileDefaults[^]*?\n  \}/.exec(html)[0];
  for (const k of ['click', 'eUnit', 'eClick', 'eCf', 'wUnit', 'wClick', 'wCf']) assert.match(d, new RegExp(k + ":''"), 'default for ' + k + ' must be empty');
});
test('no code path converts the legacy click into the new settings except the explicit button handler', () => {
  const uses = html.split('\n').filter(l => /legacyClick\(/.test(l)).map(l => l.trim().slice(0, 60));
  assert.ok(uses.length >= 3);
  const handler = /\$\('scopeLegacy'\)\.addEventListener\('click'[^]*?\n  \}\);/.exec(html)[0];
  assert.match(handler, /\$\('eUnit'\)\.value = leg\.unit/); assert.ok(!/eCf|wCf/.test(handler.replace(/tracking correction factors were left empty[^']*/, '')), 'the button must not fill a tracking factor');
  assert.ok(!/applyProfile[^]{0,2500}legacyClick/.test(html.slice(html.indexOf('function applyProfile'), html.indexOf('function applySession'))), 'applyProfile must not migrate');
  assert.ok(!/loadStore[^]{0,6000}legacyClick/.test(html.slice(html.indexOf('function loadStore'), html.indexOf('function collectProfile'))), 'loadStore must not migrate');
});
test('windage factor field accepts exactly 1, the click limit is described as an application limit, and the Applied Ballistics label is used', () => {
  assert.match(html, /id="wCf"[^>]*min="1" max="1"/);
  assert.match(html, /that is this app's own limit, not an Applied Ballistics or manufacturer value/);
  assert.match(html, /Applied Ballistics Tracking Correction Factor \(elevation\)/); assert.match(html, /The elevation factor is never applied to windage/);
});
test('calculated and scope-adjusted values are labelled apart on the HUD and range card', () => {
  assert.match(html, /'Calc up mil','Calc up true MOA','Calc wind mil','Calc wind true MOA'/); assert.match(html, /'Dial up \('/);
  assert.match(html, /· calculated '/); assert.match(html, /Calc columns are calculated corrections; Dial columns are scope adjustments/);
});
test('the Stage 16 report states the migration behaviour, the changed tests, and that accuracy is not demonstrated', () => {
  const d = read('docs/STAGE16_SCOPE_INTEGRATION.md');
  for (const re of [/NOT DEMONSTRATED/, /not migrated|no silent migration/i, /ballistic solver[^.]{0,60}unchanged|byte-identical/i, /Applied Ballistics Tracking Correction Factor/, /application validation limit/i]) assert.match(d, re);
});

'use strict';
// Stage 15 audit: every rule in the module is labelled as documented Applied Ballistics behaviour or as an application decision.
const test = require('node:test'), assert = require('node:assert');
const S = require('../lib/scope-adjust');
const P = S.PROVENANCE;
test('every rule has an allowed status, a rule text, and documented rules cite a source', () => {
  for (const [k, v] of Object.entries(P)) {
    assert.ok(['DOCUMENTED', 'DOCUMENTED_PARTLY', 'STANDARD', 'APP_DECISION'].includes(v.status), k);
    assert.ok(typeof v.rule === 'string' && v.rule.length > 10, k);
    if (v.status === 'DOCUMENTED' || v.status === 'DOCUMENTED_PARTLY') assert.ok(v.refs.length > 0, k + ' needs a reference');
    if (v.status === 'APP_DECISION' || v.status === 'STANDARD') assert.strictEqual(v.refs.length, 0, k + ' must not cite Applied Ballistics');
    if (v.status === 'DOCUMENTED_PARTLY') assert.ok(v.note, k + ' must say what is missing');
  }
});
test('rounding, the factor bounds, the click bounds, the no-default rule and the windage factor use are labelled as application decisions', () => {
  for (const k of ['rounding', 'cfBounds', 'clickBounds', 'noDefaults', 'windageCfExactlyOne', 'windageCfProcedure', 'strictUnits', 'shooterMoaTest', 'outputLabelling']) assert.strictEqual(P[k].status, 'APP_DECISION', k);
});
test('the documented rules are the ones the code implements', () => {
  assert.strictEqual(P.cfDefinition.status, 'DOCUMENTED'); assert.strictEqual(P.cfApplication.status, 'DOCUMENTED'); assert.strictEqual(P.testConstants.status, 'DOCUMENTED');
  assert.deepStrictEqual(S.AB_TEST_CONSTANT.yd, { TRUE_MOA: 0.01047, MIL: 0.03599 }); assert.deepStrictEqual(S.AB_TEST_MIN_DIAL, { TRUE_MOA: 30, MIL: 10 });
  assert.deepStrictEqual(S.LIMITS, { clickMax: 10, cfMin: 0.5, cfMax: 2 });
});

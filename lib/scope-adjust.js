'use strict';
/*
 * Scope-adjustment module (Stage 15). STANDALONE: not connected to the app screens, the saved rifle data or the ballistic solver.
 *
 * It takes a ballistic correction that something else calculated (value + unit) and turns it into a scope adjustment: the corrected
 * angle, the whole clicks to dial, and what those clicks actually dial. It never calculates a trajectory, never reads the solver,
 * and never changes the ballistic correction it was given.
 *
 * Conventions followed (see docs/STAGE15_SCOPE_ADJUSTMENT_MODULE.md for the source of every rule and every gap):
 *  - [DOCUMENTED] Applied Ballistics Tracking Correction Factor, CF = expected shift / actual shift. The calculated correction is MULTIPLIED by CF
 *    (Applied Ballistics Quantum and Analytics manuals). Garmin's "Sight Scale Factor" (actual / expected) is NOT used, and its value
 *    must not be entered here.
 *  - 1.000 is a valid CF only when the caller states it. There is no default for any scope setting.
 *  - Units are exact: MIL, TRUE_MOA, SHOOTER_MOA. The bare word "MOA" is rejected because it is ambiguous. No function converts units
 *    implicitly; a correction whose unit differs from the turret's unit is an error unless the caller converts it first, on purpose.
 *
 * PROVENANCE (exported) labels every rule DOCUMENTED, DOCUMENTED_PARTLY, STANDARD or APP_DECISION. Rounding, the factor and click bounds,
 * the no-default rule and the windage factor's use are application decisions, not Applied Ballistics behaviour.
 *
 * Physical accuracy of any ballistic correction is NOT DEMONSTRATED. This module only does unit and turret arithmetic.
 */

// Angle of one unit, in radians per unit.
//  MIL         1 milliradian
//  TRUE_MOA    1/60 degree (about 1.04720 in at 100 yd)
//  SHOOTER_MOA 1 inch at 100 yd (Applied Ballistics "IPHY", described in its Analytics manual as "Shooters MOA"), exactly 1/3600 rad
const RAD_PER_UNIT = Object.freeze({
  MIL: 1e-3,
  TRUE_MOA: Math.PI / 10800,
  SHOOTER_MOA: 1 / 3600
});
const UNITS = Object.freeze(Object.keys(RAD_PER_UNIT));

// APP_DECISION (see PROVENANCE.cfBounds, clickBounds): these bounds are this application's own. No Applied Ballistics document read gives a valid range.
const LIMITS = Object.freeze({ clickMax: 10, cfMin: 0.5, cfMax: 2 });

// Applied Ballistics Quantum manual, section 9.0: constant for "expected POI shift = dialed x range x constant" (shift in inches).
const AB_TEST_CONSTANT = Object.freeze({
  yd: Object.freeze({ TRUE_MOA: 0.01047, MIL: 0.03599 }),
  m: Object.freeze({ TRUE_MOA: 0.01145, MIL: 0.03936 })
});
// The test itself asks for at least 30 MOA or 10 MIL of elevation.
const AB_TEST_MIN_DIAL = Object.freeze({ TRUE_MOA: 30, MIL: 10 });


// ---- Provenance: which rules come from Applied Ballistics documentation and which are this application's own decisions ----
// DOCUMENTED         stated in an Applied Ballistics document (reference in `refs`)
// DOCUMENTED_PARTLY  Applied Ballistics documents part of it; `note` says which part and what is missing
// STANDARD           a standard definition that the Applied Ballistics text names but does not state
// APP_DECISION       this application's own rule. Applied Ballistics documents say nothing about it, or this goes beyond them.
// Reference keys: Q24 = AB Quantum User Manual (2024 file), Q3 = AB Quantum 3.0 User Guide (2025 file), AN = AB Analytics User Manual (Build 068),
// AM = AB Mobile User Guide, version 07/2018 (2.2), GA = Garmin Applied Ballistics glossary (secondary source, not followed).
const PROVENANCE = Object.freeze({
  cfDefinition:        { status: 'DOCUMENTED', rule: 'CF = expected POI shift / actual POI shift', refs: ['Q24 s9.0 p25', 'Q3 s9.0 p29', 'AM Tall Target Test', 'AN s3.2.4 p12 (dialed / measured, 30/29)'] },
  cfApplication:       { status: 'DOCUMENTED', rule: 'the raw ballistic prediction is multiplied by CF (drop is scaled by it)', refs: ['Q24 s9.0 p25', 'Q3 s9.0 p29', 'AN s3.2.4 p12'] },
  testConstants:       { status: 'DOCUMENTED', rule: 'constants 0.01047, 0.03599 (yd) and 0.01145, 0.03936 (m); expected = dialed x range x constant', refs: ['Q24 s9.0 p25'] },
  testMinimumDial:     { status: 'DOCUMENTED', rule: 'dial at least 30 MOA or 10 MIL for the tall-target test', refs: ['Q24 s9.0 p25', 'Q3 s9.0 p29', 'AN s3.2.4 p12'] },
  unitNames:           { status: 'DOCUMENTED', rule: 'scope units are MILS, MOA (True MOA) or IPHY (Inches Per Hundred Yards, "Shooters MOA")', refs: ['AN s7.0 p25', 'AM Sight Data > Elevation Unit'] },
  shooterMoaIsIphy:    { status: 'DOCUMENTED', rule: 'shooter MOA = inches per hundred yards (1 in at 100 yd)', refs: ['AN s7.0 p25', 'AM Sight Data > Elevation Unit'] },
  trueMoaAngle:        { status: 'STANDARD', rule: 'true MOA = 1/60 degree; the Applied Ballistics text says "True MOA" but does not define it', refs: [] },
  milAngle:            { status: 'STANDARD', rule: 'MIL = 1/1000 radian; the Applied Ballistics text says MILS but does not define it', refs: [] },
  separateAxisUnits:   { status: 'DOCUMENTED', rule: 'the elevation and windage knobs each have their own unit', refs: ['AM Sight Data > Elevation Unit, Windage Unit'] },
  separateTurretGrad:  { status: 'DOCUMENTED_PARTLY', rule: 'elevation and windage turret graduations are separate settings', refs: ['AM Sight Data > Elevation Turret Grad, Windage Turret Grad'], note: 'Only the 2018 AB Mobile guide lists them. The Quantum manuals and the Analytics manual do not cover click values.' },
  elevationCf:         { status: 'DOCUMENTED', rule: 'an elevation correction factor exists and is found with the tall-target test', refs: ['AM Sight Data > Elevation Correction Factor', 'Q24 s9.0 p25'] },
  windageCfField:      { status: 'DOCUMENTED_PARTLY', rule: 'a separate windage correction factor input exists', refs: ['AM Sight Data > Windage Correction Factor'], note: 'The field is listed with no description. No manual read gives a windage measurement procedure; Analytics states that the program scales the calculated drop; Quantum applies CF to the raw ballistic prediction and its example is elevation only.' },
  windageCfMultiply:   { status: 'APP_DECISION', rule: 'a windage correction factor multiplies the windage correction the same way CF multiplies elevation', refs: [], note: 'By analogy only. Not documented.' },
  windageCfProcedure:  { status: 'APP_DECISION', rule: 'the module does not measure a windage factor and does not copy the elevation factor into windage', refs: [] },
  noDefaults:          { status: 'APP_DECISION', rule: 'every scope setting is required; CF of 1 is accepted only when stated', refs: [], note: 'AB Mobile 2.2 suggests entering 1.0 when the elevation factor is unknown. This module is stricter by design.' },
  cfBounds:            { status: 'APP_DECISION', rule: 'CF must be from 0.5 to 2.0', refs: [], note: 'No range is stated in any Applied Ballistics document read.' },
  clickBounds:         { status: 'APP_DECISION', rule: 'click value must be above 0 and at most 10 units', refs: [], note: 'No range is stated in any Applied Ballistics document read.' },
  rounding:            { status: 'APP_DECISION', rule: 'whole clicks, nearest, halves away from zero', refs: [], note: 'No Applied Ballistics document read states a rounding rule.' },
  strictUnits:         { status: 'APP_DECISION', rule: 'bare "MOA" is rejected; units are never mixed or converted implicitly', refs: [] },
  shooterMoaTest:      { status: 'APP_DECISION', rule: 'the tracking-test helper rejects SHOOTER_MOA', refs: [], note: 'The published constants are for MOA and MIL only.' },
  outputLabelling:     { status: 'APP_DECISION', rule: 'ballistic correction and scope adjustment are separate tagged, frozen objects', refs: [] }
});

class ScopeAdjustError extends Error {
  constructor(problems) {
    super(problems.join('; '));
    this.name = 'ScopeAdjustError';
    this.problems = problems;
  }
}

const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const unitProblem = (u, where) => {
  if (u === 'MOA' || (typeof u === 'string' && /^(moa|mrad|mil|mils|true ?moa|shooter ?moa|smoa|iphy)$/i.test(u) && !UNITS.includes(u)))
    return where + ' unit "' + u + '" is not an exact unit. Use one of ' + UNITS.join(', ') + ' (plain "MOA" is ambiguous: true MOA and shooter MOA differ by about 4.7%).';
  if (!UNITS.includes(u)) return where + ' unit must be one of ' + UNITS.join(', ') + (u === undefined ? ' (missing)' : ' (got ' + JSON.stringify(u) + ')');
  return null;
};

// ---- unit conversion (explicit only) ----
function convertAngle(value, from, to) {
  const p = [];
  if (!isNum(value)) p.push('value must be a finite number');
  const a = unitProblem(from, 'from'), b = unitProblem(to, 'to');
  if (a) p.push(a); if (b) p.push(b);
  if (p.length) throw new ScopeAdjustError(p);
  return value * RAD_PER_UNIT[from] / RAD_PER_UNIT[to];
}

// A ballistic correction as produced by a calculation. The "kind" tag keeps it apart from a scope adjustment, and a correction cannot
// be created without an exact unit.
function ballisticCorrection(value, unit) {
  const p = [];
  if (!isNum(value)) p.push('ballistic correction value must be a finite number');
  const u = unitProblem(unit, 'ballistic correction'); if (u) p.push(u);
  if (p.length) throw new ScopeAdjustError(p);
  return Object.freeze({ kind: 'ballistic-correction', value, unit });
}

// ---- scope configuration ----
// scope = { elevation: { unit, clickValue, trackingCorrectionFactor }, windage: { unit, clickValue, trackingCorrectionFactor } }
// Every field is required, for both axes. Nothing is defaulted.
function validateScopeAxis(axis, name) {
  const p = [];
  if (axis === null || typeof axis !== 'object' || Array.isArray(axis)) return [name + ' settings are missing'];
  const u = unitProblem(axis.unit, name); if (u) p.push(u);
  if (!isNum(axis.clickValue)) p.push(name + ' clickValue is missing or not a finite number');
  else if (!(axis.clickValue > 0)) p.push(name + ' clickValue must be greater than 0');
  else if (axis.clickValue > LIMITS.clickMax) p.push(name + ' clickValue ' + axis.clickValue + ' is above the limit of ' + LIMITS.clickMax + ' ' + (UNITS.includes(axis.unit) ? axis.unit : 'units') + ' per click');
  if (!isNum(axis.trackingCorrectionFactor)) p.push(name + ' trackingCorrectionFactor is missing or not a finite number (enter 1 explicitly if the scope tracks true)');
  else if (axis.trackingCorrectionFactor < LIMITS.cfMin || axis.trackingCorrectionFactor > LIMITS.cfMax)
    p.push(name + ' trackingCorrectionFactor ' + axis.trackingCorrectionFactor + ' is outside ' + LIMITS.cfMin + ' to ' + LIMITS.cfMax);
  return p;
}
function validateScopeConfig(scope) {
  if (scope === null || typeof scope !== 'object' || Array.isArray(scope)) return ['scope settings are missing'];
  return validateScopeAxis(scope.elevation, 'elevation').concat(validateScopeAxis(scope.windage, 'windage'));
}

// APP_DECISION (PROVENANCE.rounding): nearest whole click, halves away from zero. No Applied Ballistics document read states a rounding rule.
const roundClicks = (x) => (x < 0 ? -Math.round(-x) : Math.round(x)) + 0;

// Scope adjustment for ONE axis. The input is a ballistic correction in the same unit as that axis's turret.
function adjustAxis(correction, axis, name) {
  const p = [];
  if (correction === null || typeof correction !== 'object' || correction.kind !== 'ballistic-correction')
    p.push(name + ' input must be a ballistic correction made with ballisticCorrection(value, unit)');
  else {
    if (!isNum(correction.value)) p.push(name + ' ballistic correction value must be a finite number');
    const cu = unitProblem(correction.unit, name + ' ballistic correction'); if (cu) p.push(cu);
  }
  const ap = validateScopeAxis(axis, name); p.push(...ap);
  if (!p.length && correction.unit !== axis.unit)
    p.push(name + ' ballistic correction is in ' + correction.unit + ' but the turret is ' + axis.unit + '. Units are never mixed implicitly: convert on purpose with convertAngle().');
  if (p.length) throw new ScopeAdjustError(p);
  const corrected = correction.value * axis.trackingCorrectionFactor;
  const exact = corrected / axis.clickValue;
  const clicks = roundClicks(exact);
  return Object.freeze({
    kind: 'scope-adjustment',
    axis: name,
    calculated: Object.freeze({ value: correction.value, unit: correction.unit }),   // the ballistic correction, unchanged
    trackingCorrectionFactor: axis.trackingCorrectionFactor,
    corrected: Object.freeze({ value: corrected, unit: axis.unit }),                 // calculated x CF
    clickValue: axis.clickValue,
    clicksExact: exact,
    clicks: clicks,                                                                   // whole clicks to dial
    dialed: Object.freeze({ value: clicks * axis.clickValue, unit: axis.unit }),      // what those clicks actually dial
    remainder: Object.freeze({ value: corrected - clicks * axis.clickValue, unit: axis.unit })   // left over after rounding
  });
}

// Elevation and windage together. Each axis has its own unit, click value and tracking factor.
function scopeAdjustment(elevationCorrection, windageCorrection, scope) {
  const bad = validateScopeConfig(scope);
  if (bad.length) throw new ScopeAdjustError(bad);
  return Object.freeze({
    elevation: adjustAxis(elevationCorrection, scope.elevation, 'elevation'),
    windage: adjustAxis(windageCorrection, scope.windage, 'windage')
  });
}

// ---- Applied Ballistics tracking test (Quantum manual section 9.0 and Analytics manual section 3.2.4) ----
// Quantum form: CF = expected shift / actual shift, expected = dialed x range x constant. Shift is in inches; range is in yd or m.
function trackingCorrectionFactorFromTest(t) {
  const p = [];
  if (t === null || typeof t !== 'object') throw new ScopeAdjustError(['test data is missing']);
  const table = AB_TEST_CONSTANT[t.rangeUnit];
  if (!table) p.push('rangeUnit must be "yd" or "m"');
  if (t.unit === 'SHOOTER_MOA') p.push('the Applied Ballistics tracking test constants are published for MOA and MIL only; SHOOTER_MOA is not supported');
  else { const u = unitProblem(t.unit, 'test'); if (u) p.push(u); else if (!table || table[t.unit] === undefined) { if (table) p.push('test unit must be TRUE_MOA or MIL'); } }
  if (!isNum(t.dialed) || !(t.dialed > 0)) p.push('dialed must be a number greater than 0');
  else if (AB_TEST_MIN_DIAL[t.unit] !== undefined && t.dialed < AB_TEST_MIN_DIAL[t.unit]) p.push('dialed ' + t.dialed + ' is below the ' + AB_TEST_MIN_DIAL[t.unit] + ' ' + t.unit + ' the test calls for');
  if (!isNum(t.range) || !(t.range > 0)) p.push('range must be a number greater than 0');
  if (!isNum(t.actualShiftIn) || !(t.actualShiftIn > 0)) p.push('actualShiftIn (measured shift in inches) must be a number greater than 0');
  if (p.length) throw new ScopeAdjustError(p);
  const expectedShiftIn = t.dialed * t.range * table[t.unit];
  const cf = expectedShiftIn / t.actualShiftIn;
  if (cf < LIMITS.cfMin || cf > LIMITS.cfMax) throw new ScopeAdjustError(['the test gives a factor of ' + cf.toFixed(4) + ', outside ' + LIMITS.cfMin + ' to ' + LIMITS.cfMax + '. Check the measurement.']);
  return Object.freeze({ expectedShiftIn, actualShiftIn: t.actualShiftIn, trackingCorrectionFactor: cf });
}
// Analytics manual form of the same quantity: dialed amount / measured movement, both in the same unit (30 / 29 = 1.035).
function trackingCorrectionFactorFromMovement(dialed, measured) {
  const p = [];
  if (!isNum(dialed) || !(dialed > 0)) p.push('dialed must be a number greater than 0');
  if (!isNum(measured) || !(measured > 0)) p.push('measured movement must be a number greater than 0');
  if (p.length) throw new ScopeAdjustError(p);
  const cf = dialed / measured;
  if (cf < LIMITS.cfMin || cf > LIMITS.cfMax) throw new ScopeAdjustError(['the result ' + cf.toFixed(4) + ' is outside ' + LIMITS.cfMin + ' to ' + LIMITS.cfMax + '. Check the measurement.']);
  return cf;
}

module.exports = Object.freeze({
  UNITS, RAD_PER_UNIT, LIMITS, PROVENANCE, AB_TEST_CONSTANT, AB_TEST_MIN_DIAL, ScopeAdjustError,
  convertAngle, ballisticCorrection, validateScopeConfig, adjustAxis, scopeAdjustment,
  trackingCorrectionFactorFromTest, trackingCorrectionFactorFromMovement
});

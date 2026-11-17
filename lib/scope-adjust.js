'use strict';
/*
 * Scope-adjustment module (Stage 15). STANDALONE: not connected to the app screens, the saved rifle data or the ballistic solver.
 *
 * It takes a ballistic correction that something else calculated (value + unit) and turns it into a scope adjustment: the corrected
 * angle, the whole clicks to dial, and what those clicks actually dial. It never calculates a trajectory, never reads the solver,
 * and never changes the ballistic correction it was given.
 *
 * Conventions followed (see docs/STAGE15_SCOPE_ADJUSTMENT_MODULE.md for the source of every rule and every gap):
 *  - Applied Ballistics Tracking Correction Factor, CF = expected shift / actual shift. The calculated correction is MULTIPLIED by CF
 *    (Applied Ballistics Quantum and Analytics manuals). Garmin's "Sight Scale Factor" (actual / expected) is NOT used, and its value
 *    must not be entered here.
 *  - 1.000 is a valid CF only when the caller states it. There is no default for any scope setting.
 *  - Units are exact: MIL, TRUE_MOA, SHOOTER_MOA. The bare word "MOA" is rejected because it is ambiguous. No function converts units
 *    implicitly; a correction whose unit differs from the turret's unit is an error unless the caller converts it first, on purpose.
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

// Bounds are this module's own validity limits. Applied Ballistics' manuals give no valid range for a click value or a tracking factor.
const LIMITS = Object.freeze({ clickMax: 10, cfMin: 0.5, cfMax: 2 });

// Applied Ballistics Quantum manual, section 9.0: constant for "expected POI shift = dialed x range x constant" (shift in inches).
const AB_TEST_CONSTANT = Object.freeze({
  yd: Object.freeze({ TRUE_MOA: 0.01047, MIL: 0.03599 }),
  m: Object.freeze({ TRUE_MOA: 0.01145, MIL: 0.03936 })
});
// The test itself asks for at least 30 MOA or 10 MIL of elevation.
const AB_TEST_MIN_DIAL = Object.freeze({ TRUE_MOA: 30, MIL: 10 });

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

// Round to the nearest whole click, halves away from zero. (Applied Ballistics' manuals state no rounding rule: this is this module's own.)
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
  UNITS, RAD_PER_UNIT, LIMITS, AB_TEST_CONSTANT, AB_TEST_MIN_DIAL, ScopeAdjustError,
  convertAngle, ballisticCorrection, validateScopeConfig, adjustAxis, scopeAdjustment,
  trackingCorrectionFactorFromTest, trackingCorrectionFactorFromMovement
});

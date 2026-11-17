'use strict';
// Loads the calculation engine straight out of index.html (the block between the
// SOLVER_START and SOLVER_END markers) so the tests exercise the exact code the app runs.
// Nothing in the app is changed or duplicated by this helper.
const fs = require('fs');
const path = require('path');

const DEFAULT_FILE = process.env.SCOPE_DOPE_FILE || path.join(__dirname, '..', '..', 'index.html');
const NAMES = 'G_ACC,G1,G7,cdOf,cdG1,atmosphere,accel,trace,sampleAt,buildModel,traceRot,solveRot,stability,intXdt,maxOrdinate,dopeAt';

function extract(file) {
  const html = fs.readFileSync(file, 'utf8');
  const a = html.indexOf('/*SOLVER_START*/');
  const b = html.indexOf('/*SOLVER_END*/');
  if (a < 0 || b < 0 || b < a) throw new Error('solver markers not found in ' + file);
  return html.slice(a, b);
}

// opts.dt (test only): override the integration step to measure step-size sensitivity.
function loadSolver(opts) {
  opts = opts || {};
  let src = extract(opts.file || DEFAULT_FILE);
  if (opts.dt !== undefined) {
    const hits = src.match(/const dt = 0\.0005;/g) || [];
    if (hits.length !== 2) throw new Error('expected 2 integration step definitions, found ' + hits.length);
    src = src.replace(/const dt = 0\.0005;/g, 'const dt = ' + opts.dt + ';');
  }
  return new Function(src + '\nreturn {' + NAMES + '};')();
}

// A complete, valid input set. Every test starts from this and overrides what it needs.
function baseInputs(over) {
  return Object.assign({
    tempF: 59, altFt: 0, pressInHg: null, humidity: 0,
    v0: 2650, bc: 0.462, wt: 168, h: 1.5, zero: 100, diam: 0.308, twist: 10,
    model: 'G1', twistDir: 'R',
    windMph: 0, windFrom: 'R', headMph: 0,
    angleDeg: 0, latDeg: null, azimuth: 0
  }, over || {});
}

module.exports = { loadSolver, baseInputs, extract, DEFAULT_FILE };

'use strict';
// Stage 10 (scientific verification) exporter. READ-ONLY: loads the engine from index.html exactly as the app runs it
// and writes what it calculates for a fixed set of cases to tests/validation/stage10/app-outputs.json.
// tests/tools/stage10-independent.py then recomputes the same cases with separately written code and compares.
// Nothing here changes the solver, the tables, the references or any tolerance.
// Run: node tests/tools/stage10-app-outputs.js
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const { loadSolver, baseInputs } = require(path.join(ROOT, 'tests', 'helpers', 'load-solver.js'));
const S = loadSolver();
const out = { generatedBy: 'tests/tools/stage10-app-outputs.js', modelVersion: S.MODEL_VERSION, tables: { G1: S.G1, G7: S.G7 } };

// ---- Atmosphere grid (app function atmosphere(tempF, altFt, pInHg, rh)) ----
out.atmosphere = [];
for (const tempF of [-40, -10, 14, 32, 59, 77, 95, 113, 130])
  for (const altFt of [0, 2500, 5000, 10000, 15000])
    for (const rh of [0, 50, 100]) {
      const a = S.atmosphere(tempF, altFt, null, rh);
      out.atmosphere.push({ tempF, altFt, pInHg: null, rh, rho: a.rho, sos: a.sos });
    }
for (const [tempF, pInHg, rh] of [[59, 29.92126, 0], [59, 29.92, 0], [32, 30.2, 0], [86, 25.0, 60], [68, 28.0, 100]]) {
  const a = S.atmosphere(tempF, 0, pInHg, rh);
  out.atmosphere.push({ tempF, altFt: 0, pInHg, rh, rho: a.rho, sos: a.sos });
}

// ---- Stability (app function stability(inp)) for every preset and a few twists/temperatures ----
const PRESETS = [
  { id: 'p223', v0: 3240, bc: 0.243, wt: 55, diam: 0.224, twist: 8 }, { id: 'p243', v0: 2950, bc: 0.379, wt: 95, diam: 0.243, twist: 10 },
  { id: 'p65cm', v0: 2710, bc: 0.610, wt: 140, diam: 0.264, twist: 8 }, { id: 'p270', v0: 3060, bc: 0.409, wt: 130, diam: 0.277, twist: 10 },
  { id: 'p308', v0: 2650, bc: 0.462, wt: 168, diam: 0.308, twist: 10 }, { id: 'p3006', v0: 2910, bc: 0.415, wt: 150, diam: 0.308, twist: 10 },
  { id: 'p300', v0: 2900, bc: 0.533, wt: 190, diam: 0.308, twist: 10 }, { id: 'p65prc', v0: 2960, bc: 0.625, wt: 143, diam: 0.264, twist: 8 }
];
out.stability = [];
for (const p of PRESETS)
  for (const tempF of [59, 20, 100])
    for (const altFt of [0, 5000, 10000]) {
      const inp = baseInputs(Object.assign({}, p, { tempF, altFt }));
      out.stability.push({ id: p.id, tempF, altFt, wt: p.wt, diam: p.diam, twist: p.twist, v0: p.v0, sg: S.stability(inp) });
    }

// ---- Trajectory cases ----
const CASES = {
  'level-G7-175':      { over: { model: 'G7', bc: 0.243, v0: 2700, wt: 175, zero: 100 }, ranges: [100, 300, 500, 800, 1000, 1200] },
  'level-G1-168':      { over: { model: 'G1', bc: 0.462, v0: 2650, wt: 168, zero: 100 }, ranges: [100, 300, 500, 800, 1000, 1200] },
  'level-G7-65cm':     { over: { model: 'G7', bc: 0.305, v0: 2710, wt: 140, diam: 0.264, twist: 8, zero: 100 }, ranges: [100, 500, 1000, 1500] },
  'wind10-G7-175':     { over: { model: 'G7', bc: 0.243, v0: 2700, wt: 175, windMph: 10, windFrom: 'R' }, ranges: [300, 500, 1000] },
  'wind20-G1-168':     { over: { model: 'G1', bc: 0.462, v0: 2650, windMph: 20, windFrom: 'L' }, ranges: [300, 500, 1000] },
  'cori-lat45-east':   { over: { model: 'G7', bc: 0.243, v0: 2700, wt: 175, latDeg: 45, azimuth: 90 }, ranges: [500, 1000, 1500] },
  'cori-lat45-west':   { over: { model: 'G7', bc: 0.243, v0: 2700, wt: 175, latDeg: 45, azimuth: 270 }, ranges: [500, 1000, 1500] },
  'cori-lat45-north':  { over: { model: 'G7', bc: 0.243, v0: 2700, wt: 175, latDeg: 45, azimuth: 0 }, ranges: [500, 1000, 1500] },
  'cori-lat-45S-east': { over: { model: 'G7', bc: 0.243, v0: 2700, wt: 175, latDeg: -45, azimuth: 90 }, ranges: [500, 1000, 1500] },
  'cori-lat60-az135':  { over: { model: 'G7', bc: 0.243, v0: 2700, wt: 175, latDeg: 60, azimuth: 135 }, ranges: [500, 1000, 1500] },
  'cori-eq-east':      { over: { model: 'G7', bc: 0.243, v0: 2700, wt: 175, latDeg: 0, azimuth: 90 }, ranges: [1000] },
  'angle+15':          { over: { model: 'G7', bc: 0.243, v0: 2700, wt: 175, angleDeg: 15 }, ranges: [300, 500, 1000] },
  'angle-15':          { over: { model: 'G7', bc: 0.243, v0: 2700, wt: 175, angleDeg: -15 }, ranges: [300, 500, 1000] },
  'angle+30':          { over: { model: 'G7', bc: 0.243, v0: 2700, wt: 175, angleDeg: 30 }, ranges: [300, 500, 1000] },
  'angle-45':          { over: { model: 'G7', bc: 0.243, v0: 2700, wt: 175, angleDeg: -45 }, ranges: [300, 500, 1000] },
  'angle+0.0001':      { over: { model: 'G7', bc: 0.243, v0: 2700, wt: 175, angleDeg: 0.0001 }, ranges: [300, 500, 1000, 1500] },
  'hot-high':          { over: { model: 'G7', bc: 0.243, v0: 2700, wt: 175, tempF: 95, altFt: 10000, humidity: 60 }, ranges: [500, 1000] },
  'cold-low':          { over: { model: 'G7', bc: 0.243, v0: 2700, wt: 175, tempF: 14, altFt: 0, humidity: 0 }, ranges: [500, 1000] }
};
out.cases = {};
for (const [id, c] of Object.entries(CASES)) {
  const inp = baseInputs(c.over);
  const M = S.buildModel(inp, 1700);
  out.cases[id] = { inp, zeroTheta: M.theta, rows: c.ranges.map(r => Object.assign({ rangeYd: r }, S.dopeAt(M, inp, r))) };
}
const dir = path.join(ROOT, 'tests', 'validation', 'stage10');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'app-outputs.json'), JSON.stringify(out, null, 1));
console.log('wrote tests/validation/stage10/app-outputs.json: ' + out.atmosphere.length + ' atmosphere points, ' + out.stability.length + ' stability points, ' + Object.keys(out.cases).length + ' trajectory cases (model ' + out.modelVersion + ')');

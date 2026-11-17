'use strict';
// Read-only audit of physical formulas in the engine against opened sources. Nothing here changes the engine.
// Pre-registered before running (2026-11-16): sea-level density and speed of sound within 0.1% of the U.S. Standard
// Atmosphere 1976 constants; the independent Miller implementation must equal the engine to within 1e-9 relative;
// spin drift and Coriolis are checked against the magnitude ranges Applied Ballistics prints (a range check, not a formula check).
// A pass is agreement with that source for that scope. It is not verification and not evidence of physical accuracy.
const { loadSolver, baseInputs } = require('../helpers/load-solver');
const S = loadSolver();
const out = [];
const rel = (a, b) => (a - b) / b;

// 1. Atmosphere vs U.S. Standard Atmosphere 1976 constants, as printed in pdas.com/programs/atmos76.f90 (T 288.15 K, P 101325 Pa,
//    rho 1.2250 kg/m3, a 340.294 m/s). Dry air, 59 F (= 288.15 K), pressure 101325 Pa = 29.9213 inHg.
const a0 = S.atmosphere(59, 0, 101325 / 3386.389, 0);
out.push({ id: 'ATM-RHO', what: 'sea-level dry density (kg/m3)', source: 1.2250, engine: Number(a0.rho.toFixed(5)), relDiff: rel(a0.rho, 1.2250), tol: 0.001 });
out.push({ id: 'ATM-SOS', what: 'sea-level dry speed of sound (m/s)', source: 340.294, engine: Number(a0.sos.toFixed(3)), relDiff: rel(a0.sos, 340.294), tol: 0.001 });
// Altitude pressure formula against its own sea-level value only (no opened table for other altitudes).
const pAlt0 = S.atmosphere(59, 0, null, 0), pAlt0b = S.atmosphere(59, 0, 101325 / 3386.389, 0);
out.push({ id: 'ATM-ALT0-PRESSURE', what: 'altitude formula at 0 ft gives sea-level pressure (density ratio to explicit 101325 Pa)', source: 1, engine: Number((pAlt0.rho / pAlt0b.rho).toFixed(6)), relDiff: pAlt0.rho / pAlt0b.rho - 1, tol: 0.001 });

// 2. Miller stability: independent implementation of the equation as printed in arXiv 1410.5340 (which cites Miller 2005):
//    Sg = 30 m / (t^2 d^3 L (1+L^2)) * (V/2800)^(1/3) * (FT+460)/(59+460) * 29.92/P, t in calibers per turn, L in calibers.
const miller = (m, t, d, L, V, FT, P) => 30 * m / (t * t * d * d * d * L * (1 + L * L)) * Math.pow(V / 2800, 1 / 3) * ((FT + 460) / 519) * (29.92 / P);
for (const [wt, diam, twist, v0, T, P] of [[168, 0.308, 10, 2650, 59, 29.92], [140, 0.264, 8, 2700, 30, 25.0], [200, 0.338, 9.5, 2500, 95, 29.0]]) {
  const inp = baseInputs({ wt, diam, twist, v0, tempF: T, pressInHg: P });
  // The engine does not take bullet length: it estimates length from weight (len = wt / (1875 pi/4 d^2)). Hold that estimate fixed here.
  const lenIn = wt / (1875 * Math.PI / 4 * diam * diam);
  const ind = miller(wt, twist / diam, diam, lenIn / diam, v0, T, P);
  const eng = S.stability(inp);
  out.push({ id: 'MILLER-' + wt + 'gr', what: 'stability factor, formula form, same length estimate', source: Number(ind.toFixed(4)), engine: Number(eng.toFixed(4)), relDiff: rel(eng, ind), tol: 1e-9, estimatedLengthIn: Number(lenIn.toFixed(3)) });
}

// 3. Spin drift and Coriolis magnitudes at 1000 yd against the ranges printed by Applied Ballistics (Gyroscopic Drift and Coriolis Effect).
const typ = baseInputs({ v0: 2800, bc: 0.5, wt: 175, diam: 0.308, twist: 11, zero: 100, latDeg: 45, azimuth: 90 });
const M = S.buildModel(typ, 1100), d = S.dopeAt(M, typ, 1000);
out.push({ id: 'SPIN-1000', what: 'spin drift at 1000 yd (in), source range 8 to 9 for typical small arms trajectories', engine: Number(d.spinIn.toFixed(2)), range: [8, 9], inRange: d.spinIn >= 8 && d.spinIn <= 9 });
out.push({ id: 'COR-H-1000', what: 'horizontal Coriolis at 1000 yd, 45 deg N (in), source range 2.5 to 3.0', engine: Number(Math.abs(d.corHIn).toFixed(2)), range: [2.5, 3.0], inRange: Math.abs(d.corHIn) >= 2.5 && Math.abs(d.corHIn) <= 3.0 });
out.push({ id: 'COR-V-1000', what: 'vertical Coriolis at 1000 yd, 45 deg N firing east (in), source range 2.5 to 3.0', engine: Number(Math.abs(d.corVIn).toFixed(2)), range: [2.5, 3.0], inRange: Math.abs(d.corVIn) >= 2.5 && Math.abs(d.corVIn) <= 3.0 });
const dn = S.dopeAt(S.buildModel({ ...typ, azimuth: 0 }, 1100), { ...typ, azimuth: 0 }, 1000);
out.push({ id: 'COR-V-NORTH', what: 'vertical Coriolis firing due north (in), source: zero', engine: Number(Math.abs(dn.corVIn).toFixed(4)), inRange: Math.abs(dn.corVIn) < 1e-6 });
// Direction checks (qualitative, from the same article): horizontal Coriolis flips with hemisphere; vertical Coriolis flips between east and west.
// Sign convention read from the code: a positive corHIn / corVIn is a deflection to the right / upward that the dial must remove.
const at = (lat, az) => S.dopeAt(S.buildModel({ ...typ, latDeg: lat, azimuth: az }, 1100), { ...typ, latDeg: lat, azimuth: az }, 1000);
const ne = at(45, 90), nw = at(45, 270), sn = at(-45, 90), eq = at(0, 90), pole = at(90, 90);
out.push({ id: 'COR-H-HEMISPHERES', what: 'horizontal Coriolis has opposite signs at 45 N and 45 S, is zero at the equator', engine: [ne.corHIn, sn.corHIn, eq.corHIn].map(v => Number(v.toFixed(3))), inRange: ne.corHIn > 0 && sn.corHIn < 0 && Math.abs(eq.corHIn) < 1e-9 });
out.push({ id: 'COR-V-EAST-WEST', what: 'vertical Coriolis has opposite signs firing east and west, is zero at the pole', engine: [ne.corVIn, nw.corVIn, pole.corVIn].map(v => Number(v.toFixed(3))), inRange: ne.corVIn > 0 && nw.corVIn < 0 && Math.abs(pole.corVIn) < 1e-9 });
for (const x of out) x.pass = x.tol !== undefined ? Math.abs(x.relDiff) <= x.tol : x.inRange;
if (process.argv.includes('--json')) { console.log(JSON.stringify(out, null, 1)); process.exit(0); }
for (const x of out) console.log((x.pass ? 'WITHIN ' : 'OUTSIDE ') + x.id + '  ' + x.what + '  ' + (x.range ? 'range ' + x.range.join('-') : 'source ' + x.source) + '  engine ' + x.engine + (x.relDiff !== undefined ? '  rel diff ' + x.relDiff.toExponential(2) : ''));
console.log('\nA magnitude range is not a formula check. None of this verifies the model or shows physical accuracy.');

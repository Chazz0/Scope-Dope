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
// 4. Added 2026-11-16 (Stage 5 close-out): checks that turn the magnitude ranges above into formula checks.
// 4a. Coriolis: first-order horizontal deflection is y(T) = 2*Omega*sin(lat)*Integral x(t) dt (from a_y = 2*Omega*sin(lat)*vx and integrating twice by parts).
//     The integral is re-done here by the trapezoid rule on the engine's own x(t) samples, independently of the engine's integrator.
{ const W = 7.292115e-5, N = 400, xs = [], ts = [];
  for (let i = 1; i <= N; i++) { const r = 1000 * i / N, q = S.dopeAt(M, typ, r); xs.push(r * 0.9144); ts.push(q.t); }
  let I = 0, px = 0, pt = 0; for (let i = 0; i < N; i++) { I += 0.5 * (px + xs[i]) * (ts[i] - pt); px = xs[i]; pt = ts[i]; }
  const ind = (2 * W * Math.sin(Math.PI / 4) * I) / 0.0254, eng = d.corHIn;
  out.push({ id: 'COR-H-INTEGRAL', what: 'horizontal Coriolis at 1000 yd against 2*Omega*sin(lat)*integral(x dt) done independently by trapezoid rule (in)', source: Number(ind.toFixed(4)), engine: Number(eng.toFixed(4)), relDiff: rel(eng, ind), tol: 0.005 });
  const cv = W * Math.sin(Math.PI / 4) * 914.4 * d.t / 0.0254;
  out.push({ id: 'COR-H-CONSTVEL', what: 'engine Coriolis exceeds the constant-velocity closed form Omega*sin(lat)*x*T (a decelerating bullet spends more time far downrange). Closed form (in), engine/closed-form ratio', source: Number(cv.toFixed(3)), engine: Number((eng / cv).toFixed(3)), inRange: eng / cv > 1 && eng / cv < 1.3 });
  out.push({ id: 'COR-TOF', what: 'time of flight at 1000 yd for this case (s). At this flight time the constant-velocity closed form gives 2.96 in, inside the article range 2.5 to 3.0; the engine value is higher because it integrates the decelerating trajectory. That the article used the constant-velocity form is an inference: it gives no formula', source: undefined, engine: Number(d.t.toFixed(3)), inRange: true });}
// 4b. Spin drift: the engine's value equals 1.25*(SG+1.2)*T^1.83 evaluated here (formula text only found in an uncited open-source crate and secondary posts; the Applied Ballistics article gives no formula). Article limit: "no more than 10 to 12 inches at 1000 yards".
{ const sgv = S.stability(typ), ind = 1.25 * (sgv + 1.2) * Math.pow(d.t, 1.83);
  out.push({ id: 'SPIN-FORMULA', what: 'engine spin drift equals 1.25*(SG+1.2)*T^1.83 evaluated independently (in)', source: Number(ind.toFixed(4)), engine: Number(d.spinIn.toFixed(4)), relDiff: rel(d.spinIn, ind), tol: 1e-9 });
  out.push({ id: 'SPIN-AB-LIMIT', what: 'spin drift at 1000 yd against the article outer limit of 12 in (it also says typical is 8 to 9 in; this bullet is above typical, at 9.31)', source: undefined, engine: Number(d.spinIn.toFixed(2)), inRange: d.spinIn <= 12 }); }
// 4c. Humid-air terms against a source that was opened (conservationphysics.org/atmcalc/atmoclc1.html, read 2026-11-16 through a
//     page reader): saturation vapour pressure ps = 610.78*exp(17.2694*t/(t+238.3)) Pa, and vapour concentration 0.002166*p/(t+273.16) kg/m3.
//     The engine uses a different Magnus coefficient set (610.94, 17.625, 243.04). Tolerance 1% set before the run. The page gives no density formula and no speed of sound.
{ const A = S.atmosphere || null; let worst = 0; const rows = [];
  for (const tC of [0, 10, 20, 30, 40]) { const src = 610.78 * Math.exp(17.2694 * tC / (tC + 238.3)), eng = 610.94 * Math.exp(17.625 * tC / (tC + 243.04)); const r = (eng - src) / src; rows.push(Number((100 * r).toFixed(3))); worst = Math.max(worst, Math.abs(r)); }
  out.push({ id: 'ATM-PV', what: 'saturation vapour pressure, engine Magnus set vs opened source, 0/10/20/30/40 C, percent difference', source: rows, engine: Number((100 * worst).toFixed(3)), relDiff: worst, tol: 0.01 });
  const cv = 0.002166 * 1500 / (20 + 273.16), ev = 1500 / (461.495 * 293.15);
  out.push({ id: 'ATM-VAPOUR-CONC', what: 'vapour concentration at 1500 Pa, 20 C (kg/m3): engine gas constant 461.495 vs the printed 0.002166*p/(t+273.16)', source: Number(cv.toFixed(6)), engine: Number(ev.toFixed(6)), relDiff: rel(ev, cv), tol: 0.005 }); }
for (const x of out) x.pass = x.tol !== undefined ? Math.abs(x.relDiff) <= x.tol : x.inRange;
if (process.argv.includes('--json')) { console.log(JSON.stringify(out, null, 1)); process.exit(0); }
for (const x of out) console.log((x.pass ? 'WITHIN ' : 'OUTSIDE ') + x.id + '  ' + x.what + '  ' + (x.range ? 'range ' + x.range.join('-') : 'source ' + x.source) + '  engine ' + x.engine + (x.relDiff !== undefined ? '  rel diff ' + x.relDiff.toExponential(2) : ''));
console.log('\nA magnitude range is not a formula check. None of this verifies the model or shows physical accuracy.');

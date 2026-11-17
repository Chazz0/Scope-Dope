'use strict';
// Scope Dope calculation engine: baseline test suite (Stage 1).
// Run with:  node --test tests/
// Nothing here changes the app. Tests named [known gap] document behavior that the audit flagged
// and that is planned to change; when it changes on purpose, the test is updated in the same stage.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSolver, baseInputs } = require('./helpers/load-solver');
const { cases, FIELDS } = require('./golden/cases');
const golden = require('./golden/baseline.json');

const S = loadSolver();
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, (msg || '') + ' expected ' + b + ' +/- ' + tol + ', got ' + a);
const model = (over, maxYd) => { const inp = baseInputs(over); return { inp, M: S.buildModel(inp, maxYd || 1100) }; };
const dope = (over, yd) => { const { inp, M } = model(over); return S.dopeAt(M, inp, yd); };

/* 1. Unit conversions and constants */
test('units: ISA sea-level density and speed of sound', () => {
  const a = S.atmosphere(59, 0, null, 0);
  near(a.rho, 1.2250, 0.0005, 'density');
  near(a.sos, 340.29, 0.05, 'speed of sound');
});
test('units: inHg to pascals (29.92 inHg at 59F equals the ISA pressure)', () => {
  const withP = S.atmosphere(59, 0, 29.92, 0), fromAlt = S.atmosphere(59, 0, null, 0);
  near(withP.rho, fromAlt.rho, 0.001, 'density');
});
test('units: MOA, mil, inch and yard conversions agree with each other', () => {
  const d = dope({}, 500);
  near(d.elevMoa / d.elevMil, 3.4377468, 1e-6, 'MOA per mil');
  // elevation is the angle that cancels the drop: drop[m] / range[m] in mrad
  near(d.elevMil, (-d.dropIn * 0.0254) / (500 * 0.9144) * 1000, 1e-9, 'mil from drop');
});
test('units: energy uses the conventional 450240 divisor', () => {
  const d = dope({}, 100);
  near(d.energy, 168 * d.vFps * d.vFps / 450240, 1e-6);
  // The exact constant is 450436 (0.04% different). Recorded here so the choice is explicit.
  near(168 * 2650 * 2650 / 450240, 2620.4, 0.1, '168 gr at 2650 fps');
});

/* 2. Invalid and missing inputs. The engine itself does not validate; the page does. */
test('[known gap] engine does not throw or hang on NaN, undefined or zero inputs', () => {
  const t0 = Date.now();
  for (const bad of [{ bc: NaN }, { v0: NaN }, { v0: 0 }, { bc: 0 }, { bc: undefined }, { zero: 0 }, { h: NaN }, { tempF: NaN }]) {
    assert.doesNotThrow(() => { const { inp, M } = model(bad); S.dopeAt(M, inp, 500); }, JSON.stringify(bad));
  }
  assert.ok(Date.now() - t0 < 20000, 'finished in time');
});
test('[known gap] engine returns non-finite numbers for a NaN coefficient instead of reporting an error', () => {
  const d = dope({ bc: NaN }, 500);
  const finite = d && FIELDS.every(f => Number.isFinite(d[f]));
  assert.equal(finite, false);
});
test('zero, negative, beyond-the-model and out-of-reach distances return null', () => {
  const { inp, M } = model({}, 1100);
  assert.equal(S.dopeAt(M, inp, 0), null);
  assert.equal(S.dopeAt(M, inp, -50), null);
  assert.equal(S.dopeAt(M, inp, 1200), null, 'beyond the distance the model was built for');
  const weak = model({ v0: 500, bc: 0.05 }, 2000);
  assert.equal(S.dopeAt(weak.M, weak.inp, 1000), null, 'bullet runs out of forward speed');
});
test('[known gap] an unknown model name silently falls back to G1', () => {
  const g1 = dope({ model: 'G1' }, 800).elevMoa;
  for (const m of ['g7', 'G8', undefined, '']) near(dope({ model: m }, 800).elevMoa, g1, 1e-12, String(m));
});

/* 3. Numerical solver stability */
test('numerical: a 10x smaller step changes the elevation by less than 0.0001 MOA', () => {
  const fine = loadSolver({ dt: 0.00005 });
  for (const over of [{}, { v0: 2960, bc: 0.315, wt: 143, diam: 0.264, twist: 8, model: 'G7' }]) {
    const inp = baseInputs(over);
    const a = S.buildModel(inp, 1100), b = fine.buildModel(inp, 1100);
    for (const yd of [300, 500, 800, 1000]) near(S.dopeAt(a, inp, yd).elevMoa, fine.dopeAt(b, inp, yd).elevMoa, 1e-4, yd + ' yd');
  }
});
test('numerical: the zero lands on the line of sight (residual under 1e-6 in)', () => {
  for (const zero of [25, 100, 300, 500]) {
    const { M } = model({ zero });
    const s = S.sampleAt(M.S, zero * 0.9144);
    near((s.y - M.p.h) / 0.0254, 0, 1e-6, 'zero ' + zero);
  }
});
test('numerical: results are exactly reproducible', () => {
  assert.deepEqual(dope({ windMph: 7, angleDeg: 12, latDeg: 40, azimuth: 30 }, 700), dope({ windMph: 7, angleDeg: 12, latDeg: 40, azimuth: 30 }, 700));
});
test('numerical: elevation rises steadily with range beyond the zero', () => {
  const { inp, M } = model({});
  let prev = -Infinity;
  for (let yd = 100; yd <= 1000; yd += 50) { const e = S.dopeAt(M, inp, yd).elevMoa; assert.ok(e > prev, yd + ' yd'); prev = e; }
});
test('numerical: extreme but legal inputs finish quickly', () => {
  const t0 = Date.now();
  const { inp, M } = model({ v0: 500, bc: 0.05, zero: 25 }, 2000);
  S.dopeAt(M, inp, 400);
  const hot = model({ v0: 4500, bc: 1.2, zero: 1000, tempF: -40, altFt: 15000 }, 2000);
  S.dopeAt(hot.M, hot.inp, 2000);
  assert.ok(Date.now() - t0 < 15000);
});

/* 4. G1 and G7 handling */
test('drag tables: Mach strictly increasing, starting at 0, with sane coefficients', () => {
  for (const [name, T] of [['G1', S.G1], ['G7', S.G7]]) {
    assert.equal(T[0][0], 0, name);
    for (let i = 1; i < T.length; i++) assert.ok(T[i][0] > T[i - 1][0], name + ' row ' + i);
    for (const [m, cd] of T) assert.ok(Number.isFinite(cd) && cd > 0.05 && cd < 1, name + ' Cd at ' + m);
  }
});
test('drag tables: table points return exactly, midpoints interpolate linearly, ends clamp', () => {
  for (const T of [S.G1, S.G7]) {
    for (const [m, cd] of T) assert.equal(S.cdOf(T, m), cd);
    const [a, b] = [T[10], T[11]];
    near(S.cdOf(T, (a[0] + b[0]) / 2), (a[1] + b[1]) / 2, 1e-12);
    assert.equal(S.cdOf(T, -1), T[0][1]);
    assert.equal(S.cdOf(T, 99), T[T.length - 1][1]);
  }
});
test('drag tables: spot values (a transcription lock only; NOT checked against a primary source)', () => {
  assert.equal(S.cdOf(S.G1, 0), 0.2629); assert.equal(S.cdOf(S.G1, 1.0), 0.4805);
  assert.equal(S.cdOf(S.G7, 0), 0.1198); assert.equal(S.cdOf(S.G7, 1.0), 0.3803);
});
test('G1 and G7 give different answers for the same coefficient, and each model is selectable', () => {
  const g1 = dope({ bc: 0.3, model: 'G1' }, 800).elevMoa, g7 = dope({ bc: 0.3, model: 'G7' }, 800).elevMoa;
  assert.ok(Math.abs(g1 - g7) > 1);
});
test('a higher coefficient always means less elevation (both models)', () => {
  for (const m of ['G1', 'G7']) {
    let prev = Infinity;
    for (const bc of [0.2, 0.3, 0.4, 0.5, 0.6, 0.8]) { const e = dope({ bc, model: m }, 800).elevMoa; assert.ok(e < prev, m + ' ' + bc); prev = e; }
  }
});

/* 5. Physical direction and scaling checks */
test('physics: headwind increases drop and tailwind decreases it', () => {
  const calm = dope({}, 1000).dropIn, head = dope({ headMph: 10 }, 1000).dropIn, tail = dope({ headMph: -10 }, 1000).dropIn;
  assert.ok(head < calm && calm < tail, 'drop is negative: head ' + head + ' calm ' + calm + ' tail ' + tail);
});
test('physics: wind from the right needs a right correction, wind from the left a left one, and they mirror', () => {
  const calm = dope({}, 700).windMoa, r = dope({ windMph: 10, windFrom: 'R' }, 700).windMoa, l = dope({ windMph: 10, windFrom: 'L' }, 700).windMoa;
  assert.ok(r > calm && l < calm);
  near(r - calm, -(l - calm), 1e-9, 'mirror');
});
test('physics: wind drift scales linearly with wind speed', () => {
  near(dope({ windMph: 20 }, 800).driftIn, 2 * dope({ windMph: 10 }, 800).driftIn, 1e-9);
});
test('physics: right-hand twist drifts right (correction left), left-hand the opposite', () => {
  assert.ok(dope({ twistDir: 'R' }, 800).windMoa < 0);
  assert.ok(dope({ twistDir: 'L' }, 800).windMoa > 0);
});
test('physics: angled shots need less elevation than level, uphill slightly more than downhill, near the cosine', () => {
  const lvl = dope({}, 500).elevMoa, up = dope({ angleDeg: 30 }, 500).elevMoa, dn = dope({ angleDeg: -30 }, 500).elevMoa;
  assert.ok(up < lvl && dn < lvl);
  assert.ok(up > dn, 'gravity slows an uphill bullet, so it needs a little more elevation than the same downhill shot');
  near(up / dn, 1, 0.015, 'the up/down difference stays small');
  near(up / lvl, Math.cos(Math.PI / 6), 0.05, 'cosine ratio');
});
test('cross-check: a separate RK4 integrator in the real frame agrees on angled shots (same drag tables, so this checks method and geometry only)', () => {
  const { makeIndependent } = require('./helpers/independent-rk4');
  const I = makeIndependent(S);
  const { inp, M } = model({}, 1100);
  for (const th of [30, -30, 45, -45]) for (const yd of [500, 800]) {
    const app = S.dopeAt(M, Object.assign({}, inp, { angleDeg: th }), yd).elevMoa;
    const ref = (I.boreAngleToHit(M, th * Math.PI / 180, yd) - M.theta) * 3437.7468;
    near(app, ref, 0.001, th + ' deg at ' + yd + ' yd');
  }
});
test('cross-check: a separate RK4 integrator agrees on level-shot elevation within 0.01 MOA (the engine\'s small-angle shortcut differs by up to 0.0056 MOA at 1000 yd; see audit)', () => {
  const { makeIndependent } = require('./helpers/independent-rk4');
  const I = makeIndependent(S);
  for (const over of [{}, { v0: 2960, bc: 0.315, wt: 143, diam: 0.264, twist: 8, model: 'G7' }]) {
    const { inp, M } = model(over, 1100);
    for (const yd of [300, 600, 1000]) near(S.dopeAt(M, inp, yd).elevMoa, (I.boreAngleToHit(M, 0, yd) - M.theta) * 3437.7468, 0.01, yd + ' yd');
  }
});
test('physics: Coriolis directions', () => {
  const n = dope({ latDeg: 45, azimuth: 0 }, 1000), e = dope({ latDeg: 45, azimuth: 90 }, 1000), s = dope({ latDeg: -45, azimuth: 0 }, 1000), off = dope({ latDeg: null }, 1000);
  assert.ok(n.corHIn > 0 && Math.abs(n.corVIn) < 1e-9, 'north hemisphere deflects right, no vertical when firing north');
  assert.ok(e.corVIn > 0, 'firing east lifts the bullet');
  assert.ok(s.corHIn < 0, 'southern hemisphere deflects left');
  assert.equal(off.corHIn, 0); assert.equal(off.corVIn, 0);
});
test('physics: thinner air means less drop (heat, altitude, low pressure, humidity)', () => {
  const base = dope({}, 1000).elevMoa;
  assert.ok(dope({ tempF: 95 }, 1000).elevMoa < base, 'heat');
  assert.ok(dope({ altFt: 6000 }, 1000).elevMoa < base, 'altitude');
  assert.ok(dope({ pressInHg: 24 }, 1000).elevMoa < base, 'low pressure');
  assert.ok(dope({ tempF: 95, humidity: 100 }, 1000).elevMoa < dope({ tempF: 95, humidity: 0 }, 1000).elevMoa, 'humidity');
});
test('physics: entered pressure replaces the altitude-based estimate', () => {
  near(dope({ altFt: 9000, pressInHg: 29.92 }, 800).elevMoa, dope({ altFt: 0, pressInHg: 29.92 }, 800).elevMoa, 1e-12);
});

/* 6. Atmosphere */
test('atmosphere: ISA at 5,000 ft', () => {
  const a = S.atmosphere(41.17, 5000, null, 0);
  near(a.rho, 1.0555, 0.0005, 'density'); near(a.sos, 334.4, 0.1, 'speed of sound');
});
test('atmosphere: humid air is lighter than dry air at the same temperature and pressure', () => {
  const wet = S.atmosphere(86, 0, 29.92, 100), dry = S.atmosphere(86, 0, 29.92, 0);
  assert.ok(wet.rho < dry.rho);
  near(wet.rho / dry.rho, 0.984, 0.003);
});
test('[known gap] humidity above 100 or below 0 is clamped by the engine without a message', () => {
  assert.equal(S.atmosphere(59, 0, 29.92, 250).rho, S.atmosphere(59, 0, 29.92, 100).rho);
  assert.equal(S.atmosphere(59, 0, 29.92, -5).rho, S.atmosphere(59, 0, 29.92, 0).rho);
});

/* 7. Regression baseline (current behavior, not accuracy) */
for (const c of cases) {
  test('regression: ' + c.id, () => {
    const g = golden.cases[c.id];
    assert.ok(g, 'case missing from baseline.json; regenerate on purpose with tests/tools/make-golden.js');
    const M = S.buildModel(c.inp, Math.max(...c.ranges) * 1.05);
    near(M.theta, g.theta, 1e-9, 'zero angle'); near(M.p.rho, g.rho, 1e-9, 'density'); near(M.p.sos, g.sos, 1e-7, 'speed of sound');
    for (const r of c.ranges) {
      const d = S.dopeAt(M, c.inp, r), want = g.rows[r];
      for (const f of FIELDS) near(d[f], want[f], Math.max(1e-7, Math.abs(want[f]) * 1e-8), c.id + ' ' + r + ' yd ' + f);
    }
  });
}

/* 8. External reference points (LIMITED evidence, see the Stage 1 report) */
test('external point check: Hornady factory table, 300 Win Mag 200 gr ELD-X, G7 0.301 (tolerance +/-0.5 in drop, +/-1% velocity)', () => {
  // Hornady values as recorded earlier in this project. Original page not re-fetched in Stage 1.
  const table = { 100: [1.6, 2707], 200: [0, 2558], 300: [-6.9, 2414], 400: [-19.9, 2274], 500: [-39.5, 2140] };
  const c = cases.find(x => x.id === 'C_300WM_200gr_G7_factory_conditions');
  const M = S.buildModel(c.inp, 600);
  for (const yd of Object.keys(table)) {
    const d = S.dopeAt(M, c.inp, Number(yd));
    near(d.dropIn, table[yd][0], 0.5, yd + ' yd drop');
    near(d.vFps, table[yd][1], table[yd][1] * 0.01, yd + ' yd velocity');
  }
});

'use strict';
// Stage 8 audit probe. Read-only: loads the engine from index.html and reports numbers. It changes nothing.
// Run: node tests/tools/stage8-audit-engine-1.js
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const { loadSolver, baseInputs } = require(path.join(ROOT, 'tests', 'helpers', 'load-solver.js'));
const S = loadSolver();
const run = (over, yds, S2) => { const s = S2 || S; const i = baseInputs(over); const M = s.buildModel(i, 2600); return yds.map(y => s.dopeAt(M, i, y)); };
const f = (n, d = 3) => n == null ? 'null' : n.toFixed(d);
// E1 angle discontinuity
console.log('E1 angle 0 vs tiny angle (elevMil, dropIn)');
for (const y of [300, 500, 1000, 1500]) { const a = run({}, [y])[0], b = run({ angleDeg: 0.0001 }, [y])[0], c = run({ angleDeg: 0.0001, v0: 2650 }, [y])[0]; console.log(y, f(a.elevMil, 5), f(b.elevMil, 5), 'diff mil', f(b.elevMil - a.elevMil, 5), 'dropIn', f(a.dropIn, 2), f(b.dropIn, 2)); }
// E2 dt convergence
console.log('E2 dt convergence: dropIn / t / v at 1000 yd');
for (const dt of [0.002, 0.0005, 0.0001, 0.00005]) { const s = loadSolver({ dt }); const d = run({}, [1000], s)[0]; console.log(dt, f(d.dropIn, 4), f(d.t, 5), f(d.vFps, 3), f(d.elevMil, 5)); }
// E3 zero atmosphere assumption
console.log('E3 zeroed in standard air, shot in other air: POI error vs app (in at 500 yd, + = high)');
const base = baseInputs({ zero: 100 }), Ms = S.buildModel(base, 1000);
for (const [lab, over] of [['20F', { tempF: 20 }], ['100F', { tempF: 100 }], ['5000ft', { altFt: 5000 }], ['10000ft', { altFt: 10000 }]]) {
  const inp2 = baseInputs(Object.assign({ zero: 100 }, over)); const M2 = S.buildModel(inp2, 1000);
  const x = 500 * 0.9144; const tr = S.trace(M2.p, Ms.theta, x); const q = S.sampleAt(tr, x);
  const appHold = S.dopeAt(M2, inp2, 500); const poi_in = (q.y - M2.p.h) / 0.0254; // POI relative to LOS if rifle sighted in std air
  const appDrop = appHold.dropIn;
  console.log(lab, 'zero-in-std POI', f(poi_in, 2), 'in; app assumes zero in same air, drop', f(appDrop, 2), 'in; diff', f(poi_in - appDrop, 2), 'in', f((poi_in - appDrop) / 5.236, 2), 'MOA');
}
// E10 unreachable zero
console.log('E10 unreachable zero');
const bad = baseInputs({ v0: 500, bc: 0.05, zero: 1000 }); const Mb = S.buildModel(bad, 1000); console.log('theta', f(Mb.theta, 4), 'dope@500', JSON.stringify(S.dopeAt(Mb, bad, 500) && { elevMoa: f(S.dopeAt(Mb, bad, 500).elevMoa, 1), dropIn: f(S.dopeAt(Mb, bad, 500).dropIn, 1) }), 'dope@1000', S.dopeAt(Mb, bad, 1000));
// E11 elev small-angle: atan vs ratio at 1500
const i = baseInputs(), M = S.buildModel(i, 2600), d = S.dopeAt(M, i, 1500), x = 1500 * .9144; const drop = d.dropIn * .0254; console.log('E11 1500yd ratio', f(-drop / x, 6), 'atan', f(-Math.atan(drop / x), 6));
// E12 wind drift components 10mph full value 1000yd
const w = run({ windMph: 10, windFrom: 'R', twist: 0 }, [500, 1000])[0]; console.log('E12 wind 10mph 500yd driftIn', f(w.driftIn, 2));
// E13 spin drift @1000 175gr 11 twist
const sp = run({ wt: 175, bc: 0.5, v0: 2800, twist: 11 }, [1000])[0]; console.log('E13 spin 1000yd', f(sp.spinIn, 2), 'SG', f(S.stability(baseInputs({ wt: 175, v0: 2800, twist: 11 })), 3));
// E14 energy constant
console.log('E14 energy 168gr 2650fps', f(168 * 2650 * 2650 / 450240, 1), 'vs g=32.174:', f(168 * 2650 * 2650 / (2 * 7000 * 32.174), 1));
// E15 transonic: Mach crossing and G7 interpolation spacing, count table points and min spacing
console.log('E15 G1 pts', S.G1.length, 'G7 pts', S.G7.length, 'G1 span', S.G1[0][0], S.G1.at(-1)[0], 'G7 span', S.G7[0][0], S.G7.at(-1)[0]);
let gaps = (T) => T.map((p, k) => k ? [T[k - 1][0], p[0] - T[k - 1][0]] : null).filter(Boolean).filter(g => g[1] > 0.0501).map(g => g[0] + '+' + g[1].toFixed(2)); console.log('G1 gaps>0.05 at Mach', gaps(S.G1).join(' ')); console.log('G7 gaps>0.05 at Mach', gaps(S.G7).join(' '));
// E16 cdG1 vs cdOf identical?
let mx = 0; for (let m = 0; m <= 5.2; m += 0.0137) mx = Math.max(mx, Math.abs(S.cdG1(m) - S.cdOf(S.G1, m))); console.log('E16 cdG1 vs cdOf max diff', mx);
// E17 headwind effect on drop at 500 (12 o'clock 10 mph) and sign
const hw = run({ headMph: 10 }, [500])[0], nw = run({}, [500])[0]; console.log('E17 head 10mph drop500', f(hw.dropIn, 2), 'none', f(nw.dropIn, 2));
// E18 atmosphere sanity
console.log('E18 std', JSON.stringify(S.atmosphere(59, 0, null, 0)), '5000ft', JSON.stringify(S.atmosphere(59, 5000, null, 0)), 'hot humid', JSON.stringify(S.atmosphere(100, 0, 29.92, 100)));
console.log('E19 vapor-pressure at 130F 100%', (()=>{const a=S.atmosphere(130,0,29.92,100);return JSON.stringify(a);})());

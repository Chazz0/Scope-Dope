'use strict';
// Stage 8 audit probe. Read-only: loads the engine from index.html and reports numbers. It changes nothing.
// Run: node tests/tools/stage8-audit-engine-2.js
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const { loadSolver, baseInputs } = require(path.join(ROOT, 'tests', 'helpers', 'load-solver.js'));
const S = loadSolver(); const f=(n,d=2)=>n.toFixed(d);
console.log('Zero 500 yd, zeroed in std air, shot in other air, POI at 1000 yd (in, MOA)');
const base = baseInputs({ zero: 500 }), Ms = S.buildModel(base, 1200);
for (const [lab, over] of [['20F',{tempF:20}],['100F',{tempF:100}],['5000ft',{altFt:5000}],['10000ft',{altFt:10000}]]) {
  const i2 = baseInputs(Object.assign({zero:500}, over)), M2 = S.buildModel(i2, 1200), x = 1000*.9144;
  const q = S.sampleAt(S.trace(M2.p, Ms.theta, x), x), app = S.dopeAt(M2, i2, 1000);
  const d = (q.y - M2.p.h)/.0254 - app.dropIn; console.log(lab, 'diff', f(d), 'in =', f(d/10.472), 'MOA');
}
console.log('Where does zero become unreachable (theta hits bracket 0.35)? realistic loads');
for (const [lab, o] of [['22LR 1050fps G1 .12 zero 300',{v0:1050,bc:.12,zero:300,diam:.224,wt:40}],['22LR 1050 .12 zero 1000',{v0:1050,bc:.12,zero:1000,diam:.224,wt:40}],['9mm 1150 .15 zero 1000',{v0:1150,bc:.15,zero:1000}],['500fps .05 zero 600',{v0:500,bc:.05,zero:600}]]) {
  const i = baseInputs(o), M = S.buildModel(i, 1200); console.log(lab, 'theta', f(M.theta,4));
}
console.log('Mach near 1: Cd spacing effect, G7 linear interp vs table nodes: nodes at .95,.975,1.0 =', S.G7.filter(p=>p[0]>=.95&&p[0]<=1.05).map(p=>p.join(':')).join(' '));
const i = baseInputs({model:'G7',bc:.27,v0:2800,wt:140,diam:.264}), M = S.buildModel(i, 2600);
console.log('G7 .27 2800fps: sonic distance (yd)', (()=>{const S2=M.S;for(let k=0;k<S2.vs.length;k++) if(S2.vs[k]/M.p.sos<1) return f(S2.xs[k]/.9144,0);})());
// BC weight scaling magnitude: 168->190 at BC .462
console.log('BC scaling 168->190 gr: .462 ->', (0.462*190/168).toFixed(3));
// default humidity effect
const a=S.atmosphere(59,0,null,50).rho, b=S.atmosphere(59,0,null,0).rho; console.log('50% RH vs dry density', ((a/b-1)*100).toFixed(2)+'%');

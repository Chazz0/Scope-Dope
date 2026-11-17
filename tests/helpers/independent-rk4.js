'use strict';
// A second, separately written trajectory integrator used only by the tests.
// It uses a fourth-order Runge-Kutta step and works in the real, un-rotated frame with gravity
// pointing straight down, so it cross-checks the engine's integration method and its angled-shot
// geometry. It deliberately shares the engine's drag tables and atmosphere (it calls the same
// cdOf, G1/G7 and atmosphere), so it does NOT check those. It is not an independent validation.
const G = 9.80665;

function makeIndependent(S) {
  const deriv = (p) => (vx, vy) => {
    const v = Math.hypot(vx, vy);
    const k = (Math.PI / 8) * p.rho * S.cdOf(p.tbl, v / p.sos) * v / p.bcSI;
    return [-k * vx, -k * vy - G];
  };
  // Height of the bullet above the muzzle when it first reaches horizontal distance Px.
  function heightAt(p, psi, Px, dt) {
    const f = deriv(p);
    let x = 0, y = 0, vx = p.v0 * Math.cos(psi), vy = p.v0 * Math.sin(psi), px = 0, py = 0;
    while (x < Px && vx > 15) {
      px = x; py = y;
      const a1 = f(vx, vy), a2 = f(vx + a1[0] * dt / 2, vy + a1[1] * dt / 2), a3 = f(vx + a2[0] * dt / 2, vy + a2[1] * dt / 2), a4 = f(vx + a3[0] * dt, vy + a3[1] * dt);
      const k2x = vx + a1[0] * dt / 2, k2y = vy + a1[1] * dt / 2, k3x = vx + a2[0] * dt / 2, k3y = vy + a2[1] * dt / 2, k4x = vx + a3[0] * dt, k4y = vy + a3[1] * dt;
      x += dt / 6 * (vx + 2 * k2x + 2 * k3x + k4x); y += dt / 6 * (vy + 2 * k2y + 2 * k3y + k4y);
      vx += dt / 6 * (a1[0] + 2 * a2[0] + 2 * a3[0] + a4[0]); vy += dt / 6 * (a1[1] + 2 * a2[1] + 2 * a3[1] + a4[1]);
    }
    if (x < Px) return -1e9;
    return py + (y - py) * (Px - px) / (x - px);
  }
  // Bore angle (relative to the line of sight) needed to hit the line of sight at slant range
  // rangeYd. The scope sits scopeHeight above the bore, perpendicular to the line of sight.
  function boreAngleToHit(model, thetaRad, rangeYd) {
    const p = model.p, X = rangeYd * 0.9144, dt = 0.0002;
    const Sx = -p.h * Math.sin(thetaRad), Sy = p.h * Math.cos(thetaRad);
    const Px = Sx + X * Math.cos(thetaRad), Py = Sy + X * Math.sin(thetaRad);
    let lo = thetaRad - 0.02, hi = thetaRad + 0.25;
    for (let i = 0; i < 50; i++) { const mid = (lo + hi) / 2; if (heightAt(p, mid, Px, dt) < Py) lo = mid; else hi = mid; }
    return (lo + hi) / 2 - thetaRad;
  }
  return { boreAngleToHit };
}
module.exports = { makeIndependent };

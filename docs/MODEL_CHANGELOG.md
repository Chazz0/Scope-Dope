# Calculation model changelog

Every change to a calculated number needs a new version here, a regenerated
`tests/golden/baseline.json`, and a reason. `tests/model-version.test.js` fails if the
engine version, the baseline and this file disagree.

A version number records which calculation produced a result. It does not say the result is
accurate. See `docs/MODEL_SOURCES.md` for what is tested, verified and unverified.

## 1.0.0

First numbered version. It names the calculation exactly as it stood on `main` (b8ad09a)
with the Stage 4 removal of the moving-target lead fields.

No calculated value changed. Numbers changed: none. The 3000-input comparison against the
Stage 3 engine was bit-identical for every field except the removed lead fields.

Contents of this version: point-mass drag using the G1 or G7 table in `index.html`, RK2
integration at a 0.5 ms step, moist-air density with an ISA fallback, lag-time crosswind,
Litz spin drift, first-order Coriolis, and the Miller stability estimate.

# Model sources: Stage 10 addendum

This file sits next to `docs/MODEL_SOURCES.md`, which is not edited in Stage 10 (earlier guard tests pin it unchanged, and Stage 10 does not rewrite existing conclusions). Read it together with that file.

## What changed in the source picture (2026-11-17)

The statements in `docs/MODEL_SOURCES.md` are not rewritten. This addendum records what Stage 10 added and why. Full evidence and every link are in `docs/STAGE10_SCIENTIFIC_VERIFICATION.md`.

| Component | Earlier entry | Stage 10 addition and reason |
| --- | --- | --- |
| G1 and G7 drag tables | Unverified | Still **Unverified**. New: three different origin claims found (Lowry 1965 with BRL, SAAMI tables, an Ordnance Department 1924 publication); none could be opened. Interpolation effect measured: at most 0.04 in at 1000 to 1500 yd. |
| Atmosphere (pressure, density, speed of sound) | Unverified | **Partially verified.** The altitude-pressure formula matches the 1976 troposphere as implemented in a public-domain program (0.044% at 15,000 ft); density and speed of sound compared with dry-air tables, Cramer (1993) and an ideal-gas mixture model (at most 0.03 MOA at 1000 yd). The 1976 report itself was not opened. |
| Stability factor (Miller) | Unverified, source not opened | Equation form and constants **verified** against Courtney and Miller, arXiv 1410.5340 (opened). The reason for the change from the earlier row: that paper was read in the Stage 5 formula audit and again now. The assumed bullet length remains **Unverified**, and the paper says the rule assumes a constant-density bullet. |
| Spin drift | Unverified | Still **Unverified**. The primary equation was not opened; the Applied Ballistics paper that was found has no equation. |
| Coriolis | Unverified | **Discrepancy found** (model approximation): the closed form is 14% to 47% larger than a full-vector integration of the same drag model at 500 to 1500 yd, and equal when drag is removed. Not changed. |
| Crosswind lag rule | Unverified | **Partially verified**: matches a 3D point-mass integration to 0.006%. Source not opened; no measured wind data. |
| Angled shots | Unverified | **Partially verified** against a separate inertial-frame solution (1e-5 MOA). The level-shot shortcut differs by up to 0.026 MOA at 1500 yd. |
| Manufacturer reference data | Corroborated by page reads | Two original manufacturer pages re-read: agree with the stored values. Still a summarizing reader, not raw pages. |

Physical accuracy: NOT DEMONSTRATED.


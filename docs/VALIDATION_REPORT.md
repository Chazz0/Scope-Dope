# Validation report: calculated results against published data (preliminary)

Model version 1.0.0. Run date 2026-11-16. Reproduce with `node tests/tools/run-validation.js`
(add `--diagnose` for the diagnostic below). The fuller Stage 5 report is the Claude Doc
"Scope Dope Stage 5 Report (Preliminary)".

**Passing software tests is not proof of ballistic accuracy.** This report compares the engine with the few
published numbers that could be read. It is preliminary, it is not an independent audit, and the accuracy
questions in it are unresolved.

## Result

Of 7 comparisons that could be made, 2 are within the tolerances that were fixed before the run. The two
drag-table points agree. All five Hornady rows disagree. A sixth Hornady row (500 yd) could not be read.

## 1. Standard drag tables, one point each

| Check | Published | Engine | Difference | Within 0.005 |
| --- | --- | --- | --- | --- |
| G1 Cd at Mach 3 | 0.51 | 0.5133 | 0.0033 | yes |
| G7 Cd at Mach 3 | 0.24 | 0.2424 | 0.0024 | yes |

Source: Applied Ballistics, ABDOC130. It names no origin for the tables. One point on each of two tables of
79 and 83 points was checked. The tables remain **Unverified**, and their origin is unknown.

## 2. Hornady 6.5 Creedmoor 140 gr OTM-A (item 81480)

Published inputs: 2700 fps, G1 BC 0.608, 140 gr, 24 in test barrel, muzzle trajectory -1.5 in.
Not published: atmosphere, zero range, drag-model details. Assumed: ICAO standard atmosphere (Hornady states its
BCs are corrected to it), 1.5 in sight height, 0.264 in diameter, and a 50 yd zero inferred from the published
trajectory of 0 at 50 yd.

The project owner viewed the page and confirmed the distance labels: Muzzle, 50, 100, 200, 300, 400 and 500
yards. An earlier reading with 100-yard steps was discarded on that basis. It is kept in
`tests/validation/references.json` as history and is not run.

The numbers themselves were read by a page-reading tool, and their pairing with each distance has **not** been
confirmed against the page. The 500 yd values were not readable.

| Range (yd) | Velocity published (fps) | Engine | Diff | Drop published (in) | Engine (in) | Diff (in) | Within tolerance |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 50 | 2553 | 2624.7 | +2.81% | 0 | 0 | 0 | no |
| 100 | 2412 | 2550.7 | +5.75% | -3.8 | +0.24 | +4.04 | no |
| 200 | 2274 | 2406.3 | +5.82% | -13.7 | -3.37 | +10.33 | no |
| 300 | 2141 | 2266.6 | +5.87% | -30.2 | -12.99 | +17.21 | no |
| 400 | 2013 | 2131.4 | +5.88% | -54.4 | -29.38 | +25.02 | no |
| 500 | not obtained | | | not obtained | | | not compared |

The engine loses 75 fps in the first 50 yd. The numbers as read lose 147 fps in the same distance.

### Diagnostic, not a validation

The G1 BC that would make this engine's velocity equal each published velocity:

| Range (yd) | 50 | 100 | 200 | 300 | 400 |
| --- | --- | --- | --- | --- | --- |
| BC needed | 0.309 | 0.310 | 0.413 | 0.464 | 0.496 |

Hornady's stated BC is 0.608. No single BC fits the published column. That means the published BC, the
published velocities, and this engine are not describing one calculation. It does not say which of the three,
or the transcription, is wrong. It must not be read as a finding that the engine is wrong, or as one that it is right.

## What this does and does not show

- The engine does not reproduce the Hornady numbers as they were read. The cause is unresolved.
- A manufacturer table is usually computed by a BC-based program, so even agreement would show consistency with
  that kind of calculation, not with real bullet flight.
- It covers one bullet, one BC and one velocity, in a standard atmosphere, with no wind.
- It says nothing about wind drift, spin drift, Coriolis, angled shots, altitude, temperature, humidity or long range.

## What would resolve it

1. The owner reads the seven table rows (Muzzle to 500 yd) directly off the Hornady page, so the numbers
   replace the tool-read copy.
2. If the numbers hold, find out how Hornady computes the table (BC type, velocity banding, atmosphere,
   zero) before drawing any conclusion about the engine.
3. Open the primary documents behind the G tables and compare every point, not one.
4. Compare against fired-round data, such as Doppler tracks or measured drop at known ranges.
5. Add more manufacturer tables: G7 bullets, other velocities, altitude, hot and cold air.
6. Have a person who did not write the code review the comparison.

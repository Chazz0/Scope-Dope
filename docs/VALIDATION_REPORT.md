# Validation report: calculated results against published data

Model version 1.0.0. Run date 2026-11-16. Reproduce with `node tests/tools/run-validation.js`.

**Passing software tests is not proof of ballistic accuracy.** This report compares the engine with the
few published numbers that could be read. It is not an independent audit: the person who wrote the
comparison also has the code, and the reference set is small.

## Result in one paragraph

Out of 12 comparisons, 7 are within the tolerances that were fixed before the run. The two drag-table points
agree. One manufacturer table agrees closely if its rows are read as 100-yard steps and disagrees by about 6% if
read as the labels a page reader returned. The page could not be viewed directly, so which reading is right is
**unresolved**. Nothing here moves any component to **Verified** except the unit conversion (see
`docs/MODEL_SOURCES.md`).

## What was compared

### 1. Standard drag tables, one point each

| Check | Published | Engine | Difference | Within 0.005 |
| --- | --- | --- | --- | --- |
| G1 Cd at Mach 3 | 0.51 | 0.5133 | 0.0033 | yes |
| G7 Cd at Mach 3 | 0.24 | 0.2424 | 0.0024 | yes |

Source: Applied Ballistics, ABDOC130, which prints these two values to two decimals and names no
origin for the tables. Both tables have about 80 points. One point each was checked, so the tables remain
**Unverified**.

### 2. Hornady 6.5 Creedmoor 140 gr OTM-A (item 81480)

Published inputs: 2700 fps, G1 BC 0.608, 140 gr, 24 in test barrel, muzzle trajectory -1.5 in.
Not published: atmosphere, zero range, drag-model details. Assumed: ICAO standard atmosphere, 1.5 in sight height,
0.264 in diameter.

**Source problem.** The page text was garbled and the tool that read it labeled the rows Muzzle, 50, 100,
200, 300, 400 yd. The page could not be opened in a browser from here. Both readings were run.

Reading B, rows taken as 100-yard steps with a 100-yard zero:

| Range | Velocity published | Engine | Diff | Drop published (in) | Engine (in) | Diff (in) | Within tolerance |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 100 | 2553 | 2550.7 | -0.09% | 0 | 0 | 0 | yes |
| 200 | 2412 | 2406.3 | -0.24% | -3.8 | -3.85 | -0.05 | yes |
| 300 | 2274 | 2266.6 | -0.33% | -13.7 | -13.71 | -0.01 | yes |
| 400 | 2141 | 2131.4 | -0.45% | -30.2 | -30.34 | -0.14 | yes |
| 500 | 2013 | 2000.9 | -0.60% | -54.4 | -54.63 | -0.23 | yes |

Reading A, rows as labeled by the reader (50 yd zero, rows at 50, 100, 200, 300, 400):
velocity differs by 2.8% to 5.9% and drop by 4 to 25 in at every row. None are within tolerance.

**Why both are shown.** Reading B fits the engine, and that is exactly why it cannot be chosen by the engine's
output. A 147 fps loss in the first 50 yards is not plausible for a 0.608 G1 bullet at 2700 fps, which
points toward B, but that argument uses the same kind of drag model. Someone needs to look at the page.

## What this does and does not show

- Under reading B, the engine reproduces one manufacturer table within 0.6% velocity and 0.25 in drop, to 500 yd.
- A manufacturer table is usually computed by a BC-based program. Agreement shows the engine is consistent
  with that kind of calculation. It does not show agreement with real bullet flight.
- It covers one bullet, one BC, one velocity, a standard atmosphere, no wind, and ranges to 500 yd.
- It says nothing about wind drift, spin drift, Coriolis, angled shots, altitude, temperature, humidity, or
  long range.

## What would make this a real validation

1. Someone views the Hornady page and confirms the row labels.
2. Open the primary documents behind the G tables and compare every table point, not one.
3. Compare against fired-round data, such as published Doppler or measured drop at known ranges.
4. Add manufacturer tables for G7 bullets, other velocities, altitude and cold or hot atmospheres.
5. Have a person who did not write the code review the comparison.

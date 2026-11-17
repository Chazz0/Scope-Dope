# Validation report: calculated results against published data (preliminary)

Model version 1.0.0. Run date 2026-11-16. Reproduce with `node tests/tools/run-validation.js`
(add `--diagnose` for the diagnostic below). The fuller Stage 5 report is the Claude Doc
"Scope Dope Stage 5 Report (Preliminary)".

**Summary.** Reference agreement is partly demonstrated across several manufacturer datasets, but remains incomplete. The Federal and Hornady datasets have been registered and compared under two candidate atmospheres. 100 of 103 comparisons pass. The three misses occur under ICAO conditions. The reference entries still need owner checking against their original pages, and the drag-table origin remains unknown. None of this establishes physical accuracy.

**Passing software tests is not proof of ballistic accuracy.** This report compares the engine with the few
published numbers that could be read. It is preliminary, it is not an independent audit, and accuracy is not established.

## Correction history

At 18:41 to 18:56 an earlier version of this report said the engine missed the Hornady table by 2.8% to 5.9% in
velocity and 4 to 25 in in drop. That was wrong. The page reader's output had a placeholder 50 yd column
(`0 / N/A / 0`) that I dropped, which paired every number with the wrong distance. The project owner identified the
shift at 19:04. The comparison below uses the corrected pairing.

## Three separate achievements

| Achievement | Question | Where it stands |
| --- | --- | --- |
| Software correctness | Does the program calculate consistently? | Supported by automated tests. |
| Reference agreement | Does it reproduce published data? | Partial, with unresolved source and transcription checks. Federal and Hornady datasets were registered and compared under two candidate atmospheres (100 of 103 pass; the three misses are under ICAO). The entries have not been checked against the original pages, the drag-table origin is unknown, and the Hornady copy is owner-checked only (an independent reproduction was waived on 2026-11-16). |
| Physical accuracy | Does it predict what an actual bullet does? | NOT DEMONSTRATED. No measured flight data. |

Stage 5 is not complete. See `docs/STAGE5_COMPLETION.md`.

## Result

Of 7 comparisons that could be made, all 7 are within the tolerances that were fixed before the run: two
drag-table points and five Hornady rows (100 to 500 yd). The 50 yd Hornady row has no usable value. A pass here means
agreement with that one published number within a tolerance of my own choosing. It does not verify the model.

## 1. Standard drag tables, one point each

| Check | Published | Engine | Difference | Within 0.005 |
| --- | --- | --- | --- | --- |
| G1 Cd at Mach 3 | 0.51 | 0.5133 | 0.0033 | yes |
| G7 Cd at Mach 3 | 0.24 | 0.2424 | 0.0024 | yes |

Source: Applied Ballistics, ABDOC130. It names no origin for the tables. One point on each of two tables of
79 and 83 points was checked. The tables remain **Unverified**, and their origin is unknown.

## 2. Hornady 6.5 Creedmoor 140 gr OTM-A (item 81480)

Published inputs: 2700 fps (2266 ft-lb), G1 BC 0.608, 140 gr, 24 in test barrel, muzzle trajectory -1.5 in.
Not published: atmosphere, zero range, drag-model details. Assumed: ICAO standard atmosphere (Hornady states its
BCs are corrected to it), 1.5 in sight height, 0.264 in diameter, and a 100 yd zero inferred from the published
trajectory of 0 at 100 yd.

Distance labels: Muzzle, 50, 100, 200, 300, 400 and 500 yards. The 50 yd column holds `0 / N/A / 0`, which the
owner judged a missing or placeholder entry. It is kept as invalid and not compared. The owner supplied the pairing of
numbers to distances. The transcription the owner refers to was not seen by the author, and the author has not
confirmed the pairing row by row against the page. Each row's energy is checked against its velocity in
`tests/validation.test.js`. That checks the copy, not ballistics.

| Range (yd) | Velocity published (fps) | Engine | Diff | Drop published (in) | Engine (in) | Diff (in) | Within tolerance |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 50 | 0 / N/A / 0 (invalid) | | | | | | not compared |
| 100 | 2553 | 2550.7 | -0.09% | 0 | 0 | 0 | yes |
| 200 | 2412 | 2406.3 | -0.24% | -3.8 | -3.85 | -0.05 | yes |
| 300 | 2274 | 2266.6 | -0.33% | -13.7 | -13.71 | -0.01 | yes |
| 400 | 2141 | 2131.4 | -0.45% | -30.2 | -30.34 | -0.14 | yes |
| 500 | 2013 | 2000.9 | -0.60% | -54.4 | -54.63 | -0.23 | yes |

### A remaining discrepancy that is inside tolerance but not zero

The engine's velocity is below the published value at every row, and the gap grows with range, from -0.09% at 100 yd
to -0.60% at 500 yd. The G1 BC that makes this engine match each published velocity is about 0.619 to 0.620
at every range (published BC 0.608), a steady offset of about 1.8%. A consistent offset points at a systematic
difference in drag, not at rounding. It was not fitted away: no BC was changed and the solver was not changed.

Possible causes, none tested yet: the G1 table values near the Mach 1.2 to 2.3 range these velocities cover, how
Hornady defines or bands its BC, the atmosphere Hornady used, or how Hornady computes the table.

### Investigation so far (nothing in the engine or any BC was changed)

- **Integrator ruled out.** `python3 tests/tools/independent-integrator.py index.html` integrates the same G1 table
  with a separately written RK4 method. It agrees with the app to within 0.2 fps at every range. The integration
  method is not the cause of the 1.8% offset.
- **Not ruled out:** the G1 table itself (both checks use it), the drag equation, the stated BC, how Hornady built
  the table, and the unconfirmed pairing.

## Second-manufacturer data and the atmosphere sensitivity (2026-11-16, later)

Registered before running: two candidate atmospheres (ICAO; Hornady's Aberdeen) and all tolerances unchanged. Each dataset is run under each applicable atmosphere and every result is reported; neither atmosphere was chosen. `node tests/tools/run-validation.js`.

| Dataset | ICAO | Aberdeen | Notes |
| --- | --- | --- | --- |
| Federal GM 6.5 CM 130 gr, G7 .287 (atmosphere unstated) | 6 of 6 | 6 of 6 | Velocity differs 0.07 to 0.12% in ICAO, 0.17 to 0.68% in Aberdeen. 100 yd Average Range cell is a placeholder, left empty. |
| Hornady 180 gr spire, G1 .425 | 6 of 6 | 6 of 6 | ICAO up to -0.76%; Aberdeen within 0.02%. |
| Hornady 180 gr round nose, G1 .241 | 4 of 6 | 6 of 6 | ICAO -1.13% and -1.38% at 400 and 500 yd, outside the 1% tolerance. |
| Hornady correction tests 1 to 4 (2900 fps) | 19 of 20 | 20 of 20 | Test 3 at 500 yd misses 1% in ICAO. Stated-conditions runs with the uncorrected BC 0.338: 20 of 20. |

LE 6.5 CM case in Aberdeen (sensitivity only): velocity within 0.06% at 100 to 500 yd, drop within 0.04 in. In ICAO the same case was -0.09% to -0.60%.

Reading: for the Hornady tables the Aberdeen atmosphere fits clearly better than ICAO, which supports the hypothesis that this explains the 1.8% BC offset. Hornady does not state this for the LE table, so it remains a hypothesis. The Federal table, whose atmosphere is unstated, fits ICAO a little better. One round-nose energy figure (3139 ft-lb at 50 yd) is 2 ft-lb from what its velocity implies; it is documented as an exception and not used in any comparison. These copies were read by a page tool and are unreproduced, and a pass does not verify the model.

## Round of 2026-11-16 (21:15 request): sourcing, formula audit and checks

- **Aberdeen atmosphere.** Documented in `docs/MODEL_SOURCES.md`: Hornady's External Ballistics page states 59 F, 29.53 inHg, 78% RH as the Aberdeen standard for "this book"; hornady.com/bc states ICAO (59 F, 29.92 inHg, 0%). No opened source says which one the LE table uses. Two Hornady statements are in play, and neither proves how the LE product-page trajectory was calculated. (1) A Hornady page refers to standard conditions for an unnamed book: 59 F, 29.53 inHg, 78% RH. (2) Hornady's website says BCs are corrected to ICAO conditions (59 F, 29.92 inHg, 0%). Neither statement proves the LE trajectory was calculated under Aberdeen conditions. Both atmosphere comparisons are kept. Aberdeen is not selected as correct, and the offset is not resolved: its disappearance under Aberdeen is a hypothesis, not proof. The primary ICAO comparison above is unchanged and no BC was fitted.
- **Reference data check.** `docs/OWNER_CHECK_REFERENCE_DATA.md` lists every Federal and Hornady entry for the owner to check against the pages. It is blank. Nobody but the page-reading tool has checked those copies.
- **Drag-table origin.** Not found. See `docs/MODEL_SOURCES.md`. This is a point-for-point comparison against a secondary copy of unknown origin. It establishes consistency between the copies, not the provenance or accuracy of the tables. Neither table is Verified.
- **Formula audit.** `node tests/tools/formula-audit.js`: sea-level density and speed of sound within 0.002% of the 1976 standard constants; the Miller formula equals its printed form; spin drift and Coriolis magnitudes for one chosen bullet are slightly outside the ranges Applied Ballistics prints (9.31 in against 8 to 9; 3.34 in against 2.5 to 3.0), which are not tied to a bullet.
- **Tests.** All four browser suites pass: storage 27, inputs 27, layout 9, upgrade 5.

## What this does and does not show

- Under the owner's corrected pairing, the engine reproduces one manufacturer table within the stated tolerances
  from 100 to 500 yd, with a small systematic offset.
- A manufacturer table is usually computed by a BC-based program, so agreement shows consistency with that kind of
  calculation, not agreement with real bullet flight.
- It covers one bullet, one BC and one velocity, in a standard atmosphere, with no wind.
- It says nothing about wind drift, spin drift, Coriolis, angled shots, altitude, temperature, humidity or long range.
- It does not make the model Verified. The drag tables and drag equation stay Unverified.

## What would resolve the rest

1. (Waived by the owner on 2026-11-16.) An independent reviewer would reproduce the Hornady table from the original page without the project's copy (`docs/REVIEWER_PROTOCOL.md`). Until then the reference copy is owner-checked only. The owner's own check of each row, including the 50 yd column, is still wanted.
2. Find how Hornady computes the table (BC type, velocity banding, atmosphere, zero) and explain the 1.8% offset.
3. Open the primary documents behind the G tables and compare every point, not one.
4. Compare against fired-round data, such as Doppler tracks or measured drop at known ranges.
5. Add more manufacturer tables: G7 bullets, other velocities, altitude, hot and cold air.
6. Have a person who did not write the code review the comparison.

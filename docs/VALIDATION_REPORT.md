# Validation report: calculated results against published data (preliminary)

Model version 1.0.0. Run date 2026-11-16. Reproduce with `node tests/tools/run-validation.js`
(add `--diagnose` for the diagnostic below). The fuller Stage 5 report is the Claude Doc
"Scope Dope Stage 5 Report (Preliminary)".

**Summary.** Reference agreement is partly demonstrated across several manufacturer datasets, but remains incomplete. The Federal and Hornady datasets have been registered and compared under two candidate atmospheres (and, for four Hornady worked examples, their own printed conditions). 100 of 103 comparisons pass. The three misses occur under ICAO conditions. The 103 is a total, not a per-atmosphere figure. It is 2 drag-table points, 5 Hornady LE rows in ICAO (the primary run), 38 dataset rows run under ICAO, 38 under Aberdeen, and 20 under the printed conditions of the four Hornady correction tests. Passes: 2 of 2, 5 of 5, 35 of 38 (3 fail, all ICAO), 38 of 38, 20 of 20. Five further LE rows re-run in Aberdeen as a sensitivity (5 of 5 within tolerance) are not part of the 103. The reference entries were not checked against raw manufacturer pages (that criterion is waived in narrowed form), and the drag-table origin remains unknown. None of this establishes physical accuracy.

**Round 2 (registered before running, 2026-11-16).** Eleven further Federal datasets (6.5 CM 130 gr G7 and G1 variants, .308 168 gr and 175 gr, average and long-range zero) added 108 comparisons: 101 within tolerance, 7 outside. Combined total across both rounds: 211 compared, 201 within, 10 outside, tolerances unchanged. All 7 new misses are the Federal .308 168 gr table run with its stated G7 BC (.224); the same table with the G1 BC passes. Under Aberdeen with G1 BCs the Hornady and Federal tables match to rounding (mean absolute velocity error about 0.02%) while ICAO gives 0.36 to 0.53%. That supports the Aberdeen hypothesis. It is not manufacturer confirmation, Aberdeen is not selected, and the offset is not called resolved. Eight reads (265 of 266 cells agree; one retailer BC mismatch, .286 vs .287) are in `docs/REFERENCE_DATA_AUDIT.md`. They came from a page-summarizing tool, so this is corroboration, not independent verification, and the owner check criterion is waived in narrowed form (2026-11-16 22:23). A third open-source G-table copy agreed on a 20-row spot check; the origin of the tables is still unknown. A measured Doppler drag comparison (arXiv 1608.06500, .308 bullets, about 100 m) puts 21 of 26 rows within 3% of the app's predicted Cd. It is measured drag, not a trajectory.

Physical accuracy: NOT DEMONSTRATED. The list of open unknowns is in `docs/SOURCE_RESEARCH.md`.

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
| Reference agreement | Does it reproduce published data? | Partial, with unresolved source and transcription checks. Federal and Hornady datasets were registered and compared under two candidate atmospheres (100 of 103 pass in total across all runs; the three misses are under ICAO; breakdown in `docs/VALIDATION_REPORT.md`). The entries have not been checked against the original pages, the drag-table origin is unknown, and the Hornady copy is owner-checked only (an independent reproduction was waived on 2026-11-16). |
| Physical accuracy | Does it predict what an actual bullet does? | NOT DEMONSTRATED. No measured flight data. |

Stage 5 is closed as a limited software and reference-validation milestone: complete except waived items (1 complete, 7 waived, 0 open), accepted by the owner on 2026-11-16 (22:23). Physical accuracy: NOT DEMONSTRATED.

Limitations that stay in force: the G1 and G7 drag tables are Unverified; the manufacturer comparisons are not independently verified; the Hornady atmosphere explanation is a supported hypothesis, not confirmed; the app has not been proven accurate against actual bullet flight. See `docs/STAGE5_COMPLETION.md` and `docs/STAGE5_CLOSEOUT.md`.

Velocity: reference comparisons here use each table's factory velocity. The app itself uses the muzzle velocity the user enters (their own measured FPS); factory velocities never override it. See `docs/STAGE5_COMPLETION.md`.

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

### Exact comparison counts (from `node tests/tools/run-validation.js`)

The 103 is a total, not a per-atmosphere figure. It is 2 drag-table points, 5 Hornady LE rows in ICAO (the primary run), 38 dataset rows run under ICAO, 38 under Aberdeen, and 20 under the printed conditions of the four Hornady correction tests. Passes: 2 of 2, 5 of 5, 35 of 38 (3 fail, all ICAO), 38 of 38, 20 of 20. Five further LE rows re-run in Aberdeen as a sensitivity (5 of 5 within tolerance) are not part of the 103.

| Group | Comparisons | Within tolerance | Outside |
| --- | --- | --- | --- |
| Drag-table points (Mach 3) | 2 | 2 | 0 |
| Hornady LE, ICAO (primary run) | 5 | 5 | 0 |
| Datasets, ICAO | 38 | 35 | 3 |
| Datasets, Aberdeen | 38 | 38 | 0 |
| Datasets, printed conditions (correction tests 1 to 4 only) | 20 | 20 | 0 |
| **Total in the 103** | **103** | **100** | **3** |
| Not in the 103: Hornady LE, Aberdeen sensitivity | 5 | 5 | 0 |

Per atmosphere, including the LE rows: ICAO 43 comparisons, 40 within tolerance, 3 outside; Aberdeen 43 (38 plus the 5 sensitivity rows), 43 within tolerance. The three outside are Hornady round nose at 400 yd and 500 yd, and Hornady correction test 3 at 500 yd, all under ICAO. A comparison is one distance row; a row with both velocity and drop passes only if both are within tolerance. The Federal table was within tolerance in 6 of 6 rows under each of ICAO and Aberdeen.

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
- **Reference data check.** `docs/REFERENCE_DATA_AUDIT.md` compares every Federal and Hornady entry with seven page reads (265 of 266 cells agree). The owner has declined manual checks, and `docs/OWNER_CHECK_REFERENCE_DATA.md` is optional and blank. Only page-reading tools have checked those copies.
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

## Failure investigation (2026-11-16, close-out round)

All 10 comparisons that are outside tolerance were investigated with `node tests/tools/diagnose-failures.js` (diagnostic only; it changes nothing). Tolerances are the pre-registered ones: velocity 1%, drop the larger of 2% or 0.3 in. The 201 passing comparisons are kept as they were and were not re-examined.

| # | Data set | Atmosphere | Range | Published | Calculated | Difference | Tolerance | Cause (status) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Hornady round nose 180 gr G1 .241 | ICAO | 400 yd velocity | 1639 fps | 1620.5 fps | -1.13% | 1% | consistent with the atmosphere hypothesis (supported, not confirmed) |
| 2 | Hornady round nose 180 gr G1 .241 | ICAO | 500 yd velocity | 1385 fps | 1365.9 fps | -1.38% | 1% | consistent with the atmosphere hypothesis (supported, not confirmed) |
| 3 | Hornady correction test 3, G1 .322 | ICAO | 500 yd velocity | 1641 fps | 1623.6 fps | -1.06% | 1% | consistent with the atmosphere hypothesis (supported, not confirmed) |
| 4 | Federal .308 168 gr, stated G7 .224, average range | ICAO | 300 yd velocity | 2103 fps | 2075.4 fps | -1.31% | 1% | stated G7 BC does not match the table (source data) |
| 5 | same | ICAO | 400 yd velocity | 1936 fps | 1901.4 fps | -1.79% | 1% | same |
| 6 | same | ICAO | 500 yd velocity | 1778 fps | 1734.7 fps | -2.44% | 1% | same |
| 7 | same | Aberdeen | 400 yd velocity | 1936 fps | 1912.9 fps | -1.19% | 1% | same |
| 8 | same | Aberdeen | 500 yd velocity | 1778 fps | 1748.5 fps | -1.66% | 1% | same |
| 9 | Federal .308 168 gr, stated G7 .224, long range | ICAO | 400 yd drop | -25.5 in | -26.07 in | -0.57 in (2.2%) | 0.51 in | same |
| 10 | same | ICAO | 500 yd drop | -51.5 in | -52.79 in | -1.29 in (2.5%) | 1.03 in | same |

**Failures 1 to 3 (Hornady, ICAO).** Velocity misses by 1.06% to 1.38%. The drops for those same rows are inside tolerance. The same BCs and the same solver pass every comparison for these sets under the Aberdeen atmosphere (round nose 6 of 6, test 3 5 of 5) and test 3 also passes under its own printed conditions (5 of 5). The BC that would match the published velocities under ICAO is 1.68% above the stated one, close to the 1.80% difference in air density between Aberdeen and ICAO. This supports the atmosphere hypothesis over a solver fault. It does not establish which atmosphere Hornady used for those tables, so the Aberdeen explanation stays a **supported hypothesis, not a confirmed explanation**, and neither atmosphere is selected.

**Failures 4 to 10 (Federal .308 168 gr, stated G7 BC .224).** These are not an atmosphere effect. Fitting a G7 BC to the published velocities needs .2363 under ICAO and .2323 under Aberdeen, which is 5.5% and 3.7% above the stated .224, more than the 1.8% density difference can explain. A G1 BC fitted to the same rows is .4695 (ICAO) and .4615 (Aberdeen), with residual velocity error of 0.02% or less at every row. Federal prints a G1-like .462 for this load (R5, R6 and the R8 PDF, where it is the only BC printed). The same ammunition run with its .462 BC passes 24 of 24 comparisons, and the Federal 6.5 CM 130 gr G7 .287 sets pass 24 of 24 through the same G7 code path. So the solver's G7 handling is not the problem for this load: Federal's published table was calculated with a G1-style BC near .462, and the stated G7 .224 does not reproduce it. Why Federal prints a G7 .224 next to a table that does not follow it is **unresolved**. The long-range drops (failures 9 and 10) have no velocity rows and share the same BC; their Aberdeen pass should not be read as support, because the BC mismatch is unchanged.

Classification summary: 3 consistent with the atmosphere hypothesis (a supported hypothesis, not a confirmed explanation); 7 traced to the stated BC not matching the published table (source data), cause of the printed G7 value unresolved; 0 attributed to a calculation error. "Calculation error" is not ruled out in general. It is not indicated by anything here, because the same code reproduces 24 of 24 Federal G7 6.5 CM comparisons and 24 of 24 G1 .308 comparisons.

The diagnostic output, verbatim:

```
{"id":"HORNADY-ROUNDNOSE-180-G1-0.241","atmosphere":"ICAO","range":400,"publishedV":1639,"calcV":1620.5,"vPct":-1.13,"vTolPct":1,"publishedDrop":-34,"calcDrop":-34.39,"dropDiff":-0.39,"dropTol":0.68}
{"id":"HORNADY-ROUNDNOSE-180-G1-0.241","atmosphere":"ICAO","range":500,"publishedV":1385,"calcV":1365.9,"vPct":-1.38,"vTolPct":1,"publishedDrop":-67,"calcDrop":-67.91,"dropDiff":-0.91,"dropTol":1.34}
{"id":"HORNADY-CORR-TEST3","atmosphere":"ICAO","range":500,"publishedV":1641,"calcV":1623.6,"vPct":-1.06,"vTolPct":1,"publishedDrop":-59.5,"calcDrop":-60.11,"dropDiff":-0.61,"dropTol":1.19}
{"id":"FEDERAL-GM308M-168-G7-AVG","atmosphere":"ICAO","range":300,"publishedV":2103,"calcV":2075.4,"vPct":-1.31,"vTolPct":1,"publishedDrop":-15.3,"calcDrop":-15.45,"dropDiff":-0.15,"dropTol":0.31}
{"id":"FEDERAL-GM308M-168-G7-AVG","atmosphere":"ICAO","range":400,"publishedV":1936,"calcV":1901.4,"vPct":-1.79,"vTolPct":1}
{"id":"FEDERAL-GM308M-168-G7-AVG","atmosphere":"ICAO","range":500,"publishedV":1778,"calcV":1734.7,"vPct":-2.44,"vTolPct":1}
{"id":"FEDERAL-GM308M-168-G7-AVG","atmosphere":"HORNADY_ABERDEEN","range":400,"publishedV":1936,"calcV":1912.9,"vPct":-1.19,"vTolPct":1}
{"id":"FEDERAL-GM308M-168-G7-AVG","atmosphere":"HORNADY_ABERDEEN","range":500,"publishedV":1778,"calcV":1748.5,"vPct":-1.66,"vTolPct":1}
{"id":"FEDERAL-GM308M-168-G7-LONG","atmosphere":"ICAO","range":400,"vTolPct":1,"publishedDrop":-25.5,"calcDrop":-26.07,"dropDiff":-0.57,"dropTol":0.51}
{"id":"FEDERAL-GM308M-168-G7-LONG","atmosphere":"ICAO","range":500,"vTolPct":1,"publishedDrop":-51.5,"calcDrop":-52.79,"dropDiff":-1.29,"dropTol":1.03}

Fitted BC that reproduces the published velocities (diagnostic only):
{"id":"HORNADY-ROUNDNOSE-180-G1-0.241","atmosphere":"ICAO","model":"G1","statedBC":0.241,"fittedBC":0.245,"fittedVsStatedPct":1.68}
{"id":"HORNADY-CORR-TEST3","atmosphere":"ICAO","model":"G1","statedBC":0.322,"fittedBC":0.3274,"fittedVsStatedPct":1.68}
{"id":"FEDERAL-GM308M-168-G7-AVG","atmosphere":"ICAO","model":"G7","statedBC":0.224,"fittedBC":0.2363,"fittedVsStatedPct":5.47}
{"id":"FEDERAL-GM308M-168-G7-AVG","atmosphere":"HORNADY_ABERDEEN","model":"G7","statedBC":0.224,"fittedBC":0.2323,"fittedVsStatedPct":3.69}

G1 BC fitted to the G7-labelled tables, with residual velocity % at each row:
{"id":"FEDERAL-GM308M-168-G7-AVG","atmosphere":"ICAO","fittedG1BC":0.4695,"residualVelocityPct":[-0.01,0.02,-0.01,0,0]}
{"id":"FEDERAL-GM308M-168-G7-AVG","atmosphere":"HORNADY_ABERDEEN","fittedG1BC":0.4615,"residualVelocityPct":[-0.01,0.02,-0.01,0,0]}

Drop-only failures (no velocity row, so no BC fit): FEDERAL-GM308M-168-G7-LONG
Same ammunition, G1 BC .462 variants: 24 of 24 comparisons within tolerance (ICAO and Aberdeen).

The fit shows what BC would match the numbers. It is not a correction and was not applied.
```

## Federal .308 168 gr: which BC and drag model the comparison uses

Checked in the close-out (nothing changed):

| Item | Value |
| --- | --- |
| Data sets | FEDERAL-GM308M-168-G1-AVG (100 yd zero) and FEDERAL-GM308M-168-G1-LONG (200 yd zero), registered in round 2 before any run |
| Drag model | `G1` (the engine's 79-point G1 table; the G7 table has 83 points and a different Cd, 0.298 against 0.593 at Mach 2) |
| BC | .462, the value Federal prints for this load (R5, R6, and the R8 PDF where it is the only BC printed) |
| Muzzle velocity, weight | 2650 fps, 168 gr |
| Where .462 came from | the manufacturer's printed number. It was **not fitted** to the table, so a pass is not circular |
| Results | 24 of 24 comparisons within tolerance: AVG ICAO 6/6 (largest velocity difference 0.7%), AVG Aberdeen 6/6 (0.04%), LONG ICAO 6/6 and Aberdeen 6/6 (velocity not published; largest drop difference 0.45 in and 0.07 in) |

Important limit: Federal does not label .462 as G1 or G7. That it is a G1 BC is an **inference** from the fit: a G1 BC fitted to the published velocities comes out at .4695 (ICAO) and .4615 (Aberdeen), within 0.02% velocity at every row, and the stated .462 sits inside that. It is consistent with Sierra's convention for this bullet, but the Sierra page itself gave no BC when read, so it is not cited as proof.

Why the earlier G7 .224 comparison is unsupported by the manufacturer source, and what it is not:

- It was run faithfully: .224 is the BC the Federal page (R5) labels G7, and the comparison was registered before it was run. It stays in the results as 7 of the 10 failures. Nothing was removed or reclassified to improve the pass rate.
- It does not test the solver. The published table does not follow that BC: the G7 BC that fits the velocities is .2363 (ICAO) or .2323 (Aberdeen), 5.5% and 3.7% above .224, more than the 1.8% atmosphere difference explains, while the .462 value reproduces the table without any fitting. The Federal PDF (R8) prints only .462 for this load.
- So the G7 .224 value is not what Federal's table was computed from, or is a figure on a different basis. Why Federal prints it is unresolved. The result is a finding about Federal's published numbers, not a fault in the calculation: the same G7 code path passes 24 of 24 on the Federal 6.5 CM G7 .287 data.

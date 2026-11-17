# Stage 11: Measured-Trajectory Validation

Branch `stage-11-measured-trajectory-validation`, from the approved Stage 10 commit `6dbcc740b2619f319173a0166c0e4ee2a3e64804`. Model version under test: **1.0.0**, solver unchanged (byte-identical to Stage 10; a guard test enforces it).

**Headline.** Physical accuracy remains **NOT DEMONSTRATED**. No public dataset was found that states every input a prediction needs (muzzle velocity, atmosphere, zero, sight height, BC). Three datasets could be compared at all, each with missing inputs, so each is compared across a stated envelope of the missing inputs rather than at one guessed value. Across those envelopes the model's elevation holds differ from the measured holds by amounts that range from inside the measurement uncertainty to about 1.5 mil (about 64 inches at 1220 yd). The evidence can neither support nor rule out the model's general trajectory behaviour, because the unknown inputs alone (zero distance, air density, which BC) move the prediction by as much as the disagreement.

## 1. Scope and rules followed

- Real measured flight data only. Another calculator's output is not used as truth anywhere in this report. The one place a calculator's number is quoted (the blog's own prediction in DS-D) is labelled as a prediction.
- Nothing was tuned. No input was chosen to improve agreement. The "primary" case of each dataset was fixed before results were looked at (default app inputs: 59 F, sea level, 100 yd zero, 1.5 in sight height, or the stated sight height). Every case is kept in `tests/validation/stage11/results.json`, including failures.
- Missing information is not filled with guesses. Where an input is absent it is varied across a stated range (section 4), and the full spread is reported.
- Calculated or manufacturer tables are not described as measured data. They are listed under "Excluded".
- Solver, drag tables, reference data, tolerances, golden baseline and model version are unchanged.

## 2. Sources and provenance

| ID | Source | What it is | Classification |
|---|---|---|---|
| DS-A | [Applied Ballistics ABDOC130, Table 1](https://appliedballisticsllc.com/wp-content/uploads/2019/11/ABDOC130_CDM.pdf) | Sierra 175 gr MatchKing, short-barrel .308 Win, drops to 1323 yd found by centring the group on a steel target | measured trajectory (elevation holds), many inputs missing |
| DS-B | same document, Table 2 | Berger 175 gr OTM Tactical, same method | measured, **excluded**: no muzzle velocity stated |
| DS-C | same document, Table 3 | .338 Wildcat, 300 gr Berger Hybrid, MV 3198 fps, MOA drops to 1773 yd | **excluded**: it cannot be established that the drops are measured; zero and atmosphere missing |
| DS-D | [Precision Rifle Blog, Flat Line 155 gr BC test](https://precisionrifleblog.com/2016/02/28/flat-line-bullets-4700-yard-shot/) | scope elevation at which hits were observed at 1000 and 1220 yd, LabRadar muzzle velocities | measured trajectory (blog post), atmosphere and sight height missing |
| DS-E | [Sniper's Hide thread](https://www.snipershide.com/shooting/threads/discrepancy-between-ballistic-calculator-predictions-and-real-world-long-range-shots-seeking-advice.7193944/) | 6.5 Creedmoor, Hornady 140 ELD-M, 8.7 mrad needed at 1000 yd | anecdotal, low quality |
| DS-F | [Courtney and Courtney, arXiv 1608.06500](https://arxiv.org/abs/1608.06500) (already in `tests/validation/measured-doppler.json`) | Doppler-radar drag coefficients about 100 m from the muzzle | measured drag only, not a trajectory; BC fitted from the same shots (circular) |

Other measured-data candidates were read and set aside because they publish no per-shot trajectory values: Halloran/Courtney USAFA reports (two-chronograph BC measurements; their drop and drift figures are JBM-calculated), arXiv 1510.07336 (Cd vs Mach in a figure only), Applied Ballistics ABDOC107 (measured BC and drag only; trajectory values calculated), Hornady 4DOF technical document (claims radar validation, publishes no measured values), Barnes Doppler pages (method only), the XLR Industries 147 ELD-M page (group spread only), and the Precision Rifle Blog 4700-yd shot (no atmosphere or elevation data). JBM output tables on the sources read are images with no numbers.

### Inaccessible or unavailable sources

Raw GitHub and some Wikipedia pages were not fetchable. WebFetch returns a model-written extraction rather than the raw page, so every transcribed number was re-read in a second fetch where possible. The ABDOC130 PDF's header wording for the table columns is as extracted; the Vel/Mach column's origin is not stated in the text, so it is not used.

## 3. Quality assessment

| Item | DS-A | DS-D | DS-E |
|---|---|---|---|
| Bullet maker, model, weight | stated | stated | stated |
| Diameter | .308 from caliber; not printed | "30 cal"; .308 assumed, not stated | .264 from caliber |
| BC and drag model | none from the test. Catalog G1 0.505 (Sierra) and a third-party G7 0.243 (different lot) | advertised G7 0.285; method not stated | Hornady published bands G1 0.646 to 0.616, G7 0.326 to 0.310, by velocity |
| Muzzle velocity | 2570 fps average, instrument not stated | LabRadar 3109/3107/3104 | 2750 fps, 42 shots, ES 32, SD 9.1 |
| Rifle and barrel | "short-barreled .308"; length and twist not stated | Remington MSR, 300 Win Mag barrel, 1:10 | Savage 110; twist not stated |
| Atmosphere | **missing** | **missing** (Kestrel used; values not printed) | **missing** (barometer reading doubted by poster) |
| Zero distance | **missing** | 100 yd | 100 yd |
| Sight height | **missing** | **missing** | 2.17 in |
| Distance measurement | stated ranges, method not stated | Vectronix rangefinders | not described |
| Method | group centred on steel | observed hits, dialled mils | forum statement |
| Stated uncertainty | about +/-1 click (0.1 mil) | none (0.1 mil assumed here and flagged) | none |
| Wind, latitude, azimuth | not stated | not stated | not stated |
| Likely biases | zero/line-of-sight reference unclear; velocity column predicted, not measured | blog author is also the BC tester; fitted BC shown in the post is derived from the same hits | self-selected anecdote reported because it disagreed with a calculator |
| Overall | usable only with a wide envelope | usable only with a wide envelope | weakest; shown for completeness |

## 4. Procedure (reproducible)

1. `node tests/tools/stage11-compare.js` loads the solver from `index.html` exactly as the app runs it (`tests/helpers/load-solver.js`) and reads `tests/validation/stage11/datasets.json`. It writes `tests/validation/stage11/results.json` (model version recorded as 1.0.0).
2. Fixed inputs per dataset are the documented ones in the registry (weight, diameter, muzzle velocity, BC and drag model, zero and sight height where stated). The user's measured muzzle velocity is used as typed; no factory velocity is substituted.
3. For missing inputs the tool runs the full cross product: zero distance (DS-A: 100 and 200 yd), sight height (DS-A and DS-D: 1.5 and 2.5 in), and four atmospheres at zero humidity (59 F sea level; 40 F sea level; 85 F sea level; 59 F at 3000 ft). These ranges are sensitivity bounds chosen to bracket common conditions. They are not claims about what the real conditions were.
4. Predicted value: the solver's elevation hold in mil (`elevMil`) at the measured range, level shot, no wind, no latitude (Coriolis off), because no source states latitude or azimuth. Measured value: the dialled or observed elevation in mil. Error = predicted minus measured; positive means the model asks for more elevation than was measured. Inches = mil x range(yd) x 0.036. MOA = mil x 3.43775.
5. `python3 -I tests/tools/stage11-independent-check.py` recomputes every primary case with separately written code (DOP853 integration, tables read from the Stage 10 export). The maximum difference from the app over all primary cases is **0.001 mil**, so the gaps below are not an input-transcription or harness error. This checks the harness; it is not validation of the physics.
6. `node tests/tools/compare-measured.js` re-runs the existing drag-coefficient comparison (DS-F).
7. Tests: `node --test tests/*.test.js` and each `node tests/browser/<name>.check.js`.

## 5. Measured vs predicted results

Wind drift and spin drift: none of the sources reports lateral measurements, so those parts of the model are **not tested** here. Only vertical elevation holds are compared.

Each table row is one range and one BC option. "Primary case" is the pre-fixed default atmosphere/zero/sight height. "Envelope" is the minimum and maximum error across every case in section 4 (DS-A 16 cases per BC, DS-D 8, DS-E 4). "Cases within measurement uncertainty" counts envelope cases whose absolute error is at most the stated uncertainty (0.1 mil for DS-A, the assumed 0.1 mil for DS-D; DS-E states none, so the count shows 0 and is not meaningful).

### DS-A: Sierra 175 gr MatchKing, MV 2570 fps (Table 1 measured drops; zero, sight height and atmosphere missing)

| Range yd | Measured mil (in) | BC used | Predicted hold mil (primary case) | Error mil | Error in | Error MOA | Envelope error mil (min to max) | Envelope error in (min to max) | Cases within measurement uncertainty |
|---|---|---|---|---|---|---|---|---|---|
| 300 | 1.10 (11.9) | G1 0.505 | 1.495 | +0.40 | +4.3 | +1.36 | -0.31 to +0.41 | -3.4 to +4.4 | 0 of 16 |
| 300 | 1.10 (11.9) | G7 0.243 | 1.511 | +0.41 | +4.4 | +1.41 | -0.30 to +0.42 | -3.2 to +4.6 | 0 of 16 |
| 600 | 4.30 (92.9) | G1 0.505 | 4.882 | +0.58 | +12.6 | +2.00 | -0.34 to +0.65 | -7.4 to +13.9 | 3 of 16 |
| 600 | 4.30 (92.9) | G7 0.243 | 4.980 | +0.68 | +14.7 | +2.34 | -0.27 to +0.75 | -5.8 to +16.1 | 4 of 16 |
| 1000 | 11.20 (403.2) | G1 0.505 | 11.756 | +0.56 | +20.0 | +1.91 | -1.04 to +0.83 | -37.3 to +30.0 | 3 of 16 |
| 1000 | 11.20 (403.2) | G7 0.243 | 12.349 | +1.15 | +41.4 | +3.95 | -0.63 to +1.47 | -22.6 to +52.8 | 1 of 16 |
| 1101 | 13.70 (543.0) | G1 0.505 | 14.067 | +0.37 | +14.6 | +1.26 | -1.50 to +0.74 | -59.6 to +29.4 | 2 of 16 |
| 1101 | 13.70 (543.0) | G7 0.243 | 14.971 | +1.27 | +50.4 | +4.37 | -0.88 to +1.71 | -35.0 to +67.7 | 1 of 16 |
| 1166 | 15.50 (650.6) | G1 0.505 | 15.697 | +0.20 | +8.3 | +0.68 | -1.87 to +0.64 | -78.7 to +27.0 | 2 of 16 |
| 1166 | 15.50 (650.6) | G7 0.243 | 16.841 | +1.34 | +56.3 | +4.61 | -1.07 to +1.86 | -45.1 to +78.3 | 2 of 16 |
| 1200 | 16.60 (717.1) | G1 0.505 | 16.595 | -0.01 | -0.2 | -0.02 | -2.19 to +0.48 | -94.5 to +20.9 | 1 of 16 |
| 1200 | 16.60 (717.1) | G7 0.243 | 17.873 | +1.27 | +55.0 | +4.38 | -1.28 to +1.85 | -55.3 to +79.8 | 1 of 16 |
| 1323 | 19.90 (947.8) | G1 0.505 | 20.109 | +0.21 | +9.9 | +0.72 | -2.42 to +0.87 | -115.0 to +41.4 | 1 of 16 |
| 1323 | 19.90 (947.8) | G7 0.243 | 21.905 | +2.00 | +95.5 | +6.89 | -1.06 to +2.77 | -50.3 to +132.1 | 0 of 16 |

### DS-D: Flat Line 155 gr, MV 3107 fps, advertised G7 0.285, 100 yd zero (sight height and atmosphere missing)

| Range yd | Measured mil (in) | BC used | Predicted hold mil (primary case) | Error mil | Error in | Error MOA | Envelope error mil (min to max) | Envelope error in (min to max) | Cases within measurement uncertainty |
|---|---|---|---|---|---|---|---|---|---|
| 1000 | 5.90 (212.4) | G7 0.285 | 6.939 | +1.04 | +37.4 | +3.57 | +0.37 to +1.16 | +13.4 to +41.8 | 0 of 8 |
| 1220 | 8.47 (372.0) | G7 0.285 | 9.932 | +1.46 | +64.2 | +5.03 | +0.44 to +1.69 | +19.3 to +74.3 | 0 of 8 |

### DS-E: Hornady 140 ELD-M, MV 2750 fps, 100 yd zero, 2.17 in sight height (atmosphere missing; anecdotal)

| Range yd | Measured mil (in) | BC used | Predicted hold mil (primary case) | Error mil | Error in | Error MOA | Envelope error mil (min to max) | Envelope error in (min to max) | Cases within measurement uncertainty |
|---|---|---|---|---|---|---|---|---|---|
| 1000 | 8.70 (313.2) | G7 0.326 | 8.408 | -0.29 | -10.5 | -1.00 | -0.75 to -0.15 | -27.1 to -5.5 | 0 of 4 |
| 1000 | 8.70 (313.2) | G7 0.31 | 8.653 | -0.05 | -1.7 | -0.16 | -0.55 to +0.10 | -19.9 to +3.8 | 0 of 4 |
| 1000 | 8.70 (313.2) | G1 0.646 | 8.420 | -0.28 | -10.1 | -0.96 | -0.74 to -0.14 | -26.6 to -5.0 | 0 of 4 |
| 1000 | 8.70 (313.2) | G1 0.616 | 8.650 | -0.05 | -1.8 | -0.17 | -0.55 to +0.10 | -19.8 to +3.7 | 0 of 4 |

### DS-F: Doppler drag coefficients (drag only)

21 of 26 rows are within the existing 3% tolerance at the nominal speed of sound and 19 of 26 at every assumed speed of sound. Rows outside: Sp FB 200 gr G1 (+8.29%), NP 220 gr G1 at 1306 fps (+3.26%) and 1206 fps (+7.27%), NET 150 gr G1 (+6.53%), NBT 125 gr G7 (-3.41%). Because each BC was fitted from the same shots, this tests the drag table's shape, not trajectory prediction, and it is unchanged from Stage 5.

### Excluded datasets

- **DS-B** (Berger 175 gr, Table 2): measured drops exist but no muzzle velocity is given. Using DS-A's 2570 fps would be a guess. No prediction was made.
- **DS-C** (.338 Wildcat, Table 3): the source does not say the MOA drops are measured, and zero and atmosphere are missing. It is not counted as measured data.

## 6. Error and uncertainty notes

- DS-A states about +/-1 click, 0.1 mil, which is 1.4 in at 300 yd and 4.8 in at 1323 yd. That is smaller than the spread produced by the missing inputs, so the unknown inputs dominate the comparison.
- MV sensitivity (+/-1% of MV), primary case: DS-A moves the 1000 yd hold by about 0.27 mil per 1% and the 1323 yd hold by 0.44 mil; DS-D 0.17 mil at 1000 yd and 0.25 mil at 1220 yd; DS-E 0.20 mil at 1000 yd. DS-A's 2570 fps average has no stated spread or instrument. A 1% error in it is as large as several of the printed differences.
- Vertical Coriolis if the site were known: for DS-A at 1323 yd up to 0.19 mil (9.3 in) at latitude 30, shooting east or west; DS-D at 1220 yd up to 0.13 mil; DS-E at 1000 yd up to 0.10 mil. Sign flips between east and west. It was off in the main runs because latitude and azimuth are unknown. Stage 10 found the solver's closed-form Coriolis overstates a full integration (14% to 47% depending on range); this stage cannot test that, since no lateral or direction-dependent data exist.
- The altitude sweep for DS-D (below) shows how a missing input moves the answer. It is a sensitivity table, not a fit, and no altitude is adopted.

| DS-D altitude (59 F) | 1000 yd predicted / error mil | 1220 yd predicted / error mil |
|---|---|---|
| 0 ft | 6.94 / +1.04 | 9.93 / +1.46 |
| 3000 ft | 6.52 / +0.62 | 9.16 / +0.69 |
| 5000 ft | 6.28 / +0.38 | 8.74 / +0.27 |
| 7000 ft | 6.07 / +0.17 | 8.36 / -0.11 |
| 10000 ft | 5.80 / -0.11 | 7.89 / -0.58 |

## 7. Investigation of discrepancies

None of the following changes any calculation. They are plausible explanations, ranked by what the data can and cannot show.

1. **Unstated zero distance (DS-A).** At 300 yd the primary case is +0.40 mil too high, but with a 200 yd zero it is -0.24 mil. A zero diagnostic (G1 0.505, standard air, 1.5 in) gives, at 300/600/1000/1323 yd: zero 100 yd +0.40/+0.58/+0.56/+0.21 mil; zero 150 yd +0.12/+0.31/+0.28/-0.06; zero 200 yd -0.24/-0.05/-0.08/-0.43; zero 300 yd -1.10/-0.91/-0.94/-1.29. The sign changes within a plausible zero range, so the zero (and whether "drop" means line-of-sight drop at all) dominates the short-range comparison. Full diagnostic rows are in `results.json` under `DS-A-zero`.
2. **G1 versus G7 shape (DS-A).** With G1 0.505 the primary-case error shrinks from +0.56 mil at 1000 yd to -0.01 mil at 1200 yd and +0.21 mil at 1323 yd. With G7 0.243 the error grows from +1.15 mil at 1000 yd to +2.00 mil at 1323 yd (95 in) in the primary case. The G7 value was quoted from another lot and source, and a one-number BC through the transonic region (Mach 1.07 at 1000 yd, 0.87 at 1323 yd) is the weakest part of any single-BC model, so this separation is informative about the inputs given, not proof that either table is right or wrong. Neither BC came from this test.
3. **Atmosphere (all three).** DS-D shows the largest dependence: a 59 F sea-level day leaves +1.04 mil at 1000 yd and the error crosses zero somewhere between about 5000 and 10000 ft depending on range. The post's own calculator figure (8.3 mil at 1220 yd for the advertised BC) is also below this model's sea-level 9.93 mil, which points the same way, but it is another tool's output and is not treated as evidence. The site altitude and weather were not published, so this is a hypothesis, not a finding. DS-E sits in the opposite direction: the primary case under-predicts by 0.29 mil (G7 0.326) while the lower-velocity BC bands (0.310) remove most of it. That is consistent with a velocity-banded BC mattering (the app uses a single BC), but it is also within what unreported weather could produce, so it is a hypothesis only.
4. **Muzzle velocity.** At 1% of MV the hold changes by 0.17 to 0.44 mil, the same order as most errors. DS-A's 2570 fps has no stated instrument or spread.
5. **BC assumptions.** DS-A and DS-E use catalog or manufacturer BCs that are not tied to the tested lots. DS-D's fitted 0.278 was derived from these hits and is deliberately not used.
6. **Spin drift, wind, Coriolis, angled shots.** Not testable: no lateral data, no latitude or azimuth, no inclination stated. Their magnitudes in section 6 show Coriolis alone is up to 0.2 mil at these ranges, so omitting it is a real, unquantified part of the envelope.
7. **Bullet length and stability.** Elevation holds do not depend on the estimated length in this solver. Berger catalog lengths (1.261 in for the 175 OTM Tactical, 1.287 in for the 168 Hybrid, 1.226 in for the 155.5 Fullbore, 1.819 in for the 300 gr Hybrid) are 1% to 9% longer than the app's estimate by my arithmetic (the catalog does not say how length is defined). This only affects stability and spin drift, which this stage could not test.

## 8. Limitations

- Every dataset lacks at least atmosphere. Results above hold only for those bullets, ranges and the stated envelope.
- DS-A's reference (line of sight vs bore) is inferred, and its MV has no stated instrument.
- DS-D and DS-E are informal reports with no stated reading uncertainty; DS-E is a single data point at one range.
- The envelope is a set of reasonable bounds, not the true conditions, so a "within envelope" result does not show the model matches the truth.
- Only 20 comparisons over 3 bullets (two of them .30 cal around 155-175 gr, one 6.5 mm) were possible; no .223, .338, .243 or other cartridge presets are covered by measured trajectories.
- No lateral, spin-drift, wind, Coriolis, angled-shot, humidity or pressure-station behaviour is tested.

## 9. Unresolved questions

- What zero distance and sight height were used in the ABDOC130 test, and what atmosphere?
- What site altitude and weather applied to the Flat Line shots?
- Do published BCs for these specific lots hold in the transonic region, and how far do they vary lot to lot?
- Where can a dataset with all of: logged atmosphere, chronographed MV, stated zero and sight height, and measured drops at several ranges be obtained? A shooter-collected set with those logged would resolve most of this stage's ambiguity.

## 10. Conclusion

**What the evidence establishes (limited to the bullets, ranges and conditions above):**

- The solver reproduces its own physics: an independent integration with the same tables agrees to 0.001 mil on all primary cases, so the model does what it is coded to do.
- For the .308 175 gr Sierra data (DS-A), with the catalog G1 0.505 and 2570 fps, the predicted holds are within a few inches to about 20 inches of the measured ones at 1000 to 1323 yd under the default conditions, and the full envelope spans about -115 to +41 inches at 1323 yd. A minority of envelope cases (1 to 4 of 16 at most ranges) fall inside the 0.1 mil click uncertainty, and the input uncertainty is larger than the measurement uncertainty, so this is consistent with agreement without demonstrating it. With the quoted G7 0.243, predictions are high by up to about 95 inches at 1323 yd in the primary case.
- For the Flat Line 155 gr data (DS-D), the model at standard sea-level air is high by 1.0 to 1.5 mil (37 to 64 in). Whether this is the model or unreported site altitude cannot be separated with the published information.
- For the single anecdotal 6.5 CM point (DS-E), predictions straddle the reported 8.7 mrad depending on which Hornady BC band is used.

**What is not validated:** lateral wind drift, spin drift, Coriolis (including the Stage 10 closed-form discrepancy), angled shots, humidity and pressure inputs, stability estimates, any bullet other than those listed, any range or condition outside the tables, and the G1/G7 table shapes against measured trajectories.

**Overall:** physical accuracy of the model is **NOT DEMONSTRATED**. Stage 11 does not show the model is wrong; it shows that the available public measured data are too incomplete to say. No accuracy claim for the app is supported by this stage. Nothing was adjusted to improve agreement and no calculation, table, tolerance, baseline or version was changed.

## 11. Files

`tests/stage11.test.js` (guards), `tests/tools/stage11-compare.js`, `tests/tools/stage11-independent-check.py`, `tests/validation/stage11/datasets.json`, `tests/validation/stage11/results.json`, this report, a no-model-change entry in `docs/MODEL_CHANGELOG.md`, and an entry in `tests/README.md`.

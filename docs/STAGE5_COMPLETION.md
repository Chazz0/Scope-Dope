# Stage 5 completion criteria

**Summary.** Reference agreement is partly demonstrated across several manufacturer datasets, but remains incomplete. The Federal and Hornady datasets have been registered and compared under two candidate atmospheres (and, for four Hornady worked examples, their own printed conditions). 100 of 103 comparisons pass. The three misses occur under ICAO conditions. The 103 is a total, not a per-atmosphere figure. It is 2 drag-table points, 5 Hornady LE rows in ICAO (the primary run), 38 dataset rows run under ICAO, 38 under Aberdeen, and 20 under the printed conditions of the four Hornady correction tests. Passes: 2 of 2, 5 of 5, 35 of 38 (3 fail, all ICAO), 38 of 38, 20 of 20. Five further LE rows re-run in Aberdeen as a sensitivity (5 of 5 within tolerance) are not part of the 103. The reference entries were not checked against raw manufacturer pages (that criterion is waived in narrowed form), and the drag-table origin remains unknown. None of this establishes physical accuracy.

**Round 2 (registered before running, 2026-11-16).** Eleven further Federal datasets (6.5 CM 130 gr G7 and G1 variants, .308 168 gr and 175 gr, average and long-range zero) added 108 comparisons: 101 within tolerance, 7 outside. Combined total across both rounds: 211 compared, 201 within, 10 outside, tolerances unchanged. All 7 new misses are the Federal .308 168 gr table run with its stated G7 BC (.224); the same table with the G1 BC passes. Under Aberdeen with G1 BCs the Hornady and Federal tables match to rounding (mean absolute velocity error about 0.02%) while ICAO gives 0.36 to 0.53%. That supports the Aberdeen hypothesis. It is not manufacturer confirmation, Aberdeen is not selected, and the offset is not called resolved. Eight reads (265 of 266 cells agree; one retailer BC mismatch, .286 vs .287) are in `docs/REFERENCE_DATA_AUDIT.md`. They came from a page-summarizing tool, so this is corroboration, not independent verification, and the owner check criterion is waived in narrowed form (2026-11-16 22:23). A third open-source G-table copy agreed on a 20-row spot check; the origin of the tables is still unknown. A measured Doppler drag comparison (arXiv 1608.06500, .308 bullets, about 100 m) puts 21 of 26 rows within 3% of the app's predicted Cd. It is measured drag, not a trajectory.

Physical accuracy: NOT DEMONSTRATED. The list of open unknowns is in `docs/SOURCE_RESEARCH.md`.

Stage 5 is complete only when the evidence supports the claims. It is not complete because automated tests pass.

**Stage 5 status: COMPLETE EXCEPT WAIVED ITEMS**

Closed on 2026-11-16 (22:23) as a **limited software and reference-validation milestone**, by the project owner's acceptance of `docs/STAGE5_CLOSEOUT.md`. This is not a claim of accuracy. The limitations below stay in force:

- Physical accuracy: NOT DEMONSTRATED.
- G1 and G7 drag tables: Unverified.
- Manufacturer comparisons: not independently verified.
- Hornady atmosphere explanation: supported hypothesis, not confirmed.
- The app has not been proven accurate against actual bullet flight.

## States

Each criterion is in exactly one of three states. They are never merged.

| Mark | State | Meaning |
| --- | --- | --- |
| `[ ]` | OPEN | Not done. |
| `[~]` | WAIVED | The project owner decided not to require it. It records a decision and what it leaves unestablished. |
| `[x]` | COMPLETE | Done, with evidence in the repo. |

A waived item is not evidence and is not counted as complete. Overall status is derived, not chosen:
NOT COMPLETE while any item is OPEN; COMPLETE EXCEPT WAIVED ITEMS when nothing is open but something is waived;
COMPLETE only when every item is `[x]`. `tests/validation.test.js` fails if the status line, the summary line or the
marks disagree, or if the reviewer item is checked without `tests/validation/reviewer-results.json`.

## Criteria

Criteria: 1 complete, 7 waived, 0 open.

- [~] An independent reviewer reproduced the Hornady comparison from the original manufacturer page, without the project's transcription. WAIVED by the project owner on 2026-11-16 (20:23). The Hornady reference copy stays owner-checked only: it rests on the author's transcription and the owner's correction, and was not independently reproduced.
- [~] The project owner checked every Federal and Hornady reference entry against the original manufacturer pages (`docs/OWNER_CHECK_REFERENCE_DATA.md`) and any discrepancy is recorded, not silently corrected. (it cannot be closed with the tools available here. The owner declined manual checks. Automated corroboration is done instead (`docs/REFERENCE_DATA_AUDIT.md`: 265 of 266 cells agree across 8 reads, including one Federal PDF; 1 retailer BC mismatch recorded), but every read came from a page- or PDF-summarizing tool, not a raw file, so it is not independent verification. Closing it needs raw page access, or an explicit decision by the owner to waive it. Neither has happened. WAIVED by the project owner on 2026-11-16 (22:23), closing Stage 5 as a limited software and reference-validation milestone. Narrowed scope accepted: Narrowed to corroboration by at least two reads with a recorded mismatch list (met: 265 of 266 cells, 8 reads). Leaves unestablished: raw-source verification of the Federal and Hornady entries; every read came from a summarizing tool, so the comparisons are not independently verified.
- [~] A second, different manufacturer data set has been reproduced the same way, covering something the first does not (a G7 bullet, another velocity, altitude or temperature). The criterion was OPEN until the owner's narrowed-scope waiver. Its parts: (a) dataset registered and calculations run: done for Federal (G7 .287) and four Hornady tables (`tests/validation/references.json`, `node tests/tools/run-validation.js`); (b) every source entry checked against the original manufacturer page: not done (waived), covered by the owner-check criterion above; (c) independent reproduction: not performed. The entries were read by a page-reading tool, nobody has checked them against the pages, Federal does not publish its atmosphere, and the Federal dataset is not independently verified. For Federal specifically: registered and calculations run; every Federal source entry has not yet been checked against the original manufacturer page; independent reproduction has not been performed; therefore this criterion remains OPEN. Agreement with published tables is not verification. WAIVED by the project owner on 2026-11-16 (22:23), closing Stage 5 as a limited software and reference-validation milestone. Narrowed scope accepted: a second manufacturer's tables were registered before running and reproduced within tolerance, with the one unreproducible published BC (Federal G7 .224) reported. Leaves unestablished: independent reproduction by someone other than the author; why Federal prints G7 .224; raw-source checking.
- [~] The origin of the G1 and G7 tables is established and every point of each was compared with that source. Progress, still open: origin still unknown. All 79 G1 and 83 G7 points were compared with a secondary copy of unknown origin (identical at every shared point; that copy has one extra G7 point at Mach 1.125). This is a point-for-point comparison against a secondary copy of unknown origin. It establishes consistency between the copies, not the provenance or accuracy of the tables. Neither table is Verified. No authoritative original has been opened and compared. WAIVED by the project owner on 2026-11-16 (22:23), closing Stage 5 as a limited software and reference-validation milestone. Narrowed scope accepted: point-for-point comparison with secondary copies (G1 79 of 79, G7 83 of 83 shared points), tables labeled Unverified. Leaves unestablished: the origin and accuracy of the G1 and G7 tables; both stay Unverified.
- [~] The steady offset of about 1.8% in effective BC against the Hornady table is explained. Progress, still open: HYPOTHESIS, not an established explanation. Re-running the same case in the Aberdeen atmosphere (59 F, 29.53 inHg, 78% RH) removes the offset (velocity within 0.06%), with no BC or solver change. That is consistent with Hornady computing its tables in that atmosphere, but the LE page does not say so, and Hornady's own pages disagree about the standard atmosphere.  Neither Hornady statement proves the LE trajectory was calculated under Aberdeen conditions: one page gives 59 F, 29.53 inHg, 78% RH as standard conditions for an unnamed book, and Hornady's website says BCs are corrected to ICAO. Both atmosphere comparisons are kept, Aberdeen is not selected, and the offset is not resolved. Investigated 2026-11-16 (see `docs/MODEL_SOURCES.md`): Hornady's own page states these Aberdeen conditions for "this book", its BC page says ICAO, and neither says which applies to the LE table. It stays open until the atmosphere is confirmed from the manufacturer. Close-out round, 2026-11-16: all 10 failed comparisons were investigated (`node tests/tools/diagnose-failures.js`, `docs/VALIDATION_REPORT.md`). The 3 Hornady ICAO misses and the way each one disappears under Aberdeen or the printed conditions are consistent with the atmosphere hypothesis (supported, not confirmed); the 7 Federal .308 misses are a separate cause (the stated G7 BC does not reproduce the table). Which atmosphere Hornady used for the LE table is still unestablished. WAIVED by the project owner on 2026-11-16 (22:23), closing Stage 5 as a limited software and reference-validation milestone. Narrowed scope accepted: documented as a supported hypothesis with its evidence and gaps. Leaves unestablished: Hornady's atmosphere for the LE table. The Aberdeen explanation is a supported hypothesis, not confirmed, and neither atmosphere is selected.
- [~] The standard atmosphere was compared with a source that was opened and read. Progress, still open: the U.S. Standard Atmosphere 1976 sea-level constants (as printed in a program that cites it) agree with the engine within 0.002% for density and speed of sound (`node tests/tools/formula-audit.js`). Only sea level was compared; the altitude and humidity terms have no opened source. The 1976 document itself was not opened. Close-out round: the humid-air terms were compared with a source that was opened (conservationphysics.org: Magnus-type saturation vapour pressure within 0.9% from 0 to 40 C, vapour concentration within 0.05%). The altitude (barometric) formula still has no opened source, so the criterion stays open. WAIVED by the project owner on 2026-11-16 (22:23), closing Stage 5 as a limited software and reference-validation milestone. Narrowed scope accepted: sea-level constants and humid-air terms compared with opened sources; the altitude (barometric) part is waived. Leaves unestablished: any opened source for the altitude formula and the 1976 document itself.
- [~] The spin-drift, stability and Coriolis formulas were compared with sources that were opened and read. Progress, still open: the Miller formula as printed in arXiv 1410.5340 (which cites Miller 2005) equals the engine's formula; Miller's own article was not opened and the engine estimates bullet length rather than taking it. Spin drift and Coriolis formulas have no opened source that gives equations. Coriolis and spin-drift magnitudes at 1000 yd for one chosen bullet came out slightly OUTSIDE the ranges Applied Ballistics prints (see `docs/MODEL_SOURCES.md`). Close-out round: Coriolis was checked against its own first-order derivation (engine equals 2*Omega*sin(lat)*integral(x dt) to 7e-7, independent trapezoid integration), and the 1000 yd magnitude difference from the article range is accounted for by the article's constant-velocity-style figure (2.96 in at this flight time, engine 3.34 in; the article gives no formula, so that is an inference). Spin drift equals the formula 1.25(SG+1.2)T^1.83 as coded and sits inside the article's outer limit of 12 in, but above its typical 8 to 9 in (9.31 in). No opened source states the spin-drift equation, so it stays unsourced. WAIVED by the project owner on 2026-11-16 (22:23), closing Stage 5 as a limited software and reference-validation milestone. Narrowed scope accepted: Coriolis derived and tested; Miller matched to its printed form; spin drift identified as an empirical approximation with no opened source, labeled Unverified. Leaves unestablished: the source of the spin-drift equation, Miller's original article, and the bullet-length estimate; physical accuracy of all three.
- [x] Every claim in the reports and in `docs/MODEL_SOURCES.md` is backed by evidence in the repo, and no component is labeled Verified without it. COMPLETE. Evidence: every count in the reports is pinned by `tests/validation.test.js` against the runner output (201 of 211, the round 1 breakdown 100 of 103, round 2, the 10 failures by name, 265 of 266 audit cells); every claim that rests on a page read points to `tests/validation/source-reads.json`; guard tests fail if a drag table, Federal data or a physical-accuracy claim is labeled Verified. The only Verified item is the BC to SI factor 703.0696, by arithmetic. This criterion is about honest reporting. It says nothing about whether the model is accurate.

## What the waiver means

- The Hornady numbers were copied by the author and corrected by the owner. Nobody who had not seen them has reproduced them.
- Because of that, no component may be labeled Verified on the strength of the Hornady table alone. The drag tables and the drag equation stay Unverified.
- Reports keep saying the reference copy was owner-checked only. The waiver does not change what the evidence shows.
- The protocol and tool remain in the repo (`docs/REVIEWER_PROTOCOL.md`, `tests/tools/compare-reviewer.js`) if the decision is reversed.

## Three separate achievements

| Achievement | Question | Where it stands |
| --- | --- | --- |
| Software correctness | Does the program calculate consistently? | Supported by automated tests. |
| Reference agreement | Does it reproduce published data? | Partial, with unresolved source and transcription checks. Federal and Hornady datasets were registered and compared under two candidate atmospheres (100 of 103 pass in total across all runs; the three misses are under ICAO; breakdown in `docs/VALIDATION_REPORT.md`). The entries have not been checked against the original pages, the drag-table origin is unknown, and the Hornady copy is owner-checked only (an independent reproduction was waived on 2026-11-16). |
| Physical accuracy | Does it predict what an actual bullet does? | NOT DEMONSTRATED. Needs measured flight data. |

Completing Stage 5 can be done with physical accuracy still NOT DEMONSTRATED, but only if every report says so. Any
claim of physical accuracy needs measured data, and none has been compared.

## Close-out status (2026-11-16, 22:23)

Stage 5 is **COMPLETE EXCEPT WAIVED ITEMS**: 1 complete, 7 waived, 0 open, as a limited software and reference-validation milestone. The owner accepted the narrowed scopes and waivers in `docs/STAGE5_CLOSEOUT.md`. Seven criteria are waived, not met. A waived item is not evidence. Nothing was marked complete to finish the project.

| Criterion | State | Basis |
| --- | --- | --- |
| Independent reviewer reproduction | WAIVED (owner, 2026-11-16 20:23) | decision of the owner |
| Owner check of Federal and Hornady entries | WAIVED, narrowed (22:23) | 265 of 266 cells corroborated by 8 reads; no raw-source check |
| Second manufacturer reproduced | WAIVED, narrowed (22:23) | Federal and Hornady sets registered before running and reproduced; Federal G7 .224 unreproducible |
| G1 and G7 table origin | WAIVED, narrowed (22:23) | compared with secondary copies only; Unverified |
| 1.8% Hornady offset | WAIVED, narrowed (22:23) | supported hypothesis, not confirmed |
| Standard atmosphere | WAIVED, narrowed (22:23) | altitude formula has no opened source |
| Spin drift, stability, Coriolis formulas | WAIVED, narrowed (22:23) | spin-drift equation has no opened source |
| Claims backed by repo evidence, no unearned Verified | COMPLETE | enforced by guard tests |

## Muzzle velocity: the user's entered FPS versus factory reference velocities

Scope Dope is built so the user enters their own **measured** muzzle velocity (FPS) for each bullet and load. Factory velocities appear only as reference data and never as the app's input.

- Factory velocities (for example 2650 fps for Federal GM308M 168 gr, 2875 fps for the Federal 6.5 CM 130 gr, Hornady table velocities) live in `tests/validation/references.json` and are used only by the comparison tools under `tests/tools/`. `index.html` does not read that file or any factory data (guard test).
- The app's normal calculation uses the number in the Muzzle velocity field (`#v0`). The only adjustment is the user's own temperature setting (velocity change per degree F, default 0, measured-at temperature default 59 F); with those defaults the calculated velocity equals the entered one (guard test). Nothing in the app substitutes a factory figure for an entered one.
- A reference comparison runs the same engine with the factory velocity for that table, because it is testing the table. It says nothing about what velocity a shooter should use. A pass means the calculation reproduces that table from that table's own inputs. It does not mean the factory velocity is right for any rifle.
- Observation, not changed in this close-out: choosing a cartridge preset fills the velocity field with a typical value (for example 2650 fps) and shows a notice that it replaced the user's entries. That happens only on the user's explicit selection. The starting value of the field is also 2650 fps. Both are placeholders to be overwritten with the shooter's own chronograph number. Whether a preset should ever overwrite an entered velocity is a product decision for a later change; it is outside this close-out and nothing was altered.
- Reports describe factory data as "reference" and the user's entry as "entered" or "measured". No report treats a factory velocity as the user's velocity.

Close-out recommendation, feasibility of each open item, and proposed waiver wording: `docs/STAGE5_CLOSEOUT.md`.

## What can and cannot be claimed about accuracy

Can be claimed:
- Software correctness: the calculations are consistent and reproducible, supported by the automated Node test suite (see the test results in the final report) and four browser suites.
- Reference agreement, partial: 201 of 211 comparisons with manufacturer tables are within pre-registered tolerances; the 10 misses are consistent with the atmosphere hypothesis (3, a supported hypothesis, not confirmed) or traced to a stated BC that does not match its table (7), with no calculation error indicated.
- Drag shape: for 26 measured Doppler drag values (.308, about 100 m), 21 are within 3% of the app's drag-table prediction.

Cannot be claimed:
- Physical accuracy of drop, drift, spin drift, Coriolis or atmosphere handling. Physical accuracy: NOT DEMONSTRATED. No measured trajectory data was compared.
- That a manufacturer table was confirmed by an independent check. None was. Neither drag table is Verified.
- That Hornady computed its tables at Aberdeen conditions.

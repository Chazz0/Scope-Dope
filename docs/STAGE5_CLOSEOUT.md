# Stage 5 close-out decision record

**Decision recorded 2026-11-16 (22:23): the project owner accepted this close-out.** Stage 5 is closed as a limited software and reference-validation milestone: **COMPLETE EXCEPT WAIVED ITEMS** (1 complete, 7 waived, 0 open). The sections below were written as a recommendation before the acceptance and are kept as written, except where marked. Physical accuracy: **NOT DEMONSTRATED**. The text said "NOT COMPLETE (1 complete, 1 waived, 6 open)" until the acceptance; that was the state before it.

Limitations that stay explicit, by the owner's instruction: physical accuracy NOT DEMONSTRATED; G1 and G7 drag tables Unverified; manufacturer comparisons not independently verified; Hornady atmosphere explanation a supported hypothesis, not confirmed; no claim that the app has been proven accurate against actual bullet flight.

Product requirement recorded with the acceptance: the user enters their own measured muzzle velocity for each load, and factory velocities are reference data only and never override it (`docs/STAGE5_COMPLETION.md`).

## Settled findings (unchanged by this round)

- **Federal .308 168 gr.** The G1 comparison uses the 79-point G1 table, BC .462 (Federal's printed value, not fitted), 2650 fps, 168 gr: 24 of 24 within tolerance. The earlier G7 .224 comparison (7 of the 10 failures) is kept in the results and is unsupported by the manufacturer's own table. Details in `docs/VALIDATION_REPORT.md`. That .462 is a G1 BC is an inference from the fit; Federal does not label it.
- **Hornady atmosphere.** The 3 ICAO velocity misses (1.06% to 1.38%) pass under Aberdeen and under their printed conditions. This is a **supported hypothesis, not a confirmed explanation**. No Hornady source states the LE table's atmosphere. Neither atmosphere is selected.
- **Doppler.** Measured drag only: 26 values, .308 bullets, about 100 m, 21 within 3%. It does not support any claim about trajectory, drop, drift, spin drift, Coriolis or atmosphere handling, and it does not test the BC.
- **Frozen.** Solver, BCs, drag tables, tolerances, default atmospheres and golden baseline are unchanged (empty diff against 9f37df7 for `index.html`, `tests/golden`, `tests/helpers`, `tests/solver.test.js`; tolerances, table points and atmospheres in `references.json` identical; the 7 round 1 data sets differ from 9f37df7 only by the added `registeredRound: 1` tag, with every published value, BC and condition unchanged).

## Can each open criterion be completed by automated research and testing?

| # | Open criterion | Realistically completable by automation? | Blocker | Proposed path |
| --- | --- | --- | --- | --- |
| 1 | Owner check of Federal and Hornady entries against the original pages | **No** | needs raw pages or PDFs; every available read is a model-written extraction; no network from the shell | Narrower scope: "entries corroborated by at least two reads, one from a different publication, with a recorded mismatch list" (met: 265 of 266 cells, 8 reads). Owner formally accepts the narrowed scope. Raw check deferred |
| 2 | Second manufacturer reproduced the same way | **Partly.** Reproduction is done (Federal 6.5 CM G7 .287 24 of 24; Federal .308 G1 .462 24 of 24; plus 175 gr) | source entries not raw-checked; no independent reproducer; Federal's printed G7 .224 unexplained | Narrower scope: "a second manufacturer's tables were registered before running and reproduced within tolerance, with the one unreproducible published BC reported." Owner accepts it |
| 3 | Origin of the G1 and G7 tables, every point compared with it | **No** | no authoritative original table could be opened; only secondary copies of unknown origin | Formal waiver, or narrowed to "point-for-point comparison with secondary copies, tables labeled Unverified" (done: G1 79 of 79, G7 83 of 83 shared points). Labels stay Unverified either way |
| 4 | 1.8% Hornady offset explained | **No** | needs Hornady's stated atmosphere or calculation inputs | Narrowed to "documented as a supported hypothesis with the evidence and the unresolved gap" (done). Never relabeled confirmed |
| 5 | Standard atmosphere compared with an opened source | **Yes, mostly.** Sea level and humid terms are done | the altitude (barometric) formula has no opened source; the 1976 document was not opened | One more source fetch for the barometric formula and a pinned test. Left undone here because this round froze new research. Small, automatable |
| 6 | Spin-drift, stability and Coriolis compared with opened sources | **Partly.** Coriolis (derived), Miller printed form and the coded spin-drift formula are done | no opened source states the spin-drift equation; Miller's own article not opened; bullet length is estimated, not input | Narrowed to "Coriolis derived and tested; Miller matched to its printed form; spin drift identified as an empirical approximation with no opened source, labeled Unverified." Spin drift cannot be closed without a primary source or measured drift data |

Nothing in rows 1, 3, 4 and 6 can be finished without primary sources or physical measurements this environment cannot reach. Row 5 is the only item that is realistically a small automated task.

## Recommendation

**Recommendation (accepted): Stage 5 can be closed as a limited software and reference-validation milestone, with physical accuracy NOT DEMONSTRATED**, provided the owner formally accepts the narrowed scopes above for rows 1 to 4 and 6 (or waives them) and row 5 is either finished or narrowed the same way. Until the owner says so, the status stays NOT COMPLETE. The status line and counts must then be changed in the same commit as the owner's decision, with the waiver recorded the way the reviewer waiver was (who, when, what it leaves unestablished).

What the closed milestone would honestly say:
- Software correctness: supported by automated tests.
- Reference agreement: partial. 201 of 211 comparisons within pre-registered tolerances; the 10 misses are 3 consistent with an unconfirmed atmosphere hypothesis and 7 caused by a Federal BC that does not match its own table. No calculation error is indicated.
- Drag shape: measured Doppler drag at about 100 m agrees within 3% for 21 of 26 values.
- Not shown: physical accuracy of trajectory, drop, drift, spin drift, Coriolis or atmosphere handling; independent verification of any manufacturer table; the origin of the drag tables; Hornady's atmosphere.

## Accepted waiver wording (accepted by the owner 2026-11-16 22:23; in effect)

> Waiver of the unmet parts of Stage 5 criteria 1, 2, 3, 4 and 6 and the altitude part of criterion 5. Stage 5 is closed as a limited software and reference-validation milestone. Unestablished by this waiver: raw-source verification of the Federal and Hornady entries; independent reproduction by someone other than the author; the origin and accuracy of the G1 and G7 tables; Hornady's atmosphere for the LE table; the source of the spin-drift equation; and all physical accuracy. Physical accuracy remains NOT DEMONSTRATED and no report may claim otherwise.

Accepting it needed one reply from the owner and did not require checking any data. The reply was given on 2026-11-16 at 22:23.

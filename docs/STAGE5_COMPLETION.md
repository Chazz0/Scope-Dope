# Stage 5 completion criteria

**Summary.** Reference agreement is partly demonstrated across several manufacturer datasets, but remains incomplete. The Federal and Hornady datasets have been registered and compared under two candidate atmospheres. 100 of 103 comparisons pass. The three misses occur under ICAO conditions. The reference entries still need owner checking against their original pages, and the drag-table origin remains unknown. None of this establishes physical accuracy.

Stage 5 is complete only when the evidence supports the claims. It is not complete because automated tests pass.

**Stage 5 status: NOT COMPLETE**

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

Criteria: 0 complete, 1 waived, 7 open.

- [~] An independent reviewer reproduced the Hornady comparison from the original manufacturer page, without the project's transcription. WAIVED by the project owner on 2026-11-16 (20:23). The Hornady reference copy stays owner-checked only: it rests on the author's transcription and the owner's correction, and was not independently reproduced.
- [ ] The project owner checked every Federal and Hornady reference entry against the original manufacturer pages (`docs/OWNER_CHECK_REFERENCE_DATA.md`) and any discrepancy is recorded, not silently corrected. Not done: the sheet is generated and blank.
- [ ] A second, different manufacturer data set has been reproduced the same way, covering something the first does not (a G7 bullet, another velocity, altitude or temperature). The criterion is OPEN. Its parts: (a) dataset registered and calculations run: done for Federal (G7 .287) and four Hornady tables (`tests/validation/references.json`, `node tests/tools/run-validation.js`); (b) every source entry checked against the original manufacturer page: OPEN, covered by the owner-check criterion above; (c) independent reproduction: not performed. The entries were read by a page-reading tool, nobody has checked them against the pages, Federal does not publish its atmosphere, and the Federal dataset is not independently verified. Agreement with published tables is not verification.
- [ ] The origin of the G1 and G7 tables is established and every point of each was compared with that source. Progress, still open: origin still unknown. All 79 G1 and 83 G7 points were compared with a secondary copy of unknown origin (identical at every shared point; that copy has one extra G7 point at Mach 1.125). This is a point-for-point comparison against a secondary copy of unknown origin. It establishes consistency between the copies, not the provenance or accuracy of the tables. Neither table is Verified. No authoritative original has been opened and compared.
- [ ] The steady offset of about 1.8% in effective BC against the Hornady table is explained. Progress, still open: HYPOTHESIS, not an established explanation. Re-running the same case in the Aberdeen atmosphere (59 F, 29.53 inHg, 78% RH) removes the offset (velocity within 0.06%), with no BC or solver change. That is consistent with Hornady computing its tables in that atmosphere, but the LE page does not say so, and Hornady's own pages disagree about the standard atmosphere.  Neither Hornady statement proves the LE trajectory was calculated under Aberdeen conditions: one page gives 59 F, 29.53 inHg, 78% RH as standard conditions for an unnamed book, and Hornady's website says BCs are corrected to ICAO. Both atmosphere comparisons are kept, Aberdeen is not selected, and the offset is not resolved. Investigated 2026-11-16 (see `docs/MODEL_SOURCES.md`): Hornady's own page states these Aberdeen conditions for "this book", its BC page says ICAO, and neither says which applies to the LE table. It stays open until the atmosphere is confirmed from the manufacturer.
- [ ] The standard atmosphere was compared with a source that was opened and read. Progress, still open: the U.S. Standard Atmosphere 1976 sea-level constants (as printed in a program that cites it) agree with the engine within 0.002% for density and speed of sound (`node tests/tools/formula-audit.js`). Only sea level was compared; the altitude and humidity terms have no opened source. The 1976 document itself was not opened.
- [ ] The spin-drift, stability and Coriolis formulas were compared with sources that were opened and read. Progress, still open: the Miller formula as printed in arXiv 1410.5340 (which cites Miller 2005) equals the engine's formula; Miller's own article was not opened and the engine estimates bullet length rather than taking it. Spin drift and Coriolis formulas have no opened source that gives equations. Coriolis and spin-drift magnitudes at 1000 yd for one chosen bullet came out slightly OUTSIDE the ranges Applied Ballistics prints (see `docs/MODEL_SOURCES.md`).
- [ ] Every claim in the reports and in `docs/MODEL_SOURCES.md` is backed by evidence in the repo, and no component is labeled Verified without it

## What the waiver means

- The Hornady numbers were copied by the author and corrected by the owner. Nobody who had not seen them has reproduced them.
- Because of that, no component may be labeled Verified on the strength of the Hornady table alone. The drag tables and the drag equation stay Unverified.
- Reports keep saying the reference copy was owner-checked only. The waiver does not change what the evidence shows.
- The protocol and tool remain in the repo (`docs/REVIEWER_PROTOCOL.md`, `tests/tools/compare-reviewer.js`) if the decision is reversed.

## Three separate achievements

| Achievement | Question | Where it stands |
| --- | --- | --- |
| Software correctness | Does the program calculate consistently? | Supported by automated tests. |
| Reference agreement | Does it reproduce published data? | Partial, with unresolved source and transcription checks. Federal and Hornady datasets were registered and compared under two candidate atmospheres (100 of 103 pass; the three misses are under ICAO). The entries have not been checked against the original pages, the drag-table origin is unknown, and the Hornady copy is owner-checked only (an independent reproduction was waived on 2026-11-16). |
| Physical accuracy | Does it predict what an actual bullet does? | NOT DEMONSTRATED. Needs measured flight data. |

Completing Stage 5 can be done with physical accuracy still NOT DEMONSTRATED, but only if every report says so. Any
claim of physical accuracy needs measured data, and none has been compared.

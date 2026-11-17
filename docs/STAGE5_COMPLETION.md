# Stage 5 completion criteria

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

Criteria: 0 complete, 1 waived, 6 open.

- [~] An independent reviewer reproduced the Hornady comparison from the original manufacturer page, without the project's transcription. WAIVED by the project owner on 2026-11-16 (20:23). The Hornady reference copy stays owner-checked only: it rests on the author's transcription and the owner's correction, and was not independently reproduced.
- [ ] A second, different manufacturer data set has been reproduced the same way, covering something the first does not (a G7 bullet, another velocity, altitude or temperature). Progress, still open: Federal Gold Medal Berger 6.5 CM 130 gr (G7 .287) and four Hornady resource-page tables were registered and run (`tests/validation/references.json`, `node tests/tools/run-validation.js`). They were read by a page-reading tool, not by the author, and nobody has yet checked those copies against the pages. Federal does not publish its atmosphere. Results are agreement with published tables, not verification.
- [ ] The origin of the G1 and G7 tables is established and every point of each was compared with that source. Progress, still open: origin still unknown. All 79 G1 and 83 G7 points were compared with a secondary copy of unknown origin (identical at every shared point; that copy has one extra G7 point at Mach 1.125). That compares two copies of unknown origin and does not verify either. No authoritative original has been opened and compared.
- [ ] The steady offset of about 1.8% in effective BC against the Hornady table is explained. Progress, still open: HYPOTHESIS, not an established explanation. Re-running the same case in the Aberdeen atmosphere (59 F, 29.53 inHg, 78% RH) removes the offset (velocity within 0.06%), with no BC or solver change. That is consistent with Hornady computing its tables in that atmosphere, but the LE page does not say so and Hornady's own pages disagree about the standard atmosphere. It stays open until the atmosphere is confirmed from the manufacturer.
- [ ] The standard atmosphere was compared with a source that was opened and read. Progress, still open: no readable authoritative source for the ISA constants has been opened yet.
- [ ] The spin-drift, stability and Coriolis formulas were compared with sources that were opened and read. Progress, still open: see `docs/MODEL_SOURCES.md`. The sources opened give magnitudes and directions only, not formulas, apart from a reconstructed Miller formula.
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
| Reference agreement | Does it reproduce published data? | Partly. Not established until the criteria above are met. |
| Physical accuracy | Does it predict what an actual bullet does? | NOT DEMONSTRATED. Needs measured flight data. |

Completing Stage 5 can be done with physical accuracy still NOT DEMONSTRATED, but only if every report says so. Any
claim of physical accuracy needs measured data, and none has been compared.

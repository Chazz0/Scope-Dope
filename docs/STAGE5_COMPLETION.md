# Stage 5 completion criteria

Stage 5 is complete only when the evidence supports the claims. It is not complete because automated tests pass.

**Stage 5 status: NOT COMPLETE**

`tests/validation.test.js` fails if the status above says COMPLETE while any box below is unchecked, or if the
reviewer box is checked without `tests/validation/reviewer-results.json`. Check a box only with evidence in the repo.

## Criteria

- [ ] An independent reviewer reproduced the Hornady comparison from the original manufacturer page, without the project's transcription (`tests/validation/reviewer-results.json`)
- [ ] A second, different manufacturer data set has been reproduced the same way, covering something the first does not (a G7 bullet, another velocity, altitude or temperature)
- [ ] The origin of the G1 and G7 tables is established and every point of each was compared with that source
- [ ] The steady offset of about 1.8% in effective BC against the Hornady table is explained
- [ ] The standard atmosphere was compared with a source that was opened and read
- [ ] The spin-drift, stability and Coriolis formulas were compared with sources that were opened and read
- [ ] Every claim in the reports and in `docs/MODEL_SOURCES.md` is backed by evidence in the repo, and no component is labeled Verified without it

## Three separate achievements

| Achievement | Question | Where it stands |
| --- | --- | --- |
| Software correctness | Does the program calculate consistently? | Supported by automated tests. |
| Reference agreement | Does it reproduce published data? | Partly. Not established until the criteria above are met. |
| Physical accuracy | Does it predict what an actual bullet does? | Not demonstrated. Needs measured flight data. |

Completing Stage 5 can be done with physical accuracy still "Not demonstrated", but only if every report says so. Any
claim of physical accuracy needs measured data, and none has been compared.

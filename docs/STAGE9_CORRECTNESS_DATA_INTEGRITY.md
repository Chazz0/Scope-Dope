# Stage 9: correctness and data integrity

Branch `stage-9-correctness-data-integrity`, from `stage-8-calculation-audit` (c99bb06). Nothing merged into main.

**No calculation changed.** The solver block is byte-identical to Stage 8 (and Stage 5), the model version is 1.0.0, the drag tables,
golden baseline and reference data are untouched. Physical accuracy: NOT DEMONSTRATED.

## Completed fixes

| ID | Before (Stage 8 behaviour, reproduced by the new tests) | After |
| --- | --- | --- |
| C5 | Switching to a saved rifle that lacked a field left the previous rifle's value in the form (twist 7 and scope height 2.2 carried over). | `applyProfile` gives every missing or null field its default. A rifle with no saved velocity gets the starting value, labelled as not yours. Back-and-forth switching, save and reload leave rifle A exact (2713 fps kept) and rifle B at defaults. |
| C2 | 500 fps, BC 0.05, zero 1000 yd showed "10.8 up" with no notice (the engine stopped at its 20 degree limit). | The page shows `Zero not reachable: ...`, flags the Zero field, shows no dial numbers or range card rows, and keeps the typed zero. Reachable long zeros (22 LR style 1000 yd zero, default load at 1000 yd, 20 mph headwind) are unaffected. The match tool refuses to fit against an unreachable zero. |
| C6 | A velocity set by the match tool was saved and shown as "Your entered velocity". | Velocity source `fitted` (shown, saved, reloaded): "Fitted velocity ... not a measured velocity ... can absorb errors in the ballistic coefficient, the drag model or the air". A fitted BC is flagged the same way (`bcsrc`, shown under the BC field, saved, cleared when you type a BC or pick a preset). The panel carries a note for each; the match tool's message and heading carry the explanation. A preset does not silently replace a fitted velocity. |
| C4 / C6b | Label "Air pressure (inHg)". Station pressure of 19.0 or 16.9 inHg (12,000 and 15,000 ft) was rejected. | Label "Station pressure (not sea-level pressure)". Accepted range 15 to 32.5 inHg, so station pressure across the whole altitude range is accepted and kept as typed. A pressure more than 8% above the standard-atmosphere value for the entered altitude (for example 29.92 inHg at 5000 ft) gets a note that it looks like sea-level pressure; it is still used as entered. Values outside 15 to 32.5 are rejected, not substituted. |
| Stability wording | "The twist is fast enough." and "the bullet may tumble". | "Estimated stability X, worked out from an assumed bullet length (estimated from weight and diameter, not measured), so a real bullet can differ. ..." with "suggests" language below 1.0. |

## Investigations (no behaviour changed; approval needed for any change)

### Spin drift when estimated SG is below 1 (item 6)
Probe: `node tests/tools/stage9-investigate.js`.
- The engine still returns a spin-drift number when the estimate is below 1. Of 240 preset, twist and temperature combinations tried, 75 gave SG below 1, for example .223 55 gr at 1:14 (SG 0.99 at 59 F, 0.80 at -40 F) giving 10.4 to 12.8 in of spin drift at 1000 yd, and .243 95 gr at 1:12 (SG 0.87) giving 7.1 in.
- **No preset load with its own default twist is below 1** (SG 1.25 to 3.23 at 59 F). Low values come from a slower twist the user enters, or from cold air.
- The number feeds the windage hold (HUD dial, range card, CSV). The only stability message is on the Rifle tab. The Litz formula `1.25 (SG + 1.2) t^1.83` is a smooth function with no lower limit on SG; its source was not found in Stage 5 and its valid range is unknown. A bullet whose real stability is below 1 may not fly the modelled path at all.
- **Recommendation (needs your approval):** keep the formula unchanged, and add a display-only note in the panel when SG < 1: "estimated stability is below 1, spin drift is shown but not reliable". Alternatively hide the spin-drift term below 1, which changes a displayed number and needs a model decision. I made neither change.

### Weight-based BC scaling (item 7)
Observed on the real page by the same probe:
- Changing bullet weight rewrites the BC in proportion: 168 gr at .462 to 175 gr gives .481; changing back restores .462 (kept from the anchor). A message is shown.
- Diameter edits do not rescale it (BC depends on diameter as well as weight and form). A model switch G1 to G7 keeps the same number and reads it as G7.
- **Order dependence:** a user who types the BC for a 190 gr bullet (.533) and then changes the weight to 200 gets .561. The typed value is replaced. Entering weight first and then BC keeps .533.
- **Consequence size:** a 5% BC change moves the 1000 yd drop by 16.1 in (1.54 MOA) and the 500 yd drop by 1.16 in for the .308 168 gr example. Proportional scaling is exact only for the same diameter and same shape; published BCs of neighbouring bullet weights generally do not follow it, so the scaled value is an estimate of unknown size. I did not check published BCs against the scaling.
- A fitted BC keeps the fitted flag when the weight scaling changes it; a scaled value is still derived from a fitted one.
- **Recommendation (needs your approval):** do not rewrite a BC the user typed or fitted. Keep scaling only for factory starting values from a preset, or replace it with a message ("coefficient not changed; check it for 200 gr"). I did not change the behaviour.

## What could not be safely fixed
Nothing was blocked. C2 was fixed without touching the zeroing mathematics: the check re-traces the engine's own zero angle without wind and compares the height at the zero distance with the sight line (tolerance 2 mm). The engine itself still returns its 0.35 rad limit silently when called directly; the page now refuses to use that result. Fixing it inside the engine would change the solver block, which is not authorized.

## Recommendations still needing approval
1. Spin drift display at SG < 1 (above).
2. Weight-based BC scaling (above).
3. Items 3 to 12 of the Stage 8 ranked list (zero atmosphere input, one elevation method, bullet length input, model-switch BC handling, library evaluation, moving target, scope click type).

## Existing tests changed
- `tests/browser/inputs.check.js`: one expectation, allowed pressure text "15 to 32.5" (was "20 to 32.5"). Intended change.
- `tests/browser/upgrade.check.js`: the field comparison also ignores the new empty `bcsrc`, like `v0src`.
No test expectation about a calculated number changed.

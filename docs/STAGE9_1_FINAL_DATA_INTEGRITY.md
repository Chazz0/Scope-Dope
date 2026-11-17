# Stage 9.1: stability warning and BC confirmation

Branch `stage-9-1-final-data-integrity`, from Stage 9 commit 9fca237. Nothing merged into main.
**No calculation changed.** The solver block (including the spin-drift formula) is byte-identical to Stage 9, Stage 8 and Stage 5,
the model version is 1.0.0, and the golden baseline and reference data are untouched. Physical accuracy: NOT DEMONSTRATED.

## 1. Spin drift below estimated stability 1.0 (display only)

| | Stage 9 | Stage 9.1 |
| --- | --- | --- |
| .223 55 gr, 1:16 twist, 59 F (estimated SG 0.75) | Spin drift added to windage with no mention on the HUD or Chart; only the Rifle-tab hint existed. | A warning on the HUD panel and on the Chart tab: "Estimated stability is 0.75, below 1.0. The spin-drift part of the windage comes from that estimate and may be unreliable. The estimate uses an assumed bullet length, so a real bullet can differ." |
| Default .308 168 gr 1:10 (SG 2.5), fast twists, twist 0 | no warning | no warning |
| Numbers shown (HUD dials, whole range card) | reference | **identical** to the Stage 9 page for three input sets (a test serves both pages and compares every value) |

The warning appears only when a twist is set (spin drift is in use) and the estimate is below 1.0. The formula and value are untouched.

## 2. Ballistic coefficient and weight changes

Source of the coefficient is now stored with each rifle (`bcsrc`: `factory` = preset-derived, `user` = typed, `fitted`, or empty = saved before sources were recorded) together with the weight it belongs to (`bcwt`).

| Case | Stage 9 | Stage 9.1 |
| --- | --- | --- |
| Typed BC .533 for 190 gr, weight changed to 200 gr | BC silently became .561 | BC stays .533. The result is hidden with: "Bullet weight is 200 gr, but the ballistic coefficient 0.533 was entered for 190 gr and may not apply to this bullet. Enter the coefficient for this bullet, or on the Rifle tab keep 0.533 for 200 gr." A button "Keep 0.533 for 200 gr" confirms; typing a coefficient also resolves it. Going back to 190 gr resolves it with no change. |
| Fitted BC, weight changed | scaled | unchanged, same prompt; stays labelled fitted after confirming |
| Old saved rifle (no source recorded) | scaled | treated as the user's own: unchanged, same prompt on a weight change; no prompt on load |
| Weight typed digit by digit (2, 20, 200) | scaled each step | never changes a typed BC |
| Preset-derived BC (168 gr .462 to 175 gr) | scaled to .481, message | same (.481, message), and restored at 168 gr. This is the one case that still follows the weight. |

Labels, each different: preset-derived ("a typical coefficient for the selected cartridge, not one for your bullet"), your entered, your saved, fitted. The HUD panel also carries a note for a preset-derived BC (`bcfactory`) and a fitted BC (`bcfitted`). The prompt survives reload, rifle switching does not leak it, and source and weight are saved and loaded with the rifle.

## Existing tests changed (intended behaviour change)
- `tests/browser/inputs.check.js`: "a coefficient you type becomes the new starting point for later weight changes" asserted the old scaling. It now asserts the typed BC (0.5) is not rewritten at 190 gr.
- `tests/browser/stage9.check.js`: three BC expectations: typing sets `user` (was empty), a preset sets `factory` (was empty), a saved coefficient has its own label (was blank).
- `tests/browser/upgrade.check.js`: the field comparison also ignores the new `bcwt`.
No calculated-number expectation changed.

## Limits
- A preset still replaces BC, weight, diameter, twist and model (with a message), as before.
- A model switch G1 to G7 still keeps the same BC number (Stage 8 item, not part of this change).
- The result is hidden until a typed or fitted BC is confirmed at a new weight; that is deliberate, and follows the existing rule that unresolved input hides the result.

# Step 7: UX and data integrity

A product and interface milestone. No ballistic calculation was changed. Physical accuracy: NOT DEMONSTRATED.
G1 and G7 drag tables remain unverified. Manufacturer comparisons are not independently verified.

## What changed
- **Muzzle velocity is protected.** Each rifle stores `v0src`: `user` (typed or fitted by you), `factory` (a preset starting value), or empty/absent (saved before Step 7, treated as yours).
  A cartridge preset fills the field only when it was empty or still a factory starting value. Otherwise your velocity is kept, the factory value is shown as reference only, and replacing it needs an explicit confirm button (with a cancel).
  The calculation always reads the velocity field; the factory value never becomes input on its own.
- **Profiles.** One rifle entry is one rifle plus one load, so each keeps its own name, cartridge, bullet, weight, BC and type, velocity, twist and other settings. Two loads of one rifle with the same name are listed with cartridge and weight added. A copied load says its velocity was copied.
- **Chart tab.** A short panel states the trajectory is a calculated estimate, not independently verified against measured bullet flight, that reference comparisons cover limited conditions, and that being inside them does not establish accuracy. Warnings appear when the range card or inputs leave the compared conditions. The note is also in the CSV.
- **Units.** Labels spell out fps, yards, grains and inches. Empty, non-numeric and out-of-range inputs keep their separate messages and are never replaced by defaults.
- **Phone layout.** Checked at 360 and 390 px: no sideways scroll, no clipping, touch targets at least 40 px high.

## Not changed
Solver block (byte-identical to Stage 5, guarded by tests), `MODEL_VERSION` 1.0.0, golden baseline, tolerances, BC values, atmospheric defaults, `references.json`.

## Known limitations
- A preset still replaces BC, weight, diameter, twist and model (with a message), only the velocity is protected.
- Rifles of people you have not opened yet keep their saved text unchanged until opened.
- Windage in inches is not added as a display, since it would be a new derived number.

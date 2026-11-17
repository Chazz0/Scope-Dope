# Scope Dope release notes (preliminary release, model version 1.0.0)

**Read this first.** Scope Dope gives calculated estimates. The model has **not** been shown to be physically accurate (status: NOT DEMONSTRATED). It has been compared with manufacturer tables and with a small amount of published measured data, and that comparison was inconclusive. Do not rely on it where a wrong dial setting could hurt someone. Always confirm with live fire at known distances.

## What Scope Dope does

A single-page ballistic calculator for rifles. You pick or enter a load, your sight and scope settings and the conditions, and it shows the elevation and windage to dial for a distance (HUD tab), a full range card with CSV export (Chart tab), and your rifle, person and backup settings (Rifle tab). Data is stored only in your own browser. Nothing is sent anywhere.

## What the model calculates

- Bullet path as a point mass in two dimensions, using G1 or G7 drag tables and a single ballistic coefficient (BC) that you enter or take from a preset.
- Air density and speed of sound from temperature, altitude or station pressure, and humidity (standard-atmosphere formulas).
- Zero at your zero distance, in the same air as the shot.
- Wind drift from any clock position (lag-time rule), spin drift (an empirical estimate), Coriolis effect when you enter a latitude, and angled (uphill or downhill) shots.
- Estimated gyroscopic stability (Miller formula) from an **assumed** bullet length, because the app does not ask for the length.
- A "true to a real impact" tool that fits muzzle velocity or BC to one observed hold. The result is labelled fitted, not measured.

## What has been tested

- Software behaviour: 160 Node tests and 196 browser checks (saved data, profile workflows, invalid and boundary inputs, desktop and phone layouts, markup in names, backup and restore).
- Calculation guards: the solver, drag tables, reference data, tolerances and golden baseline are pinned and tested for change.
- The code was compared with a separately written integration of the same equations (agreement to about 0.0002 in on drop). This shows the code does what the equations say. It does not show the equations match real bullets.
- Comparison with manufacturer trajectory tables (Federal and Hornady) over a limited set of loads and conditions. Manufacturer tables are calculated, so agreement is not proof of real-world accuracy.
- Comparison with measured Doppler-radar drag data (21 of 26 rows within 3%). This tests drag shape only.
- A measured-trajectory comparison (Stage 11) with three published sets. It was inconclusive: the sources omit atmosphere, zero or sight height, and the unknown inputs move the prediction as much as the disagreement. Differences ranged from within measurement error to about 1.5 mil (64 in at 1220 yd).

## What has not been validated

- Physical accuracy of any output (NOT DEMONSTRATED).
- Wind drift, spin drift, angled-shot behaviour, humidity and pressure inputs, and temperature-based velocity changes against measured data.
- The G1 and G7 drag tables against an original source (origin unresolved).
- The Miller stability estimate for real bullet lengths, and the spin-drift equation's source.
- Coriolis: a check found the closed-form estimate larger than a full numerical integration (about 14% at 500 yd, 33% at 1000 yd, 47% at 1500 yd for one .308 sample load). This is **unresolved**.
- Any bullet, range or condition beyond those listed above.

## Known defects, assumptions and limitations

- The Coriolis discrepancy above is open and needs a separate decision to change.
- A single BC is used at all speeds. Real BCs vary with velocity, especially near the speed of sound.
- Bullet length is assumed from weight and diameter (about 1% to 9% shorter than catalog lengths for the Berger bullets checked), which changes the stability estimate. Spin drift may be unreliable when estimated stability is below 1.0, and the app warns in that case.
- Fitting or truing can absorb errors in BC, the drag model and the air inputs into the fitted value, so a fitted value may not hold at other distances or conditions.
- Enter **station** pressure (what a barometer reads), not sea-level pressure from weather reports. Sea-level pressure typed at altitude overstates air density (about 20% at 5000 ft).
- No aerodynamic jump, no powder-temperature model beyond your own change-per-degree setting, no moving targets, no bullet-length input.
- If you change the bullet weight, a factory (preset) BC is scaled with weight and is labelled as such. A BC you typed or fitted is never rewritten. A weight that is empty, zero, negative, not a number or outside 15 to 800 grains is rejected: no result is shown and no BC is rescaled. A scaled preset BC can leave the allowed 0.05 to 1.2 range at very light or very heavy weights; enter your bullet's published BC.
- Typed values are saved as typed, even when they are out of range. The app then shows an error and no result until you fix them.
- Tested in desktop Chromium with emulated phone and tablet sizes only. It has not been tested on real phones, Safari or Firefox.

## Supported inputs and units

| Input | Unit | Allowed range |
|---|---|---|
| Distance | yards | 10 to 2000 |
| Wind speed | mph (clock position or direction) | 0 to 60 |
| Angle | degrees | -75 to +75 in 5 degree steps (selector) |
| Bullet weight | grains | 15 to 800 |
| Bullet diameter | inches | 0.17 to 0.6 |
| BC and drag model | G1 or G7 | 0.05 to 1.2 |
| Muzzle velocity | feet per second | 500 to 4500 |
| Zero distance | yards | 25 to 1000 |
| Sight height | inches | 0.5 to 4 |
| Twist rate | inches per turn | 5 to 20 |
| Temperature | degrees F | -40 to 130 |
| Altitude | feet | -500 to 15000 |
| Station pressure | inHg | 15 to 32.5 (blank = estimated from altitude) |
| Humidity | percent | 0 to 100 |
| Latitude | degrees | -90 to 90 (blank = Coriolis off) |
| Scope click | MOA or MIL | per your scope |

Outputs: elevation and windage in your click units, drop in inches, velocity (fps), energy (ft-lb), time of flight (s).

## How to interpret results

- Treat every number as an estimate to test, not a fact. Check it with live fire and adjust.
- Differences between your rounds and the card can come from the BC, muzzle velocity, air, zero, sight height or the model itself. The app cannot tell which.
- Warnings and notes under the result are part of the answer. Read them.
- Use your own measured muzzle velocity (chronograph), not a factory number, whenever you can.

## Model version

The calculation model is version **1.0.0**. The version identifies the exact solver, drag tables and constants. It changes only if a calculation changes, so a saved range card can be matched to the model that made it. The version number says nothing about how correct the model is.

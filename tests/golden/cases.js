'use strict';
// Canonical cases used for the regression baseline. The expected values in baseline.json were
// produced by the engine as it stood at the baseline commit. They record CURRENT BEHAVIOR.
// They are not evidence of accuracy and must not be cited as validation.
const { baseInputs } = require('../helpers/load-solver');

const R1000 = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
const R500 = [100, 200, 300, 400, 500];

const cases = [
  { id: 'A_308_168gr_G1', note: 'plain level shot, calm, dry air', inp: baseInputs(), ranges: R1000 },
  { id: 'B_65mm_143gr_G7', note: 'G7 load, calm', ranges: R1000,
    inp: baseInputs({ v0: 2960, bc: 0.315, wt: 143, diam: 0.264, twist: 8, model: 'G7' }) },
  { id: 'C_300WM_200gr_G7_factory_conditions', note: 'conditions of the Hornady factory table used as an external point check', ranges: R500,
    inp: baseInputs({ v0: 2860, bc: 0.301, wt: 200, diam: 0.308, twist: 11, h: 1.5, zero: 200, pressInHg: 29.92, humidity: 0, model: 'G7' }) },
  { id: 'D_crosswind_10mph_from_right', note: 'full-value crosswind', ranges: R1000,
    inp: baseInputs({ windMph: 10, windFrom: 'R' }) },
  { id: 'E_headwind_10mph', note: 'headwind through relative airspeed', ranges: R1000,
    inp: baseInputs({ headMph: 10 }) },
  { id: 'F_uphill_30deg', note: 'exact rotated-gravity solution', ranges: R1000,
    inp: baseInputs({ angleDeg: 30 }) },
  { id: 'G_coriolis_45N_toward_east', note: 'Coriolis on', ranges: R1000,
    inp: baseInputs({ latDeg: 45, azimuth: 90 }) },
  { id: 'H_hot_high_humid', note: '95F, 5000 ft, 80% RH, pressure from altitude', ranges: R1000,
    inp: baseInputs({ tempF: 95, altFt: 5000, humidity: 80 }) },
  { id: 'I_left_twist_wind_from_left', note: 'left-hand twist and left wind', ranges: R1000,
    inp: baseInputs({ twistDir: 'L', windMph: 5, windFrom: 'L' }) },
  { id: 'J_pressure_entered_cold', note: 'station pressure entered, cold', ranges: R1000,
    inp: baseInputs({ pressInHg: 24.9, tempF: 41, humidity: 30 }) },
  { id: 'K_moving_target_lead_scheduled_for_removal', note: 'lead math is unreachable in the app and is scheduled for removal; this case goes away with it', ranges: R500,
    inp: baseInputs({ tgtMph: 10, tgtAngle: 90, tgtDir: 'LR' }) }
];

const FIELDS = ['dropIn', 'elevMoa', 'elevMil', 'driftIn', 'spinIn', 'corHIn', 'corVIn', 'windMoa', 'windMil', 'leadMoa', 'leadMil', 'vFps', 'energy', 't', 'mach'];

module.exports = { cases, FIELDS };

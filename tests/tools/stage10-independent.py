"""Stage 10 independent re-implementation and comparison. READ-ONLY: changes nothing in the app.

Input : tests/validation/stage10/app-outputs.json (written by tests/tools/stage10-app-outputs.js)
Output: tests/validation/stage10/independent-results.json and a text summary on stdout.

IMPORTANT LIMITS (also stated in docs/STAGE10_SCIENTIFIC_VERIFICATION.md):
- This file was written by the same author as the app, from published equations, in another language with another
  numerical method (scipy DOP853, tolerance 1e-11). It checks that the app *implements its stated equations* and
  quantifies approximations. It is NOT an independently maintained ballistic program, and agreement is NOT evidence
  of physical accuracy.
- Where it reads the G1/G7 tables it reads them from index.html, so it cannot test the table values.
Usage: python3 tests/tools/stage10-independent.py
"""
import json, math, os, sys
import numpy as np
from scipy.integrate import solve_ivp
from scipy.optimize import brentq
from scipy.interpolate import PchipInterpolator

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
APP = json.load(open(os.path.join(ROOT, 'tests', 'validation', 'stage10', 'app-outputs.json')))
G1 = np.array(APP['tables']['G1']); G7 = np.array(APP['tables']['G7'])
R = {}  # results written to JSON
def pct(a, b): return 100.0 * (a - b) / b

# ---------------------------------------------------------------------------------------------------------------
# 1. ATMOSPHERE
# ---------------------------------------------------------------------------------------------------------------
# 1a. U.S. Standard Atmosphere 1976, troposphere. Constants as printed in the public-domain reference code
#     https://www.pdas.com/programs/atmos76.f90 (the 1976 report itself, NASA-TM-X-74335, could not be opened here).
T0, P0, RSTAR, M0, GZERO, REARTH, LAPSE = 288.15, 101325.0, 8314.32, 28.9644, 9.80665, 6356766.0, -0.0065
def isa(z_geometric_m):
    h = REARTH * z_geometric_m / (REARTH + z_geometric_m)           # geometric -> geopotential
    T = T0 + LAPSE * h
    p = P0 * (T / T0) ** (-GZERO * M0 / (RSTAR * LAPSE))
    rho = p * M0 / (RSTAR * T)
    return T, p, rho, h
def app_pressure(alt_ft):  # the app's altitude->pressure expression (index.html atmosphere())
    return 101325 * (1 - 2.25577e-5 * alt_ft * 0.3048) ** 5.25588
isa_rows = []
for ft in [0, 2500, 5000, 7500, 10000, 12500, 15000]:
    T, p, rho, h = isa(ft * 0.3048)
    pa = app_pressure(ft)
    isa_rows.append({'altFt': ft, 'isaT_K': T, 'isaP_Pa': p, 'appP_Pa': pa, 'pDiffPct': pct(pa, p)})
R['isaPressure'] = isa_rows
print('1a. Altitude -> pressure: app expression vs ISA 1976 troposphere (geometric altitude converted to geopotential)')
for r in isa_rows: print('   %6d ft  ISA %.1f Pa  app %.1f Pa  diff %+.4f%%' % (r['altFt'], r['isaP_Pa'], r['appP_Pa'], r['pDiffPct']))
print('   exponent g0*M0/(R*L) = %.5f (app uses 5.25588); L/T0 = %.6e per m (app uses 2.25577e-5)' % (GZERO * M0 / (RSTAR * 0.0065), 0.0065 / T0))

# 1b. density at ISA temperature: app atmosphere(tempF=ISA temp, alt) with RH 0 vs ISA density
isa_rho_rows = []
for a in APP['atmosphere']:
    pass
# app values at ISA temperature need ISA T; read from the grid only where tempF matches, otherwise skip. The grid has
# 59F at alt 0 (ISA 59F). For altitude rows use the isa-equivalent comparison below via the formulas instead.
sea = [a for a in APP['atmosphere'] if a['tempF'] == 59 and a['altFt'] == 0 and a['rh'] == 0 and a['pInHg'] is None][0]
T, p, rho, _ = isa(0)
R['seaLevel'] = {'appRho': sea['rho'], 'isaRho': rho, 'rhoDiffPct': pct(sea['rho'], rho), 'appSos': sea['sos'], 'isaSos': 340.294, 'sosDiffPct': pct(sea['sos'], 340.294)}
print('1b. Sea level, 59 F, dry: app rho %.5f vs ISA 1.2250 (%+.4f%%); app speed of sound %.3f vs ISA 340.294 (%+.4f%%)' % (sea['rho'], pct(sea['rho'], 1.2250), sea['sos'], pct(sea['sos'], 340.294)))

# 1c. dry-air density against reference values printed on Wikipedia 'Density of air' (1 atm = 101.325 kPa, dry)
wiki = [(35, 1.1455), (20, 1.2041), (0, 1.2923), (-10, 1.3414), (-25, 1.4224)]
rows = []
for tc, ref in wiki:
    tf = tc * 9 / 5 + 32
    # use the app's atmosphere() with pressure 29.92126 inHg (=101325 Pa when multiplied by 3386.389 -> 101325.0 within 1e-6)
    import subprocess
    rows.append((tc, ref))
R['wikiDryDensity'] = []
# the app grid has no such points; evaluate the app's formula text directly through node to avoid re-implementing it
node = r"""
const {loadSolver}=require('./tests/helpers/load-solver.js');const S=loadSolver();
const pts=JSON.parse(process.argv[1]);console.log(JSON.stringify(pts.map(p=>S.atmosphere(p[0],p[1],p[2],p[3]))));
"""
def app_atm(points):
    out = subprocess.run(['node', '-e', node, json.dumps(points)], cwd=ROOT, capture_output=True, text=True, check=True).stdout
    return json.loads(out)
pts = [[tc * 9 / 5 + 32, 0, 101325 / 3386.389, 0] for tc, _ in wiki]
res = app_atm(pts)
print('1c. Dry density at 101.325 kPa vs Wikipedia "Density of air" table (secondary source)')
for (tc, ref), a in zip(wiki, res):
    R['wikiDryDensity'].append({'tC': tc, 'ref': ref, 'app': a['rho'], 'diffPct': pct(a['rho'], ref)})
    print('   %4d C  table %.4f  app %.4f  diff %+.3f%%' % (tc, ref, a['rho'], pct(a['rho'], ref)))

# 1d. saturation vapour pressure: app Magnus (610.94, 17.625, 243.04) vs Cramer's formula as printed in pyfar
#     (Giacomo-type p_sv(T) times the enhancement factor f). Cramer 1993 JASA 93:2510 itself was not opened.
def magnus(tc): return 610.94 * math.exp(17.625 * tc / (tc + 243.04))
def cramer_psv(tc, p=101325.0):
    T = tc + 273.15
    f = 1.00062 + 3.14e-8 * p + 5.6e-7 * tc ** 2
    return f * math.exp(1.2811805e-5 * T ** 2 - 1.9509874e-2 * T + 34.04926034 - 6.3536311e3 / T)
vp = []
for tc in [-10, 0, 10, 15, 20, 25, 30, 35, 40, 50]:
    m, c = magnus(tc), cramer_psv(tc)
    vp.append({'tC': tc, 'magnus_Pa': m, 'cramer_Pa': c, 'diffPct': pct(m, c)})
R['vaporPressure'] = vp
print('1d. Saturation vapour pressure, app Magnus vs Cramer-printed formula (with enhancement factor)')
for v in vp: print('   %4d C  Magnus %8.1f  Cramer %8.1f  diff %+.2f%%' % (v['tC'], v['magnus_Pa'], v['cramer_Pa'], v['diffPct']))

# 1e. speed of sound: app sqrt(1.4 p / rho) vs Cramer (valid 0..30 C, 75..102 kPa) and Ostashev-Wilson ideal-gas mixture
CR = [331.5024, 0.603055, -0.000528, 51.471935, 0.1495874, -0.000782, -1.82e-7, 3.73e-8, -2.93e-10, -85.20931, -0.228525,
      5.91e-5, -2.835149, -2.15e-13, 29.179762, 0.000486]
def cramer_c(tc, rh, p, xc=400e-6):
    T = tc + 273.15
    f = 1.00062 + 3.14e-8 * p + 5.6e-7 * tc ** 2
    psv = math.exp(1.2811805e-5 * T ** 2 - 1.9509874e-2 * T + 34.04926034 - 6.3536311e3 / T)
    xw = rh * f * psv / p
    a = CR
    return ((a[0] + a[1] * tc + a[2] * tc ** 2) + (a[3] + a[4] * tc + a[5] * tc ** 2) * xw + (a[6] + a[7] * tc + a[8] * tc ** 2) * p
            + (a[9] + a[10] * tc + a[11] * tc ** 2) * xc + a[12] * xw ** 2 + a[13] * p ** 2 + a[14] * xc ** 2 + a[15] * xw * p * xc), xw
def ow_c(tc, rh, p):
    Rg, ga, gw, mua, muw = 8.314, 1.400, 1.330, 28.97e-3, 18.02e-3
    T = tc + 273.15; e = rh * magnus(tc)
    alpha = mua / muw; delta = (1 - 1 / ga) / (1 - 1 / gw); nu = (ga - 1) / (gw - 1)
    C = (e / p) / (alpha * (1 - e / p))
    return math.sqrt(ga * (Rg / mua) * T * (1 + (alpha * (1 + delta - nu) - 1) * C))
sos_rows = []
for a in APP['atmosphere']:
    tc = (a['tempF'] - 32) * 5 / 9
    p = a['pInHg'] * 3386.389 if a['pInHg'] is not None else 101325 * (1 - 2.25577e-5 * a['altFt'] * 0.3048) ** 5.25588
    row = {'tempF': a['tempF'], 'altFt': a['altFt'], 'rh': a['rh'], 'appSos': a['sos'], 'ow': ow_c(tc, a['rh'] / 100, p)}
    row['owDiffPct'] = pct(a['sos'], row['ow'])
    if 0 <= tc <= 30 and 75000 <= p <= 102000:
        cc, xw = cramer_c(tc, a['rh'] / 100, p)
        if 0 <= xw <= 0.06: row['cramer'] = cc; row['cramerDiffPct'] = pct(a['sos'], cc)
    sos_rows.append(row)
R['speedOfSound'] = sos_rows
cr = [r['cramerDiffPct'] for r in sos_rows if 'cramerDiffPct' in r]; ow = [r['owDiffPct'] for r in sos_rows]
print('1e. Speed of sound, app vs Cramer (%d points inside its stated range) and vs Ostashev-Wilson (%d points)' % (len(cr), len(ow)))
print('   vs Cramer: min %+.3f%%  max %+.3f%%.   vs Ostashev-Wilson: min %+.3f%%  max %+.3f%%' % (min(cr), max(cr), min(ow), max(ow)))
worst = max(sos_rows, key=lambda r: abs(r['owDiffPct']))
print('   worst vs Ostashev-Wilson: %s F, %s ft, RH %s -> app %.2f vs %.2f m/s (%+.3f%%)' % (worst['tempF'], worst['altFt'], worst['rh'], worst['appSos'], worst['ow'], worst['owDiffPct']))
R['speedOfSoundSummary'] = {'cramerMinPct': min(cr), 'cramerMaxPct': max(cr), 'owMinPct': min(ow), 'owMaxPct': max(ow), 'nCramer': len(cr), 'nOw': len(ow)}

# 1f. moist-air density vs an independently written mixture formula (CODATA R, 1976 molar mass of dry air, Magnus vapour pressure)
def moist_rho(tc, rh, p):
    T = tc + 273.15; e = rh * magnus(tc); Rg = 8.314462618
    return (p - e) * 28.9644e-3 / (Rg * T) + e * 18.01528e-3 / (Rg * T)
dens = []
for a in APP['atmosphere']:
    tc = (a['tempF'] - 32) * 5 / 9
    p = a['pInHg'] * 3386.389 if a['pInHg'] is not None else 101325 * (1 - 2.25577e-5 * a['altFt'] * 0.3048) ** 5.25588
    dens.append(pct(a['rho'], moist_rho(tc, a['rh'] / 100, p)))
R['moistDensityDiffPct'] = {'min': min(dens), 'max': max(dens)}
print('1f. Moist-air density, app vs independently written mixture formula over %d points: %+.4f%% to %+.4f%%' % (len(dens), min(dens), max(dens)))

# ---------------------------------------------------------------------------------------------------------------
# 2. STABILITY (Miller, Courtney & Miller arXiv 1410.5340 eq. 1) written independently
# ---------------------------------------------------------------------------------------------------------------
def miller(m, d, twist_in, length_in, v, tf, p_inHg):
    t = twist_in / d; L = length_in / d
    return 30 * m / (t * t * d ** 3 * L * (1 + L * L)) * (v / 2800) ** (1 / 3) * (tf + 460) / 519 * 29.92 / p_inHg
def est_len(m, d): return m / (1875 * math.pi / 4 * d * d)
mx = 0
for s in APP['stability']:
    p_in = 29.92 * (1 - 6.8756e-6 * s['altFt']) ** 5.2559
    mine = miller(s['wt'], s['diam'], s['twist'], est_len(s['wt'], s['diam']), s['v0'], s['tempF'], p_in)
    mx = max(mx, abs(pct(s['sg'], mine)))
R['stabilityMaxDiffPct'] = mx
print('2a. Miller formula: app vs independent coding over %d preset/temperature/altitude points: max difference %.2e %%' % (len(APP['stability']), mx))


# 2b. Sensitivity of the Miller estimate to the ASSUMED bullet length (derived arithmetic, not a measurement of any real bullet).
print('\n2b. Estimated length (1875 gr/in^3 cylinder) and sensitivity of SG and of 1000 yd-class spin drift to a length error')
print('    %-7s %6s %6s %7s | SG at length x0.85 / x0.90 / x1.00 / x1.10 / x1.20 | dlnSG/dlnL' % ('preset', 'wt gr', 'L cal', 'L in'))
sens = []
for s0 in [x for x in APP['stability'] if x['tempF'] == 59 and x['altFt'] == 0]:
    L0 = est_len(s0['wt'], s0['diam']); Lc = L0 / s0['diam']
    sgs = [miller(s0['wt'], s0['diam'], s0['twist'], L0 * f, s0['v0'], 59, 29.92) for f in (0.85, 0.90, 1.0, 1.10, 1.20)]
    dl = -(1 + 3 * Lc ** 2) / (1 + Lc ** 2)
    sens.append({'id': s0['id'], 'wt': s0['wt'], 'lengthCal': Lc, 'lengthIn': L0, 'sg': sgs, 'dlnSG_dlnL': dl})
    print('    %-7s %6d %6.2f %7.3f | %5.2f %5.2f %5.2f %5.2f %5.2f | %+.2f' % (s0['id'], s0['wt'], Lc, L0, *sgs, dl))
R['stabilityLengthSensitivity'] = sens

# ---------------------------------------------------------------------------------------------------------------
# 3. TRAJECTORY: independent 3D point-mass integrator (DOP853), same drag law, tables read from index.html
# ---------------------------------------------------------------------------------------------------------------
G_ACC = 9.80665; OMEGA = 7.292115e-5
def cd_of(tbl, m): return float(np.interp(m, tbl[:, 0], tbl[:, 1]))   # linear, flat outside (same convention as the app)
def make_rhs(par, wind_vec, omega_vec, gvec):
    k0 = math.pi / 8 * par['rho'] / (par['bc'] * 703.0696)
    tbl = par['tbl']; sos = par['sos']
    def rhs(t, s):
        v = s[3:6]; vr = v - wind_vec; sp = math.sqrt(vr @ vr)
        k = k0 * cd_of(tbl, sp / sos) * sp
        a = -k * vr + gvec
        if omega_vec is not None: a = a - 2 * np.cross(omega_vec, v)
        return np.concatenate([v, a])
    return rhs
def fly(par, v0_vec, x_stop, wind_vec=np.zeros(3), omega_vec=None, gvec=np.array([0, -G_ACC, 0.0]), axis=0, dir_vec=None):
    """Integrate until the position component along dir_vec reaches x_stop. Returns (state, t, rhs-solution)."""
    if dir_vec is None: dir_vec = np.array([1.0, 0, 0])
    rhs = make_rhs(par, wind_vec, omega_vec, gvec)
    ev = lambda t, s: s[:3] @ dir_vec - x_stop
    ev.terminal = True; ev.direction = 1
    sol = solve_ivp(rhs, [0, 20], np.concatenate([[0, 0, 0], v0_vec]), method='DOP853', rtol=1e-11, atol=1e-12, events=ev)
    if len(sol.t_events[0]) == 0: return None
    return sol.y_events[0][0], sol.t_events[0][0]
def params(inp, tbl_override=None):
    tc = (inp['tempF'] - 32) * 5 / 9
    p = inp['pressInHg'] * 3386.389 if inp['pressInHg'] is not None else 101325 * (1 - 2.25577e-5 * inp['altFt'] * 0.3048) ** 5.25588
    tk = tc + 273.15; pv = min(max(inp['humidity'], 0), 100) / 100 * 610.94 * math.exp(17.625 * tc / (tc + 243.04))
    rho = (p - pv) / (287.058 * tk) + pv / (461.495 * tk)       # same atmosphere formulas as the app, so only the
    sos = math.sqrt(1.4 * p / rho)                              # trajectory physics is under test here
    return {'rho': rho, 'sos': sos, 'bc': inp['bc'], 'v0': inp['v0'] * 0.3048, 'h': inp['h'] * 0.0254,
            'tbl': tbl_override if tbl_override is not None else (G7 if inp['model'] == 'G7' else G1)}
def zero_angle(par, zero_x):
    f = lambda th: fly(par, par['v0'] * np.array([math.cos(th), math.sin(th), 0]), zero_x)[0][1] - par['h']
    return brentq(f, -0.05, 0.35, xtol=1e-14)
YD = 0.9144; IN = 0.0254

cmp_rows = []
def record(case, rng, name, app, ind, unit):
    cmp_rows.append({'case': case, 'rangeYd': rng, 'quantity': name, 'app': app, 'independent': ind, 'diff': app - ind, 'unit': unit})

for cid, c in APP['cases'].items():
    inp = c['inp']; par = params(inp)
    th0 = zero_angle(par, inp['zero'] * YD)
    # compare zero angle with the app's
    record(cid, inp['zero'], 'zero launch angle', c['zeroTheta'] * 1e3, th0 * 1e3, 'mrad')
    for row in c['rows']:
        x = row['rangeYd'] * YD
        ang = inp['angleDeg'] * math.pi / 180
        if abs(inp['angleDeg']) > 0:
            # independent angled shot: inertial frame, gravity vertical, sight line rotated by `ang`; hit the point on the
            # sight line at slant range x, offset h perpendicular to the line of sight (the sight is h above the bore axis).
            u = np.array([math.cos(ang), math.sin(ang), 0]); n = np.array([-math.sin(ang), math.cos(ang), 0])
            def miss(alpha):
                v0v = par['v0'] * np.array([math.cos(alpha), math.sin(alpha), 0])
                st, t = fly(par, v0v, x, dir_vec=u)
                return st[:3] @ n - par['h']
            alpha = brentq(miss, ang - 0.05, ang + 0.2, xtol=1e-14)
            hold_ind = (alpha - ang) - th0                      # elevation hold relative to the level zero angle
            v0v = par['v0'] * np.array([math.cos(alpha), math.sin(alpha), 0]); st, t = fly(par, v0v, x, dir_vec=u)
            # drop of the zero-angle shot relative to the sight line (what the app reports as dropIn)
            v0z = par['v0'] * np.array([math.cos(th0 + ang), math.sin(th0 + ang), 0]); stz, tz = fly(par, v0z, x, dir_vec=u)
            drop_ind = (stz[:3] @ n - par['h']) / IN
            record(cid, row['rangeYd'], 'elevation hold', row['elevMoa'], hold_ind * 3437.7468, 'MOA')
            record(cid, row['rangeYd'], 'drop at zero angle', row['dropIn'], drop_ind, 'in')
            record(cid, row['rangeYd'], 'time of flight', row['t'], tz, 's')
            continue
        v0v = par['v0'] * np.array([math.cos(th0), math.sin(th0), 0])
        st, t = fly(par, v0v, x)
        drop_ind = (st[1] - par['h']) / IN
        record(cid, row['rangeYd'], 'drop', row['dropIn'], drop_ind, 'in')
        record(cid, row['rangeYd'], 'time of flight', row['t'], t, 's')
        record(cid, row['rangeYd'], 'velocity', row['vFps'], np.linalg.norm(st[3:6]) / 0.3048, 'fps')
        # independent level elevation hold: launch angle that actually hits the sight line at x
        alpha = brentq(lambda a: fly(par, par['v0'] * np.array([math.cos(a), math.sin(a), 0]), x)[0][1] - par['h'], -0.05, 0.3, xtol=1e-14)
        # the app folds the vertical Coriolis term into elevMoa; add it back so the comparison is like for like
        app_elev_no_cor = row['elevMoa'] + (row['corVIn'] * IN / x) * 3437.7468
        record(cid, row['rangeYd'], 'elevation hold (re-solved)', app_elev_no_cor, (alpha - th0) * 3437.7468, 'MOA')
        # wind: lag rule (app) vs 3D point mass with the wind inside the drag law
        if inp['windMph'] > 0:
            w = inp['windMph'] * 0.44704 * (-1 if inp['windFrom'] == 'R' else 1)      # wind from the right blows toward -z (left)
            st2, t2 = fly(par, v0v, x, wind_vec=np.array([0, 0, w]))
            record(cid, row['rangeYd'], 'wind deflection (|z|)', row['driftIn'], abs(st2[2]) / IN, 'in')
        # Coriolis: full vector -2 Omega x v, level shot, same launch angle with and without rotation
        if inp['latDeg'] is not None:
            lat = inp['latDeg'] * math.pi / 180; az = inp['azimuth'] * math.pi / 180
            om = OMEGA * np.array([math.cos(lat) * math.cos(az), math.sin(lat), -math.cos(lat) * math.sin(az)])  # components along (heading, up, right)
            st3, t3 = fly(par, v0v, x, omega_vec=om)
            record(cid, row['rangeYd'], 'Coriolis horizontal (+ right)', row['corHIn'], st3[2] / IN, 'in')
            record(cid, row['rangeYd'], 'Coriolis vertical (+ up)', row['corVIn'], (st3[1] - st[1]) / IN, 'in')
R['comparisons'] = cmp_rows
print('\n3. Trajectory comparison (app vs independent 3D point-mass integrator, same drag law and tables)')
by = {}
for r in cmp_rows: by.setdefault(r['quantity'], []).append(r)
for q, rs in by.items():
    worst = max(rs, key=lambda r: abs(r['diff']))
    print('   %-32s n=%2d  max |app - independent| = %.4g %s  (case %s @ %d yd)' % (q, len(rs), abs(worst['diff']), worst['unit'], worst['case'], worst['rangeYd']))

# ---------------------------------------------------------------------------------------------------------------
# 4. KNOWN-DIFFERENCE INVESTIGATIONS
# ---------------------------------------------------------------------------------------------------------------
# 4a. Level-shot elevation: app uses -drop/x; independent re-solve is the angle that actually hits.
lv = [r for r in cmp_rows if r['quantity'] == 'elevation hold (re-solved)' and r['case'].startswith('level')]
print('\n4a. Level shots: app elevation (-drop/x) minus re-solved hold, MOA')
for r in lv: print('   %-14s %5d yd  app %.4f  re-solved %.4f  diff %+.4f MOA' % (r['case'], r['rangeYd'], r['app'], r['independent'], r['diff']))
R['levelElevationDiff'] = lv

# 4b. Spin drift: Litz-type formula arithmetic, and example quoted on the sniperhide thread (SG 1.4, ToF 1.9 s -> ~10.52 in)
sd = lambda sg, t: 1.25 * (sg + 1.2) * t ** 1.83
R['spinDriftExample'] = {'sg': 1.4, 't': 1.9, 'inches': sd(1.4, 1.9)}
print('\n4b. Spin-drift formula 1.25(SG+1.2)t^1.83 at SG 1.4, t 1.9 s = %.2f in (forum-quoted example: about 10.52 in)' % sd(1.4, 1.9))
sp = [r for c in APP['cases'].values() for r in c['rows'] if c['inp']['twist'] > 0 and r['rangeYd'] == 1000 and c['inp']['latDeg'] is None and c['inp']['windMph'] == 0 and c['inp']['angleDeg'] == 0 and c['inp']['tempF'] == 59]
for cid, c in APP['cases'].items():
    inp = c['inp']
    if inp['windMph'] or inp['latDeg'] is not None or inp['angleDeg'] or inp['tempF'] != 59 or inp['altFt']: continue
    for r in c['rows']:
        if r['rangeYd'] == 1000:
            p_in = 29.92 * (1 - 6.8756e-6 * inp['altFt']) ** 5.2559
            sg = miller(inp['wt'], inp['diam'], inp['twist'], est_len(inp['wt'], inp['diam']), inp['v0'], inp['tempF'], p_in)
            print('   %-14s 1000 yd  SG %.2f  t %.3f s  app spin drift %.2f in  independent formula %.2f in' % (cid, sg, r['t'], r['spinIn'], sd(sg, r['t'])))

# 4c. Drag-table interpolation: linear (app) vs monotone cubic (PCHIP) through the same points, and one extra point.
def table_variant(tbl, kind):
    if kind == 'pchip':
        xs = np.linspace(tbl[0, 0], tbl[-1, 0], 5001); f = PchipInterpolator(tbl[:, 0], tbl[:, 1])
        return np.column_stack([xs, f(xs)])
    return tbl
trial = {'level-G7-175': 1000, 'level-G1-168': 1000, 'level-G7-65cm': 1500}
print('\n4c. Interpolation sensitivity (independent integrator): drop at range, linear vs PCHIP-resampled table, inches')
ip = []
for cid, rng in trial.items():
    inp = APP['cases'][cid]['inp']; out = {}
    for kind in ['linear', 'pchip']:
        base = G7 if inp['model'] == 'G7' else G1
        par = params(inp, tbl_override=table_variant(base, kind)); th0 = zero_angle(par, inp['zero'] * YD)
        st, t = fly(par, par['v0'] * np.array([math.cos(th0), math.sin(th0), 0]), rng * YD)
        out[kind] = (st[1] - par['h']) / IN
    ip.append({'case': cid, 'rangeYd': rng, 'linearIn': out['linear'], 'pchipIn': out['pchip'], 'diffIn': out['linear'] - out['pchip']})
    print('   %-14s %d yd  linear %.3f  pchip %.3f  diff %+.4f in' % (cid, rng, out['linear'], out['pchip'], out['linear'] - out['pchip']))
R['interpolation'] = ip
# the one point the secondary copy has and index.html lacks (G7 Mach 1.125 Cd 0.3987)
g7x = np.vstack([G7, [1.125, 0.3987]]); g7x = g7x[np.argsort(g7x[:, 0])]
inp = APP['cases']['level-G7-175']['inp']
res = []
for lab, tb in [('app G7', G7), ('G7 + secondary Mach 1.125 point', g7x)]:
    par = params(inp, tbl_override=tb); th0 = zero_angle(par, inp['zero'] * YD)
    st, t = fly(par, par['v0'] * np.array([math.cos(th0), math.sin(th0), 0]), 1500 * YD)
    res.append((lab, (st[1] - par['h']) / IN))
R['g7Mach1125'] = {'appIn': res[0][1], 'withPointIn': res[1][1], 'diffIn': res[0][1] - res[1][1]}
print('   Adding the secondary-copy G7 point at Mach 1.125 changes the 1500 yd drop by %+.5f in' % (res[0][1] - res[1][1]))


# 4d. Coriolis: does the app's closed form 2*Omega*sin(lat)*integral(x dt) differ from full-vector integration because of DRAG?
#     Test 1: remove drag (huge BC). The two should then agree exactly if the independent integrator is sound.
#     Test 2: restore drag and watch the ratio change with the amount of drag.
node_cori = r"""
const {loadSolver,baseInputs}=require('./tests/helpers/load-solver.js');const S=loadSolver();
const cfg=JSON.parse(process.argv[1]);const out=[];
for(const c of cfg){const inp=baseInputs(c.over);const M=S.buildModel(inp,1700);const d=S.dopeAt(M,inp,c.range);out.push({corH:d.corHIn,corV:d.corVIn,t:d.t});}
console.log(JSON.stringify(out));
"""
def app_cori(cfg):
    o = subprocess.run(['node', '-e', node_cori, json.dumps(cfg)], cwd=ROOT, capture_output=True, text=True, check=True).stdout
    return json.loads(o)
def indep_cori(over, rng):
    inp = dict(APP['cases']['cori-lat45-east']['inp']); inp.update(over)
    par = params(inp); th0 = zero_angle(par, inp['zero'] * YD); x = rng * YD
    lat = inp['latDeg'] * math.pi / 180; az = inp['azimuth'] * math.pi / 180
    om = OMEGA * np.array([math.cos(lat) * math.cos(az), math.sin(lat), -math.cos(lat) * math.sin(az)])
    v0v = par['v0'] * np.array([math.cos(th0), math.sin(th0), 0])
    a, t = fly(par, v0v, x); b, _ = fly(par, v0v, x, omega_vec=om)
    return b[2] / IN, (b[1] - a[1]) / IN
cases = [('no drag (BC 1e6)', {'bc': 1e6, 'v0': 2700}), ('BC 5 G7 (very little drag)', {'bc': 5.0, 'v0': 2700}), ('BC 0.5 G7', {'bc': 0.5, 'v0': 2700}),
         ('BC 0.243 G7 (.308 175 gr)', {'bc': 0.243, 'v0': 2700}), ('BC 0.15 G7 (high drag)', {'bc': 0.15, 'v0': 2700}), ('slow: BC .243 G7 at 1500 fps', {'bc': 0.243, 'v0': 1500})]
cor_rows = []
print('\n4d. Coriolis closed form (app) vs full-vector integration, lat 45 N firing east, 1000 yd')
print('    %-32s %9s %9s %9s %9s %7s' % ('case', 'app H in', 'indep H', 'app V in', 'indep V', 'ind/app'))
for lab, over in cases:
    cfg = [{'over': dict(APP['cases']['cori-lat45-east']['inp'], **over), 'range': 1000}]
    a = app_cori(cfg)[0]; h, v = indep_cori(over, 1000)
    cor_rows.append({'case': lab, 'appH': a['corH'], 'indepH': h, 'appV': a['corV'], 'indepV': v, 'ratioH': h / a['corH'], 'ratioV': v / a['corV']})
    print('    %-32s %9.3f %9.3f %9.3f %9.3f %7.3f' % (lab, a['corH'], h, a['corV'], v, h / a['corH']))
R['coriolisDragTest'] = cor_rows
print('    (ratio -> 1 as drag -> 0: the difference is drag damping of the Coriolis-induced velocity, not the integrator.)')


# 4e. Effect sizes (independent integrator): how much do the atmosphere differences found above move a trajectory?
print('\n4e. Effect sizes on the 1000 yd drop (.308 175 gr, G7 0.243, 2700 fps, zeroed at 100 yd, standard air unless stated), inches')
inp = dict(APP['cases']['level-G7-175']['inp'])
def drop_at(par, rng=1000):
    th0 = zero_angle(par, inp['zero'] * YD)
    st, t = fly(par, par['v0'] * np.array([math.cos(th0), math.sin(th0), 0]), rng * YD)
    return (st[1] - par['h']) / IN
base = params(inp); d0 = drop_at(base)
eff = {}
for lab, mod in [('speed of sound +0.2% (largest app-minus-Ostashev/Wilson gap)', dict(sos=base['sos'] * 1.002)),
                 ('speed of sound -0.15% (smallest)', dict(sos=base['sos'] * 0.9985)),
                 ('air density +0.5%', dict(rho=base['rho'] * 1.005)),
                 ('air density -1.8% (Aberdeen vs ICAO)', dict(rho=base['rho'] * 0.982))]:
    q = dict(base); q.update(mod); d = drop_at(q); eff[lab] = d - d0
    print('   %-62s  change %+.3f in (%+.3f MOA)' % (lab, d - d0, (d - d0) / 10.4720))   # 1 MOA = 1.0472 in per 100 yd = 10.472 in at 1000 yd
R['effectSizes1000yd'] = eff
# vapour pressure: 0.6% change in e at 30 C, 100% RH on density
e30 = magnus(30); rho_a = moist_rho(30, 1.0, 101325.0); rho_b = (101325.0 - e30 * 1.0063) * 28.9644e-3 / (8.314462618 * 303.15) + e30 * 1.0063 * 18.01528e-3 / (8.314462618 * 303.15)
R['vaporPressureDensityEffectPct'] = pct(rho_b, rho_a)
print('   Magnus vs Cramer vapour pressure (0.63%% higher e at 30 C, 100%% RH) changes air density by %+.5f%%' % pct(rho_b, rho_a))
# station vs sea-level pressure at 5000 ft, standard day: reported SLP 29.92 inHg used in place of station pressure
a_st = app_atm([[59 - 3.566 * 5, 5000, None, 0]])[0]['rho']          # station pressure from ISA at 5000 ft (pressure field left on Auto)
a_sl = app_atm([[59 - 3.566 * 5, 5000, 29.92, 0]])[0]['rho']         # sea-level pressure typed into the station-pressure field
R['stationVsSeaLevel5000ft'] = {'rhoStation': a_st, 'rhoSeaLevelEntered': a_sl, 'diffPct': pct(a_sl, a_st)}
print('   5000 ft, ISA temperature: typing sea-level pressure (29.92 inHg) where station pressure belongs gives air density %+.1f%% (%.4f vs %.4f kg/m3)' % (pct(a_sl, a_st), a_sl, a_st))
# 4f. Interpolation sensitivity for a bullet that crosses the transonic region
print('\n4f. Interpolation sensitivity where the bullet crosses Mach 1 (.223 55 gr class, G1 0.243, 3240 fps, to 1000 yd) and G7 0.243 at 2200 fps')
for lab, over, rng in [('G1 .243 3240 fps', dict(model='G1', bc=0.243, v0=3240, zero=100), 1000), ('G7 .243 2200 fps', dict(model='G7', bc=0.243, v0=2200, zero=100), 1000)]:
    i2 = dict(APP['cases']['level-G1-168']['inp']); i2.update(over); outd = {}
    for kind in ['linear', 'pchip']:
        base_t = G7 if i2['model'] == 'G7' else G1
        par = params(i2, tbl_override=table_variant(base_t, kind)); th0 = zero_angle(par, i2['zero'] * YD)
        res_ = fly(par, par['v0'] * np.array([math.cos(th0), math.sin(th0), 0]), rng * YD)
        outd[kind] = None if res_ is None else ((res_[0][1] - par['h']) / IN, res_[1], np.linalg.norm(res_[0][3:6]) / par['sos'])
    if outd['linear'] and outd['pchip']:
        print('   %-18s %d yd  Mach at target %.2f  linear %.3f in  pchip %.3f in  diff %+.4f in  (t %.4f vs %.4f s)' % (lab, rng, outd['linear'][2], outd['linear'][0], outd['pchip'][0], outd['linear'][0] - outd['pchip'][0], outd['linear'][1], outd['pchip'][1]))
        R.setdefault('interpolationTransonic', []).append({'case': lab, 'rangeYd': rng, 'machAtTarget': outd['linear'][2], 'linearIn': outd['linear'][0], 'pchipIn': outd['pchip'][0]})
    else:
        print('   %-18s bullet does not reach %d yd (v<15 m/s stop rule or time limit)' % (lab, rng))

# Cd rounding: tables carry 4 decimals; worst-case relative rounding
for name, tb in [('G1', G1), ('G7', G7)]:
    print('   %s: %d points, Mach %.3f..%.3f, min spacing %.3f, max spacing %.3f, Cd range %.4f..%.4f; worst-case 4-decimal rounding = %.3f%% of the smallest Cd'
          % (name, len(tb), tb[0, 0], tb[-1, 0], np.diff(tb[:, 0]).min(), np.diff(tb[:, 0]).max(), tb[:, 1].min(), tb[:, 1].max(), 100 * 5e-5 / tb[:, 1].min()))

json.dump(R, open(os.path.join(ROOT, 'tests', 'validation', 'stage10', 'independent-results.json'), 'w'), indent=1, default=float)
print('\nwrote tests/validation/stage10/independent-results.json')

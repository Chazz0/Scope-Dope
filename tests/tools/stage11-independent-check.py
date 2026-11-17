# Stage 11 cross-check (read-only): recompute the primary-case holds of every usable dataset with separately written 3D point-mass code
# (scipy DOP853, tables read from the Stage 10 export of index.html) to confirm that the model-vs-measurement gaps are not a harness or
# input-transcription error. This checks the harness only. It is not physical validation and it is not another calculator used as truth.
# Run: python3 -I tests/tools/stage11-independent-check.py
import json, math, os, numpy as np
from scipy.integrate import solve_ivp
from scipy.optimize import brentq
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'validation')
APP = json.load(open(os.path.join(R, 'stage10', 'app-outputs.json')))
RES = json.load(open(os.path.join(R, 'stage11', 'results.json')))
DS = {d['id']: d for d in json.load(open(os.path.join(R, 'stage11', 'datasets.json')))['datasets']}
T = {k: np.array(v) for k, v in APP['tables'].items()}
YD, IN, G = 0.9144, 0.0254, 9.80665
def fly(bc, tbl, rho, sos, v0, th, x):
    k0 = math.pi / 8 * rho / (bc * 703.0696)
    def rhs(t, s):
        v = s[2:4]; sp = math.hypot(*v); k = k0 * float(np.interp(sp / sos, tbl[:, 0], tbl[:, 1])) * sp
        return [v[0], v[1], -k * v[0], -k * v[1] - G]
    ev = lambda t, s: s[0] - x; ev.terminal = True
    s = solve_ivp(rhs, [0, 20], [0, 0, v0 * math.cos(th), v0 * math.sin(th)], method='DOP853', rtol=1e-11, atol=1e-12, events=ev)
    return s.y_events[0][0]
worst = 0
for id_, r in RES['datasets'].items():
    if 'allCases' not in r: continue
    ds = DS[id_]
    for c in r['allCases']:
        if not (c['zero'] == ds['primary']['zero'] and c['h'] == ds['primary']['h'] and c['atm'] == ds['primary']['atm']): continue
        model, bcv = c['bc'].split(); bcv = float(bcv)
        atm = [a for a in ds['envelope']['atm'] if a['id'] == c['atm']][0]
        tc = (atm['tempF'] - 32) * 5 / 9
        p = 101325 * (1 - 2.25577e-5 * atm['altFt'] * 0.3048) ** 5.25588
        rho = p / (287.058 * (tc + 273.15)); sos = math.sqrt(1.4 * p / rho)
        v0 = ds['mv'] * 0.3048; h = c['h'] * IN
        th = brentq(lambda t: fly(bcv, T[model], rho, sos, v0, t, c['zero'] * YD)[1] - h, -0.05, 0.35, xtol=1e-14)
        x = c['rangeYd'] * YD; y = fly(bcv, T[model], rho, sos, v0, th, x)[1]
        # hold (mil) = height of the horizontal sight line above the bullet at x, divided by x; same convention as the app's level branch
        hold2 = (h - y) / x * 1000.0
        worst = max(worst, abs(hold2 - c['holdMil']))
        print('%s %5d yd %-9s independent hold %.3f mil, app %.3f mil, diff %+.3f' % (id_, c['rangeYd'], c['bc'], hold2, c['holdMil'], hold2 - c['holdMil']))
print('\nmax |independent - app| over primary cases: %.3f mil' % worst)

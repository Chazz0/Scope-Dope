"""Independent check of the engine's velocity decay. Read-only; changes nothing.
Reads the G1 table out of index.html, then integrates horizontal flight with a different method
(RK4, 0.1 ms) than the app (RK2, 0.5 ms), written separately. It uses the same table, so it can show whether
the integrator is the cause of a difference. It cannot show whether the table or the physics is right."""
import re, math, sys
html = open(sys.argv[1] if len(sys.argv) > 1 else 'index.html').read()
m = re.search(r'const G1 = \[(.*?)\];', html, re.S)
G1 = [(float(a), float(b)) for a, b in re.findall(r'\[([0-9.]+),([0-9.]+)\]', m.group(1))]
def cd(mach):
    if mach <= G1[0][0]: return G1[0][1]
    for i in range(1, len(G1)):
        if mach <= G1[i][0]:
            (x0, y0), (x1, y1) = G1[i-1], G1[i]
            return y0 + (y1 - y0) * (mach - x0) / (x1 - x0)
    return G1[-1][1]
def run(bc, rho=1.22498, v0=2700 * 0.3048, sos=340.297, dt=1e-4, ranges=(50, 100, 200, 300, 400, 500)):
    k0 = math.pi / 8 * rho / (bc * 703.0696)
    f = lambda v: -k0 * cd(v / sos) * v * v
    x, v, out, targets = 0.0, v0, {}, [r * 0.9144 for r in ranges]
    for r, tx in zip(ranges, targets):
        while x < tx:
            a = f(v); b = f(v + a * dt / 2); c = f(v + b * dt / 2); d = f(v + c * dt)
            dv = (a + 2 * b + 2 * c + d) * dt / 6
            x += (v + dv / 2) * dt; v += dv
        out[r] = v / 0.3048
    return out
pub = {50: 2553, 100: 2412, 200: 2274, 300: 2141, 400: 2013}
print('Independent RK4, G1 BC 0.608, ICAO standard air:')
r = run(0.608)
for k in (50, 100, 200, 300, 400, 500): print('  %3d yd  %.1f fps%s' % (k, r[k], ('   (as read from Hornady: %d)' % pub[k]) if k in pub else ''))
print('Air density multiple (BC 0.608 held) needed to lose the published velocity at 50 yd:')
lo, hi = 1.0, 6.0
for _ in range(50):
    mid = (lo + hi) / 2
    if run(0.608, rho=1.22498 * mid, ranges=(50,))[50] > pub[50]: lo = mid
    else: hi = mid
print('  about %.2f times standard sea-level density' % ((lo + hi) / 2))

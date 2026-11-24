import { describe, expect, it } from 'vitest';
import * as api from './api2004';
import * as a80 from './astm1980';
import * as g85 from './gost85';
import { computeStandard, resolveDensity, tankWarnings } from './calc';
import type { Tank } from './calc';
import { parseNum } from './parse';
import { hyc20, LT_PER_MT, round } from './units';

/**
 * Checks added by the calculation audit (2026-11-24).
 *  [MC] Measurement Canada VCF tables (Jet A 800, gasoline 730, avgas 710 — Table 54B;
 *       lube 880 — Table 54D, "API 2540 Ch. 11.1 Vol. X")
 */

describe('observed → base converges everywhere', () => {
  it('API 2004 products: transition zone above 95 °C (fixed point used to diverge)', () => {
    for (const r of [771, 775, 780, 785, 787.5]) {
      for (const t of [98, 110, 130, 150]) {
        const rt = r * api.vcf(r, t, 'product');
        expect(Math.abs(api.baseFromObserved(rt, t, 'product', 15) - r)).toBeLessThan(1e-6);
      }
    }
  });

  it('API 2004: round trip on a grid of the whole range, all commodities', () => {
    for (const c of ['product', 'crude', 'lube'] as const) {
      const [lo, hi] = api.RANGE_15[c];
      let worst = 0;
      for (let r = Math.ceil(lo); r <= hi; r += 3.7) {
        for (let t = -50; t <= 150; t += 6.5) {
          const rt = r * api.vcf(r, t, c);
          worst = Math.max(worst, Math.abs(api.baseFromObserved(rt, t, c, 15) - r));
        }
      }
      expect(worst).toBeLessThan(1e-6);
    }
  });

  it('ASTM 1980: at a group boundary the answer satisfies Table 54B exactly', () => {
    // Near 770 / 787.5 / 838.5 the 1980 groups overlap, so two densities can both be exact solutions;
    // they differ by at most ~0.12 kg/m³ at 60 °C. Before the fix the iteration stopped on neither.
    for (let r = 769.8; r <= 770.2; r += 0.01) {
      for (const t of [0, 20, 40, 60]) {
        const rt = r * a80.vcf(r, t, 'product');
        const back = a80.rho15FromObserved(rt, t, 'product', false);
        expect(Math.abs(back * a80.vcf(back, t, 'product') - rt)).toBeLessThan(1e-6);
        expect(Math.abs(back - r)).toBeLessThan(0.15);
      }
    }
  });
});

describe('[MC] Measurement Canada published VCFs (4 decimals)', () => {
  const pts: [number, number, number][] = [
    [800, -23.0, 1.0349], [800, -2.0, 1.0157], [800, 18.0, 0.9972], [800, 18.9, 0.9964],
    [730, 39.0, 0.9697], [730, 39.9, 0.9686], [730, 40.0, 0.9684], [730, 41.0, 0.9672],
    [710, -22.0, 1.0475], [710, -1.0, 1.0207], [710, 19.0, 0.9948], [710, 19.9, 0.9936], [710, 40.0, 0.9671],
  ];
  it('Table 54B — ASTM 1980 matches every point', () => {
    for (const [r, t, v] of pts) expect(round(a80.vcf(r, t, 'product'), 4)).toBe(v);
  });
  it('Table 54B — API 2004 within 0.0001', () => {
    for (const [r, t, v] of pts) expect(Math.abs(round(api.vcf(r, t, 'product'), 4) - v)).toBeLessThan(0.00011);
  });
  it('Table 54D — lubricating oil 880 kg/m³', () => {
    const row19 = [0.9971, 0.9971, 0.997, 0.9969, 0.9969, 0.9968, 0.9967, 0.9966, 0.9966, 0.9965];
    row19.forEach((v, i) => expect(round(a80.vcf(880, 19 + i / 10, 'lube'), 4)).toBe(v));
    expect(round(a80.vcf(880, 40, 'lube'), 4)).toBe(0.9821);
    expect(a80.group1980(880, 'lube')).toBe('lube');
  });
});

describe('strict number input', () => {
  it('reads one decimal separator and spaces as thousands', () => {
    expect(parseNum('6617,0')).toBe(6617);
    expect(parseNum('6 617,0')).toBe(6617);
    expect(parseNum('6 617.25')).toBe(6617.25);
    expect(parseNum('−5,5')).toBe(-5.5);
    expect(parseNum(',5')).toBe(0.5);
    expect(parseNum('15.')).toBe(15);
  });
  it('rejects ambiguous or broken input instead of misreading it', () => {
    for (const s of ['6,617.0', '1.234,5', '1.2.3', '', ' ', 'abc', '12a', '--5']) expect(parseNum(s)).toBeNaN();
  });
});

describe('no silent defaults, and the notes that replace them', () => {
  const tank = (p: Partial<Tank>): Tank => ({ id: '1', name: '1', tov: 1000, water: 0, t: 20, ...p });
  const d = resolveDensity({ source: 'lab15', value: 850 }, 'product');

  it('a missing temperature leaves the tank uncomputed (was silently 15 °C)', () => {
    const r = computeStandard('api2004', d, [tank({ t: NaN })]);
    expect(r.tanks[0].ok).toBe(false);
    expect(r.totals.complete).toBe(false);
    expect(r.totals.mtVac).toBeNull();
  });

  it('water above TOV is flagged', () => {
    expect(tankWarnings('api2004', d, [tank({ tov: 10, water: 12 })]).map((w) => w.code)).toContain('waterOverTov');
  });

  it('temperatures outside API 11.1 (−50…150 °C) are flagged', () => {
    expect(tankWarnings('api2004', d, [tank({ t: 160 })]).map((w) => w.code)).toContain('tempRange');
    expect(tankWarnings('api2004', d, [tank({ t: 60 })])).toHaveLength(0);
  });

  it('ASTM 1980 temperature and density limits are flagged in 1980 mode', () => {
    const light = resolveDensity({ source: 'lab15', value: 700 }, 'product');
    expect(tankWarnings('astm1980', light, [tank({ t: 100 })]).map((w) => w.code)).toContain('temp1980');
    expect(resolveDensity({ source: 'lab15', value: 640 }, 'product').warnings.map((w) => w.code)).toContain('range1980');
    expect(resolveDensity({ source: 'lab15', value: 1100 }, 'product').warnings.map((w) => w.code)).toContain('range1980');
    expect(d.warnings.map((w) => w.code)).not.toContain('range1980');
  });

  it('ГОСТ 85 0–50 °C note', () => {
    expect(tankWarnings('gost85', d, [tank({ t: 55 })]).map((w) => w.code)).toContain('gostTemp');
  });
});

describe('other audit fixes', () => {
  it('ГОСТ 85 with a 20 °C hydrometer applies the glass correction (ГОСТ 3900-85 Appendix 1)', () => {
    const d = resolveDensity({ source: 'hydro', value: 850.0, tC: 35, hydroCal: 20 }, 'product');
    expect(d.gost85.rho20!).toBeCloseTo(g85.rho20FromObserved(850.0 * hyc20(35), 35)!, 9);
    // the glass term is 850 × 0.000025 × 15 ≈ 0.32 kg/m³
    expect(g85.rho20FromObserved(850.0, 35)! - d.gost85.rho20!).toBeCloseTo(0.319, 2);
  });

  it('long ton factor is exact (1 LT = 1016.0469088 kg)', () => {
    expect(LT_PER_MT).toBeCloseTo(0.98420652761, 10);
  });

  it('ASTM 1980 lube mode uses 54D, not 54B', () => {
    const d = resolveDensity({ source: 'lab15', value: 880 }, 'lube');
    const r = computeStandard('astm1980', d, [{ id: '1', name: '1', tov: 1000, water: 0, t: 40 }]);
    expect(r.tanks[0].vcfUsed).toBeCloseTo(0.98207, 5);
  });
});

import { describe, expect, it } from 'vitest';
import * as api from './api2004';
import * as a80 from './astm1980';
import * as g85 from './gost85';
import { computeStandard, resolveDensity } from './calc';
import { hyc15, hyc20, LT_PER_MT, round } from './units';

/**
 * Reference values:
 *  [API] API MPMS 11.1 Addendum 2 (May 2019), Appendix G worked examples
 *  [D1298] ASTM D1298-12b(2017) Example 2
 *  [G22] ГОСТ 3900-2022 §4.6.7 example and Table A.1
 *  [XLS] Batumi Oil Terminal ULLAGE_54A/54B.xls (STAR 10, Tengiz)
 *  [T54] printed Table 54B values quoted in tanker-calculation guides
 */

describe('API MPMS 11.1-2004', () => {
  it('[API] IPTS-68 temperature shift', () => {
    expect(api.toIpts68F(102.35)).toBeCloseTo(216.277130766009, 9);
    expect(api.toIpts68F(15)).toBeCloseTo(59.006621316269, 9);
  });

  it('[API] 11.1.7.3 Ex 4 — jet fuel, 15 °C base', () => {
    const rho15 = 821.056637883991;
    const { rho60, group } = api.rho60FromBase(rho15, 15, 'product');
    expect(group).toBe('jet');
    expect(rho60).toBeCloseTo(820.654110634883, 7);
    const { alpha, rhoStar } = api.alpha60(rho60, 'jet');
    expect(rhoStar).toBeCloseTo(820.656877671821, 7);
    expect(alpha).toBeCloseTo(0.000490440878, 12);
    expect(api.ctl60(rho60, 102.35, 'jet')).toBeCloseTo(0.921879416463, 11);
    expect(api.vcf(rho15, 102.35, 'product')).toBeCloseTo(0.921427460327, 11);
    expect(api.vcf(rho15, 22.25, 'product')).toBeCloseTo(0.993590934183, 11);
  });

  it('[API] 11.1.7.2 Ex 3 — crude oil at −50 °C', () => {
    const rho15 = 664.383677067826;
    expect(api.rho60FromBase(rho15, 15, 'crude').rho60).toBeCloseTo(663.869868377549, 7);
    expect(api.vcf(rho15, -50, 'crude')).toBeCloseTo(1.087515323806, 11);
  });

  it('[API] 11.1.6.1 Ex 6 — gasoline α60 from ρ60*', () => {
    const [K0, K1] = api.K2004.gasoline;
    const rs = 657.303689061482;
    expect(K0 / (rs * rs) + K1 / rs).toBeCloseTo(0.00081636213, 12);
  });

  it('20 °C base round-trip', () => {
    const r20 = api.convertBase(840.6, 15, 20, 'product');
    expect(api.convertBase(r20, 20, 15, 'product')).toBeCloseTo(840.6, 8);
  });
});

describe('Hydrometer', () => {
  it('[D1298] Ex 2 — crude, 858.29 at 25 °C, 15 °C hydrometer', () => {
    expect(hyc15(25)).toBeCloseTo(0.999768, 9);
    const d = resolveDensity({ source: 'hydro', value: 858.29, tC: 25, hydroCal: 15 }, 'crude');
    expect(d.api.rho15).toBeCloseTo(865.207470082, 5);
    expect(round(d.api.rho15, 2)).toBe(865.21);
  });

  it('[G22] 20 °C hydrometer factor', () => {
    expect(hyc20(24.5)).toBeCloseTo(0.9998875, 10);
  });
});

describe('ГОСТ 3900-2022 (= API 2004, 20 °C base)', () => {
  const rho20 = (rt: number, t: number, c: api.Commodity) =>
    api.convertBase(api.baseFromObserved(rt, t, c, 15), 15, 20, c);

  it('[G22] Table A.1 crude: 830.0 at 12 and 13 °C', () => {
    expect(round(rho20(830.0, 12, 'crude'), 1)).toBe(824.1);
    expect(round(rho20(830.0, 13, 'crude'), 1)).toBe(824.8);
  });

  it('[G22] §4.6.7 example: crude 830.9 at 12.3 °C → 825.2', () => {
    expect(round(rho20(830.9, 12.3, 'crude'), 1)).toBe(825.2);
  });

  it('20 °C hydrometer reading 825.5 at 24.5 °C → 828.6 (product)', () => {
    const d = resolveDensity({ source: 'hydro', value: 825.5, tC: 24.5, hydroCal: 20 }, 'product');
    expect(round(d.api.rho20, 1)).toBe(828.6);
  });
});

describe('ASTM D1250-80 Tables 54A/54B', () => {
  it('[XLS] VCFs printed in the Ullage files', () => {
    expect(round(a80.vcf(736.5, 12.1, 'product'), 5)).toBe(1.00358);
    expect(round(a80.vcf(793.3, 6.5, 'crude'), 5)).toBe(1.00827);
    expect(round(a80.vcf(793.3, 5.3, 'crude'), 5)).toBe(1.00944);
  });

  it('[T54] printed Table 54B values', () => {
    expect(round(a80.vcf(816.0, 34, 'product'), 4)).toBe(0.983);
    expect(round(a80.vcf(865.0, 29, 'product'), 4)).toBe(0.9886);
  });

  it('agrees with API 2004 within 0.00005 outside the transition zone', () => {
    for (const r of [650, 720, 800, 860, 950, 1050]) {
      for (const t of [0, 30, 70]) {
        expect(Math.abs(a80.vcf(r, t, 'product') - api.vcf(r, t, 'product'))).toBeLessThan(0.00005);
      }
    }
  });
});

describe('ГОСТ 3900-85 γ table', () => {
  it('band lookup without the Excel edge errors', () => {
    expect(g85.gamma(690.0)).toBe(0.00091);
    expect(g85.gamma(699.9)).toBe(0.00091);
    expect(g85.gamma(700.0)).toBe(0.000897);
    expect(g85.gamma(890.0)).toBe(0.000647);
    expect(g85.gamma(889.9)).toBe(0.00066);
    expect(g85.gamma(999.9)).toBe(0.000515);
    expect(g85.gamma(689.9)).toBeNull();
    expect(g85.gamma(1000.0)).toBeNull();
  });

  it('[XLS] STAR 10: ρ20 732.0 at 12.1 °C → 0.7388', () => {
    expect(round(g85.rhoAtT(732.0, 12.1)! / 1000, 4)).toBe(0.7388);
  });
});

describe('Ullage chain', () => {
  const tank = [{ id: '1', name: 'Total', tov: 6617.0, water: 0, t: 12.1 }];

  it('[XLS] STAR 10 ASTM: GSV, MT vac, MT air, correct LT', () => {
    const d = resolveDensity({ source: 'lab15', value: 736.5 }, 'product');
    const r = computeStandard('astm1980', d, tank).totals;
    expect(r.gsv!).toBeCloseTo(6640.689, 2);
    expect(r.mtVac!).toBeCloseTo(4890.87, 1);
    expect(r.mtAir!).toBeCloseTo(4883.56, 1);
    expect(r.lt!).toBeCloseTo(4883.56 * LT_PER_MT, 0); // Excel shows 6535.8 (wrong)
  });

  it('[XLS] STAR 10 ГОСТ 85 weight 4888.64', () => {
    const d = resolveDensity({ source: 'lab20', value: 732.0 }, 'product');
    const r = computeStandard('gost85', d, tank).totals;
    expect(r.mtVac!).toBeCloseTo(4888.64, 1);
  });

  it('bbl at 60 °F applies the 15→60 °F ratio once', () => {
    const d = resolveDensity({ source: 'lab15', value: 736.5 }, 'product');
    const r = computeStandard('api2004', d, tank).totals;
    expect(r.bbl60!).toBeGreaterThan(41700);
    expect(r.bbl60!).toBeLessThan(41850); // Excel shows 41 948 (double correction)
  });

  it('ГОСТ 85 refuses densities outside its table', () => {
    const d = resolveDensity({ source: 'lab20', value: 679.5 }, 'product');
    const r = computeStandard('gost85', d, tank);
    expect(r.totals.complete).toBe(false);
    expect(d.warnings.some((w) => w.code === 'gostRange')).toBe(true);
  });
});

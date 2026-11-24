import { describe, expect, it } from 'vitest';
import { resolveDensity } from './calc';
import {
  averageUllage,
  evaluateStage,
  evaluateTank,
  generateTanks,
  interpolate,
  shipShore,
  tankCode,
  tempLevels,
  transferred,
} from './ship';
import type { ShipTankDef, TankReading } from './ship';

let n = 0;
const id = () => `t${n++}`;

const reading = (p: Partial<TankReading>): TankReading => ({
  empty: false,
  orh: NaN,
  ullages: [],
  trimMm: 0,
  listMm: 0,
  tovMode: 'direct',
  tov: NaN,
  table: { u1: NaN, v1: NaN, u2: NaN, v2: NaN },
  waterInnage: NaN,
  fw: 0,
  temps: [],
  ...p,
});

describe('tank layout', () => {
  it('pairs, centre tanks and slops, bow to stern', () => {
    const t = generateTanks(3, true, true, [], id);
    expect(t.map(tankCode)).toEqual(['1P', '1C', '1S', '2P', '2C', '2S', '3P', '3C', '3S', 'SLOP P', 'SLOP S']);
  });
  it('regenerating keeps reference heights by code', () => {
    const a = generateTanks(2, false, false, [], id);
    a[0].rh = 18.25;
    const b = generateTanks(4, false, true, a, id);
    expect(b.find((x) => tankCode(x) === '1P')?.rh).toBe(18.25);
    expect(b.find((x) => tankCode(x) === '1P')?.id).toBe(a[0].id);
    expect(b).toHaveLength(10);
  });
});

describe('gauge readings (API 3.1A)', () => {
  it('two identical readings', () => {
    expect(averageUllage([2.345, 2.345])).toMatchObject({
      value: 2.345,
      rule: 'ok',
    });
  });
  it('two different readings ask for a third', () => {
    expect(averageUllage([2.345, 2.348]).rule).toBe('twoDiffer');
  });
  it('three within 3 mm are averaged to 1 mm', () => {
    expect(averageUllage([2.345, 2.347, 2.348])).toMatchObject({
      value: 2.347,
      rule: 'ok',
      spreadMm: 3,
    });
    expect(averageUllage([2.345, 2.347, 2.349]).rule).toBe('spread');
  });
  it('five readings on a rolling ship: drop the highest and lowest', () => {
    expect(averageUllage([2.3, 2.34, 2.345, 2.35, 2.4])).toMatchObject({
      value: 2.345,
      rule: 'ok',
    });
  });
  it('one or four readings are flagged', () => {
    expect(averageUllage([2.3]).rule).toBe('one');
    expect(averageUllage([2.3, 2.3, 2.3, 2.3]).rule).toBe('four');
    expect(averageUllage([]).value).toBeNull();
  });
});

describe('levels, tables', () => {
  it('temperature levels by liquid depth', () => {
    expect(tempLevels(2.9)).toBe(1);
    expect(tempLevels(3)).toBe(1);
    expect(tempLevels(4.5)).toBe(2);
    expect(tempLevels(12)).toBe(3);
  });
  it('interpolates between two table lines and flags extrapolation', () => {
    expect(interpolate(2.345, 2.34, 10120.4, 2.35, 10105.2)?.value).toBeCloseTo(10112.8, 6);
    expect(interpolate(2.36, 2.34, 10120.4, 2.35, 10105.2)?.extrapolated).toBe(true);
    expect(interpolate(2.3, 2.3, 1, 2.3, 2)).toBeNull();
  });
});

describe('one tank', () => {
  const def: ShipTankDef = {
    id: 'a',
    row: 1,
    side: 'P',
    slop: false,
    rh: 18.25,
  };

  it('corrected ullage, innage, TOV from the table, GOV', () => {
    const ev = evaluateTank(
      def,
      reading({
        ullages: [2.345, 2.345],
        trimMm: 12,
        listMm: -4,
        tovMode: 'table',
        table: { u1: 2.35, v1: 10105.2, u2: 2.36, v2: 10090.0 },
        fw: 3.2,
        waterInnage: 0.02,
        temps: [28.4, 28.6, 28.8],
      }),
    );
    expect(ev.corrUllage).toBe(2.353);
    expect(ev.innage).toBe(15.897);
    expect(ev.tov).toBeCloseTo(10105.2 - 0.3 * 15.2, 6);
    expect(ev.gov).toBeCloseTo(ev.tov! - 3.2, 9);
    expect(ev.temp).toBeCloseTo(28.6, 9);
    expect(ev.tempsNeeded).toBe(3);
    expect(ev.ready).toBe(true);
    expect(ev.notes).toHaveLength(0);
  });

  it('flags ORH, too few temperatures, water above the liquid', () => {
    const ev = evaluateTank(
      def,
      reading({
        orh: 18.262,
        ullages: [17.5, 17.5],
        tovMode: 'direct',
        tov: 40,
        waterInnage: 0.9,
        temps: [20],
      }),
    );
    const codes = ev.notes.map((x) => x.code);
    expect(codes).toContain('orhDiff');
    expect(codes).toContain('waterOverLiquid');
    expect(codes).not.toContain('tempsFew'); // 0.75 m of liquid → one level is enough
  });

  it('an empty tank counts as zero and needs nothing else', () => {
    expect(evaluateTank(def, reading({ empty: true }))).toMatchObject({
      ready: true,
      tov: 0,
      gov: 0,
    });
  });

  it('missing temperature keeps the tank out of the totals', () => {
    const ev = evaluateTank(def, reading({ tovMode: 'direct', tov: 100 }));
    expect(ev.ready).toBe(false);
    expect(ev.notes.map((x) => x.code)).toContain('noTemp');
  });
});

describe('stages and the transferred quantity', () => {
  const defs = generateTanks(1, false, false, [], id);
  const dens = resolveDensity({ source: 'lab15', value: 850 }, 'product');

  it('loaded = final − OBQ, per standard, through the shore chain', () => {
    const obq = evaluateStage(defs, { [defs[0].id]: reading({ tov: 5, temps: [20] }) }, dens, 5, 6);
    const fin = evaluateStage(
      defs,
      {
        [defs[0].id]: reading({ tov: 1005, temps: [20] }),
        [defs[1].id]: reading({ tov: 1000, temps: [20] }),
      },
      dens,
      9.1,
      9.4,
    );
    expect(fin.trim).toBe(0.3);
    const q = transferred('load', obq, fin, 'api2004');
    const v = fin.results!.api2004.tanks[0].vcfUsed!;
    expect(q.gsv).toBeCloseTo(1000 * v + 1000 * v, 6);
    expect(q.mtVac).toBeCloseTo((2000 * v * 850) / 1000, 6);
  });

  it('ship ÷ shore and VEF', () => {
    const s = shipShore(10030, 10000, 1.002);
    expect(s.ratio).toBeCloseTo(1.003, 9);
    expect(s.diff).toBeCloseTo(30, 9);
    expect(s.corrected).toBeCloseTo(10030 / 1.002, 9);
    expect(shipShore(10030, NaN, NaN).ratio).toBeNull();
  });
});

/**
 * Ship (tank vessel) measurement: tank layout, gauging rules, corrections and stage totals.
 * Volumes come from the ship's own calibration tables; the temperature/density chain reuses calc.ts.
 *
 * References: API MPMS 3.1A (gauge readings), 7 / 17.2 (temperatures), 17.9 (VEF).
 */
import { computeAll } from './calc';
import type { Densities, Standard, StandardResult, Tank } from './calc';

export type Side = 'P' | 'C' | 'S';

export interface ShipTankDef {
  id: string;
  /** 1 = forward-most row. Slop tanks sort after the numbered rows. */
  row: number;
  side: Side;
  slop: boolean;
  /** Official reference height, m (NaN = not entered). */
  rh: number;
}

export const tankCode = (d: Pick<ShipTankDef, 'row' | 'side' | 'slop'>) => (d.slop ? `SLOP ${d.side}` : `${d.row}${d.side}`);

/**
 * Tank list for `pairs` rows of P/S tanks, optional centre tanks in every row, optional slop P/S.
 * Existing tanks with the same code keep their id and reference height.
 */
export function generateTanks(
  pairs: number,
  centre: boolean,
  slops: boolean,
  keep: ShipTankDef[] = [],
  newId: () => string,
): ShipTankDef[] {
  const old = new Map(keep.map((k) => [tankCode(k), k]));
  const out: ShipTankDef[] = [];
  const add = (row: number, side: Side, slop: boolean) => {
    const code = tankCode({ row, side, slop });
    const prev = old.get(code);
    out.push(prev ? { ...prev } : { id: newId(), row, side, slop, rh: NaN });
  };
  const n = Math.max(0, Math.min(20, Math.floor(pairs)));
  for (let r = 1; r <= n; r++) {
    add(r, 'P', false);
    if (centre) add(r, 'C', false);
    add(r, 'S', false);
  }
  if (slops) {
    add(n + 1, 'P', true);
    add(n + 1, 'S', true);
  }
  return out;
}

/* ------------------------------------------------------------------ gauging rules */

export type UllageRule = 'none' | 'ok' | 'one' | 'twoDiffer' | 'spread' | 'four';

export interface UllageResult {
  /** Reported ullage, m, rounded to 1 mm (null when nothing was read). */
  value: number | null;
  rule: UllageRule;
  /** Range of the readings used, mm. */
  spreadMm: number | null;
}

const mm = (x: number) => Math.round(x * 1000) / 1000;

/**
 * API MPMS 3.1A: two identical consecutive readings, or three within 3 mm averaged to 1 mm.
 * A rolling ship: five readings, the highest and lowest dropped, the middle three averaged.
 */
export function averageUllage(readings: number[]): UllageResult {
  const r = readings.filter((x) => Number.isFinite(x));
  if (r.length === 0) return { value: null, rule: 'none', spreadMm: null };
  const spread = (xs: number[]) => Math.round((Math.max(...xs) - Math.min(...xs)) * 10000) / 10;
  const mean = (xs: number[]) => mm(xs.reduce((s, x) => s + x, 0) / xs.length);
  if (r.length === 1) return { value: mm(r[0]), rule: 'one', spreadMm: 0 };
  if (r.length === 2) {
    const s = spread(r);
    return { value: mean(r), rule: s < 1 ? 'ok' : 'twoDiffer', spreadMm: s };
  }
  if (r.length === 3) {
    const s = spread(r);
    return { value: mean(r), rule: s <= 3 ? 'ok' : 'spread', spreadMm: s };
  }
  if (r.length === 4) return { value: mean(r), rule: 'four', spreadMm: spread(r) };
  const mid = [...r.slice(0, 5)].sort((a, b) => a - b).slice(1, 4);
  return { value: mean(mid), rule: 'ok', spreadMm: spread(mid) };
}

/** Number of temperature levels by liquid depth (API MPMS 7 / 17.2): ≤3 m → 1, ≤6 m → 2, deeper → 3. */
export function tempLevels(innage: number | null): 1 | 2 | 3 {
  if (innage === null || !Number.isFinite(innage) || innage <= 3) return 1;
  return innage <= 6 ? 2 : 3;
}

/** Linear interpolation between two lines of the ship's table. */
export function interpolate(
  u: number,
  u1: number,
  v1: number,
  u2: number,
  v2: number,
): { value: number; extrapolated: boolean } | null {
  if (![u, u1, v1, u2, v2].every(Number.isFinite) || u1 === u2) return null;
  const value = v1 + ((u - u1) * (v2 - v1)) / (u2 - u1);
  const lo = Math.min(u1, u2);
  const hi = Math.max(u1, u2);
  return { value, extrapolated: u < lo - 1e-9 || u > hi + 1e-9 };
}

/* ------------------------------------------------------------------ one tank */

export interface TankReading {
  /** No liquid in the tank (dry / empty): volume 0, nothing else needed. */
  empty: boolean;
  /** Observed reference height, m. */
  orh: number;
  /** Observed ullages, m (2–5 readings). */
  ullages: number[];
  /** Corrections from the ship's trim and list tables, mm, signed as the table gives them. */
  trimMm: number;
  listMm: number;
  tovMode: 'direct' | 'table';
  /** TOV read from the table by hand, m³. */
  tov: number;
  /** Two table lines around the corrected ullage: ullage m → volume m³. */
  table: { u1: number; v1: number; u2: number; v2: number };
  /** Free-water innage, m (0 / NaN = none). */
  waterInnage: number;
  /** Free-water volume from the table, m³. */
  fw: number;
  temps: number[];
}

export type ShipNoteCode =
  | 'ullOne'
  | 'ullTwoDiffer'
  | 'ullSpread'
  | 'ullFour'
  | 'orhDiff'
  | 'ullOverRh'
  | 'waterOverLiquid'
  | 'fwOverTov'
  | 'tovExtrapolated'
  | 'tempsFew'
  | 'tempsSpread'
  | 'noUllage'
  | 'noTov'
  | 'noTemp';

export interface ShipNote {
  code: ShipNoteCode;
  params?: Record<string, string | number>;
}

/** ORH may differ from the table RH by this much before it is flagged, mm. */
export const ORH_TOLERANCE_MM = 5;

export interface TankEval {
  ullage: UllageResult;
  corrUllage: number | null;
  /** Liquid depth = RH − corrected ullage, m. */
  innage: number | null;
  tov: number | null;
  fw: number;
  gov: number | null;
  temp: number | null;
  tempsNeeded: 1 | 2 | 3;
  /** Enough data to compute volume and mass. */
  ready: boolean;
  /** Anything entered at all. */
  touched: boolean;
  notes: ShipNote[];
}

export function evaluateTank(def: ShipTankDef, r: TankReading | undefined): TankEval {
  const blank: TankEval = {
    ullage: { value: null, rule: 'none', spreadMm: null },
    corrUllage: null,
    innage: null,
    tov: null,
    fw: 0,
    gov: null,
    temp: null,
    tempsNeeded: 1,
    ready: false,
    touched: false,
    notes: [],
  };
  if (!r) return blank;
  if (r.empty) return { ...blank, tov: 0, gov: 0, ready: true, touched: true };

  const notes: ShipNote[] = [];
  const ullage = averageUllage(r.ullages);
  if (ullage.rule === 'one') notes.push({ code: 'ullOne' });
  if (ullage.rule === 'twoDiffer') notes.push({ code: 'ullTwoDiffer', params: { mm: ullage.spreadMm ?? 0 } });
  if (ullage.rule === 'spread') notes.push({ code: 'ullSpread', params: { mm: ullage.spreadMm ?? 0 } });
  if (ullage.rule === 'four') notes.push({ code: 'ullFour' });

  const corr = (Number.isFinite(r.trimMm) ? r.trimMm : 0) + (Number.isFinite(r.listMm) ? r.listMm : 0);
  const corrUllage = ullage.value === null ? null : mm(ullage.value + corr / 1000);
  const rh = def.rh;
  const innage = corrUllage !== null && Number.isFinite(rh) ? mm(rh - corrUllage) : null;

  if (Number.isFinite(r.orh) && Number.isFinite(rh)) {
    const d = Math.round((r.orh - rh) * 1000);
    if (Math.abs(d) > ORH_TOLERANCE_MM) notes.push({ code: 'orhDiff', params: { mm: d > 0 ? `+${d}` : `${d}` } });
  }
  if (innage !== null && innage < 0) notes.push({ code: 'ullOverRh' });

  let tov: number | null = null;
  if (r.tovMode === 'direct') {
    tov = Number.isFinite(r.tov) ? r.tov : null;
  } else if (corrUllage !== null) {
    const ip = interpolate(corrUllage, r.table.u1, r.table.v1, r.table.u2, r.table.v2);
    if (ip) {
      tov = ip.value;
      if (ip.extrapolated) notes.push({ code: 'tovExtrapolated' });
    }
  }

  const water = Number.isFinite(r.waterInnage) ? r.waterInnage : 0;
  if (innage !== null && water > innage) notes.push({ code: 'waterOverLiquid' });
  const fw = Number.isFinite(r.fw) ? r.fw : 0;
  if (tov !== null && fw > tov) notes.push({ code: 'fwOverTov' });
  const gov = tov === null ? null : Math.max(0, tov - fw);

  const temps = r.temps.filter((x) => Number.isFinite(x));
  const tempsNeeded = tempLevels(innage);
  const temp = temps.length ? temps.reduce((s, x) => s + x, 0) / temps.length : null;
  if (temps.length > 0 && temps.length < tempsNeeded) notes.push({ code: 'tempsFew', params: { n: tempsNeeded } });
  if (temps.length > 1 && Math.max(...temps) - Math.min(...temps) > 1) notes.push({ code: 'tempsSpread' });

  if (r.tovMode === 'table' && ullage.value === null) notes.push({ code: 'noUllage' });
  if (tov === null) notes.push({ code: 'noTov' });
  if (temp === null) notes.push({ code: 'noTemp' });

  const touched = ullage.value !== null || Number.isFinite(r.tov) || temps.length > 0 || Number.isFinite(r.orh) || fw > 0;
  return {
    ullage,
    corrUllage,
    innage,
    tov,
    fw,
    gov,
    temp,
    tempsNeeded,
    ready: tov !== null && temp !== null,
    touched,
    notes,
  };
}

/* ------------------------------------------------------------------ a stage (OBQ or final) */

export interface StageEval {
  tanks: Record<string, TankEval>;
  measured: number;
  missing: number;
  /** Per-standard totals over the ready tanks. */
  results: Record<Standard, StandardResult> | null;
  /** Trim by the stern positive, m. */
  trim: number | null;
}

export function evaluateStage(
  defs: ShipTankDef[],
  readings: Record<string, TankReading>,
  dens: Densities | null,
  draftFwd: number,
  draftAft: number,
): StageEval {
  const tanks: Record<string, TankEval> = {};
  const calcTanks: Tank[] = [];
  let measured = 0;
  let missing = 0;
  for (const d of defs) {
    const ev = evaluateTank(d, readings[d.id]);
    tanks[d.id] = ev;
    if (ev.ready) {
      measured++;
      calcTanks.push({
        id: d.id,
        name: tankCode(d),
        tov: ev.tov ?? 0,
        water: ev.fw,
        t: ev.temp ?? 15,
      });
    } else if (ev.touched) missing++;
  }
  const trim = Number.isFinite(draftFwd) && Number.isFinite(draftAft) ? Math.round((draftAft - draftFwd) * 1000) / 1000 : null;
  return {
    tanks,
    measured,
    missing,
    results: dens ? computeAll(dens, calcTanks) : null,
    trim,
  };
}

export type Op = 'load' | 'discharge';

export interface Quantity {
  gsv: number | null;
  mtVac: number | null;
  mtAir: number | null;
}

/** Loaded = final − OBQ; discharged = before − ROB. */
export function transferred(op: Op, initial: StageEval, final: StageEval, std: Standard): Quantity {
  const a = initial.results?.[std].totals;
  const b = final.results?.[std].totals;
  const diff = (k: keyof Quantity) => {
    const x = a?.[k];
    const y = b?.[k];
    if (x === null || x === undefined || y === null || y === undefined) return null;
    return op === 'load' ? y - x : x - y;
  };
  return { gsv: diff('gsv'), mtVac: diff('mtVac'), mtAir: diff('mtAir') };
}

/** Ship ÷ shore (B/L) and the same after dividing the ship figure by the VEF. */
export function shipShore(ship: number | null, bl: number, vef: number) {
  const okBl = Number.isFinite(bl) && bl > 0;
  const okVef = Number.isFinite(vef) && vef > 0;
  const corrected = ship !== null && okVef ? ship / vef : null;
  return {
    ratio: ship !== null && okBl ? ship / bl : null,
    diff: ship !== null && okBl ? ship - bl : null,
    corrected,
    ratioVef: corrected !== null && okBl ? corrected / bl : null,
  };
}

import * as api from './api2004';
import * as a80 from './astm1980';
import * as g85 from './gost85';
import { airDeduction, apiGravity, BBL_PER_M3, hyc15, hyc20, LT_PER_MT, round } from './units';
import type { Commodity, Group2004 } from './api2004';

export type Standard = 'api2004' | 'astm1980' | 'gost85';
export type DensitySource = 'lab15' | 'lab20' | 'labT' | 'hydro';

export const STANDARDS: { id: Standard; short: string }[] = [
  { id: 'api2004', short: 'API 2004' },
  { id: 'astm1980', short: 'ASTM 1980' },
  { id: 'gost85', short: 'ГОСТ 85' },
];

export type WarningCode = 'range' | 'lube1980' | 'transition' | 'gostRange' | 'gost20FromApi';
export interface Warning {
  code: WarningCode;
  params?: Record<string, string | number>;
}

export interface DensityInput {
  source: DensitySource;
  value: number; // kg/m³
  tC?: number; // temperature of the density measurement (labT, hydro)
  hydroCal?: 15 | 20; // hydrometer calibration temperature
  meniscus?: number; // kg/m³, added to the scale reading
}

export interface Tank {
  id: string;
  name: string;
  tov: number; // m³
  water: number; // m³ free water (+ OBQ if any)
  t: number; // °C
}

export interface Densities {
  commodity: Commodity;
  api: { rho15: number; rho20: number; rho60: number; group: Group2004; apiGravity: number; hyc: number | null };
  astm1980: { rho15: number; group: a80.Group1980 };
  gost85: { rho20: number | null; gamma: number | null; derivedFromApi: boolean };
  warnings: Warning[];
}

function inRange(x: number, [lo, hi]: [number, number]) {
  return x >= lo && x <= hi;
}

export function resolveDensity(d: DensityInput, commodity: Commodity): Densities {
  const warnings: Warning[] = [];
  const t = d.tC ?? 15;
  let rho15: number;
  let rho20: number;
  let hyc: number | null = null;
  let r1980: number;
  let g20: number | null;
  let derivedFromApi = false;

  const c80: Commodity = commodity === 'lube' ? 'product' : commodity;

  switch (d.source) {
    case 'lab15':
      rho15 = d.value;
      rho20 = api.convertBase(rho15, 15, 20, commodity);
      r1980 = rho15;
      g20 = rho20;
      derivedFromApi = true;
      break;
    case 'lab20':
      rho20 = d.value;
      rho15 = api.convertBase(rho20, 20, 15, commodity);
      r1980 = a80.rho15FromObserved(rho20, 20, c80, false);
      g20 = rho20;
      break;
    case 'labT':
      rho15 = api.baseFromObserved(d.value, t, commodity, 15);
      rho20 = api.convertBase(rho15, 15, 20, commodity);
      r1980 = a80.rho15FromObserved(d.value, t, c80, false);
      g20 = g85.rho20FromObserved(d.value, t);
      break;
    case 'hydro': {
      const reading = d.value + (d.meniscus ?? 0);
      const cal = d.hydroCal ?? 20;
      hyc = cal === 15 ? hyc15(t) : hyc20(t);
      const corrected = reading * hyc;
      rho15 = api.baseFromObserved(corrected, t, commodity, 15);
      rho20 = api.convertBase(rho15, 15, 20, commodity);
      r1980 = cal === 15 ? a80.rho15FromObserved(reading, t, c80, true) : a80.rho15FromObserved(corrected, t, c80, false);
      g20 = cal === 20 ? g85.rho20FromObserved(reading, t) : g85.rho20FromObserved(corrected, t);
      break;
    }
  }

  const { rho60, group } = api.rho60FromBase(rho15, 15, commodity);

  if (!inRange(rho15, api.RANGE_15[commodity]))
    warnings.push({
      code: 'range',
      params: { rho: rho15.toFixed(1), lo: api.RANGE_15[commodity][0], hi: api.RANGE_15[commodity][1] },
    });
  if (commodity === 'lube') warnings.push({ code: 'lube1980' });
  if (commodity === 'product' && rho15 >= 770 && rho15 < 788)
    warnings.push({ code: 'transition' });
  const gamma = g20 === null ? null : g85.gamma(g20);
  if (g20 === null || gamma === null)
    warnings.push({ code: 'gostRange' });
  if (d.source === 'lab15') warnings.push({ code: 'gost20FromApi' });

  return {
    commodity,
    api: { rho15, rho20, rho60, group, apiGravity: apiGravity(rho60), hyc },
    astm1980: { rho15: r1980, group: a80.group1980(r1980, c80) },
    gost85: { rho20: g20, gamma, derivedFromApi },
    warnings,
  };
}

export interface TankResult {
  id: string;
  name: string;
  gov: number;
  t: number;
  ok: boolean;
  vcf: number | null; // unrounded (API/ASTM) or ρt/ρ20 (ГОСТ)
  vcfUsed: number | null; // rounded to 5 decimals where the standard requires it
  rhoT: number | null; // kg/m³
  gsv: number | null; // m³ at 15 °C (ГОСТ: at 20 °C)
  mtVac: number | null;
  mtAir: number | null;
}

export interface Totals {
  gov: number;
  gsv: number | null;
  mtVac: number | null;
  mtAir: number | null;
  lt: number | null;
  bbl60: number | null;
  complete: boolean;
}

export interface StandardResult {
  standard: Standard;
  tanks: TankResult[];
  totals: Totals;
}

export function computeStandard(std: Standard, dens: Densities, tanks: Tank[]): StandardResult {
  const c = dens.commodity;
  const c80: Commodity = c === 'lube' ? 'product' : c;
  const ded = airDeduction(dens.api.rho15);
  const rows: TankResult[] = tanks.map((tk) => {
    const gov = Math.max(0, tk.tov - tk.water);
    const base = { id: tk.id, name: tk.name, gov, t: tk.t };
    if (std === 'gost85') {
      const r20 = dens.gost85.rho20;
      const rt = r20 === null ? null : g85.rhoAtT(r20, tk.t);
      if (r20 === null || rt === null)
        return { ...base, ok: false, vcf: null, vcfUsed: null, rhoT: null, gsv: null, mtVac: null, mtAir: null };
      const rtR = round(rt / 1000, 4) * 1000; // Excel rounds ρt to 0.0001 g/cm³
      const mtVac = (gov * rtR) / 1000;
      return {
        ...base,
        ok: true,
        vcf: rt / r20,
        vcfUsed: rtR / r20,
        rhoT: rt,
        gsv: (gov * rtR) / r20,
        mtVac,
        mtAir: (mtVac * (dens.api.rho15 - ded)) / dens.api.rho15,
      };
    }
    const r15 = std === 'api2004' ? dens.api.rho15 : dens.astm1980.rho15;
    const v = std === 'api2004' ? api.vcf(r15, tk.t, c) : a80.vcf(r15, tk.t, c80);
    const vUsed = round(v, 5);
    const gsv = gov * vUsed;
    return {
      ...base,
      ok: true,
      vcf: v,
      vcfUsed: vUsed,
      rhoT: r15 * v,
      gsv,
      mtVac: (gsv * r15) / 1000,
      mtAir: (gsv * (r15 - airDeduction(r15))) / 1000,
    };
  });

  const complete = rows.every((r) => r.ok);
  const sum = (k: 'gsv' | 'mtVac' | 'mtAir') => (complete ? rows.reduce((s, r) => s + (r[k] ?? 0), 0) : null);
  const gsv = sum('gsv');
  const mtAir = sum('mtAir');
  let bbl60: number | null = null;
  if (complete && std !== 'gost85' && gsv !== null) {
    // V60 = V15 · ρ15/ρ60
    const ratio =
      std === 'api2004'
        ? dens.api.rho15 / dens.api.rho60
        : 1 / a80.vcf(dens.astm1980.rho15, (60 - 32) / 1.8, c80);
    bbl60 = gsv * ratio * BBL_PER_M3;
  }
  return {
    standard: std,
    tanks: rows,
    totals: {
      gov: rows.reduce((s, r) => s + r.gov, 0),
      gsv: std === 'gost85' ? null : gsv,
      mtVac: sum('mtVac'),
      mtAir,
      lt: mtAir === null ? null : mtAir * LT_PER_MT,
      bbl60,
      complete,
    },
  };
}

export function computeAll(dens: Densities, tanks: Tank[]): Record<Standard, StandardResult> {
  return {
    api2004: computeStandard('api2004', dens, tanks),
    astm1980: computeStandard('astm1980', dens, tanks),
    gost85: computeStandard('gost85', dens, tanks),
  };
}

/**
 * ASTM D1250-80 / API 2540 Tables 53A/54A (crude), 53B/54B (products) and 54D (lubricating oils),
 * 15 °C base, as used in the terminal's Ullage Excel. Kept for comparison with old reports.
 * Boundaries follow the 1980 tables (transition 770–787.5 kg/m³, jet to 838.5).
 */
import { bisect, type Commodity } from './api2004';

export type Group1980 = 'crude' | 'gasoline' | 'transition' | 'jet' | 'fuel' | 'lube';

/** Ranges the 1980 tables cover, ρ15 kg/m³ (54A, 54B, 54D). */
export const RANGE_1980: Record<Commodity, [number, number]> = {
  crude: [610.5, 1075],
  product: [653, 1075],
  lube: [800, 1164],
};

/** Upper temperature of the 1980 tables, °C (54B extrapolated limits by density; 54A/54D 150 °C). */
export function maxT1980(rho15: number, c: Commodity): number {
  if (c !== 'product') return 150;
  return rho15 < 778 ? 95 : rho15 < 824 ? 125 : 150;
}
export const MIN_T_1980 = -18;

export function group1980(rho15: number, c: Commodity): Group1980 {
  if (c === 'crude') return 'crude';
  if (c === 'lube') return 'lube';
  if (rho15 < 770) return 'gasoline';
  if (rho15 < 787.5) return 'transition';
  if (rho15 < 838.5) return 'jet';
  return 'fuel';
}

export function alpha15(rho15: number, c: Commodity): number {
  const r = rho15;
  switch (group1980(r, c)) {
    case 'crude':
      return 613.9723 / (r * r);
    case 'gasoline':
      return 346.4228 / (r * r) + 0.4388 / r;
    case 'transition':
      return -0.00336312 + 2680.3206 / (r * r);
    case 'jet':
      return 594.5418 / (r * r);
    case 'lube':
      return 0.6278 / r;
    default:
      return 186.9696 / (r * r) + 0.4862 / r;
  }
}

/** Table 54A/54B VCF (unrounded). */
export function vcf(rho15: number, tC: number, c: Commodity): number {
  const a = alpha15(rho15, c);
  const dt = tC - 15;
  return Math.exp(-a * dt - 0.8 * a * a * dt * dt);
}

/** Glass hydrometer correction built into the 1980 Table 53 (15 °C calibration). */
export function hyc1980(tC: number): number {
  const dt = tC - 15;
  return 1 - 0.000023 * dt - 0.00000002 * dt * dt;
}

/** Table 53A/53B: ρ15 from a density at tC. `hydrometer` applies the 15 °C glass correction. */
export function rho15FromObserved(rhoT: number, tC: number, c: Commodity, hydrometer: boolean): number {
  const rt = hydrometer ? rhoT * hyc1980(tC) : rhoT;
  const f = (r: number) => r * vcf(r, tC, c) - rt;
  let r = rt;
  for (let i = 0; i < 60; i++) {
    const next = rt / vcf(r, tC, c);
    if (Math.abs(next - r) < 1e-11) {
      if (Math.abs(f(next)) < 1e-8) return next;
      break;
    }
    r = next;
  }
  // No fixed point: transition zone at high temperature, or a gap at a group boundary (770, 787.5, 838.5).
  return bisect(f, rt * 0.7, rt * 1.4);
}

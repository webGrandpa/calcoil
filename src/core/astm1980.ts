/**
 * ASTM D1250-80 / API 2540 Tables 53A/54A (crude) and 53B/54B (products), 15 °C base,
 * as used in the terminal's Ullage Excel. Kept for comparison with old reports.
 * Boundaries follow the 1980 tables (transition 770–787.5 kg/m³, jet to 838.5).
 */
import type { Commodity } from './api2004';

export type Group1980 = 'crude' | 'gasoline' | 'transition' | 'jet' | 'fuel';

export function group1980(rho15: number, c: Commodity): Group1980 {
  if (c === 'crude') return 'crude';
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
  let r = rt;
  for (let i = 0; i < 100; i++) {
    const next = rt / vcf(r, tC, c);
    if (Math.abs(next - r) < 1e-11) return next;
    r = next;
  }
  return r;
}

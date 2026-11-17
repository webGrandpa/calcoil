/**
 * API MPMS Chapter 11.1-2004 (ASTM D1250-04 Adjunct, IP 200/04), temperature part (CTL), 0 kPa gauge.
 * The same algorithm underlies ГОСТ 33335-2015 and the tables of ГОСТ 3900-2022 (20 °C base).
 * Validated against the worked examples printed in API MPMS 11.1 Addendum 2 (May 2019).
 */

export type Group2004 = 'crude' | 'fuel' | 'jet' | 'transition' | 'gasoline' | 'lube';
export type Commodity = 'product' | 'crude' | 'lube';

export const K2004: Record<Group2004, readonly [number, number, number]> = {
  crude: [341.0957, 0, 0],
  fuel: [103.872, 0.2701, 0],
  jet: [330.301, 0, 0],
  transition: [1489.067, 0, -0.0018684],
  gasoline: [192.4571, 0.2438, 0],
  lube: [0, 0.34878, 0],
};

const DELTA60 = 0.01374979547;
const T60_68 = 60.0068749;
const ITS = [-0.148759, -0.267408, 1.08076, 1.269056, -4.089591, -1.871251, 7.438081, -3.536296];

/** ITS-90 °C → IPTS-68 °F (as the 2004 procedure requires). */
export function toIpts68F(tC: number): number {
  const tau = tC / 630;
  let s = 0;
  for (let i = ITS.length - 1; i >= 0; i--) s = (s + ITS[i]) * tau;
  return (tC - s) * 1.8 + 32;
}

/** Refined-product class boundaries, kg/m³ at 60 °F. */
export function productGroup(rho60: number): Group2004 {
  if (rho60 < 770.352) return 'gasoline';
  if (rho60 < 787.5195) return 'transition';
  if (rho60 < 838.3127) return 'jet';
  return 'fuel';
}

export function alpha60(rho60: number, g: Group2004): { alpha: number; rhoStar: number } {
  const [K0, K1, K2] = K2004[g];
  const A = (DELTA60 / 2) * ((K0 / rho60 + K1) / rho60 + K2);
  const B = (2 * K0 + K1 * rho60) / (K0 + (K1 + K2 * rho60) * rho60);
  const rhoStar = rho60 * (1 + (Math.exp(A * (1 + 0.8 * A)) - 1) / (1 + A * (1 + 1.6 * A) * B));
  const alpha = K0 / (rhoStar * rhoStar) + K1 / rhoStar + K2;
  return { alpha, rhoStar };
}

/** CTL from 60 °F to tC (°C, ITS-90). */
export function ctl60(rho60: number, tC: number, g: Group2004): number {
  const { alpha } = alpha60(rho60, g);
  const dt = toIpts68F(tC) - T60_68;
  return Math.exp(-alpha * dt * (1 + 0.8 * alpha * (dt + DELTA60)));
}

function groupFor(c: Commodity, rho60: number): Group2004 {
  if (c === 'crude') return 'crude';
  if (c === 'lube') return 'lube';
  return productGroup(rho60);
}

/** Density at 60 °F from density at base temperature (15 or 20 °C). */
export function rho60FromBase(rhoBase: number, base: number, c: Commodity): { rho60: number; group: Group2004 } {
  let r60 = rhoBase;
  let g = groupFor(c, r60);
  for (let i = 0; i < 100; i++) {
    g = groupFor(c, r60);
    const next = rhoBase / ctl60(r60, base, g);
    if (Math.abs(next - r60) < 1e-11) {
      r60 = next;
      break;
    }
    r60 = next;
  }
  return { rho60: r60, group: groupFor(c, r60) };
}

/** Unrounded VCF from tC to base (15 or 20 °C) for a density known at that base. */
export function vcf(rhoBase: number, tC: number, c: Commodity, base = 15): number {
  const { rho60, group } = rho60FromBase(rhoBase, base, c);
  return ctl60(rho60, tC, group) / ctl60(rho60, base, group);
}

/** Density at base from a true (not hydrometer) density measured at tC. */
export function baseFromObserved(rhoT: number, tC: number, c: Commodity, base = 15): number {
  let r = rhoT;
  for (let i = 0; i < 100; i++) {
    const next = rhoT / vcf(r, tC, c, base);
    if (Math.abs(next - r) < 1e-11) return next;
    r = next;
  }
  return r;
}

/** Convert density between 15 and 20 °C bases. */
export function convertBase(rho: number, from: number, to: number, c: Commodity): number {
  if (from === to) return rho;
  return rho * vcf(rho, to, c, from);
}

export const RANGE_15: Record<Commodity, [number, number]> = {
  crude: [611.16, 1163.79],
  product: [611.16, 1163.86],
  lube: [801.25, 1163.85],
};

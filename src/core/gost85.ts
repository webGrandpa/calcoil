/**
 * ГОСТ 3900-85 — average temperature corrections γ (g/cm³ per °C) by density at 20 °C.
 * ρt = ρ20 − γ (t − 20). Replaced by ГОСТ 3900-2022 from 2023-01-01; kept to reproduce current practice.
 *
 * The printed table covers 0.6900–0.9999 g/cm³ in 0.01 bands. Every printed value is the linear
 * (Mendeleev) relation γ = 0.001828 − 0.00132·ρ20 taken at the band's midpoint (checked in tests,
 * within 0.000001). Outside the printed range the same relation extends the table band by band,
 * over the density range API 11.1 covers (0.6100–1.1699 g/cm³).
 */

export const GAMMA_TABLE: ReadonlyArray<readonly [number, number]> = [
  [0.69, 0.00091], [0.7, 0.000897], [0.71, 0.000884], [0.72, 0.00087], [0.73, 0.000857],
  [0.74, 0.000844], [0.75, 0.000831], [0.76, 0.000818], [0.77, 0.000805], [0.78, 0.000792],
  [0.79, 0.000778], [0.8, 0.000765], [0.81, 0.000752], [0.82, 0.000738], [0.83, 0.000725],
  [0.84, 0.000712], [0.85, 0.000699], [0.86, 0.000686], [0.87, 0.000673], [0.88, 0.00066],
  [0.89, 0.000647], [0.9, 0.000633], [0.91, 0.00062], [0.92, 0.000607], [0.93, 0.000594],
  [0.94, 0.000581], [0.95, 0.000567], [0.96, 0.000554], [0.97, 0.000541], [0.98, 0.000528],
  [0.99, 0.000515],
];

/** Mendeleev relation behind the table, ρ20 in g/cm³. */
export const mendeleev = (rho20gcc: number) => 0.001828 - 0.00132 * rho20gcc;

const MIN_BAND = 61; // 0.6100 g/cm³
const MAX_BAND = 116; // 1.1600–1.1699 g/cm³

/** Band index (69 = 0.6900–0.6999) of a density at 20 °C in kg/m³, on 0.1 kg/m³ steps to avoid float drift. */
function band(rho20: number): number {
  return Math.floor(Math.round(rho20 * 10) / 100);
}

/** True when ρ20 lies inside the printed ГОСТ 3900-85 table. */
export function inTable(rho20: number): boolean {
  const b = band(rho20);
  return b >= 69 && b <= 99;
}

/**
 * γ for a density at 20 °C in kg/m³: the printed value inside the table, the same relation at the
 * band midpoint outside it; null beyond 0.6100–1.1699 g/cm³.
 */
export function gamma(rho20: number): number | null {
  const b = band(rho20);
  if (b < MIN_BAND || b > MAX_BAND) return null;
  const row = GAMMA_TABLE[b - 69];
  if (row) return row[1];
  return Math.round(mendeleev((b + 0.5) / 100) * 1e6) / 1e6;
}

/** ρt in kg/m³. */
export function rhoAtT(rho20: number, tC: number): number | null {
  const g = gamma(rho20);
  return g === null ? null : rho20 - g * 1000 * (tC - 20);
}

/** ρ20 from a density at tC, per ГОСТ 3900-85 (γ looked up by the resulting ρ20). */
export function rho20FromObserved(rhoT: number, tC: number): number | null {
  let r20 = rhoT;
  for (let i = 0; i < 20; i++) {
    const g = gamma(r20);
    if (g === null) return null;
    const next = rhoT + g * 1000 * (tC - 20);
    if (Math.abs(next - r20) < 1e-9) return next;
    r20 = next;
  }
  return r20;
}

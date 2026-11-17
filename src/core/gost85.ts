/**
 * ГОСТ 3900-85 — table of average temperature corrections γ (g/cm³ per °C) by density at 20 °C.
 * ρt = ρ20 − γ (t − 20). Replaced by ГОСТ 3900-2022 from 2023-01-01; kept to reproduce current practice.
 * Bands are 0.01 g/cm³ wide; the table covers 0.6900–0.9999 g/cm³ only.
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

/** γ for a density at 20 °C in kg/m³; null when outside the table (below 690 or ≥ 1000). */
export function gamma(rho20: number): number | null {
  // Work on integer 0.1 kg/m³ steps to avoid float drift at band edges.
  const tenths = Math.round(rho20 * 10);
  if (tenths < 6900 || tenths >= 10000) return null;
  const band = Math.floor(tenths / 100); // 69..99
  const row = GAMMA_TABLE[band - 69];
  return row ? row[1] : null;
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

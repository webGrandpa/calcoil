/** Hydrometer, weight and unit conversions. */

/** ASTM D1298 / API MPMS 9.1, hydrometer calibrated at 15 °C. */
export function hyc15(tC: number): number {
  const d = tC - 15;
  return 1 - 0.000023 * d - 0.00000002 * d * d;
}

/** ГОСТ 3900-2022 formula (2), hydrometer graduated at 20 °C. */
export function hyc20(tC: number): number {
  return 1 - 0.000025 * (tC - 20);
}

/** Air-buoyancy deduction, kg/m³ (API MPMS 11.5 / old Table 56). */
export function airDeduction(rho15: number): number {
  return rho15 < 996.6 ? 1.1 : 1.0;
}

export const LT_PER_MT = 1000 / 1016.0469088; // 1 long ton = 1016.0469088 kg exactly
export const BBL_PER_M3 = 6.289811;

export function apiGravity(rho60: number): number {
  return (141.5 * 999.016) / rho60 - 131.5;
}

export function round(x: number, d: number): number {
  const f = 10 ** d;
  return Math.round(x * f) / f;
}

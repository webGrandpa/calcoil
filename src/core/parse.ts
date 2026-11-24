/**
 * Strict number parsing for field input. Accepts one decimal separator (comma or dot), spaces as
 * thousands separators and a leading minus (also the typographic "−"). Anything ambiguous, such as
 * "6,617.0" or "1.234,5", is rejected rather than silently read as a much smaller number.
 */
export function parseNum(s: string): number {
  const x = s.trim().replace(/[\s\u00a0\u202f]/g, '').replace(/^[\u2212\u2013]/, '-');
  if (!/^[-+]?(\d+([.,]\d*)?|[.,]\d+)$/.test(x)) return NaN;
  return parseFloat(x.replace(',', '.'));
}

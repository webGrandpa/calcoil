import { fmt } from '../i18n';
import type { Lang } from '../i18n';
import type { Op } from '../core/ship';
import type { StageId } from './store';
import type { AT, AKey } from './strings';

/** Number or an em dash. */
export const fx = (lang: Lang, x: number | null | undefined, d: number) =>
  x === null || x === undefined || !Number.isFinite(x) ? '—' : fmt(lang, x, d);

/** OBQ / Final for loading, Initial / ROB for discharge. */
export const stageName = (at: AT, op: Op, s: StageId) => at(`sn_${s}_${op}` as AKey);
export const stageSub = (at: AT, op: Op, s: StageId) => at(`ss_${s}_${op}` as AKey);

export function timeOf(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Moves focus to the next input on Enter, so a column of readings can be typed without touching the screen. */
export function enterToNext(e: React.KeyboardEvent<HTMLElement>) {
  if (e.key !== 'Enter') return;
  const el = e.target as HTMLElement;
  if (el.tagName !== 'INPUT') return;
  const inputs = Array.from(e.currentTarget.querySelectorAll<HTMLInputElement>('input:not([type=radio]):not([disabled])'));
  const i = inputs.indexOf(el as HTMLInputElement);
  if (i >= 0 && i < inputs.length - 1) {
    e.preventDefault();
    inputs[i + 1].focus();
  } else (el as HTMLInputElement).blur();
}

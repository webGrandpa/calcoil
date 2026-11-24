import { useContext } from 'react';
import { fmt, LangCtx } from '../i18n';

interface Props {
  value: number | null | undefined;
  digits: number;
  unit?: string;
  className?: string;
}

/**
 * A figure read like a gauge: whole tonnes large, the decimals smaller and lighter,
 * so the eye lands on the part that matters first.
 */
export function Readout({ value, digits, unit, className = '' }: Props) {
  const lang = useContext(LangCtx);
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return <span className={`ro is-empty ${className}`}>—</span>;
  }
  const s = fmt(lang, value, digits);
  const sep = lang === 'ru' ? ',' : '.';
  const i = s.lastIndexOf(sep);
  const int = digits > 0 && i >= 0 ? s.slice(0, i) : s;
  const dec = digits > 0 && i >= 0 ? s.slice(i) : '';
  return (
    <span className={`ro ${className}`}>
      <span className="ro-int">{int}</span>
      {dec && <span className="ro-dec">{dec}</span>}
      {unit && <span className="ro-unit">{unit}</span>}
    </span>
  );
}

import { useContext, useState } from 'react';
import { fmt, LangCtx, makeT } from '../i18n';

interface Props {
  value: number | null | undefined;
  digits: number;
  /** Shown under the full value when expanded, e.g. the 5-decimal VCF actually used. */
  note?: string;
  unit?: string;
  className?: string;
}

/** Rounded number; tap to see the full value. */
export function Num({ value, digits, note, unit, className }: Props) {
  const lang = useContext(LangCtx);
  const t = makeT(lang);
  const [full, setFull] = useState(false);
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return <span className={`num na ${className ?? ''}`}>—</span>;
  }
  const raw = full ? String(+value.toPrecision(15)) : value.toFixed(digits);
  const shown = lang === 'ru' ? raw.replace('.', ',') : raw;
  return (
    <button
      type="button"
      className={`num ${full ? 'full' : ''} ${className ?? ''}`}
      onClick={() => setFull((f) => !f)}
      title={full ? t('showRounded') : t('showFull')}
    >
      {shown}
      {unit ? <span className="unit"> {unit}</span> : null}
      {full && note ? <span className="note">{note}</span> : null}
    </button>
  );
}

export { fmt };

import { useContext, useState } from 'react';
import { LangCtx, localize, makeT } from '../i18n';

interface Props {
  value: number | null | undefined;
  digits: number;
  /** Shown under the full value when expanded, e.g. the 5-decimal VCF actually used. */
  note?: string;
  unit?: string;
  className?: string;
  /** Prefix positive values with '+'. */
  signed?: boolean;
}

/** Rounded number; tap to see the full value. */
export function Num({ value, digits, note, unit, className, signed }: Props) {
  const lang = useContext(LangCtx);
  const t = makeT(lang);
  const [full, setFull] = useState(false);
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return <span className={`num is-empty ${className ?? ''}`}>—</span>;
  }
  const raw = full ? String(+value.toPrecision(15)) : value.toFixed(digits);
  return (
    <button
      type="button"
      className={`num ${full ? 'is-full' : ''} ${className ?? ''}`}
      onClick={() => setFull((f) => !f)}
      aria-label={full ? t('showRounded') : t('showFull')}
    >
      <span className="num-val">
        {signed && value > 0 ? '+' : ''}
        {localize(lang, raw)}
      </span>
      {unit ? <span className="num-unit">{unit}</span> : null}
      {full && note ? <span className="num-note">{note}</span> : null}
    </button>
  );
}

import { useId } from 'react';

interface Props {
  label: string;
  value: string;
  onChange: (v: string) => void;
  unit?: string;
  size?: 'md' | 'lg';
  invalid?: boolean;
}

/** Numeric text field. The unit, when given, sits inside the box after the value. */
export function Field({ label, value, onChange, unit, size = 'md', invalid }: Props) {
  const id = useId();
  return (
    <div className={`field field--${size}`}>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <div className={`input-box ${invalid ? 'is-invalid' : ''}`}>
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="next"
          value={value}
          aria-invalid={invalid || undefined}
          onChange={(e) => onChange(e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
        />
        {unit ? <span className="input-unit">{unit}</span> : null}
      </div>
    </div>
  );
}

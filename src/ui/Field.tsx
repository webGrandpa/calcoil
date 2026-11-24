import { useId } from 'react';

interface Props {
  label: string;
  value: string;
  onChange: (v: string) => void;
  unit?: string;
  size?: 'md' | 'lg';
  invalid?: boolean;
  /** 'text' for names; numbers by default. */
  mode?: 'decimal' | 'text' | 'email';
  /** Extra line under the box. */
  hint?: string;
}

/** Numeric text field. The unit, when given, sits inside the box after the value. */
export function Field({ label, value, onChange, unit, size = 'md', invalid, mode = 'decimal', hint }: Props) {
  const id = useId();
  return (
    <div className={`field field--${size}`}>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <div className={`input-box ${invalid ? 'is-invalid' : ''}`}>
        <input
          id={id}
          inputMode={mode}
          autoComplete="off"
          autoCapitalize={mode === 'text' ? 'characters' : 'off'}
          spellCheck={false}
          enterKeyHint="next"
          value={value}
          aria-invalid={invalid || undefined}
          onChange={(e) => onChange(e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
        />
        {unit ? <span className="input-unit">{unit}</span> : null}
      </div>
      {hint ? <p className="field-hint">{hint}</p> : null}
    </div>
  );
}

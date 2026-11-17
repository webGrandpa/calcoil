import { useId } from 'react';

interface Props {
  label: string;
  value: string;
  onChange: (v: string) => void;
  unit?: string;
  compact?: boolean;
  invalid?: boolean;
}

/** Numeric text field with its unit shown inside the box. */
export function Field({ label, value, onChange, unit, compact, invalid }: Props) {
  const id = useId();
  return (
    <div className={`field ${compact ? 'field--compact' : ''}`}>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <div className={`input-box ${invalid ? 'is-invalid' : ''}`}>
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          value={value}
          aria-invalid={invalid || undefined}
          onChange={(e) => onChange(e.target.value)}
        />
        {unit ? <span className="input-unit">{unit}</span> : null}
      </div>
    </div>
  );
}

import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { CloseIcon } from './Icons';

interface Props {
  open: boolean;
  title: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
}

/** Modal sheet: slides up from the bottom on phones, centred dialog on wider screens. */
export function Sheet({ open, title, closeLabel, onClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby={id}
      onClose={onClose}
      onClick={(e) => {
        // A click on the backdrop lands on the <dialog> element itself.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sheet-body">
        <div className="sheet-grip" aria-hidden="true" />
        <div className="sheet-head">
          <h2 id={id}>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={closeLabel}>
            <CloseIcon />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

export interface ChoiceOption<V extends string | number> {
  value: V;
  label: string;
  desc?: string;
}

interface ChoiceListProps<V extends string | number> {
  name: string;
  legend?: string;
  value: V;
  options: ChoiceOption<V>[];
  onChange: (v: V) => void;
}

/** Large radio rows with an optional one-line explanation each. */
export function ChoiceList<V extends string | number>({ name, legend, value, options, onChange }: ChoiceListProps<V>) {
  return (
    <fieldset className="choice-set">
      {legend ? <legend className="field-label">{legend}</legend> : null}
      <div className="choices">
      {options.map((o) => (
        <label key={String(o.value)} className="choice">
          <input
            type="radio"
            name={name}
            value={String(o.value)}
            checked={o.value === value}
            onChange={() => onChange(o.value)}
          />
          <span className="choice-text">
            <span className="choice-label">{o.label}</span>
            {o.desc ? <span className="choice-desc">{o.desc}</span> : null}
          </span>
        </label>
      ))}
      </div>
    </fieldset>
  );
}

import { useId } from 'react';

interface Option<V extends string | number> {
  value: V;
  label: string;
}

interface Props<V extends string | number> {
  label: string;
  /** Hide the visible label (still announced). */
  hideLabel?: boolean;
  value: V;
  options: Option<V>[];
  onChange: (v: V) => void;
  /** 'fill' stretches options to equal widths; 'grid2' lays four options as 2×2 on narrow screens. */
  layout?: 'fill' | 'grid2';
  size?: 'md' | 'sm';
  /** 'hero' = drawn on the dark result panel. */
  tone?: 'default' | 'hero';
}

/** A labelled radio group drawn as one control. */
export function Segmented<V extends string | number>({
  label,
  hideLabel,
  value,
  options,
  onChange,
  layout = 'fill',
  size = 'md',
  tone = 'default',
}: Props<V>) {
  const id = useId();
  return (
    <div className={`seg-field ${hideLabel ? 'seg-field--bare' : ''}`}>
      <span id={id} className={hideLabel ? 'sr-only' : 'field-label'}>
        {label}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={id}
        className={`seg seg--${layout} seg--${size} seg--${tone}`}
        onKeyDown={(e) => {
          const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
          if (!step) return;
          e.preventDefault();
          const i = options.findIndex((o) => o.value === value);
          const next = options.at((i + step + options.length) % options.length);
          if (!next) return;
          onChange(next.value);
          const btns = e.currentTarget.querySelectorAll<HTMLButtonElement>('button');
          btns.item((i + step + options.length) % options.length)?.focus();
        }}
      >
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={o.value === value}
            tabIndex={o.value === value ? 0 : -1}
            className="seg-opt"
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

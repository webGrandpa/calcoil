import type { ReactNode } from 'react';
import { BackIcon, CalcIcon, JobsIcon, SettingsIcon, ShipIcon } from './Icons';

interface BarProps {
  title: string;
  sub?: string;
  /** Shows the back arrow. */
  onBack?: () => void;
  backLabel?: string;
  actions?: ReactNode;
  /** Large title for the top-level screens. */
  large?: boolean;
}

export function AppBar({ title, sub, onBack, backLabel, actions, large }: BarProps) {
  return (
    <header className={`appbar ${large ? 'appbar--large' : ''}`}>
      {onBack && (
        <button type="button" className="icon-btn appbar-back" onClick={onBack} aria-label={backLabel}>
          <BackIcon />
        </button>
      )}
      <div className="appbar-titles">
        <h1>{title}</h1>
        {sub ? <p>{sub}</p> : null}
      </div>
      {actions ? <div className="appbar-actions">{actions}</div> : null}
    </header>
  );
}

export type Tab = 'jobs' | 'vessels' | 'calc' | 'settings';

interface TabProps {
  active: Tab;
  labels: Record<Tab, string>;
  onGo: (t: Tab) => void;
}

const ICONS: Record<Tab, () => JSX.Element> = { jobs: JobsIcon, vessels: ShipIcon, calc: CalcIcon, settings: SettingsIcon };

export function TabBar({ active, labels, onGo }: TabProps) {
  return (
    <nav className="tabbar" aria-label="CalcOil">
      {(Object.keys(ICONS) as Tab[]).map((k) => {
        const Icon = ICONS[k];
        return (
          <button
            key={k}
            type="button"
            className={`tab ${k === active ? 'is-active' : ''}`}
            aria-current={k === active ? 'page' : undefined}
            onClick={() => onGo(k)}
          >
            <Icon />
            <span>{labels[k]}</span>
          </button>
        );
      })}
    </nav>
  );
}

/** A grouped list of tappable rows (iOS-style), each with a status mark, title, sub line and chevron. */
export function StepRow({
  state,
  title,
  sub,
  value,
  next,
  onClick,
}: {
  state?: 'todo' | 'part' | 'done';
  title: string;
  sub?: string;
  value?: ReactNode;
  /** The first step still open: marked so the eye finds it. */
  next?: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className={`step ${next ? 'is-next' : ''}`} aria-current={next ? 'step' : undefined} onClick={onClick}>
      {state && (
        <span className={`step-mark step-mark--${state}`} aria-hidden="true">
          {state === 'done' && (
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="m5 12.5 4.2 4L19 7" />
            </svg>
          )}
        </span>
      )}
      <span className="step-text">
        <span className="step-title">{title}</span>
        {sub ? <span className="step-sub">{sub}</span> : null}
      </span>
      {value !== undefined ? <span className="step-value">{value}</span> : null}
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="step-chev">
        <path d="m9 6 6 6-6 6" />
      </svg>
    </button>
  );
}

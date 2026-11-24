/** Small inline icons (24-unit grid, currentColor). */

export function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" />
      <path
        strokeLinejoin="round"
        d="M19.4 13.5c.05-.5.05-1 0-1.5l1.9-1.5-1.9-3.3-2.3.9a7.3 7.3 0 0 0-1.3-.8L15.4 5h-3.8l-.4 2.3c-.46.2-.9.47-1.3.8l-2.3-.9-1.9 3.3L7.6 12c-.05.5-.05 1 0 1.5l-1.9 1.5 1.9 3.3 2.3-.9c.4.33.84.6 1.3.8l.4 2.3h3.8l.4-2.3c.46-.2.9-.47 1.3-.8l2.3.9 1.9-3.3-1.9-1.5Z"
      />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 7h15M9.5 7V4.8h5V7M6.5 7l.9 12.2h9.2L17.5 7M10.2 10.5v5.6M13.8 10.5v5.6" />
    </svg>
  );
}

/** Hydrometer: weighted bulb and graduated stem — the instrument density is read from. */
export function HydrometerMark({ size = 30 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
      <rect x="0" y="0" width="32" height="32" rx="8" fill="var(--hero)" />
      <path d="M16 4.5v12" stroke="var(--on-hero)" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M16 6.5h2.6M16 9.5h1.8M16 12.5h2.6M16 15.5h1.8" stroke="var(--on-hero)" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M16 16.3c-2.6 0-4.1 2.1-4.1 4.9 0 3.1 1.8 5.6 4.1 5.6s4.1-2.5 4.1-5.6c0-2.8-1.5-4.9-4.1-4.9Z" fill="var(--on-hero)" />
      <circle cx="16" cy="23.6" r="1.6" fill="var(--signal)" />
    </svg>
  );
}

export function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

const base = {
  viewBox: '0 0 24 24',
  'aria-hidden': true,
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function BackIcon() {
  return (
    <svg {...base} width="24" height="24" strokeWidth="2">
      <path d="M15 5.5 8.5 12l6.5 6.5" />
    </svg>
  );
}

/** Jobs: a clipboard with a tick list. */
export function JobsIcon() {
  return (
    <svg {...base} width="24" height="24" strokeWidth="1.7">
      <rect x="5" y="4.5" width="14" height="16" rx="2.5" />
      <path d="M9 3.5h6v2.5H9zM8.5 11h7M8.5 14.5h7M8.5 18h4" />
    </svg>
  );
}

/** Vessels: a tanker hull seen from the side. */
export function ShipIcon() {
  return (
    <svg {...base} width="24" height="24" strokeWidth="1.7">
      <path d="M3 14.5h18l-2.4 4.2a1.6 1.6 0 0 1-1.4.8H6.8a1.6 1.6 0 0 1-1.4-.8L3 14.5Z" />
      <path d="M6 14.5V11h12v3.5M14.5 11V6.5h3V11M9 11V9" />
    </svg>
  );
}

/** Calculator: a hydrometer stem with a scale. */
export function CalcIcon() {
  return (
    <svg {...base} width="24" height="24" strokeWidth="1.7">
      <path d="M12 3v9.5" />
      <path d="M12 5.5h2.2M12 8h1.6M12 10.5h2.2" />
      <path d="M12 12.5c-2.4 0-3.8 1.9-3.8 4.4 0 2.8 1.7 4.6 3.8 4.6s3.8-1.8 3.8-4.6c0-2.5-1.4-4.4-3.8-4.4Z" />
    </svg>
  );
}

export function SettingsIcon() {
  return <GearIcon />;
}

export function CheckIcon() {
  return (
    <svg {...base} width="16" height="16" strokeWidth="2.4">
      <path d="m5 12.5 4.2 4L19 7" />
    </svg>
  );
}

export function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="currentColor">
      <circle cx="5.5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="18.5" cy="12" r="1.8" />
    </svg>
  );
}

export function PrevIcon() {
  return (
    <svg {...base} width="22" height="22" strokeWidth="2">
      <path d="M14.5 6 8.5 12l6 6" />
    </svg>
  );
}

export function NextIcon() {
  return (
    <svg {...base} width="22" height="22" strokeWidth="2">
      <path d="m9.5 6 6 6-6 6" />
    </svg>
  );
}

export function MailIcon() {
  return (
    <svg {...base} width="20" height="20" strokeWidth="1.8">
      <rect x="3.5" y="5.5" width="17" height="13" rx="2.2" />
      <path d="m4.5 7 7.5 6 7.5-6" />
    </svg>
  );
}

export function FileIcon() {
  return (
    <svg {...base} width="20" height="20" strokeWidth="1.8">
      <path d="M7 3.5h7l4.5 4.5v12.5H7z" />
      <path d="M14 3.5V8h4.5M9.5 13l5 5M14.5 13l-5 5" />
    </svg>
  );
}

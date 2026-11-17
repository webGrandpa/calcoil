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
      <rect x="0" y="0" width="32" height="32" rx="8" fill="var(--petrol)" />
      <path d="M16 4.5v12" stroke="var(--on-petrol)" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M16 6.5h2.6M16 9.5h1.8M16 12.5h2.6M16 15.5h1.8" stroke="var(--on-petrol)" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M16 16.3c-2.6 0-4.1 2.1-4.1 4.9 0 3.1 1.8 5.6 4.1 5.6s4.1-2.5 4.1-5.6c0-2.8-1.5-4.9-4.1-4.9Z" fill="var(--on-petrol)" />
      <circle cx="16" cy="23.6" r="1.6" fill="var(--signal)" />
    </svg>
  );
}

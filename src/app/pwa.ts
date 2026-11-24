/**
 * App updates. A new version downloads in the background and waits; the app shows a banner and
 * switches over only when the user taps it, so a page never reloads in the middle of gauging.
 * Checks on start, every hour, and whenever the app comes back to the screen.
 */
import { useSyncExternalStore } from 'react';
import { registerSW } from 'virtual:pwa-register';

const HOUR = 60 * 60 * 1000;
const MIN_GAP = 5 * 60 * 1000;

let started = false;
let reg: ServiceWorkerRegistration | undefined;
let apply: ((reload?: boolean) => Promise<void>) | null = null;
let ready = false;
let dismissed = false;
let lastCheck = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

async function check(force = false): Promise<void> {
  if (!reg || !navigator.onLine) return;
  if (!force && Date.now() - lastCheck < MIN_GAP) return;
  lastCheck = Date.now();
  try {
    await reg.update();
  } catch {
    /* offline or the server is unreachable: try again later */
  }
}

export function startPwa() {
  if (started || typeof window === 'undefined') return;
  started = true;
  apply = registerSW({
    immediate: true,
    onNeedRefresh() {
      ready = true;
      dismissed = false;
      emit();
    },
    onRegisteredSW(_url, r) {
      reg = r;
      if (!r) return;
      lastCheck = Date.now();
      window.setInterval(() => check(), HOUR);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
      window.addEventListener('online', () => check());
    },
  });
}

/** Switch to the waiting version and reload. Inputs are already saved on every keystroke. */
export function applyUpdate() {
  if (apply) apply(true);
  else location.reload();
}

export function dismissUpdate() {
  dismissed = true;
  emit();
}

export type CheckResult = 'found' | 'latest' | 'offline' | 'unsupported';

/** "Check for updates" in settings. */
export async function checkNow(): Promise<CheckResult> {
  if (!reg) return 'unsupported';
  if (!navigator.onLine) return 'offline';
  await check(true);
  if (ready || reg.waiting || reg.installing) {
    dismissed = false;
    emit();
    return 'found';
  }
  return 'latest';
}

const snapshot = () => (ready && !dismissed ? 'show' : ready ? 'hidden' : 'none');

/** 'show' when a new version is waiting and the banner was not closed. */
export function useUpdateState(): 'none' | 'show' | 'hidden' {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    snapshot,
    () => 'none',
  );
}

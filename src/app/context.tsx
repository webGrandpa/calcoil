import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { LangCtx, makeT } from '../i18n';
import type { Lang, T } from '../i18n';
import { makeST } from '../ship/strings';
import type { ST } from '../ship/strings';
import { applyTheme } from '../theme';
import { deriveJob } from './derive';
import type { JobView } from './derive';
import { makeAT } from './strings';
import type { AT } from './strings';
import { loadStore, saveStore } from './store';
import type { Job, Store, Vessel } from './store';

interface Ctx {
  store: Store;
  update: (fn: (s: Store) => Store) => void;
  lang: Lang;
  /** Calculator / density strings. */
  t: T;
  /** Gauging strings. */
  st: ST;
  /** App shell strings. */
  at: AT;
}

const AppCtx = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<Store>(loadStore);
  const update = useCallback((fn: (s: Store) => Store) => setStore(fn), []);
  const lang = store.settings.lang;

  useEffect(() => saveStore(store), [store]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    applyTheme(store.settings.theme);
    if (store.settings.theme !== 'system') return;
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    const on = () => applyTheme('system');
    mq?.addEventListener('change', on);
    return () => mq?.removeEventListener('change', on);
  }, [store.settings.theme]);

  const value = useMemo<Ctx>(
    () => ({ store, update, lang, t: makeT(lang), st: makeST(lang), at: makeAT(lang) }),
    [store, update, lang],
  );
  return (
    <AppCtx.Provider value={value}>
      <LangCtx.Provider value={lang}>{children}</LangCtx.Provider>
    </AppCtx.Provider>
  );
}

export function useApp(): Ctx {
  const c = useContext(AppCtx);
  if (!c) throw new Error('useApp outside AppProvider');
  return c;
}

export interface JobCtx {
  job: Job;
  vessel: Vessel;
  view: JobView;
  setJob: (fn: (j: Job) => Job) => void;
}

/** The job, its vessel and everything computed from them; null when either is gone. */
export function useJob(id: string): JobCtx | null {
  const { store, update } = useApp();
  const job = store.jobs.find((j) => j.id === id) ?? null;
  const vessel = job ? (store.vessels.find((v) => v.id === job.vesselId) ?? null) : null;
  const view = useMemo(() => (job && vessel ? deriveJob(job, vessel) : null), [job, vessel]);
  const setJob = useCallback(
    (fn: (j: Job) => Job) => update((s) => ({ ...s, jobs: s.jobs.map((j) => (j.id === id ? fn(j) : j)) })),
    [update, id],
  );
  if (!job || !vessel || !view) return null;
  return { job, vessel, view, setJob };
}

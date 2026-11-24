/**
 * Everything the app keeps on the phone, in one object (localStorage "calcoil-v2"):
 * vessels with their tanks, jobs (one vessel call each), settings and the quick calculator.
 * Inputs stay as the strings the user typed; core/ converts them when it computes.
 */
import type { Commodity } from '../core/api2004';
import type { DensitySource, Standard } from '../core/calc';
import { parseNum } from '../core/parse';
import type { Op, ShipTankDef, Side, TankReading } from '../core/ship';
import type { Lang } from '../i18n';
import { detectLang } from '../i18n';
import type { ThemePref } from '../theme';

/* ------------------------------------------------------------------ helpers */

let seq = 0;
export const newId = () => `${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;
/** Empty → NaN. */
export const num = (s: string | undefined) => (s === undefined || s.trim() === '' ? NaN : parseNum(s));
/** Typed something that is not a number. */
export const bad = (s: string | undefined) => s !== undefined && s.trim() !== '' && !Number.isFinite(parseNum(s));

export function today(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`;
}

/* ------------------------------------------------------------------ vessels */

export interface TankDefDraft {
  id: string;
  row: number;
  side: Side;
  slop: boolean;
  /** Reference height from the ship's tables, m. */
  rh: string;
}

export interface Vessel {
  id: string;
  name: string;
  imo: string;
  pairs: number;
  centre: boolean;
  slops: boolean;
  tanks: TankDefDraft[];
}

export const toDef = (d: TankDefDraft): ShipTankDef => ({ id: d.id, row: d.row, side: d.side, slop: d.slop, rh: num(d.rh) });

/* ------------------------------------------------------------------ gauging */

export interface ReadingDraft {
  empty: boolean;
  orh: string;
  ull: string[];
  trim: string;
  list: string;
  tovMode: 'direct' | 'table';
  tov: string;
  u1: string;
  v1: string;
  u2: string;
  v2: string;
  water: string;
  fw: string;
  temps: string[];
}

export const emptyReading = (): ReadingDraft => ({
  empty: false,
  orh: '',
  ull: ['', ''],
  trim: '',
  list: '',
  tovMode: 'table',
  tov: '',
  u1: '',
  v1: '',
  u2: '',
  v2: '',
  water: '',
  fw: '',
  temps: [''],
});

export const toReading = (r: ReadingDraft): TankReading => ({
  empty: r.empty,
  orh: num(r.orh),
  ullages: r.ull.map(num),
  trimMm: num(r.trim),
  listMm: num(r.list),
  tovMode: r.tovMode,
  tov: num(r.tov),
  table: { u1: num(r.u1), v1: num(r.v1), u2: num(r.u2), v2: num(r.v2) },
  waterInnage: num(r.water),
  fw: num(r.fw),
  temps: r.temps.map(num),
});

export type StageId = 'initial' | 'final';

export interface StageDraft {
  draftF: string;
  draftA: string;
  listDeg: string;
  listSide: 'P' | 'S';
  readings: Record<string, ReadingDraft>;
}

export const emptyStage = (): StageDraft => ({ draftF: '', draftA: '', listDeg: '', listSide: 'P', readings: {} });

/* ------------------------------------------------------------------ cargo, shore, report */

export interface CargoDraft {
  commodity: Commodity;
  source: DensitySource;
  density: string;
  densT: string;
  hydroCal: 15 | 20;
  meniscus: string;
}

export const defaultCargo = (): CargoDraft => ({
  commodity: 'product',
  source: 'lab15',
  density: '',
  densT: '20',
  hydroCal: 20,
  meniscus: '0',
});

export interface ShoreReading {
  tov: string;
  water: string;
  t: string;
}

export interface ShoreTankDraft {
  id: string;
  name: string;
  before: ShoreReading;
  after: ShoreReading;
}

export const emptyShore = (): ShoreReading => ({ tov: '', water: '', t: '' });

export interface ReportFields {
  location: string;
  port: string;
  terminalRep: string;
  surveyor: string;
  emailTo: string;
  sea: string;
  chiefOfficer: string;
}

export interface Job {
  id: string;
  createdAt: number;
  vesselId: string;
  op: Op;
  grade: string;
  berth: string;
  date: string;
  voyage: string;
  standard: Standard;
  mass: 'vac' | 'air';
  cargo: CargoDraft;
  ship: { initial: StageDraft; final: StageDraft };
  shore: ShoreTankDraft[];
  blMode: 'shore' | 'manual';
  bl: string;
  vef: string;
  report: ReportFields;
  sentAt: number | null;
}

/* ------------------------------------------------------------------ settings, calculator */

export interface Settings {
  lang: Lang;
  theme: ThemePref;
  standard: Standard;
  mass: 'vac' | 'air';
  report: Omit<ReportFields, 'chiefOfficer'>;
}

export interface CalcTankDraft {
  id: string;
  name: string;
  tov: string;
  water: string;
  t: string;
}

export interface CalcDraft {
  standard: Standard;
  mass: 'vac' | 'air';
  cargo: CargoDraft;
  tanks: CalcTankDraft[];
}

export interface Store {
  v: 2;
  vessels: Vessel[];
  jobs: Job[];
  settings: Settings;
  calc: CalcDraft;
}

export const defaultSettings = (): Settings => ({
  lang: detectLang(),
  theme: 'system',
  standard: 'api2004',
  mass: 'air',
  report: { location: 'BATUMI OIL TERMINAL', port: 'BATUMI, GEORGIA', terminalRep: '', surveyor: '', emailTo: '', sea: 'CALM' },
});

export const defaultCalc = (): CalcDraft => ({
  standard: 'api2004',
  mass: 'vac',
  cargo: { ...defaultCargo(), density: '840.6' },
  tanks: [{ id: newId(), name: '1', tov: '5000', water: '0', t: '28.6' }],
});

export function newJob(vesselId: string, s: Settings, p: Partial<Job> = {}): Job {
  return {
    id: newId(),
    createdAt: Date.now(),
    vesselId,
    op: 'load',
    grade: '',
    berth: '',
    date: today(),
    voyage: '',
    standard: s.standard,
    mass: s.mass,
    cargo: defaultCargo(),
    ship: { initial: emptyStage(), final: emptyStage() },
    shore: [],
    blMode: 'shore',
    bl: '',
    vef: '',
    report: { ...s.report, chiefOfficer: '' },
    sentAt: null,
    ...p,
  };
}

/* ------------------------------------------------------------------ load, save, migrate */

export const STORE_KEY = 'calcoil-v2';

export function loadStore(): Store {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const s = JSON.parse(raw) as Partial<Store>;
      return {
        v: 2,
        vessels: s.vessels ?? [],
        jobs: s.jobs ?? [],
        settings: { ...defaultSettings(), ...s.settings, report: { ...defaultSettings().report, ...s.settings?.report } },
        calc: { ...defaultCalc(), ...s.calc },
      };
    }
    return migrate();
  } catch {
    return { v: 2, vessels: [], jobs: [], settings: defaultSettings(), calc: defaultCalc() };
  }
}

export function saveStore(s: Store) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(s));
  } catch {
    /* storage full or unavailable */
  }
}

/** Brings over what earlier versions kept: the calculator ("calcoil-v1") and vessels/operations ("calcoil-ship-v1"). */
export function migrate(): Store {
  const settings = defaultSettings();
  const calc = defaultCalc();
  const store: Store = { v: 2, vessels: [], jobs: [], settings, calc };
  try {
    const raw1 = localStorage.getItem('calcoil-v1') ?? localStorage.getItem('dashveba-v1');
    if (raw1) {
      const o = JSON.parse(raw1);
      if (o.lang) settings.lang = o.lang;
      if (o.theme) settings.theme = o.theme;
      if (o.standard) settings.standard = calc.standard = o.standard;
      if (o.mass) calc.mass = o.mass;
      calc.cargo = {
        commodity: o.commodity ?? 'product',
        source: o.source ?? 'lab15',
        density: o.density ?? '',
        densT: o.densT ?? '20',
        hydroCal: o.hydroCal ?? 20,
        meniscus: o.meniscus ?? '0',
      };
      if (Array.isArray(o.tanks)) calc.tanks = o.tanks;
    }
    const raw2 = localStorage.getItem('calcoil-ship-v1');
    if (raw2) {
      const o = JSON.parse(raw2);
      if (o.defaults) settings.report = { ...settings.report, ...o.defaults };
      for (const v of o.vessels ?? []) {
        store.vessels.push({ id: v.id, name: v.name, imo: '', pairs: v.pairs, centre: v.centre, slops: v.slops, tanks: v.tanks });
        const op = o.ops?.[v.id];
        if (op)
          store.jobs.push(
            newJob(v.id, settings, {
              op: op.op ?? 'load',
              cargo: { ...calc.cargo },
              ship: { initial: op.initial ?? emptyStage(), final: op.final ?? emptyStage() },
              blMode: op.bl ? 'manual' : 'shore',
              bl: op.bl ?? '',
              vef: op.vef ?? '',
              grade: op.report?.grade ?? '',
              berth: op.report?.berth ?? '',
              date: op.report?.date ?? today(),
              report: { ...settings.report, chiefOfficer: op.report?.chiefOfficer ?? '', ...(op.report ?? {}) },
            }),
          );
      }
    }
  } catch {
    /* start clean */
  }
  return store;
}

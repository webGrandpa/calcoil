/** Editable (string) state of the ship workspace, its storage and conversion to core types. */
import { parseNum } from '../core/parse';
import type { Op, ShipTankDef, Side, TankReading } from '../core/ship';

export interface TankDefDraft {
  id: string;
  row: number;
  side: Side;
  slop: boolean;
  rh: string;
}

export interface VesselDraft {
  id: string;
  name: string;
  pairs: number;
  centre: boolean;
  slops: boolean;
  tanks: TankDefDraft[];
}

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

export type StageId = 'initial' | 'final';

export interface StageDraft {
  draftF: string;
  draftA: string;
  listDeg: string;
  listSide: 'P' | 'S';
  readings: Record<string, ReadingDraft>;
}

export interface ReportDraft {
  date: string;
  location: string;
  port: string;
  berth: string;
  grade: string;
  sea: string;
  terminalRep: string;
  chiefOfficer: string;
  surveyor: string;
  emailTo: string;
}

/** Fields that usually stay the same from one vessel to the next. */
export const STICKY: (keyof ReportDraft)[] = ['location', 'port', 'terminalRep', 'surveyor', 'emailTo'];

export interface OpDraft {
  op: Op;
  stage: StageId;
  initial: StageDraft;
  final: StageDraft;
  bl: string;
  vef: string;
  report?: Partial<ReportDraft>;
}

export interface ShipState {
  vessels: VesselDraft[];
  vesselId: string | null;
  ops: Record<string, OpDraft>;
  defaults?: Partial<ReportDraft>;
}

export function today(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`;
}

export function reportOf(op: OpDraft, defaults: Partial<ReportDraft> | undefined): ReportDraft {
  return {
    date: today(),
    location: 'BATUMI OIL TERMINAL',
    port: 'BATUMI, GEORGIA',
    berth: '',
    grade: '',
    sea: 'CALM',
    terminalRep: '',
    chiefOfficer: '',
    surveyor: '',
    emailTo: '',
    ...defaults,
    ...op.report,
  };
}

const KEY = 'calcoil-ship-v1';
let seq = 0;
export const newId = () => `${Date.now().toString(36)}${(seq++).toString(36)}`;

export const emptyStage = (): StageDraft => ({
  draftF: '',
  draftA: '',
  listDeg: '0',
  listSide: 'P',
  readings: {},
});
export const emptyOp = (): OpDraft => ({
  op: 'load',
  stage: 'initial',
  initial: emptyStage(),
  final: emptyStage(),
  bl: '',
  vef: '',
});
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

export function loadShip(): ShipState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as ShipState;
      if (Array.isArray(s.vessels))
        return {
          vessels: s.vessels,
          vesselId: s.vesselId ?? null,
          ops: s.ops ?? {},
        };
    }
  } catch {
    /* storage unavailable or damaged */
  }
  return { vessels: [], vesselId: null, ops: {} };
}

export function saveShip(s: ShipState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

/** Empty → NaN; ambiguous input → NaN too (the field shows it as invalid). */
export const num = (s: string | undefined) => (s === undefined || s.trim() === '' ? NaN : parseNum(s));
/** True when the user typed something that is not a number. */
export const bad = (s: string | undefined) => s !== undefined && s.trim() !== '' && !Number.isFinite(parseNum(s));

export const toDef = (d: TankDefDraft): ShipTankDef => ({
  id: d.id,
  row: d.row,
  side: d.side,
  slop: d.slop,
  rh: num(d.rh),
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

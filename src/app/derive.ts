/** Everything a job screen shows, computed from the stored inputs in one place. */
import { computeAll, resolveDensity, STANDARDS } from '../core/calc';
import type { Densities, DensityInput, Standard, StandardResult, Tank } from '../core/calc';
import type { Commodity } from '../core/api2004';
import { parseNum } from '../core/parse';
import { evaluateStage, shipShore, transferred } from '../core/ship';
import type { Quantity, ShipTankDef, StageEval, TankEval } from '../core/ship';
import { num, toDef, toReading } from './store';
import type { CargoDraft, Job, ShoreReading, StageDraft, Vessel } from './store';

/* ------------------------------------------------------------------ density */

/** kg/m³, or g/cm³ when the value is below 2. */
export function densityKg(s: string): number {
  const v = parseNum(s);
  return v > 0 && v < 2 ? v * 1000 : v;
}

export const needsTemp = (c: CargoDraft) => c.source === 'labT' || c.source === 'hydro';

export interface CargoView {
  dens: Densities | null;
  value: number;
  valueOk: boolean;
  tOk: boolean;
  menOk: boolean;
}

export function resolveCargo(c: CargoDraft, commodity: Commodity = c.commodity): CargoView {
  const value = densityKg(c.density);
  const valueOk = value > 500 && value < 1200;
  const tOk = !needsTemp(c) || Number.isFinite(num(c.densT));
  const men = c.meniscus.trim() === '' ? 0 : parseNum(c.meniscus);
  const menOk = c.source !== 'hydro' || Number.isFinite(men);
  let dens: Densities | null = null;
  if (valueOk && tOk && menOk) {
    const input: DensityInput = {
      source: c.source,
      value,
      tC: needsTemp(c) ? num(c.densT) : undefined,
      hydroCal: c.hydroCal,
      meniscus: c.source === 'hydro' ? men : 0,
    };
    try {
      dens = resolveDensity(input, commodity);
    } catch {
      dens = null;
    }
  }
  return { dens, value, valueOk, tOk, menOk };
}

/* ------------------------------------------------------------------ tanks */

export type TankState = 'todo' | 'empty' | 'ready' | 'part';

/** How far a tank's gauging has got: nothing yet, marked empty, complete, or started. */
export function tankState(ev: TankEval | undefined): TankState {
  if (!ev?.touched) return 'todo';
  if (ev.ready && ev.tov === 0 && ev.ullage.value === null) return 'empty';
  return ev.ready ? 'ready' : 'part';
}

/** Notes that are more than "still to enter". */
export const tankWarn = (ev: TankEval | undefined) => !!ev?.notes.some((n) => !['noTov', 'noTemp', 'noUllage'].includes(n.code));

/* ------------------------------------------------------------------ job */

export type StepState = 'todo' | 'part' | 'done';

export interface StageProgress {
  state: StepState;
  measured: number;
  total: number;
  missing: number;
}

export interface ShoreView {
  before: Record<Standard, StandardResult> | null;
  after: Record<Standard, StandardResult> | null;
  delivered: Record<Standard, Quantity>;
  complete: boolean;
  count: number;
}

export interface JobView {
  cargo: CargoView;
  defs: ShipTankDef[];
  initial: StageEval;
  final: StageEval;
  progress: { initial: StageProgress; final: StageProgress };
  /** Loaded (or discharged) per standard, from the ship's figures. */
  ship: Record<Standard, Quantity>;
  shipReady: boolean;
  shore: ShoreView;
  /** B/L (shore) figure on the job's mass basis, MT. */
  bl: number | null;
  compare: ReturnType<typeof shipShore>;
  steps: { cargo: StepState; initial: StepState; final: StepState; shore: StepState; report: StepState };
}

const evalStage = (defs: ShipTankDef[], sd: StageDraft, dens: Densities | null) =>
  evaluateStage(
    defs,
    Object.fromEntries(Object.entries(sd.readings).map(([k, r]) => [k, toReading(r)])),
    dens,
    num(sd.draftF),
    num(sd.draftA),
  );

function progress(ev: StageEval, total: number): StageProgress {
  const state: StepState = ev.measured === 0 && ev.missing === 0 ? 'todo' : ev.measured === total && ev.missing === 0 ? 'done' : 'part';
  return { state, measured: ev.measured, total, missing: ev.missing };
}

const shoreTank = (id: string, name: string, r: ShoreReading): Tank => {
  const tov = r.tov.trim() === '' ? 0 : parseNum(r.tov);
  const water = r.water.trim() === '' ? 0 : parseNum(r.water);
  const t = num(r.t);
  return { id, name, tov, water, t: tov === 0 && !Number.isFinite(t) ? 15 : t };
};

const ZERO: Quantity = { gsv: null, mtVac: null, mtAir: null };

export function deriveJob(job: Job, vessel: Vessel): JobView {
  const cargo = resolveCargo(job.cargo);
  const dens = cargo.dens;
  const defs = vessel.tanks.map(toDef);
  const initial = evalStage(defs, job.ship.initial, dens);
  const final = evalStage(defs, job.ship.final, dens);
  const shipReady = !!dens && final.measured > 0 && initial.missing === 0 && final.missing === 0;
  const ship = Object.fromEntries(
    STANDARDS.map((s) => [s.id, shipReady ? transferred(job.op, initial, final, s.id) : ZERO]),
  ) as Record<Standard, Quantity>;

  // Shore tanks: what the shore delivered (loading) or received (discharge).
  const before = dens && job.shore.length ? computeAll(dens, job.shore.map((t) => shoreTank(t.id, t.name, t.before))) : null;
  const after = dens && job.shore.length ? computeAll(dens, job.shore.map((t) => shoreTank(t.id, t.name, t.after))) : null;
  const complete = !!before && !!after && before.api2004.totals.complete && after.api2004.totals.complete;
  const delivered = Object.fromEntries(
    STANDARDS.map((s) => {
      if (!complete || !before || !after) return [s.id, ZERO];
      const a = before[s.id].totals;
      const b = after[s.id].totals;
      const d = (k: keyof Quantity) => {
        const x = a[k];
        const y = b[k];
        return x === null || y === null ? null : job.op === 'load' ? x - y : y - x;
      };
      return [s.id, { gsv: d('gsv'), mtVac: d('mtVac'), mtAir: d('mtAir') }];
    }),
  ) as Record<Standard, Quantity>;

  const massKey = job.mass === 'vac' ? 'mtVac' : 'mtAir';
  const manual = num(job.bl);
  const bl = job.blMode === 'manual' ? (Number.isFinite(manual) ? manual : null) : delivered[job.standard][massKey];
  const compare = shipShore(ship[job.standard][massKey], bl ?? NaN, num(job.vef));

  const total = defs.length;
  const pInit = progress(initial, total);
  const pFinal = progress(final, total);
  const shoreState: StepState =
    job.blMode === 'manual'
      ? bl !== null
        ? 'done'
        : 'todo'
      : job.shore.length === 0
        ? 'todo'
        : complete
          ? 'done'
          : 'part';

  return {
    cargo,
    defs,
    initial,
    final,
    progress: { initial: pInit, final: pFinal },
    ship,
    shipReady,
    shore: { before, after, delivered, complete, count: job.shore.length },
    bl,
    compare,
    steps: {
      cargo: dens ? 'done' : job.cargo.density.trim() === '' ? 'todo' : 'part',
      initial: pInit.state,
      final: pFinal.state,
      shore: shoreState,
      report: job.sentAt ? 'done' : 'todo',
    },
  };
}

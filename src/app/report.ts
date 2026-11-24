/** Turns a job into the input of the Excel ullage report. */
import type { ReportInput } from '../report/ullageReport';
import type { JobView } from './derive';
import { num, toReading } from './store';
import type { Job, StageDraft, Vessel } from './store';

const cond = (sd: StageDraft) => ({
  draftF: num(sd.draftF),
  draftA: num(sd.draftA),
  listDeg: num(sd.listDeg),
  listSide: sd.listSide,
});

const readings = (sd: StageDraft) => Object.fromEntries(Object.entries(sd.readings).map(([k, r]) => [k, toReading(r)]));

/** Null until the report has something to say: a density and at least one tank gauged at the final stage. */
export function reportInputOf(job: Job, vessel: Vessel, view: JobView): ReportInput | null {
  const dens = view.cargo.dens;
  if (!dens || view.final.measured === 0) return null;
  const r = job.report;
  return {
    meta: {
      date: job.date,
      location: r.location,
      port: r.port,
      berth: job.berth,
      grade: job.grade,
      sea: r.sea,
      terminalRep: r.terminalRep,
      chiefOfficer: r.chiefOfficer,
      surveyor: r.surveyor,
    },
    vessel: vessel.name,
    op: job.op,
    standard: job.standard,
    dens,
    defs: view.defs,
    readings: { initial: readings(job.ship.initial), final: readings(job.ship.final) },
    initial: view.initial,
    final: view.final,
    conditions: { initial: cond(job.ship.initial), final: cond(job.ship.final) },
    bl: view.bl ?? NaN,
    blMass: job.mass,
    vef: num(job.vef),
    generatedAt: new Date(),
  };
}

export const reportSubject = (inp: ReportInput) =>
  `Ullage report — ${inp.vessel}${inp.meta.grade ? ` — ${inp.meta.grade}` : ''} — ${inp.meta.date}`;

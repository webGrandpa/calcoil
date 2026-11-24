/**
 * Ullage report in the layout the terminal's loading masters already send (ULLAGE_54x.xls, sheet "base2"):
 * header with densities, drafts and voyage data, a tank table, quantities on board and loaded,
 * signatures. Extras over the old sheet: ORH, observed and corrected ullage, the trim/list corrections,
 * the standard used, all three standards side by side, B/L comparison and the notes raised per tank.
 */
import type { Densities, Standard } from '../core/calc';
import type { Op, ShipTankDef, StageEval, TankReading } from '../core/ship';
import { averageUllage, shipShore, tankCode, transferred } from '../core/ship';
import { LT_PER_MT } from '../core/units';
import { makeST, noteText } from '../ship/strings';
import { buildXlsx, colName } from './xlsx';
import type { Cell, SheetSpec, StyleKey } from './xlsx';

export interface ReportMeta {
  date: string;
  location: string;
  port: string;
  berth: string;
  grade: string;
  sea: string;
  terminalRep: string;
  chiefOfficer: string;
  surveyor: string;
}

export interface StageConditions {
  draftF: number;
  draftA: number;
  listDeg: number;
  listSide: 'P' | 'S';
}

export interface ReportInput {
  meta: ReportMeta;
  vessel: string;
  op: Op;
  standard: Standard;
  dens: Densities;
  defs: ShipTankDef[];
  readings: { initial: Record<string, TankReading>; final: Record<string, TankReading> };
  initial: StageEval;
  final: StageEval;
  conditions: { initial: StageConditions; final: StageConditions };
  bl: number;
  /** Basis the B/L figure is given on; the ship figure is compared on the same one. Default: air. */
  blMass?: 'air' | 'vac';
  vef: number;
  generatedAt: Date;
}

const STD_NAME: Record<Standard, string> = {
  api2004: 'API MPMS 11.1-2004 / GOST 3900-2022 (Table 54B equivalent)',
  astm1980: 'ASTM D1250-80 Tables 54A / 54B / 54D',
  gost85: 'GOST 3900-85 (density at 20 °C, γ table)',
};
const STD_SHORT: Record<Standard, string> = { api2004: 'API 2004', astm1980: 'ASTM 1980', gost85: 'GOST 3900-85' };
const STD_CMP: Record<Standard, string> = {
  api2004: 'API 2004 (= GOST 3900-2022)',
  astm1980: 'ASTM 1980 (Tables 54A/54B/54D)',
  gost85: 'GOST 3900-85 (γ table, ρ20)',
};

const fin = (x: number | null | undefined) => (x === null || x === undefined || !Number.isFinite(x) ? null : x);

export function reportFileName(vessel: string, date: string) {
  const clean = (s: string) =>
    s
      .trim()
      .replace(/[^\p{L}\p{N}]+/gu, '_')
      .replace(/^_+|_+$/g, '');
  return `ULLAGE_${clean(vessel) || 'VESSEL'}_${clean(date) || 'REPORT'}.xlsx`;
}

export function buildReportSheet(inp: ReportInput): SheetSpec {
  const { meta, op, standard: std, dens } = inp;
  const en = makeST('en');
  const load = op === 'load';
  const rows: (Cell | null)[][] = [];
  const merges: string[] = [];
  const heights: Record<number, number> = {};
  const put = (r: number, c: number, v: string | number | null, s: StyleKey = 'plain') => {
    while (rows.length <= r) rows.push([]);
    rows[r][c] = { v: typeof v === 'number' ? fin(v) : v, s };
  };
  const merge = (r1: number, c1: number, r2: number, c2: number) =>
    merges.push(`${colName(c1)}${r1 + 1}:${colName(c2)}${r2 + 1}`);
  const NCOL = 16;

  const rho15 = std === 'astm1980' ? dens.astm1980.rho15 : dens.api.rho15;
  const rho20 = std === 'gost85' ? (dens.gost85.rho20 ?? dens.api.rho20) : dens.api.rho20;
  const init = inp.initial.results?.[std];
  const final = inp.final.results?.[std];
  const obqName = load ? 'OBQ' : 'ROB';

  /* ---------------- title */
  put(0, 0, `ULLAGE REPORT — ${load ? 'LOADING' : 'DISCHARGE'}`, 'title');
  merge(0, 0, 0, 8);
  heights[0] = 24;
  put(0, 11, `${STD_SHORT[std]}`, 'sub');
  merge(0, 11, 0, 15);

  /* ---------------- header, left: densities and conditions */
  const L = [
    ['DENS VAC @ 15°C, kg/m³', rho15, 'v1'],
    ['DENS VAC @ 20°C, kg/m³', rho20, 'v1'],
    ['DENS AIR @ 15°C, kg/m³', rho15 - (rho15 < 996.6 ? 1.1 : 1.0), 'v1'],
    ['API @ 60°F', dens.api.apiGravity, 'v2'],
  ] as const;
  L.forEach(([k, v, s], i) => {
    put(2 + i, 0, k, 'label');
    merge(2 + i, 0, 2 + i, 2);
    put(2 + i, 3, v, s);
  });
  put(7, 0, '', 'head');
  put(7, 1, 'DRAFT FWD, m', 'head');
  put(7, 2, 'DRAFT AFT, m', 'head');
  put(7, 3, 'TRIM, m', 'head');
  put(7, 4, 'LIST', 'head');
  heights[7] = 26;
  (['initial', 'final'] as const).forEach((sid, i) => {
    const c = inp.conditions[sid];
    const trim = Number.isFinite(c.draftF) && Number.isFinite(c.draftA) ? c.draftA - c.draftF : NaN;
    put(
      8 + i,
      0,
      sid === 'initial' ? `Before ${load ? 'loading' : 'discharge'}` : `After ${load ? 'loading' : 'discharge'}`,
      'cell',
    );
    put(8 + i, 1, c.draftF, 'n2');
    put(8 + i, 2, c.draftA, 'n2');
    put(8 + i, 3, trim, 'n2');
    put(8 + i, 4, Number.isFinite(c.listDeg) && c.listDeg !== 0 ? `${c.listDeg}° ${c.listSide}` : 'NIL', 'cell');
  });

  /* ---------------- header, right: voyage data */
  const R: [string, string][] = [
    ['DATE', meta.date],
    ['LOCATION', meta.location],
    ['PORT', meta.port],
    ['BERTH №', meta.berth],
    ['VESSEL', inp.vessel],
    ['CARGO GRADE', meta.grade],
    ['STANDARD', STD_NAME[std]],
    ['SEA CONDITION', meta.sea],
  ];
  R.forEach(([k, v], i) => {
    put(2 + i, 8, k, 'bold');
    merge(2 + i, 8, 2 + i, 9);
    put(2 + i, 10, v, 'label');
    merge(2 + i, 10, 2 + i, 15);
  });

  /* ---------------- tank table */
  const H0 = 11;
  const head: [string, string][] = [
    ['Tank', 'No'],
    ['ORH', 'm'],
    ['Ullage obs.', 'm'],
    ['Trim corr.', 'mm'],
    ['List corr.', 'mm'],
    ['Ullage corr.', 'm'],
    ['T.O.V.', 'm³'],
    ['Water', 'm'],
    ['Water', 'm³'],
    ['G.O.V.', 'm³'],
    ['Temp', '°C'],
    ['V.C.F.', STD_SHORT[std]],
    ['G.S.V.', 'm³ @ 15°C'],
    [obqName, 'GOV m³'],
    [obqName, 'GSV m³'],
    [load ? 'GSV loaded' : 'GSV discharged', 'm³'],
  ];
  head.forEach(([a, b], c) => {
    put(H0, c, a, 'head');
    put(H0 + 1, c, b, 'head');
  });
  heights[H0 + 1] = 26;

  const sum = { tov: 0, fw: 0, gov: 0, gsv: 0, obqGov: 0, obqGsv: 0, net: 0, tGov: 0 };
  let r = H0 + 2;
  for (const d of inp.defs) {
    const ev = inp.final.tanks[d.id];
    const rd = inp.readings.final[d.id];
    const res = final?.tanks.find((x) => x.id === d.id);
    const evI = inp.initial.tanks[d.id];
    const resI = init?.tanks.find((x) => x.id === d.id);
    const obqGov = evI?.ready ? (evI.gov ?? 0) : 0;
    const obqGsv = resI?.gsv ?? 0;
    const gsv = ev?.ready ? (res?.gsv ?? null) : null;
    const net = gsv === null ? null : load ? gsv - obqGsv : obqGsv - gsv;
    put(r, 0, tankCode(d), 'cellBold');
    if (rd && !rd.empty) {
      put(r, 1, rd.orh, 'n3');
      put(r, 2, averageUllage(rd.ullages).value, 'n3');
      put(r, 3, rd.trimMm, 'n0');
      put(r, 4, rd.listMm, 'n0');
      put(r, 5, ev?.corrUllage ?? null, 'n3');
      put(r, 6, ev?.tov ?? null, 'n3');
      put(r, 7, rd.waterInnage, 'n3');
      put(r, 8, ev?.fw || null, 'n3');
      put(r, 9, ev?.gov ?? null, 'n3');
      put(r, 10, ev?.temp ?? null, 'n2');
      put(r, 11, res?.vcfUsed ?? null, 'n5');
      put(r, 12, gsv, 'n3');
    } else {
      put(r, 1, null, 'n3');
      put(r, 2, rd?.empty ? 'EMPTY' : null, 'cell');
      for (let c = 3; c <= 12; c++) put(r, c, rd?.empty && [6, 9, 12].includes(c) ? 0 : null, c === 11 ? 'n5' : 'n3');
    }
    put(r, 13, obqGov || null, 'n3');
    put(r, 14, obqGsv || null, 'n3');
    put(r, 15, net, 'n3');
    if (ev?.ready) {
      sum.tov += ev.tov ?? 0;
      sum.fw += ev.fw;
      sum.gov += ev.gov ?? 0;
      sum.gsv += gsv ?? 0;
      sum.net += net ?? 0;
      sum.tGov += (ev.gov ?? 0) * (ev.temp ?? 0);
    }
    sum.obqGov += obqGov;
    sum.obqGsv += obqGsv;
    r++;
  }
  put(r, 0, 'TOTAL', 'cellBold');
  for (let c = 1; c < NCOL; c++) put(r, c, null, 'b3');
  put(r, 6, sum.tov, 'b3');
  put(r, 8, sum.fw, 'b3');
  put(r, 9, sum.gov, 'b3');
  put(r, 12, sum.gsv, 'b3');
  put(r, 13, sum.obqGov, 'b3');
  put(r, 14, sum.obqGsv, 'b3');
  put(r, 15, sum.net, 'b3');
  const avgT = sum.gov > 0 ? sum.tGov / sum.gov : null;
  r += 2;

  /* ---------------- quantities */
  const q = transferred(op, inp.initial, inp.final, std);
  const qBblStd: Standard = std === 'gost85' ? 'api2004' : std;
  const bblI = inp.initial.results?.[qBblStd].totals.bbl60 ?? null;
  const bblF = inp.final.results?.[qBblStd].totals.bbl60 ?? null;
  const bbl = bblI !== null && bblF !== null ? (load ? bblF - bblI : bblI - bblF) : null;
  const gost = transferred(op, inp.initial, inp.final, 'gost85').mtVac;
  const vef = Number.isFinite(inp.vef) && inp.vef > 0 ? inp.vef : null;
  const wv = (x: number | null) => (x === null || vef === null ? null : x / vef);

  const Q0 = r;
  put(Q0, 0, `QUANTITIES ON BOARD — AFTER ${load ? 'LOADING' : 'DISCHARGE'}`, 'sub');
  merge(Q0, 0, Q0, 6);
  const left: [string, number | null, StyleKey][] = [
    ['T.O.V., m³', sum.tov, 't3'],
    ['Free water, m³', sum.fw, 't3'],
    ['G.O.V. @ observed temp., m³', sum.gov, 't3'],
    [`G.S.V. @ 15°C incl. ${obqName}, m³`, final?.totals.gsv ?? null, 't3'],
    [`${obqName} G.S.V. @ 15°C, m³`, init?.totals.gsv ?? null, 't3'],
    ['Average temperature, °C', avgT, 't2'],
  ];
  left.forEach(([k, v, s], i) => {
    put(Q0 + 1 + i, 0, k, 'label');
    merge(Q0 + 1 + i, 0, Q0 + 1 + i, 4);
    put(Q0 + 1 + i, 5, v, s);
    merge(Q0 + 1 + i, 5, Q0 + 1 + i, 6);
  });

  put(Q0, 8, `QUANTITY ${load ? 'LOADED' : 'DISCHARGED'}`, 'sub');
  merge(Q0, 8, Q0, 12);
  put(Q0, 13, 'Without VEF', 'head');
  merge(Q0, 13, Q0, 14);
  put(Q0, 15, 'With VEF', 'head');
  const right: [string, number | null, StyleKey][] = [
    ['Gross standard weight, MT in air @ 15°C', q.mtAir, 'n3'],
    ['Gross standard weight, MT in vacuum @ 15°C', q.mtVac, 'n3'],
    ['Long tons (in air)', q.mtAir === null ? null : q.mtAir * LT_PER_MT, 'n3'],
    ['Barrels @ 60°F', bbl, 'n1'],
    ['G.S.V. @ 15°C, m³', q.gsv, 'n3'],
    ['GOST 3900-85 weight, MT in vacuum (ρ20)', gost, 'n3'],
  ];
  right.forEach(([k, v, s], i) => {
    const rr = Q0 + 1 + i;
    put(rr, 8, k, 'label');
    merge(rr, 8, rr, 12);
    put(rr, 13, v, s);
    merge(rr, 13, rr, 14);
    put(rr, 15, wv(v), s);
  });
  const RQ = Q0 + 1 + right.length;
  put(RQ, 8, 'VEF', 'label');
  merge(RQ, 8, RQ, 12);
  put(RQ, 13, null, 'n4');
  merge(RQ, 13, RQ, 14);
  put(RQ, 15, vef, 'n4');
  const blVac = inp.blMass === 'vac';
  const ss = shipShore(blVac ? q.mtVac : q.mtAir, inp.bl, inp.vef);
  const blRows: [string, number | null, number | null, StyleKey][] = [
    [`B/L figure, MT in ${blVac ? 'vacuum' : 'air'}`, fin(inp.bl), fin(inp.bl), 'n3'],
    ['Ship − B/L, MT', ss.diff, ss.corrected !== null && Number.isFinite(inp.bl) ? ss.corrected - inp.bl : null, 'n3'],
    ['Ship / B/L', ss.ratio, ss.ratioVef, 'n5'],
  ];
  blRows.forEach(([k, a, b, s], i) => {
    const rr = RQ + 1 + i;
    put(rr, 8, k, 'label');
    merge(rr, 8, rr, 12);
    put(rr, 13, a, s);
    merge(rr, 13, rr, 14);
    put(rr, 15, b, s);
  });

  /* ---------------- standards side by side */
  let rS = Math.max(Q0 + 1 + left.length, RQ + 1 + blRows.length) + 1;
  put(rS, 0, `STANDARDS COMPARED — MT in air ${load ? 'loaded' : 'discharged'}`, 'sub');
  merge(rS, 0, rS, 6);
  const api = transferred(op, inp.initial, inp.final, 'api2004').mtAir;
  put(rS + 1, 5, 'MT in air', 'head');
  merge(rS + 1, 5, rS + 1, 6);
  put(rS + 1, 7, 'Δ vs API 2004', 'head');
  merge(rS + 1, 7, rS + 1, 8);
  (['api2004', 'astm1980', 'gost85'] as Standard[]).forEach((s, i) => {
    const rr = rS + 2 + i;
    const v = transferred(op, inp.initial, inp.final, s).mtAir;
    put(rr, 0, STD_CMP[s], s === std ? 'bold' : 'label');
    merge(rr, 0, rr, 4);
    put(rr, 5, v, s === std ? 'b3' : 'n3');
    merge(rr, 5, rr, 6);
    put(rr, 7, v !== null && api !== null && s !== 'api2004' ? v - api : null, 'n3');
    merge(rr, 7, rr, 8);
  });
  rS += 6;

  /* ---------------- notes */
  const notes: string[] = [];
  for (const [sid, ev] of [
    ['initial', inp.initial],
    ['final', inp.final],
  ] as const) {
    for (const d of inp.defs) {
      const t = ev.tanks[d.id];
      if (!t?.touched) continue;
      for (const n of t.notes) notes.push(`${sid === 'initial' ? obqName : 'Final'} ${tankCode(d)}: ${noteText(en, n)}`);
    }
  }
  if (inp.initial.measured === 0) notes.push(`${obqName} not gauged — taken as nil.`);
  put(rS, 0, 'REMARKS', 'sub');
  const remarks = notes.length ? notes : ['No remarks.'];
  remarks.forEach((n, i) => {
    put(rS + 1 + i, 0, n, 'note');
    merge(rS + 1 + i, 0, rS + 1 + i, 15);
  });
  rS += remarks.length + 2;

  /* ---------------- signatures */
  const signs: [string, string, number][] = [
    [meta.location ? `${meta.location.toUpperCase()} REPRESENTATIVE` : 'TERMINAL REPRESENTATIVE', meta.terminalRep, 0],
    [`${inp.vessel || 'VESSEL'} — CHIEF OFFICER`, meta.chiefOfficer, 6],
    ['SURVEYOR', meta.surveyor, 11],
  ];
  signs.forEach(([k, name, c]) => {
    put(rS, c, k, 'bold');
    merge(rS, c, rS, c + 4);
    put(rS + 2, c, name, 'sign');
    for (let i = 1; i <= 4; i++) put(rS + 2, c + i, null, 'sign');
    merge(rS + 2, c, rS + 2, c + 4);
  });
  heights[rS + 2] = 30;
  rS += 4;

  const ts = inp.generatedAt;
  const pad = (n: number) => String(n).padStart(2, '0');
  put(
    rS,
    0,
    `Calculated with CalcOil · ${STD_NAME[std]} · VCF rounded to 5 decimals (API MPMS 11.1 Add. 2) · ` +
      `MT in air = GSV × (ρ15 − 1.1 kg/m³) · 1 LT = 1016.0469 kg · 1 bbl = 0.158987 m³ · ` +
      `${ts.getFullYear()}-${pad(ts.getMonth() + 1)}-${pad(ts.getDate())} ${pad(ts.getHours())}:${pad(ts.getMinutes())}`,
    'note',
  );
  merge(rS, 0, rS, 15);

  return {
    name: 'Ullage report',
    cols: [13, 8, 9.5, 8, 8, 9.5, 11, 8, 9, 11, 7.5, 9, 11, 10, 10, 11],
    rows,
    merges,
    heights,
  };
}

export function buildReport(inp: ReportInput): Uint8Array {
  return buildXlsx([buildReportSheet(inp)]);
}

/** A few lines for the e-mail body. */
export function reportSummary(inp: ReportInput): string {
  const q = transferred(inp.op, inp.initial, inp.final, inp.standard);
  const n = (x: number | null, d = 3) => (x === null ? '—' : x.toFixed(d));
  const ss = shipShore(inp.blMass === 'vac' ? q.mtVac : q.mtAir, inp.bl, inp.vef);
  const verb = inp.op === 'load' ? 'loaded' : 'discharged';
  return [
    `Ullage report — ${inp.vessel}${inp.meta.grade ? `, ${inp.meta.grade}` : ''}, ${inp.meta.date}`,
    `${inp.meta.location}${inp.meta.berth ? `, berth ${inp.meta.berth}` : ''}`,
    '',
    `Quantity ${verb} (${STD_SHORT[inp.standard]}):`,
    `  MT in air @ 15°C: ${n(q.mtAir)}`,
    `  MT in vacuum @ 15°C: ${n(q.mtVac)}`,
    `  GSV @ 15°C, m³: ${n(q.gsv)}`,
    ss.ratio !== null ? `  Ship / B/L: ${n(ss.ratio, 5)} (B/L ${n(inp.bl)} MT in ${inp.blMass === 'vac' ? 'vacuum' : 'air'})` : '',
    '',
    'Full report attached (Excel).',
  ]
    .filter((x, i, a) => x !== '' || a[i - 1] !== '')
    .join('\n');
}

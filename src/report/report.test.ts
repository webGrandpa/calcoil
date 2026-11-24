import { describe, expect, it } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import { resolveDensity } from '../core/calc';
import { evaluateStage, generateTanks } from '../core/ship';
import type { TankReading } from '../core/ship';
import { buildReport, reportFileName, reportSummary } from './ullageReport';
import type { ReportInput } from './ullageReport';
import { colName } from './xlsx';

let i = 0;
const defs = generateTanks(2, false, true, [], () => `t${i++}`);
defs.forEach((d) => (d.rh = 18.25));
const rd = (tov: number, p: Partial<TankReading> = {}): TankReading => ({
  empty: false,
  orh: NaN,
  ullages: [2.345, 2.345],
  trimMm: 12,
  listMm: 0,
  tovMode: 'direct',
  tov,
  table: { u1: NaN, v1: NaN, u2: NaN, v2: NaN },
  waterInnage: NaN,
  fw: 0,
  temps: [25],
  ...p,
});
const dens = resolveDensity({ source: 'lab15', value: 840.6 }, 'product');
const ini = { [defs[4].id]: rd(12) };
const fin = { [defs[0].id]: rd(1000), [defs[1].id]: rd(1000), [defs[4].id]: rd(12), [defs[2].id]: { ...rd(0), empty: true } };
const inp: ReportInput = {
  meta: {
    date: '24.11.2026',
    location: 'BATUMI OIL TERMINAL',
    port: 'BATUMI, GEORGIA',
    berth: 'JETTY 2',
    grade: 'GASOIL',
    sea: 'CALM',
    terminalRep: 'G. K.',
    chiefOfficer: 'A. P.',
    surveyor: 'INTERTEK',
  },
  vessel: 'MT Test & <Co>',
  op: 'load',
  standard: 'api2004',
  dens,
  defs,
  readings: { initial: ini, final: fin },
  initial: evaluateStage(defs, ini, dens, 5, 6),
  final: evaluateStage(defs, fin, dens, 9, 9.5),
  conditions: {
    initial: { draftF: 5, draftA: 6, listDeg: 0, listSide: 'P' },
    final: { draftF: 9, draftA: 9.5, listDeg: 0, listSide: 'P' },
  },
  bl: 1675,
  vef: 1.001,
  generatedAt: new Date(2026, 10, 24, 9, 0),
};

describe('ullage report', () => {
  it('is a valid xlsx package with the report sheet', () => {
    const files = unzipSync(buildReport(inp));
    for (const p of ['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml', 'xl/styles.xml', 'xl/worksheets/sheet1.xml'])
      expect(files[p]).toBeTruthy();
    const sheet = strFromU8(files['xl/worksheets/sheet1.xml']);
    expect(sheet).toContain('ULLAGE REPORT — LOADING');
    expect(sheet).toContain('MT Test &amp; &lt;Co&gt;'); // escaped
    expect(sheet).toContain('>SLOP P<');
    expect(sheet).toContain('>EMPTY<');
    expect(sheet).toContain('<mergeCell ref="A1:I1"/>');
  });

  it('summary and file name', () => {
    expect(reportSummary(inp)).toContain('Quantity loaded (API 2004)');
    expect(reportFileName('MT Kolkheti', '24.11.2026')).toBe('ULLAGE_MT_Kolkheti_24_11_2026.xlsx');
  });

  it('column letters', () => {
    expect([0, 25, 26, 27, 701].map(colName)).toEqual(['A', 'Z', 'AA', 'AB', 'ZZ']);
  });
});

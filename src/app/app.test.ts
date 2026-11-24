import { describe, expect, it, vi } from 'vitest';
import { computeAll, resolveDensity } from '../core/calc';
import { buildReport } from '../report/ullageReport';
import { deriveJob, tankState } from './derive';
import { reportInputOf } from './report';
import { href, parent, parse } from './router';
import type { Route } from './router';
import { defaultSettings, emptyReading, migrate, newJob } from './store';
import type { Job, Vessel } from './store';

describe('router', () => {
  const routes: Route[] = [
    { name: 'jobs' },
    { name: 'job', id: 'a1' },
    { name: 'cargo', id: 'a1' },
    { name: 'stage', id: 'a1', stage: 'initial' },
    { name: 'stage', id: 'a1', stage: 'final' },
    { name: 'tank', id: 'a1', stage: 'final', tank: 't 9' },
    { name: 'shore', id: 'a1' },
    { name: 'report', id: 'a1' },
    { name: 'vessels' },
    { name: 'vessel', id: 'v1' },
    { name: 'calc' },
    { name: 'settings' },
  ];
  it('parses what it writes', () => {
    for (const r of routes) expect(parse(href(r))).toEqual(r);
  });
  it('falls back to the job list on anything unknown', () => {
    expect(parse('')).toEqual({ name: 'jobs' });
    expect(parse('#/nope/x')).toEqual({ name: 'jobs' });
  });
  it('walks up one level', () => {
    expect(parent({ name: 'tank', id: 'a', stage: 'final', tank: 't' })).toEqual({ name: 'stage', id: 'a', stage: 'final' });
    expect(parent({ name: 'stage', id: 'a', stage: 'final' })).toEqual({ name: 'job', id: 'a' });
    expect(parent({ name: 'vessel', id: 'v' })).toEqual({ name: 'vessels' });
  });
});

const vessel: Vessel = {
  id: 'v',
  name: 'TEST TANKER',
  imo: '',
  pairs: 1,
  centre: false,
  slops: false,
  tanks: [
    { id: 'p', row: 1, side: 'P', slop: false, rh: '12.000' },
    { id: 's', row: 1, side: 'S', slop: false, rh: '12.000' },
  ],
};

function loadedJob(): Job {
  const j = newJob('v', defaultSettings(), { op: 'load', mass: 'air', standard: 'api2004' });
  j.cargo = { ...j.cargo, source: 'lab15', density: '840.6' };
  const full = (tov: string) => ({ ...emptyReading(), ull: ['2.000', '2.002'], tovMode: 'direct' as const, tov, temps: ['20', '20.4'] });
  j.ship.initial.readings = { p: { ...emptyReading(), empty: true }, s: { ...emptyReading(), empty: true } };
  j.ship.final.readings = { p: full('1000'), s: full('1200') };
  return j;
}

describe('deriveJob', () => {
  it('gives the loaded quantity once both stages are complete', () => {
    const j = loadedJob();
    const v = deriveJob(j, vessel);
    expect(v.steps.cargo).toBe('done');
    expect(v.steps.initial).toBe('done');
    expect(v.steps.final).toBe('done');
    expect(v.shipReady).toBe(true);
    const dens = resolveDensity({ source: 'lab15', value: 840.6, hydroCal: 20, meniscus: 0 }, 'product');
    const ref = computeAll(dens, [
      { id: 'p', name: '1P', tov: 1000, water: 0, t: 20.2 },
      { id: 's', name: '1S', tov: 1200, water: 0, t: 20.2 },
    ]);
    expect(v.ship.api2004.mtAir).toBeCloseTo(ref.api2004.totals.mtAir as number, 6);
    expect(v.ship.api2004.gsv).toBeCloseTo(ref.api2004.totals.gsv as number, 6);
  });

  it('shows empty, started and untouched tanks apart', () => {
    const j = loadedJob();
    j.ship.final.readings.s = { ...emptyReading(), ull: ['2.000'] };
    const v = deriveJob(j, vessel);
    expect(tankState(v.initial.tanks.p)).toBe('empty');
    expect(tankState(v.final.tanks.p)).toBe('ready');
    expect(tankState(v.final.tanks.s)).toBe('part');
    expect(v.steps.final).toBe('part');
    expect(v.shipReady).toBe(false);
    j.ship.final.readings = {};
    expect(tankState(deriveJob(j, vessel).final.tanks.p)).toBe('todo');
  });

  it('compares with a B/L typed by hand on the job’s mass basis', () => {
    const j = { ...loadedJob(), blMode: 'manual' as const, bl: '1840' };
    const v = deriveJob(j, vessel);
    expect(v.bl).toBe(1840);
    expect(v.compare.ratio).toBeCloseTo((v.ship.api2004.mtAir as number) / 1840, 9);
    expect(v.steps.shore).toBe('done');
  });

  it('takes the B/L from shore tanks: before − after when loading', () => {
    const j = loadedJob();
    j.shore = [
      { id: 'r1', name: 'T-1', before: { tov: '5000', water: '0', t: '20' }, after: { tov: '2800', water: '0', t: '20' } },
    ];
    const v = deriveJob(j, vessel);
    expect(v.shore.complete).toBe(true);
    const dens = resolveDensity({ source: 'lab15', value: 840.6, hydroCal: 20, meniscus: 0 }, 'product');
    const one = (tov: number) => computeAll(dens, [{ id: 'x', name: 'x', tov, water: 0, t: 20 }]).api2004.totals.mtAir as number;
    expect(v.bl).toBeCloseTo(one(5000) - one(2800), 6);
  });

  it('builds the Excel report from a job', () => {
    const j = loadedJob();
    const v = deriveJob(j, vessel);
    const inp = reportInputOf(j, vessel, v);
    expect(inp).not.toBeNull();
    const bytes = buildReport(inp!);
    expect(bytes[0]).toBe(0x50); // PK — a zip container
    expect(bytes.length).toBeGreaterThan(3000);
  });
});

describe('migrate', () => {
  it('brings over the calculator and the old vessels', () => {
    const mem = new Map<string, string>();
    mem.set(
      'calcoil-v1',
      JSON.stringify({ lang: 'ru', theme: 'dark', standard: 'astm1980', density: '0.8450', tanks: [{ id: 'a', name: 'R5', tov: '10', water: '0', t: '12' }] }),
    );
    mem.set(
      'calcoil-ship-v1',
      JSON.stringify({
        vessels: [{ id: 'v', name: 'OLD', pairs: 1, centre: false, slops: false, tanks: vessel.tanks }],
        ops: { v: { op: 'discharge', initial: { draftF: '9', draftA: '10', listDeg: '', listSide: 'P', readings: {} }, bl: '1000', report: { grade: 'ULSD' } } },
      }),
    );
    vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: () => {} });
    const s = migrate();
    vi.unstubAllGlobals();
    expect(s.settings.lang).toBe('ru');
    expect(s.settings.theme).toBe('dark');
    expect(s.calc.cargo.density).toBe('0.8450');
    expect(s.calc.tanks[0].name).toBe('R5');
    expect(s.vessels).toHaveLength(1);
    expect(s.jobs).toHaveLength(1);
    expect(s.jobs[0].op).toBe('discharge');
    expect(s.jobs[0].blMode).toBe('manual');
    expect(s.jobs[0].grade).toBe('ULSD');
    expect(s.jobs[0].ship.initial.draftF).toBe('9');
  });
});

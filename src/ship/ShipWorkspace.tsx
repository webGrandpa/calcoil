import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { STANDARDS } from '../core/calc';
import type { Densities, Standard } from '../core/calc';
import { evaluateStage, shipShore, transferred } from '../core/ship';
import type { Op } from '../core/ship';
import { fmt, stdDesc, stdShort } from '../i18n';
import type { Lang, T } from '../i18n';
import { Field } from '../ui/Field';
import { ChevronIcon, PlusIcon } from '../ui/Icons';
import { Num } from '../ui/Num';
import { Ruler } from '../ui/Ruler';
import { Segmented } from '../ui/Segmented';
import { ChoiceList, Sheet } from '../ui/Sheet';
import { bad, emptyOp, emptyReading, loadShip, num, reportOf, saveShip, STICKY, toDef, toReading } from './model';
import type { ReportDraft } from './model';
import { buildReport, reportFileName, reportSummary } from '../report/ullageReport';
import type { ReportInput } from '../report/ullageReport';
import { downloadFile, emailReport } from '../report/share';
import type { OpDraft, ReadingDraft, ShipState, StageDraft, StageId, VesselDraft } from './model';
import { ShipPlan } from './ShipPlan';
import { makeST } from './strings';
import type { SKey } from './strings';
import { TankSheet } from './TankSheet';
import { VesselSheet } from './VesselSheet';

interface Props {
  densityCard: ReactNode;
  dens: Densities | null;
  standard: Standard;
  onStandard: (s: Standard) => void;
  mass: 'vac' | 'air';
  onMass: (m: 'vac' | 'air') => void;
  lang: Lang;
  t: T;
}

type Open = { kind: 'picker' } | { kind: 'vessel'; id: string | null } | { kind: 'tank'; id: string } | null;

export function ShipWorkspace({ densityCard, dens, standard, onStandard, mass, onMass, lang, t }: Props) {
  const st = makeST(lang);
  const [ship, setShip] = useState<ShipState>(loadShip);
  const [open, setOpen] = useState<Open>(null);
  const [lastTank, setLastTank] = useState<string | null>(null);
  const [sent, setSent] = useState<'' | 'rShared' | 'rMailto' | 'rCancelled'>('');

  useEffect(() => saveShip(ship), [ship]);

  const vessel = ship.vessels.find((v) => v.id === ship.vesselId) ?? null;
  const op: OpDraft = (vessel && ship.ops[vessel.id]) || emptyOp();
  const stage: StageDraft = op[op.stage];
  const massKey = mass === 'vac' ? 'mtVac' : 'mtAir';

  const setOp = (p: Partial<OpDraft>) => {
    if (!vessel) return;
    setShip((s) => ({
      ...s,
      ops: {
        ...s.ops,
        [vessel.id]: {
          ...((s.ops[vessel.id] as OpDraft | undefined) ?? emptyOp()),
          ...p,
        },
      },
    }));
  };
  const setStage = (id: StageId, p: Partial<StageDraft>) => setOp({ [id]: { ...op[id], ...p } } as Partial<OpDraft>);
  const setReading = (tankId: string, r: ReadingDraft | null) => {
    const readings = { ...stage.readings };
    if (r) readings[tankId] = r;
    else delete readings[tankId];
    setStage(op.stage, { readings });
  };

  const defs = useMemo(() => (vessel ? vessel.tanks.map(toDef) : []), [vessel]);
  const evalStage = (sd: StageDraft) =>
    evaluateStage(
      defs,
      Object.fromEntries(Object.entries(sd.readings).map(([k, r]) => [k, toReading(r)])),
      dens,
      num(sd.draftF),
      num(sd.draftA),
    );
  const initial = useMemo(() => evalStage(op.initial), [defs, op.initial, dens]);
  const final = useMemo(() => evalStage(op.final), [defs, op.final, dens]);
  const cur = op.stage === 'initial' ? initial : final;

  const q = transferred(op.op, initial, final, standard);
  const ready = final.measured > 0 && initial.missing === 0 && final.missing === 0;
  const headline = ready ? q[massKey] : null;
  const apiQ = transferred(op.op, initial, final, 'api2004');
  const ss = shipShore(headline, num(op.bl), num(op.vef));

  const stLabel = (id: StageId, o: Op) => st(`st${id === 'initial' ? 'Initial' : 'Final'}_${o}` as SKey);
  const trimText =
    cur.trim === null
      ? '—'
      : cur.trim > 0
        ? st('trimStern', { v: fmt(lang, cur.trim, 2) })
        : cur.trim < 0
          ? st('trimHead', { v: fmt(lang, -cur.trim, 2) })
          : st('evenKeel');

  const saveVessel = (v: VesselDraft) => {
    setShip((s) => {
      const exists = s.vessels.some((x) => x.id === v.id);
      return {
        ...s,
        vessels: exists ? s.vessels.map((x) => (x.id === v.id ? v : x)) : [...s.vessels, v],
        vesselId: v.id,
      };
    });
    setOpen(null);
  };
  const deleteVessel = (id: string) => {
    setShip((s) => {
      const ops = { ...s.ops };
      delete ops[id];
      const vessels = s.vessels.filter((x) => x.id !== id);
      return { vessels, ops, vesselId: vessels.at(0)?.id ?? null };
    });
    setOpen(null);
  };

  const tankId = open?.kind === 'tank' ? open.id : lastTank;
  const tankDef = vessel?.tanks.find((x) => x.id === tankId) ?? null;
  const tankRes = tankDef && cur.results ? (cur.results[standard].tanks.find((x) => x.id === tankDef.id) ?? null) : null;
  const f = (x: number | null | undefined, d: number) =>
    x === null || x === undefined || !Number.isFinite(x) ? '—' : fmt(lang, x, d);

  const report = reportOf(op, ship.defaults);
  const setReport = (k: keyof ReportDraft, v: string) => {
    if (!vessel) return;
    setSent('');
    setShip((s) => {
      const cur = (s.ops[vessel.id] as OpDraft | undefined) ?? emptyOp();
      return {
        ...s,
        ops: { ...s.ops, [vessel.id]: { ...cur, report: { ...cur.report, [k]: v } } },
        defaults: STICKY.includes(k) ? { ...s.defaults, [k]: v } : s.defaults,
      };
    });
  };
  const canReport = !!(vessel && dens && final.measured > 0);
  const reportInput = (): ReportInput | null => {
    if (!vessel || !dens) return null;
    const cond = (sd: StageDraft) => ({
      draftF: num(sd.draftF),
      draftA: num(sd.draftA),
      listDeg: num(sd.listDeg),
      listSide: sd.listSide,
    });
    const rds = (sd: StageDraft) => Object.fromEntries(Object.entries(sd.readings).map(([k, r]) => [k, toReading(r)]));
    return {
      meta: report,
      vessel: vessel.name,
      op: op.op,
      standard,
      dens,
      defs,
      readings: { initial: rds(op.initial), final: rds(op.final) },
      initial,
      final,
      conditions: { initial: cond(op.initial), final: cond(op.final) },
      bl: num(op.bl),
      vef: num(op.vef),
      generatedAt: new Date(),
    };
  };
  const doSend = async (how: 'mail' | 'file') => {
    const inp = reportInput();
    if (!inp) return;
    const bytes = buildReport(inp);
    const name = reportFileName(inp.vessel, inp.meta.date);
    if (how === 'file') {
      downloadFile(bytes, name);
      return;
    }
    const subject = `Ullage report — ${inp.vessel}${inp.meta.grade ? ` — ${inp.meta.grade}` : ''} — ${inp.meta.date}`;
    const res = await emailReport(bytes, name, subject, reportSummary(inp), report.emailTo);
    setSent(res === 'shared' ? 'rShared' : res === 'mailto' ? 'rMailto' : 'rCancelled');
  };
  const rf = (k: keyof ReportDraft, label: string, mode: 'text' | 'email' = 'text') => (
    <Field label={label} value={report[k]} onChange={(v) => setReport(k, v)} mode={mode} />
  );

  return (
    <>
      <main className="layout">
        <div className="col-input">
          {densityCard}

          <section className="card" aria-labelledby="h-vessel">
            <h2 id="h-vessel" className="card-title">
              {st('vesselTitle')}
            </h2>
            {ship.vessels.length === 0 ? (
              <>
                <p className="msg">{st('setupHint')}</p>
                <button type="button" className="btn-add" onClick={() => setOpen({ kind: 'vessel', id: null })}>
                  <PlusIcon />
                  <span>{st('vesselAdd')}</span>
                </button>
              </>
            ) : (
              <>
                <div className="rows">
                  <button type="button" className="row-btn" aria-haspopup="dialog" onClick={() => setOpen({ kind: 'picker' })}>
                    <span className="row-label">{st('vesselRow')}</span>
                    <span className="row-value">{vessel?.name ?? st('vesselNone')}</span>
                    <ChevronIcon />
                  </button>
                  {vessel && (
                    <button
                      type="button"
                      className="row-btn"
                      aria-haspopup="dialog"
                      onClick={() => setOpen({ kind: 'vessel', id: vessel.id })}
                    >
                      <span className="row-label">{st('vesselEdit')}</span>
                      <span className="row-value">{vessel.tanks.length}</span>
                      <ChevronIcon />
                    </button>
                  )}
                </div>
                {vessel && (
                  <>
                    <Segmented<Op>
                      label={st('opLabel')}
                      value={op.op}
                      onChange={(o) => setOp({ op: o })}
                      options={[
                        { value: 'load', label: st('opLoad') },
                        { value: 'discharge', label: st('opDischarge') },
                      ]}
                    />
                    <Segmented<StageId>
                      label={st('stageLabel')}
                      value={op.stage}
                      onChange={(sid) => setOp({ stage: sid })}
                      options={[
                        { value: 'initial', label: stLabel('initial', op.op) },
                        { value: 'final', label: stLabel('final', op.op) },
                      ]}
                    />
                    <div className="two-col">
                      <Field
                        label={st('draftF')}
                        value={stage.draftF}
                        onChange={(v) => setStage(op.stage, { draftF: v })}
                        unit={st('m')}
                        invalid={bad(stage.draftF)}
                      />
                      <Field
                        label={st('draftA')}
                        value={stage.draftA}
                        onChange={(v) => setStage(op.stage, { draftA: v })}
                        unit={st('m')}
                        invalid={bad(stage.draftA)}
                      />
                    </div>
                    <div className="two-col two-col--end">
                      <Field
                        label={st('listDeg')}
                        value={stage.listDeg}
                        onChange={(v) => setStage(op.stage, { listDeg: v })}
                        invalid={bad(stage.listDeg)}
                      />
                      <Segmented<'P' | 'S'>
                        label={st('listSide')}
                        hideLabel
                        value={stage.listSide}
                        onChange={(v) => setStage(op.stage, { listSide: v })}
                        options={[
                          { value: 'P', label: 'P' },
                          { value: 'S', label: 'S' },
                        ]}
                      />
                    </div>
                    <dl className="kv-list">
                      <div>
                        <dt>{st('trim')}</dt>
                        <dd>{trimText}</dd>
                      </div>
                    </dl>
                  </>
                )}
              </>
            )}
          </section>

          {vessel && (
            <section className="card" aria-labelledby="h-plan">
              <div className="card-head">
                <h2 id="h-plan" className="card-title">
                  {st('planTitle')} · {stLabel(op.stage, op.op).split(' · ')[0]}
                </h2>
                <span className="card-meta">{st('measured', { m: cur.measured, n: vessel.tanks.length })}</span>
              </div>
              <ShipPlan
                tanks={vessel.tanks}
                evals={cur.tanks}
                lang={lang}
                st={st}
                onOpen={(id) => {
                  if (!stage.readings[id]) setReading(id, emptyReading());
                  setLastTank(id);
                  setOpen({ kind: 'tank', id });
                }}
              />
            </section>
          )}
        </div>

        <div className="col-result">
          <section className="hero" id="result" aria-labelledby="h-ship-result">
            <div className="hero-head">
              <h2 id="h-ship-result">{st('resultTitle')}</h2>
              <Segmented<'vac' | 'air'>
                label={t('weightAria')}
                hideLabel
                size="sm"
                tone="hero"
                value={mass}
                onChange={onMass}
                options={[
                  { value: 'vac', label: t('vac') },
                  { value: 'air', label: t('air') },
                ]}
              />
            </div>
            <div className="readout" aria-live="polite">
              {headline !== null ? (
                <Num value={headline} digits={3} unit="MT" className="readout-num" />
              ) : (
                <p className="readout-empty">
                  {final.measured > 0 && initial.missing + final.missing > 0
                    ? st('incomplete', { n: initial.missing + final.missing })
                    : st('noResult')}
                </p>
              )}
              <p className="readout-cap">
                {st(`cap_${op.op}` as SKey)}, {t(mass === 'vac' ? 'mtVacCap' : 'mtAirCap')}. {stdDesc(t, standard)}
              </p>
            </div>
            <Segmented<Standard>
              label={t('standard')}
              hideLabel
              tone="hero"
              value={standard}
              onChange={onStandard}
              options={STANDARDS.map((x) => ({
                value: x.id,
                label: stdShort(t, x.id),
              }))}
            />
            {ready && (
              <Ruler
                caption={t('scaleCaption')}
                unit={t('t')}
                total={apiQ[massKey]}
                marks={STANDARDS.map((x) => {
                  const v = transferred(op.op, initial, final, x.id)[massKey];
                  const b = apiQ[massKey];
                  return {
                    id: x.id,
                    label: stdShort(t, x.id),
                    delta: v !== null && b !== null ? v - b : null,
                    selected: x.id === standard,
                  };
                })}
              />
            )}
          </section>

          {vessel && (
            <section className="card" aria-labelledby="h-stages">
              <h2 id="h-stages" className="card-title">
                {st('stagesTitle')}
              </h2>
              <table className="cmp">
                <thead>
                  <tr>
                    <th scope="col">{st('colStage')}</th>
                    <th scope="col">GSV, {st('m3')}</th>
                    <th scope="col">MT</th>
                  </tr>
                </thead>
                <tbody>
                  {(['initial', 'final'] as StageId[]).map((sid) => {
                    const ev = sid === 'initial' ? initial : final;
                    const tot = ev.results?.[standard].totals;
                    return (
                      <tr key={sid} className={op.stage === sid ? 'is-sel' : ''}>
                        <th scope="row">{stLabel(sid, op.op).split(' · ')[0]}</th>
                        <td>{f(tot?.gsv, 3)}</td>
                        <td>{f(tot?.[massKey], 3)}</td>
                      </tr>
                    );
                  })}
                  <tr className="cmp-total">
                    <th scope="row">{st(`rowTransfer_${op.op}` as SKey)}</th>
                    <td>{ready ? f(q.gsv, 3) : '—'}</td>
                    <td>{ready ? f(q[massKey], 3) : '—'}</td>
                  </tr>
                </tbody>
              </table>
              {(initial.missing > 0 || final.missing > 0 || initial.measured === 0) && (
                <ul className="notes">
                  {initial.missing + final.missing > 0 && <li>{st('incomplete', { n: initial.missing + final.missing })}</li>}
                  {initial.measured === 0 && final.measured > 0 && <li>{st('initialZero')}</li>}
                </ul>
              )}
            </section>
          )}

          {vessel && (
            <section className="card" aria-labelledby="h-shore">
              <h2 id="h-shore" className="card-title">
                {st('shoreTitle')}
              </h2>
              <div className="two-col">
                <Field label={st('blField')} value={op.bl} onChange={(bl) => setOp({ bl })} invalid={bad(op.bl)} />
                <Field label={st('vefField')} value={op.vef} onChange={(vef) => setOp({ vef })} invalid={bad(op.vef)} />
              </div>
              <dl className="kv-list">
                <div>
                  <dt>{st('ratio')}</dt>
                  <dd>{f(ss.ratio, 5)}</dd>
                </div>
                <div>
                  <dt>{st('diff')}</dt>
                  <dd>{ss.diff === null ? '—' : `${ss.diff > 0 ? '+' : ''}${f(ss.diff, 3)} ${t('t')}`}</dd>
                </div>
                <div>
                  <dt>{st('shipVef')}</dt>
                  <dd>{f(ss.corrected, 3)}</dd>
                </div>
                <div>
                  <dt>{st('ratioVef')}</dt>
                  <dd>{f(ss.ratioVef, 5)}</dd>
                </div>
              </dl>
              <p className="field-hint">{st('basisNote')}</p>
            </section>
          )}

          {vessel && (
            <section className="card" aria-labelledby="h-report">
              <h2 id="h-report" className="card-title">
                {st('reportTitle')}
              </h2>
              <p className="field-hint">{st('reportHint')}</p>
              <div className="two-col">
                {rf('date', st('rDate'))}
                {rf('grade', st('rGrade'))}
              </div>
              <Segmented<string>
                label={st('rBerth')}
                layout="grid2"
                value={report.berth}
                onChange={(v) => setReport('berth', v === report.berth ? '' : v)}
                options={['JETTY 1', 'JETTY 2', 'JETTY 3', 'CBM'].map((x) => ({ value: x, label: x }))}
              />
              <div className="two-col">
                {rf('sea', st('rSea'))}
                {rf('surveyor', st('rSurveyor'))}
                {rf('terminalRep', st('rRep'))}
                {rf('chiefOfficer', st('rChief'))}
              </div>
              {rf('location', st('rLocation'))}
              {rf('port', st('rPort'))}
              {rf('emailTo', st('rTo'), 'email')}
              <div className="report-actions">
                <button type="button" className="btn-primary" disabled={!canReport} onClick={() => void doSend('mail')}>
                  {st('rSend')}
                </button>
                <button
                  type="button"
                  className="btn-ghost btn-ghost--inline"
                  disabled={!canReport}
                  onClick={() => void doSend('file')}
                >
                  {st('rDownload')}
                </button>
              </div>
              {!canReport && <p className="msg">{st('rNeed')}</p>}
              {sent && (
                <p className="msg" role="status">
                  {st(sent)}
                </p>
              )}
            </section>
          )}
        </div>
      </main>

      <Sheet open={open?.kind === 'picker'} title={st('vesselsTitle')} closeLabel={t('close')} onClose={() => setOpen(null)}>
        {ship.vessels.length > 0 && (
          <ChoiceList<string>
            name="vessel"
            value={ship.vesselId ?? ''}
            onChange={(id) => {
              setShip((s) => ({ ...s, vesselId: id }));
              setOpen(null);
            }}
            options={ship.vessels.map((v) => ({
              value: v.id,
              label: v.name,
              desc: `${v.tanks.length}`,
            }))}
          />
        )}
        <button type="button" className="btn-add" onClick={() => setOpen({ kind: 'vessel', id: null })}>
          <PlusIcon />
          <span>{st('vesselNew')}</span>
        </button>
      </Sheet>

      <VesselSheet
        open={open?.kind === 'vessel'}
        vessel={open?.kind === 'vessel' && open.id ? (ship.vessels.find((v) => v.id === open.id) ?? null) : null}
        st={st}
        closeLabel={t('close')}
        onSave={saveVessel}
        onDelete={deleteVessel}
        onClose={() => setOpen(null)}
      />

      <TankSheet
        open={open?.kind === 'tank'}
        def={tankDef}
        reading={(tankDef && stage.readings[tankDef.id]) || emptyReading()}
        ev={tankDef ? (cur.tanks[tankDef.id] ?? null) : null}
        res={tankRes}
        massKey={massKey}
        lang={lang}
        st={st}
        closeLabel={t('close')}
        onChange={(r) => tankDef && setReading(tankDef.id, r)}
        onClear={() => tankDef && setReading(tankDef.id, emptyReading())}
        onClose={() => setOpen(null)}
      />
    </>
  );
}

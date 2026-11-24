import { useState } from 'react';
import { useApp, useJob } from '../app/context';
import { fx, stageName, stageSub, timeOf } from '../app/format';
import { goBack, navigate } from '../app/router';
import type { Route } from '../app/router';
import type { Job } from '../app/store';
import { STANDARDS } from '../core/calc';
import type { Standard } from '../core/calc';
import type { Op } from '../core/ship';
import { groupLabel, stdDesc, stdShort } from '../i18n';
import { AppBar, StepRow } from '../ui/AppBar';
import { Field } from '../ui/Field';
import { MoreIcon } from '../ui/Icons';
import { HullMini } from '../ui/HullMini';
import { Readout } from '../ui/Readout';
import { Segmented } from '../ui/Segmented';
import { Sheet } from '../ui/Sheet';
import { BERTHS } from './JobsScreen';

export function MissingScreen({ route }: { route: Route }) {
  const { at } = useApp();
  return (
    <>
      <AppBar title={at('missing')} onBack={() => goBack(route)} backLabel={at('back')} />
      <main className="screen-body">
        <p className="msg">{at('missingText')}</p>
      </main>
    </>
  );
}

export function JobScreen({ route, id }: { route: Route; id: string }) {
  const { at, st, t, lang } = useApp();
  const ctx = useJob(id);
  const [menu, setMenu] = useState(false);
  if (!ctx) return <MissingScreen route={route} />;
  const { job, vessel, view, setJob } = ctx;
  const massKey = job.mass === 'vac' ? 'mtVac' : 'mtAir';
  const fig = view.shipReady ? view.ship[job.standard][massKey] : null;
  const res = (s: 'initial' | 'final') => view[s].results?.[job.standard].totals;
  const dens = view.cargo.dens;
  const pr = view.progress;
  const cmp = view.compare;

  let waiting = at('waitCargo');
  if (dens) {
    if (pr.final.measured === 0) waiting = at('waitFinal', { stage: stageName(at, job.op, 'final') });
    else if (pr.initial.missing + pr.final.missing > 0) waiting = at('waitMissing', { n: pr.initial.missing + pr.final.missing });
  }
  const order = ['cargo', 'initial', 'final', 'shore', 'report'] as const;
  const nextStep = order.find((k) => view.steps[k] !== 'done');
  const shown: 'initial' | 'final' = pr.final.measured + pr.final.missing > 0 ? 'final' : 'initial';
  const untouched = (['initial', 'final'] as const).reduce((n, s) => n + (pr[s].total - pr[s].measured - pr[s].missing), 0);

  return (
    <>
      <AppBar
        title={vessel.name || at('unnamed')}
        sub={[st(job.op === 'load' ? 'opLoad' : 'opDischarge'), job.grade, job.date].filter(Boolean).join(' · ')}
        onBack={() => goBack(route)}
        backLabel={at('back')}
        actions={
          <button type="button" className="icon-btn" aria-label={at('details')} onClick={() => setMenu(true)}>
            <MoreIcon />
          </button>
        }
      />
      <main className="screen-body">
        <section className="hero hero--job" aria-labelledby="h-job-fig">
          <HullMini
            defs={view.defs}
            evals={view[shown].tanks}
            label={`${stageName(at, job.op, shown)}: ${at('gauged', { m: pr[shown].measured, n: pr[shown].total })}`}
          />
          <p className="hullmini-cap">
            <span>{stageName(at, job.op, shown)}</span>
            <span>{at('gauged', { m: pr[shown].measured, n: pr[shown].total })}</span>
          </p>
          <div className="hero-head">
            <h2 id="h-job-fig">{st(job.op === 'load' ? 'cap_load' : 'cap_discharge')}</h2>
            <Segmented<'vac' | 'air'>
              label={t('weightAria')}
              hideLabel
              size="sm"
              tone="hero"
              value={job.mass}
              onChange={(mass) => setJob((j) => ({ ...j, mass }))}
              options={[
                { value: 'vac', label: t('vac') },
                { value: 'air', label: t('air') },
              ]}
            />
          </div>
          <div className="readout" aria-live="polite">
            {fig !== null ? <Readout value={fig} digits={3} unit="MT" className="readout-num" /> : <p className="readout-empty">{waiting}</p>}
            <p className="readout-cap">
              {t(job.mass === 'vac' ? 'mtVacCap' : 'mtAirCap')}, {stdDesc(t, job.standard)}
            </p>
            {fig !== null && untouched > 0 && <p className="readout-warn">{at('notGauged', { n: untouched })}</p>}
          </div>
          {cmp.ratio !== null && (
            <dl className="hero-kv">
              <div>
                <dt>{st('ratio')}</dt>
                <dd>{fx(lang, cmp.ratio, 5)}</dd>
              </div>
              <div>
                <dt>{st('diff')}</dt>
                <dd>
                  {cmp.diff !== null && cmp.diff > 0 ? '+' : ''}
                  {fx(lang, cmp.diff, 3)} {t('t')}
                </dd>
              </div>
              {cmp.ratioVef !== null && (
                <div>
                  <dt>{at('ratioVefShort')}</dt>
                  <dd>{fx(lang, cmp.ratioVef, 5)}</dd>
                </div>
              )}
            </dl>
          )}
          <Segmented<Standard>
            label={t('standard')}
            hideLabel
            tone="hero"
            value={job.standard}
            onChange={(standard) => setJob((j) => ({ ...j, standard }))}
            options={STANDARDS.map((x) => ({ value: x.id, label: stdShort(t, x.id) }))}
          />
        </section>

        <div className="steps">
          <StepRow
            state={view.steps.cargo}
            next={nextStep === 'cargo'}
            title={at('stepCargo')}
            sub={dens ? `ρ15 ${fx(lang, dens.api.rho15 / 1000, 4)} · ${groupLabel(t, dens.api.group)}` : at('enterDensity')}
            onClick={() => navigate({ name: 'cargo', id })}
          />
          {(['initial', 'final'] as const).map((s) => (
            <StepRow
              key={s}
              state={view.steps[s]}
              next={nextStep === s}
              title={stageName(at, job.op, s)}
              sub={`${stageSub(at, job.op, s)} · ${at('gauged', { m: pr[s].measured, n: pr[s].total })}`}
              value={pr[s].measured > 0 ? `${fx(lang, res(s)?.gsv, 1)} ${st('m3')}` : undefined}
              onClick={() => navigate({ name: 'stage', id, stage: s })}
            />
          ))}
          <StepRow
            state={view.steps.shore}
            next={nextStep === 'shore'}
            title={at('stepShore')}
            sub={job.blMode === 'manual' ? at('blManual') : at('shoreTanksN', { n: view.shore.count })}
            value={view.bl !== null ? `${fx(lang, view.bl, 3)} MT` : undefined}
            onClick={() => navigate({ name: 'shore', id })}
          />
          <StepRow
            state={view.steps.report}
            next={nextStep === 'report'}
            title={at('stepReport')}
            sub={job.sentAt ? at('sentAt', { time: timeOf(job.sentAt) }) : at('notSent')}
            onClick={() => navigate({ name: 'report', id })}
          />
        </div>
      </main>
      <JobDetailsSheet open={menu} job={job} onClose={() => setMenu(false)} onChange={(p) => setJob((j) => ({ ...j, ...p }))} />
    </>
  );
}

function JobDetailsSheet({ open, job, onClose, onChange }: { open: boolean; job: Job; onClose: () => void; onChange: (p: Partial<Job>) => void }) {
  const { at, st, t, store, update } = useApp();
  const [confirm, setConfirm] = useState(false);
  const vessel = store.vessels.find((v) => v.id === job.vesselId);
  return (
    <Sheet
      open={open}
      title={at('details')}
      closeLabel={t('close')}
      onClose={() => {
        setConfirm(false);
        onClose();
      }}
    >
      <div className="rows">
        <button
          type="button"
          className="row-btn"
          onClick={() => {
            onClose();
            if (vessel) navigate({ name: 'vessel', id: vessel.id });
          }}
        >
          <span className="row-label">{st('vesselRow')}</span>
          <span className="row-value">{vessel?.name || at('unnamed')}</span>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 6 6 6-6 6" />
          </svg>
        </button>
      </div>
      <Segmented<Op>
        label={st('opLabel')}
        value={job.op}
        onChange={(op) => onChange({ op })}
        options={[
          { value: 'load', label: st('opLoad') },
          { value: 'discharge', label: st('opDischarge') },
        ]}
      />
      <div className="two-col">
        <Field mode="text" label={at('jobGrade')} value={job.grade} onChange={(grade) => onChange({ grade })} />
        <Field mode="text" label={at('jobDate')} value={job.date} onChange={(date) => onChange({ date })} />
      </div>
      <Segmented<string>
        label={at('jobBerth')}
        layout="grid2"
        value={job.berth}
        onChange={(v) => onChange({ berth: v === job.berth ? '' : v })}
        options={BERTHS.map((x) => ({ value: x, label: x }))}
      />
      <div className="sheet-actions">
        <button
          type="button"
          className={`btn-ghost ${confirm ? 'is-danger' : ''}`}
          onClick={() => {
            if (!confirm) return setConfirm(true);
            update((s) => ({ ...s, jobs: s.jobs.filter((j) => j.id !== job.id) }));
            onClose();
            navigate({ name: 'jobs' }, { replace: true });
          }}
        >
          {confirm ? st('deleteConfirm') : at('deleteJob')}
        </button>
        <button type="button" className="btn-primary" onClick={onClose}>
          {st('done')}
        </button>
      </div>
    </Sheet>
  );
}

import { useApp, useJob } from '../app/context';
import { tankState } from '../app/derive';
import { enterToNext, fx, stageName, stageSub } from '../app/format';
import { goBack, navigate } from '../app/router';
import type { Route } from '../app/router';
import { bad, emptyReading } from '../app/store';
import type { StageDraft, StageId } from '../app/store';
import { AppBar } from '../ui/AppBar';
import { Field } from '../ui/Field';
import { Readout } from '../ui/Readout';
import { Segmented } from '../ui/Segmented';
import { ShipPlan } from '../ui/ShipPlan';
import { MissingScreen } from './JobScreen';

export function StageScreen({ route, id, stage }: { route: Route; id: string; stage: StageId }) {
  const { at, st, lang } = useApp();
  const ctx = useJob(id);
  if (!ctx) return <MissingScreen route={route} />;
  const { job, vessel, view, setJob } = ctx;
  const sd = job.ship[stage];
  const ev = view[stage];
  const pr = view.progress[stage];
  const tot = ev.results?.[job.standard].totals;
  const massKey = job.mass === 'vac' ? 'mtVac' : 'mtAir';
  const set = (p: Partial<StageDraft>) => setJob((j) => ({ ...j, ship: { ...j.ship, [stage]: { ...j.ship[stage], ...p } } }));
  const govSum = view.defs.some((d) => ev.tanks[d.id]?.gov != null)
    ? view.defs.reduce((n, d) => n + (ev.tanks[d.id]?.gov ?? 0), 0)
    : null;
  const todo = view.defs.filter((d) => tankState(ev.tanks[d.id]) === 'todo');

  const markRestEmpty = () =>
    setJob((j) => {
      const cur = j.ship[stage];
      const readings = { ...cur.readings };
      for (const d of todo) readings[d.id] = { ...emptyReading(), empty: true };
      return { ...j, ship: { ...j.ship, [stage]: { ...cur, readings } } };
    });

  const trim = ev.trim;
  const trimText =
    trim === null ? '—' : Math.abs(trim) < 0.0005 ? st('evenKeel') : st(trim > 0 ? 'trimStern' : 'trimHead', { v: fx(lang, Math.abs(trim), 2) });

  return (
    <>
      <AppBar
        title={stageName(at, job.op, stage)}
        sub={`${vessel.name || at('unnamed')}, ${stageSub(at, job.op, stage).toLowerCase()}`}
        onBack={() => goBack(route)}
        backLabel={at('back')}
      />
      <main className="screen-body has-bottombar">
        <Segmented<StageId>
          label={st('stageLabel')}
          hideLabel
          value={stage}
          onChange={(s) => navigate({ name: 'stage', id, stage: s }, { replace: true })}
          options={[
            { value: 'initial', label: stageName(at, job.op, 'initial') },
            { value: 'final', label: stageName(at, job.op, 'final') },
          ]}
        />

        {!view.cargo.dens && (
          <button type="button" className="callout" onClick={() => navigate({ name: 'cargo', id })}>
            <span className="callout-title">{at('noDensityTitle')}</span>
            <span className="callout-text">{at('noDensityText')}</span>
          </button>
        )}

        <section className="card" aria-labelledby="h-draft" onKeyDown={enterToNext}>
          <h2 id="h-draft" className="card-title">
            {at('draftTitle')}
          </h2>
          <div className="two-col">
            <Field label={st('draftF')} value={sd.draftF} onChange={(draftF) => set({ draftF })} unit={st('m')} invalid={bad(sd.draftF)} />
            <Field label={st('draftA')} value={sd.draftA} onChange={(draftA) => set({ draftA })} unit={st('m')} invalid={bad(sd.draftA)} />
          </div>
          <p className="trim-line">
            <span>{st('trim')}</span>
            <strong>{trimText}</strong>
          </p>
          <div className="list-row">
            <Field label={st('listDeg')} value={sd.listDeg} onChange={(listDeg) => set({ listDeg })} invalid={bad(sd.listDeg)} />
            <Segmented<'P' | 'S'>
              label={st('listSide')}
              value={sd.listSide}
              onChange={(listSide) => set({ listSide })}
              options={[
                { value: 'P', label: st('colP') },
                { value: 'S', label: st('colS') },
              ]}
            />
          </div>
        </section>

        <section className="plan-wrap" aria-labelledby="h-plan">
          <div className="section-head">
            <h2 id="h-plan">{st('planTitle')}</h2>
            <span className="section-meta">{at('gauged', { m: pr.measured, n: pr.total })}</span>
          </div>
          {view.defs.length === 0 ? (
            <button type="button" className="callout" onClick={() => navigate({ name: 'vessel', id: vessel.id })}>
              <span className="callout-title">{at('noTanksTitle')}</span>
              <span className="callout-text">{at('noTanksText')}</span>
            </button>
          ) : (
            <ShipPlan defs={view.defs} evals={ev.tanks} lang={lang} st={st} onOpen={(tank) => navigate({ name: 'tank', id, stage, tank })} />
          )}
          {todo.length > 0 && view.defs.length > 0 && (
            <button type="button" className="btn-ghost btn-block" onClick={markRestEmpty}>
              {at('markRestEmpty', { n: todo.length })}
            </button>
          )}
          {pr.missing > 0 && <p className="msg msg--warn">{st('incomplete', { n: pr.missing })}</p>}
        </section>
      </main>

      <div className="bottombar" role="status" aria-live="polite">
        <dl className="bb-totals">
          <div>
            <dt>GOV</dt>
            <dd>{fx(lang, tot?.gov ?? govSum, 3)}</dd>
          </div>
          <div>
            <dt>GSV</dt>
            <dd>{fx(lang, tot?.gsv, 3)}</dd>
          </div>
          <div className="bb-main">
            <dt>{at(job.mass === 'vac' ? 'mtVacShort' : 'mtAirShort')}</dt>
            <dd>
              <Readout value={tot ? tot[massKey] : null} digits={3} />
            </dd>
          </div>
        </dl>
      </div>
    </>
  );
}

import { useState } from 'react';
import { useApp, useJob } from '../app/context';
import { enterToNext, fx } from '../app/format';
import { goBack } from '../app/router';
import type { Route } from '../app/router';
import { bad, emptyShore, newId } from '../app/store';
import type { ShoreReading, ShoreTankDraft } from '../app/store';
import { AppBar } from '../ui/AppBar';
import { Field } from '../ui/Field';
import { PlusIcon, TrashIcon } from '../ui/Icons';
import { Readout } from '../ui/Readout';
import { Segmented } from '../ui/Segmented';
import { MissingScreen } from './JobScreen';

type When = 'before' | 'after';

export function ShoreScreen({ route, id }: { route: Route; id: string }) {
  const { at, st, t, lang } = useApp();
  const ctx = useJob(id);
  const [when, setWhen] = useState<When>(() => {
    const j = ctx?.job;
    return j && j.shore.length > 0 && j.shore.every((x) => x.before.tov.trim() !== '') ? 'after' : 'before';
  });
  if (!ctx) return <MissingScreen route={route} />;
  const { job, vessel, view, setJob } = ctx;
  const massKey = job.mass === 'vac' ? 'mtVac' : 'mtAir';
  const basis = t(job.mass === 'vac' ? 'vac' : 'air').toLowerCase();
  const del = view.shore.delivered[job.standard];
  const cmp = view.compare;
  const shipFig = view.shipReady ? view.ship[job.standard][massKey] : null;

  const setTank = (tid: string, p: Partial<ShoreTankDraft>) =>
    setJob((j) => ({ ...j, shore: j.shore.map((x) => (x.id === tid ? { ...x, ...p } : x)) }));
  const setReading = (tid: string, p: Partial<ShoreReading>) =>
    setJob((j) => ({ ...j, shore: j.shore.map((x) => (x.id === tid ? { ...x, [when]: { ...x[when], ...p } } : x)) }));
  const addTank = () =>
    setJob((j) => ({
      ...j,
      shore: [...j.shore, { id: newId(), name: '', before: emptyShore(), after: { ...emptyShore(), t: j.shore.at(-1)?.after.t ?? '' } }],
    }));
  const delTank = (tid: string) => setJob((j) => ({ ...j, shore: j.shore.filter((x) => x.id !== tid) }));
  const resOf = (w: When, i: number) => (w === 'before' ? view.shore.before : view.shore.after)?.[job.standard].tanks[i] ?? null;

  return (
    <>
      <AppBar title={at('stepShore')} sub={vessel.name || at('unnamed')} onBack={() => goBack(route)} backLabel={at('back')} />
      <main className="screen-body" onKeyDown={enterToNext}>
        <Segmented<'shore' | 'manual'>
          label={at('blSource')}
          hideLabel
          value={job.blMode}
          onChange={(blMode) => setJob((j) => ({ ...j, blMode }))}
          options={[
            { value: 'shore', label: at('blFromShore') },
            { value: 'manual', label: at('blManual') },
          ]}
        />

        {job.blMode === 'manual' ? (
          <section className="card">
            <Field
              size="lg"
              label={at('blFieldBasis', { basis })}
              value={job.bl}
              onChange={(bl) => setJob((j) => ({ ...j, bl }))}
              unit="MT"
              invalid={bad(job.bl)}
              hint={at('blBasisHint')}
            />
          </section>
        ) : (
          <>
            <section className="card" aria-labelledby="h-shore">
              <div className="card-head">
                <h2 id="h-shore" className="card-title">
                  {at('shoreTanks')}
                </h2>
              </div>
              <Segmented<When>
                label={at('shoreWhen')}
                hideLabel
                value={when}
                onChange={setWhen}
                options={[
                  { value: 'before', label: at(job.op === 'load' ? 'shoreBeforeLoad' : 'shoreBeforeDisch') },
                  { value: 'after', label: at(job.op === 'load' ? 'shoreAfterLoad' : 'shoreAfterDisch') },
                ]}
              />
              {job.shore.length === 0 ? (
                <p className="msg">{at('shoreEmpty')}</p>
              ) : (
                <ol className="shore-list">
                  {job.shore.map((x, i) => {
                    const r = x[when];
                    const rb = resOf('before', i);
                    const ra = resOf('after', i);
                    const d =
                      rb?.ok && ra?.ok && rb[massKey] !== null && ra[massKey] !== null
                        ? job.op === 'load'
                          ? (rb[massKey] as number) - (ra[massKey] as number)
                          : (ra[massKey] as number) - (rb[massKey] as number)
                        : null;
                    return (
                      <li key={x.id} className="shore-tank">
                        <div className="shore-head">
                          <input
                            className="shore-name"
                            aria-label={at('shoreTankName')}
                            placeholder={at('shoreTankPh', { n: i + 1 })}
                            value={x.name}
                            autoCapitalize="characters"
                            onChange={(e) => setTank(x.id, { name: e.target.value })}
                          />
                          <span className="shore-delta">{d !== null ? `${fx(lang, d, 3)} MT` : ''}</span>
                          <button type="button" className="icon-btn icon-btn--sm" aria-label={`${t('remove')} ${x.name || i + 1}`} onClick={() => delTank(x.id)}>
                            <TrashIcon />
                          </button>
                        </div>
                        <div className="tank-fields">
                          <Field label={t('tov')} value={r.tov} onChange={(tov) => setReading(x.id, { tov })} invalid={bad(r.tov)} />
                          <Field label={t('water')} value={r.water} onChange={(water) => setReading(x.id, { water })} invalid={bad(r.water)} />
                          <Field label={t('tShort')} value={r.t} onChange={(tt) => setReading(x.id, { t: tt })} invalid={bad(r.t)} />
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
              <button type="button" className="btn-add" onClick={addTank}>
                <PlusIcon />
                <span>{at('shoreAdd')}</span>
              </button>
            </section>

            <section className="card" aria-labelledby="h-deliv">
              <h2 id="h-deliv" className="card-title">
                {at(job.op === 'load' ? 'shoreDelivered' : 'shoreReceived')}
              </h2>
              {view.shore.complete ? (
                <dl className="kv-list">
                  <div>
                    <dt>GSV</dt>
                    <dd>
                      {fx(lang, del.gsv, 3)} {st('m3')}
                    </dd>
                  </div>
                  <div>
                    <dt>{t('mtVac')}</dt>
                    <dd>{fx(lang, del.mtVac, 3)}</dd>
                  </div>
                  <div>
                    <dt>{t('mtAir')}</dt>
                    <dd>{fx(lang, del.mtAir, 3)}</dd>
                  </div>
                </dl>
              ) : (
                <p className="msg">{at('shoreNeed')}</p>
              )}
            </section>
          </>
        )}

        <section className="card" aria-labelledby="h-cmp">
          <h2 id="h-cmp" className="card-title">
            {st('shoreTitle')}
          </h2>
          <div className="vs">
            <div className="vs-col">
              <span className="vs-k">{at('shipFig')}</span>
              <Readout value={shipFig} digits={3} className="vs-v" />
            </div>
            <div className="vs-col">
              <span className="vs-k">B/L</span>
              <Readout value={view.bl} digits={3} className="vs-v" />
            </div>
          </div>
          <dl className="kv-list">
            <div>
              <dt>{st('ratio')}</dt>
              <dd>{fx(lang, cmp.ratio, 5)}</dd>
            </div>
            <div>
              <dt>{st('diff')}</dt>
              <dd>
                {cmp.diff !== null && cmp.diff > 0 ? '+' : ''}
                {fx(lang, cmp.diff, 3)} MT
              </dd>
            </div>
          </dl>
          <Field label={st('vefField')} value={job.vef} onChange={(vef) => setJob((j) => ({ ...j, vef }))} invalid={bad(job.vef)} hint={at('vefHint')} />
          {cmp.ratioVef !== null && (
            <dl className="kv-list">
              <div>
                <dt>{st('shipVef')}</dt>
                <dd>{fx(lang, cmp.corrected, 3)} MT</dd>
              </div>
              <div>
                <dt>{st('ratioVef')}</dt>
                <dd>{fx(lang, cmp.ratioVef, 5)}</dd>
              </div>
            </dl>
          )}
          <p className="field-hint">{at('basisLine', { basis })}</p>
        </section>
      </main>
    </>
  );
}

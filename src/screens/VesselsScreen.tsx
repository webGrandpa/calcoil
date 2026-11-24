import { useState } from 'react';
import { useApp } from '../app/context';
import { enterToNext } from '../app/format';
import { goBack, navigate } from '../app/router';
import type { Route } from '../app/router';
import { bad, num } from '../app/store';
import type { TankDefDraft, Vessel } from '../app/store';
import { generateTanks, tankCode } from '../core/ship';
import type { ShipTankDef } from '../core/ship';
import { AppBar } from '../ui/AppBar';
import { Field } from '../ui/Field';
import { PlusIcon } from '../ui/Icons';
import { Segmented } from '../ui/Segmented';
import { MissingScreen } from './JobScreen';
import { makeVessel, Stepper } from './JobsScreen';
import { newId } from '../app/store';

export function VesselsScreen() {
  const { store, update, at, st } = useApp();
  const vessels = [...store.vessels].sort((a, b) => a.name.localeCompare(b.name));

  const add = () => {
    const v = makeVessel('', 6, false, true);
    update((s) => ({ ...s, vessels: [...s.vessels, v] }));
    navigate({ name: 'vessel', id: v.id });
  };

  return (
    <>
      <AppBar large title={st('vesselsTitle')} sub={at('vesselsSub')} />
      <main className="screen-body">
        {vessels.length === 0 ? (
          <section className="card empty">
            <h2 className="card-title">{at('vesselsEmptyTitle')}</h2>
            <p className="msg">{st('setupHint')}</p>
            <button type="button" className="btn-primary" onClick={add}>
              {st('vesselAdd')}
            </button>
          </section>
        ) : (
          <ul className="vessel-list">
            {vessels.map((v) => {
              const rhOk = v.tanks.filter((x) => Number.isFinite(num(x.rh))).length;
              const jobs = store.jobs.filter((j) => j.vesselId === v.id).length;
              return (
                <li key={v.id}>
                  <button type="button" className="vessel-card" onClick={() => navigate({ name: 'vessel', id: v.id })}>
                    <span className="vessel-name">{v.name || at('unnamed')}</span>
                    <span className="vessel-meta">
                      {[v.imo && `IMO ${v.imo}`, at('tanksCount', { n: v.tanks.length }), at('jobsCount', { n: jobs })].filter(Boolean).join(', ')}
                    </span>
                    <span className={`vessel-rh ${rhOk === v.tanks.length ? 'is-ok' : ''}`}>
                      {rhOk === v.tanks.length ? at('rhAll') : at('rhSome', { m: rhOk, n: v.tanks.length })}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </main>
      {vessels.length > 0 && (
        <button type="button" className="fab" onClick={add}>
          <PlusIcon />
          <span>{st('vesselNew')}</span>
        </button>
      )}
    </>
  );
}

export function VesselScreen({ route, id }: { route: Route; id: string }) {
  const { store, update, at, st } = useApp();
  const [confirm, setConfirm] = useState(false);
  const v = store.vessels.find((x) => x.id === id);
  if (!v) return <MissingScreen route={route} />;
  const jobs = store.jobs.filter((j) => j.vesselId === id).length;

  const set = (fn: (x: Vessel) => Vessel) => update((s) => ({ ...s, vessels: s.vessels.map((x) => (x.id === id ? fn(x) : x)) }));
  const relayout = (p: Partial<Pick<Vessel, 'pairs' | 'centre' | 'slops'>>) =>
    set((x) => {
      const n = { ...x, ...p };
      const keep = x.tanks as unknown as ShipTankDef[];
      const tanks: TankDefDraft[] = generateTanks(n.pairs, n.centre, n.slops, keep, newId).map((d) => ({
        id: d.id,
        row: d.row,
        side: d.side,
        slop: d.slop,
        rh: typeof d.rh === 'string' ? d.rh : '',
      }));
      return { ...n, tanks };
    });
  const setRh = (tid: string, rh: string) => set((x) => ({ ...x, tanks: x.tanks.map((d) => (d.id === tid ? { ...d, rh } : d)) }));
  const rows = [...new Set(v.tanks.map((d) => d.row))].sort((a, b) => a - b);

  return (
    <>
      <AppBar title={v.name || at('unnamed')} sub={st('vesselEdit')} onBack={() => goBack(route)} backLabel={at('back')} />
      <main className="screen-body" onKeyDown={enterToNext}>
        <section className="card">
          <Field mode="text" label={st('vName')} value={v.name} onChange={(name) => set((x) => ({ ...x, name }))} />
          <Field label="IMO" value={v.imo} onChange={(imo) => set((x) => ({ ...x, imo }))} />
        </section>

        <section className="card" aria-labelledby="h-layout">
          <h2 id="h-layout" className="card-title">
            {at('layoutTitle')}
          </h2>
          <Stepper label={st('vPairs')} value={v.pairs} onChange={(pairs) => relayout({ pairs })} />
          <div className="two-col">
            <Segmented<'y' | 'n'>
              label={st('vCentre')}
              size="sm"
              value={v.centre ? 'y' : 'n'}
              onChange={(x) => relayout({ centre: x === 'y' })}
              options={[
                { value: 'n', label: st('no') },
                { value: 'y', label: st('yes') },
              ]}
            />
            <Segmented<'y' | 'n'>
              label={st('vSlops')}
              size="sm"
              value={v.slops ? 'y' : 'n'}
              onChange={(x) => relayout({ slops: x === 'y' })}
              options={[
                { value: 'n', label: st('no') },
                { value: 'y', label: st('yes') },
              ]}
            />
          </div>
          {jobs > 0 && <p className="field-hint">{at('layoutKeeps')}</p>}
        </section>

        <section className="card" aria-labelledby="h-rh">
          <h2 id="h-rh" className="card-title">
            {st('vRhTitle')}
          </h2>
          <p className="field-hint">{st('vRhHint')}</p>
          <div className={`rh-table ${v.centre ? 'rh-table--3' : ''}`}>
            {rows.map((r) =>
              v.tanks
                .filter((d) => d.row === r)
                .map((d) => (
                  <label key={d.id} className={`rh-cell rh-cell--${d.side} ${bad(d.rh) ? 'is-invalid' : ''}`}>
                    <span className="rh-code">{tankCode(d)}</span>
                    <input
                      inputMode="decimal"
                      autoComplete="off"
                      enterKeyHint="next"
                      value={d.rh}
                      placeholder="—"
                      aria-label={`${tankCode(d)} RH, ${st('m')}`}
                      onChange={(e) => setRh(d.id, e.target.value)}
                      onFocus={(e) => e.currentTarget.select()}
                    />
                  </label>
                )),
            )}
          </div>
        </section>

        <div className="screen-actions">
          {jobs > 0 ? (
            <p className="field-hint">{at('vesselInUse', { n: jobs })}</p>
          ) : (
            <button
              type="button"
              className={`btn-ghost btn-block ${confirm ? 'is-danger' : ''}`}
              onClick={() => {
                if (!confirm) return setConfirm(true);
                update((s) => ({ ...s, vessels: s.vessels.filter((x) => x.id !== id) }));
                navigate({ name: 'vessels' }, { replace: true });
              }}
            >
              {confirm ? st('deleteConfirm') : st('deleteVessel')}
            </button>
          )}
        </div>
      </main>
    </>
  );
}

import { useMemo, useState } from 'react';
import { useApp } from '../app/context';
import { deriveJob } from '../app/derive';
import type { StepState } from '../app/derive';
import { fx, stageName } from '../app/format';
import { navigate } from '../app/router';
import { generateTanks } from '../core/ship';
import type { Op } from '../core/ship';
import { newId, newJob, today } from '../app/store';
import type { Job, Vessel } from '../app/store';
import { AppBar } from '../ui/AppBar';
import { Field } from '../ui/Field';
import { PlusIcon } from '../ui/Icons';
import { Segmented } from '../ui/Segmented';
import { ChoiceList, Sheet } from '../ui/Sheet';

export const BERTHS = ['JETTY 1', 'JETTY 2', 'JETTY 3', 'CBM'];

export function makeVessel(name: string, pairs: number, centre: boolean, slops: boolean): Vessel {
  const tanks = generateTanks(pairs, centre, slops, [], newId).map((d) => ({ id: d.id, row: d.row, side: d.side, slop: d.slop, rh: '' }));
  return { id: newId(), name, imo: '', pairs, centre, slops, tanks };
}

export function JobsScreen() {
  const { store, at } = useApp();
  const [adding, setAdding] = useState(false);
  const jobs = useMemo(() => [...store.jobs].sort((a, b) => b.createdAt - a.createdAt), [store.jobs]);

  return (
    <>
      <AppBar large title={at('jobsTitle')} sub={at('jobsSub')} />
      <main className="screen-body">
        {jobs.length === 0 ? (
          <section className="card empty">
            <h2 className="card-title">{at('jobsEmptyTitle')}</h2>
            <p className="msg">{at('jobsEmpty')}</p>
            <button type="button" className="btn-primary" onClick={() => setAdding(true)}>
              {at('newJob')}
            </button>
          </section>
        ) : (
          <ul className="job-list">
            {jobs.map((j) => (
              <li key={j.id}>
                <JobCard job={j} vessel={store.vessels.find((v) => v.id === j.vesselId)} />
              </li>
            ))}
          </ul>
        )}
      </main>
      {jobs.length > 0 && (
        <button type="button" className="fab" onClick={() => setAdding(true)}>
          <PlusIcon />
          <span>{at('newJob')}</span>
        </button>
      )}
      <NewJobSheet open={adding} onClose={() => setAdding(false)} />
    </>
  );
}

function JobCard({ job, vessel }: { job: Job; vessel: Vessel | undefined }) {
  const { lang, at, st } = useApp();
  const view = useMemo(() => (vessel ? deriveJob(job, vessel) : null), [job, vessel]);
  const order: [keyof NonNullable<typeof view>['steps'], string][] = [
    ['cargo', at('stepCargo')],
    ['initial', stageName(at, job.op, 'initial')],
    ['final', stageName(at, job.op, 'final')],
    ['shore', at('stepShoreShort')],
    ['report', at('stepReport')],
  ];
  const next = view ? order.find(([k]) => view.steps[k] !== 'done') : undefined;
  const massKey = job.mass === 'vac' ? 'mtVac' : 'mtAir';
  const fig = view?.shipReady ? view.ship[job.standard][massKey] : null;

  return (
    <button type="button" className="job-card" onClick={() => navigate({ name: 'job', id: job.id })}>
      <span className="job-top">
        <span className="job-vessel">{vessel?.name || at('unnamed')}</span>
        <span className={`chip chip--${job.op}`}>{st(job.op === 'load' ? 'opLoad' : 'opDischarge')}</span>
      </span>
      <span className="job-meta">{[job.grade, job.berth, job.date].filter(Boolean).join(' · ') || '—'}</span>
      <span className="job-pipe" aria-hidden="true">
        {order.map(([k]) => (
          <span key={k} className={`pipe pipe--${view ? (view.steps[k] as StepState) : 'todo'}`} />
        ))}
      </span>
      <span className="job-bottom">
        <span className="job-next">{next ? at('next', { step: next[1] }) : at('allDone')}</span>
        {fig !== null && (
          <span className="job-fig">
            {fx(lang, fig, 3)} <small>MT</small>
          </span>
        )}
      </span>
    </button>
  );
}

function NewJobSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { store, update, at, st, t } = useApp();
  const [vesselId, setVesselId] = useState<string>('');
  const [op, setOp] = useState<Op>('load');
  const [grade, setGrade] = useState('');
  const [berth, setBerth] = useState('');
  const [date, setDate] = useState(today());
  const [vName, setVName] = useState('');
  const [pairs, setPairs] = useState(6);
  const [centre, setCentre] = useState(false);
  const [slops, setSlops] = useState(true);

  const hasVessels = store.vessels.length > 0;
  const chosen = vesselId || (hasVessels ? store.vessels[0].id : 'new');
  const isNew = chosen === 'new';
  const canCreate = !isNew || vName.trim() !== '';

  const create = () => {
    let vid = chosen;
    let vessel: Vessel | null = null;
    if (isNew) {
      vessel = makeVessel(vName.trim(), pairs, centre, slops);
      vid = vessel.id;
    }
    const job = newJob(vid, store.settings, { op, grade: grade.trim(), berth, date: date.trim() || today() });
    update((s) => ({ ...s, vessels: vessel ? [...s.vessels, vessel] : s.vessels, jobs: [...s.jobs, job] }));
    onClose();
    setVName('');
    setGrade('');
    navigate({ name: 'job', id: job.id });
  };

  return (
    <Sheet open={open} title={at('newJob')} closeLabel={t('close')} onClose={onClose}>
      <ChoiceList<string>
        name="vessel"
        legend={st('vesselRow')}
        value={chosen}
        onChange={setVesselId}
        options={[
          ...store.vessels.map((v) => ({ value: v.id, label: v.name || at('unnamed'), desc: at('tanksCount', { n: v.tanks.length }) })),
          { value: 'new', label: `+ ${st('vesselNew')}` },
        ]}
      />
      {isNew && (
        <div className="inset">
          <Field mode="text" label={st('vName')} value={vName} onChange={setVName} />
          <div className="two-col two-col--end">
            <Stepper label={st('vPairs')} value={pairs} onChange={setPairs} />
            <Segmented<'y' | 'n'>
              label={st('vCentre')}
              size="sm"
              value={centre ? 'y' : 'n'}
              onChange={(x) => setCentre(x === 'y')}
              options={[
                { value: 'n', label: st('no') },
                { value: 'y', label: st('yes') },
              ]}
            />
          </div>
          <Segmented<'y' | 'n'>
            label={st('vSlops')}
            size="sm"
            value={slops ? 'y' : 'n'}
            onChange={(x) => setSlops(x === 'y')}
            options={[
              { value: 'n', label: st('no') },
              { value: 'y', label: st('yes') },
            ]}
          />
          <p className="field-hint">{at('rhLater')}</p>
        </div>
      )}
      <Segmented<Op>
        label={st('opLabel')}
        value={op}
        onChange={setOp}
        options={[
          { value: 'load', label: st('opLoad') },
          { value: 'discharge', label: st('opDischarge') },
        ]}
      />
      <div className="two-col">
        <Field mode="text" label={at('jobGrade')} value={grade} onChange={setGrade} />
        <Field mode="text" label={at('jobDate')} value={date} onChange={setDate} />
      </div>
      <Segmented<string>
        label={at('jobBerth')}
        layout="grid2"
        value={berth}
        onChange={(v) => setBerth(v === berth ? '' : v)}
        options={BERTHS.map((x) => ({ value: x, label: x }))}
      />
      <div className="sheet-actions">
        <button type="button" className="btn-primary btn-block" disabled={!canCreate} onClick={create}>
          {at('create')}
        </button>
      </div>
    </Sheet>
  );
}

export function Stepper({ label, value, onChange, min = 1, max = 20 }: { label: string; value: number; onChange: (n: number) => void; min?: number; max?: number }) {
  return (
    <div className="stepper-field">
      <span className="field-label">{label}</span>
      <div className="stepper">
        <button type="button" className="stepper-btn" aria-label="−" onClick={() => onChange(Math.max(min, value - 1))}>
          −
        </button>
        <output className="stepper-val" aria-live="polite">
          {value}
        </output>
        <button type="button" className="stepper-btn" aria-label="+" onClick={() => onChange(Math.min(max, value + 1))}>
          +
        </button>
      </div>
    </div>
  );
}


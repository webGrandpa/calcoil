import { useApp, useJob } from '../app/context';
import { enterToNext, fx, stageName } from '../app/format';
import { goBack, navigate } from '../app/router';
import type { Route } from '../app/router';
import { bad, emptyReading, num } from '../app/store';
import type { ReadingDraft, StageId } from '../app/store';
import { tankCode } from '../core/ship';
import type { ShipNote, ShipNoteCode } from '../core/ship';
import { AppBar } from '../ui/AppBar';
import { Field } from '../ui/Field';
import { NextIcon, PlusIcon, PrevIcon } from '../ui/Icons';
import { Num } from '../ui/Num';
import { Readout } from '../ui/Readout';
import { Segmented } from '../ui/Segmented';
import { noteText } from '../ship/strings';
import type { SKey, ST } from '../ship/strings';
import { MissingScreen } from './JobScreen';

const sideKey = (s: string): SKey => (s === 'P' ? 'sideP' : s === 'S' ? 'sideS' : 'sideC');

function tempLabels(k: number, st: ST): string[] {
  if (k === 1) return [st('tMiddle')];
  if (k === 2) return [st('tUpper'), st('tLower')];
  if (k === 3) return [st('tUpper'), st('tMiddle'), st('tLower')];
  return Array.from({ length: k }, (_, i) => st('tLevel', { n: i + 1 }));
}

const ULL: ShipNoteCode[] = ['ullOne', 'ullTwoDiffer', 'ullSpread', 'ullFour'];
const TEMP: ShipNoteCode[] = ['tempsFew', 'tempsSpread'];
const TABLES: ShipNoteCode[] = ['ullOverRh', 'tovExtrapolated', 'fwOverTov'];
const TODO: ShipNoteCode[] = ['noUllage', 'noTov', 'noTemp'];

function Notes({ notes, codes, st }: { notes: ShipNote[]; codes: ShipNoteCode[]; st: ST }) {
  const list = notes.filter((n) => codes.includes(n.code));
  if (list.length === 0) return null;
  return (
    <ul className="notes">
      {list.map((n) => (
        <li key={n.code}>{noteText(st, n)}</li>
      ))}
    </ul>
  );
}

export function TankScreen({ route, id, stage, tank }: { route: Route; id: string; stage: StageId; tank: string }) {
  const { at, st, lang } = useApp();
  const ctx = useJob(id);
  const def = ctx?.view.defs.find((d) => d.id === tank);
  if (!ctx || !def) return <MissingScreen route={route} />;
  const { job, vessel, view, setJob } = ctx;
  const draft = vessel.tanks.find((d) => d.id === tank);
  const r: ReadingDraft = job.ship[stage].readings[tank] ?? emptyReading();
  const ev = view[stage].tanks[tank];
  const res = view[stage].results?.[job.standard].tanks.find((x) => x.id === tank) ?? null;
  const massKey = job.mass === 'vac' ? 'mtVac' : 'mtAir';

  const write = (next: ReadingDraft | null) =>
    setJob((j) => {
      const cur = j.ship[stage];
      const readings = { ...cur.readings };
      if (next) readings[tank] = next;
      else delete readings[tank];
      return { ...j, ship: { ...j.ship, [stage]: { ...cur, readings } } };
    });
  const set = (p: Partial<ReadingDraft>) => write({ ...r, ...p });

  const idx = view.defs.findIndex((d) => d.id === tank);
  const prev = idx > 0 ? view.defs[idx - 1] : null;
  const next = idx < view.defs.length - 1 ? view.defs[idx + 1] : null;
  const go = (tid: string) => navigate({ name: 'tank', id, stage, tank: tid }, { replace: true });

  const rh = num(draft?.rh);
  const nTemps = Math.max(ev?.tempsNeeded ?? 1, r.temps.length, 1);
  const tLabels = tempLabels(nTemps, st);
  const setTemp = (i: number, v: string) => {
    const temps = Array.from({ length: nTemps }, (_, j) => r.temps[j] ?? '');
    temps[i] = v;
    set({ temps });
  };
  const setUll = (i: number, v: string) => set({ ull: r.ull.map((x, j) => (j === i ? v : x)) });
  const ull = ev?.ullage;
  const nUll = r.ull.filter((x) => Number.isFinite(num(x))).length;
  const notes = ev?.notes ?? [];
  const todo = notes.filter((n) => TODO.includes(n.code));
  const side = def.slop ? `${st('slop')}, ${st(sideKey(def.side)).toLowerCase()}` : st(sideKey(def.side));

  return (
    <>
      <AppBar
        title={tankCode(def)}
        sub={`${side}, ${stageName(at, job.op, stage)}`}
        onBack={() => goBack(route)}
        backLabel={at('back')}
        actions={<span className={`side-flag side-flag--${def.side}`} aria-hidden="true" />}
      />
      <main className="screen-body has-bottombar" onKeyDown={enterToNext}>
        <Segmented<'l' | 'e'>
          label={st('contentAria')}
          hideLabel
          value={r.empty ? 'e' : 'l'}
          onChange={(x) => set({ empty: x === 'e' })}
          options={[
            { value: 'l', label: st('hasLiquid') },
            { value: 'e', label: at('emptyTank') },
          ]}
        />

        {r.empty ? (
          <p className="msg">{at('emptyText')}</p>
        ) : (
          <>
            <section className="card card--deck" aria-labelledby="h-deck">
              <h2 id="h-deck" className="card-title">
                {at('onDeck')}
              </h2>

              <div className="two-col two-col--end">
                <div className="kv">
                  <span className="kv-k">{st('rh')}</span>
                  <span className="kv-v">
                    {Number.isFinite(rh) ? `${fx(lang, rh, 3)} ${st('m')}` : <button type="button" className="link" onClick={() => navigate({ name: 'vessel', id: vessel.id })}>{at('rhSet')}</button>}
                  </span>
                </div>
                <Field label={st('orh')} value={r.orh} onChange={(orh) => set({ orh })} unit={st('m')} invalid={bad(r.orh)} />
              </div>
              {Number.isFinite(rh) && r.orh.trim() === '' && (
                <button type="button" className="chip-btn" onClick={() => set({ orh: draft?.rh ?? '' })}>
                  {at('orhSame')}
                </button>
              )}
              <Notes notes={notes} codes={['orhDiff']} st={st} />

              <h3 className="sub-title">{st('ullTitle')}</h3>
              <div className="ull-grid">
                {r.ull.map((u, i) => (
                  <Field key={i} label={`#${i + 1}`} value={u} onChange={(v) => setUll(i, v)} invalid={bad(u)} />
                ))}
                {r.ull.length < 5 && (
                  <button type="button" className="btn-add btn-add--tile" onClick={() => set({ ull: [...r.ull, ''] })}>
                    <PlusIcon />
                    <span>{st('addReading')}</span>
                  </button>
                )}
              </div>
              <p className="field-hint">{st('ullHint')}</p>
              {ull && ull.value !== null && (
                <p className={`reading-line ${ull.rule === 'ok' ? 'is-ok' : ''}`}>
                  <span>{st('ullResult')}</span>
                  <strong>
                    {fx(lang, ull.value, 3)} {st('m')}
                  </strong>
                  <small>{st('ullReadings', { n: nUll, mm: fx(lang, ull.spreadMm, 0) })}</small>
                </p>
              )}
              <Notes notes={notes} codes={ULL} st={st} />

              <h3 className="sub-title">{st('tempTitle')}</h3>
              <div className="temp-grid">
                {tLabels.map((lab, i) => (
                  <Field key={i} label={lab} value={r.temps[i] ?? ''} onChange={(v) => setTemp(i, v)} invalid={bad(r.temps[i])} />
                ))}
                {nTemps < 5 && (
                  <button
                    type="button"
                    className="btn-add btn-add--tile"
                    onClick={() => set({ temps: [...Array.from({ length: nTemps }, (_, j) => r.temps[j] ?? ''), ''] })}
                  >
                    <PlusIcon />
                    <span>{st('addLevel')}</span>
                  </button>
                )}
              </div>
              <p className="field-hint">
                {ev?.innage !== null && ev?.innage !== undefined ? st('tempHint', { d: fx(lang, ev.innage, 2), n: ev.tempsNeeded }) : st('tempHint0')}
              </p>
              {ev?.temp !== null && ev?.temp !== undefined && r.temps.filter((x) => x.trim() !== '').length > 1 && (
                <p className="reading-line">
                  <span>{st('tempAvg')}</span>
                  <strong>{fx(lang, ev.temp, 2)} °C</strong>
                </p>
              )}
              <Notes notes={notes} codes={TEMP} st={st} />

              <Field label={st('waterInnage')} value={r.water} onChange={(water) => set({ water })} unit={st('m')} invalid={bad(r.water)} />
              <Notes notes={notes} codes={['waterOverLiquid']} st={st} />
            </section>

            <section className="card card--tables" aria-labelledby="h-tables">
              <h2 id="h-tables" className="card-title">
                {at('fromTables')}
              </h2>
              <div className="two-col">
                <Field label={st('trimCorr')} value={r.trim} onChange={(trim) => set({ trim })} invalid={bad(r.trim)} />
                <Field label={st('listCorr')} value={r.list} onChange={(list) => set({ list })} invalid={bad(r.list)} />
              </div>
              <p className="field-hint">{st('corrHint')}</p>
              <dl className="kv-list">
                <div>
                  <dt>{st('corrUll')}</dt>
                  <dd>
                    {fx(lang, ev?.corrUllage, 3)} {st('m')}
                  </dd>
                </div>
                <div>
                  <dt>{st('innage')}</dt>
                  <dd>
                    {fx(lang, ev?.innage, 3)} {st('m')}
                  </dd>
                </div>
              </dl>

              <h3 className="sub-title">{st('tovTitle')}</h3>
              <Segmented<'table' | 'direct'>
                label={st('tovAria')}
                hideLabel
                size="sm"
                value={r.tovMode}
                onChange={(tovMode) => set({ tovMode })}
                options={[
                  { value: 'table', label: st('tovTable') },
                  { value: 'direct', label: st('tovDirect') },
                ]}
              />
              {r.tovMode === 'direct' ? (
                <Field label={st('tovField')} value={r.tov} onChange={(tov) => set({ tov })} invalid={bad(r.tov)} />
              ) : (
                <>
                  <div className="tab-lines">
                    <Field label={st('tabU1')} value={r.u1} onChange={(u1) => set({ u1 })} invalid={bad(r.u1)} />
                    <Field label={st('tabV1')} value={r.v1} onChange={(v1) => set({ v1 })} invalid={bad(r.v1)} />
                    <Field label={st('tabU2')} value={r.u2} onChange={(u2) => set({ u2 })} invalid={bad(r.u2)} />
                    <Field label={st('tabV2')} value={r.v2} onChange={(v2) => set({ v2 })} invalid={bad(r.v2)} />
                  </div>
                  <p className="field-hint">{st('tabHint')}</p>
                </>
              )}
              <Field label={st('fwVol')} value={r.fw} onChange={(fw) => set({ fw })} invalid={bad(r.fw)} />
              <Notes notes={notes} codes={TABLES} st={st} />
            </section>
          </>
        )}

        <section className="card card--result" aria-labelledby="h-tres">
          <h2 id="h-tres" className="sr-only">
            {at('tankResult')}
          </h2>
          <dl className="ts-result">
            <div>
              <dt>TOV</dt>
              <dd>
                <Num value={ev?.tov ?? null} digits={3} />
              </dd>
            </div>
            <div>
              <dt>GOV</dt>
              <dd>
                <Num value={ev?.gov ?? null} digits={3} />
              </dd>
            </div>
            <div>
              <dt>{st('vcf')}</dt>
              <dd>
                <Num value={res?.vcfUsed ?? null} digits={5} />
              </dd>
            </div>
            <div>
              <dt>GSV</dt>
              <dd>
                <Num value={res?.gsv ?? null} digits={3} />
              </dd>
            </div>
          </dl>
          {todo.length > 0 && !r.empty && (
            <p className="todo-line">
              {at('stillToEnter')} {todo.map((n) => noteText(st, n).replace(/\.$/, '')).join('; ').toLowerCase()}
            </p>
          )}
          {!view.cargo.dens && <p className="todo-line">{at('noDensityShort')}</p>}
          {(ev?.touched || r.empty) && (
            <button type="button" className="btn-ghost btn-ghost--inline is-danger" onClick={() => write(null)}>
              {st('clear')}
            </button>
          )}
        </section>
      </main>

      <nav className="bottombar bottombar--nav" aria-label={at('tankNav')}>
        <button type="button" className="bb-step" disabled={!prev} onClick={() => prev && go(prev.id)}>
          <PrevIcon />
          <span>{prev ? tankCode(prev) : ''}</span>
        </button>
        <div className="bb-live" role="status" aria-live="polite">
          <span className="bb-live-k">{at(job.mass === 'vac' ? 'mtVacShort' : 'mtAirShort')}</span>
          <Readout value={res ? res[massKey] : null} digits={3} />
        </div>
        {next ? (
          <button type="button" className="bb-step bb-step--next" onClick={() => go(next.id)}>
            <span>{tankCode(next)}</span>
            <NextIcon />
          </button>
        ) : (
          <button type="button" className="bb-step bb-step--next bb-step--done" onClick={() => goBack(route)}>
            <span>{st('done')}</span>
          </button>
        )}
      </nav>
    </>
  );
}

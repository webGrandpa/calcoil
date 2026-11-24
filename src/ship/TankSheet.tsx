import { tankCode } from '../core/ship';
import type { TankEval } from '../core/ship';
import type { TankResult } from '../core/calc';
import { fmt } from '../i18n';
import type { Lang } from '../i18n';
import { Field } from '../ui/Field';
import { PlusIcon } from '../ui/Icons';
import { Num } from '../ui/Num';
import { Segmented } from '../ui/Segmented';
import { Sheet } from '../ui/Sheet';
import { bad, num } from './model';
import type { ReadingDraft, TankDefDraft } from './model';
import { noteText } from './strings';
import type { SKey, ST } from './strings';

interface Props {
  open: boolean;
  def: TankDefDraft | null;
  reading: ReadingDraft;
  ev: TankEval | null;
  res: TankResult | null;
  massKey: 'mtVac' | 'mtAir';
  lang: Lang;
  st: ST;
  closeLabel: string;
  onChange: (r: ReadingDraft) => void;
  onClear: () => void;
  onClose: () => void;
}

const sideKey = (s: string): SKey => (s === 'P' ? 'sideP' : s === 'S' ? 'sideS' : 'sideC');

function tempLabels(k: number, st: ST): string[] {
  if (k === 1) return [st('tMiddle')];
  if (k === 2) return [st('tUpper'), st('tLower')];
  if (k === 3) return [st('tUpper'), st('tMiddle'), st('tLower')];
  return Array.from({ length: k }, (_, i) => st('tLevel', { n: i + 1 }));
}

export function TankSheet({ open, def, reading: r, ev, res, massKey, lang, st, closeLabel, onChange, onClear, onClose }: Props) {
  if (!def) return null;
  const set = (p: Partial<ReadingDraft>) => onChange({ ...r, ...p });
  const f = (x: number | null | undefined, d: number) =>
    x === null || x === undefined || !Number.isFinite(x) ? '—' : fmt(lang, x, d);
  const rh = num(def.rh);
  const nTemps = Math.max(ev?.tempsNeeded ?? 1, r.temps.length, 1);
  const tLabels = tempLabels(nTemps, st);
  const setTemp = (i: number, v: string) => {
    const temps = Array.from({ length: nTemps }, (_, j) => r.temps[j] ?? '');
    temps[i] = v;
    set({ temps });
  };
  const setUll = (i: number, v: string) => set({ ull: r.ull.map((x, j) => (j === i ? v : x)) });
  const title = `${tankCode(def)} · ${def.slop ? `${st('slop')} ${st(sideKey(def.side))}` : st(sideKey(def.side))}`;
  const ull = ev?.ullage;

  return (
    <Sheet open={open} title={title} closeLabel={closeLabel} onClose={onClose}>
      <Segmented<'l' | 'e'>
        label={st('contentAria')}
        hideLabel
        value={r.empty ? 'e' : 'l'}
        onChange={(x) => set({ empty: x === 'e' })}
        options={[
          { value: 'l', label: st('hasLiquid') },
          { value: 'e', label: st('isEmpty') },
        ]}
      />

      {!r.empty && (
        <>
          <section className="ts-sec">
            <div className="two-col two-col--end">
              <div className="kv">
                <span className="kv-k">{st('rh')}</span>
                <span className="kv-v">
                  {f(rh, 3)} {Number.isFinite(rh) ? st('m') : ''}
                </span>
              </div>
              <Field label={st('orh')} value={r.orh} onChange={(orh) => set({ orh })} unit={st('m')} invalid={bad(r.orh)} />
            </div>
          </section>

          <section className="ts-sec">
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
            <div className="two-col">
              <Field label={st('trimCorr')} value={r.trim} onChange={(trim) => set({ trim })} invalid={bad(r.trim)} />
              <Field label={st('listCorr')} value={r.list} onChange={(list) => set({ list })} invalid={bad(r.list)} />
            </div>
            <p className="field-hint">{st('corrHint')}</p>
            <dl className="kv-list">
              <div>
                <dt>{st('ullResult')}</dt>
                <dd>
                  {f(ull?.value, 3)}
                  {ull && ull.value !== null && (
                    <small>
                      {' '}
                      ·{' '}
                      {st('ullReadings', {
                        n: r.ull.filter((x) => Number.isFinite(num(x))).length,
                        mm: f(ull.spreadMm, 1),
                      })}
                    </small>
                  )}
                </dd>
              </div>
              <div>
                <dt>{st('corrUll')}</dt>
                <dd>{f(ev?.corrUllage, 3)}</dd>
              </div>
              <div>
                <dt>{st('innage')}</dt>
                <dd>{f(ev?.innage, 3)}</dd>
              </div>
            </dl>
          </section>

          <section className="ts-sec">
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
                <div className="two-col">
                  <Field label={st('tabU1')} value={r.u1} onChange={(u1) => set({ u1 })} invalid={bad(r.u1)} />
                  <Field label={st('tabV1')} value={r.v1} onChange={(v1) => set({ v1 })} invalid={bad(r.v1)} />
                  <Field label={st('tabU2')} value={r.u2} onChange={(u2) => set({ u2 })} invalid={bad(r.u2)} />
                  <Field label={st('tabV2')} value={r.v2} onChange={(v2) => set({ v2 })} invalid={bad(r.v2)} />
                </div>
                <p className="field-hint">{st('tabHint')}</p>
              </>
            )}
            <dl className="kv-list">
              <div>
                <dt>TOV</dt>
                <dd>
                  {f(ev?.tov, 3)} {st('m3')}
                </dd>
              </div>
            </dl>
          </section>

          <section className="ts-sec">
            <h3 className="sub-title">{st('waterTitle')}</h3>
            <div className="two-col">
              <Field label={st('waterInnage')} value={r.water} onChange={(water) => set({ water })} invalid={bad(r.water)} />
              <Field label={st('fwVol')} value={r.fw} onChange={(fw) => set({ fw })} invalid={bad(r.fw)} />
            </div>
          </section>

          <section className="ts-sec">
            <h3 className="sub-title">{st('tempTitle')}</h3>
            <div className="temp-grid">
              {tLabels.map((lab, i) => (
                <Field key={i} label={lab} value={r.temps[i] ?? ''} onChange={(v) => setTemp(i, v)} invalid={bad(r.temps[i])} />
              ))}
              <button
                type="button"
                className="btn-add btn-add--tile"
                onClick={() =>
                  set({
                    temps: [...Array.from({ length: nTemps }, (_, j) => r.temps[j] ?? ''), ''],
                  })
                }
              >
                <PlusIcon />
                <span>{st('addLevel')}</span>
              </button>
            </div>
            <p className="field-hint">
              {ev?.innage !== null && ev?.innage !== undefined
                ? st('tempHint', { d: f(ev.innage, 2), n: ev.tempsNeeded })
                : st('tempHint0')}
            </p>
            <dl className="kv-list">
              <div>
                <dt>{st('tempAvg')}</dt>
                <dd>{f(ev?.temp, 2)} °C</dd>
              </div>
            </dl>
          </section>
        </>
      )}

      <dl className="ts-result">
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
        <div>
          <dt>MT</dt>
          <dd>
            <Num value={res ? res[massKey] : null} digits={3} />
          </dd>
        </div>
      </dl>

      {ev && ev.notes.length > 0 && (
        <ul className="notes">
          {ev.notes.map((n) => (
            <li key={n.code}>{noteText(st, n)}</li>
          ))}
        </ul>
      )}

      <div className="sheet-actions">
        <button type="button" className="btn-ghost" onClick={onClear}>
          {st('clear')}
        </button>
        <button type="button" className="btn-primary" onClick={onClose}>
          {st('done')}
        </button>
      </div>
    </Sheet>
  );
}

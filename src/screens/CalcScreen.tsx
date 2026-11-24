import { useMemo } from 'react';
import { useApp } from '../app/context';
import { resolveCargo } from '../app/derive';
import { enterToNext } from '../app/format';
import { newId } from '../app/store';
import type { CalcDraft, CalcTankDraft, CargoDraft } from '../app/store';
import { computeAll, STANDARDS, tankWarnings } from '../core/calc';
import type { Standard, Tank } from '../core/calc';
import { parseNum } from '../core/parse';
import { fmt, stdDesc, stdShort } from '../i18n';
import { AppBar } from '../ui/AppBar';
import { Field } from '../ui/Field';
import { PlusIcon, TrashIcon } from '../ui/Icons';
import { Num } from '../ui/Num';
import { Readout } from '../ui/Readout';
import { Ruler } from '../ui/Ruler';
import { Segmented } from '../ui/Segmented';
import { densityNotes } from './CargoScreen';
import { DensityEditor } from './DensityEditor';

const numOr0 = (s: string) => (s.trim() === '' ? 0 : parseNum(s));
const g = (kg: number | null | undefined) => (kg === null || kg === undefined ? null : kg / 1000);

/** The quick calculator: one density, a few tanks, every standard side by side. */
export function CalcScreen() {
  const { store, update, t, at, lang } = useApp();
  const c = store.calc;
  const set = (p: Partial<CalcDraft>) => update((s) => ({ ...s, calc: { ...s.calc, ...p } }));
  const setCargo = (p: Partial<CargoDraft>) => update((s) => ({ ...s, calc: { ...s.calc, cargo: { ...s.calc.cargo, ...p } } }));
  const updTank = (tid: string, p: Partial<CalcTankDraft>) =>
    update((s) => ({ ...s, calc: { ...s.calc, tanks: s.calc.tanks.map((x) => (x.id === tid ? { ...x, ...p } : x)) } }));
  const addTank = () =>
    update((s) => ({
      ...s,
      calc: {
        ...s.calc,
        tanks: [...s.calc.tanks, { id: newId(), name: `${s.calc.tanks.length + 1}`, tov: '', water: '0', t: s.calc.tanks.at(-1)?.t ?? '15' }],
      },
    }));
  const delTank = (tid: string) =>
    update((s) => ({ ...s, calc: { ...s.calc, tanks: s.calc.tanks.length > 1 ? s.calc.tanks.filter((x) => x.id !== tid) : s.calc.tanks } }));

  const cargo = useMemo(() => resolveCargo(c.cargo), [c.cargo]);
  const dens = cargo.dens;
  const tanks: Tank[] = c.tanks.map((x) => ({ id: x.id, name: x.name, tov: numOr0(x.tov), water: numOr0(x.water), t: parseNum(x.t) }));
  const key = JSON.stringify(tanks);
  const all = useMemo(() => (dens ? computeAll(dens, tanks) : null), [dens, key]);
  const cur = all ? all[c.standard] : null;
  const ref = all ? all.api2004 : null;
  const massKey = c.mass === 'vac' ? 'mtVac' : 'mtAir';
  const headline = cur?.totals.complete ? cur.totals[massKey] : null;
  const rows = STANDARDS.map((x) => {
    const v = all ? all[x.id].totals[massKey] : null;
    const b = ref ? ref.totals[massKey] : null;
    return { id: x.id, v, d: v !== null && b !== null ? v - b : null, b };
  });
  const notes = [...densityNotes(dens?.warnings, c.standard), ...tankWarnings(c.standard, dens, tanks)];
  const signed = (d: number, digits: number) => (d > 0.0005 ? '+' : '') + fmt(lang, Math.abs(d) < 0.0005 ? 0 : d, digits);
  const bad = (x: number) => !Number.isFinite(x);
  const gost = c.standard === 'gost85';

  return (
    <>
      <AppBar large title={at('calcTitle')} sub={at('calcSub')} />
      <main className="screen-body" onKeyDown={enterToNext}>
        <section className="hero" aria-labelledby="h-result">
          <div className="hero-head">
            <h2 id="h-result">{t('result')}</h2>
            <Segmented<'vac' | 'air'>
              label={t('weightAria')}
              hideLabel
              size="sm"
              tone="hero"
              value={c.mass}
              onChange={(mass) => set({ mass })}
              options={[
                { value: 'vac', label: t('vac') },
                { value: 'air', label: t('air') },
              ]}
            />
          </div>
          <div className="readout" aria-live="polite">
            {headline !== null ? (
              <Readout value={headline} digits={3} unit="MT" className="readout-num" />
            ) : (
              <p className="readout-empty">{dens ? t('noResult') : t('densityErr')}</p>
            )}
            <p className="readout-cap">
              {t(c.mass === 'vac' ? 'mtVacCap' : 'mtAirCap')}, {stdDesc(t, c.standard)}
            </p>
          </div>
          <Segmented<Standard>
            label={t('standard')}
            hideLabel
            tone="hero"
            value={c.standard}
            onChange={(standard) => set({ standard })}
            options={STANDARDS.map((x) => ({ value: x.id, label: stdShort(t, x.id) }))}
          />
          {all && ref && (
            <Ruler
              caption={t('scaleCaption')}
              unit={t('t')}
              total={ref.totals[massKey]}
              marks={rows.map((x) => ({ id: x.id, label: stdShort(t, x.id), delta: x.d, selected: x.id === c.standard }))}
            />
          )}
        </section>

        <section className="card" aria-labelledby="h-density">
          <h2 id="h-density" className="card-title">
            {t('densityTitle')}
          </h2>
          <DensityEditor cargo={c.cargo} onChange={setCargo} view={cargo} standard={c.standard} notes={notes} />
        </section>

        <section className="card" aria-labelledby="h-tanks">
          <div className="card-head">
            <h2 id="h-tanks" className="card-title">
              {t('tanks')}
            </h2>
            <button type="button" className="btn-add" onClick={addTank}>
              <PlusIcon />
              <span>{t('addTankBtn')}</span>
            </button>
          </div>
          <ol className="tank-list">
            {c.tanks.map((tk, i) => {
              const r = cur?.tanks[i];
              return (
                <li key={tk.id} className="tank">
                  <div className="tank-head">
                    <input className="tank-name" aria-label={t('tank')} value={tk.name} onChange={(e) => updTank(tk.id, { name: e.target.value })} />
                    {c.tanks.length > 1 && (
                      <button type="button" className="icon-btn icon-btn--sm" aria-label={`${t('remove')} ${tk.name}`} onClick={() => delTank(tk.id)}>
                        <TrashIcon />
                      </button>
                    )}
                  </div>
                  <div className="tank-fields">
                    <Field label={t('tov')} value={tk.tov} onChange={(tov) => updTank(tk.id, { tov })} invalid={bad(numOr0(tk.tov))} />
                    <Field label={t('water')} value={tk.water} onChange={(water) => updTank(tk.id, { water })} invalid={bad(numOr0(tk.water))} />
                    <Field label={t('tShort')} value={tk.t} onChange={(v) => updTank(tk.id, { t: v })} invalid={bad(parseNum(tk.t))} />
                  </div>
                  {r &&
                    (r.ok ? (
                      <div className="tank-out">
                        <dl className="tank-aux">
                          {gost && (
                            <div>
                              <dt>{t('corr')}</dt>
                              <dd>
                                <Num value={g(r.corr)} digits={4} signed />
                              </dd>
                            </div>
                          )}
                          <div>
                            <dt>{gost ? 'ρt' : 'VCF'}</dt>
                            <dd>
                              {gost ? (
                                <Num value={g(r.rhoT)} digits={4} />
                              ) : (
                                <Num value={r.vcf} digits={4} note={t('usedInCalc', { v: r.vcfUsed === null ? '—' : fmt(lang, r.vcfUsed, 5) })} />
                              )}
                            </dd>
                          </div>
                          <div>
                            <dt>{gost ? 'V20' : 'GSV'}</dt>
                            <dd>
                              <Num value={r.gsv} digits={3} />
                            </dd>
                          </div>
                        </dl>
                        <p className="tank-mt">
                          <Num value={r[massKey]} digits={3} unit="MT" />
                        </p>
                      </div>
                    ) : (
                      <p className="msg msg--err">
                        {bad(tanks[i].tov) || bad(tanks[i].water) || bad(tanks[i].t) ? t('fillTank') : t('cannotCompute')}
                      </p>
                    ))}
                </li>
              );
            })}
          </ol>
        </section>

        {cur?.totals.complete && (
          <section className="card" aria-labelledby="h-compare">
            <h2 id="h-compare" className="card-title">
              {t('comparison')}
            </h2>
            <table className="cmp">
              <thead>
                <tr>
                  <th scope="col">{t('standard')}</th>
                  <th scope="col">MT</th>
                  <th scope="col">{t('deltaApi')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((x) => {
                  const tone = x.d === null || Math.abs(x.d) < 0.0005 ? '' : x.d > 0 ? 'is-up' : 'is-down';
                  return (
                    <tr key={x.id} className={x.id === c.standard ? 'is-sel' : ''}>
                      <th scope="row">{stdShort(t, x.id)}</th>
                      <td>{x.v === null ? '—' : fmt(lang, x.v, 3)}</td>
                      <td className={tone}>
                        {x.d === null ? (
                          '—'
                        ) : x.id === 'api2004' ? (
                          <span className="cmp-ref">{t('reference')}</span>
                        ) : (
                          <>
                            <span>
                              {signed(x.d, 3)} {t('t')}
                            </span>
                            <span className="cmp-pct">{signed(x.b ? (x.d / x.b) * 100 : 0, 3)}%</span>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <dl className="totals">
              <div>
                <dt>{t('gov')}</dt>
                <dd>
                  <Num value={cur.totals.gov} digits={3} />
                </dd>
              </div>
              <div>
                <dt>{t(gost ? 'v20Total' : 'gsv15')}</dt>
                <dd>
                  <Num value={cur.totals.gsv} digits={3} />
                </dd>
              </div>
              <div>
                <dt>{t('mtVac')}</dt>
                <dd>
                  <Num value={cur.totals.mtVac} digits={3} />
                </dd>
              </div>
              <div>
                <dt>{t('mtAir')}</dt>
                <dd>
                  <Num value={cur.totals.mtAir} digits={3} />
                </dd>
              </div>
              <div>
                <dt>{t('lt')}</dt>
                <dd>
                  <Num value={cur.totals.lt} digits={3} />
                </dd>
              </div>
              <div>
                <dt>{t('bbl')}</dt>
                <dd>
                  <Num value={cur.totals.bbl60 ?? ref?.totals.bbl60} digits={1} />
                </dd>
              </div>
            </dl>
          </section>
        )}

        <footer className="foot">
          <p>{t('foot1')}</p>
          <p>{t('foot2')}</p>
        </footer>
      </main>
    </>
  );
}

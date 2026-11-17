import { useEffect, useMemo, useState } from 'react';
import { computeAll, resolveDensity, STANDARDS } from './core/calc';
import type { DensitySource, Standard, Tank } from './core/calc';
import type { Commodity } from './core/api2004';
import { detectLang, fmt, groupLabel, LangCtx, LANGS, makeT, stdLabel, warningText } from './i18n';
import type { Key, Lang } from './i18n';
import { Num } from './ui/Num';

interface TankDraft {
  id: string;
  name: string;
  tov: string;
  water: string;
  t: string;
}

interface State {
  lang: Lang;
  standard: Standard;
  commodity: Commodity;
  source: DensitySource;
  density: string;
  densT: string;
  hydroCal: 15 | 20;
  meniscus: string;
  mass: 'vac' | 'air';
  tanks: TankDraft[];
}

const KEY = 'dashveba-v1';
let seq = 0;
const newId = () => `${Date.now().toString(36)}${(seq++).toString(36)}`;

const EXAMPLES: { label: Key; state: Partial<State> }[] = [
  {
    label: 'exStar',
    state: {
      commodity: 'product',
      source: 'lab15',
      density: '736.5',
      tanks: [{ id: newId(), name: 'Σ', tov: '6617.0', water: '0', t: '12.1' }],
    },
  },
  {
    label: 'exM100',
    state: {
      commodity: 'product',
      source: 'lab15',
      density: '969.3',
      tanks: [
        { id: newId(), name: '1P', tov: '5200', water: '0', t: '64.5' },
        { id: newId(), name: '1S', tov: '5200', water: '0', t: '64.5' },
      ],
    },
  },
  {
    label: 'exTengiz',
    state: {
      commodity: 'crude',
      source: 'lab15',
      density: '793.3',
      tanks: [{ id: newId(), name: '1P', tov: '3048.8', water: '0', t: '6.5' }],
    },
  },
];

const DEFAULT: State = {
  lang: detectLang(),
  standard: 'api2004',
  commodity: 'product',
  source: 'lab15',
  density: '840.6',
  densT: '20',
  hydroCal: 20,
  meniscus: '0',
  mass: 'vac',
  tanks: [{ id: newId(), name: '1P', tov: '5000', water: '0', t: '28.6' }],
};

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {
    /* storage unavailable */
  }
  return DEFAULT;
}

function num(s: string): number {
  const v = parseFloat(s.replace(',', '.').trim());
  return Number.isFinite(v) ? v : NaN;
}

/** Accepts kg/m³ or g/cm³ (values below 2 are treated as g/cm³). */
function densityKg(s: string): number {
  const v = num(s);
  return v > 0 && v < 2 ? v * 1000 : v;
}

const SOURCES: DensitySource[] = ['lab15', 'lab20', 'labT', 'hydro'];
const COMMODITIES: Commodity[] = ['product', 'crude', 'lube'];

const g = (kg: number | null | undefined) => (kg === null || kg === undefined ? null : kg / 1000);

export default function App() {
  const [s, setS] = useState<State>(load);
  const set = (p: Partial<State>) => setS((prev) => ({ ...prev, ...p }));

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* ignore */
    }
  }, [s]);

  const t = makeT(s.lang);
  useEffect(() => {
    document.documentElement.lang = s.lang;
    document.title = t('appName');
  }, [s.lang]);

  const densVal = densityKg(s.density);
  const needsT = s.source === 'labT' || s.source === 'hydro';
  const inputOk = densVal > 500 && densVal < 1200 && (!needsT || Number.isFinite(num(s.densT)));

  const tanks: Tank[] = s.tanks.map((t) => ({
    id: t.id,
    name: t.name,
    tov: num(t.tov) || 0,
    water: num(t.water) || 0,
    t: Number.isFinite(num(t.t)) ? num(t.t) : 15,
  }));

  const dens = useMemo(() => {
    if (!inputOk) return null;
    try {
      return resolveDensity(
        {
          source: s.source,
          value: densVal,
          tC: needsT ? num(s.densT) : undefined,
          hydroCal: s.hydroCal,
          meniscus: num(s.meniscus) || 0,
        },
        s.commodity,
      );
    } catch {
      return null;
    }
  }, [s.source, densVal, s.densT, s.hydroCal, s.meniscus, s.commodity, inputOk, needsT]);

  const all = useMemo(() => (dens ? computeAll(dens, tanks) : null), [dens, JSON.stringify(tanks)]);
  const cur = all ? all[s.standard] : null;
  const ref = all ? all.api2004 : null;
  const massKey = s.mass === 'vac' ? 'mtVac' : 'mtAir';

  const updTank = (id: string, p: Partial<TankDraft>) =>
    set({ tanks: s.tanks.map((t) => (t.id === id ? { ...t, ...p } : t)) });
  const addTank = () =>
    set({
      tanks: [
        ...s.tanks,
        { id: newId(), name: `${s.tanks.length + 1}`, tov: '', water: '0', t: s.tanks.at(-1)?.t ?? '15' },
      ],
    });
  const delTank = (id: string) => set({ tanks: s.tanks.length > 1 ? s.tanks.filter((t) => t.id !== id) : s.tanks });

  return (
    <LangCtx.Provider value={s.lang}>
    <div className="app">
      <header className="top">
        <div className="brand">
          <span className="logo" aria-hidden>
            ◆
          </span>
          <div>
            <h1>{t('appName')}</h1>
            <p>{t('appSub')}</p>
          </div>
          <div className="seg tiny lang" role="radiogroup" aria-label={t('language')}>
            {LANGS.map((l) => (
              <button
                key={l.id}
                type="button"
                lang={l.id}
                className={s.lang === l.id ? 'on' : ''}
                onClick={() => set({ lang: l.id })}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
        <label className="std">
          <span>{t('standard')}</span>
          <select value={s.standard} onChange={(e) => set({ standard: e.target.value as Standard })}>
            {STANDARDS.map((x) => (
              <option key={x.id} value={x.id}>
                {stdLabel(t, x.id)}
              </option>
            ))}
          </select>
        </label>
      </header>

      <main>
        <section className="card">
          <h2>{t('productDensity')}</h2>
          <div className="seg" role="radiogroup" aria-label={t('commodityAria')}>
            {COMMODITIES.map((c) => (
              <button
                key={c}
                type="button"
                className={s.commodity === c ? 'on' : ''}
                onClick={() => set({ commodity: c })}
              >
                {t(c)}
              </button>
            ))}
          </div>
          <div className="seg small" role="radiogroup" aria-label={t('sourceAria')}>
            {SOURCES.map((c) => (
              <button
                key={c}
                type="button"
                className={s.source === c ? 'on' : ''}
                onClick={() => set({ source: c })}
              >
                {t(c)}
              </button>
            ))}
          </div>
          <div className="grid2">
            <label className="field">
              <span>{t(s.source === 'hydro' ? 'hydroField' : 'densityField')}</span>
              <input inputMode="decimal" value={s.density} onChange={(e) => set({ density: e.target.value })} />
            </label>
            {needsT && (
              <label className="field">
                <span>{t('measT')}</span>
                <input inputMode="decimal" value={s.densT} onChange={(e) => set({ densT: e.target.value })} />
              </label>
            )}
            {s.source === 'hydro' && (
              <>
                <label className="field">
                  <span>{t('hydroCal')}</span>
                  <select
                    value={s.hydroCal}
                    onChange={(e) => set({ hydroCal: Number(e.target.value) as 15 | 20 })}
                  >
                    <option value={20}>{t('cal20')}</option>
                    <option value={15}>{t('cal15')}</option>
                  </select>
                </label>
                <label className="field">
                  <span>{t('meniscus')}</span>
                  <input inputMode="decimal" value={s.meniscus} onChange={(e) => set({ meniscus: e.target.value })} />
                </label>
              </>
            )}
          </div>

          {dens ? (
            <dl className="derived">
              <div>
                <dt>ρ15</dt>
                <dd>
                  <Num value={g(dens.api.rho15)} digits={4} unit={t('gcm3')} />
                </dd>
              </div>
              <div>
                <dt>ρ20</dt>
                <dd>
                  <Num value={g(s.standard === 'gost85' ? dens.gost85.rho20 : dens.api.rho20)} digits={4} unit={t('gcm3')} />
                </dd>
              </div>
              <div>
                <dt>API° 60°F</dt>
                <dd>
                  <Num value={dens.api.apiGravity} digits={2} />
                </dd>
              </div>
              <div>
                <dt>{t('group')}</dt>
                <dd className="txt">{groupLabel(t, dens.api.group)}</dd>
              </div>
              {s.standard === 'astm1980' && (
                <div>
                  <dt>ρ15 (1980)</dt>
                  <dd>
                    <Num value={g(dens.astm1980.rho15)} digits={4} unit={t('gcm3')} />
                  </dd>
                </div>
              )}
              {s.standard === 'gost85' && (
                <div>
                  <dt>{t('gammaPer')}</dt>
                  <dd>
                    <Num value={dens.gost85.gamma} digits={6} />
                  </dd>
                </div>
              )}
              {dens.api.hyc !== null && (
                <div>
                  <dt>{t('glass')}</dt>
                  <dd>
                    <Num value={dens.api.hyc} digits={6} />
                  </dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="err">{t('densityErr')}</p>
          )}
          {dens && dens.warnings.length > 0 && (
            <ul className="warn">
              {dens.warnings.map((w) => (
                <li key={w.code}>{warningText(t, w)}</li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <div className="row-head">
            <h2>{t('tanks')}</h2>
            <button type="button" className="ghost" onClick={addTank}>
              {t('addTank')}
            </button>
          </div>
          <div className="tanks">
            <div className="tank head" aria-hidden>
              <span>{t('tank')}</span>
              <span>{t('tov')}</span>
              <span>{t('water')}</span>
              <span>{t('temp')}</span>
              <span />
            </div>
            {s.tanks.map((tk, i) => {
              const r = cur?.tanks[i];
              return (
                <div key={tk.id} className="tank-wrap">
                  <div className="tank">
                    <input aria-label={t('tank')} value={tk.name} onChange={(e) => updTank(tk.id, { name: e.target.value })} />
                    <input
                      aria-label="TOV"
                      inputMode="decimal"
                      value={tk.tov}
                      onChange={(e) => updTank(tk.id, { tov: e.target.value })}
                    />
                    <input
                      aria-label={t('water')}
                      inputMode="decimal"
                      value={tk.water}
                      onChange={(e) => updTank(tk.id, { water: e.target.value })}
                    />
                    <input
                      aria-label={t('temp')}
                      inputMode="decimal"
                      value={tk.t}
                      onChange={(e) => updTank(tk.id, { t: e.target.value })}
                    />
                    <button type="button" className="x" aria-label={t('remove')} onClick={() => delTank(tk.id)}>
                      ×
                    </button>
                  </div>
                  {r && (
                    <div className="tank-out">
                      {r.ok ? (
                        <>
                          <span>
                            GOV <Num value={r.gov} digits={3} />
                          </span>
                          <span>
                            {s.standard === 'gost85' ? 'ρt' : 'VCF'}{' '}
                            {s.standard === 'gost85' ? (
                              <Num value={g(r.rhoT)} digits={4} />
                            ) : (
                              <Num value={r.vcf} digits={4} note={t('usedInCalc', { v: r.vcfUsed === null ? '—' : fmt(s.lang, r.vcfUsed, 5) })} />
                            )}
                          </span>
                          <span>
                            {s.standard === 'gost85' ? 'V20' : 'GSV'} <Num value={r.gsv} digits={3} />
                          </span>
                          <span>
                            MT <Num value={r[massKey]} digits={3} />
                          </span>
                        </>
                      ) : (
                        <span className="err">{t('cannotCompute')}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="card result">
          <div className="row-head">
            <h2>
              {t('result')} · {STANDARDS.find((x) => x.id === s.standard)?.short}
            </h2>
            <div className="seg tiny" role="radiogroup" aria-label={t('weightAria')}>
              <button type="button" className={s.mass === 'vac' ? 'on' : ''} onClick={() => set({ mass: 'vac' })}>
                {t('vac')}
              </button>
              <button type="button" className={s.mass === 'air' ? 'on' : ''} onClick={() => set({ mass: 'air' })}>
                {t('air')}
              </button>
            </div>
          </div>
          {cur && cur.totals.complete ? (
            <>
              <div className="big">
                <Num value={cur.totals[massKey]} digits={3} unit="MT" />
                <span className="cap">{t(s.mass === 'vac' ? 'mtVacCap' : 'mtAirCap')}</span>
              </div>
              <dl className="totals">
                <div>
                  <dt>{t('gov')}</dt>
                  <dd>
                    <Num value={cur.totals.gov} digits={3} />
                  </dd>
                </div>
                <div>
                  <dt>{t('gsv15')}</dt>
                  <dd>
                    <Num value={cur.totals.gsv ?? ref?.totals.gsv} digits={3} />
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
            </>
          ) : (
            <p className="err">{t('noResult')}</p>
          )}
        </section>

        {all && ref && (
          <section className="card">
            <h2>
              {t('comparison')} ({t(s.mass)})
            </h2>
            <table className="cmp">
              <thead>
                <tr>
                  <th>{t('standard')}</th>
                  <th>MT</th>
                  <th>{t('deltaApi')}</th>
                </tr>
              </thead>
              <tbody>
                {STANDARDS.map((x) => {
                  const v = all[x.id].totals[massKey];
                  const b = ref.totals[massKey];
                  const d = v !== null && b !== null ? v - b : null;
                  return (
                    <tr key={x.id} className={x.id === s.standard ? 'sel' : ''} onClick={() => set({ standard: x.id })}>
                      <td>{x.short}</td>
                      <td>
                        <Num value={v} digits={3} />
                      </td>
                      <td className={d !== null && Math.abs(d) > 0.0005 ? (d > 0 ? 'pos' : 'neg') : ''}>
                        {d === null ? (
                          '—'
                        ) : (
                          <>
                            {d > 0 ? '+' : ''}
                            {fmt(s.lang, d, 3)} {t('t')}{' '}
                            <small>
                              ({d > 0 ? '+' : ''}
                              {b ? fmt(s.lang, (d / b) * 100, 3) : '0'}%)
                            </small>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        )}

        <section className="card examples">
          <h2>{t('examples')}</h2>
          <div className="chips">
            {EXAMPLES.map((e) => (
              <button
                key={e.label}
                type="button"
                className="ghost"
                onClick={() => set({ ...e.state, tanks: (e.state.tanks ?? []).map((t) => ({ ...t, id: newId() })) })}
              >
                {t(e.label)}
              </button>
            ))}
          </div>
        </section>

        <footer className="foot">
          <p>{t('foot1')}</p>
          <p>{t('foot2')}</p>
        </footer>
      </main>
    </div>
    </LangCtx.Provider>
  );
}

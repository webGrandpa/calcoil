import { useEffect, useMemo, useRef, useState } from 'react';
import { computeAll, resolveDensity, STANDARDS } from './core/calc';
import type { DensitySource, Standard, Tank } from './core/calc';
import type { Commodity } from './core/api2004';
import { detectLang, fmt, groupLabel, LangCtx, makeT, stdDesc, stdShort, warningText } from './i18n';
import type { Key, Lang } from './i18n';
import { applyTheme } from './theme';
import type { ThemePref } from './theme';
import { Field } from './ui/Field';
import { ChevronIcon, GearIcon, HydrometerMark, PlusIcon, TrashIcon } from './ui/Icons';
import { Num } from './ui/Num';
import { Ruler } from './ui/Ruler';
import { Segmented } from './ui/Segmented';
import { SettingsDialog } from './ui/SettingsDialog';
import { ChoiceList, Sheet } from './ui/Sheet';

interface TankDraft {
  id: string;
  name: string;
  tov: string;
  water: string;
  t: string;
}

interface State {
  lang: Lang;
  theme: ThemePref;
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

type Picker = 'commodity' | 'source' | 'cal' | null;

const KEY = 'calcoil-v1';
const OLD_KEY = 'dashveba-v1';
let seq = 0;
const newId = () => `${Date.now().toString(36)}${(seq++).toString(36)}`;

const DEFAULT: State = {
  lang: detectLang(),
  theme: 'system',
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
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem(OLD_KEY);
    if (raw) return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {
    /* storage unavailable */
  }
  return DEFAULT;
}

function num(s: string): number {
  const v = parseFloat(s.replace(',', '.').replace(/\s/g, ''));
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [picker, setPicker] = useState<Picker>(null);
  const [resultInView, setResultInView] = useState(false);
  const resultRef = useRef<HTMLElement>(null);
  const set = (p: Partial<State>) => setS((prev) => ({ ...prev, ...p }));
  const t = makeT(s.lang);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* ignore */
    }
  }, [s]);

  useEffect(() => {
    document.documentElement.lang = s.lang;
    document.title = t('appName');
  }, [s.lang]);

  useEffect(() => {
    applyTheme(s.theme);
    if (s.theme !== 'system') return;
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    const on = () => applyTheme('system');
    mq?.addEventListener('change', on);
    return () => mq?.removeEventListener('change', on);
  }, [s.theme]);

  useEffect(() => {
    const el = resultRef.current;
    if (!el || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([e]) => setResultInView(e.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const densVal = densityKg(s.density);
  const needsT = s.source === 'labT' || s.source === 'hydro';
  const densOk = densVal > 500 && densVal < 1200;
  const tOk = !needsT || Number.isFinite(num(s.densT));

  const tanks: Tank[] = s.tanks.map((tk) => ({
    id: tk.id,
    name: tk.name,
    tov: num(tk.tov) || 0,
    water: num(tk.water) || 0,
    t: Number.isFinite(num(tk.t)) ? num(tk.t) : 15,
  }));

  const dens = useMemo(() => {
    if (!densOk || !tOk) return null;
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
  }, [s.source, densVal, s.densT, s.hydroCal, s.meniscus, s.commodity, densOk, tOk, needsT]);

  const tanksKey = JSON.stringify(tanks);
  const all = useMemo(() => (dens ? computeAll(dens, tanks) : null), [dens, tanksKey]);
  const cur = all ? all[s.standard] : null;
  const ref = all ? all.api2004 : null;
  const massKey = s.mass === 'vac' ? 'mtVac' : 'mtAir';
  const headline = cur?.totals.complete ? cur.totals[massKey] : null;

  const updTank = (id: string, p: Partial<TankDraft>) =>
    set({ tanks: s.tanks.map((tk) => (tk.id === id ? { ...tk, ...p } : tk)) });
  const addTank = () =>
    set({
      tanks: [...s.tanks, { id: newId(), name: `${s.tanks.length + 1}`, tov: '', water: '0', t: s.tanks.at(-1)?.t ?? '15' }],
    });
  const delTank = (id: string) => set({ tanks: s.tanks.length > 1 ? s.tanks.filter((tk) => tk.id !== id) : s.tanks });

  const rows = STANDARDS.map((x) => {
    const v = all ? all[x.id].totals[massKey] : null;
    const b = ref ? ref.totals[massKey] : null;
    return { id: x.id, v, d: v !== null && b !== null ? v - b : null, b };
  });

  // Notes that only concern GOST 85 mode stay out of the way elsewhere.
  const notes = (dens?.warnings ?? []).filter((w) => w.code !== 'gost20FromApi' || s.standard === 'gost85');
  const signed = (d: number, digits: number) =>
    (d > 0.0005 ? '+' : '') + fmt(s.lang, Math.abs(d) < 0.0005 ? 0 : d, digits);
  const rho20Shown = s.standard === 'gost85' ? dens?.gost85.rho20 : dens?.api.rho20;

  return (
    <LangCtx.Provider value={s.lang}>
      <div className="shell">
        <header className="bar">
          <div className="brand">
            <HydrometerMark />
            <div className="brand-text">
              <h1>{t('appName')}</h1>
              <p>{t('appSub')}</p>
            </div>
          </div>
          <button
            type="button"
            className="icon-btn"
            aria-label={t('openSettings')}
            aria-haspopup="dialog"
            onClick={() => setSettingsOpen(true)}
          >
            <GearIcon />
          </button>
        </header>

        <main className="layout">
          <div className="col-input">
            {/* ---------------- Density ---------------- */}
            <section className="card" aria-labelledby="h-density">
              <h2 id="h-density" className="card-title">
                {t('densityTitle')}
              </h2>

              <div className="rows">
                <button type="button" className="row-btn" aria-haspopup="dialog" onClick={() => setPicker('commodity')}>
                  <span className="row-label">{t('commodityLabel')}</span>
                  <span className="row-value">{t(s.commodity)}</span>
                  <ChevronIcon />
                </button>
                <button type="button" className="row-btn" aria-haspopup="dialog" onClick={() => setPicker('source')}>
                  <span className="row-label">{t('sourceLabel')}</span>
                  <span className="row-value">{t(s.source)}</span>
                  <ChevronIcon />
                </button>
                {s.source === 'hydro' && (
                  <button type="button" className="row-btn" aria-haspopup="dialog" onClick={() => setPicker('cal')}>
                    <span className="row-label">{t('hydroCal')}</span>
                    <span className="row-value">{s.hydroCal} °C</span>
                    <ChevronIcon />
                  </button>
                )}
              </div>

              <div className={`density-fields ${needsT ? 'has-t' : ''}`}>
                <Field
                  size="lg"
                  label={t(`f_${s.source}` as Key)}
                  value={s.density}
                  onChange={(v) => set({ density: v })}
                  unit={densVal < 2 ? t('gcm3') : t('kgm3')}
                  invalid={s.density.trim() !== '' && !densOk}
                />
                {needsT && (
                  <Field size="lg" label={t('tShort')} value={s.densT} onChange={(v) => set({ densT: v })} invalid={!tOk} />
                )}
              </div>
              {s.source === 'hydro' && (
                <Field
                  label={t('meniscus')}
                  value={s.meniscus}
                  onChange={(v) => set({ meniscus: v })}
                  unit={t('kgm3')}
                />
              )}

              {dens ? (
                <dl className="derived">
                  {s.source !== 'lab15' && (
                    <div>
                      <dt>ρ15</dt>
                      <dd>
                        <Num value={g(dens.api.rho15)} digits={4} />
                      </dd>
                    </div>
                  )}
                  {(s.source !== 'lab20' || s.standard === 'gost85') && (
                    <div>
                      <dt>ρ20</dt>
                      <dd>
                        <Num value={g(rho20Shown)} digits={4} />
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt>API°</dt>
                    <dd>
                      <Num value={dens.api.apiGravity} digits={2} />
                    </dd>
                  </div>
                  {s.standard === 'gost85' && (
                    <div>
                      <dt>γ</dt>
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
                  <div className="derived-group">
                    <dt className="sr-only">{t('group')}</dt>
                    <dd>{groupLabel(t, dens.api.group)}</dd>
                  </div>
                </dl>
              ) : (
                <p className="msg msg--err" role="alert">
                  {t('densityErr')}
                </p>
              )}
              {notes.length > 0 && (
                <ul className="notes">
                  {notes.map((w) => (
                    <li key={w.code}>{warningText(t, w)}</li>
                  ))}
                </ul>
              )}
            </section>

            {/* ---------------- Tanks ---------------- */}
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
                {s.tanks.map((tk, i) => {
                  const r = cur?.tanks[i];
                  const gost = s.standard === 'gost85';
                  return (
                    <li key={tk.id} className="tank">
                      <div className="tank-head">
                        <input
                          className="tank-name"
                          aria-label={t('tank')}
                          value={tk.name}
                          onChange={(e) => updTank(tk.id, { name: e.target.value })}
                        />
                        {s.tanks.length > 1 && (
                          <button
                            type="button"
                            className="icon-btn icon-btn--sm"
                            aria-label={`${t('remove')} ${tk.name}`}
                            onClick={() => delTank(tk.id)}
                          >
                            <TrashIcon />
                          </button>
                        )}
                      </div>
                      <div className="tank-fields">
                        <Field label={t('tov')} value={tk.tov} onChange={(v) => updTank(tk.id, { tov: v })} />
                        <Field label={t('water')} value={tk.water} onChange={(v) => updTank(tk.id, { water: v })} />
                        <Field label={t('tShort')} value={tk.t} onChange={(v) => updTank(tk.id, { t: v })} />
                      </div>
                      {r &&
                        (r.ok ? (
                          <div className="tank-out">
                            <dl className="tank-aux">
                              <div>
                                <dt>{gost ? 'ρt' : 'VCF'}</dt>
                                <dd>
                                  {gost ? (
                                    <Num value={g(r.rhoT)} digits={4} />
                                  ) : (
                                    <Num
                                      value={r.vcf}
                                      digits={4}
                                      note={t('usedInCalc', { v: r.vcfUsed === null ? '—' : fmt(s.lang, r.vcfUsed, 5) })}
                                    />
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
                          <p className="msg msg--err">{t('cannotCompute')}</p>
                        ))}
                    </li>
                  );
                })}
              </ol>
            </section>
          </div>

          <div className="col-result">
            {/* ---------------- Result ---------------- */}
            <section className="hero" id="result" ref={resultRef} aria-labelledby="h-result">
              <div className="hero-head">
                <h2 id="h-result">{t('result')}</h2>
                <Segmented<'vac' | 'air'>
                  label={t('weightAria')}
                  hideLabel
                  size="sm"
                  tone="hero"
                  value={s.mass}
                  onChange={(v) => set({ mass: v })}
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
                  <p className="readout-empty">{t('noResult')}</p>
                )}
                <p className="readout-cap">
                  {t(s.mass === 'vac' ? 'mtVacCap' : 'mtAirCap')}. {stdDesc(t, s.standard)}
                </p>
              </div>

              <Segmented<Standard>
                label={t('standard')}
                hideLabel
                tone="hero"
                value={s.standard}
                onChange={(v) => set({ standard: v })}
                options={STANDARDS.map((x) => ({ value: x.id, label: stdShort(t, x.id) }))}
              />

              {all && ref && (
                <Ruler
                  caption={t('scaleCaption')}
                  unit={t('t')}
                  total={ref.totals[massKey]}
                  marks={rows.map((x) => ({ id: x.id, label: stdShort(t, x.id), delta: x.d, selected: x.id === s.standard }))}
                />
              )}
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
                        <tr key={x.id} className={x.id === s.standard ? 'is-sel' : ''}>
                          <th scope="row">{stdShort(t, x.id)}</th>
                          <td>{x.v === null ? '—' : fmt(s.lang, x.v, 3)}</td>
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
              </section>
            )}

            <footer className="foot">
              <p>{t('foot1')}</p>
              <p>{t('foot2')}</p>
            </footer>
          </div>
        </main>

        <a href="#result" className={`dock ${resultInView ? 'is-hidden' : ''}`} aria-label={t('toResult')}>
          <span className="dock-std">{stdShort(t, s.standard)}</span>
          <span className="dock-val">
            {headline !== null ? fmt(s.lang, headline, 3) : '—'} <small>MT</small>
          </span>
        </a>

        <Sheet open={picker === 'commodity'} title={t('commodityLabel')} closeLabel={t('close')} onClose={() => setPicker(null)}>
          <ChoiceList<Commodity>
            name="commodity"
            value={s.commodity}
            onChange={(v) => {
              set({ commodity: v });
              setPicker(null);
            }}
            options={COMMODITIES.map((c) => ({ value: c, label: t(c), desc: t(`d_${c}` as Key) }))}
          />
        </Sheet>
        <Sheet open={picker === 'source'} title={t('sourceLabel')} closeLabel={t('close')} onClose={() => setPicker(null)}>
          <ChoiceList<DensitySource>
            name="source"
            value={s.source}
            onChange={(v) => {
              set({ source: v });
              setPicker(null);
            }}
            options={SOURCES.map((c) => ({ value: c, label: t(c), desc: t(`d_${c}` as Key) }))}
          />
        </Sheet>
        <Sheet open={picker === 'cal'} title={t('hydroCal')} closeLabel={t('close')} onClose={() => setPicker(null)}>
          <ChoiceList<15 | 20>
            name="cal"
            value={s.hydroCal}
            onChange={(v) => {
              set({ hydroCal: v });
              setPicker(null);
            }}
            options={[
              { value: 20, label: t('cal20'), desc: t('d_cal20') },
              { value: 15, label: t('cal15'), desc: t('d_cal15') },
            ]}
          />
        </Sheet>

        <SettingsDialog
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          t={t}
          lang={s.lang}
          theme={s.theme}
          onLang={(l) => set({ lang: l })}
          onTheme={(th) => set({ theme: th })}
        />
      </div>
    </LangCtx.Provider>
  );
}

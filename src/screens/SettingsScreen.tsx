import { useRef, useState } from 'react';
import { useApp } from '../app/context';
import { checkNow } from '../app/pwa';
import type { CheckResult } from '../app/pwa';
import { today } from '../app/store';
import { dateTimeOf } from '../app/format';
import type { Settings, Store } from '../app/store';
import { STANDARDS } from '../core/calc';
import type { Standard } from '../core/calc';
import { LANGS, stdShort } from '../i18n';
import type { Lang } from '../i18n';
import { downloadFile } from '../report/share';
import type { ThemePref } from '../theme';
import { AppBar } from '../ui/AppBar';
import { Field } from '../ui/Field';
import { Segmented } from '../ui/Segmented';
import { ChoiceList } from '../ui/Sheet';

type ReportDefaults = Settings['report'];

export function SettingsScreen() {
  const { store, update, t, st, at } = useApp();
  const s = store.settings;
  const [msg, setMsg] = useState('');
  const [upd, setUpd] = useState<CheckResult | 'busy' | ''>('');
  const file = useRef<HTMLInputElement>(null);
  const set = (p: Partial<Settings>) => update((x) => ({ ...x, settings: { ...x.settings, ...p } }));
  const setRep = (k: keyof ReportDefaults, v: string) => update((x) => ({ ...x, settings: { ...x.settings, report: { ...x.settings.report, [k]: v } } }));
  const rf = (k: keyof ReportDefaults, label: string, mode: 'text' | 'email' = 'text') => (
    <Field label={label} value={s.report[k]} onChange={(v) => setRep(k, v)} mode={mode} />
  );

  const backup = () => {
    const bytes = new TextEncoder().encode(JSON.stringify(store, null, 1));
    downloadFile(bytes, `calcoil-backup-${today().split('.').reverse().join('')}.json`);
    setMsg(at('backupDone'));
  };
  const restore = async (f: File | undefined) => {
    if (!f) return;
    try {
      const o = JSON.parse(await f.text()) as Partial<Store>;
      if (o.v !== 2 || !Array.isArray(o.vessels) || !Array.isArray(o.jobs)) throw new Error('format');
      update((x) => ({
        ...x,
        vessels: [...x.vessels.filter((v) => !o.vessels!.some((n) => n.id === v.id)), ...o.vessels!],
        jobs: [...x.jobs.filter((j) => !o.jobs!.some((n) => n.id === j.id)), ...o.jobs!],
      }));
      setMsg(at('restoreDone', { v: o.vessels.length, j: o.jobs.length }));
    } catch {
      setMsg(at('restoreErr'));
    }
    if (file.current) file.current.value = '';
  };

  return (
    <>
      <AppBar large title={t('settings')} />
      <main className="screen-body">
        <section className="card" aria-labelledby="h-look">
          <h2 id="h-look" className="card-title">
            {at('setLook')}
          </h2>
          <ChoiceList<Lang>
            name="lang"
            legend={t('language')}
            value={s.lang}
            onChange={(lang) => set({ lang })}
            options={LANGS.map((l) => ({ value: l.id, label: l.label }))}
          />
          <Segmented<ThemePref>
            label={t('theme')}
            value={s.theme}
            onChange={(theme) => set({ theme })}
            options={[
              { value: 'system', label: t('themeSystem') },
              { value: 'light', label: t('themeLight') },
              { value: 'dark', label: t('themeDark') },
            ]}
          />
        </section>

        <section className="card" aria-labelledby="h-def">
          <h2 id="h-def" className="card-title">
            {at('setDefaults')}
          </h2>
          <Segmented<Standard>
            label={t('standard')}
            value={s.standard}
            onChange={(standard) => set({ standard })}
            options={STANDARDS.map((x) => ({ value: x.id, label: stdShort(t, x.id) }))}
          />
          <Segmented<'vac' | 'air'>
            label={t('weightAria')}
            value={s.mass}
            onChange={(mass) => set({ mass })}
            options={[
              { value: 'vac', label: t('vac') },
              { value: 'air', label: t('air') },
            ]}
          />
          <p className="field-hint">{at('defaultsHint')}</p>
        </section>

        <section className="card" aria-labelledby="h-rep">
          <h2 id="h-rep" className="card-title">
            {at('setReport')}
          </h2>
          {rf('location', st('rLocation'))}
          {rf('port', st('rPort'))}
          <div className="two-col">
            {rf('terminalRep', st('rRep'))}
            {rf('surveyor', st('rSurveyor'))}
          </div>
          {rf('sea', st('rSea'))}
          {rf('emailTo', st('rTo'), 'email')}
        </section>

        <section className="card" aria-labelledby="h-data">
          <h2 id="h-data" className="card-title">
            {at('setData')}
          </h2>
          <p className="field-hint">{at('dataHint', { v: store.vessels.length, j: store.jobs.length })}</p>
          <div className="report-actions">
            <button type="button" className="btn-ghost" onClick={backup}>
              {at('backup')}
            </button>
            <button type="button" className="btn-ghost" onClick={() => file.current?.click()}>
              {at('restore')}
            </button>
            <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => restore(e.target.files?.[0])} />
          </div>
          {msg && (
            <p className="msg" role="status">
              {msg}
            </p>
          )}
        </section>

        <section className="card" aria-labelledby="h-ver">
          <h2 id="h-ver" className="card-title">
            {at('setVersion')}
          </h2>
          <p className="msg">
            CalcOil, {at('buildOf', { date: dateTimeOf(Date.parse(__APP_BUILD__)) })}
            {__APP_COMMIT__ ? ` (${__APP_COMMIT__})` : ''}
          </p>
          <button
            type="button"
            className="btn-ghost"
            disabled={upd === 'busy'}
            onClick={async () => {
              setUpd('busy');
              setUpd(await checkNow());
            }}
          >
            {at('checkUpdates')}
          </button>
          {upd && upd !== 'busy' && (
            <p className="msg" role="status">
              {at(`upd_${upd}`)}
            </p>
          )}
          <p className="field-hint">{at('updHint')}</p>
        </section>

        <footer className="foot">
          <p>CalcOil · API MPMS 11.1-2004 / ASTM D1250-80 / ГОСТ 3900. {t('foot2')}</p>
        </footer>
      </main>
    </>
  );
}

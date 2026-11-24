import { useState } from 'react';
import type { Commodity } from '../core/api2004';
import type { DensitySource, Standard, Warning } from '../core/calc';
import { groupLabel, warningText } from '../i18n';
import type { Key } from '../i18n';
import { useApp } from '../app/context';
import { needsTemp } from '../app/derive';
import type { CargoView } from '../app/derive';
import type { CargoDraft } from '../app/store';
import { Field } from '../ui/Field';
import { ChevronIcon } from '../ui/Icons';
import { Num } from '../ui/Num';
import { ChoiceList, Sheet } from '../ui/Sheet';

const SOURCES: DensitySource[] = ['lab15', 'lab20', 'labT', 'hydro'];
const COMMODITIES: Commodity[] = ['product', 'crude', 'lube'];
const g = (kg: number | null | undefined) => (kg === null || kg === undefined ? null : kg / 1000);

interface Props {
  cargo: CargoDraft;
  onChange: (p: Partial<CargoDraft>) => void;
  view: CargoView;
  standard: Standard;
  notes?: Warning[];
}

/** Product type, how the density was measured, the value, and what follows from it. */
export function DensityEditor({ cargo: c, onChange, view, standard, notes = [] }: Props) {
  const { t } = useApp();
  const [picker, setPicker] = useState<'commodity' | 'source' | 'cal' | null>(null);
  const dens = view.dens;
  const withT = needsTemp(c);
  const rho20 = standard === 'gost85' ? dens?.gost85.rho20 : dens?.api.rho20;

  return (
    <>
      <div className="rows">
        <button type="button" className="row-btn" aria-haspopup="dialog" onClick={() => setPicker('commodity')}>
          <span className="row-label">{t('commodityLabel')}</span>
          <span className="row-value">{t(c.commodity)}</span>
          <ChevronIcon />
        </button>
        <button type="button" className="row-btn" aria-haspopup="dialog" onClick={() => setPicker('source')}>
          <span className="row-label">{t('sourceLabel')}</span>
          <span className="row-value">{t(c.source)}</span>
          <ChevronIcon />
        </button>
        {c.source === 'hydro' && (
          <button type="button" className="row-btn" aria-haspopup="dialog" onClick={() => setPicker('cal')}>
            <span className="row-label">{t('hydroCal')}</span>
            <span className="row-value">{c.hydroCal} °C</span>
            <ChevronIcon />
          </button>
        )}
      </div>

      <div className={`density-fields ${withT ? 'has-t' : ''}`}>
        <Field
          size="lg"
          label={t(`f_${c.source}` as Key)}
          value={c.density}
          onChange={(density) => onChange({ density })}
          unit={view.value < 2 ? t('gcm3') : t('kgm3')}
          invalid={c.density.trim() !== '' && !view.valueOk}
        />
        {withT && <Field size="lg" label={t('tShort')} value={c.densT} onChange={(densT) => onChange({ densT })} invalid={!view.tOk} />}
      </div>
      {c.source === 'hydro' && (
        <Field
          label={t('meniscus')}
          value={c.meniscus}
          onChange={(meniscus) => onChange({ meniscus })}
          unit={t('kgm3')}
          invalid={!view.menOk}
        />
      )}

      {dens ? (
        <dl className="derived">
          {c.source !== 'lab15' && (
            <div>
              <dt>ρ15</dt>
              <dd>
                <Num value={g(dens.api.rho15)} digits={4} />
              </dd>
            </div>
          )}
          {(c.source !== 'lab20' || standard === 'gost85') && (
            <div>
              <dt>ρ20</dt>
              <dd>
                <Num value={g(rho20)} digits={4} />
              </dd>
            </div>
          )}
          <div>
            <dt>API°</dt>
            <dd>
              <Num value={dens.api.apiGravity} digits={2} />
            </dd>
          </div>
          {standard === 'gost85' && (
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
        c.density.trim() !== '' && (
          <p className="msg msg--err" role="alert">
            {t('densityErr')}
          </p>
        )
      )}
      {notes.length > 0 && (
        <ul className="notes">
          {notes.map((w) => (
            <li key={w.code}>{warningText(t, w)}</li>
          ))}
        </ul>
      )}

      <Sheet open={picker === 'commodity'} title={t('commodityLabel')} closeLabel={t('close')} onClose={() => setPicker(null)}>
        <ChoiceList<Commodity>
          name="commodity"
          value={c.commodity}
          onChange={(commodity) => {
            onChange({ commodity });
            setPicker(null);
          }}
          options={COMMODITIES.map((x) => ({ value: x, label: t(x), desc: t(`d_${x}` as Key) }))}
        />
      </Sheet>
      <Sheet open={picker === 'source'} title={t('sourceLabel')} closeLabel={t('close')} onClose={() => setPicker(null)}>
        <ChoiceList<DensitySource>
          name="source"
          value={c.source}
          onChange={(source) => {
            onChange({ source });
            setPicker(null);
          }}
          options={SOURCES.map((x) => ({ value: x, label: t(x), desc: t(`d_${x}` as Key) }))}
        />
      </Sheet>
      <Sheet open={picker === 'cal'} title={t('hydroCal')} closeLabel={t('close')} onClose={() => setPicker(null)}>
        <ChoiceList<15 | 20>
          name="cal"
          value={c.hydroCal}
          onChange={(hydroCal) => {
            onChange({ hydroCal });
            setPicker(null);
          }}
          options={[
            { value: 20, label: t('cal20'), desc: t('d_cal20') },
            { value: 15, label: t('cal15'), desc: t('d_cal15') },
          ]}
        />
      </Sheet>
    </>
  );
}

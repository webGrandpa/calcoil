import { useEffect, useState } from 'react';
import { generateTanks, tankCode } from '../core/ship';
import { Field } from '../ui/Field';
import { Segmented } from '../ui/Segmented';
import { Sheet } from '../ui/Sheet';
import { bad, newId } from './model';
import type { TankDefDraft, VesselDraft } from './model';
import type { ST } from './strings';

interface Props {
  open: boolean;
  /** null = a new vessel. */
  vessel: VesselDraft | null;
  st: ST;
  closeLabel: string;
  onSave: (v: VesselDraft) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const fresh = (): VesselDraft => ({
  id: newId(),
  name: '',
  pairs: 6,
  centre: false,
  slops: true,
  tanks: [],
});

/** Builds the tank list from rows / centre / slops and keeps the reference heights already typed. */
function withTanks(v: VesselDraft): VesselDraft {
  const keep = v.tanks.map((t) => ({
    id: t.id,
    row: t.row,
    side: t.side,
    slop: t.slop,
    rh: NaN,
  }));
  const defs = generateTanks(v.pairs, v.centre, v.slops, keep, newId);
  const rhById = new Map(v.tanks.map((t) => [t.id, t.rh]));
  const tanks: TankDefDraft[] = defs.map((d) => ({
    id: d.id,
    row: d.row,
    side: d.side,
    slop: d.slop,
    rh: rhById.get(d.id) ?? '',
  }));
  return { ...v, tanks };
}

export function VesselSheet({ open, vessel, st, closeLabel, onSave, onDelete, onClose }: Props) {
  const [v, setV] = useState<VesselDraft>(() => withTanks(vessel ?? fresh()));
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (open) {
      setV(withTanks(vessel ?? fresh()));
      setConfirm(false);
    }
  }, [open, vessel]);

  const upd = (p: Partial<VesselDraft>) => setV((prev) => withTanks({ ...prev, ...p }));
  const setRh = (id: string, rh: string) =>
    setV((prev) => ({
      ...prev,
      tanks: prev.tanks.map((t) => (t.id === id ? { ...t, rh } : t)),
    }));
  const canSave = v.name.trim() !== '' && v.tanks.length > 0 && !v.tanks.some((t) => bad(t.rh));

  return (
    <Sheet
      open={open}
      title={vessel ? vessel.name || st('vesselNew') : st('vesselNew')}
      closeLabel={closeLabel}
      onClose={onClose}
    >
      <Field mode="text" label={st('vName')} value={v.name} onChange={(name) => setV((p) => ({ ...p, name }))} />

      <div className="stepper-field">
        <span className="field-label">{st('vPairs')}</span>
        <div className="stepper">
          <button type="button" className="stepper-btn" aria-label="−" onClick={() => upd({ pairs: Math.max(1, v.pairs - 1) })}>
            −
          </button>
          <output className="stepper-val" aria-live="polite">
            {v.pairs}
          </output>
          <button type="button" className="stepper-btn" aria-label="+" onClick={() => upd({ pairs: Math.min(20, v.pairs + 1) })}>
            +
          </button>
        </div>
      </div>

      <div className="two-col">
        <Segmented<'y' | 'n'>
          label={st('vCentre')}
          size="sm"
          value={v.centre ? 'y' : 'n'}
          onChange={(x) => upd({ centre: x === 'y' })}
          options={[
            { value: 'n', label: st('no') },
            { value: 'y', label: st('yes') },
          ]}
        />
        <Segmented<'y' | 'n'>
          label={st('vSlops')}
          size="sm"
          value={v.slops ? 'y' : 'n'}
          onChange={(x) => upd({ slops: x === 'y' })}
          options={[
            { value: 'n', label: st('no') },
            { value: 'y', label: st('yes') },
          ]}
        />
      </div>

      <section className="rh-list" aria-label={st('vRhTitle')}>
        <h3 className="sub-title">{st('vRhTitle')}</h3>
        <p className="field-hint">{st('vRhHint')}</p>
        <div className="rh-grid">
          {v.tanks.map((t) => (
            <label key={t.id} className="rh-row">
              <span className="rh-code">{tankCode(t)}</span>
              <span className={`input-box ${bad(t.rh) ? 'is-invalid' : ''}`}>
                <input
                  inputMode="decimal"
                  autoComplete="off"
                  value={t.rh}
                  placeholder="—"
                  onChange={(e) => setRh(t.id, e.target.value)}
                  onFocus={(e) => e.currentTarget.select()}
                />
                <span className="input-unit">{st('m')}</span>
              </span>
            </label>
          ))}
        </div>
      </section>

      <div className="sheet-actions">
        {vessel && (
          <button
            type="button"
            className={`btn-ghost ${confirm ? 'is-danger' : ''}`}
            onClick={() => (confirm ? onDelete(vessel.id) : setConfirm(true))}
          >
            {confirm ? st('deleteConfirm') : st('deleteVessel')}
          </button>
        )}
        <button type="button" className="btn-primary" disabled={!canSave} onClick={() => onSave({ ...v, name: v.name.trim() })}>
          {st('save')}
        </button>
      </div>
    </Sheet>
  );
}

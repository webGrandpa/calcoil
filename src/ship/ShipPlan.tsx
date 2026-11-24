import { tankCode } from '../core/ship';
import type { TankEval } from '../core/ship';
import { fmt } from '../i18n';
import type { Lang } from '../i18n';
import type { TankDefDraft } from './model';
import type { ST } from './strings';

interface Props {
  tanks: TankDefDraft[];
  evals: Record<string, TankEval>;
  lang: Lang;
  st: ST;
  onOpen: (id: string) => void;
}

/** The cargo tanks as seen from the bridge looking forward: bow on top, port left, starboard right. */
export function ShipPlan({ tanks, evals, lang, st, onOpen }: Props) {
  const hasC = tanks.some((t) => t.side === 'C');
  const rows = [...new Set(tanks.map((t) => t.row))].sort((a, b) => a - b);
  const cols: TankDefDraft['side'][] = hasC ? ['P', 'C', 'S'] : ['P', 'S'];
  const at = (row: number, side: string) => tanks.find((t) => t.row === row && t.side === side);

  return (
    <div className={`plan ${hasC ? 'plan--3' : 'plan--2'}`}>
      <div className="plan-bow" aria-hidden="true">
        <span>{st('bow')}</span>
      </div>
      <div className="plan-grid" role="list">
        {cols.map((c) => (
          <span key={c} className="plan-col" aria-hidden="true">
            {st(c === 'P' ? 'colP' : c === 'C' ? 'colC' : 'colS')}
          </span>
        ))}
        {rows.map((r) =>
          cols.map((c) => {
            const t = at(r, c);
            if (!t) return <span key={`${r}${c}`} className="plan-gap" aria-hidden="true" />;
            const ev = evals[t.id];
            const empty = ev?.ready && ev.tov === 0 && ev.ullage.value === null;
            const state = !ev?.touched ? 'todo' : empty ? 'empty' : ev.ready ? 'ready' : 'part';
            const warn = !!ev?.notes.some((n) => !['noTov', 'noTemp', 'noUllage'].includes(n.code));
            return (
              <button
                key={t.id}
                type="button"
                role="listitem"
                className={`tile tile--${state} ${warn ? 'tile--warn' : ''}`}
                onClick={() => onOpen(t.id)}
              >
                <span className="tile-code">{tankCode(t)}</span>
                {state === 'todo' && <span className="tile-sub">{st('tileTodo')}</span>}
                {state === 'empty' && <span className="tile-sub">{st('tileEmpty')}</span>}
                {(state === 'ready' || state === 'part') && (
                  <>
                    <span className="tile-main">
                      {ev.corrUllage !== null ? `${fmt(lang, ev.corrUllage, 3)} ${st('m')}` : '—'}
                    </span>
                    <span className="tile-sub">{ev.gov !== null ? `${fmt(lang, ev.gov, 1)} ${st('m3')}` : st('tilePart')}</span>
                  </>
                )}
              </button>
            );
          }),
        )}
      </div>
      <div className="plan-stern" aria-hidden="true">
        <span>{st('stern')}</span>
      </div>
    </div>
  );
}

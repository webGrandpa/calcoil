import { tankCode } from '../core/ship';
import type { ShipTankDef, TankEval } from '../core/ship';
import { tankState, tankWarn } from '../app/derive';
import { fmt } from '../i18n';
import type { Lang } from '../i18n';
import type { ST } from '../ship/strings';

interface Props {
  defs: ShipTankDef[];
  evals: Record<string, TankEval>;
  lang: Lang;
  st: ST;
  onOpen: (id: string) => void;
}

/**
 * The cargo tanks as the loading master walks them: bow ahead, port on the left with its red
 * edge, starboard on the right with its green one. A tile shows what was gauged and the GOV.
 */
export function ShipPlan({ defs, evals, lang, st, onOpen }: Props) {
  const hasC = defs.some((t) => t.side === 'C');
  const rows = [...new Set(defs.map((t) => t.row))].sort((a, b) => a - b);
  const cols: ShipTankDef['side'][] = hasC ? ['P', 'C', 'S'] : ['P', 'S'];
  const at = (row: number, side: string) => defs.find((t) => t.row === row && t.side === side);

  return (
    <div className={`plan ${hasC ? 'plan--3' : 'plan--2'}`}>
      <div className="plan-bow" aria-hidden="true">
        <span>{st('bow')}</span>
      </div>
      <div className="plan-sides" aria-hidden="true">
        {cols.map((c) => (
          <span key={c} className={`plan-side plan-side--${c}`}>
            {st(c === 'P' ? 'colP' : c === 'C' ? 'colC' : 'colS')}
          </span>
        ))}
      </div>
      <div className="plan-grid" role="list">
        {rows.map((r) =>
          cols.map((c) => {
            const t = at(r, c);
            if (!t) return <span key={`${r}${c}`} className="plan-gap" aria-hidden="true" />;
            const ev = evals[t.id];
            const state = tankState(ev);
            const warn = tankWarn(ev);
            const label = `${tankCode(t)}: ${
              state === 'todo' ? st('tileTodo') : state === 'empty' ? st('tileEmpty') : state === 'part' ? st('tilePart') : ''
            }${ev?.gov !== null && ev?.gov !== undefined && state !== 'empty' ? ` GOV ${fmt(lang, ev.gov, 1)} ${st('m3')}` : ''}`;
            return (
              <button
                key={t.id}
                type="button"
                role="listitem"
                aria-label={label}
                className={`tile tile--${state} tile--${t.side} ${warn ? 'tile--warn' : ''}`}
                onClick={() => onOpen(t.id)}
              >
                <span className="tile-code">{tankCode(t)}</span>
                {state === 'todo' && <span className="tile-sub">{st('tileTodo')}</span>}
                {state === 'empty' && <span className="tile-sub">{st('tileEmpty')}</span>}
                {(state === 'ready' || state === 'part') && (
                  <>
                    <span className="tile-main">{ev.corrUllage !== null ? `${fmt(lang, ev.corrUllage, 3)}` : '—'}</span>
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

import { useId } from 'react';
import { tankCode } from '../core/ship';
import type { ShipTankDef, TankEval } from '../core/ship';
import { tankState } from '../app/derive';

interface Props {
  defs: ShipTankDef[];
  evals: Record<string, TankEval>;
  label: string;
}

const W = 340;
const H = 100;
const X0 = 44;
const X1 = 282;
const Y0 = 17;
const Y1 = 83;
const GAP = 3;

/**
 * The vessel from above, bow to the right: port tanks along the top, starboard along the bottom,
 * the accommodation aft with its red and green sidelights. Each tank shows how far its gauging has got.
 */
export function HullMini({ defs, evals, label }: Props) {
  const pid = `hatch${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const rows = [...new Set(defs.map((d) => d.row))].sort((a, b) => a - b);
  const lanes: ShipTankDef['side'][] = defs.some((d) => d.side === 'C') ? ['P', 'C', 'S'] : ['P', 'S'];
  const n = Math.max(rows.length, 1);
  const cw = (X1 - X0 - GAP * (n - 1)) / n;
  const lh = (Y1 - Y0 - GAP * (lanes.length - 1)) / lanes.length;
  const small = cw < 26 || lh < 18;

  return (
    <svg className="hullmini" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      <defs>
        <pattern id={pid} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="5" className="hm-hatch" />
        </pattern>
      </defs>
      <path
        className="hm-hull"
        d="M20 8H262C300 8 324 26 337 50C324 74 300 92 262 92H20C10 92 4 86 4 76V24C4 14 10 8 20 8Z"
      />
      <path className="hm-keel" d="M290 50H326" />
      <rect className="hm-house" x="11" y="27" width="24" height="46" rx="4" />
      <circle className="hm-port" cx="23" cy="21" r="3.2" />
      <circle className="hm-stbd" cx="23" cy="79" r="3.2" />
      {defs.map((d) => {
        const ci = rows.indexOf(d.row);
        const li = lanes.indexOf(d.side);
        if (ci < 0 || li < 0) return null;
        const x = X1 - (ci + 1) * cw - ci * GAP;
        const y = Y0 + li * (lh + GAP);
        const s = tankState(evals[d.id]);
        return (
          <g key={d.id} className={`hm-cell hm-cell--${s}`}>
            <rect x={x} y={y} width={cw} height={lh} rx="3" fill={s === 'empty' ? `url(#${pid})` : undefined} />
            {!small && (
              <text x={x + cw / 2} y={y + lh / 2} dominantBaseline="central" textAnchor="middle">
                {d.slop ? `SL${d.side}` : tankCode(d)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

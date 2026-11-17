import { useContext, useEffect, useRef, useState } from 'react';
import { fmt, LangCtx } from '../i18n';

export interface RulerMark {
  id: string;
  label: string;
  delta: number | null; // tonnes vs reference
  selected: boolean;
}

interface Props {
  marks: RulerMark[];
  total: number | null; // reference total, tonnes
  unit: string;
  caption: string;
}

interface Cluster {
  key: string;
  x: number; // % of scale
  members: RulerMark[];
  selected: boolean;
}

function niceStep(span: number): number {
  const raw = span / 4;
  const p = 10 ** Math.floor(Math.log10(raw));
  const m = raw / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
}

const NEAR = 6; // % — pins closer than this share one label

/**
 * A graduated scale, read like a hydrometer stem or an ullage tape:
 * zero is the API 2004 result, each standard is a pin at its difference in tonnes.
 */
export function Ruler({ marks, total, unit, caption }: Props) {
  const lang = useContext(LangCtx);
  const scaleRef = useRef<HTMLDivElement>(null);
  const [widthPx, setWidthPx] = useState(330);
  useEffect(() => {
    const el = scaleRef.current;
    if (!el || !('ResizeObserver' in window)) return;
    const ro = new ResizeObserver(([e]) => setWidthPx(e.contentRect.width || 330));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const present = marks.filter((m) => m.delta !== null);
  const maxAbs = Math.max(0, ...present.map((m) => Math.abs(m.delta as number)));
  const floor = Math.max(1, (total ?? 0) * 0.0005); // never magnify sub-tonne noise into a full-width swing
  const step = niceStep(Math.max(maxAbs * 1.15, floor));
  const half = Math.ceil(Math.max(maxAbs * 1.15, floor) / step) * step;
  const pos = (d: number) => 50 + (d / half) * 50;

  const majors: number[] = [];
  for (let v = -half; v <= half + 1e-9; v += step) majors.push(+v.toFixed(10));
  const minors: number[] = [];
  for (let v = -half; v <= half + 1e-9; v += step / 5) minors.push(+v.toFixed(10));

  const digits = half < 5 ? 3 : half < 50 ? 2 : 1;
  const signed = (d: number) => (d > 0.00049 ? '+' : '') + fmt(lang, Math.abs(d) < 0.0005 ? 0 : d, digits);
  const signedText = signed;

  // Group pins that nearly coincide, so one label lists them instead of two labels colliding.
  const sorted = [...present].sort((a, b) => (a.delta as number) - (b.delta as number));
  const clusters: Cluster[] = [];
  for (const m of sorted) {
    const x = pos(m.delta as number);
    const last = clusters.at(-1);
    const lastX = last ? pos(last.members.at(-1)?.delta as number) : -100;
    if (last && x - lastX < NEAR) {
      last.members.push(m);
      last.selected ||= m.selected;
    } else {
      clusters.push({ key: m.id, x, members: [m], selected: m.selected });
    }
  }

  // Each label sits beside its pin on one of two rows. Every pin line crosses the lower row and
  // only upper-row pins reach the upper one, so a label must not cover a line that reaches its row.
  const labelPct = (c: Cluster) => {
    const chars = Math.max(...c.members.map((m) => m.label.length * 6.8 + (signedText(m.delta as number).length * 8.4)));
    return ((chars + 16) / widthPx) * 100;
  };
  const place = new Map<string, { row: number; side: 'l' | 'r' }>();
  const spans: { a: number; b: number; row: number }[] = [];
  const inside = (x: number, a: number, b: number) => x > a - 1 && x < b + 1;
  for (const c of clusters) {
    const pref: 'l' | 'r' = c.x > 60 ? 'l' : 'r';
    const other: 'l' | 'r' = pref === 'l' ? 'r' : 'l';
    let pick: { row: number; side: 'l' | 'r' } = { row: 1, side: pref };
    const tries: [number, 'l' | 'r'][] = [
      [0, pref],
      [0, other],
      [1, pref],
      [1, other],
    ];
    const W = labelPct(c);
    for (const [row, side] of tries) {
      const [a, b] = side === 'r' ? [c.x, c.x + W] : [c.x - W, c.x];
      if (a < -4 || b > 104) continue;
      const others = clusters.filter((o) => o !== c);
      const tall = row === 0 ? others : others.filter((o) => place.get(o.key)?.row === 1);
      if (tall.some((o) => inside(o.x, a, b))) continue;
      if (spans.some((q) => q.row === row && a < q.b && b > q.a)) continue;
      if (row === 1 && spans.some((q) => q.row === 0 && inside(c.x, q.a, q.b))) continue;
      pick = { row, side };
      break;
    }
    place.set(c.key, pick);
    const W2 = labelPct(c);
    const [a, b] = pick.side === 'r' ? [c.x, c.x + W2] : [c.x - W2, c.x];
    spans.push({ a, b, row: pick.row });
  }


  return (
    <figure className="ruler" aria-label={caption}>
      <figcaption className="ruler-cap">
        {caption}, {unit}
      </figcaption>
      <div className="ruler-scale" ref={scaleRef}>
        <div className="ruler-ticks" aria-hidden="true">
          {minors.map((v) => (
            <span key={`n${v}`} className="tick" style={{ left: `${pos(v)}%` }} />
          ))}
          {majors.map((v) => (
            <span
              key={`j${v}`}
              className={`tick tick--major ${v === 0 ? 'tick--zero' : ''}`}
              style={{ left: `${pos(v)}%` }}
            />
          ))}
        </div>
        <div className="ruler-nums" aria-hidden="true">
          <span style={{ left: '0%' }}>{fmt(lang, -half, digits > 1 ? 1 : 0)}</span>
          <span style={{ left: '50%' }}>0</span>
          <span style={{ left: '100%' }}>+{fmt(lang, half, digits > 1 ? 1 : 0)}</span>
        </div>
        {clusters.map((c) => {
          const pl = place.get(c.key) ?? { row: 0, side: 'r' };
          return (
            <div
              key={c.key}
              className={`pin pin--row${pl.row} pin--${pl.side} ${c.selected ? 'pin--sel' : ''}`}
              style={{ left: `${c.x}%` }}
            >
              <span className="pin-line" />
              <span className="pin-label">
                {c.members.map((m) => (
                  <span key={m.id} className={`pin-item ${m.selected ? 'is-sel' : ''}`}>
                    <span className="pin-name">{m.label}</span>
                    <span className="pin-val">{signed(m.delta as number)}</span>
                  </span>
                ))}
              </span>
            </div>
          );
        })}
      </div>
    </figure>
  );
}

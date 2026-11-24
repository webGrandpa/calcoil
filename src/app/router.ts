/** Hash routes: work offline, survive reloads, and the phone's back button walks them. */
import { useEffect, useState } from 'react';
import type { StageId } from './store';

export type Route =
  | { name: 'jobs' }
  | { name: 'job'; id: string }
  | { name: 'cargo'; id: string }
  | { name: 'stage'; id: string; stage: StageId }
  | { name: 'tank'; id: string; stage: StageId; tank: string }
  | { name: 'shore'; id: string }
  | { name: 'report'; id: string }
  | { name: 'vessels' }
  | { name: 'vessel'; id: string }
  | { name: 'calc' }
  | { name: 'settings' };

const stage = (s: string | undefined): StageId => (s === 'initial' ? 'initial' : 'final');

export function parse(hash: string): Route {
  const p = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  switch (p[0]) {
    case 'job':
      if (!p[1]) return { name: 'jobs' };
      if (p[2] === 'cargo') return { name: 'cargo', id: p[1] };
      if (p[2] === 'shore') return { name: 'shore', id: p[1] };
      if (p[2] === 'report') return { name: 'report', id: p[1] };
      if (p[2] === 'ship' && p[4]) return { name: 'tank', id: p[1], stage: stage(p[3]), tank: p[4] };
      if (p[2] === 'ship') return { name: 'stage', id: p[1], stage: stage(p[3]) };
      return { name: 'job', id: p[1] };
    case 'vessels':
      return p[1] ? { name: 'vessel', id: p[1] } : { name: 'vessels' };
    case 'calc':
      return { name: 'calc' };
    case 'settings':
      return { name: 'settings' };
    default:
      return { name: 'jobs' };
  }
}

export function href(r: Route): string {
  const e = encodeURIComponent;
  switch (r.name) {
    case 'jobs':
      return '#/';
    case 'job':
      return `#/job/${e(r.id)}`;
    case 'cargo':
    case 'shore':
    case 'report':
      return `#/job/${e(r.id)}/${r.name}`;
    case 'stage':
      return `#/job/${e(r.id)}/ship/${r.stage}`;
    case 'tank':
      return `#/job/${e(r.id)}/ship/${r.stage}/${e(r.tank)}`;
    case 'vessels':
      return '#/vessels';
    case 'vessel':
      return `#/vessels/${e(r.id)}`;
    case 'calc':
      return '#/calc';
    case 'settings':
      return '#/settings';
  }
}

/** The screen one level up, used when there is no in-app history to go back to. */
export function parent(r: Route): Route {
  switch (r.name) {
    case 'cargo':
    case 'shore':
    case 'report':
    case 'stage':
      return { name: 'job', id: r.id };
    case 'tank':
      return { name: 'stage', id: r.id, stage: r.stage };
    case 'job':
      return { name: 'jobs' };
    case 'vessel':
      return { name: 'vessels' };
    default:
      return { name: 'jobs' };
  }
}

const index = (): number => (history.state && typeof history.state.i === 'number' ? history.state.i : 0);

/** Push (or replace) a screen. pushState fires no event, so the route hook is told directly. */
export function navigate(r: Route, opts: { replace?: boolean } = {}) {
  const h = href(r);
  if (opts.replace) history.replaceState({ i: index() }, '', h);
  else history.pushState({ i: index() + 1 }, '', h);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
  window.scrollTo(0, 0);
}

/** Back within the app when we came from inside it, otherwise straight to the parent screen. */
export function goBack(from: Route) {
  if (index() > 0) history.back();
  else navigate(parent(from), { replace: true });
}

export function useRoute(): Route {
  const [r, setR] = useState<Route>(() => parse(location.hash));
  useEffect(() => {
    const on = () => setR(parse(location.hash));
    window.addEventListener('hashchange', on);
    window.addEventListener('popstate', on);
    return () => {
      window.removeEventListener('hashchange', on);
      window.removeEventListener('popstate', on);
    };
  }, []);
  return r;
}

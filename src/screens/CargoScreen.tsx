import { useApp, useJob } from '../app/context';
import { goBack } from '../app/router';
import type { Route } from '../app/router';
import type { CargoDraft } from '../app/store';
import type { Standard, Warning } from '../core/calc';
import { AppBar } from '../ui/AppBar';
import { Field } from '../ui/Field';
import { DensityEditor } from './DensityEditor';
import { MissingScreen } from './JobScreen';

/** Notes that only matter for one standard stay out of the way under the others. */
const ONLY_FOR: Partial<Record<Warning['code'], Standard>> = {
  gost20FromApi: 'gost85',
  gostExtended: 'gost85',
  range1980: 'astm1980',
};

export const densityNotes = (ws: Warning[] | undefined, std: Standard) => (ws ?? []).filter((w) => (ONLY_FOR[w.code] ?? std) === std);

export function CargoScreen({ route, id }: { route: Route; id: string }) {
  const { at, t } = useApp();
  const ctx = useJob(id);
  if (!ctx) return <MissingScreen route={route} />;
  const { job, vessel, view, setJob } = ctx;
  const setCargo = (p: Partial<CargoDraft>) => setJob((j) => ({ ...j, cargo: { ...j.cargo, ...p } }));

  return (
    <>
      <AppBar title={at('stepCargo')} sub={vessel.name || at('unnamed')} onBack={() => goBack(route)} backLabel={at('back')} />
      <main className="screen-body">
        <section className="card">
          <Field mode="text" label={at('jobGrade')} value={job.grade} onChange={(grade) => setJob((j) => ({ ...j, grade }))} hint={at('gradeHint')} />
        </section>
        <section className="card" aria-labelledby="h-dens">
          <h2 id="h-dens" className="card-title">
            {t('densityTitle')}
          </h2>
          <DensityEditor
            cargo={job.cargo}
            onChange={setCargo}
            view={view.cargo}
            standard={job.standard}
            notes={densityNotes(view.cargo.dens?.warnings, job.standard)}
          />
        </section>
        <div className="screen-actions">
          <button type="button" className="btn-primary btn-block" onClick={() => goBack(route)}>
            {at('doneBack')}
          </button>
        </div>
      </main>
    </>
  );
}

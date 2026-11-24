import { useState } from 'react';
import { useApp, useJob } from '../app/context';
import { fx, stageName, timeOf } from '../app/format';
import { reportInputOf, reportSubject } from '../app/report';
import { goBack, navigate } from '../app/router';
import type { Route } from '../app/router';
import type { ReportFields } from '../app/store';
import { buildReport, reportFileName, reportSummary } from '../report/ullageReport';
import { downloadFile, emailReport } from '../report/share';
import { AppBar } from '../ui/AppBar';
import { Field } from '../ui/Field';
import { CheckIcon, FileIcon, MailIcon } from '../ui/Icons';
import { MissingScreen } from './JobScreen';

/** Fields that stay the same from one vessel to the next: kept in settings as the defaults for new jobs. */
const STICKY: (keyof ReportFields)[] = ['location', 'port', 'terminalRep', 'surveyor', 'emailTo', 'sea'];

type Status = '' | 'shared' | 'mailto' | 'cancelled' | 'file' | 'error';

export function ReportScreen({ route, id }: { route: Route; id: string }) {
  const { at, st, t, lang, update } = useApp();
  const ctx = useJob(id);
  const [status, setStatus] = useState<Status>('');
  if (!ctx) return <MissingScreen route={route} />;
  const { job, vessel, view, setJob } = ctx;
  const inp = reportInputOf(job, vessel, view);
  const massKey = job.mass === 'vac' ? 'mtVac' : 'mtAir';
  const fig = view.shipReady ? view.ship[job.standard][massKey] : null;

  const setField = (k: keyof ReportFields, v: string) => {
    setStatus('');
    setJob((j) => ({ ...j, report: { ...j.report, [k]: v } }));
    if (STICKY.includes(k))
      update((s) => ({ ...s, settings: { ...s.settings, report: { ...s.settings.report, [k]: v } } }));
  };
  const rf = (k: keyof ReportFields, label: string, mode: 'text' | 'email' = 'text') => (
    <Field label={label} value={job.report[k]} onChange={(v) => setField(k, v)} mode={mode} />
  );

  const send = async (how: 'mail' | 'file') => {
    if (!inp) return;
    try {
      const bytes = buildReport(inp);
      const name = reportFileName(inp.vessel, inp.meta.date);
      if (how === 'file') {
        downloadFile(bytes, name);
        setStatus('file');
        setJob((j) => ({ ...j, sentAt: Date.now() }));
        return;
      }
      const res = await emailReport(bytes, name, reportSubject(inp), reportSummary(inp), job.report.emailTo);
      setStatus(res);
      if (res !== 'cancelled') setJob((j) => ({ ...j, sentAt: Date.now() }));
    } catch {
      setStatus('error');
    }
  };

  const checks: { ok: boolean; label: string; go: Route }[] = [
    { ok: !!view.cargo.dens, label: at('chkDensity'), go: { name: 'cargo', id } },
    {
      ok: view.progress.initial.state === 'done',
      label: at('chkStage', { stage: stageName(at, job.op, 'initial') }),
      go: { name: 'stage', id, stage: 'initial' },
    },
    {
      ok: view.progress.final.state === 'done',
      label: at('chkStage', { stage: stageName(at, job.op, 'final') }),
      go: { name: 'stage', id, stage: 'final' },
    },
    { ok: view.bl !== null, label: at('chkBl'), go: { name: 'shore', id } },
  ];

  const statusText: Record<Exclude<Status, ''>, string> = {
    shared: st('rShared'),
    mailto: st('rMailto'),
    cancelled: st('rCancelled'),
    file: at('rFileDone'),
    error: at('rError'),
  };

  return (
    <>
      <AppBar title={at('stepReport')} sub={vessel.name || at('unnamed')} onBack={() => goBack(route)} backLabel={at('back')} />
      <main className="screen-body">
        <section className="card report-preview" aria-labelledby="h-rp">
          <h2 id="h-rp" className="card-title">
            {at('reportPreview')}
          </h2>
          <p className="rp-line">
            <strong>{vessel.name || at('unnamed')}</strong>
            <span>{[st(job.op === 'load' ? 'opLoad' : 'opDischarge'), job.grade, job.berth, job.date].filter(Boolean).join(', ')}</span>
          </p>
          <dl className="kv-list">
            <div>
              <dt>{st(job.op === 'load' ? 'cap_load' : 'cap_discharge')}</dt>
              <dd>{fig !== null ? `${fx(lang, fig, 3)} MT ${t(job.mass === 'vac' ? 'vac' : 'air').toLowerCase()}` : '—'}</dd>
            </div>
            <div>
              <dt>B/L</dt>
              <dd>{view.bl !== null ? `${fx(lang, view.bl, 3)} MT` : '—'}</dd>
            </div>
            <div>
              <dt>{st('ratio')}</dt>
              <dd>{fx(lang, view.compare.ratio, 5)}</dd>
            </div>
          </dl>
          <ul className="checks">
            {checks.map((c) => (
              <li key={c.label}>
                <button type="button" className={`check ${c.ok ? 'is-ok' : ''}`} onClick={() => navigate(c.go)}>
                  <span className="check-mark" aria-hidden="true">
                    {c.ok ? <CheckIcon /> : null}
                  </span>
                  <span>{c.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="card" aria-labelledby="h-rf">
          <h2 id="h-rf" className="card-title">
            {at('reportFields')}
          </h2>
          <div className="two-col">
            <Field mode="text" label={st('rDate')} value={job.date} onChange={(date) => setJob((j) => ({ ...j, date }))} />
            <Field mode="text" label={st('rBerth')} value={job.berth} onChange={(berth) => setJob((j) => ({ ...j, berth }))} />
          </div>
          <Field mode="text" label={st('rGrade')} value={job.grade} onChange={(grade) => setJob((j) => ({ ...j, grade }))} />
          {rf('chiefOfficer', st('rChief'))}
          <div className="two-col">
            {rf('terminalRep', st('rRep'))}
            {rf('surveyor', st('rSurveyor'))}
          </div>
          {rf('location', st('rLocation'))}
          {rf('port', st('rPort'))}
          {rf('sea', st('rSea'))}
          <p className="field-hint">{at('stickyHint')}</p>
        </section>

        <section className="card" aria-labelledby="h-rs">
          <h2 id="h-rs" className="card-title">
            {at('reportSend')}
          </h2>
          {rf('emailTo', st('rTo'), 'email')}
          {!inp && <p className="msg msg--warn">{st('rNeed')}</p>}
          <div className="report-actions">
            <button type="button" className="btn-primary btn-icon" disabled={!inp} onClick={() => send('mail')}>
              <MailIcon />
              <span>{st('rSend')}</span>
            </button>
            <button type="button" className="btn-ghost btn-icon" disabled={!inp} onClick={() => send('file')}>
              <FileIcon />
              <span>{st('rDownload')}</span>
            </button>
          </div>
          {status && (
            <p className={`msg ${status === 'error' ? 'msg--err' : ''}`} role="status">
              {statusText[status]}
            </p>
          )}
          {job.sentAt && !status && <p className="field-hint">{at('sentAt', { time: timeOf(job.sentAt) })}</p>}
          <p className="field-hint">{st('reportHint')}</p>
        </section>
      </main>
    </>
  );
}

import Link from "next/link";
import type { JobLog, JobRecord } from "../types";

const formatDate = (value: string | null): string => {
  if (value === null) {
    return "-";
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "medium"
  }).format(new Date(value));
};

const JsonBlock = ({ value }: { value: unknown }): JSX.Element => (
  <pre className="max-h-96 overflow-auto rounded-lg bg-slate-950 p-4 text-xs leading-6 text-slate-100">
    {JSON.stringify(value, null, 2)}
  </pre>
);

export function JobDetail({ job, logs }: { job: JobRecord; logs: JobLog[] }): JSX.Element {
  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/" className="text-sm font-medium text-amberAccent">
            Back
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-navy">{job.taskType}</h1>
          <p className="font-mono text-sm text-slate-500">{job.jobId}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">{job.status}</span>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Priority</p>
          <p className="mt-1 font-semibold text-navy">{job.priority}</p>
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Attempts</p>
          <p className="mt-1 font-semibold text-navy">
            {job.attempts}/{job.maxRetries + 1}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Progress</p>
          <p className="mt-1 font-semibold text-navy">{job.progress}%</p>
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Timeout</p>
          <p className="mt-1 font-semibold text-navy">{job.timeout}ms</p>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 p-4">
          <h2 className="mb-3 text-base font-semibold text-navy">Timing</h2>
          <dl className="space-y-2 text-sm text-slate-600">
            <div className="flex justify-between gap-4">
              <dt>Created</dt>
              <dd>{formatDate(job.createdAt)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Started</dt>
              <dd>{formatDate(job.startedAt)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Completed</dt>
              <dd>{formatDate(job.completedAt)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Next Retry</dt>
              <dd>{formatDate(job.nextRetryAt)}</dd>
            </div>
          </dl>
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <h2 className="mb-3 text-base font-semibold text-navy">Error</h2>
          <p className="text-sm text-slate-700">{job.error ?? "No error recorded."}</p>
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-base font-semibold text-navy">Payload</h2>
          <JsonBlock value={job.payload} />
        </div>
        <div>
          <h2 className="mb-3 text-base font-semibold text-navy">Result</h2>
          <JsonBlock value={job.result} />
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-base font-semibold text-navy">Logs</h2>
        <div className="space-y-3">
          {logs.map((log) => (
            <div key={log.id} className="flex gap-4 border-b border-slate-100 pb-3 text-sm last:border-b-0">
              <span className="w-36 shrink-0 text-slate-500">{formatDate(log.createdAt)}</span>
              <span className="w-14 shrink-0 font-medium text-slate-700">{log.level}</span>
              <span className="text-slate-700">{log.message}</span>
            </div>
          ))}
          {logs.length === 0 ? <p className="text-sm text-slate-500">No logs recorded.</p> : null}
        </div>
      </section>
    </main>
  );
}


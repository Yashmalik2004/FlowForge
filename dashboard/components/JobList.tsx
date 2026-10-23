"use client";

import Link from "next/link";
import type { JobRecord, JobStatus } from "../types";

const statusClasses: Record<JobStatus, string> = {
  pending: "bg-slate-100 text-slate-700",
  active: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
  cancelled: "bg-amber-100 text-amber-700"
};

const formatDate = (value: string | null): string => {
  if (value === null) {
    return "-";
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
};

interface JobListProps {
  jobs: JobRecord[];
}

export function JobList({ jobs }: JobListProps): JSX.Element {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-slate-600">Job ID</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-600">Task Type</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-600">Created</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-600">Completed</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-600">Attempts</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {jobs.map((job) => (
            <tr key={job.jobId} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-mono text-navy">
                <Link href={`/jobs/${job.jobId}`} className="hover:text-amberAccent">
                  {job.jobId.slice(0, 8)}
                </Link>
              </td>
              <td className="px-4 py-3 text-slate-700">{job.taskType}</td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses[job.status]}`}>
                  {job.status}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-600">{formatDate(job.createdAt)}</td>
              <td className="px-4 py-3 text-slate-600">{formatDate(job.completedAt)}</td>
              <td className="px-4 py-3 text-slate-600">
                {job.attempts}/{job.maxRetries + 1}
              </td>
            </tr>
          ))}
          {jobs.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                No jobs match the current filters.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}


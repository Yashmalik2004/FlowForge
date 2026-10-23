import type { JobLog, JobRecord, JobStatus, StatsResponse } from "../types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

const fetchJson = async <T>(path: string): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return (await response.json()) as T;
};

export interface JobFilters {
  taskType?: string;
  status?: JobStatus;
  from?: string;
  to?: string;
}

export const buildJobsQuery = (filters: JobFilters): string => {
  const params = new URLSearchParams();
  if (filters.taskType !== undefined && filters.taskType.trim() !== "") {
    params.set("taskType", filters.taskType);
  }
  if (filters.status !== undefined) {
    params.set("status", filters.status);
  }
  if (filters.from !== undefined && filters.from.trim() !== "") {
    params.set("from", filters.from);
  }
  if (filters.to !== undefined && filters.to.trim() !== "") {
    params.set("to", filters.to);
  }
  const query = params.toString();
  return query === "" ? "" : `?${query}`;
};

export const fetchStats = async (): Promise<StatsResponse> => fetchJson<StatsResponse>("/api/stats");

export const fetchJobs = async (filters: JobFilters): Promise<JobRecord[]> => {
  const data = await fetchJson<{ jobs: JobRecord[] }>(`/api/jobs${buildJobsQuery(filters)}`);
  return data.jobs;
};

export const fetchJob = async (jobId: string): Promise<JobRecord> => fetchJson<JobRecord>(`/api/jobs/${jobId}`);

export const fetchJobLogs = async (jobId: string): Promise<JobLog[]> => {
  const data = await fetchJson<{ logs: JobLog[] }>(`/api/jobs/${jobId}/logs`);
  return data.logs;
};


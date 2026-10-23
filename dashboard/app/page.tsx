"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { Chart } from "../components/Chart";
import { JobList } from "../components/JobList";
import { RealtimeIndicator } from "../components/RealtimeIndicator";
import { StatsCard } from "../components/StatsCard";
import { createDashboardSocket } from "../lib/socket";
import { fetchJobs, fetchStats } from "../lib/api";
import type { JobRecord, JobStatus, StatsResponse } from "../types";

const emptyStats: StatsResponse = {
  queued: 0,
  active: 0,
  completed: 0,
  failed: 0,
  successRate: 0,
  lastSevenDays: [],
  activeWorkers: 0,
  uptimeSeconds: 0
};

export default function DashboardPage(): JSX.Element {
  const [stats, setStats] = useState<StatsResponse>(emptyStats);
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [connected, setConnected] = useState(false);
  const [taskType, setTaskType] = useState("");
  const [status, setStatus] = useState<JobStatus | "">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [nextStats, nextJobs] = await Promise.all([
        fetchStats(),
        fetchJobs({
          ...(taskType.trim() !== "" ? { taskType } : {}),
          ...(status !== "" ? { status } : {}),
          ...(from.trim() !== "" ? { from } : {}),
          ...(to.trim() !== "" ? { to } : {})
        })
      ]);
      setStats(nextStats);
      setJobs(nextJobs);
      setError(null);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Failed to load dashboard data");
    }
  }, [from, status, taskType, to]);

  useEffect(() => {
    void loadData();
    const interval = window.setInterval(() => {
      void loadData();
    }, 5000);
    return () => window.clearInterval(interval);
  }, [loadData]);

  useEffect(() => {
    const socket = createDashboardSocket();
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("job:updated", () => {
      void loadData();
    });
    return () => {
      socket.disconnect();
    };
  }, [loadData]);

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <header className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <Image src="/icon.png" alt="TaskFlow" width={44} height={44} className="h-11 w-11 rounded-lg object-contain" priority />
          <div>
            <h1 className="text-2xl font-semibold text-navy">TaskFlow Admin</h1>
            <p className="mt-1 text-sm text-slate-500">Queue health, job history, worker state, and retry outcomes.</p>
          </div>
        </div>
        <RealtimeIndicator connected={connected} />
      </header>

      <section className="grid gap-4 md:grid-cols-5">
        <StatsCard label="Queued" value={String(stats.queued)} />
        <StatsCard label="Active" value={String(stats.active)} tone="active" />
        <StatsCard label="Completed" value={String(stats.completed)} tone="good" />
        <StatsCard label="Failed" value={String(stats.failed)} tone="bad" />
        <StatsCard label="Success Rate" value={`${(stats.successRate * 100).toFixed(1)}%`} />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Chart data={stats.lastSevenDays} />
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-base font-semibold text-navy">Worker Health</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <div className="flex justify-between">
              <span>Active workers</span>
              <span className="font-semibold text-navy">{stats.activeWorkers}</span>
            </div>
            <div className="flex justify-between">
              <span>Uptime</span>
              <span className="font-semibold text-navy">{Math.floor(stats.uptimeSeconds / 60)}m</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6">
        <div className="mb-3 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 md:flex-row">
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Task type"
            value={taskType}
            onChange={(event) => setTaskType(event.target.value)}
          />
          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={status}
            onChange={(event) => setStatus(event.target.value as JobStatus | "")}
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          <button className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white" onClick={() => void loadData()}>
            Apply
          </button>
        </div>
        {error !== null ? <p className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        <JobList jobs={jobs} />
      </section>
    </main>
  );
}

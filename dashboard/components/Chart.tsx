"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { StatsDay } from "../types";

export function Chart({ data }: { data: StatsDay[] }): JSX.Element {
  return (
    <div className="h-72 rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-navy">Last 7 Days</h2>
      </div>
      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={data}>
          <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fill: "#64748B", fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fill: "#64748B", fontSize: 12 }} />
          <Tooltip />
          <Line type="monotone" dataKey="completed" stroke="#059669" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="failed" stroke="#DC2626" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}


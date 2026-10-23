"use client";

interface RealtimeIndicatorProps {
  connected: boolean;
}

export function RealtimeIndicator({ connected }: RealtimeIndicatorProps): JSX.Element {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-600">
      <span className={`h-2.5 w-2.5 rounded-full ${connected ? "bg-emerald-500" : "bg-slate-300"}`} />
      <span>{connected ? "Realtime connected" : "Realtime disconnected"}</span>
    </div>
  );
}


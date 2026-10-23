interface StatsCardProps {
  label: string;
  value: string;
  tone?: "default" | "good" | "bad" | "active";
}

const toneClasses = {
  default: "border-slate-200",
  good: "border-emerald-200",
  bad: "border-red-200",
  active: "border-blue-200"
};

export function StatsCard({ label, value, tone = "default" }: StatsCardProps): JSX.Element {
  return (
    <div className={`rounded-lg border bg-white p-4 ${toneClasses[tone]}`}>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-navy">{value}</p>
    </div>
  );
}


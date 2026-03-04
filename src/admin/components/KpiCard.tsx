import { ReactNode } from "react";

interface KpiCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: ReactNode;
  pulse?: boolean;
}

export const KpiCard = ({ label, value, hint, icon, pulse }: KpiCardProps) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white backdrop-blur-xl p-4 shadow-[0_8px_30px_rgba(10,18,40,0.35)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-600">{label}</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{value}</p>
          {hint ? <p className="text-xs text-slate-600 mt-1">{hint}</p> : null}
        </div>
        <div className={`rounded-xl p-2 bg-slate-50 border border-slate-200 ${pulse ? "animate-pulse" : ""}`}>{icon}</div>
      </div>
    </div>
  );
};

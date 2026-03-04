interface StatusBadgeProps {
  status: string;
}

const tone: Record<string, string> = {
  pending: "bg-amber-500/20 text-amber-700 border-amber-400/30",
  confirmed: "bg-sky-500/20 text-sky-700 border-sky-400/30",
  dispatched: "bg-indigo-500/20 text-indigo-700 border-indigo-400/30",
  active: "bg-sky-500/20 text-sky-700 border-sky-400/30",
  in_progress: "bg-primary/20 text-primary border-primary/30",
  in_service: "bg-primary/20 text-primary border-primary/30",
  arrived: "bg-indigo-500/20 text-indigo-700 border-indigo-400/30",
  resolved: "bg-emerald-500/20 text-emerald-700 border-emerald-400/30",
  completed: "bg-emerald-500/20 text-emerald-700 border-emerald-400/30",
  cancelled: "bg-slate-500/20 text-slate-600 border-slate-400/30",
  rejected: "bg-rose-500/20 text-rose-700 border-rose-400/30",
  verified: "bg-emerald-500/20 text-emerald-700 border-emerald-400/30",
  approved: "bg-emerald-500/20 text-emerald-700 border-emerald-400/30",
  fraud_risk: "bg-rose-500/20 text-rose-700 border-rose-400/30",
  paid: "bg-emerald-500/20 text-emerald-700 border-emerald-400/30",
  failed: "bg-rose-500/20 text-rose-700 border-rose-400/30",
  open: "bg-sky-500/20 text-sky-700 border-sky-400/30",
  waiting: "bg-amber-500/20 text-amber-700 border-amber-400/30",
};

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const cls = tone[status] || "bg-slate-500/20 text-slate-700 border-slate-400/30";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${cls}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
};

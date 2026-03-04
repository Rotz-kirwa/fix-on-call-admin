import { KpiCard } from "@/admin/components/KpiCard";
import { CalendarClock, ShieldCheck, TrendingUp, Truck, Users, Wrench } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { adminAPI } from "@/lib/api";

const SERVICE_TYPE_CATALOG = [
  "breakdown",
  "towing",
  "fuel_delivery",
  "tyre_change",
  "battery_jump",
  "lockout",
  "mechanic_dispatch",
];

const BarChart = ({ data }: { data: { label: string; value: number }[] }) => {
  if (!data.length) return <p className="text-xs text-slate-500">No data yet.</p>;
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-2">
      {data.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <span className="text-xs text-slate-600 w-28 truncate" title={item.label}>
            {item.label}
          </span>
          <div className="h-2.5 rounded-full bg-slate-200 flex-1 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400" style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
          <span className="text-xs text-slate-600">{item.value}</span>
        </div>
      ))}
    </div>
  );
};

const OverviewPage = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeRequests: 0,
    completedJobs: 0,
    totalPartners: 0,
  });
  const [revenueTrend, setRevenueTrend] = useState<{ label: string; value: number }[]>([]);
  const [servicesTrend, setServicesTrend] = useState<{ label: string; value: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const revenueYearTotal = useMemo(() => revenueTrend.reduce((sum, x) => sum + (x.value || 0), 0), [revenueTrend]);
  const latestRevenueMonth = revenueTrend.length ? revenueTrend[revenueTrend.length - 1].value : 0;

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await adminAPI.getDashboard();
        const s = res.data?.statistics;
        setStats({
          totalUsers: s?.total_users || 0,
          activeRequests: s?.active_services || 0,
          completedJobs: Math.max(0, (s?.total_services || 0) - (s?.active_services || 0)),
          totalPartners: s?.total_partners || 0,
        });
        const rev = (res.data?.revenue_trend || []) as Array<{ label: string; value: number }>;
        setRevenueTrend(rev);
        const serviceTypes = (res.data?.service_types || []) as Array<{ _id: string; count: number }>;
        const countsByType = new Map(serviceTypes.map((x) => [x._id || "other", x.count || 0]));
        const normalized = SERVICE_TYPE_CATALOG.map((type) => ({
          label: type,
          value: countsByType.get(type) ?? 0,
        }));
        for (const [type, count] of countsByType.entries()) {
          if (!SERVICE_TYPE_CATALOG.includes(type)) {
            normalized.push({ label: type, value: count });
          }
        }
        setServicesTrend(normalized);
      } catch (e: any) {
        setError(e?.response?.data?.error || "Failed to load dashboard stats.");
      } finally {
        setLoading(false);
      }
    };

    void fetchDashboard();
    const t = window.setInterval(() => {
      void fetchDashboard();
    }, 5000);

    return () => window.clearInterval(t);
  }, []);

  return (
    <div className="space-y-6">
      {error && <p className="text-xs text-rose-600">{error}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="Total Users" value={stats.totalUsers.toLocaleString()} icon={<Users className="w-4 h-4 text-primary" />} />
        <KpiCard
          label="Active Requests"
          value={String(stats.activeRequests)}
          hint="Real-time queue"
          pulse
          icon={<Wrench className="w-4 h-4 text-amber-300" />}
        />
        <KpiCard label="Completed Service" value={String(stats.completedJobs)} icon={<ShieldCheck className="w-4 h-4 text-emerald-300" />} />
        <KpiCard label="Total Partners" value={String(stats.totalPartners)} icon={<Truck className="w-4 h-4 text-indigo-400" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        <section className="rounded-2xl border border-slate-200 bg-white backdrop-blur-xl p-5">
          <h3 className="text-slate-900 font-bold mb-3">Revenue Trend 2026</h3>
          <BarChart data={revenueTrend} />
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white backdrop-blur-xl p-5">
          <h3 className="text-slate-900 font-bold mb-3">Service Types</h3>
          <BarChart data={servicesTrend} />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white backdrop-blur-xl p-5">
          <h3 className="text-slate-900 font-bold mb-3">Nairobi Service Map</h3>
          <div className="h-44 rounded-xl overflow-hidden border border-slate-200">
            <iframe
              title="Nairobi petrol stations and garages map"
              src="https://maps.google.com/maps?q=major%20petrol%20stations%20and%20garages%20in%20Nairobi&z=12&output=embed"
              className="w-full h-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          <p className="text-xs text-slate-600 mt-2">Live GPS map centered on Nairobi major petrol stations and garages.</p>
        </section>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Dashboard Sync</p>
          <p className="text-2xl font-black mt-1 text-slate-900 flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-primary" /> {loading ? "Syncing..." : "Live"}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Revenue Months</p>
          <p className="text-2xl font-black mt-1 text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-400" /> {revenueTrend.length}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Revenue (Latest Month)</p>
          <p className="text-2xl font-black mt-1 text-slate-900">KSh {latestRevenueMonth.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Revenue (Year Total)</p>
          <p className="text-2xl font-black mt-1 text-slate-900">KSh {revenueYearTotal.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
};

export default OverviewPage;

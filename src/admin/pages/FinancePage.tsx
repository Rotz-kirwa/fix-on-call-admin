import { useEffect, useMemo, useState } from "react";
import { useAdminDemo } from "@/admin/AdminDemoContext";
import { hasPermission } from "@/admin/rbac";
import { exportToCsv } from "@/admin/utils";
import { KpiCard } from "@/admin/components/KpiCard";
import { StatusBadge } from "@/admin/components/StatusBadge";
import { CreditCard, HandCoins, Landmark, Wallet } from "lucide-react";
import { adminAPI, type AdminServiceDTO } from "@/lib/api";
import { formatNairobiDateTime, todayNairobiKey, toNairobiDateKey } from "@/lib/time";

const amountForService = (row: AdminServiceDTO) => {
  const finalAmount = Number((row as any).final_price || 0);
  if (finalAmount > 0) return finalAmount;
  const estimate = Number((row as any).price_estimate || 0);
  return estimate > 0 ? estimate : 0;
};

const FinancePage = () => {
  const { role, addAudit } = useAdminDemo();
  const canExport = hasPermission(role, "finance:export");
  const [services, setServices] = useState<AdminServiceDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchFinance = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await adminAPI.getServices({ per_page: 500 });
      setServices((res.data?.services || []) as AdminServiceDTO[]);
    } catch (e: any) {
      setError(e?.response?.data?.error || "Failed to load finance data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchFinance();
  }, []);

  const dailyRevenue = useMemo(() => {
    const today = todayNairobiKey();
    return services
      .filter((x) => (x.payment_status || "pending") === "completed" && toNairobiDateKey(x.created_at) === today)
      .reduce((sum, x) => sum + amountForService(x), 0);
  }, [services]);

  const completedRevenue = useMemo(
    () => services.filter((x) => (x.payment_status || "pending") === "completed").reduce((sum, x) => sum + amountForService(x), 0),
    [services]
  );
  const commissions = Math.round(completedRevenue * 0.12);
  const payoutsOwed = Math.max(0, completedRevenue - commissions);
  const outstanding = useMemo(
    () => services.filter((x) => (x.payment_status || "pending") !== "completed").reduce((sum, x) => sum + amountForService(x), 0),
    [services]
  );

  const transactionRows = useMemo(
    () =>
      services.map((s) => ({
        id: s.id,
        reference: `SRV-${s.id}`,
        amount: amountForService(s),
        user: `User #${s.user_id}`,
        provider: s.assigned_to ? `Mechanic #${s.assigned_to}` : "Unassigned",
        payment_status: s.payment_status || "pending",
        service_status: s.status,
        time: formatNairobiDateTime(s.created_at),
      })),
    [services]
  );

  return (
    <div className="space-y-4">
      {error && <p className="text-xs text-rose-600">{error}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="Daily Revenue" value={`KSh ${dailyRevenue.toLocaleString()}`} icon={<Wallet className="w-4 h-4 text-green-300" />} />
        <KpiCard label="Commissions" value={`KSh ${commissions.toLocaleString()}`} icon={<Landmark className="w-4 h-4 text-primary" />} />
        <KpiCard label="Payouts Owed" value={`KSh ${payoutsOwed.toLocaleString()}`} icon={<HandCoins className="w-4 h-4 text-amber-300" />} />
        <KpiCard label="Outstanding" value={`KSh ${outstanding.toLocaleString()}`} icon={<CreditCard className="w-4 h-4 text-rose-300" />} />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-slate-900">Transactions (Live Services)</h2>
          <button
            disabled={!canExport}
            onClick={() => exportToCsv("transactions.csv", transactionRows)}
            className="h-9 rounded-lg border border-primary/30 bg-primary/10 px-3 text-xs disabled:opacity-40"
          >
            Export CSV
          </button>
        </div>
        <div className="overflow-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="text-left px-3 py-2">Reference</th>
                <th className="text-left px-3 py-2">Amount</th>
                <th className="text-left px-3 py-2">User</th>
                <th className="text-left px-3 py-2">Provider</th>
                <th className="text-left px-3 py-2">Payment</th>
                <th className="text-left px-3 py-2">Service</th>
                <th className="text-left px-3 py-2">Time</th>
              </tr>
            </thead>
            <tbody>
              {transactionRows.map((txn) => (
                <tr key={txn.id} className="border-t border-slate-200">
                  <td className="px-3 py-2 text-slate-900">{txn.reference}</td>
                  <td className="px-3 py-2">KSh {txn.amount.toLocaleString()}</td>
                  <td className="px-3 py-2">{txn.user}</td>
                  <td className="px-3 py-2">{txn.provider}</td>
                  <td className="px-3 py-2"><StatusBadge status={txn.payment_status} /></td>
                  <td className="px-3 py-2"><StatusBadge status={txn.service_status} /></td>
                  <td className="px-3 py-2">{txn.time}</td>
                </tr>
              ))}
              {!transactionRows.length && !loading && (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-slate-500">No live finance records yet.</td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-slate-500">Loading transactions...</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-slate-900">Partner Settlements</h2>
          <button
            disabled={!canExport}
            onClick={() => {
              addAudit("SETTLEMENT_EXPORT", "Partner settlements export requested");
              exportToCsv("partner-settlements.csv", []);
            }}
            className="h-9 rounded-lg border border-emerald-300/30 bg-emerald-500/10 px-3 text-xs disabled:opacity-40"
          >
            Export Statements
          </button>
        </div>
        <p className="text-sm text-slate-600">Settlements are computed from live completed payments. Detailed provider payouts endpoint is not yet available.</p>
      </section>
    </div>
  );
};

export default FinancePage;

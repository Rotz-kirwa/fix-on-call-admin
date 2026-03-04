import { useEffect, useMemo, useState } from "react";
import { useAdminDemo } from "@/admin/AdminDemoContext";
import { hasPermission } from "@/admin/rbac";
import { exportToCsv } from "@/admin/utils";
import { StatusBadge } from "@/admin/components/StatusBadge";
import { adminAPI, type AdminServiceDTO } from "@/lib/api";
import { CheckCheck } from "lucide-react";

const timeline: Array<{ key: string; label: string }> = [
  { key: "pending", label: "created" },
  { key: "confirmed", label: "accepted" },
  { key: "dispatched", label: "dispatched" },
  { key: "arrived", label: "arrived" },
  { key: "in_service", label: "in progress" },
  { key: "completed", label: "completed" },
];
const READ_KEY = "fixoncall-read-requests";

const humanServiceType = (value: string) =>
  value
    ?.replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase()) || "Unknown";

const normalizeStatusForTimeline = (value?: string) => {
  if (!value) return "pending";
  if (value === "accepted") return "confirmed";
  if (value === "in_progress") return "in_service";
  return value;
};

const RequestsPage = () => {
  const { role, addAudit } = useAdminDemo();
  const [status, setStatus] = useState("all");
  const [service, setService] = useState("all");
  const [payment, setPayment] = useState("all");
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [requestsRaw, setRequestsRaw] = useState<AdminServiceDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [nextStatus, setNextStatus] = useState("pending");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [readIds, setReadIds] = useState<number[]>([]);

  const canRefund = hasPermission(role, "requests:refund");
  const canUpdateStatus = hasPermission(role, "dispatch:assign");
  const statusOptions = ["pending", "confirmed", "dispatched", "arrived", "in_service", "completed", "rejected"];

  useEffect(() => {
    try {
      const raw = localStorage.getItem(READ_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as number[];
      if (Array.isArray(parsed)) setReadIds(parsed.filter((x) => Number.isInteger(x)));
    } catch {
      // ignore malformed local storage
    }
  }, []);

  const isRead = (id: number) => readIds.includes(id);

  const markAsRead = (id: number) => {
    setReadIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      localStorage.setItem(READ_KEY, JSON.stringify(next));
      return next;
    });
  };

  const fetchServices = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await adminAPI.getServices({
        per_page: 300,
        status: status === "all" ? undefined : status,
        service_type: service === "all" ? undefined : service,
      });
      const rows = (res.data?.services || []) as AdminServiceDTO[];
      setRequestsRaw(rows);
      setSelectedRequestId((prev) => {
        if (!rows.length) return null;
        if (!prev) return rows[0].id;
        return rows.some((r) => r.id === prev) ? prev : rows[0].id;
      });
    } catch (e: any) {
      setError(e?.response?.data?.error || "Failed to load service requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchServices();
    const t = window.setInterval(() => {
      void fetchServices();
    }, 5000);

    return () => window.clearInterval(t);
  }, [service, status]);

  const requests = useMemo(
    () =>
      requestsRaw
        .map((request) => ({
          id: request.id,
          serviceType: humanServiceType(request.service_type),
          rawServiceType: request.service_type,
          status: request.status,
          area:
            request.location?.area ||
            request.location?.landmark ||
            (request.location?.latitude && request.location?.longitude
              ? `${request.location.latitude.toFixed(4)}, ${request.location.longitude.toFixed(4)}`
              : "Not provided"),
          providerAssigned: request.assigned_to ? `Mechanic #${request.assigned_to}` : "Unassigned",
          paymentStatus: request.payment_status || "pending",
          customerName: `User #${request.user_id}`,
          description: request.description || "No description",
          priority: request.priority || "medium",
          createdAt: request.created_at || "",
        }))
        .filter((request) => (payment === "all" ? true : request.paymentStatus === payment)),
    [payment, requestsRaw]
  );

  const selected = requests.find((x) => x.id === selectedRequestId);

  useEffect(() => {
    if (!selected) return;
    setNextStatus(selected.status || "pending");
  }, [selected]);

  useEffect(() => {
    if (!selectedRequestId) return;
    markAsRead(selectedRequestId);
  }, [selectedRequestId]);

  const uniqueServices = [...new Set(requestsRaw.map((r) => r.service_type).filter(Boolean))];
  const uniqueStatuses = [...new Set(requestsRaw.map((r) => r.status).filter(Boolean))];
  const uniquePayments = [...new Set(requestsRaw.map((r) => r.payment_status || "pending"))];

  const onUpdateStatus = async () => {
    if (!selected || !nextStatus) return;
    try {
      setUpdatingStatus(true);
      await adminAPI.updateServiceStatus(selected.id, nextStatus);
      addAudit("REQUEST_STATUS_UPDATED", `Request ${selected.id} -> ${nextStatus}`);
      await fetchServices();
    } catch (e: any) {
      setError(e?.response?.data?.error || "Failed to update request status.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
      <section className="xl:col-span-8 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap gap-2 justify-between items-center mb-3">
          <h2 className="font-bold text-slate-900">Service Requests</h2>
          <div className="flex gap-2">
            <select className="h-9 rounded-lg bg-white border border-slate-200 px-2 text-xs" value={service} onChange={(e) => setService(e.target.value)}>
              <option value="all">All services</option>
              {uniqueServices.map((x) => (
                <option key={x} value={x}>{humanServiceType(x)}</option>
              ))}
            </select>
            <select className="h-9 rounded-lg bg-white border border-slate-200 px-2 text-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">All status</option>
              {uniqueStatuses.map((x) => (
                <option key={x} value={x}>{x}</option>
              ))}
            </select>
            <select className="h-9 rounded-lg bg-white border border-slate-200 px-2 text-xs" value={payment} onChange={(e) => setPayment(e.target.value)}>
              <option value="all">All payments</option>
              {uniquePayments.map((x) => (
                <option key={x} value={x}>{x}</option>
              ))}
            </select>
            <button onClick={() => exportToCsv("requests.csv", requests)} className="h-9 rounded-lg border border-primary/30 bg-primary/10 px-3 text-xs">Export CSV</button>
          </div>
        </div>

        {error && <p className="text-xs text-rose-600 mb-3">{error}</p>}

        <div className="overflow-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="text-left px-3 py-2">ID</th>
                <th className="text-left px-3 py-2">Service</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Area</th>
                <th className="text-left px-3 py-2">Provider</th>
                <th className="text-left px-3 py-2">Payment</th>
                <th className="text-left px-3 py-2">Read</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr
                  key={request.id}
                  onClick={() => {
                    setSelectedRequestId(request.id);
                    markAsRead(request.id);
                  }}
                  className={`border-t border-slate-200 hover:bg-slate-50 cursor-pointer ${
                    !isRead(request.id) ? "bg-rose-50" : "bg-white"
                  }`}
                >
                  <td className="px-3 py-2 text-slate-900">{request.id}</td>
                  <td className="px-3 py-2">{request.serviceType}</td>
                  <td className="px-3 py-2"><StatusBadge status={request.status} /></td>
                  <td className="px-3 py-2">{request.area}</td>
                  <td className="px-3 py-2">{request.providerAssigned}</td>
                  <td className="px-3 py-2"><StatusBadge status={request.paymentStatus} /></td>
                  <td className="px-3 py-2">
                    <div
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] border ${
                        isRead(request.id)
                          ? "bg-white border-emerald-200 text-emerald-700"
                          : "bg-rose-100 border-rose-200 text-rose-700"
                      }`}
                    >
                      {isRead(request.id) ? (
                        <>
                          <CheckCheck className="w-3.5 h-3.5" />
                          2 ticks
                        </>
                      ) : (
                        <>Unread</>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!requests.length && !loading && (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-slate-500">No requests found.</td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-slate-500">Loading requests...</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <aside className="xl:col-span-4 rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
        <h2 className="font-bold text-slate-900">Request Detail</h2>
        {!selected ? (
          <p className="text-sm text-slate-600">Select a request from the table.</p>
        ) : (
          <>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm text-slate-900 font-semibold">Request #{selected.id}</p>
              <p className="text-xs text-slate-600">{selected.customerName} • {selected.area}</p>
              <p className="text-xs text-slate-600 mt-1">Priority: {selected.priority}</p>
              <p className="text-xs text-slate-600 mt-1">Created: {selected.createdAt ? new Date(selected.createdAt).toLocaleString() : "N/A"}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500 mb-2">Timeline</p>
              <div className="space-y-1.5">
                {timeline.map((step, idx) => {
                  const normalized = normalizeStatusForTimeline(selected.status);
                  const currentIdx = timeline.findIndex((t) => t.key === normalized);
                  const active = idx <= (currentIdx === -1 ? 0 : currentIdx);
                  return (
                    <div key={step.key} className="flex items-center gap-2 text-xs">
                      <span className={`h-2 w-2 rounded-full ${active ? "bg-emerald-500" : "bg-slate-400"}`} />
                      <span>{step.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 space-y-1">
              <p>Description: {selected.description}</p>
              <p>Provider: {selected.providerAssigned}</p>
              <p>Payment: {selected.paymentStatus}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
              <p className="text-xs text-slate-500">Live Tracker Status (Driver View)</p>
              <div className="flex gap-2">
                <select
                  value={nextStatus}
                  onChange={(e) => setNextStatus(e.target.value)}
                  disabled={!canUpdateStatus}
                  className="h-9 flex-1 rounded-lg bg-white border border-slate-200 px-2 text-xs disabled:opacity-40"
                >
                  {statusOptions.map((x) => (
                    <option key={x} value={x}>
                      {x.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
                <button
                  onClick={onUpdateStatus}
                  disabled={!canUpdateStatus || updatingStatus}
                  className="h-9 rounded-lg border border-primary/30 bg-primary/10 px-3 text-xs disabled:opacity-40"
                >
                  {updatingStatus ? "Updating..." : "Update Status"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                disabled={!canRefund}
                onClick={() => addAudit("REFUND_ACTION", `Refund initiated for request ${selected.id}`)}
                className="rounded-lg border border-amber-300/30 bg-amber-500/10 px-2 py-2 text-sm disabled:opacity-40"
              >
                Refund
              </button>
              <button
                disabled={!canRefund}
                onClick={() => addAudit("ADJUSTMENT_ACTION", `Adjustment requested for request ${selected.id}`)}
                className="rounded-lg border border-primary/30 bg-primary/10 px-2 py-2 text-sm disabled:opacity-40"
              >
                Adjustment
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
};

export default RequestsPage;

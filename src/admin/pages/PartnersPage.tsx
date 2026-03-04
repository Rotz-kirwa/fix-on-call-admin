import { useEffect, useMemo, useState } from "react";
import { CheckCheck, ClipboardCheck, RefreshCcw, X } from "lucide-react";
import { StatusBadge } from "@/admin/components/StatusBadge";
import { supportAPI, type SupportConversationDTO } from "@/lib/api";

const sentAt = (row: SupportConversationDTO) => row.last_message_at || row.created_at || row.updated_at || "";

const PartnersPage = () => {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [applications, setApplications] = useState<SupportConversationDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [updatingState, setUpdatingState] = useState<"approved" | "rejected" | null>(null);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await supportAPI.listConversations({
        channel: "partner_application",
        tag: "partner-application",
        q: query || undefined,
      });
      const rows = (res.data?.conversations || []) as SupportConversationDTO[];
      const sorted = rows.sort((a, b) => {
        const aTime = new Date(sentAt(a) || 0).getTime();
        const bTime = new Date(sentAt(b) || 0).getTime();
        return bTime - aTime;
      });
      setApplications(sorted);
      setSelectedId((prev) => {
        if (!sorted.length) return null;
        if (!prev) return sorted[0].id;
        return sorted.some((x) => x.id === prev) ? prev : sorted[0].id;
      });
    } catch (e: any) {
      setError(e?.response?.data?.error || "Failed to load partner applications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchApplications();
    const t = window.setInterval(() => {
      void fetchApplications();
    }, 5000);
    return () => window.clearInterval(t);
  }, [query]);

  const selected = useMemo(() => applications.find((x) => x.id === selectedId) || null, [applications, selectedId]);
  const selectedState = selected?.tags?.includes("approved")
    ? "approved"
    : selected?.tags?.includes("rejected")
      ? "rejected"
      : selected?.status || "open";

  const onMark = async (state: "approved" | "rejected") => {
    if (!selectedId || !selected) return;
    try {
      setUpdatingState(state);
      const tags = [...(selected.tags || []).filter(Boolean)];
      const cleaned = tags.filter((t) => t !== "approved" && t !== "rejected");
      cleaned.push(state);
      // Optimistic UI so buttons feel responsive.
      setApplications((prev) =>
        prev.map((x) =>
          x.id === selectedId ? { ...x, tags: cleaned, status: "resolved" } : x
        )
      );
      await supportAPI.updateConversation(selectedId, {
        status: "resolved",
        tags: cleaned,
      });
      await fetchApplications();
    } catch {
      // keep current state on transient failures
      setError("Could not update this application right now. Please try again.");
      await fetchApplications();
    } finally {
      setUpdatingState(null);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
      <section className="xl:col-span-7 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="font-bold text-slate-900">Partner Applications</h2>
          <div className="flex items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, phone, email"
              className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs"
            />
            <button
              onClick={() => void fetchApplications()}
              className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white"
              title="Refresh"
            >
              <RefreshCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {error && <p className="text-xs text-rose-600 mb-3">{error}</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {applications.map((application) => {
            const appState = application.tags?.includes("approved")
              ? "approved"
              : application.tags?.includes("rejected")
                ? "rejected"
                : application.status;

            return (
              <button
                key={application.id}
                onClick={() => setSelectedId(application.id)}
                className={`rounded-xl border p-3 text-left ${
                  selectedId === application.id ? "border-primary/50 bg-primary/10" : "border-slate-200 bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-slate-900 truncate">{application.customer_name}</p>
                  <StatusBadge status={appState} />
                </div>
                <p className="text-xs text-slate-600 mt-1 truncate">{application.customer_phone || "No phone"}</p>
                <p className="text-xs text-slate-600 truncate">{application.customer_email || "No email"}</p>
                <p className="text-xs text-slate-500 mt-1">
                  Submitted: {sentAt(application) ? new Date(sentAt(application)).toLocaleString() : "N/A"}
                </p>
                <div className="mt-2">
                  {appState === "approved" && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                      <CheckCheck className="w-3.5 h-3.5" />
                      2 ticks
                    </span>
                  )}
                  {appState === "rejected" && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-rose-300 bg-rose-50 px-2 py-1 text-[10px] font-semibold text-rose-700">
                      <X className="w-3.5 h-3.5" />
                      X
                    </span>
                  )}
                </div>
              </button>
            );
          })}

          {!applications.length && !loading && (
            <p className="text-sm text-slate-500 md:col-span-2">No partner applications yet.</p>
          )}
          {loading && <p className="text-sm text-slate-500 md:col-span-2">Loading applications...</p>}
        </div>
      </section>

      <aside className="xl:col-span-5 rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
        <h2 className="font-bold text-slate-900">Application Detail</h2>
        {!selected ? (
          <p className="text-sm text-slate-600">Select an application.</p>
        ) : (
          <>
            <div
              className={`rounded-xl border p-3 ${
                selectedState === "approved"
                  ? "border-emerald-300 bg-emerald-50"
                  : selectedState === "rejected"
                    ? "border-rose-300 bg-rose-50"
                    : "border-slate-200 bg-slate-50"
              }`}
            >
              <p className="text-sm font-semibold text-slate-900">{selected.customer_name}</p>
              <p className="text-xs text-slate-600">Phone: {selected.customer_phone || "N/A"}</p>
              <p className="text-xs text-slate-600">Email: {selected.customer_email || "N/A"}</p>
              <p className="text-xs text-slate-600 mt-1">
                Submitted: {sentAt(selected) ? new Date(sentAt(selected)).toLocaleString() : "N/A"}
              </p>
              <div className="mt-2">
                {selectedState === "approved" && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                    <CheckCheck className="w-3.5 h-3.5" />
                    2 ticks
                  </span>
                )}
                {selectedState === "rejected" && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-rose-300 bg-rose-50 px-2 py-1 text-[10px] font-semibold text-rose-700">
                    <X className="w-3.5 h-3.5" />
                    X
                  </span>
                )}
              </div>
            </div>

            <div
              className={`rounded-xl border p-3 ${
                selectedState === "approved"
                  ? "border-emerald-300 bg-emerald-50/90"
                  : selectedState === "rejected"
                    ? "border-rose-300 bg-rose-50/90"
                    : "border-slate-200 bg-slate-50"
              }`}
            >
              <p className="text-xs text-slate-500 mb-2 inline-flex items-center gap-1.5">
                <ClipboardCheck className="w-3.5 h-3.5" />
                Submitted Form Details
              </p>
              <p className="text-xs text-slate-800 whitespace-pre-wrap">{selected.last_message || "No details submitted."}</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                disabled={updatingState !== null}
                onClick={() => void onMark("approved")}
                className="rounded-lg border border-emerald-600 bg-emerald-600 px-3 py-2 text-sm text-white font-semibold disabled:opacity-40"
              >
                {updatingState === "approved" ? "Approving..." : "Approve"}
              </button>
              <button
                disabled={updatingState !== null}
                onClick={() => void onMark("rejected")}
                className="rounded-lg border border-rose-600 bg-rose-600 px-3 py-2 text-sm text-white font-semibold disabled:opacity-40"
              >
                {updatingState === "rejected" ? "Rejecting..." : "Reject"}
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
};

export default PartnersPage;

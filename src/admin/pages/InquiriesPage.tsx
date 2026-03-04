import { useEffect, useMemo, useState } from "react";
import { CheckCheck, MailQuestion, MessageSquare, RefreshCcw, Phone } from "lucide-react";
import { StatusBadge } from "@/admin/components/StatusBadge";
import { supportAPI, type SupportConversationDTO } from "@/lib/api";

const sentAt = (row: SupportConversationDTO) => row.last_message_at || row.created_at || row.updated_at || "";
const READ_KEY = "fixoncall-read-inquiries";

const InquiriesPage = () => {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [conversations, setConversations] = useState<SupportConversationDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [readIds, setReadIds] = useState<number[]>([]);

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

  const fetchInquiries = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await supportAPI.listConversations({
        channel: "inquiry",
        tag: "contact-page",
        q: query || undefined,
        status: status === "all" ? undefined : status,
      });
      const rows = ((res.data?.conversations || []) as SupportConversationDTO[])
        .filter((x) => (x.tags || []).some((t) => t.toLowerCase() === "contact-page"))
        .sort((a, b) => {
          const aTime = new Date(a.last_message_at || a.updated_at || a.created_at || 0).getTime();
          const bTime = new Date(b.last_message_at || b.updated_at || b.created_at || 0).getTime();
          return bTime - aTime;
        });
      setConversations(rows);
      setSelectedId((prev) => {
        if (!rows.length) return null;
        if (!prev) return rows[0].id;
        return rows.some((x) => x.id === prev) ? prev : rows[0].id;
      });
    } catch (e: any) {
      setError(e?.response?.data?.error || "Failed to load inquiries.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchInquiries();
    const t = window.setInterval(() => {
      void fetchInquiries();
    }, 5000);
    return () => window.clearInterval(t);
  }, [query, status]);

  useEffect(() => {
    if (!selectedId) return;
    markAsRead(selectedId);
  }, [selectedId]);

  const selected = useMemo(() => conversations.find((x) => x.id === selectedId) || null, [conversations, selectedId]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
      <aside className="xl:col-span-4 rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-black text-slate-900 flex items-center gap-2">
              <MailQuestion className="w-4 h-4 text-orange-600" />
              Contact Inquiries
            </h2>
            <button
              onClick={() => void fetchInquiries()}
              className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700"
              title="Refresh"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="mt-3 flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, email, message"
              className="h-9 flex-1 rounded-lg border border-slate-300 bg-white px-2 text-xs"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-xs"
            >
              <option value="all">All</option>
              <option value="open">Open</option>
              <option value="waiting">Waiting</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
          {error && <p className="text-xs text-rose-600 mt-2">{error}</p>}
        </div>

        <div className="p-3 space-y-2 max-h-[70vh] overflow-auto">
          {conversations.map((inquiry) => (
            <button
              key={inquiry.id}
              onClick={() => {
                setSelectedId(inquiry.id);
                markAsRead(inquiry.id);
              }}
              className={`w-full rounded-xl border p-3 text-left ${
                !isRead(inquiry.id)
                  ? "border-rose-300 bg-rose-50 hover:bg-rose-100/70"
                  : selectedId === inquiry.id
                    ? "border-slate-300 bg-white"
                    : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900 truncate">{inquiry.customer_name}</p>
                <StatusBadge status={inquiry.status} />
              </div>
              <p className="text-xs text-slate-600 truncate mt-1">{inquiry.customer_email || "No email"}</p>
              <p className="text-xs text-slate-500 truncate mt-1">{inquiry.last_message || "No message yet"}</p>
              <p className="text-[10px] text-slate-500 mt-1">
                Sent: {sentAt(inquiry) ? new Date(sentAt(inquiry)).toLocaleString() : "N/A"}
              </p>
              <div
                className={`mt-2 flex items-center justify-between rounded-lg px-2 py-1 text-[10px] ${
                  isRead(inquiry.id) ? "bg-white border border-emerald-200" : "bg-rose-100 border border-rose-200"
                }`}
              >
                {isRead(inquiry.id) ? (
                  <>
                    <span className="text-slate-600">Read</span>
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                      <CheckCheck className="w-3.5 h-3.5" />
                      2 ticks
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-rose-700 font-semibold">Unread</span>
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                  </>
                )}
              </div>
            </button>
          ))}
          {!conversations.length && !loading && <p className="text-sm text-slate-500 px-1">No inquiries yet.</p>}
          {loading && <p className="text-sm text-slate-500 px-1">Loading inquiries...</p>}
        </div>
      </aside>

      <section className="xl:col-span-8 rounded-2xl border border-slate-200 bg-white">
        {!selected ? (
          <div className="h-full min-h-[420px] flex items-center justify-center text-center p-6">
            <div>
              <MessageSquare className="w-7 h-7 text-slate-400 mx-auto mb-2" />
              <h3 className="text-base font-semibold text-slate-900">Select an inquiry</h3>
              <p className="text-sm text-slate-600 mt-1">Contact form submissions will appear here in real time.</p>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-orange-50/40">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-black text-slate-900">{selected.customer_name}</h3>
                  <p className="text-xs text-slate-600 mt-0.5">{selected.customer_email || "No email"}</p>
                </div>
                <div className="flex gap-2">
                  <StatusBadge status={selected.status} />
                </div>
              </div>
            </div>

            <div className="p-4 min-h-[320px] bg-[linear-gradient(180deg,#fff,#fff7ed)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Name</p>
                  <p className="text-sm font-semibold text-slate-900 mt-1">{selected.customer_name || "N/A"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Email</p>
                  <p className="text-sm font-semibold text-slate-900 mt-1 break-all">{selected.customer_email || "N/A"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Phone</p>
                  <p className="text-sm font-semibold text-slate-900 mt-1 inline-flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    {selected.customer_phone || "No phone provided"}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Submitted</p>
                  <p className="text-sm font-semibold text-slate-900 mt-1">
                    {sentAt(selected) ? new Date(sentAt(selected)).toLocaleString() : "N/A"}
                  </p>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 mt-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Message</p>
                <p className="text-sm text-slate-900 mt-1 whitespace-pre-wrap">{selected.last_message || "No message text."}</p>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default InquiriesPage;

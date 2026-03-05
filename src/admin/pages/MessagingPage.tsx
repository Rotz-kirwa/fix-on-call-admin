import { useEffect, useMemo, useState } from "react";
import { useAdminDemo } from "@/admin/AdminDemoContext";
import { hasPermission } from "@/admin/rbac";
import { StatusBadge } from "@/admin/components/StatusBadge";
import { supportAPI, type SupportConversationDTO, type SupportMessageDTO } from "@/lib/api";
import { formatNairobiTime } from "@/lib/time";

const MessagingPage = () => {
  const { role, addAudit } = useAdminDemo();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState<SupportConversationDTO[]>([]);
  const [messages, setMessages] = useState<SupportMessageDTO[]>([]);

  const canAssign = hasPermission(role, "messages:assign");

  const fetchConversations = async () => {
    try {
      const res = await supportAPI.listConversations(query ? { q: query } : undefined);
      const rows = (res.data?.conversations || []) as SupportConversationDTO[];
      setConversations(rows);

      if (!selectedId && rows.length > 0) {
        setSelectedId(rows[0].id);
      }
      if (selectedId && !rows.some((x) => x.id === selectedId)) {
        setSelectedId(rows[0]?.id ?? null);
      }
    } catch {
      // Keep previous state on transient API failures.
    }
  };

  const fetchMessages = async (conversationId: number) => {
    try {
      const res = await supportAPI.listMessages(conversationId);
      setMessages((res.data?.messages || []) as SupportMessageDTO[]);
    } catch {
      setMessages([]);
    }
  };

  useEffect(() => {
    void fetchConversations();
    const t = window.setInterval(() => {
      void fetchConversations();
    }, 4000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    if (!selectedId) return;
    void fetchMessages(selectedId);
    const t = window.setInterval(() => {
      void fetchMessages(selectedId);
    }, 2500);
    return () => window.clearInterval(t);
  }, [selectedId]);

  const selected = useMemo(() => conversations.find((x) => x.id === selectedId) || null, [conversations, selectedId]);

  const onAssign = async (assignee: string) => {
    if (!selectedId) return;
    try {
      await supportAPI.updateConversation(selectedId, { assigned_to: assignee, status: "open" });
      addAudit("CONVERSATION_ASSIGNED", `${selectedId} -> ${assignee}`);
      await fetchConversations();
    } catch {
      // no-op
    }
  };

  const onSend = async () => {
    if (!selectedId || !reply.trim()) return;
    setLoading(true);
    try {
      await supportAPI.sendMessage(selectedId, reply.trim(), "agent");
      addAudit("MESSAGE_SENT", `${selectedId}: ${reply.slice(0, 40)}`);
      setReply("");
      await fetchMessages(selectedId);
      await fetchConversations();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
      <aside className="xl:col-span-4 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between mb-3 gap-2">
          <h2 className="font-bold text-slate-900">Unified Inbox</h2>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8 w-44 rounded-lg bg-white border border-slate-200 px-2 text-xs"
            placeholder="Search phone/email/ID"
          />
        </div>
        <div className="space-y-2">
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => setSelectedId(conversation.id)}
              className={`w-full rounded-xl border p-3 text-left ${
                selectedId === conversation.id ? "border-primary/60 bg-primary/10" : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">{conversation.customer_name}</p>
                <StatusBadge status={conversation.status} />
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {conversation.channel.replaceAll("_", " ")} • {conversation.request_id || "No request ID"}
              </p>
              <p className="text-xs text-slate-500">Assigned: {conversation.assigned_to || "Unassigned"}</p>
              <p className="text-xs text-slate-500 truncate mt-1">{conversation.last_message || "No messages yet"}</p>
            </button>
          ))}
          {!conversations.length && <p className="text-sm text-slate-500">No conversations yet.</p>}
        </div>
      </aside>

      <section className="xl:col-span-8 rounded-2xl border border-slate-200 bg-white p-4">
        {!selected ? (
          <p className="text-sm text-slate-600">Select a conversation to open thread.</p>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
              <div>
                <h3 className="font-bold text-slate-900">{selected.customer_name}</h3>
                <p className="text-xs text-slate-600">
                  {selected.customer_phone || "No phone"} • {selected.customer_email || "No email"}
                </p>
              </div>
              <div className="flex gap-2">
                <select
                  disabled={!canAssign}
                  onChange={(e) => onAssign(e.target.value)}
                  className="h-9 rounded-lg bg-white border border-slate-200 px-2 text-xs disabled:opacity-40"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Assign to agent
                  </option>
                  <option>Aisha</option>
                  <option>Moses</option>
                  <option>Kim</option>
                </select>
                <button
                  onClick={() => addAudit("CONVERSATION_ESCALATED", `${selected.id} escalated to dispatch`)}
                  className="h-9 rounded-lg border border-amber-300/30 bg-amber-500/10 px-3 text-xs"
                >
                  Escalate to Dispatch
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 min-h-72 max-h-80 overflow-auto space-y-2">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`rounded-lg px-3 py-2 text-sm ${msg.sender === "agent" || msg.sender === "operator" ? "bg-primary/20 ml-10" : "bg-white border border-slate-200 mr-10"}`}
                >
                  <p>{msg.body}</p>
                  <p className="text-[10px] text-slate-600 mt-1">
                    {msg.sender} • {formatNairobiTime(msg.created_at)}
                  </p>
                </div>
              ))}
              {!messages.length && <p className="text-sm text-slate-500">No messages yet.</p>}
            </div>

            <div className="mt-3 flex gap-2">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Type a response..."
                className="flex-1 min-h-20 rounded-xl bg-white border border-slate-200 p-2 text-sm"
              />
              <div className="space-y-2 w-48">
                <button
                  onClick={onSend}
                  disabled={loading}
                  className="w-full rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm disabled:opacity-50"
                >
                  {loading ? "Sending..." : "Send"}
                </button>
                <button className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs">Use canned response</button>
                <button className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs">Add internal note</button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default MessagingPage;

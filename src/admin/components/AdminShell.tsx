import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  AlertTriangle,
  Bell,
  CircleUserRound,
  Command,
  DollarSign,
  LayoutDashboard,
  MailQuestion,
  Menu,
  MessageSquareText,
  Moon,
  Search,
  Settings,
  Sun,
  Truck,
  Users,
  X,
  FileClock,
} from "lucide-react";
import { useAdminDemo } from "@/admin/AdminDemoContext";
import { hasPermission } from "@/admin/rbac";
import { clearAdminSession, getAdminSession } from "@/lib/session";
import { adminAPI, supportAPI, type AdminServiceDTO, type AdminUserDTO, type SupportConversationDTO } from "@/lib/api";
import { formatNairobiDateTime, parseApiDate } from "@/lib/time";

const navItems = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, permission: "overview:view" as const },
  { to: "/admin/users", label: "Users", icon: Users, permission: "users:view" as const },
  { to: "/admin/requests", label: "Requests", icon: FileClock, permission: "requests:view" as const },
  { to: "/admin/inquiries", label: "Inquiries", icon: MailQuestion, permission: "messages:view" as const },
  { to: "/admin/finance", label: "Finance", icon: DollarSign, permission: "finance:view" as const },
  { to: "/admin/partners", label: "Partners", icon: Truck, permission: "partners:view" as const },
  { to: "/admin/messages", label: "Messaging", icon: MessageSquareText, permission: "messages:view" as const },
  { to: "/admin/settings", label: "Settings", icon: Settings, permission: "settings:view" as const },
];

const SUPPORT_LAST_SEEN_KEY = "fixoncall-support-last-seen-ts";
const REQUEST_LAST_SEEN_KEY = "fixoncall-request-last-seen-ts";
const USERS_LAST_SEEN_KEY = "fixoncall-users-last-seen-ts";
const MESSAGING_LAST_SEEN_KEY = "fixoncall-messaging-last-seen-ts";
const REQUEST_READ_KEY = "fixoncall-read-requests";
const INQUIRY_READ_KEY = "fixoncall-read-inquiries";

export const AdminShell = () => {
  const { role } = useAdminDemo();
  const [query, setQuery] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchUsers, setSearchUsers] = useState<AdminUserDTO[]>([]);
  const [searchRequests, setSearchRequests] = useState<AdminServiceDTO[]>([]);
  const [searchConversations, setSearchConversations] = useState<SupportConversationDTO[]>([]);
  const [supportConversations, setSupportConversations] = useState<SupportConversationDTO[]>([]);
  const [requestAlerts, setRequestAlerts] = useState<AdminServiceDTO[]>([]);
  const [userAlerts, setUserAlerts] = useState<AdminUserDTO[]>([]);
  const [urgentCount, setUrgentCount] = useState(0);
  const [latestAlertEvent, setLatestAlertEvent] = useState<{ label: string; at: string } | null>(null);
  const ringtoneTimerRef = useRef<number | null>(null);
  const lastAlertTsRef = useRef(0);
  const session = getAdminSession();
  const location = useLocation();

  const handleLogout = () => {
    clearAdminSession();
    window.location.assign("/admin-login");
  };

  const playUrgentTone = () => {
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const master = ctx.createGain();
      master.gain.value = 0.16; // louder alert
      master.connect(ctx.destination);

      const start = ctx.currentTime;
      const total = 10; // 10 second ringtone
      const step = 0.45;

      for (let t = 0; t < total; t += step) {
        const oscA = ctx.createOscillator();
        const gainA = ctx.createGain();
        oscA.type = "sine";
        oscA.frequency.value = 880;
        gainA.gain.value = 0.9;
        oscA.connect(gainA);
        gainA.connect(master);
        oscA.start(start + t);
        oscA.stop(start + t + 0.16);

        const oscB = ctx.createOscillator();
        const gainB = ctx.createGain();
        oscB.type = "sine";
        oscB.frequency.value = 1046;
        gainB.gain.value = 0.85;
        oscB.connect(gainB);
        gainB.connect(master);
        oscB.start(start + t + 0.2);
        oscB.stop(start + t + 0.36);
      }

      if (ringtoneTimerRef.current) window.clearTimeout(ringtoneTimerRef.current);
      ringtoneTimerRef.current = window.setTimeout(() => {
        void ctx.close();
        ringtoneTimerRef.current = null;
      }, 10500);
    } catch {
      // ignore blocked audio
    }
  };

  const getConversationTime = (row: SupportConversationDTO) =>
    parseApiDate(row.last_message_at || row.updated_at || row.created_at || "")?.getTime() || 0;
  const getRequestTime = (row: AdminServiceDTO) => parseApiDate(row.created_at || row.updated_at || "")?.getTime() || 0;
  const getUserTime = (row: AdminUserDTO) => parseApiDate(row.created_at || row.updated_at || "")?.getTime() || 0;

  const markSupportSeen = () => {
    if (supportConversations.length) {
      const latestSupport = Math.max(...supportConversations.map(getConversationTime));
      localStorage.setItem(SUPPORT_LAST_SEEN_KEY, String(latestSupport));
    }
    if (requestAlerts.length) {
      const latestRequest = Math.max(...requestAlerts.map(getRequestTime));
      localStorage.setItem(REQUEST_LAST_SEEN_KEY, String(latestRequest));
    }
    setUrgentCount(0);
  };

  useEffect(() => {
    setMobileNavOpen(false);
    if (location.pathname.startsWith("/admin/users") && userAlerts.length) {
      localStorage.setItem(USERS_LAST_SEEN_KEY, String(Math.max(...userAlerts.map(getUserTime))));
    }
    if (location.pathname.startsWith("/admin/messaging")) {
      const messagingRows = supportConversations.filter((x) => x.channel === "live_chat");
      if (messagingRows.length) {
        localStorage.setItem(MESSAGING_LAST_SEEN_KEY, String(Math.max(...messagingRows.map(getConversationTime))));
      }
    }
    if (location.pathname.startsWith("/admin/requests")) {
      const requestIds = requestAlerts.map((x) => x.id);
      localStorage.setItem(REQUEST_READ_KEY, JSON.stringify(requestIds));
      if (requestAlerts.length) {
        localStorage.setItem(REQUEST_LAST_SEEN_KEY, String(Math.max(...requestAlerts.map(getRequestTime))));
      }
    }
    if (location.pathname.startsWith("/admin/inquiries")) {
      const inquiryIds = supportConversations.filter((x) => x.channel === "inquiry").map((x) => x.id);
      localStorage.setItem(INQUIRY_READ_KEY, JSON.stringify(inquiryIds));
      const inquiryRows = supportConversations.filter((x) => x.channel === "inquiry");
      if (inquiryRows.length) {
        localStorage.setItem(SUPPORT_LAST_SEEN_KEY, String(Math.max(...inquiryRows.map(getConversationTime))));
      }
    }
  }, [location.pathname, requestAlerts, supportConversations, userAlerts]);

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setSearchUsers([]);
      setSearchRequests([]);
      setSearchConversations([]);
      return;
    }
    let cancelled = false;
    const fetchSearch = async () => {
      try {
        const [usersRes, requestsRes, partnerRes, inquiryRes] = await Promise.all([
          adminAPI.getUsers({ per_page: 25, search: query.trim() }),
          adminAPI.getServices({ per_page: 25 }),
          supportAPI.listConversations({ channel: "partner_application", q: query.trim() }),
          supportAPI.listConversations({ channel: "inquiry", q: query.trim() }),
        ]);
        if (cancelled) return;
        const users = (usersRes.data?.users || []) as AdminUserDTO[];
        const requests = ((requestsRes.data?.services || []) as AdminServiceDTO[]).filter((r) => {
          const hay = `${r.id} ${r.service_type} ${r.description || ""} ${r.user_id}`.toLowerCase();
          return hay.includes(query.trim().toLowerCase());
        });
        const partners = (partnerRes.data?.conversations || []) as SupportConversationDTO[];
        const inquiries = (inquiryRes.data?.conversations || []) as SupportConversationDTO[];
        setSearchUsers(users);
        setSearchRequests(requests);
        setSearchConversations([...partners, ...inquiries]);
      } catch {
        if (cancelled) return;
        setSearchUsers([]);
        setSearchRequests([]);
        setSearchConversations([]);
      }
    };
    void fetchSearch();
    return () => {
      cancelled = true;
    };
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    const pollSupport = async () => {
      try {
        const [inquiriesRes, liveChatRes, requestsRes, usersRes] = await Promise.all([
          supportAPI.listConversations({ channel: "inquiry" }),
          supportAPI.listConversations({ channel: "live_chat" }),
          adminAPI.getServices({ per_page: 200 }),
          adminAPI.getUsers({ per_page: 300 }),
        ]);
        if (cancelled) return;
        const inquiryRows = (inquiriesRes.data?.conversations || []) as SupportConversationDTO[];
        const liveChatRows = (liveChatRes.data?.conversations || []) as SupportConversationDTO[];
        const rows = [...inquiryRows, ...liveChatRows];
        const serviceRows = (requestsRes.data?.services || []) as AdminServiceDTO[];
        const userRows = (usersRes.data?.users || []) as AdminUserDTO[];
        setSupportConversations(rows);
        setRequestAlerts(serviceRows);
        setUserAlerts(userRows);

        if (!rows.length && !serviceRows.length) {
          setUrgentCount(0);
          return;
        }

        const latestSupportTs = rows.length ? Math.max(...rows.map(getConversationTime)) : 0;
        const latestRequestTs = serviceRows.length ? Math.max(...serviceRows.map(getRequestTime)) : 0;
        const storedSupport = Number(localStorage.getItem(SUPPORT_LAST_SEEN_KEY) || 0);
        const storedRequest = Number(localStorage.getItem(REQUEST_LAST_SEEN_KEY) || 0);

        if (!storedSupport && latestSupportTs > 0) {
          localStorage.setItem(SUPPORT_LAST_SEEN_KEY, String(latestSupportTs));
        }
        if (!storedRequest && latestRequestTs > 0) {
          localStorage.setItem(REQUEST_LAST_SEEN_KEY, String(latestRequestTs));
        }
        if ((!storedSupport && latestSupportTs > 0) || (!storedRequest && latestRequestTs > 0)) {
          return;
        }

        const incomingSupport = rows.filter((x) => getConversationTime(x) > storedSupport);
        const incomingRequests = serviceRows.filter((x) => getRequestTime(x) > storedRequest);
        const incomingCount = incomingSupport.length + incomingRequests.length;
        setUrgentCount(incomingCount);

        if (incomingCount > 0) {
          const supportEvent = incomingSupport
            .map((x) => ({
              ts: getConversationTime(x),
              label: `${x.customer_name || "User"} • ${x.channel.replaceAll("_", " ")}`,
              at: formatNairobiDateTime(x.last_message_at || x.updated_at || x.created_at),
            }))
            .sort((a, b) => b.ts - a.ts)[0];
          const requestEvent = incomingRequests
            .map((x) => ({
              ts: getRequestTime(x),
              label: `Request #${x.id} • ${x.service_type.replaceAll("_", " ")}`,
              at: formatNairobiDateTime(x.created_at || x.updated_at),
            }))
            .sort((a, b) => b.ts - a.ts)[0];

          const newest = [supportEvent, requestEvent]
            .filter(Boolean)
            .sort((a, b) => (b?.ts || 0) - (a?.ts || 0))[0];

          if (newest) {
            setLatestAlertEvent({ label: newest.label, at: newest.at });
            if (newest.ts > lastAlertTsRef.current) {
              lastAlertTsRef.current = newest.ts;
              playUrgentTone();
            }
          }
        }
      } catch {
        // ignore transient failures
      }
    };

    void pollSupport();
    const t = window.setInterval(() => {
      void pollSupport();
    }, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, []);

  useEffect(
    () => () => {
      if (ringtoneTimerRef.current) window.clearTimeout(ringtoneTimerRef.current);
    },
    []
  );

  const searchableItems = useMemo(() => {
    if (!query.trim()) return [];
    const combined = [
      ...searchUsers.map((u) => ({ id: `u-${u.id}`, label: `${u.name} (${u.phone})` })),
      ...searchRequests.map((r) => ({ id: `r-${r.id}`, label: `Request #${r.id} ${r.service_type}` })),
      ...searchConversations.map((c) => ({ id: `c-${c.id}`, label: `${c.customer_name} (${c.channel.replaceAll("_", " ")})` })),
    ];
    return combined.slice(0, 6);
  }, [query, searchConversations, searchRequests, searchUsers]);

  const sectionBadges = useMemo(() => {
    const requestReadIds = (() => {
      try {
        const raw = localStorage.getItem(REQUEST_READ_KEY);
        const parsed = raw ? (JSON.parse(raw) as number[]) : [];
        return new Set(Array.isArray(parsed) ? parsed : []);
      } catch {
        return new Set<number>();
      }
    })();
    const inquiryReadIds = (() => {
      try {
        const raw = localStorage.getItem(INQUIRY_READ_KEY);
        const parsed = raw ? (JSON.parse(raw) as number[]) : [];
        return new Set(Array.isArray(parsed) ? parsed : []);
      } catch {
        return new Set<number>();
      }
    })();

    const usersLastSeen = Number(localStorage.getItem(USERS_LAST_SEEN_KEY) || 0);
    const messagingLastSeen = Number(localStorage.getItem(MESSAGING_LAST_SEEN_KEY) || 0);

    const usersCount = userAlerts.filter((x) => getUserTime(x) > usersLastSeen).length;
    const requestsCount = requestAlerts.filter((x) => !requestReadIds.has(x.id)).length;
    const inquiriesRows = supportConversations.filter((x) => x.channel === "inquiry");
    const inquiriesCount = inquiriesRows.filter((x) => !inquiryReadIds.has(x.id)).length;
    const financeCount = requestAlerts.filter((x) => (x.payment_status || "pending") !== "completed").length;
    const partnersRows = supportConversations.filter((x) => x.channel === "partner_application");
    const partnersCount = partnersRows.filter((x) => {
      const tags = (x.tags || []).map((t) => t.toLowerCase());
      return !tags.includes("approved") && !tags.includes("rejected");
    }).length;
    const messagingRows = supportConversations.filter((x) => x.channel === "live_chat");
    const messagingCount = messagingRows.filter((x) => {
      const ts = getConversationTime(x);
      const active = x.status !== "resolved";
      return active && ts > messagingLastSeen;
    }).length;

    return {
      users: usersCount,
      requests: requestsCount,
      inquiries: inquiriesCount,
      finance: financeCount,
      partners: partnersCount,
      messages: messagingCount,
    };
  }, [requestAlerts, supportConversations, userAlerts]);

  const visibleItems = navItems.filter((item) => hasPermission(role, item.permission));

  return (
    <div className={darkMode ? "dark" : ""}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-primary/10 text-slate-900">
        <div className="flex min-h-screen">
          <aside className="hidden md:block w-20 lg:w-72 border-r border-slate-200 bg-white/95 backdrop-blur-xl px-3 py-4">
            <div className="mb-6 px-2 lg:px-3">
              <Link to="/" className="inline-flex items-center gap-2">
                <img
                  src="https://i.pinimg.com/736x/9f/11/9c/9f119c5372e0806ce7d8aa14b8de2aff.jpg"
                  alt="Fix On Call"
                  className="w-9 h-9 rounded-xl object-cover"
                />
                <div className="hidden lg:block">
                  <p className="font-black text-slate-900">Fix On Call</p>
                  <p className="text-[11px] text-primary">Admin Command Center</p>
                </div>
              </Link>
            </div>

            <nav className="space-y-2">
              {visibleItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/admin"}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${
                        isActive
                          ? "bg-primary/20 border border-primary/30 text-slate-900"
                          : "text-slate-600 hover:text-slate-900 hover:bg-white"
                      }`
                    }
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden lg:block text-sm font-medium">
                      {item.label}
                      {item.to === "/admin/users" && sectionBadges.users > 0 && (
                        <span className="ml-2 rounded-full bg-rose-600 px-2 py-0.5 text-[10px] text-white">{sectionBadges.users}</span>
                      )}
                      {item.to === "/admin/requests" && sectionBadges.requests > 0 && (
                        <span className="ml-2 rounded-full bg-rose-600 px-2 py-0.5 text-[10px] text-white">{sectionBadges.requests}</span>
                      )}
                      {item.to === "/admin/inquiries" && sectionBadges.inquiries > 0 && (
                        <span className="ml-2 rounded-full bg-rose-600 px-2 py-0.5 text-[10px] text-white">{sectionBadges.inquiries}</span>
                      )}
                      {item.to === "/admin/finance" && sectionBadges.finance > 0 && (
                        <span className="ml-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] text-white">{sectionBadges.finance}</span>
                      )}
                      {item.to === "/admin/partners" && sectionBadges.partners > 0 && (
                        <span className="ml-2 rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] text-white">{sectionBadges.partners}</span>
                      )}
                      {item.to === "/admin/messages" && sectionBadges.messages > 0 && (
                        <span className="ml-2 rounded-full bg-sky-600 px-2 py-0.5 text-[10px] text-white">{sectionBadges.messages}</span>
                      )}
                    </span>
                  </NavLink>
                );
              })}
            </nav>

            <div className="mt-8 rounded-xl border border-emerald-300/30 bg-emerald-500/10 p-3 hidden lg:block">
              <p className="text-xs text-emerald-700 font-semibold">Live Ops Status</p>
              <p className="text-sm mt-1">All core systems operational</p>
              <p className="text-xs text-slate-600 mt-1">Avg response: 3-7 min</p>
            </div>
          </aside>

          {mobileNavOpen && (
            <div className="fixed inset-0 z-40 md:hidden">
              <button
                onClick={() => setMobileNavOpen(false)}
                className="absolute inset-0 bg-slate-900/45"
                aria-label="Close menu overlay"
              />
              <aside className="absolute left-0 top-0 h-full w-[84%] max-w-xs border-r border-slate-200 bg-white px-4 py-4 shadow-2xl overflow-y-auto">
                <div className="mb-5 flex items-center justify-between">
                  <Link to="/" className="inline-flex items-center gap-2">
                    <img
                      src="https://i.pinimg.com/736x/9f/11/9c/9f119c5372e0806ce7d8aa14b8de2aff.jpg"
                      alt="Fix On Call"
                      className="w-9 h-9 rounded-xl object-cover"
                    />
                    <div>
                      <p className="font-black text-slate-900">Fix On Call</p>
                      <p className="text-[11px] text-primary">Admin Command Center</p>
                    </div>
                  </Link>
                  <button
                    onClick={() => setMobileNavOpen(false)}
                    className="rounded-lg border border-slate-200 bg-white p-2"
                    aria-label="Close menu"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <nav className="space-y-2">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to === "/admin"}
                        className={({ isActive }) =>
                          `flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition ${
                            isActive
                              ? "bg-primary/20 border border-primary/30 text-slate-900"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                          }`
                        }
                      >
                        <span className="flex items-center gap-3">
                          <Icon className="w-4 h-4" />
                          <span className="text-sm font-medium">{item.label}</span>
                        </span>
                        {item.to === "/admin/users" && sectionBadges.users > 0 && (
                          <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] text-white">{sectionBadges.users}</span>
                        )}
                        {item.to === "/admin/requests" && sectionBadges.requests > 0 && (
                          <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] text-white">{sectionBadges.requests}</span>
                        )}
                        {item.to === "/admin/inquiries" && sectionBadges.inquiries > 0 && (
                          <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] text-white">{sectionBadges.inquiries}</span>
                        )}
                        {item.to === "/admin/finance" && sectionBadges.finance > 0 && (
                          <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] text-white">{sectionBadges.finance}</span>
                        )}
                        {item.to === "/admin/partners" && sectionBadges.partners > 0 && (
                          <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] text-white">{sectionBadges.partners}</span>
                        )}
                        {item.to === "/admin/messages" && sectionBadges.messages > 0 && (
                          <span className="rounded-full bg-sky-600 px-2 py-0.5 text-[10px] text-white">{sectionBadges.messages}</span>
                        )}
                      </NavLink>
                    );
                  })}
                </nav>

                <div className="mt-6 rounded-xl border border-emerald-300/30 bg-emerald-500/10 p-3">
                  <p className="text-xs text-emerald-700 font-semibold">Live Ops Status</p>
                  <p className="text-sm mt-1">All core systems operational</p>
                  <p className="text-xs text-slate-600 mt-1">Avg response: 3-7 min</p>
                </div>
              </aside>
            </div>
          )}

          <section className="flex-1 min-w-0">
            <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-xl px-3 sm:px-4 lg:px-6 py-3">
              <div className="flex flex-wrap items-center gap-3 justify-between">
                <div className="flex w-full items-center gap-2 max-w-xl">
                  <button
                    onClick={() => setMobileNavOpen(true)}
                    className="md:hidden rounded-lg border border-slate-200 bg-white p-2"
                    aria-label="Open menu"
                  >
                    <Menu className="w-4 h-4" />
                  </button>
                  <div className="relative min-w-0 flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Global search: users, requests, partners"
                    className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 h-10 text-sm outline-none focus:border-primary/60"
                  />
                  {searchableItems.length > 0 && (
                    <div className="absolute mt-2 w-full rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                      {searchableItems.map((item) => (
                        <p key={item.id} className="rounded-lg px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-100">
                          {item.label}
                        </p>
                      ))}
                    </div>
                  )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    onClick={markSupportSeen}
                    className="relative rounded-lg border border-slate-200 bg-white p-2 hover:bg-white"
                    title="Notifications center"
                  >
                    <Bell className="w-4 h-4" />
                    {urgentCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] leading-4 px-1 text-center animate-pulse">
                        {urgentCount > 9 ? "9+" : urgentCount}
                      </span>
                    )}
                  </button>
                  <button className="rounded-lg border border-slate-200 bg-white p-2 hover:bg-white" title="Quick actions">
                    <Command className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDarkMode((x) => !x)}
                    className="rounded-lg border border-slate-200 bg-white p-2 hover:bg-white"
                    title="Theme toggle"
                  >
                    {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  </button>
                  <CircleUserRound className="w-5 h-5 text-primary" />
                </div>
              </div>

              {urgentCount > 0 && (
                <div className="mt-3 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs text-rose-800">
                      <p className="font-bold inline-flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Urgent Alert: {urgentCount} new item{urgentCount > 1 ? "s" : ""}
                      </p>
                      {latestAlertEvent && <p className="mt-0.5">Latest: {latestAlertEvent.label} at {latestAlertEvent.at}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Link to="/admin/inquiries" className="text-[11px] rounded-md border border-rose-300 bg-white px-2 py-1 text-rose-700">
                        Open Inquiries
                      </Link>
                      <Link to="/admin/requests" className="text-[11px] rounded-md border border-rose-300 bg-white px-2 py-1 text-rose-700">
                        Open Requests
                      </Link>
                      <button
                        onClick={markSupportSeen}
                        className="text-[11px] rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-emerald-700"
                      >
                        Mark Seen
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs rounded-full border border-slate-300 bg-white px-2 py-1 text-slate-600">
                  Role: {role.replaceAll("_", " ")}
                </span>
                {session && (
                  <span className="text-xs rounded-full border border-emerald-300/40 bg-emerald-500/10 px-2 py-1 text-emerald-700">
                    Connected: {session.name} ({session.email})
                  </span>
                )}
                <button
                  onClick={handleLogout}
                  className="text-xs rounded-full border border-rose-300/40 bg-rose-500/10 px-2 py-1 text-rose-700 hover:bg-rose-500/20"
                >
                  Logout
                </button>
              </div>
            </header>

            <main className="p-4 lg:p-6">
              <Outlet />
            </main>
          </section>
        </div>
      </div>
    </div>
  );
};

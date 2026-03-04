import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import {
  Bell,
  CircleUserRound,
  Command,
  DollarSign,
  LayoutDashboard,
  MailQuestion,
  MessageSquareText,
  Moon,
  Search,
  Settings,
  Sun,
  Truck,
  Users,
  FileClock,
} from "lucide-react";
import { useAdminDemo } from "@/admin/AdminDemoContext";
import { hasPermission } from "@/admin/rbac";
import { clearAdminSession, getAdminSession } from "@/lib/session";
import { adminAPI, supportAPI, type AdminServiceDTO, type AdminUserDTO, type SupportConversationDTO } from "@/lib/api";

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

export const AdminShell = () => {
  const { role } = useAdminDemo();
  const [query, setQuery] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [searchUsers, setSearchUsers] = useState<AdminUserDTO[]>([]);
  const [searchRequests, setSearchRequests] = useState<AdminServiceDTO[]>([]);
  const [searchConversations, setSearchConversations] = useState<SupportConversationDTO[]>([]);
  const session = getAdminSession();

  const handleLogout = () => {
    clearAdminSession();
    window.location.assign("/admin-login");
  };

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

  const searchableItems = useMemo(() => {
    if (!query.trim()) return [];
    const combined = [
      ...searchUsers.map((u) => ({ id: `u-${u.id}`, label: `${u.name} (${u.phone})` })),
      ...searchRequests.map((r) => ({ id: `r-${r.id}`, label: `Request #${r.id} ${r.service_type}` })),
      ...searchConversations.map((c) => ({ id: `c-${c.id}`, label: `${c.customer_name} (${c.channel.replaceAll("_", " ")})` })),
    ];
    return combined.slice(0, 6);
  }, [query, searchConversations, searchRequests, searchUsers]);

  const visibleItems = navItems.filter((item) => hasPermission(role, item.permission));

  return (
    <div className={darkMode ? "dark" : ""}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-primary/10 text-slate-900">
        <div className="flex min-h-screen">
          <aside className="w-20 lg:w-72 border-r border-slate-200 bg-white/95 backdrop-blur-xl px-3 py-4">
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
                    <span className="hidden lg:block text-sm font-medium">{item.label}</span>
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

          <section className="flex-1 min-w-0">
            <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-xl px-4 lg:px-6 py-3">
              <div className="flex flex-wrap items-center gap-3 justify-between">
                <div className="relative w-full max-w-xl">
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

                <div className="flex items-center gap-2">
                  <button className="rounded-lg border border-slate-200 bg-white p-2 hover:bg-white" title="Notifications center">
                    <Bell className="w-4 h-4" />
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

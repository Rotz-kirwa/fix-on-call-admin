import { useMemo, useState } from "react";
import { useAdminDemo } from "@/admin/AdminDemoContext";
import { exportToCsv } from "@/admin/utils";
import { StatusBadge } from "@/admin/components/StatusBadge";
import { adminAPI, type AdminUserDTO } from "@/lib/api";
import { useEffect } from "react";
import { formatNairobiDate, formatNairobiDateTime } from "@/lib/time";

const UsersPage = () => {
  const { role, addAudit } = useAdminDemo();
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "createdAt">("createdAt");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [usersRaw, setUsersRaw] = useState<AdminUserDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [moderating, setModerating] = useState<"suspend" | "ban" | "activate" | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await adminAPI.getUsers({ per_page: 200 });
      const rows = (res.data?.users || []) as AdminUserDTO[];
      setUsersRaw(rows);
      if (!selectedUserId && rows.length > 0) setSelectedUserId(String(rows[0].id));
    } catch (e: any) {
      setError(e?.response?.data?.error || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchUsers();
  }, []);

  const normalizedUsers = useMemo(
    () =>
      usersRaw.map((user) => ({
        id: String(user.id),
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.user_type,
        status: user.is_active ? "active" : "suspended",
        locationLastSeen: "N/A",
        createdAtRaw: user.created_at || "",
        createdAt: formatNairobiDate(user.created_at),
      })),
    [usersRaw]
  );

  const users = useMemo(() => {
    const filtered = normalizedUsers.filter((user) => (filterStatus === "all" ? true : user.status === filterStatus));
    return [...filtered].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return b.createdAtRaw.localeCompare(a.createdAtRaw);
    });
  }, [normalizedUsers, filterStatus, sortBy]);

  const selectedUser = normalizedUsers.find((x) => x.id === selectedUserId);
  const selectedUserRaw = usersRaw.find((x) => String(x.id) === selectedUserId);

  const saveView = () => {
    localStorage.setItem("admin-users-view", JSON.stringify({ filterStatus, sortBy }));
    addAudit("USERS_VIEW_SAVED", `status=${filterStatus}, sort=${sortBy}`);
  };

  const onModerate = async (action: "suspend" | "ban" | "activate") => {
    if (!selectedUserRaw) return;
    try {
      setModerating(action);
      setError("");
      if (action === "suspend") {
        await adminAPI.suspendUser(selectedUserRaw.id);
      } else if (action === "ban") {
        await adminAPI.banUser(selectedUserRaw.id);
      } else {
        await adminAPI.activateUser(selectedUserRaw.id);
      }
      addAudit("USER_STATUS_CHANGED", `${selectedUserRaw.id} -> ${action}`);
      await fetchUsers();
    } catch (e: any) {
      setError(e?.response?.data?.error || `Failed to ${action} user.`);
    } finally {
      setModerating(null);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <section className="xl:col-span-2 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap gap-2 items-center justify-between mb-3">
          <h2 className="font-bold text-slate-900">Users (Drivers + Providers)</h2>
          <div className="flex gap-2">
            <select className="h-9 rounded-lg bg-white border border-slate-200 px-2 text-xs text-slate-700" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="banned">Banned</option>
            </select>
            <select className="h-9 rounded-lg bg-white border border-slate-200 px-2 text-xs text-slate-700" value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
              <option value="createdAt">Sort: Created date</option>
              <option value="name">Sort: Name</option>
            </select>
            <button onClick={saveView} className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs">Save view</button>
            <button onClick={() => exportToCsv("users.csv", users)} className="h-9 rounded-lg border border-primary/30 bg-primary/10 px-3 text-xs">Export CSV</button>
          </div>
        </div>

        {error && <p className="text-xs text-rose-600 mb-3">{error}</p>}

        <div className="overflow-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="text-left px-3 py-2">Name</th>
                <th className="text-left px-3 py-2">Phone</th>
                <th className="text-left px-3 py-2">Email</th>
                <th className="text-left px-3 py-2">Role</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Last Seen</th>
                <th className="text-left px-3 py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  onClick={() => setSelectedUserId(user.id)}
                  className="border-t border-slate-200 hover:bg-white cursor-pointer"
                >
                  <td className="px-3 py-2 text-slate-900">{user.name}</td>
                  <td className="px-3 py-2">{user.phone}</td>
                  <td className="px-3 py-2">{user.email}</td>
                  <td className="px-3 py-2 capitalize">{user.role}</td>
                  <td className="px-3 py-2"><StatusBadge status={user.status} /></td>
                  <td className="px-3 py-2">{user.locationLastSeen}</td>
                  <td className="px-3 py-2">{user.createdAt}</td>
                </tr>
              ))}
              {!users.length && !loading && (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-slate-500">No users found for this filter.</td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-slate-500">Loading users...</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <aside className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="font-bold text-slate-900 mb-3">User Profile</h2>
        {!selectedUser ? (
          <p className="text-sm text-slate-600">Select a user to inspect profile details.</p>
        ) : (
          <div className="space-y-3 text-sm">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
              <p className="text-slate-500 text-xs">Full details</p>
              <p className="text-slate-900 font-semibold">{selectedUser.name}</p>
              <p>{selectedUser.phone}</p>
              <p className="break-all">{selectedUser.email}</p>
              <p className="text-slate-700 mt-1">Role: {selectedUser.role}</p>
              <p className="text-slate-700">Status: {selectedUser.status}</p>
              <p className="text-slate-700">User ID: {selectedUser.id}</p>
              <p className="text-slate-700">Created: {selectedUser.createdAt}</p>
              <p className="text-slate-700">
                Last Login: {formatNairobiDateTime(selectedUserRaw?.last_login)}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
              <p className="text-slate-500 text-xs">Verification + history</p>
              <p className="text-slate-700">Verification: {selectedUserRaw?.is_verified ? "KYC verified" : "KYC pending"}</p>
              <p className="text-slate-700">
                Updated: {formatNairobiDateTime(selectedUserRaw?.updated_at)}
              </p>
              {selectedUserRaw?.vehicle_info && (
                <p className="text-slate-700">
                  Vehicle: {selectedUserRaw.vehicle_info.make || "-"} {selectedUserRaw.vehicle_info.model || ""}{" "}
                  {selectedUserRaw.vehicle_info.license_plate ? `(${selectedUserRaw.vehicle_info.license_plate})` : ""}
                </p>
              )}
              {selectedUserRaw?.specialization && selectedUserRaw.specialization.length > 0 && (
                <p className="text-slate-700">Specialization: {selectedUserRaw.specialization.join(", ")}</p>
              )}
              {selectedUserRaw?.company_name && (
                <p className="text-slate-700">
                  Company: {selectedUserRaw.company_name}
                  {selectedUserRaw.partner_type ? ` (${selectedUserRaw.partner_type})` : ""}
                </p>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => void onModerate("suspend")}
                disabled={moderating !== null}
                className="rounded-lg border border-amber-300/40 bg-amber-500/10 px-2 py-2 text-xs text-amber-700 font-semibold disabled:opacity-40"
              >
                {moderating === "suspend" ? "Suspending..." : "Suspend"}
              </button>
              <button
                onClick={() => void onModerate("ban")}
                disabled={moderating !== null}
                className="rounded-lg border border-rose-300/40 bg-rose-500/10 px-2 py-2 text-xs text-rose-700 font-semibold disabled:opacity-40"
              >
                {moderating === "ban" ? "Banning..." : "Ban"}
              </button>
              <button
                onClick={() => void onModerate("activate")}
                disabled={moderating !== null}
                className="rounded-lg border border-emerald-300/40 bg-emerald-500/10 px-2 py-2 text-xs text-emerald-700 font-semibold disabled:opacity-40"
              >
                {moderating === "activate" ? "Activating..." : "Activate"}
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
};

export default UsersPage;

import { useState } from "react";
import { useAdminDemo } from "@/admin/AdminDemoContext";
import { hasPermission } from "@/admin/rbac";
import { exportToCsv } from "@/admin/utils";
import { useEffect } from "react";
import { adminAPI, type AdminUserDTO } from "@/lib/api";

const SettingsPage = () => {
  const { audits, role, addAudit } = useAdminDemo();
  const canManage = hasPermission(role, "settings:manage");
  const canAudit = hasPermission(role, "audit:view");
  const [admins, setAdmins] = useState<AdminUserDTO[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);

  const [commission, setCommission] = useState("12");
  const [coverage, setCoverage] = useState("Nairobi, Kiambu, Mombasa");
  const [fraudThreshold, setFraudThreshold] = useState("75");

  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        setLoadingAdmins(true);
        const res = await adminAPI.getUsers({ user_type: "admin", per_page: 100 });
        setAdmins((res.data?.users || []) as AdminUserDTO[]);
      } catch {
        setAdmins([]);
      } finally {
        setLoadingAdmins(false);
      }
    };
    void fetchAdmins();
  }, []);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="font-bold text-slate-900 mb-3">Admins & Roles</h2>
        <div className="overflow-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="text-left px-3 py-2">Name</th>
                <th className="text-left px-3 py-2">Email</th>
                <th className="text-left px-3 py-2">Role</th>
                <th className="text-left px-3 py-2">Active</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin.id} className="border-t border-slate-200">
                  <td className="px-3 py-2 text-slate-900">{admin.name}</td>
                  <td className="px-3 py-2">{admin.email}</td>
                  <td className="px-3 py-2">{admin.user_type.replaceAll("_", " ")}</td>
                  <td className="px-3 py-2">{admin.is_active ? "Yes" : "No"}</td>
                </tr>
              ))}
              {!admins.length && !loadingAdmins && (
                <tr className="border-t border-slate-200">
                  <td colSpan={4} className="px-3 py-4 text-sm text-slate-500 text-center">No admin users found.</td>
                </tr>
              )}
              {loadingAdmins && (
                <tr className="border-t border-slate-200">
                  <td colSpan={4} className="px-3 py-4 text-sm text-slate-500 text-center">Loading admins...</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="font-bold text-slate-900 mb-3">System Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <p className="text-xs text-slate-600 mb-1">Commission %</p>
            <input value={commission} onChange={(e) => setCommission(e.target.value)} className="w-full h-10 rounded-lg bg-slate-900 border border-slate-200 px-2" />
          </div>
          <div>
            <p className="text-xs text-slate-600 mb-1">Coverage zones</p>
            <input value={coverage} onChange={(e) => setCoverage(e.target.value)} className="w-full h-10 rounded-lg bg-slate-900 border border-slate-200 px-2" />
          </div>
          <div>
            <p className="text-xs text-slate-600 mb-1">Fraud threshold</p>
            <input value={fraudThreshold} onChange={(e) => setFraudThreshold(e.target.value)} className="w-full h-10 rounded-lg bg-slate-900 border border-slate-200 px-2" />
          </div>
          <div>
            <p className="text-xs text-slate-600 mb-1">Notification rules</p>
            <select className="w-full h-10 rounded-lg bg-slate-900 border border-slate-200 px-2">
              <option>SMS + Email + Push</option>
              <option>Email + Push</option>
              <option>SMS only</option>
            </select>
          </div>
        </div>

        <button
          disabled={!canManage}
          onClick={() => addAudit("SETTINGS_UPDATED", `commission=${commission}, fraud=${fraudThreshold}`)}
          className="mt-3 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm disabled:opacity-40"
        >
          Save Settings
        </button>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-slate-900">Audit Logs</h2>
          <button
            disabled={!canAudit}
            onClick={() => exportToCsv("audit-logs.csv", audits)}
            className="rounded-lg border border-emerald-300/30 bg-emerald-500/10 px-3 py-2 text-xs disabled:opacity-40"
          >
            Export Logs
          </button>
        </div>
        <div className="max-h-80 overflow-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="text-left px-3 py-2">Timestamp</th>
                <th className="text-left px-3 py-2">Actor</th>
                <th className="text-left px-3 py-2">Action</th>
                <th className="text-left px-3 py-2">Metadata</th>
              </tr>
            </thead>
            <tbody>
              {audits.map((log) => (
                <tr key={log.id} className="border-t border-slate-200">
                  <td className="px-3 py-2">{log.timestamp}</td>
                  <td className="px-3 py-2">{log.actor}</td>
                  <td className="px-3 py-2">{log.action}</td>
                  <td className="px-3 py-2">{log.metadata}</td>
                </tr>
              ))}
              {!audits.length && (
                <tr className="border-t border-slate-200">
                  <td colSpan={4} className="px-3 py-4 text-sm text-slate-500 text-center">No audit logs yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
};

export default SettingsPage;

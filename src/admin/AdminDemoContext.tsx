import { createContext, useContext, useMemo, useState } from "react";
import { AdminRole, AuditLog } from "./types";
import { getAdminSession } from "@/lib/session";

interface AdminDemoContextValue {
  role: AdminRole;
  audits: AuditLog[];
  addAudit: (action: string, metadata: string) => void;
}

const AdminDemoContext = createContext<AdminDemoContextValue | null>(null);
const AUDIT_KEY = "fixoncall-admin-audits";

const now = () => new Date().toISOString().slice(0, 16).replace("T", " ");

export const AdminDemoProvider = ({ children }: { children: React.ReactNode }) => {
  const [role] = useState<AdminRole>(() => {
    const session = getAdminSession();
    return session?.role || "admin";
  });
  const [audits, setAudits] = useState<AuditLog[]>(() => {
    try {
      const raw = localStorage.getItem(AUDIT_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as AuditLog[]) : [];
    } catch {
      return [];
    }
  });

  const addAudit = (action: string, metadata: string) => {
    const actor = role.replaceAll("_", " ");
    const entry: AuditLog = {
      id: `log-${crypto.randomUUID().slice(0, 8)}`,
      timestamp: now(),
      actor,
      action,
      metadata,
    };
    setAudits((prev) => {
      const next = [entry, ...prev].slice(0, 500);
      localStorage.setItem(AUDIT_KEY, JSON.stringify(next));
      return next;
    });
  };

  const value = useMemo(
    () => ({
      role,
      audits,
      addAudit,
    }),
    [audits, role]
  );

  return <AdminDemoContext.Provider value={value}>{children}</AdminDemoContext.Provider>;
};

export const useAdminDemo = () => {
  const ctx = useContext(AdminDemoContext);
  if (!ctx) throw new Error("useAdminDemo must be used within AdminDemoProvider");
  return ctx;
};

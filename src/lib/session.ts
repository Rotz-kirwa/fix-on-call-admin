import { AdminRole } from "@/admin/types";

export interface AdminSession {
  token: string;
  name: string;
  email: string;
  role: AdminRole;
  source: "main_site" | "local";
}

const KEY = "fixoncall-admin-session";
const allowedRoles: AdminRole[] = [
  "super_admin",
  "admin",
  "support_agent",
  "finance",
  "dispatch",
  "partner_manager",
];

const isAdminRole = (value: string): value is AdminRole => allowedRoles.includes(value as AdminRole);

export const bootstrapAdminSession = () => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  const name = params.get("name");
  const email = params.get("email");
  const roleParam = params.get("role");

  if (token && roleParam && isAdminRole(roleParam)) {
    const session: AdminSession = {
      token,
      name: name || "Admin User",
      email: email || "info@fixoncall.com",
      role: roleParam,
      source: "main_site",
    };
    localStorage.setItem(KEY, JSON.stringify(session));

    const cleanUrl = `${window.location.origin}${window.location.pathname}`;
    window.history.replaceState({}, document.title, cleanUrl);
    return session;
  }

  return getAdminSession();
};

export const getAdminSession = (): AdminSession | null => {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AdminSession>;
    if (!parsed.role || !isAdminRole(parsed.role)) return null;
    return {
      token: parsed.token || "",
      name: parsed.name || "Admin User",
      email: parsed.email || "info@fixoncall.com",
      role: parsed.role,
      source: parsed.source || "local",
    };
  } catch {
    return null;
  }
};

export const setAdminSession = (session: AdminSession) => {
  localStorage.setItem(KEY, JSON.stringify(session));
};

export const clearAdminSession = () => {
  localStorage.removeItem(KEY);
};

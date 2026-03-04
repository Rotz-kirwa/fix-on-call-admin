import { AdminRole } from "./types";

export type AdminPermission =
  | "overview:view"
  | "dispatch:view"
  | "dispatch:assign"
  | "users:view"
  | "users:manage"
  | "requests:view"
  | "requests:refund"
  | "finance:view"
  | "finance:export"
  | "partners:view"
  | "partners:verify"
  | "messages:view"
  | "messages:assign"
  | "settings:view"
  | "settings:manage"
  | "audit:view"
  | "sensitive:reveal";

const matrix: Record<AdminRole, AdminPermission[]> = {
  super_admin: [
    "overview:view",
    "dispatch:view",
    "dispatch:assign",
    "users:view",
    "users:manage",
    "requests:view",
    "requests:refund",
    "finance:view",
    "finance:export",
    "partners:view",
    "partners:verify",
    "messages:view",
    "messages:assign",
    "settings:view",
    "settings:manage",
    "audit:view",
    "sensitive:reveal",
  ],
  admin: [
    "overview:view",
    "dispatch:view",
    "dispatch:assign",
    "users:view",
    "users:manage",
    "requests:view",
    "requests:refund",
    "finance:view",
    "finance:export",
    "partners:view",
    "partners:verify",
    "messages:view",
    "messages:assign",
    "settings:view",
    "audit:view",
  ],
  support_agent: ["overview:view", "users:view", "requests:view", "messages:view", "messages:assign"],
  finance: ["overview:view", "finance:view", "finance:export", "requests:view", "audit:view"],
  dispatch: ["overview:view", "dispatch:view", "dispatch:assign", "requests:view", "messages:view"],
  partner_manager: ["overview:view", "partners:view", "partners:verify", "users:view", "audit:view"],
};

export const hasPermission = (role: AdminRole, permission: AdminPermission) => {
  return matrix[role]?.includes(permission) ?? false;
};

export const allAdminRoles: AdminRole[] = [
  "super_admin",
  "admin",
  "support_agent",
  "finance",
  "dispatch",
  "partner_manager",
];

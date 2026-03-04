import axios from "axios";
import { clearAdminSession, getAdminSession } from "./session";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const session = getAdminSession();
  if (session?.token) {
    config.headers.Authorization = `Bearer ${session.token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      clearAdminSession();
    }
    return Promise.reject(error);
  }
);

export interface SupportConversationDTO {
  id: number;
  channel: string;
  status: "open" | "waiting" | "resolved";
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  assigned_to?: string;
  request_id?: string;
  tags: string[];
  last_message?: string;
  last_message_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SupportMessageDTO {
  id: number;
  conversation_id: number;
  sender: "user" | "agent" | "operator" | "system";
  body: string;
  created_at: string;
}

export const supportAPI = {
  listConversations: (params?: { q?: string; channel?: string; status?: string; tag?: string }) =>
    api.get("/support/conversations", { params }),
  listMessages: (conversationId: number) => api.get(`/support/conversations/${conversationId}/messages`),
  sendMessage: (conversationId: number, body: string, sender: string = "agent") =>
    api.post(`/support/conversations/${conversationId}/messages`, { body, sender }),
  updateConversation: (conversationId: number, data: { assigned_to?: string; status?: string; tags?: string[] }) =>
    api.patch(`/support/conversations/${conversationId}`, data),
};

export interface AdminUserDTO {
  id: number;
  name: string;
  email: string;
  phone: string;
  user_type: string;
  is_active: boolean;
  is_verified?: boolean;
  created_at: string;
  updated_at?: string;
  last_login?: string | null;
  vehicle_info?: {
    make?: string;
    model?: string;
    year?: number;
    license_plate?: string;
  };
  specialization?: string[];
  experience_years?: number;
  company_name?: string;
  partner_type?: string;
}

export interface AdminDashboardDTO {
  statistics: {
    total_users: number;
    total_mechanics: number;
    total_partners: number;
    total_services: number;
    active_services: number;
  };
  recent_services: Array<Record<string, unknown>>;
  service_types: Array<{ _id: string; count: number }>;
  revenue_trend?: Array<{ label: string; value: number }>;
}

export interface AdminServiceDTO {
  id: number;
  user_id: number;
  service_type: string;
  location: {
    area?: string;
    landmark?: string;
    latitude?: number;
    longitude?: number;
  };
  description?: string;
  status: string;
  priority?: string;
  assigned_to?: number | null;
  created_at?: string;
  updated_at?: string;
  price_estimate?: number;
  final_price?: number;
  payment_status?: string;
}

export const adminAPI = {
  getDashboard: () => api.get("/admin/dashboard"),
  getUsers: (params?: { user_type?: string; search?: string; page?: number; per_page?: number }) =>
    api.get("/admin/users", { params }),
  getServices: (params?: { status?: string; service_type?: string; page?: number; per_page?: number }) =>
    api.get("/admin/services", { params }),
  updateServiceStatus: (serviceId: number, status: string) =>
    api.put(`/services/${serviceId}/status`, { status }),
  suspendUser: (userId: number) => api.post(`/admin/users/${userId}/suspend`),
  banUser: (userId: number) => api.post(`/admin/users/${userId}/ban`),
  activateUser: (userId: number) => api.post(`/admin/users/${userId}/activate`),
};

export default api;

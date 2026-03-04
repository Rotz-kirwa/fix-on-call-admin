export type AdminRole =
  | "super_admin"
  | "admin"
  | "support_agent"
  | "finance"
  | "dispatch"
  | "partner_manager";

export type RequestStatus =
  | "pending"
  | "active"
  | "in_progress"
  | "arrived"
  | "resolved"
  | "cancelled";

export type VerificationStatus = "pending" | "verified" | "rejected";
export type PaymentStatus = "pending" | "paid" | "failed" | "fraud_risk";

export interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: "driver" | "provider" | "admin";
  status: "active" | "suspended" | "banned";
  locationLastSeen: string;
  createdAt: string;
}

export interface ProviderProfile {
  id: string;
  userId: string;
  companyName: string;
  services: string[];
  coverageRadiusKm: number;
  verification: VerificationStatus;
}

export interface ServiceRequest {
  id: string;
  customerName: string;
  serviceType: string;
  status: RequestStatus;
  area: string;
  providerAssigned: string;
  paymentStatus: PaymentStatus;
  createdAt: string;
  priority: "low" | "medium" | "high" | "emergency";
  distanceKm: number;
  etaMin: number;
  anomaly: "none" | "duplicate_request" | "location_mismatch";
}

export interface LocationPing {
  id: string;
  requestId: string;
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: string;
}

export interface Transaction {
  id: string;
  mpesaRef: string;
  amount: number;
  userName: string;
  providerName: string;
  status: PaymentStatus;
  time: string;
  riskScore: number;
}

export interface Payout {
  id: string;
  providerName: string;
  amount: number;
  period: string;
  status: "pending" | "paid";
}

export interface PartnerApplication {
  id: string;
  companyName: string;
  contact: string;
  capabilities: string[];
  coverageRadiusKm: number;
  stage: "new" | "under_review" | "verified" | "rejected";
  score: number;
  submittedAt: string;
}

export interface Conversation {
  id: string;
  channel: "live_chat" | "inquiry";
  customer: string;
  status: "open" | "waiting" | "resolved";
  assignedTo: string;
  slaMinutes: number;
  tags: string[];
  requestId?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  sender: "customer" | "agent" | "system";
  body: string;
  time: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  active: boolean;
}

export interface AuditLog {
  id: string;
  actor: string;
  action: string;
  metadata: string;
  timestamp: string;
}

export interface ActivityEvent {
  id: string;
  text: string;
  type: "request" | "dispatch" | "location" | "payment" | "partner";
  time: string;
}

export interface AdminSeed {
  kpis: {
    totalUsers: number;
    activeRequests: number;
    completedJobs: number;
    revenueToday: number;
    revenueWeek: number;
    revenueMonth: number;
    avgResponseMin: number;
    csat: number;
  };
  activity: ActivityEvent[];
  revenueTrend: { label: string; value: number }[];
  requestsTrend: { label: string; value: number }[];
  topCategories: { name: string; jobs: number }[];
  users: User[];
  providers: ProviderProfile[];
  requests: ServiceRequest[];
  locationPings: LocationPing[];
  transactions: Transaction[];
  payouts: Payout[];
  applications: PartnerApplication[];
  conversations: Conversation[];
  messages: Message[];
  admins: AdminUser[];
  audits: AuditLog[];
}

export const schemaDraft = [
  "User(id, name, phone, email, role, status, createdAt)",
  "ProviderProfile(id, userId, companyName, services[], coverageRadiusKm, verification)",
  "ServiceRequest(id, customerId, providerId, serviceType, status, area, priority, paymentStatus, createdAt)",
  "LocationPing(id, requestId, lat, lng, accuracy, timestamp)",
  "Transaction(id, requestId, mpesaRef, amount, status, riskScore, time)",
  "Payout(id, providerId, amount, period, status)",
  "PartnerApplication(id, companyName, capabilities[], stage, score, submittedAt)",
  "Conversation(id, requestId?, channel, assignedTo, status, slaMinutes)",
  "Message(id, conversationId, sender, body, time)",
  "AdminUser(id, name, email, role, active)",
  "AuditLog(id, actor, action, metadata, timestamp)",
];

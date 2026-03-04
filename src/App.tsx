import { Navigate, Route, Routes } from "react-router-dom";
import AdminLayout from "@/admin/pages/AdminLayout";
import OverviewPage from "@/admin/pages/OverviewPage";
import UsersPage from "@/admin/pages/UsersPage";
import RequestsPage from "@/admin/pages/RequestsPage";
import FinancePage from "@/admin/pages/FinancePage";
import PartnersPage from "@/admin/pages/PartnersPage";
import MessagingPage from "@/admin/pages/MessagingPage";
import SettingsPage from "@/admin/pages/SettingsPage";
import InquiriesPage from "@/admin/pages/InquiriesPage";
import AdminSignIn from "@/pages/AdminSignIn";
import { getAdminSession } from "@/lib/session";

const App = () => {
  const session = getAdminSession();
  const isAuthed = Boolean(session?.token);

  return (
    <Routes>
      <Route path="/" element={<Navigate to={isAuthed ? "/admin" : "/admin-login"} replace />} />
      <Route path="/admin-login" element={isAuthed ? <Navigate to="/admin" replace /> : <AdminSignIn />} />
      <Route path="/admin" element={isAuthed ? <AdminLayout /> : <Navigate to="/admin-login" replace />}>
        <Route index element={<OverviewPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="requests" element={<RequestsPage />} />
        <Route path="inquiries" element={<InquiriesPage />} />
        <Route path="finance" element={<FinancePage />} />
        <Route path="partners" element={<PartnersPage />} />
        <Route path="messages" element={<MessagingPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to={isAuthed ? "/admin" : "/admin-login"} replace />} />
    </Routes>
  );
};

export default App;

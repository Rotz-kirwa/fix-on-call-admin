import { AdminDemoProvider } from "@/admin/AdminDemoContext";
import { AdminShell } from "@/admin/components/AdminShell";

const AdminLayout = () => {
  return (
    <AdminDemoProvider>
      <AdminShell />
    </AdminDemoProvider>
  );
};

export default AdminLayout;

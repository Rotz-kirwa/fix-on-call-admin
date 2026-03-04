import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { setAdminSession } from "@/lib/session";
import { Eye, EyeOff } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const AdminSignIn = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("info@fixoncall.com");
  const [password, setPassword] = useState("1362");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();

    if (!normalizedEmail || !normalizedPassword) {
      setError("Email and password are required.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await axios.post(`${API_URL}/auth/login`, {
        email: normalizedEmail,
        password: normalizedPassword,
      });
      const user = res.data?.user;
      const token = res.data?.token;

      if (!token || !user) {
        setError("Invalid login response from server.");
        return;
      }

      if (user.user_type !== "admin") {
        setError("This account is not an admin account.");
        return;
      }

      setAdminSession({
        token,
        role: "admin",
        name: user.name || "Admin",
        email: user.email || normalizedEmail,
        source: "local",
      });
      window.location.assign("/admin");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
        <h1 className="text-2xl font-black text-slate-900">Admin Sign In</h1>
        <p className="text-sm text-slate-600 mt-1">Use your backend admin account to open command center.</p>

        <form onSubmit={onSubmit} className="space-y-4 mt-5">
          <div>
            <label className="text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full h-10 rounded-lg border border-slate-300 px-3"
              placeholder="info@fixoncall.com"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Password</label>
            <div className="relative mt-1.5">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-10 rounded-lg border border-slate-300 px-3 pr-10"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {error && <p className="text-xs text-rose-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-lg border border-primary/30 bg-primary/10 text-slate-900 font-semibold disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminSignIn;

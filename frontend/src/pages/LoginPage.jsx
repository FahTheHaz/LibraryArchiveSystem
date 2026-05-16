import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login } from "../api/auth";
import TurnstileWidget from "../components/TurnstileWidget";

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!captchaToken) {
      setError("Please complete the CAPTCHA.");
      return;
    }
    setLoading(true);
    const { ok, data } = await login(form.username, form.password, captchaToken);
    setLoading(false);
    if (ok) {
      localStorage.setItem("las_role", String(data.roleID));
      navigate("/browse");
    } else {
      setError(data.error || "Login failed.");
      setCaptchaToken("");
      if (window.turnstile) window.turnstile.reset();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl border border-gray-200 p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Sign in</h1>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded p-2 mb-4">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              name="username"
              value={form.username}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <TurnstileWidget onVerify={setCaptchaToken} />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg text-sm transition disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-4 text-sm text-center space-y-1">
          <p>
            <Link to="/forgot-password" className="text-blue-600 hover:underline">
              Forgot password?
            </Link>
          </p>
          <p className="text-gray-500">
            No account?{" "}
            <Link to="/register" className="text-blue-600 hover:underline">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

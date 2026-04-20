import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { resetPassword } from "../api/auth";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";

  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setStatus(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setStatus({ type: "error", message: "Passwords do not match." });
      return;
    }
    setLoading(true);
    const { ok, data } = await resetPassword(token, form.password, form.confirmPassword);
    setLoading(false);
    if (ok) {
      navigate("/login");
    } else {
      setStatus({ type: "error", message: data.error || "Reset failed." });
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl shadow p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Set new password</h1>

        {!token && (
          <p className="text-sm text-red-600">Invalid or missing reset token.</p>
        )}

        {status && (
          <p className={`text-sm rounded p-2 mb-4 ${status.type === "success" ? "text-green-700 bg-green-50" : "text-red-600 bg-red-50"}`}>
            {status.message}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { name: "password",        label: "New Password" },
            { name: "confirmPassword", label: "Confirm Password" },
          ].map(({ name, label }) => (
            <div key={name}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input
                type="password"
                name={name}
                value={form[name]}
                onChange={handleChange}
                required
                disabled={!token}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>
          ))}

          <button
            type="submit"
            disabled={loading || !token}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg text-sm transition disabled:opacity-50"
          >
            {loading ? "Resetting..." : "Reset password"}
          </button>
        </form>
      </div>
    </div>
  );
}

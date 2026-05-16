import { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "../api/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    const { ok, data } = await forgotPassword(email);
    setLoading(false);
    setStatus({
      type: ok ? "success" : "error",
      message: data.message ?? data.error ?? (ok ? "Check your email for a reset link." : "Request failed."),
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl border border-gray-200 p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Forgot password</h1>
        <p className="text-sm text-gray-500 mb-6">Enter your email and we'll send a reset link.</p>

        {status && (
          <p className={`text-sm rounded p-2 mb-4 ${status.type === "success" ? "text-green-700 bg-green-50" : "text-red-600 bg-red-50"}`}>
            {status.message}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg text-sm transition disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>

        <p className="mt-4 text-sm text-center">
          <Link to="/login" className="text-blue-600 hover:underline">Back to login</Link>
        </p>
      </div>
    </div>
  );
}

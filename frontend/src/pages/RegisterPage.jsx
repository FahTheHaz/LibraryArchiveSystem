import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register } from "../api/auth";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    studentID: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    const { ok, data } = await register(form);
    setLoading(false);
    if (ok) {
      navigate("/login");
    } else {
      setError(data.error || "Registration failed.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl shadow p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Create account</h1>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded p-2 mb-4">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { name: "studentID", label: "Student ID" },
            { name: "username",  label: "Username" },
            { name: "email",     label: "Email", type: "email" },
            { name: "password",  label: "Password", type: "password" },
            { name: "confirmPassword", label: "Confirm Password", type: "password" },
          ].map(({ name, label, type = "text" }) => (
            <div key={name}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input
                type={type}
                name={name}
                value={form[name]}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg text-sm transition disabled:opacity-50"
          >
            {loading ? "Registering..." : "Register"}
          </button>
        </form>

        <p className="mt-4 text-sm text-center text-gray-500">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-600 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

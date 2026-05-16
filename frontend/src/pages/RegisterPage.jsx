import { useState } from "react";
import { Link } from "react-router-dom";
import { register } from "../api/auth";
import TurnstileWidget from "../components/TurnstileWidget";

export default function RegisterPage() {
  const [form, setForm] = useState({
    studentID: "",
    academicYear: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");

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
    if (!captchaToken) {
      setError("Please complete the CAPTCHA.");
      return;
    }
    setLoading(true);
    let result;
    try {
      result = await register({ ...form, captchaToken });
    } catch (err) {
      setLoading(false);
      setError(`Network error: ${err.message}`);
      return;
    }
    setLoading(false);
    const { ok, data, status } = result;

    if (ok) {
      setSuccess(data.message || "Registration successful! Your account is pending approval.");
    } else {
      if (status === 400) {
        setError(Array.isArray(data.errors) ? data.errors.join(" ") : (data.error || "Invalid input."));
      } else if (status === 409) {
        setError(data.error || "Username, email, or student ID already in use.");
      } else if (status === 422) {
        setError(data.error || "CAPTCHA failed. Please try again.");
        setCaptchaToken("");
        if (window.turnstile) window.turnstile.reset();
      } else {
        setError(`Server error ${status}: ${data.error || JSON.stringify(data)}`);
      }
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-xl border border-gray-200 p-8 w-full max-w-sm text-center">
          <div className="text-green-600 text-4xl mb-4">✓</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Registration submitted</h1>
          <p className="text-sm text-gray-600 mb-6">{success}</p>
          <Link to="/login" className="text-blue-600 hover:underline text-sm">Back to login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl border border-gray-200 p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Create account</h1>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded p-2 mb-4">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { name: "studentID",       label: "Student ID" },
            { name: "academicYear",    label: "Academic Year" },
            { name: "username",        label: "Username" },
            { name: "email",           label: "Email",            type: "email" },
            { name: "password",        label: "Password",         type: "password" },
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

          <TurnstileWidget onVerify={setCaptchaToken} />

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

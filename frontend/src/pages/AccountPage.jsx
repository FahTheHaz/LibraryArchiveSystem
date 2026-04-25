import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { getAccountInfo, updateAccount } from "../api/auth";

export default function AccountPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [original, setOriginal] = useState({});
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getAccountInfo().then(({ ok, data, status: s }) => {
      if (s === 401) { navigate("/login"); return; }
      if (ok) {
        setForm({ username: data.username, email: data.email, password: "" });
        setOriginal({ username: data.username, email: data.email });
      }
      setLoading(false);
    });
  }, []);
  // What does the empty "[]" do? It makes it run only once on page load. Otherwise it would run every time the form changes,
  // which would be bad, i think

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setStatus(null);
  }
  // Updates the form state whenever an input field changes. It also resets any status messages.

  async function handleSubmit(e) {
    // Handles form submission to update account info. Checks for changes, sends the update request, and shows success/error messages.
    e.preventDefault();
    setSaving(true);
    setStatus(null);

    const payload = {};
    if (form.username !== original.username) payload.username = form.username;
    if (form.email    !== original.email) payload.email    = form.email;
    if (form.password.trim()) payload.password = form.password;
    // from the form, we only want to send the fields that have changed. 
    // the filled ones will be included.
    // Because why not

    if (!Object.keys(payload).length) {
      setStatus({ type: "error", message: "No changes to save." });
      setSaving(false);
      return;
    }
    // When empty

    const { ok, data } = await updateAccount(payload);
    setSaving(false);

    if (ok) {
      setStatus({ type: "success", message: data.message });
      setOriginal({ username: form.username, email: form.email });
      setForm((prev) => ({ ...prev, password: "" }));
    } else {
      setStatus({ type: "error", message: data.error || "Update failed." });
    }
    // Show message if ok or not
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-lg mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Account Settings</h1>

        {loading ? (
          <p className="text-gray-400 text-sm">Loading Account Information...</p>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl space-y-4">
            {status && (
              <p className={`text-sm rounded p-2 ${status.type === "success" ? "text-green-700 bg-green-50" : "text-red-600 bg-red-50"}`}>
                {status.message}
              </p>
            )}

            {[
              { name: "username", label: "Username" },
              { name: "email",    label: "Email", type: "email" },
              { name: "password", label: "New Password", type: "password", placeholder: "Leave blank to keep current" },
            ].map(({ name, label, type = "text", placeholder }) => (
              <div key={name}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input
                  type={type}
                  name={name}
                  value={form[name]}
                  onChange={handleChange}
                  placeholder={placeholder}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg text-sm transition disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}

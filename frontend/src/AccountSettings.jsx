import { useEffect, useState } from "react";

const API = "http://localhost/LAS/backend/api/accounts/update.php";

export default function AccountSettings() {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [original, setOriginal] = useState({});
  const [status, setStatus] = useState(null); // { type: "success"|"error", message }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load current user data on mount
  useEffect(() => {
    fetch(API, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setStatus({ type: "error", message: data.error });
        } else {
          setForm({ username: data.username, email: data.email, password: "" });
          setOriginal({ username: data.username, email: data.email });
        }
      })
      .catch(() => setStatus({ type: "error", message: "Failed to load account data." }))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setStatus(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);

    // Only send fields that actually changed (password always sent if filled)
    const payload = {};
    if (form.username !== original.username) payload.username = form.username;
    if (form.email !== original.email) payload.email = form.email;
    if (form.password.trim() !== "") payload.password = form.password;

    if (Object.keys(payload).length === 0) {
      setStatus({ type: "error", message: "No changes to save." });
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(API, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        setStatus({ type: "success", message: data.message });
        // Update "original" so a second save without changes is caught correctly
        setOriginal({ username: form.username, email: form.email });
        setForm((prev) => ({ ...prev, password: "" }));
      } else {
        setStatus({ type: "error", message: data.error || "Update failed." });
      }
    } catch {
      setStatus({ type: "error", message: "Network error." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 400 }}>
      <h2>Account Settings</h2>

      {status && (
        <p style={{ color: status.type === "success" ? "green" : "red" }}>
          {status.message}
        </p>
      )}

      <label>
        Username
        <input
          name="username"
          value={form.username}
          onChange={handleChange}
          required
        />
      </label>

      <label>
        Email
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          required
        />
      </label>

      <label>
        New Password <small>(leave blank to keep current)</small>
        <input
          type="password"
          name="password"
          value={form.password}
          onChange={handleChange}
          placeholder="Min. 8 characters"
        />
      </label>

      <button type="submit" disabled={saving}>
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </form>
  );
}

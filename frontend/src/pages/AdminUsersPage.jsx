// AdminUsersPage.jsx
// Page for administrators to manage users: view details, search, and ban/unban accounts.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { getUsers, setUserStatus } from "../api/admin";

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchUsers() {
      const { ok, data, status } = await getUsers();
      // what does getUsers do?
      setLoading(false);
      if (status === 401) { navigate("/login"); return; }
      if (status === 403) { navigate("/browse"); return; }
      if (!ok) { setError(data.error || "Failed to load users."); return; }
      setUsers(data.users ?? []);
    }
    fetchUsers();
  }, [navigate]);

  async function handleToggleBan(user) {
    const action = user.Status === "active" ? "ban" : "unban";
    setActionLoading(user.UserID);
    const { ok, data } = await setUserStatus(user.UserID, action);
    setActionLoading(null);
    if (!ok) { alert(data.error || "Action failed."); return; }
    setUsers((prev) =>
      prev.map((u) => (u.UserID === user.UserID ? { ...u, Status: data.status } : u))
    );
  }

  const filtered = users.filter(
    (u) =>
      u.FullName?.toLowerCase().includes(search.toLowerCase()) ||
      u.Username?.toLowerCase().includes(search.toLowerCase()) ||
      u.Email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
            <p className="text-sm text-gray-500 mt-0.5">{users.length} registered users</p>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
          />
        </div>

        {loading && <p className="text-gray-500 text-sm">Loading users...</p>}
        {error && <p className="text-red-500 text-sm">{error}</p>}

        {!loading && !error && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {["ID", "Full Name", "Username", "Email", "Role", "Status", "Actions"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-gray-400 text-sm">
                      No users found.
                    </td>
                  </tr>
                )}
                {filtered.map((user) => (
                  <tr key={user.UserID} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-400 text-xs">{user.UserID}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{user.FullName}</td>
                    <td className="px-4 py-3 text-gray-600">@{user.Username}</td>
                    <td className="px-4 py-3 text-gray-500">{user.Email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        user.RoleID == 1
                          ? "bg-purple-100 text-purple-700"
                          : "bg-gray-100 text-gray-600"
                      }`}>
                        {user.RoleID == 1 ? "Admin" : "User"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        user.Status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {user.Status === "active" ? "Active" : "Banned"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {user.RoleID != 1 && (
                        <button
                          onClick={() => handleToggleBan(user)}
                          disabled={actionLoading === user.UserID}
                          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors disabled:opacity-40 ${
                            user.Status === "active"
                              ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                              : "bg-green-50 text-green-600 hover:bg-green-100 border border-green-200"
                          }`}
                        >
                          {actionLoading === user.UserID
                            ? "..."
                            : user.Status === "active"
                            ? "Ban"
                            : "Unban"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

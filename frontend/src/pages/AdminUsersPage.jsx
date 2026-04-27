// AdminUsersPage.jsx
// Page for administrators to manage users: view details, search, and ban/unban accounts.
// TODO: Add page for admin staff to make their accounts.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { getUsers, setUserStatus } from "../api/admin";

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
      status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
    }`}>
      {status === "active" ? "Active" : "Banned"}
    </span>
  );
}

function RoleBadge({ roleID }) {
  const map = {
    1: ["Admin",   "bg-purple-100 text-purple-700"],
    2: ["Staff",   "bg-blue-100 text-blue-700"],
    3: ["Student", "bg-gray-100 text-gray-600"],
  };
  const [label, cls] = map[roleID] ?? map[3];
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>;
}

const HEADERS = {
  all:     ["ID", "Email", "Role", "Status", "Verified", "Acad. Year", "Student ID", "Dept", "Staff ID", "Actions"],
  student: ["ID", "Full Name", "Username", "Email", "Status", "Verified", "Student ID", "Acad. Year", "Course", "Actions"],
  staff:   ["ID", "Full Name", "Username", "Email", "Status", "Verified", "Staff ID", "Dept", "Actions"],
};

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const [view, setView] = useState("all");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchUsers() {
      setLoading(true);
      setError(null);
      const { ok, data, status } = await getUsers(view);
      setLoading(false);
      if (status === 401) { navigate("/login"); return; }
      if (status === 403) { navigate("/browse"); return; }
      if (!ok) { setError(data.error || "Failed to load users."); return; }
      setUsers(data.users ?? []);
    }
    fetchUsers();
  }, [navigate, view]);

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

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    if (view === "all") return u.Email?.toLowerCase().includes(q) || String(u.UserID).includes(q);
    return (
      u.FullName?.toLowerCase().includes(q) ||
      u.Username?.toLowerCase().includes(q) ||
      u.Email?.toLowerCase().includes(q)
    );
  });

  function ActionCell({ user }) {
    if (user.RoleID == 1) return <td className="px-4 py-3" />;
    return (
      <td className="px-4 py-3">
        <button
          onClick={() => handleToggleBan(user)}
          disabled={actionLoading === user.UserID}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors disabled:opacity-40 ${
            user.Status === "active"
              ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
              : "bg-green-50 text-green-600 hover:bg-green-100 border border-green-200"
          }`}
        >
          {actionLoading === user.UserID ? "..." : user.Status === "active" ? "Ban" : "Unban"}
        </button>
      </td>
    );
  }

  function renderRow(user) {
    const base = "px-4 py-3";
    if (view === "all") return (
      <tr key={user.UserID} className="hover:bg-gray-50 transition-colors">
        <td className={`${base} text-gray-400 text-xs`}>{user.UserID}</td>
        <td className={`${base} text-gray-500`}>{user.Email}</td>
        <td className={base}><RoleBadge roleID={user.RoleID} /></td>
        <td className={base}><StatusBadge status={user.Status} /></td>
        <td className={`${base} text-gray-500 text-xs`}>{user.IsVerified == 1 ? "Yes" : "No"}</td>
        <td className={`${base} text-gray-500`}>{user.AcademicYear ?? "—"}</td>
        <td className={`${base} text-gray-500`}>{user.StudentID ?? "—"}</td>
        <td className={`${base} text-gray-500`}>{user.Dept ?? "—"}</td>
        <td className={`${base} text-gray-500`}>{user.StaffID ?? "—"}</td>
        <ActionCell user={user} />
      </tr>
    );

    if (view === "student") return (
      <tr key={user.UserID} className="hover:bg-gray-50 transition-colors">
        <td className={`${base} text-gray-400 text-xs`}>{user.UserID}</td>
        <td className={`${base} font-medium text-gray-800`}>{user.FullName}</td>
        <td className={`${base} text-gray-600`}>@{user.Username}</td>
        <td className={`${base} text-gray-500`}>{user.Email}</td>
        <td className={base}><StatusBadge status={user.Status} /></td>
        <td className={`${base} text-gray-500 text-xs`}>{user.IsVerified == 1 ? "Yes" : "No"}</td>
        <td className={`${base} text-gray-500`}>{user.StudentID}</td>
        <td className={`${base} text-gray-500`}>{user.AcademicYear ?? "—"}</td>
        <td className={`${base} text-gray-500`}>{user.Course ?? "—"}</td>
        <ActionCell user={user} />
      </tr>
    );

    return (
      <tr key={user.UserID} className="hover:bg-gray-50 transition-colors">
        <td className={`${base} text-gray-400 text-xs`}>{user.UserID}</td>
        <td className={`${base} font-medium text-gray-800`}>{user.FullName}</td>
        <td className={`${base} text-gray-600`}>@{user.Username}</td>
        <td className={`${base} text-gray-500`}>{user.Email}</td>
        <td className={base}><StatusBadge status={user.Status} /></td>
        <td className={`${base} text-gray-500 text-xs`}>{user.IsVerified == 1 ? "Yes" : "No"}</td>
        <td className={`${base} text-gray-500`}>{user.StaffID}</td>
        <td className={`${base} text-gray-500`}>{user.Dept ?? "—"}</td>
        <ActionCell user={user} />
      </tr>
    );
  }

  const headers = HEADERS[view];
  const countLabel = view === "all" ? "registered users" : view === "student" ? "students" : "staff members";

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
            <p className="text-sm text-gray-500 mt-0.5">{users.length} {countLabel}</p>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
          />
        </div>

        <div className="flex rounded-lg border border-gray-200 overflow-hidden w-fit mb-5">
          {[
            { key: "all",     label: "All Users" },
            { key: "student", label: "Students"  },
            { key: "staff",   label: "Staff"     },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setView(key); setSearch(""); }}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                view === key
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading && <p className="text-gray-500 text-sm">Loading users...</p>}
        {error   && <p className="text-red-500 text-sm">{error}</p>}

        {!loading && !error && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {headers.map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={headers.length} className="px-4 py-6 text-center text-gray-400 text-sm">
                      No users found.
                    </td>
                  </tr>
                )}
                {filtered.map((user) => renderRow(user))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

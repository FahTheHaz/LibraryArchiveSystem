import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { getUsers, setUserStatus, verifyUser, rejectUser } from "../api/admin";

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
      status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
    }`}>
      {status === "active" ? "Active" : status === "banned" ? "Banned" : status}
    </span>
  );
}

function RoleBadge({ roleID }) {
  const map = {
    1: ["Admin",   "bg-purple-100 text-purple-700"],
    2: ["Student", "bg-gray-100 text-gray-600"],
    3: ["Staff",   "bg-blue-100 text-blue-700"],
  };
  const [label, cls] = map[roleID] ?? ["Unknown", "bg-gray-100 text-gray-500"];
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>;
}

const HEADERS = {
  all:     ["ID", "Username", "Email", "Role", "Status", "Verified", "Acad. Year", "Student ID", "Dept", "Staff ID", "Actions"],
  student: ["ID", "Username", "Email", "Status", "Verified", "Student ID", "Acad. Year", "Actions"],
  staff:   ["ID", "Username", "Email", "Status", "Verified", "Staff ID", "Dept", "Actions"],
  pending: ["ID", "Full Name", "Username", "Email", "Role", "Student ID / Staff ID", "Actions"],
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
    // Ban sets Status='banned', unban sets Status='active'
    setActionLoading(user.UserID);
    const { ok, data } = await setUserStatus(user.UserID, action);
    setActionLoading(null);
    if (!ok) { alert(data.error || "Action failed."); return; }
    setUsers((prev) =>
      prev.map((u) => (u.UserID === user.UserID ? { ...u, Status: data.status } : u))
    );
  }

  async function handleVerify(user) {
    setActionLoading(user.UserID);
    const { ok, data } = await verifyUser(user.UserID);
    setActionLoading(null);
    if (!ok) { alert(data.error || "Approval failed."); return; }
    setUsers((prev) => prev.filter((u) => u.UserID !== user.UserID));
  }

  async function handleReject(user) {
    if (!confirm(`Reject and delete account for "${user.Username}"? This cannot be undone.`)) return;
    setActionLoading(user.UserID);
    const { ok, data } = await rejectUser(user.UserID);
    setActionLoading(null);
    if (!ok) { alert(data.error || "Rejection failed."); return; }
    setUsers((prev) => prev.filter((u) => u.UserID !== user.UserID));
  }

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    if (!q) return true;
    if (view === "pending") {
      return (
        u.FullName?.toLowerCase().includes(q) ||
        u.Username?.toLowerCase().includes(q) ||
        u.Email?.toLowerCase().includes(q)
      );
    }
    if (view === "all") return u.Email?.toLowerCase().includes(q) || String(u.UserID).includes(q);
    return u.Username?.toLowerCase().includes(q) || u.Email?.toLowerCase().includes(q);
  });

  function ActionCell({ user }) {
    if (view === "pending") {
      return (
        <td className="px-4 py-3">
          <div className="flex gap-2">
            <button
              onClick={() => handleVerify(user)}
              disabled={actionLoading === user.UserID}
              className="px-3 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 disabled:opacity-40 transition-colors"
            >
              {actionLoading === user.UserID ? "..." : "Approve"}
            </button>
            <button
              onClick={() => handleReject(user)}
              disabled={actionLoading === user.UserID}
              className="px-3 py-1 rounded-md text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 disabled:opacity-40 transition-colors"
            >
              Reject
            </button>
          </div>
        </td>
      );
    }
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

  const base = "px-4 py-3";

  function renderRow(user) {
    if (view === "pending") return (
      <tr key={user.UserID} className="hover:bg-gray-50 transition-colors">
        <td className={`${base} text-gray-400 text-xs`}>{user.UserID}</td>
        <td className={`${base} text-gray-700`}>{user.FullName || "—"}</td>
        <td className={`${base} font-medium text-gray-800`}>@{user.Username}</td>
        <td className={`${base} text-gray-500`}>{user.Email}</td>
        <td className={base}><RoleBadge roleID={user.RoleID} /></td>
        <td className={`${base} text-gray-500 text-xs`}>
          {user.StudentID || user.StaffID || "—"}
        </td>
        <ActionCell user={user} />
      </tr>
    );

    if (view === "all") return (
      <tr key={user.UserID} className="hover:bg-gray-50 transition-colors">
        <td className={`${base} text-gray-400 text-xs`}>{user.UserID}</td>
        <td className={`${base} font-medium text-gray-800`}>{user.Username}</td>
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
        <td className={`${base} text-gray-600`}>@{user.Username}</td>
        <td className={`${base} text-gray-500`}>{user.Email}</td>
        <td className={base}><StatusBadge status={user.Status} /></td>
        <td className={`${base} text-gray-500 text-xs`}>{user.IsVerified == 1 ? "Yes" : "No"}</td>
        <td className={`${base} text-gray-500`}>{user.StudentID}</td>
        <td className={`${base} text-gray-500`}>{user.AcademicYear ?? "—"}</td>
        <ActionCell user={user} />
      </tr>
    );

    return (
      <tr key={user.UserID} className="hover:bg-gray-50 transition-colors">
        <td className={`${base} text-gray-400 text-xs`}>{user.UserID}</td>
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
  const countLabels = { all: "registered users", student: "students", staff: "staff members", pending: "pending requests" };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
            <p className="text-sm text-gray-500 mt-0.5">{users.length} {countLabels[view]}</p>
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
            { key: "pending", label: "Pending"   },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setView(key); setSearch(""); }}
              className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                view === key
                  ? key === "pending" ? "bg-amber-500 text-white" : "bg-blue-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {label}
              {key === "pending" && view !== "pending" && users.length > 0 && view === key && (
                <span className="ml-1.5 bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5">
                  {users.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {view === "pending" && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4 text-sm text-amber-800">
            These accounts are awaiting approval. Approving sends an activation email and grants login access. Rejecting permanently deletes the account.
          </div>
        )}

        {loading && <p className="text-gray-500 text-sm">Loading users...</p>}
        {error   && <p className="text-red-500 text-sm">{error}</p>}

        {!loading && !error && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
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
                      {view === "pending" ? "No pending requests." : "No users found."}
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

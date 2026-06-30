import { Link, useNavigate } from "react-router-dom";
import { logout } from "../api/auth";

export default function Navbar() {
  const navigate  = useNavigate();
  const roleID    = Number(localStorage.getItem("las_role") ?? "0");
  const isLoggedIn = !!localStorage.getItem("las_role");
  const isAdmin   = roleID === 1;
  const isStaff   = roleID === 3;
  const canManage = isAdmin || isStaff;

  async function handleLogout() {
    await logout();
    localStorage.removeItem("las_role");
    navigate("/");
  }

  if (!isLoggedIn) {
    return (
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <Link to="/">
          <img src="/favicon_3.png" alt="LAS" className="h-8 w-auto" />
        </Link>
        <div className="flex gap-4 text-sm items-center">
          <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-500 rounded-full">Guest</span>
          <Link to="/"       className="border border-gray-300 rounded px-3 py-1 text-gray-600 hover:text-gray-900 hover:border-gray-400">Home</Link>
          <Link to="/browse" className="border border-gray-300 rounded px-3 py-1 text-gray-600 hover:text-gray-900 hover:border-gray-400">Browse</Link>
          <Link to="/register" className="border border-blue-300 rounded px-3 py-1 text-blue-600 hover:text-blue-800 hover:border-blue-400 font-medium">Register</Link>
          <Link to="/login"    className="border border-gray-300 rounded px-3 py-1 text-gray-600 hover:text-gray-900 hover:border-gray-400">Sign In</Link>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <Link to="/browse">
        <img src="/favicon_3.png" alt="LAS" className="h-8 w-auto" />
      </Link>
      <div className="flex gap-4 text-sm items-center">
        <Link to="/"       className="border border-gray-300 rounded px-3 py-1 text-gray-600 hover:text-gray-900 hover:border-gray-400">Home</Link>
        <Link to="/browse" className="border border-gray-300 rounded px-3 py-1 text-gray-600 hover:text-gray-900 hover:border-gray-400">Browse</Link>
        <Link to="/upload" className="border border-gray-300 rounded px-3 py-1 text-gray-600 hover:text-gray-900 hover:border-gray-400">Upload</Link>
        <Link to="/account" className="border border-gray-300 rounded px-3 py-1 text-gray-600 hover:text-gray-900 hover:border-gray-400">Account</Link>
        {canManage && (
          <>
            <Link to="/admin/users"    className="border border-purple-300 rounded px-3 py-1 text-purple-600 hover:text-purple-800 hover:border-purple-400 font-medium">Users</Link>
            {isAdmin && (
              <Link to="/admin/activity" className="border border-purple-300 rounded px-3 py-1 text-purple-600 hover:text-purple-800 hover:border-purple-400 font-medium">Logs</Link>
            )}
          </>
        )}
        <button
          onClick={handleLogout}
          className="border border-red-300 rounded px-3 py-1 text-red-500 hover:text-red-700 hover:border-red-400"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}

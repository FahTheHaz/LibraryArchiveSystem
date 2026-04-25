import { Link, useNavigate } from "react-router-dom";
import { logout } from "../api/auth";

export default function Navbar() {
  const navigate = useNavigate();
  const isAdmin = localStorage.getItem("las_role") === "1";

  async function handleLogout() {
    await logout();
    localStorage.removeItem("las_role");
    navigate("/");
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <Link to="/browse" className="text-lg font-semibold text-gray-800">
        LAS
      </Link>
      <div className="flex gap-4 text-sm items-center">
        <Link to="/browse" className="text-gray-600 hover:text-gray-900">Browse</Link>
        <Link to="/upload" className="text-gray-600 hover:text-gray-900">Upload</Link>
        <Link to="/account" className="text-gray-600 hover:text-gray-900">Account</Link>
        {isAdmin && (
          <Link
            to="/admin/users"
            className="text-purple-600 hover:text-purple-800 font-medium"
          >
            Admin
          </Link>
        )}
        <button
          onClick={handleLogout}
          className="text-red-500 hover:text-red-700"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}

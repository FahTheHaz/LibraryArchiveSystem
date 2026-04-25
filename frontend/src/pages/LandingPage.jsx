import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getAccountInfo } from "../api/auth";

export default function LandingPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    getAccountInfo().then(({ ok }) => {
      if (ok) navigate("/browse", { replace: true });
      else setChecking(false);
    });
  }, [navigate]);

  if (checking) return null;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top bar */}
      <header className="border-b border-gray-100 px-8 py-4 flex items-center justify-between">
        <span className="text-xl font-bold text-gray-900 tracking-tight">LAS</span>
        <div className="flex gap-3">
          <Link
            to="/login"
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            Sign in
          </Link>
          <Link
            to="/register"
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Register
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
        <div className="max-w-2xl">
          <span className="inline-block mb-4 px-3 py-1 bg-blue-50 text-blue-600 text-xs font-semibold rounded-full uppercase tracking-wide">
            Library Archive System
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight mb-4">
            Your school&apos;s archive,<br />
            <span className="text-blue-600">all in one place.</span>
          </h1>
          <p className="text-gray-500 text-lg mb-8 leading-relaxed">
            Browse past exam papers, event photographs, and academic resources.
            A centralised archive for students and staff.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              to="/register"
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Get started
            </Link>
            <Link
              to="/login"
              className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-gray-100 bg-gray-50 px-8 py-16">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-3xl mb-3">📄</div>
            <h3 className="font-semibold text-gray-800 mb-1">Exam Papers</h3>
            <p className="text-sm text-gray-500">
              O-Level, SPUB, and Diploma papers — searchable and downloadable.
            </p>
          </div>
          <div>
            <div className="text-3xl mb-3">📷</div>
            <h3 className="font-semibold text-gray-800 mb-1">Event Photos</h3>
            <p className="text-sm text-gray-500">
              School event photographs organised by date and event.
            </p>
          </div>
          <div>
            <div className="text-3xl mb-3">🔒</div>
            <h3 className="font-semibold text-gray-800 mb-1">Members Only</h3>
            <p className="text-sm text-gray-500">
              Access is restricted to registered students and staff only.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-100 px-8 py-4 text-center text-xs text-gray-400">
        &copy; {new Date().getFullYear()} Library Archive System
      </footer>
    </div>
  );
}

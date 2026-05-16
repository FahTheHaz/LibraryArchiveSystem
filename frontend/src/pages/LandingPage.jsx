import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function LandingPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const isLoggedIn = !!localStorage.getItem("las_role");

  function handleSearch(e) {
    e.preventDefault();
    const q = searchQuery.trim();
    navigate(q ? `/browse?search=${encodeURIComponent(q)}` : "/browse");
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundImage: 'url("/Gemini_Generated_Image_m7f2d6m7f2d6m7f2.png")',
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >

      {/* ── Top bar ── */}
      {isLoggedIn ? (
        <Navbar />
      ) : (
        <header className="absolute top-0 left-0 right-0 z-20 px-8 py-4 flex items-center justify-between">
          <span className="text-xl font-bold text-white tracking-tight">LAS</span>
          <div className="flex gap-3">
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-medium text-white/90 hover:text-white transition-colors"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 text-sm font-medium bg-white text-blue-700 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Register
            </Link>
          </div>
        </header>
      )}

      {/* ── Hero ── */}
      <section
        className="relative h-[520px] overflow-hidden shrink-0 bg-cover bg-center"
        style={{
          backgroundImage: 'url("/Gemini_Generated_Image_m7f2d6m7f2d6m7f2.png")',
        }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60" />

        {/* Hero content */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
          <span className="inline-block mb-4 px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-semibold rounded-full uppercase tracking-widest border border-white/30">
            Arkiba
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-4">
            ITQSHHB's Library,
            <br />
            <span className="text-blue-300">Exam papers and ITQSHHB event archive.</span>
          </h1>
          <p className="text-white/80 text-lg max-w-xl mb-8 leading-relaxed">
            Browse past exam papers, event photographs, and academic resources
            a centralised archive for students and staff.
          </p>
          <div className="flex items-center gap-4">
            <Link
              to="/register"
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Create account
            </Link>
            <Link
              to="/login"
              className="px-6 py-3 bg-white/10 backdrop-blur-sm border border-white/40 text-white font-medium rounded-lg hover:bg-white/20 transition-colors text-sm"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* ── Two-panel section ── */}
      <section className="flex-1 bg-gray-50 px-6 py-12">
        {/*  */}

        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-6">

          {/* Panel 1 — Chat / Search */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col">
            {/* Panel placeholder image */}
            <div className="h-48 overflow-hidden shrink-0">
              <img
                // src="https://placehold.co/800x192/e0f2fe/0369a1?text=Search+%2F+Chat"
                // "C:\xampp\htdocs\LAS\frontend\public\Browse_1.png"
                src="/Browse_1.png"
                alt=""
                className="w-full h-full object-cover"
              />
            </div>

            <div className="p-6 flex flex-col flex-1">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
                <h2 className="text-lg font-semibold text-gray-800">Search the Archive</h2>
              </div>
              <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                Ask a question or search for exam papers, photos, and more.<br></br>(Chat and AI-assisted search coming soon).
              </p>

              <form onSubmit={handleSearch} className="flex gap-2 mt-auto">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search papers, photos, events…" 
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                >
                  Search
                </button>
              </form>

              <p className="text-[11px] text-gray-400 mt-2">
                Sign in required to access search results.
              </p>
            </div>
          </div>

          {/* Panel 2 — Browse */}
          <Link
            to="/browse"
            className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col group hover:border-blue-200 transition-all"
          >
            {/* Panel placeholder image */}
            <div className="h-48 overflow-hidden shrink-0">
              <img
                // src="https://placehold.co/800x192/ede9fe/6d28d9?text=Brow Here"
                src="/browse_2.png"
                // "C:\xampp\htdocs\LAS\frontend\public\browse_2.png"

                alt=""
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>

            <div className="p-6 flex flex-col flex-1">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M3 7a2 2 0 012-2h3.172a2 2 0 011.414.586l1.828 1.828A2 2 0 0012.828 8H19a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                </svg>
                <h2 className="text-lg font-semibold text-gray-800">Browse Files</h2>
              </div>
              <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                Explore the full archive — exam papers, event photographs, and more — organised by folder and type.
              </p>

              <div className="mt-auto flex items-center gap-1.5 text-sm font-medium text-purple-600 group-hover:text-purple-700">
                Go to Browse
                <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-100 bg-white px-8 py-4 text-center text-xs text-gray-400">
        &copy; {new Date().getFullYear()} Library Archive System
      </footer>

    </div>
  );
}

// "C:\xampp\htdocs\LAS\frontend\dist\assets\favicon_3.png"
// 
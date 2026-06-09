import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import FolderTree from "../components/FolderTree";
import FileGrid from "../components/FileGrid";
import FileList from "../components/FileList";
import BulkUploadModal from "../components/BulkUploadModal";
import { getFiles, getFolders } from "../api/files";

function useRole() {
  return parseInt(localStorage.getItem("las_role") ?? "0", 10);
}

export default function BrowsePage() {
  const roleID     = useRole();
  const isLoggedIn = !!localStorage.getItem("las_role");
  const isStaff    = roleID === 1 || roleID === 3;
  const isAdmin    = roleID === 1;

  // ─── State ──────────────────────────────────────────────────────────────────
  const [folders,    setFolders]    = useState([]);
  const [files,      setFiles]      = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalFiles: 0, limit: 20 });

  const [selectedFolder, setSelectedFolder] = useState(null);
  const [deepSearch,     setDeepSearch]     = useState(false);

  const [search,     setSearch]     = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showDeleted,setShowDeleted]= useState(false);
  const [page,       setPage]       = useState(1);

  const [loading,    setLoading]    = useState(false);
  const [foldLoading,setFoldLoading]= useState(false);
  const [error,      setError]      = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [viewMode,   setViewMode]   = useState("grid"); // "grid" | "list"

  // ─── Loaders ─────────────────────────────────────────────────────────────────
  const loadFolders = useCallback(async () => {
    setFoldLoading(true);
    try {
      const { ok, data } = await getFolders();
      if (!ok) { setError(data?.error || "Failed to load folders."); return; }
      setFolders(data.folders ?? []);
    } catch (err) {
      setError(`Network error: ${err.message}`);
    } finally {
      setFoldLoading(false);
    }
  }, []);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page, limit: 20 };
      if (search)      params.search      = search;
      if (typeFilter)  params.type        = typeFilter;
      if (showDeleted) params.showDeleted = "1";
      if (selectedFolder) {
        if (deepSearch) params.folderPath = selectedFolder.pathIDString;
        else            params.folderID   = selectedFolder.folderID;
      }
      const { ok, data } = await getFiles(params);
      if (!ok) { setError(data?.error || "Failed to load files."); return; }
      setFiles(data.files ?? []);
      setPagination(data.pagination ?? { currentPage: 1, totalPages: 1, totalFiles: 0, limit: 20 });
    } catch (err) {
      setError(`Network error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, showDeleted, selectedFolder, deepSearch, page]);

  useEffect(() => { loadFolders(); }, [loadFolders]);
  useEffect(() => { setPage(1); }, [search, typeFilter, showDeleted, selectedFolder, deepSearch]);
  useEffect(() => { loadFiles(); }, [loadFiles]);

  // ─── Breadcrumb --------------------------------------------------------------------------------
  // To show current folder as clickable links: like "All files / Paper / SPUB / Ugama"
  function Breadcrumb() {
    if (!selectedFolder) return <span className="text-gray-500 text-sm">All files</span>;
    const parts = selectedFolder.pathIDString
      .split("/").filter(Boolean)
      .map((id) => folders.find((f) => f.folderID === parseInt(id, 10)))
      .filter(Boolean);
    return (
      <span className="text-sm flex items-center gap-1 flex-wrap">
        <button className="text-blue-600 hover:underline" onClick={() => { setSelectedFolder(null); setPage(1); }}>
          All files
        </button>
        {parts.map((f) => (
          <span key={f.folderID} className="flex items-center gap-1">
            <span className="text-gray-400">/</span>
            <button className="text-blue-600 hover:underline" onClick={() => { setSelectedFolder(f); setPage(1); }}>
              {f.folderName}
            </button>
          </span>
        ))}
      </span>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      {!isLoggedIn && (
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-2 flex items-center justify-between text-sm">
          <span className="text-blue-700">You're browsing as a guest — downloads and uploads require an account.</span>
          <div className="flex gap-3 shrink-0 ml-4">
            <Link to="/register" className="font-medium text-blue-700 hover:text-blue-900 underline">Register</Link>
            <Link to="/login"    className="font-medium text-blue-700 hover:text-blue-900 underline">Sign In</Link>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden" style={{ height: isLoggedIn ? "calc(100vh - 64px)" : "calc(100vh - 100px)" }}>

        {/* ── Sidebar ── */}
        <aside className="w-60 shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
          <div className="px-3 py-3 border-b">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Folders</p>
          </div>
          <div className="flex-1 overflow-y-auto py-1 px-1">
            {foldLoading
              ? <p className="text-xs text-gray-400 px-3 py-2">Loading…</p>
              : <FolderTree
                  folders={folders}
                  selectedID={selectedFolder?.folderID ?? null}
                  onSelect={(f) => { setSelectedFolder(f); setPage(1); }}
                  isStaff={isStaff}
                  onRefresh={loadFolders}
                />
            }
          </div>
        </aside>

        {/* ── Main ── */}
        <main className="flex-1 flex flex-col overflow-hidden">

          {/* Top bar */}
          <div className="bg-white border-b border-gray-200 px-6 py-3 flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-0">
              <Breadcrumb />
            </div>

            <input
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-44 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">All types</option>
              <option value="PAPER">Papers</option>
              <option value="PHOTO">Photos</option>
            </select>

            {selectedFolder && (
              <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer select-none">
                <input type="checkbox" checked={deepSearch}
                  onChange={(e) => setDeepSearch(e.target.checked)} className="accent-blue-600" />
                Include sub-folders
              </label>
            )}

            {isStaff && (
              <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer select-none">
                <input type="checkbox" checked={showDeleted}
                  onChange={(e) => setShowDeleted(e.target.checked)} className="accent-red-500" />
                Show deleted
              </label>
            )}

            {/* View toggle : */}
            <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode("grid")}
                title="Grid view"
                className={`p-1.5 rounded-md transition ${viewMode === "grid" ? "bg-white text-blue-600 border border-gray-200" : "text-gray-400 hover:text-gray-600"}`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode("list")}
                // List veiw for simplicity
                title="List view"
                className={`p-1.5 rounded-md transition ${viewMode === "list" ? "bg-white text-blue-600 border border-gray-200" : "text-gray-400 hover:text-gray-600"}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* File area */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            {loading
              ? <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Loading…</div>
              : viewMode === "list"
                ? <FileList
                    files={files}
                    folders={folders}
                    isStaff={isStaff}
                    isAdmin={isAdmin}
                    showDeleted={showDeleted}
                    onRefresh={loadFiles}
                  />
                : <FileGrid
                    files={files}
                    folders={folders}
                    isStaff={isStaff}
                    showDeleted={showDeleted}
                    onRefresh={loadFiles}
                  />
            }

            {/* Pagination */}
            {!loading && pagination.totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-6 pb-4">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40">
                  ← Prev
                </button>
                <span className="text-sm text-gray-600">
                  {pagination.currentPage} / {pagination.totalPages}
                  <span className="text-gray-400 ml-1">({pagination.totalFiles} files)</span>
                </span>
                <button disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40">
                  Next →
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ── Floating upload button (admin/staff) ── */}
      {isStaff && (
        <button
          onClick={() => setShowUpload(true)}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center transition"
          title="Bulk upload"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        </button>
      )}

      {/* ── Bulk upload modal ── */}
      {showUpload && (
        <BulkUploadModal
          folders={folders}
          onClose={() => setShowUpload(false)}
          onDone={() => { setShowUpload(false); loadFiles(); }}
        />
      )}
    </div>
  );
}

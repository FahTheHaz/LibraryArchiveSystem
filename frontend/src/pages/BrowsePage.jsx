import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import FolderTree from "../components/FolderTree";
import FileGrid from "../components/FileGrid";
import BulkUploadModal from "../components/BulkUploadModal";
import { getFiles, getFolders } from "../api/files";

function useRole() {
  return parseInt(localStorage.getItem("las_role") ?? "0", 10);
}

export default function BrowsePage() {
  const navigate = useNavigate();
  const roleID   = useRole();
  const isStaff  = roleID === 1 || roleID === 3;

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

  // ─── Loaders ─────────────────────────────────────────────────────────────────
  const loadFolders = useCallback(async () => {
    setFoldLoading(true);
    try {
      const { ok, status, data } = await getFolders();
      if (status === 401) { navigate("/login"); return; }
      if (!ok) { setError(data?.error || "Failed to load folders."); return; }
      setFolders(data.folders ?? []);
    } catch (err) {
      setError(`Network error: ${err.message}`);
    } finally {
      setFoldLoading(false);
    }
  }, [navigate]);

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
      const { ok, status, data } = await getFiles(params);
      if (status === 401) { navigate("/login"); return; }
      if (!ok) { setError(data?.error || "Failed to load files."); return; }
      setFiles(data.files ?? []);
      setPagination(data.pagination ?? { currentPage: 1, totalPages: 1, totalFiles: 0, limit: 20 });
    } catch (err) {
      setError(`Network error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [navigate, search, typeFilter, showDeleted, selectedFolder, deepSearch, page]);

  useEffect(() => { loadFolders(); }, [loadFolders]);
  useEffect(() => { setPage(1); }, [search, typeFilter, showDeleted, selectedFolder, deepSearch]);
  useEffect(() => { loadFiles(); }, [loadFiles]);

  // ─── Breadcrumb ──────────────────────────────────────────────────────────────
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

      <div className="flex flex-1 overflow-hidden" style={{ height: "calc(100vh - 64px)" }}>

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
          className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-xl flex items-center justify-center transition"
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

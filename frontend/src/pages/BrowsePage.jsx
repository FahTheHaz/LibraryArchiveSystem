import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { getFiles } from "../api/files";

export default function BrowsePage() {
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");

  const fetchFiles = useCallback(async (searchTerm = "") => {
    setLoading(true);
    setError(null);
    const params = {};
    if (type) params.type = type;
    if (searchTerm) params.search = searchTerm;

    const { ok, data, status } = await getFiles(params);
    setLoading(false);

    if (status === 401) { navigate("/login"); return; }
    if (!ok) { setError(data.error || "Failed to load files."); return; }

    setFiles(data.files ?? data ?? []);
  }, [type, navigate]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  function handleSearch(e) {
    e.preventDefault();
    fetchFiles(search);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Filters */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
          >
            <option value="">All types</option>
            <option value="PAPER">Papers</option>
            <option value="PHOTO">Photos</option>
          </select>
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
          >
            Search
          </button>
        </form>

        {/* Results */}
        {loading && <p className="text-gray-500 text-sm">Loading...</p>}
        {error  && <p className="text-red-500 text-sm">{error}</p>}
        {!loading && !error && files.length === 0 && (
          <p className="text-gray-400 text-sm">No files found.</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {files.map((file) => (
            <div key={file.FileID} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium uppercase tracking-wide text-blue-600">
                  {file.FileType}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-gray-800 truncate">
                {file.Subject ?? file.Event ?? `File #${file.FileID}`}
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                {file.Season ?? file.PictureDate ?? ""}
              </p>
              <a
                href={`http://localhost/LAS/backend/api/crud/download.php?id=${file.FileID}`}
                className="mt-3 inline-block text-xs text-blue-600 hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                Download
              </a>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

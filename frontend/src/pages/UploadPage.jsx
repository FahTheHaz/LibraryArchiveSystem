import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { uploadFile } from "../api/files";

export default function UploadPage() {
  const navigate = useNavigate();
  const [fileType, setFileType] = useState("PAPER");
  const [file, setFile] = useState(null);
  const [fields, setFields] = useState({});
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  function handleField(e) {
    setFields((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) { setStatus({ type: "error", message: "Please select a file." }); return; }

    const fd = new FormData();
    fd.append("file", file);
    fd.append("fileType", fileType);
    Object.entries(fields).forEach(([k, v]) => fd.append(k, v));

    setLoading(true);
    try {
      const { ok, data, status: httpStatus } = await uploadFile(fd);
      if (httpStatus === 401) { navigate("/login"); return; }
      if (ok) {
        setStatus({ type: "success", message: "Uploaded successfully!" });
        setFile(null);
        setFields({});
        e.target.reset();
      } else {
        setStatus({ type: "error", message: data?.error || `Upload failed (HTTP ${httpStatus}).` });
      }
    } catch (err) {
      setStatus({ type: "error", message: `Network error: ${err.message}` });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-lg mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Upload File</h1>

        {status && (
          <p className={`text-sm rounded p-2 mb-4 ${status.type === "success" ? "text-green-700 bg-green-50" : "text-red-600 bg-red-50"}`}>
            {status.message}
          </p>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={fileType}
              onChange={(e) => { setFileType(e.target.value); setFields({}); }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="PAPER">Paper</option>
              <option value="PHOTO">Photo</option>
            </select>
          </div>

          {fileType === "PAPER" && (
            <>
              {[
                { name: "subject",       label: "Subject" },
                { name: "code",          label: "Subject Code" },
                { name: "season",        label: "Season (e.g. June)" },
                { name: "semester",      label: "Semester" },
                { name: "scanOrDigital", label: "Scan or Digital" },
              ].map(({ name, label }) => (
                <div key={name}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input
                    name={name}
                    value={fields[name] ?? ""}
                    onChange={handleField}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </>
          )}

          {fileType === "PHOTO" && (
            <>
              {[
                { name: "event",        label: "Event" },
                { name: "photographer", label: "Photographer" },
                { name: "quality",      label: "Quality" },
                { name: "pictureDate",  label: "Date (YYYY-MM-DD)" },
              ].map(({ name, label }) => (
                <div key={name}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input
                    name={name}
                    value={fields[name] ?? ""}
                    onChange={handleField}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">File</label>
            <input
              type="file"
              accept={fileType === "PAPER" ? ".pdf" : "image/*"}
              onChange={(e) => setFile(e.target.files[0])}
              className="w-full text-sm text-gray-600"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg text-sm transition disabled:opacity-50"
          >
            {loading ? "Uploading..." : "Upload"}
          </button>
        </form>
      </main>
    </div>
  );
}

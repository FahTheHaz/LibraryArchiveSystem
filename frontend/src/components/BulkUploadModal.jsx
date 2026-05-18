import { useState, useRef } from "react";
import { bulkUploadFiles } from "../api/files";

const PAPER_FIELDS = [
  { name: "subject",       label: "Subject" },
  { name: "monthYear",     label: "Month / Year" },
  { name: "season",        label: "Season (e.g. June)" },
  { name: "semester",      label: "Semester" },
  { name: "code",          label: "Subject Code" },
];

const PHOTO_FIELDS = [
  { name: "event",         label: "Event" },
  { name: "photographer",  label: "Photographer" },
  { name: "quality",       label: "Quality" },
  { name: "pictureDate",   label: "Picture Date (YYYY-MM-DD)" },
  { name: "dataJSON",      label: "DataJSON (optional)" },
];

export default function BulkUploadModal({ folders, onClose, onDone }) {
  const [fileType, setFileType] = useState("PAPER");
  const [folderID, setFolderID] = useState("");
  const [targetMethod, setTargetMethod] = useState("local");
  const [files, setFiles] = useState([]);
  const [meta, setMeta] = useState({});
  const [scanOrDigital, setScanOrDigital] = useState("");
  const [results, setResults] = useState(null); // { uploaded, errors }
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();

  function setMetaField(k, v) { setMeta((p) => ({ ...p, [k]: v })); }
  // used to update the meta state object( holds the shared metadata for the files being uploaded)
  // Takes key (k) and value (v) as arguments, then updates the meta state by creating a new object that spreads the previous state (p) and sets the specified key to the new value
  // This is for dynamic updating of individual metadata fields without affecting the others.
  // 

  function addFiles(incoming) {
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name + f.size));
      const deduped = [...incoming].filter((f) => !existing.has(f.name + f.size));
      return [...prev, ...deduped];
    });
  }

  function removeFile(idx) { setFiles((p) => p.filter((_, i) => i !== idx)); }
  // used to remove a file from the files state array based on its index (idx)
  // It updates the files state by filtering out the file at the specified index, effectively removing it from the list of files to be uploaded.
//  So 1/2/3, 3 is removed by filtering out index 2, and only keeping indexes 0 and 1 (1 and 2 in the original array).
  function handleDrop(e) {
    // hANDLES Drag and drop
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  }

  // 
  async function handleSubmit() {
    // Handles the submission of files for bulk upload. It first checks if there are any files to upload; if not, it simply returns. 
    // I haveto make it so that it sets the busy state to true and clears any previous results.
    if (files.length === 0) return;
    setBusy(true);
    setResults(null);

    const fd = new FormData();
    fd.append("fileType", fileType);
    fd.append("targetMethod", targetMethod);
    if (folderID) fd.append("folderID", folderID);

    files.forEach((f) => fd.append("files[]", f));

    const fields = fileType === "PAPER" ? PAPER_FIELDS : PHOTO_FIELDS;
    fields.forEach(({ name }) => {
      if (meta[name]) fd.append(name, meta[name]);
    });
    if (fileType === "PAPER" && scanOrDigital) {
      fd.append("scanOrDigital", scanOrDigital);
    }

    try {
      const { ok, data } = await bulkUploadFiles(fd);
      setResults(data);
      if (ok && (!data.errors || data.errors.length === 0)) {
        onDone();
      }
    } catch (err) {
      setResults({ uploaded: [], errors: [{ file: "all", error: `Network error: ${err.message}` }] });
    } finally {
      setBusy(false);
    }
  }

  const acceptAttr = fileType === "PAPER" ? ".pdf,.doc,.docx,.png,.jpg,.jpeg" : "image/*";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">Bulk Upload</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
        </div>

        <div className="overflow-y-auto px-6 py-4 space-y-4 flex-1">
          {/* Type + Folder + Method */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">File Type</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={fileType}
                onChange={(e) => { setFileType(e.target.value); setMeta({}); setScanOrDigital(""); setFiles([]); }}
              >
                <option value="PAPER">Papers</option>
                <option value="PHOTO">Photos</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Folder (optional)</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={folderID}
                onChange={(e) => setFolderID(e.target.value)}
              >
                <option value="">— No folder (root) —</option>
                {folders.map((f) => (
                  <option key={f.folderID} value={f.folderID}>
                    {f.folderName} ({f.pathIDString})
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Processing Method</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={targetMethod}
                onChange={(e) => setTargetMethod(e.target.value)}
              >
                <option value="local">Local (Fast — OCR + CLIP)</option>
                <option value="cloud">Cloud (Deep Scan — Gemini AI)</option>
              </select>
            </div>
          </div>

          {/* Shared metadata */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
              Shared metadata (optional — applies to all files)
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(fileType === "PAPER" ? PAPER_FIELDS : PHOTO_FIELDS).map(({ name, label }) => (
                <div key={name}>
                  <label className="block text-[11px] text-gray-500 mb-0.5">{label}</label>
                  <input
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs"
                    value={meta[name] ?? ""}
                    onChange={(e) => setMetaField(name, e.target.value)}
                  />
                </div>
              ))}
              {fileType === "PAPER" && (
                <div>
                  <label className="block text-[11px] text-gray-500 mb-0.5">Scan or Digital</label>
                  <select
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs"
                    value={scanOrDigital}
                    onChange={(e) => setScanOrDigital(e.target.value)}
                  >
                    <option value="">—</option>
                    <option value="Scanned">Scanned</option>
                    <option value="Digital">Digital</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* File drop zone */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Files</p>
            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition
                ${dragOver ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-blue-300"}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
            >
              <p className="text-sm text-gray-500">
                Drag &amp; drop files here, or <span className="text-blue-600 underline">browse</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {fileType === "PAPER" ? "PDF, DOC, DOCX, images" : "JPEG, PNG, GIF, WEBP, TIFF"} · Max 50 MB each
              </p>
              <input
                ref={fileRef}
                type="file"
                multiple
                accept={acceptAttr}
                className="hidden"
                onChange={(e) => addFiles(e.target.files)}
              />
            </div>

            {files.length > 0 && (
              <ul className="mt-2 space-y-1 max-h-36 overflow-y-auto">
                {files.map((f, i) => (
                  <li key={i} className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 rounded px-2 py-1">
                    <span className="truncate mr-2">{f.name}</span>
                    <span className="text-gray-400 shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                    <button onClick={() => removeFile(i)} className="ml-2 text-red-400 hover:text-red-600 shrink-0">&times;</button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Results */}
          {results && (
            <div className="space-y-1">
              {results.uploaded?.length > 0 && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
                  ✓ {results.uploaded.length} file(s) uploaded successfully.
                </div>
              )}
              {results.errors?.length > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 space-y-0.5">
                  {results.errors.map((e, i) => (
                    <p key={i}><strong>{e.file}:</strong> {e.error}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200">
            Close
          </button>
          <button
            disabled={busy || files.length === 0}
            onClick={handleSubmit}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? `Uploading ${files.length} file(s)…` : `Upload ${files.length} file(s)`}
          </button>
        </div>
      </div>
    </div>
  );
}

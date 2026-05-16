import { useState } from "react";
import { deleteFile, updateFile, getDownloadUrl, getForceDownloadUrl } from "../api/files";

// ─── helpers ─────────────────────────────────────────────────────────────────
function fmt(dateStr) {
  // to locate date in user's timezone and format as "DD MMM YYYY"
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" });
}

function Badge({ label, colour = "gray" }) {
  const map = {
    gray: "bg-gray-100 text-gray-600",
    red:  "bg-red-100 text-red-700",
    blue: "bg-blue-100 text-blue-700",
    yellow: "bg-yellow-100 text-yellow-700",
  };
  return <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${map[colour]}`}>{label}</span>;
}

// ─── Inline edit form ─────────────────────────────────────────────────────────
function EditForm({ file, folders, onDone, onError }) {
  const isPaper = file.FileType === "PAPER";
  const m = file.metadata || {};
  const [fields, setFields] = useState({
    fileName:      m.FileName      ?? "",
    subject:       m.Subject       ?? "",
    monthYear:     m.MonthYear     ?? "",
    season:        m.Season        ?? "",
    semester:      m.Semester      ?? "",
    code:          m.Code          ?? "",
    scanOrDigital: m.ScanOrDigital ?? "",
    dataJSON:      m.DataJSON ? JSON.stringify(m.DataJSON) : "",
    quality:       m.Quality       ?? "",
    pictureDate:   m.PictureDate   ?? "",
    event:         m.Event         ?? "",
    photographer:  m.Photographer  ?? "",
    folderID:      file.folderID ?? "",
  });
  const [busy, setBusy] = useState(false);

  function set(k, v) { setFields((p) => ({ ...p, [k]: v })); }

  async function save() {
    setBusy(true);
    const payload = isPaper
      ? { subject: fields.subject, monthYear: fields.monthYear, season: fields.season,
          semester: fields.semester, code: fields.code, scanOrDigital: fields.scanOrDigital || null }
      : { dataJSON: fields.dataJSON || null, quality: fields.quality, pictureDate: fields.pictureDate,
          event: fields.event, photographer: fields.photographer };
    payload.folderID = fields.folderID === "" ? null : parseInt(fields.folderID, 10);
    payload.fileName = fields.fileName || null;

    const { ok, data } = await updateFile(file.FileID, payload);
    setBusy(false);
    if (!ok) { onError(data?.error || "Update failed."); return; }
    onDone();
  }

  const input = (label, k, type = "text") => (
    <div key={k}>
      <label className="block text-[11px] text-gray-500 mb-0.5">{label}</label>
      <input
        type={type}
        className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
        value={fields[k]}
        onChange={(e) => set(k, e.target.value)}
      />
    </div>
  );

  return (
    <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2 text-xs">
      {input("File Name", "fileName")}
      {isPaper ? (
        <>
          {input("Subject", "subject")}
          {input("Month / Year", "monthYear")}
          {input("Season", "season")}
          {input("Semester", "semester")}
          {input("Code", "code")}
          <div>
            <label className="block text-[11px] text-gray-500 mb-0.5">Scan or Digital</label>
            <select className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
              value={fields.scanOrDigital} onChange={(e) => set("scanOrDigital", e.target.value)}>
              <option value="">—</option>
              <option value="Scanned">Scanned</option>
              <option value="Digital">Digital</option>
            </select>
          </div>
        </>
      ) : ( 
        // else: photo metadata
        <>
          {input("Event", "event")}
          {input("Photographer", "photographer")}
          {input("Quality", "quality")}
          {input("Picture Date (YYYY-MM-DD)", "pictureDate", "date")}
          {input("DataJSON", "dataJSON")}
        </>
      )}

      {/* Folder assignment */}
      <div>
        <label className="block text-[11px] text-gray-500 mb-0.5">Folder</label>
        <select className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
          value={fields.folderID} onChange={(e) => set("folderID", e.target.value)}>
          <option value="">— Root (no folder) —</option>
          {folders.map((f) => (
            <option key={f.folderID} value={f.folderID}>{f.folderName} ({f.pathIDString})</option>
          ))}
        </select>
      </div>

      <div className="flex gap-1.5 pt-1">
        <button disabled={busy} onClick={save}
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
          {busy ? "Saving…" : "Save"}
        </button>
        <button onClick={onDone} className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300">Cancel</button>
      </div>
    </div>
  );
}

// ─── Single file card ─────────────────────────────────────────────────────────
function FileCard({ file, checked, onCheck, isStaff, folders, onRefresh, onError }) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isPaper = file.FileType === "PAPER";
  const isDeleted = !!file.deletedAt;

  async function handleDelete() {
    if (!window.confirm(`Soft-delete file ${file.FileID}?`)) return;
    setDeleting(true);
    const { ok, data } = await deleteFile(file.FileID, "delete");
    setDeleting(false);
    if (!ok) { onError(data?.error || "Delete failed."); return; }
    onRefresh();
  }

  async function handleRestore() {
    const { ok, data } = await deleteFile(file.FileID, "restore");
    if (!ok) { onError(data?.error || "Restore failed."); return; }
    onRefresh();
  }

  const meta = file.metadata || {};
  const title = meta.FileName
    || file.filePath?.split('/').pop()
    || (isPaper ? "Untitled paper" : "Untitled photo");
  const sub = isPaper
    ? [meta.Season, meta.MonthYear, meta.Code].filter(Boolean).join(" · ")
    : [meta.Photographer, meta.PictureDate].filter(Boolean).join(" · ");

  const thumbUrl = !isPaper ? getDownloadUrl(file.FileID) : null;

  return (
    <div className={`relative bg-white rounded-xl border flex flex-col overflow-hidden
      ${isDeleted ? "opacity-60 border-red-300" : "border-gray-200"}`}>

      {/* Checkbox */}
      <div className="absolute top-2 left-2 z-10">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheck(file.FileID, e.target.checked)}
          className="w-4 h-4 accent-blue-600 cursor-pointer"
        />
      </div>

      {/* Deleted badge */}
      {isDeleted && (
        <div className="absolute top-2 right-2 z-10">
          <Badge label="Deleted" colour="red" />
        </div>
      )}

      {/* Photo thumbnail */}
      {!isPaper && (
        <div className="h-32 bg-gray-100 overflow-hidden flex items-center justify-center">
          {/* TODO: replace with server-side low-quality thumbnail once GD is wired up */}
          <img
            src={thumbUrl}
            alt={title}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        </div>
      )}

      {/* Paper icon area */}
      {isPaper && (
        <div className="h-20 bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
          <svg className="w-10 h-10 text-blue-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        </div>
      )}

      {/* Info */}
      <div className="p-3 flex flex-col gap-1 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge label={file.FileType} colour={isPaper ? "blue" : "yellow"} />
          {file.folderName && <Badge label={file.folderName} colour="gray" />}
        </div>
        <p className="font-medium text-sm text-gray-800 leading-snug line-clamp-2">{title}</p>
        {sub && <p className="text-xs text-gray-500">{sub}</p>}
        <p className="text-xs text-gray-400 mt-auto">{fmt(file.DateUploaded)}</p>
      </div>

      {/* Actions */}
      <div className="px-3 pb-3 flex flex-wrap gap-1.5">
        <a
          href={getDownloadUrl(file.FileID)}
          target="_blank"
          rel="noreferrer"
          className="px-2.5 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
        >
          View
        </a>
        <a
          href={getForceDownloadUrl(file.FileID)}
          download
          className="px-2.5 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
        >
          Download
        </a>

        {isStaff && !isDeleted && (
          <>
            <button
              onClick={() => setEditing((e) => !e)}
              className="px-2.5 py-1 text-xs bg-yellow-50 text-yellow-700 rounded hover:bg-yellow-100"
            >
              Edit
            </button>
            <button
              disabled={deleting}
              onClick={handleDelete}
              className="px-2.5 py-1 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100 disabled:opacity-50"
            >
              {deleting ? "…" : "Delete"}
            </button>
          </>
        )}

        {isStaff && isDeleted && (
          <button
            onClick={handleRestore}
            className="px-2.5 py-1 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100"
          >
            Restore
          </button>
        )}
      </div>

      {/* Inline edit */}
      {editing && (
        <div className="px-3 pb-3">
          <EditForm
            file={file}
            folders={folders}
            onDone={() => { setEditing(false); onRefresh(); }}
            onError={onError}
          />
        </div>
      )}
    </div>
  );
}

// ─── Grid root ────────────────────────────────────────────────────────────────
export default function FileGrid({
  files,
  folders,
  isStaff,
  showDeleted,
  onRefresh,
}) {
  const [selected, setSelected] = useState(new Set());
  const [globalErr, setGlobalErr] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);

  function toggleOne(id, checked) {
    setSelected((prev) => {
      const next = new Set(prev);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
  }

  function toggleAll(checked) {
    setSelected(checked ? new Set(files.map((f) => f.FileID)) : new Set());
  }

  async function handleBulkDownload() {
    for (const id of selected) {
      const a = document.createElement("a");
      a.href = getForceDownloadUrl(id);
      a.download = "";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  async function handleBulkDelete() {
    if (!selected.size) return;
    if (!window.confirm(`Soft-delete ${selected.size} file(s)?`)) return;
    setBulkBusy(true);
    setGlobalErr("");
    const { bulkDeleteFiles } = await import("../api/files");
    const results = await bulkDeleteFiles([...selected]);
    const failed = results.filter((r) => !r.ok);
    setBulkBusy(false);
    if (failed.length) {
      setGlobalErr(`${failed.length} file(s) failed to delete.`);
    }
    setSelected(new Set());
    onRefresh();
  }

  async function handleBulkRestore() {
    if (!selected.size) return;
    setBulkBusy(true);
    setGlobalErr("");
    const { bulkDeleteFiles } = await import("../api/files");
    const results = await bulkDeleteFiles([...selected], "restore");
    const failed = results.filter((r) => !r.ok);
    setBulkBusy(false);
    if (failed.length) {
      setGlobalErr(`${failed.length} file(s) failed to restore.`);
    }
    setSelected(new Set());
    onRefresh();
  }

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
        </svg>
        <p className="text-sm">No files found</p>
      </div>
    );
  }

  const allChecked = selected.size === files.length;

  return (
    <div>
      {/* Bulk action bar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={allChecked} onChange={(e) => toggleAll(e.target.checked)}
            className="w-4 h-4 accent-blue-600" />
          {selected.size > 0 ? `${selected.size} selected` : "Select all"}
        </label>

        {selected.size > 0 && (
          <>
            <button onClick={handleBulkDownload} disabled={bulkBusy}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
              Download {selected.size}
            </button>
            {isStaff && (
              <button onClick={handleBulkDelete} disabled={bulkBusy}
                className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50">
                {bulkBusy ? "…" : `Delete ${selected.size}`}
              </button>
            )}
            {isStaff && showDeleted && (
              <button onClick={handleBulkRestore} disabled={bulkBusy}
                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
                {bulkBusy ? "…" : `Restore ${selected.size}`}
              </button>
            )}
          </>
        )}

        {globalErr && <p className="text-sm text-red-600">{globalErr}</p>}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {files.map((file) => (
          <FileCard
            key={file.FileID}
            file={file}
            checked={selected.has(file.FileID)}
            onCheck={toggleOne}
            isStaff={isStaff}
            showDeleted={showDeleted}
            folders={folders}
            onRefresh={onRefresh}
            onError={setGlobalErr}
          />
        ))}
      </div>
    </div>
  );
}

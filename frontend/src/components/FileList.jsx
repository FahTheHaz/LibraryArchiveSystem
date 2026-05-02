import { useState } from "react";
import { deleteFile, updateFile, getDownloadUrl, getForceDownloadUrl } from "../api/files";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" });
}

function Badge({ label, colour = "gray" }) {
  const map = {
    gray:   "bg-gray-100 text-gray-600",
    red:    "bg-red-100 text-red-700",
    blue:   "bg-blue-100 text-blue-700",
    yellow: "bg-yellow-100 text-yellow-700",
    green:  "bg-green-100 text-green-700",
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium whitespace-nowrap ${map[colour]}`}>
      {label}
    </span>
  );
}

function InlineInput({ placeholder, value, onChange, type = "text", mono = false }) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={`w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white ${mono ? "font-mono" : ""}`}
    />
  );
}

// ─── Single file row ──────────────────────────────────────────────────────────
function FileRow({ file, checked, onCheck, isStaff, folders, onRefresh, onError }) {
  const isPaper   = file.FileType === "PAPER";
  const isDeleted = !!file.deletedAt;
  const m         = file.metadata || {};

  // TODO: Add a new column for paperTitle and Month and year seperated.
  

  const title  = m.FileName || file.filePath?.split('/').pop() || (isPaper ? "Untitled paper" : "Untitled photo");
  const detail = isPaper
    ? [m.Season, m.MonthYear, m.Code, m.ScanOrDigital].filter(Boolean).join(" · ")
    : [m.Photographer, m.Quality, m.PictureDate ? fmt(m.PictureDate) : null].filter(Boolean).join(" · ");

  function initFields() {
    return {
      fileName:      m.FileName      ?? "",
      subject:       m.Subject       ?? "",
      monthYear:     m.MonthYear     ?? "",
      season:        m.Season        ?? "",
      semester:      m.Semester      ?? "",
      code:          m.Code          ?? "",
      scanOrDigital: m.ScanOrDigital ?? "",
      dataJSON:      m.DataJSON
                       ? (typeof m.DataJSON === "string" ? m.DataJSON : JSON.stringify(m.DataJSON, null, 2))
                       : "",
      quality:       m.Quality      ?? "",
      pictureDate:   m.PictureDate  ?? "",
      event:         m.Event        ?? "",
      photographer:  m.Photographer ?? "",
      folderID:      file.folderID != null ? String(file.folderID) : "",
    };
  }

  const [editing,  setEditing]  = useState(false);
  const [fields,   setFields]   = useState(initFields);
  const [busy,     setBusy]     = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [localErr, setLocalErr] = useState("");

  function setF(k, v) { setFields((p) => ({ ...p, [k]: v })); }

  function openEdit() {
    setFields(initFields());
    setLocalErr("");
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setLocalErr("");
  }

  async function save(e) {
    e.stopPropagation();
    setBusy(true);
    setLocalErr("");
    const payload = isPaper
      ? {
          subject:       fields.subject       || null,
          monthYear:     fields.monthYear      || null,
          season:        fields.season         || null,
          semester:      fields.semester       || null,
          code:          fields.code           || null,
          scanOrDigital: fields.scanOrDigital  || null,
        }
      : {
          dataJSON:      fields.dataJSON       || null,
          quality:       fields.quality        || null,
          pictureDate:   fields.pictureDate    || null,
          event:         fields.event          || null,
          photographer:  fields.photographer   || null,
        };
    payload.folderID  = fields.folderID === "" ? null : parseInt(fields.folderID, 10);
    payload.fileName  = fields.fileName || null;

    const { ok, data } = await updateFile(file.FileID, payload);
    setBusy(false);
    if (!ok) {
      const msg = data?.error || "Update failed.";
      setLocalErr(msg);
      onError(msg);
      return;
    }
    setEditing(false);
    onRefresh();
  }

  async function handleDelete(e) {
    e.stopPropagation();
    if (!window.confirm(`Soft-delete file #${file.FileID}?`)) return;
    setDeleting(true);
    const { ok, data } = await deleteFile(file.FileID, "delete");
    setDeleting(false);
    if (!ok) { onError(data?.error || "Delete failed."); return; }
    onRefresh();
  }

  async function handleRestore(e) {
    e.stopPropagation();
    const { ok, data } = await deleteFile(file.FileID, "restore");
    if (!ok) { onError(data?.error || "Restore failed."); return; }
    onRefresh();
  }

  // ── Thumbnail cell (shared between modes) ─────────────────────────────────
  const thumbCell = (
    <td className="pr-2 py-2 w-12">
      {!isPaper ? (
        <img
          src={getDownloadUrl(file.FileID)}
          alt=""
          className="w-10 h-10 object-cover rounded border border-gray-200 bg-gray-100"
          loading="lazy"
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
      ) : (
        <div className="w-10 h-10 rounded bg-gradient-to-br from-blue-50 to-indigo-100 border border-blue-100 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        </div>
      )}
    </td>
  );

  // ── EDIT MODE ──────────────────────────────────────────────────────────────
  if (editing) {
    return (
      <tr className="border-b border-indigo-100 bg-indigo-50/30">
        {/* Checkbox */}
        <td className="pl-3 pr-2 py-2 w-8">
          <input type="checkbox" checked={checked} onChange={(e) => onCheck(file.FileID, e.target.checked)}
            className="w-4 h-4 accent-blue-600 cursor-pointer" />
        </td>

        {thumbCell}

        {/* Type badge */}
        <td className="py-2 pr-2 w-24">
          <div className="flex flex-col gap-0.5">
            <Badge label={file.FileType} colour={isPaper ? "blue" : "yellow"} />
            {isDeleted && <Badge label="Deleted" colour="red" />}
          </div>
        </td>

        {/* Title input + folder selector */}
        <td className="py-2 pr-3 min-w-0">
          {localErr && <p className="text-[10px] text-red-600 mb-1 leading-tight">{localErr}</p>}
          <input
            type="text"
            placeholder="File name"
            value={fields.fileName}
            onChange={(e) => setF("fileName", e.target.value)}
            className="w-full border border-blue-300 rounded px-2 py-1 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white mb-1"
            autoFocus
          />
          <select
            value={fields.folderID}
            onChange={(e) => setF("folderID", e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            <option value="">— Root —</option>
            {folders.map((f) => (
              <option key={f.folderID} value={f.folderID}>{f.folderName}</option>
            ))}
          </select>
        </td>

        {/* Type-specific metadata inputs */}
        <td className="py-2 pr-3 hidden sm:table-cell">
          {isPaper ? (
            <div className="grid grid-cols-2 gap-1">
              <InlineInput placeholder="Month/Year" value={fields.monthYear}  onChange={(e) => setF("monthYear",  e.target.value)} />
              <InlineInput placeholder="Season"     value={fields.season}     onChange={(e) => setF("season",     e.target.value)} />
              <InlineInput placeholder="Semester"   value={fields.semester}   onChange={(e) => setF("semester",   e.target.value)} />
              <InlineInput placeholder="Code"       value={fields.code}       onChange={(e) => setF("code",       e.target.value)} />
              <select
                value={fields.scanOrDigital}
                onChange={(e) => setF("scanOrDigital", e.target.value)}
                className="col-span-2 border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
              >
                <option value="">Scan / Digital —</option>
                <option value="Scanned">Scanned</option>
                <option value="Digital">Digital</option>
              </select>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1">
              <InlineInput placeholder="Photographer" value={fields.photographer} onChange={(e) => setF("photographer", e.target.value)} />
              <InlineInput placeholder="Quality"      value={fields.quality}      onChange={(e) => setF("quality",      e.target.value)} />
              <InlineInput placeholder="Picture date" value={fields.pictureDate}  onChange={(e) => setF("pictureDate",  e.target.value)} type="date" />
              <InlineInput placeholder="DataJSON"     value={fields.dataJSON}     onChange={(e) => setF("dataJSON",     e.target.value)} mono />
            </div>
          )}
        </td>

        {/* Upload date — static while editing */}
        <td className="py-2 pr-3 hidden md:table-cell">
          <span className="text-xs text-gray-400 whitespace-nowrap">{fmt(file.DateUploaded)}</span>
        </td>

        {/* Save / Cancel */}
        <td className="py-2 pr-3">
          <div className="flex items-center gap-1">
            <button
              disabled={busy}
              onClick={save}
              className="px-2.5 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
            >
              {busy ? "…" : "Save"}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); cancelEdit(); }}
              className="px-2.5 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 whitespace-nowrap"
            >
              Cancel
            </button>
          </div>
        </td>
      </tr>
    );
  }

  // ── DISPLAY MODE ───────────────────────────────────────────────────────────
  return (
    <tr
      onClick={() => { if (isStaff && !isDeleted) openEdit(); }}
      className={`border-b border-gray-100 transition-colors
        ${isDeleted ? "bg-red-50/50" : "hover:bg-gray-50/80"}
        ${isStaff && !isDeleted ? "cursor-pointer" : ""}`}
    >
      {/* Checkbox */}
      <td className="pl-3 pr-2 py-2.5 w-8" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheck(file.FileID, e.target.checked)}
          className="w-4 h-4 accent-blue-600 cursor-pointer"
        />
      </td>

      {thumbCell}

      {/* Type + deleted badges */}
      <td className="py-2 pr-2 w-24">
        <div className="flex flex-col gap-0.5">
          <Badge label={file.FileType} colour={isPaper ? "blue" : "yellow"} />
          {isDeleted && <Badge label="Deleted" colour="red" />}
        </div>
      </td>

      {/* Title + folder breadcrumb */}
      <td className="py-2 pr-3 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate leading-snug">{title}</p>
        {file.folderName && (
          <p className="text-[11px] text-gray-400 truncate">{file.folderName}</p>
        )}
      </td>

      {/* Metadata detail */}
      <td className="py-2 pr-3 hidden sm:table-cell">
        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
          {detail || <span className="text-gray-300 italic">No metadata</span>}
        </p>
      </td>

      {/* Upload date */}
      <td className="py-2 pr-3 hidden md:table-cell">
        <span className="text-xs text-gray-400 whitespace-nowrap">{fmt(file.DateUploaded)}</span>
      </td>

      {/* Actions */}
      <td className="py-2 pr-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1 flex-wrap">
          <a
            href={getDownloadUrl(file.FileID)}
            target="_blank"
            rel="noreferrer"
            className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 whitespace-nowrap"
          >
            View
          </a>
          <a
            href={getForceDownloadUrl(file.FileID)}
            download
            className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 whitespace-nowrap"
            title="Download"
          >
            ↓
          </a>

          {isStaff && !isDeleted && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); openEdit(); }}
                className="px-2 py-0.5 text-xs bg-yellow-50 text-yellow-700 rounded hover:bg-yellow-100 whitespace-nowrap"
              >
                Edit
              </button>
              <button
                disabled={deleting}
                onClick={handleDelete}
                className="px-2 py-0.5 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100 disabled:opacity-50 whitespace-nowrap"
              >
                {deleting ? "…" : "Delete"}
              </button>
            </>
          )}

          {isStaff && isDeleted && (
            <button
              onClick={handleRestore}
              className="px-2 py-0.5 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100 whitespace-nowrap"
            >
              Restore
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── List root ────────────────────────────────────────────────────────────────
export default function FileList({ files, folders, isStaff, showDeleted, onRefresh }) {
  const [selected,  setSelected]  = useState(new Set());
  const [globalErr, setGlobalErr] = useState("");
  const [bulkBusy,  setBulkBusy]  = useState(false);

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
    const failed  = results.filter((r) => !r.ok);
    setBulkBusy(false);
    if (failed.length) setGlobalErr(`${failed.length} file(s) failed to delete.`);
    setSelected(new Set());
    onRefresh();
  }

  async function handleBulkRestore() {
    if (!selected.size) return;
    setBulkBusy(true);
    setGlobalErr("");
    const { bulkDeleteFiles } = await import("../api/files");
    const results = await bulkDeleteFiles([...selected], "restore");
    const failed  = results.filter((r) => !r.ok);
    setBulkBusy(false);
    if (failed.length) setGlobalErr(`${failed.length} file(s) failed to restore.`);
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

  const allChecked  = selected.size > 0 && selected.size === files.length;
  const someChecked = selected.size > 0 && selected.size < files.length;

  return (
    <div>
      {/* Bulk action bar */}
      <div className="flex items-center gap-3 mb-3 flex-wrap min-h-[2rem]">
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={allChecked}
            ref={(el) => { if (el) el.indeterminate = someChecked; }}
            onChange={(e) => toggleAll(e.target.checked)}
            className="w-4 h-4 accent-blue-600"
          />
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

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/80 text-xs text-gray-500 font-semibold uppercase tracking-wide">
              <th className="pl-3 pr-2 py-2.5 text-left w-8">
                <input
                  type="checkbox"
                  checked={allChecked}
                  ref={(el) => { if (el) el.indeterminate = someChecked; }}
                  onChange={(e) => toggleAll(e.target.checked)}
                  className="w-4 h-4 accent-blue-600 cursor-pointer"
                />
              </th>
              <th className="pr-2 py-2.5 w-12" />
              <th className="py-2.5 pr-2 text-left w-24">Type</th>
              <th className="py-2.5 pr-3 text-left">Name</th>
              <th className="py-2.5 pr-3 text-left hidden sm:table-cell">Details</th>
              <th className="py-2.5 pr-3 text-left hidden md:table-cell w-28">Uploaded</th>
              <th className="py-2.5 pr-3 text-left w-44">Actions</th>
            </tr>
          </thead>
          <tbody>
            {files.map((file) => (
              <FileRow
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
          </tbody>
        </table>
      </div>
    </div>
  );
}

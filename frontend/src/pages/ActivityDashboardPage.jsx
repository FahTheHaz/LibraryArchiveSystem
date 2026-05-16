import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import Navbar from "../components/Navbar";
import { getActivityLogs, getTopDownloads } from "../api/admin";
import { getFolders } from "../api/files";

// ─── Constants ────────────────────────────────────────────────────────────────
const ACTION_TYPES = [
  "LOGIN", "LOGIN_FAIL", "LOGOUT",
  "REGISTER", "REGISTER_FAIL",
  "UPLOAD", "BULK_UPLOAD",
  "UPDATE", "FILE_DELETE", "FILE_RESTORE",
  "DOWNLOAD", "VIEW", "BROWSE",
  "ADMIN:BAN", "ADMIN:UNBAN",
];

const ROLE_LABELS  = { 1: "Admin", 2: "Student", 3: "Staff" };
const ROLE_COLOURS = {
  1: "bg-purple-100 text-purple-700",
  2: "bg-blue-100 text-blue-700",
  3: "bg-green-100 text-green-700",
};

function actionColour(type) {
  if (!type) return "bg-gray-100 text-gray-500";
  if (type.includes("FAIL") || type.includes("BAN")) return "bg-red-100 text-red-700";
  if (["UPLOAD", "BULK_UPLOAD", "UPDATE", "FILE_DELETE", "FILE_RESTORE"].includes(type))
    return "bg-yellow-100 text-yellow-700";
  if (["LOGIN", "REGISTER"].includes(type)) return "bg-green-100 text-green-700";
  return "bg-gray-100 text-gray-600";
}

function isoDate(offset = 0) {
  return new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
}

// ─── CSV helpers ──────────────────────────────────────────────────────────────
function escapeCSV(val) {
  const s = val == null ? "" : String(val);
  if (s.includes('"') || s.includes(',') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function downloadCSVBlob(rows, headers, filename) {
  const lines = [
    headers.join(","),
    ...rows.map((r) => r.map(escapeCSV).join(",")),
  ];
  const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function logsToRows(logs) {
  return logs.map((l) => [
    l.logID,
    l.actTime,
    l.username  || "",
    l.email     || "",
    ROLE_LABELS[parseInt(l.roleID)] || "",
    l.actionType,
    l.description,
    l.targetFileID    || "",
    l.targetFolderName || "",
    l.ip || "",
  ]);
}

// ─── Folder tree helpers ───────────────────────────────────────────────────────
function buildFolderTree(folders) {
  const map  = {};
  folders.forEach((f) => { map[f.folderID] = { ...f, children: [] }; });
  const roots = [];
  folders.forEach((f) => {
    const parts = f.pathIDString.split("/").filter(Boolean);
    if (parts.length <= 1) {
      roots.push(map[f.folderID]);
    } else {
      const parentID = parseInt(parts[parts.length - 2], 10);
      if (map[parentID]) map[parentID].children.push(map[f.folderID]);
      else roots.push(map[f.folderID]);
    }
  });
  return roots;
}

function flattenTree(nodes, depth = 0) {
  const result = [];
  [...nodes]
    .sort((a, b) => a.folderName.localeCompare(b.folderName))
    .forEach((node) => {
      result.push({ ...node, depth });
      result.push(...flattenTree(node.children, depth + 1));
    });
  return result;
}

// ─── Folder checklist ─────────────────────────────────────────────────────────
function FolderChecklist({ folders, selected, onChange, onClear }) {
  const flat = flattenTree(buildFolderTree(folders));
  if (flat.length === 0) {
    return <p className="text-xs text-gray-400 px-2 py-3">No folders found.</p>;
  }
  return (
    <div>
      <div className="max-h-52 overflow-y-auto border border-gray-200 rounded-lg">
        {flat.map((f) => (
          <label key={f.folderID} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 cursor-pointer select-none">
            <input
              type="checkbox"
              className="w-3.5 h-3.5 accent-blue-600 shrink-0"
              checked={selected.has(f.folderID)}
              onChange={(e) => onChange(f.folderID, e.target.checked)}
            />
            <span className="text-xs text-gray-700 truncate" style={{ paddingLeft: f.depth * 14 }}>
              {f.depth > 0 && <span className="text-gray-300 mr-1">└</span>}
              {f.folderName}
            </span>
          </label>
        ))}
      </div>
      {selected.size > 0 && (
        <button type="button" onClick={onClear} className="mt-1.5 text-[10px] text-blue-500 hover:underline">
          Clear {selected.size} selected
        </button>
      )}
    </div>
  );
}

// ─── Date range (local-time safe) ─────────────────────────────────────────────
function dateRange(from, to) {
  const days = [];
  if (!from || !to) return days;
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  let d = new Date(fy, fm - 1, fd);
  const end = new Date(ty, tm - 1, td);
  while (d <= end) {
    const y   = d.getFullYear();
    const m   = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    days.push(`${y}-${m}-${day}`);
    d.setDate(d.getDate() + 1);
  }
  return days;
}

// ─── SVG Bar Chart ─────────────────────────────────────────────────────────────
function ActivityChart({ data, dateFrom, dateTo }) {
  const days = dateRange(dateFrom, dateTo);
  if (!data || (data.length === 0 && days.length === 0)) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
        No activity in this period
      </div>
    );
  }
  const countMap   = Object.fromEntries((data ?? []).map((d) => [d.date, d.count]));
  const allDays    = days.length > 0 ? days : (data ?? []).map((d) => d.date);
  const counts     = allDays.map((d) => countMap[d] ?? 0);
  const maxCount   = Math.max(...counts, 1);
  const svgW = 900, svgH = 160, padL = 36, padR = 8, padT = 10, padB = 30;
  const chartW = svgW - padL - padR;
  const chartH = svgH - padT - padB;
  const gap    = chartW / allDays.length;
  const barW   = Math.max(2, gap - 1);
  const labelEvery = Math.max(1, Math.ceil(allDays.length / 12));

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full" style={{ height: svgH }}>
      <line x1={padL} y1={padT}        x2={padL}        y2={svgH - padB} stroke="#e5e7eb" />
      <line x1={padL} y1={svgH - padB} x2={svgW - padR} y2={svgH - padB} stroke="#e5e7eb" />
      {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
        const y = padT + chartH * (1 - frac);
        return (
          <g key={frac}>
            <line x1={padL} y1={y} x2={svgW - padR} y2={y} stroke="#f3f4f6" />
            <text x={padL - 4} y={y + 4} textAnchor="end" fontSize={9} fill="#9ca3af">
              {Math.round(maxCount * frac)}
            </text>
          </g>
        );
      })}
      {counts.map((c, i) => {
        const x    = padL + i * gap + (gap - barW) / 2;
        const barH = Math.max(c > 0 ? 2 : 0, (c / maxCount) * chartH);
        const y    = padT + chartH - barH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} fill="#3b82f6" rx={1} opacity={0.75}>
              <title>{`${allDays[i]}: ${c} event${c !== 1 ? "s" : ""}`}</title>
            </rect>
            {i % labelEvery === 0 && (
              <text x={x + barW / 2} y={svgH - padB + 14} textAnchor="middle" fontSize={8} fill="#9ca3af">
                {allDays[i].slice(5)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Badges ───────────────────────────────────────────────────────────────────
function RoleBadge({ roleID }) {
  const rid = parseInt(roleID);
  return (
    <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${ROLE_COLOURS[rid] ?? "bg-gray-100 text-gray-500"}`}>
      {ROLE_LABELS[rid] ?? "—"}
    </span>
  );
}

function ActionBadge({ type }) {
  return (
    <span className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-medium ${actionColour(type)}`}>
      {type || "—"}
    </span>
  );
}

// ─── Top 10 card ──────────────────────────────────────────────────────────────
function Top10Card() {
  const [top10,   setTop10]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTopDownloads().then(({ ok, data }) => {
      if (ok) setTop10(data.top10 ?? []);
      setLoading(false);
    });
  }, []);

  function exportTop10() {
    const headers = ["Rank", "File Name", "Type", "Folder", "Downloads"];
    const rows    = top10.map((f, i) => [
      i + 1,
      f.displayName,
      f.fileType   || "",
      f.folderName || "",
      f.downloadCount,
    ]);
    downloadCSVBlob(rows, headers, "top10_downloads.csv");
  }

  const medalColour = (i) => i === 0 ? "text-yellow-500" : i === 1 ? "text-gray-400" : i === 2 ? "text-amber-600" : "text-gray-300";
  const medalIcon   = (i) => i < 3 ? "▲" : "·";

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">Top 10 Most Downloaded Files</h2>
        <button
          onClick={exportTop10}
          disabled={top10.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-40 font-medium"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
          Export CSV
        </button>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-10 text-gray-400 text-sm">Loading…</div>
      ) : top10.length === 0 ? (
        <div className="flex items-center justify-center py-10 text-gray-400 text-sm">No download records yet</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-100 text-xs text-gray-500 font-semibold uppercase tracking-wide">
              <th className="px-4 py-2.5 text-left w-10">#</th>
              <th className="px-4 py-2.5 text-left">File Name</th>
              <th className="px-4 py-2.5 text-left w-20">Type</th>
              <th className="px-4 py-2.5 text-left">Folder</th>
              <th className="px-4 py-2.5 text-right w-24">Downloads</th>
            </tr>
          </thead>
          <tbody>
            {top10.map((f, i) => (
              <tr key={f.fileID} className="border-b border-gray-50 hover:bg-gray-50/60">
                <td className="px-4 py-2.5">
                  <span className={`text-sm font-bold ${medalColour(i)}`}>{medalIcon(i)}</span>
                  <span className="text-xs text-gray-400 ml-1">{i + 1}</span>
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-800 font-medium max-w-xs truncate" title={f.displayName}>
                  {f.displayName || `File #${f.fileID}`}
                </td>
                <td className="px-4 py-2.5">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                    f.fileType === "PAPER" ? "bg-blue-50 text-blue-600" : "bg-pink-50 text-pink-600"
                  }`}>
                    {f.fileType || "—"}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-500 truncate max-w-[140px]">
                  {f.folderName || <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <span className="text-sm font-bold text-blue-600">{f.downloadCount}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ActivityDashboardPage() {
  const navigate = useNavigate();
  const chartRef = useRef(null);

  const defaultFilters = {
    search:     "",
    actionType: "",
    role:       "",
    userID:     "",
    dateFrom:   isoDate(-29),
    dateTo:     isoDate(0),
  };

  const [filters,          setFilters]          = useState(defaultFilters);
  const [applied,          setApplied]          = useState(defaultFilters);
  const [selectedFolders,  setSelectedFolders]  = useState(new Set());
  const [appliedFolders,   setAppliedFolders]   = useState(new Set());
  const [page,             setPage]             = useState(1);

  const [logs,       setLogs]       = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalLogs: 0 });
  const [chartData,  setChartData]  = useState([]);
  const [folders,    setFolders]    = useState([]);

  const [loading,       setLoading]       = useState(false);
  const [chartLoading,  setChartLoading]  = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [pdfLoading,    setPdfLoading]    = useState(false);
  const [error,         setError]         = useState("");

  function setF(k, v) { setFilters((p) => ({ ...p, [k]: v })); }

  function toggleFolder(id, checked) {
    setSelectedFolders((prev) => {
      const next = new Set(prev);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
  }

  function applyFilters(e) {
    e.preventDefault();
    setApplied({ ...filters });
    setAppliedFolders(new Set(selectedFolders));
    setPage(1);
  }

  function resetFilters() {
    setFilters(defaultFilters);
    setApplied(defaultFilters);
    setSelectedFolders(new Set());
    setAppliedFolders(new Set());
    setPage(1);
  }

  useEffect(() => {
    getFolders().then(({ ok, data }) => {
      if (ok) setFolders(data.folders ?? []);
    });
  }, []);

  function filterParams() {
    const p = { ...applied };
    if (appliedFolders.size > 0) p.folderIDs = [...appliedFolders].join(",");
    return p;
  }

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { ok, status, data } = await getActivityLogs({ page, limit: 50, ...filterParams() });
      if (status === 401 || status === 403) { navigate("/"); return; }
      if (!ok) { setError(data?.error || "Failed to load logs."); return; }
      setLogs(data.logs ?? []);
      setPagination(data.pagination ?? { currentPage: 1, totalPages: 1, totalLogs: 0 });
    } catch (err) {
      setError(`Network error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, page, applied, appliedFolders]);

  const loadChart = useCallback(async () => {
    setChartLoading(true);
    try {
      const { ok, data } = await getActivityLogs({ chart: "1", ...filterParams() });
      if (ok) setChartData(data.chartData ?? []);
    } catch { /* non-fatal */ }
    finally { setChartLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applied, appliedFolders]);

  useEffect(() => { loadLogs();  }, [loadLogs]);
  useEffect(() => { loadChart(); }, [loadChart]);

  // ── CSV export of filtered logs ───────────────────────────────────────────
  async function exportCSV() {
    setExportLoading(true);
    try {
      const { ok, data } = await getActivityLogs({ export: "1", ...filterParams() });
      if (!ok) { alert(data?.error || "Export failed."); return; }
      const headers = ["LogID","Time","Username","Email","Role","ActionType","Description","TargetFileID","TargetFolder","IP"];
      downloadCSVBlob(logsToRows(data.logs ?? []), headers, `activity_export_${isoDate(0)}.csv`);
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setExportLoading(false);
    }
  }

  // ── PDF export of chart ───────────────────────────────────────────────────
  async function exportPDF() {
    if (!chartRef.current) return;
    setPdfLoading(true);
    try {
      const canvas  = await html2canvas(chartRef.current, { scale: 2, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf     = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pdfW    = pdf.internal.pageSize.getWidth();
      const pdfH    = pdf.internal.pageSize.getHeight();

      pdf.setFontSize(13);
      pdf.setTextColor(40, 40, 40);
      pdf.text("Activity Dashboard — Chart", 14, 14);
      pdf.setFontSize(9);
      pdf.setTextColor(130, 130, 130);
      pdf.text(`Period: ${applied.dateFrom} → ${applied.dateTo}   |   Generated: ${new Date().toLocaleString("en-GB")}`, 14, 21);

      const imgProps = pdf.getImageProperties(imgData);
      const maxW  = pdfW - 28;
      const maxH  = pdfH - 32;
      const ratio = Math.min(maxW / imgProps.width, maxH / imgProps.height);
      const imgW  = imgProps.width  * ratio;
      const imgH  = imgProps.height * ratio;
      pdf.addImage(imgData, "PNG", 14, 26, imgW, imgH);
      pdf.save(`activity_chart_${applied.dateFrom}_${applied.dateTo}.pdf`);
    } catch (err) {
      alert(`PDF export failed: ${err.message}`);
    } finally {
      setPdfLoading(false);
    }
  }

  function fmt(dateStr) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <div className="flex-1 px-6 py-6 max-w-7xl mx-auto w-full">
        <h1 className="text-xl font-bold text-gray-800 mb-5">Activity Dashboard</h1>

        {/* ── Filters ── */}
        <form onSubmit={applyFilters} className="bg-white border border-gray-200 rounded-xl p-4 mb-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Search</label>
              <input
                type="text"
                placeholder="User / description…"
                value={filters.search}
                onChange={(e) => setF("search", e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Action Type</label>
              <select
                value={filters.actionType}
                onChange={(e) => setF("actionType", e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
              >
                <option value="">All types</option>
                {ACTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Role</label>
              <select
                value={filters.role}
                onChange={(e) => setF("role", e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
              >
                <option value="">All roles</option>
                <option value="1">Admin</option>
                <option value="3">Staff</option>
                <option value="2">Student</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">User ID</label>
              <input
                type="number"
                min="1"
                placeholder="e.g. 7"
                value={filters.userID}
                onChange={(e) => setF("userID", e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">From</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setF("dateFrom", e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">To</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setF("dateTo", e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
          </div>

          {/* Folder checklist */}
          <div className="border-t border-gray-100 pt-3 mb-3">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Filter by target file folder
              {selectedFolders.size > 0 && (
                <span className="ml-2 normal-case font-normal text-blue-500">
                  {selectedFolders.size} selected
                </span>
              )}
            </p>
            <FolderChecklist
              folders={folders}
              selected={selectedFolders}
              onChange={toggleFolder}
              onClear={() => setSelectedFolders(new Set())}
            />
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={resetFilters}
              className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50">
              Reset
            </button>
            <button type="submit"
              className="px-4 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
              Apply
            </button>
          </div>
        </form>

        {/* ── Chart + PDF export ── */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-700">Activity over time</h2>
              <span className="text-xs text-gray-400">{applied.dateFrom} → {applied.dateTo}</span>
            </div>
            <button
              onClick={exportPDF}
              disabled={pdfLoading || chartLoading || chartData.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-40 font-medium"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              {pdfLoading ? "Generating…" : "Export PDF"}
            </button>
          </div>
          <div ref={chartRef} className="bg-white p-1">
            {chartLoading
              ? <div className="h-40 flex items-center justify-center text-gray-400 text-sm">Loading chart…</div>
              : <ActivityChart data={chartData} dateFrom={applied.dateFrom} dateTo={applied.dateTo} />
            }
          </div>
        </div>

        {/* ── Two-column: Top 10 + gap ── */}
        <div className="mb-5">
          <Top10Card />
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
        )}

        {/* ── Log table ── */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">
              Log entries
              {!loading && (
                <span className="ml-2 text-gray-400 font-normal text-xs">({pagination.totalLogs} total)</span>
              )}
            </h2>
            <button
              onClick={exportCSV}
              disabled={exportLoading || loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-40 font-medium"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
              {exportLoading ? "Exporting…" : `Export CSV${pagination.totalLogs > 0 ? ` (${pagination.totalLogs})` : ""}`}
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Loading…</div>
          ) : logs.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-gray-400 text-sm">No logs found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100 text-xs text-gray-500 font-semibold uppercase tracking-wide">
                    <th className="px-4 py-2.5 text-left w-14">#</th>
                    <th className="px-4 py-2.5 text-left w-36">Time</th>
                    <th className="px-4 py-2.5 text-left">User</th>
                    <th className="px-4 py-2.5 text-left w-20">Role</th>
                    <th className="px-4 py-2.5 text-left w-36">Action</th>
                    <th className="px-4 py-2.5 text-left">Description</th>
                    <th className="px-4 py-2.5 text-left w-32">Target file</th>
                    <th className="px-4 py-2.5 text-left hidden lg:table-cell w-28">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.logID} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-2.5 text-xs text-gray-400 font-mono">{log.logID}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{fmt(log.actTime)}</td>
                      <td className="px-4 py-2.5">
                        {log.username
                          ? <div>
                              <p className="text-xs font-medium text-gray-800 leading-snug">{log.username}</p>
                              <p className="text-[10px] text-gray-400">{log.email}</p>
                            </div>
                          : <span className="text-xs text-gray-400 italic">Anonymous</span>
                        }
                      </td>
                      <td className="px-4 py-2.5">
                        {log.roleID
                          ? <RoleBadge roleID={log.roleID} />
                          : <span className="text-xs text-gray-300">—</span>
                        }
                      </td>
                      <td className="px-4 py-2.5"><ActionBadge type={log.actionType} /></td>
                      <td className="px-4 py-2.5 text-xs text-gray-600 max-w-xs truncate" title={log.description}>
                        {log.description || "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        {log.targetFileID
                          ? <div>
                              <p className="text-xs font-mono text-gray-600">#{log.targetFileID}</p>
                              {log.targetFolderName && (
                                <p className="text-[10px] text-gray-400 truncate">{log.targetFolderName}</p>
                              )}
                            </div>
                          : <span className="text-xs text-gray-300">—</span>
                        }
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-400 font-mono hidden lg:table-cell">
                        {log.ip || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && pagination.totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 py-4 border-t border-gray-100">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40">
                ← Prev
              </button>
              <span className="text-sm text-gray-600">
                {pagination.currentPage} / {pagination.totalPages}
                <span className="text-gray-400 ml-1">({pagination.totalLogs} entries)</span>
              </span>
              <button disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40">
                Next →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

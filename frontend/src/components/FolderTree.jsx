import { useState } from "react";
import { createFolder, renameFolder, moveFolder, deleteFolder } from "../api/files";

// ─── Icons (inline SVG, no dep) ──────────────────────────────────────────────
function IconFolder({ open }) {
  return (
    <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
      {open ? (
        <path d="M2 6a2 2 0 012-2h4l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
      ) : (
        <path
          fillRule="evenodd"
          d="M2 6a2 2 0 012-2h4l2 2h6a2 2 0 012 2v1H2V6zm0 4h16v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"
          clipRule="evenodd"
        />
      )}
    </svg>
  );
}

function IconChevron({ open }) {
  return (
    <svg
      className={`w-3 h-3 shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

// ─── Single node ──────────────────────────────────────────────────────────────
function FolderNode({
  folder,
  allFolders,
  selectedID,
  onSelect,
  isStaff,
  onRefresh,
  depth = 0,
}) {
  const children = allFolders.filter((f) => f.parentID === folder.folderID);
  const [open, setOpen] = useState(depth === 0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mode, setMode] = useState(null); // "rename" | "newFolder" | "move"
  const [inputVal, setInputVal] = useState("");
  const [moveTarget, setMoveTarget] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const isSelected = selectedID === folder.folderID;

  async function handleRename() {
    if (!inputVal.trim()) return;
    setBusy(true);
    setErr("");
    const { ok, data } = await renameFolder(folder.folderID, inputVal.trim());
    setBusy(false);
    if (!ok) { setErr(data?.error || "Rename failed."); return; }
    setMode(null);
    setMenuOpen(false);
    onRefresh();
  }

  async function handleNewFolder() {
    if (!inputVal.trim()) return;
    setBusy(true);
    setErr("");
    const { ok, data } = await createFolder(inputVal.trim(), folder.folderID);
    setBusy(false);
    if (!ok) { setErr(data?.error || "Create failed."); return; }
    setMode(null);
    setMenuOpen(false);
    setOpen(true);
    onRefresh();
  }

  async function handleMove() {
    const targetID = moveTarget === "" ? null : parseInt(moveTarget, 10);
    setBusy(true);
    setErr("");
    const { ok, data } = await moveFolder(folder.folderID, targetID);
    setBusy(false);
    if (!ok) { setErr(data?.error || "Move failed."); return; }
    setMode(null);
    setMenuOpen(false);
    onRefresh();
  }

  async function handleDelete() {
    if (!window.confirm(`Delete folder "${folder.folderName}"? It must be empty.`)) return;
    setBusy(true);
    setErr("");
    const { ok, data } = await deleteFolder(folder.folderID);
    setBusy(false);
    if (!ok) { setErr(data?.error || "Delete failed."); return; }
    setMenuOpen(false);
    onRefresh();
  }

  function startMode(m, initial = "") {
    setMode(m);
    setInputVal(initial);
    setMoveTarget("");
    setErr("");
    setMenuOpen(false);
  }

  const indent = depth * 16;

  return (
    <div>
      {/* Row */}
      <div
        className={`flex items-center gap-1 px-2 py-1 rounded cursor-pointer text-sm select-none
          ${isSelected ? "bg-blue-100 text-blue-800 font-medium" : "hover:bg-gray-100 text-gray-700"}`}
        style={{ paddingLeft: `${indent + 8}px` }}
      >
        {/* Expand chevron */}
        <span
          className="w-4 flex items-center justify-center text-gray-400"
          onClick={() => setOpen((o) => !o)}
        >
          {children.length > 0 ? <IconChevron open={open} /> : null}
        </span>

        {/* Folder name */}
        <span
          className="flex items-center gap-1.5 flex-1 min-w-0 truncate"
          onClick={() => { onSelect(folder); if (children.length > 0) setOpen(true); }}
        >
          <span className={isSelected ? "text-blue-600" : "text-yellow-500"}>
            <IconFolder open={open && children.length > 0} />
          </span>
          <span className="truncate">{folder.folderName}</span>
        </span>

        {/* Admin/Staff actions */}
        {isStaff && (
          <div className="relative shrink-0">
            <button
              className="px-1 text-gray-400 hover:text-gray-700 rounded"
              onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); }}
              title="Folder options"
            >
              ···
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-6 z-50 bg-white border border-gray-200 rounded shadow-lg text-xs w-36">
                <button className="w-full text-left px-3 py-2 hover:bg-gray-50" onClick={() => startMode("newFolder")}>New sub-folder</button>
                <button className="w-full text-left px-3 py-2 hover:bg-gray-50" onClick={() => startMode("rename", folder.folderName)}>Rename</button>
                <button className="w-full text-left px-3 py-2 hover:bg-gray-50" onClick={() => startMode("move")}>Move</button>
                <button className="w-full text-left px-3 py-2 hover:bg-red-50 text-red-600" onClick={handleDelete}>Delete</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Inline action panel */}
      {mode && (
        <div className="mx-2 mb-1 p-2 bg-gray-50 border border-gray-200 rounded text-xs" style={{ marginLeft: `${indent + 24}px` }}>
          {err && <p className="text-red-500 mb-1">{err}</p>}

          {(mode === "rename" || mode === "newFolder") && (
            <>
              <p className="text-gray-500 mb-1">{mode === "rename" ? "New name:" : "Sub-folder name:"}</p>
              <input
                autoFocus
                className="w-full border border-gray-300 rounded px-2 py-1 text-xs mb-1"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") mode === "rename" ? handleRename() : handleNewFolder(); }}
              />
              <div className="flex gap-1">
                <button disabled={busy} onClick={mode === "rename" ? handleRename : handleNewFolder}
                  className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
                  {busy ? "…" : "OK"}
                </button>
                <button onClick={() => setMode(null)} className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300">Cancel</button>
              </div>
            </>
          )}

          {mode === "move" && (
            <>
              <p className="text-gray-500 mb-1">Move to folder (ID), or blank for root:</p>
              <select
                autoFocus
                className="w-full border border-gray-300 rounded px-2 py-1 text-xs mb-1"
                value={moveTarget}
                onChange={(e) => setMoveTarget(e.target.value)}
              >
                <option value="">— Root —</option>
                {allFolders
                  .filter((f) => f.folderID !== folder.folderID && !f.pathIDString.startsWith(folder.pathIDString))
                  .map((f) => (
                    <option key={f.folderID} value={f.folderID}>
                      {f.pathIDString} {f.folderName}
                    </option>
                  ))}
              </select>
              <div className="flex gap-1">
                <button disabled={busy} onClick={handleMove}
                  className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
                  {busy ? "…" : "Move"}
                </button>
                <button onClick={() => setMode(null)} className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300">Cancel</button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Children */}
      {open && children.map((child) => (
        <FolderNode
          key={child.folderID}
          folder={child}
          allFolders={allFolders}
          selectedID={selectedID}
          onSelect={onSelect}
          isStaff={isStaff}
          onRefresh={onRefresh}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}

// ─── Tree root ────────────────────────────────────────────────────────────────
export default function FolderTree({ folders, selectedID, onSelect, isStaff, onRefresh }) {
  const [newRootName, setNewRootName] = useState("");
  const [creatingRoot, setCreatingRoot] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const roots = folders.filter((f) => f.parentID === null || f.parentID === 0);

  async function handleCreateRoot() {
    if (!newRootName.trim()) return;
    setBusy(true);
    setErr("");
    const { ok, data } = await createFolder(newRootName.trim(), null);
    setBusy(false);
    if (!ok) { setErr(data?.error || "Create failed."); return; }
    setNewRootName("");
    setCreatingRoot(false);
    onRefresh();
  }

  return (
    <div className="select-none">
      {/* "All files" root entry */}
      <div
        className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer text-sm
          ${selectedID === null ? "bg-blue-100 text-blue-700 font-medium" : "hover:bg-gray-100 text-gray-600"}`}
        onClick={() => onSelect(null)}
      >
        <span className="text-gray-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h18M3 17h18" />
          </svg>
        </span>
        All files
      </div>

      {roots.map((folder) => (
        <FolderNode
          key={folder.folderID}
          folder={folder}
          allFolders={folders}
          selectedID={selectedID}
          onSelect={onSelect}
          isStaff={isStaff}
          onRefresh={onRefresh}
          depth={0}
        />
      ))}

      {/* Admin/Staff: create root folder */}
      {isStaff && (
        <div className="mt-2 px-2">
          {creatingRoot ? (
            <div className="p-2 bg-gray-50 border border-gray-200 rounded text-xs">
              {err && <p className="text-red-500 mb-1">{err}</p>}
              <input
                autoFocus
                className="w-full border border-gray-300 rounded px-2 py-1 text-xs mb-1"
                placeholder="Folder name"
                value={newRootName}
                onChange={(e) => setNewRootName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleCreateRoot(); }}
              />
              <div className="flex gap-1">
                <button disabled={busy} onClick={handleCreateRoot}
                  className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50">
                  {busy ? "…" : "Create"}
                </button>
                <button onClick={() => setCreatingRoot(false)} className="px-2 py-1 bg-gray-200 rounded text-xs">Cancel</button>
              </div>
            </div>
          ) : (
            <button
              className="w-full text-xs text-gray-500 hover:text-blue-600 py-1 flex items-center gap-1"
              onClick={() => setCreatingRoot(true)}
            >
              <span className="text-lg leading-none">+</span> New root folder
            </button>
          )}
        </div>
      )}
    </div>
  );
}

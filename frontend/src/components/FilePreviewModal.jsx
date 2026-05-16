import { useState, useEffect, useCallback } from "react";
import { getDownloadUrl } from "../api/files";
import { getFileTags, createTag, voteTag, detachTag, deleteTag } from "../api/tags";

// null/undefined Source = user-made; anything else = AI/machine
function isUserTag(tag) {
  return !tag.Source;
}

// ─── Voteable tag chip (used only inside the modal) ──────────────────────────
function TagPillVoteable({ tag, onDetach, onHardDelete, isAdmin }) {
  const [yourVote,    setYourVote]    = useState(0);
  const [helpfulness, setHelpfulness] = useState(Number(tag.Helpfulness) || 0);
  const [hovered,     setHovered]     = useState(false);
  const [voting,      setVoting]      = useState(false);

  const isUser = isUserTag(tag);
  const colourCls = isUser
    ? "bg-green-50 text-green-700 border-green-200"
    : "bg-blue-50 text-blue-700 border-blue-200";

  async function handleVote(v) {
    if (voting) return;
    setVoting(true);
    const { ok, data } = await voteTag(tag.TagID, v);
    if (ok) {
      setHelpfulness(data.helpfulness);
      setYourVote(data.yourVote);
    }
    setVoting(false);
  }

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Vote tooltip — appears above on hover */}
      {hovered && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 flex items-center gap-0.5 bg-white border border-gray-200 rounded-full shadow-md px-1.5 py-0.5 z-20 whitespace-nowrap">
          <button
            onClick={() => handleVote(1)}
            disabled={voting}
            title="Upvote"
            className={`text-[11px] px-0.5 transition-colors ${yourVote === 1 ? "text-green-600 font-bold" : "text-gray-400 hover:text-green-600"}`}
          >▲</button>
          <span className="text-[10px] text-gray-500 min-w-[12px] text-center">
            {helpfulness > 0 ? `+${helpfulness}` : helpfulness}
          </span>
          <button
            onClick={() => handleVote(-1)}
            disabled={voting}
            title="Downvote"
            className={`text-[11px] px-0.5 transition-colors ${yourVote === -1 ? "text-red-500 font-bold" : "text-gray-400 hover:text-red-500"}`}
          >▼</button>
        </div>
      )}

      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${colourCls}`}>
        {tag.TagContent}
        {helpfulness !== 0 && (
          <span className="text-[9px] opacity-50">{helpfulness > 0 ? `+${helpfulness}` : helpfulness}</span>
        )}

        {/* Detach from this file (any logged-in user — server enforces ownership) */}
        {onDetach && (
          <button
            onClick={() => onDetach(tag.TagID)}
            className="ml-0.5 opacity-40 hover:opacity-100 hover:text-red-500 leading-none transition-opacity"
            title="Remove from this file"
          >×</button>
        )}

        {/* Hard delete (admin only) */}
        {isAdmin && onHardDelete && (
          <button
            onClick={() => onHardDelete(tag.TagID, tag.TagContent)}
            className="ml-0.5 opacity-40 hover:opacity-100 hover:text-red-600 leading-none transition-opacity text-[10px]"
            title="Delete tag from all files"
          >🗑</button>
        )}
      </span>
    </div>
  );
}

// ─── Tag section (user or AI) ────────────────────────────────────────────────
function TagSection({ title, colourText, tags, onDetach, onHardDelete, isAdmin }) {
  const [expanded, setExpanded] = useState(false);
  if (tags.length === 0) return null;
  const shown = expanded ? tags : tags.slice(0, 6);

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-xs font-semibold uppercase tracking-wide ${colourText}`}>{title}</span>
        <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 rounded-full">{tags.length}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {shown.map((tag) => (
          <TagPillVoteable
            key={tag.TagID}
            tag={tag}
            onDetach={onDetach}
            onHardDelete={onHardDelete}
            isAdmin={isAdmin}
          />
        ))}
        {tags.length > 6 && (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="text-[11px] text-gray-400 hover:text-gray-600 underline self-center"
          >
            {expanded ? "show less" : `+${tags.length - 6} more`}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Modal root ───────────────────────────────────────────────────────────────
export default function FilePreviewModal({ file, isStaff, isAdmin, onClose, onRefresh }) {
  const isPaper = file.FileType === "PAPER";
  const m       = file.metadata || {};
  const title   = m.FileName || file.filePath?.split("/").pop()
                  || (isPaper ? "Untitled paper" : "Untitled photo");

  const [tags,        setTags]        = useState([]);
  const [tagsLoading, setTagsLoading] = useState(true);
  const [tagsError,   setTagsError]   = useState("");
  const [newTag,      setNewTag]      = useState("");
  const [addBusy,     setAddBusy]     = useState(false);
  const [addError,    setAddError]    = useState("");

  const loadTags = useCallback(async () => {
    setTagsLoading(true);
    setTagsError("");
    const { ok, data } = await getFileTags(file.FileID);
    setTagsLoading(false);
    if (ok) {
      setTags([...(data.tags || [])].sort((a, b) => (b.Helpfulness || 0) - (a.Helpfulness || 0)));
    } else {
      setTagsError(data?.error || "Failed to load tags.");
    }
  }, [file.FileID]);

  useEffect(() => { loadTags(); }, [loadTags]);

  // Close on Escape key
  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleAddTag(e) {
    e.preventDefault();
    if (!newTag.trim()) return;
    setAddBusy(true);
    setAddError("");
    const { ok, data } = await createTag(newTag.trim(), file.FileID);
    setAddBusy(false);
    if (!ok) { setAddError(data?.error || "Failed to add tag."); return; }
    setNewTag("");
    loadTags();
  }

  async function handleDetach(tagID) {
    const { ok, data } = await detachTag(tagID, file.FileID);
    if (!ok) { setTagsError(data?.error || "Failed to remove tag."); return; }
    setTags((prev) => prev.filter((t) => t.TagID !== tagID));
  }

  async function handleHardDelete(tagID, content) {
    if (!window.confirm(`Permanently delete tag "${content}" from ALL files?`)) return;
    const { ok, data } = await deleteTag(tagID);
    if (!ok) { setTagsError(data?.error || "Failed to delete tag."); return; }
    setTags((prev) => prev.filter((t) => t.TagID !== tagID));
  }

  const userTags    = tags.filter((t) => isUserTag(t));
  const machineTags = tags.filter((t) => !isUserTag(t));
  const previewUrl  = getDownloadUrl(file.FileID);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl flex overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 text-sm font-medium transition-colors"
          title="Close (Esc)"
        >✕</button>

        {/* ── Left: File Preview ────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-gray-200">
          {/* Title bar */}
          <div className="px-4 py-3 bg-white border-b border-gray-100 flex items-center gap-2 shrink-0">
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${
              isPaper ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700"
            }`}>
              {file.FileType}
            </span>
            <span className="text-sm font-semibold text-gray-800 truncate">{title}</span>
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className="ml-auto shrink-0 text-xs text-blue-600 hover:underline"
              title="Open in new tab"
            >
              ↗ Full view
            </a>
          </div>

          {/* Preview area */}
          <div className="flex-1 bg-gray-50 overflow-hidden">
            {isPaper ? (
              <iframe
                src={previewUrl}
                className="w-full h-full border-0"
                title={title}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center p-6">
                <img
                  src={previewUrl}
                  alt={title}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-md"
                />
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Tags Panel ─────────────────────────────────────────── */}
        <div className="w-72 shrink-0 flex flex-col overflow-hidden">
          {/* Panel header */}
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 shrink-0">
            <h3 className="text-sm font-semibold text-gray-700">Tags</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Hover a tag to vote · Sorted by helpfulness
            </p>
          </div>

          {/* Tag lists */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {tagsLoading && (
              <p className="text-xs text-gray-400">Loading tags…</p>
            )}

            {!tagsLoading && tagsError && (
              <p className="text-xs text-red-500">{tagsError}</p>
            )}

            {!tagsLoading && !tagsError && (
              <>
                <TagSection
                  title="User tags"
                  colourText="text-green-700"
                  tags={userTags}
                  onDetach={isStaff ? handleDetach : null}
                  onHardDelete={isAdmin ? handleHardDelete : null}
                  isAdmin={isAdmin}
                />
                <TagSection
                  title="AI tags"
                  colourText="text-blue-700"
                  tags={machineTags}
                  onDetach={isAdmin ? handleDetach : null}
                  onHardDelete={isAdmin ? handleHardDelete : null}
                  isAdmin={isAdmin}
                />
                {tags.length === 0 && (
                  <p className="text-xs text-gray-400 italic">No tags yet — add the first one below.</p>
                )}
              </>
            )}
          </div>

          {/* Add tag form */}
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50 shrink-0">
            {addError && (
              <p className="text-[11px] text-red-500 mb-1.5">{addError}</p>
            )}
            <form onSubmit={handleAddTag} className="flex gap-1.5">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add a tag…"
                maxLength={100}
                className="flex-1 min-w-0 border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button
                type="submit"
                disabled={addBusy || !newTag.trim()}
                className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shrink-0"
              >
                {addBusy ? "…" : "Add"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
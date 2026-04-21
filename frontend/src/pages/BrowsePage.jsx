import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { getFiles } from "../api/files";

import './FilterButton.css';

const FILTER_OPTIONS = ["Maths", "Computer Science", "SPUB", "O-Level"];

const CATEGORY_BUTTONS = [
  { label: "Papers", value: "PAPER", sub: ["O-Level", "SPUB", "Diploma"] },
  { label: "Pictures", value: "PHOTO", sub: ["Placeholder 1", "Placeholder 2"] },
];

export default function BrowsePage() {
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [subFilter, setSubFilter] = useState("");
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState([]);
  const filterRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggleFilter(option) {
    setActiveFilters((prev) =>
      prev.includes(option) ? prev.filter((f) => f !== option) : [...prev, option]
    );
  }

  const fetchFiles = useCallback(async (searchTerm = "") => {
    setLoading(true);
    setError(null);
    const params = {};
    if (categoryFilter) params.type = categoryFilter;
    if (subFilter) params.subject = subFilter;
    if (searchTerm) params.search = searchTerm;
    if (activeFilters.length > 0) params.subjects = activeFilters.join(",");

    const { ok, data, status } = await getFiles(params);
    setLoading(false);

    if (status === 401) { navigate("/login"); return; }
    if (!ok) { setError(data.error || "Failed to load files."); return; }

    setFiles(data.files ?? data ?? []);
  }, [categoryFilter, subFilter, activeFilters, navigate]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  function handleSearch(e) {
    e.preventDefault();
    fetchFiles(search);
  }

  function selectCategory(value) {
    setCategoryFilter((prev) => (prev === value ? "" : value));
    setSubFilter("");
  }

  function selectSub(catValue, sub) {
    setCategoryFilter(catValue);
    setSubFilter((prev) => (prev === sub && categoryFilter === catValue ? "" : sub));
    setHoveredCategory(null);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Search + filter row */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {/* Subject filter button */}
          <div className="relative" ref={filterRef}>
            <button
              type="button"
              onClick={() => setFilterOpen((o) => !o)}
              className={`px-4 py-2 rounded-lg text-sm border ${activeFilters.length > 0 ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700" : "bg-gray-200 hover:bg-gray-300 text-gray-700 border-transparent"}`}
            >
              Filter{activeFilters.length > 0 ? ` (${activeFilters.length})` : ""}
            </button>
            {filterOpen && (
              <div className="filter-panel">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Subject</p>
                <div className="flex flex-col gap-2">
                  {FILTER_OPTIONS.map((option) => (
                    <label key={option} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={activeFilters.includes(option)}
                        onChange={() => toggleFilter(option)}
                        className="accent-blue-600"
                      />
                      {option}
                    </label>
                  ))}
                </div>
                {activeFilters.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveFilters([])}
                    className="mt-3 text-xs text-red-500 hover:underline"
                  >
                    Clear all
                  </button>
                )}
              </div>
            )}
          </div>
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
          >
            Search
          </button>
        </form>

        {/* Category panel */}
        <div className="flex items-center gap-3 mb-6">
          {CATEGORY_BUTTONS.map((cat) => (
            <div
              key={cat.value}
              className="relative"
              onMouseEnter={() => setHoveredCategory(cat.value)}
              onMouseLeave={() => setHoveredCategory(null)}
            >
              <button
                type="button"
                onClick={() => selectCategory(cat.value)}
                className={`flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  categoryFilter === cat.value
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {cat.label}
                {categoryFilter === cat.value && subFilter
                  ? <span className="opacity-75">› {subFilter}</span>
                  : <span className="text-xs opacity-50">▾</span>
                }
              </button>
              {hoveredCategory === cat.value && (
                <div className="category-dropdown">
                  {cat.sub.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => selectSub(cat.value, s)}
                      className={`block w-full text-left px-4 py-2 text-sm transition-colors hover:bg-blue-50 hover:text-blue-700 ${
                        subFilter === s && categoryFilter === cat.value
                          ? "text-blue-600 font-semibold bg-blue-50"
                          : "text-gray-700"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {(categoryFilter || subFilter) && (
            <button
              type="button"
              onClick={() => { setCategoryFilter(""); setSubFilter(""); }}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Results */}
        {loading && <p className="text-gray-500 text-sm">Loading and shi-...</p>}
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

// // <div data-hover="false" data-delay="0" data-w-id="0927d473-7814-90e5-e874-dbf1c00de0e8" class="uui-navbar08_menu-dropdown product_navbar w-dropdown" style=""><div class="uui-navbar08_dropdown-toggle w-dropdown-toggle" id="w-dropdown-toggle-0" aria-controls="w-dropdown-list-0" aria-haspopup="menu" aria-expanded="false" role="button" tabindex="0"><div class="uui-dropdown-icon w-embed" style="transform: translate3d(0px, 0px, 0px) scale3d(1, 1, 1) rotateX(0deg) rotateY(0deg) rotateZ(0deg) skew(0deg); transform-style: preserve-3d;"><svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
// <path d="M5 7.5L10 12.5L15 7.5" stroke="CurrentColor" stroke-width="1.67" stroke-linecap="round" stroke-linejoin="round"></path>
// </svg></div><div class="safecube-texte-body-medium">Product</div></div><nav class="dropdown_list_product w-dropdown-list" style="opacity: 0; transform: translate3d(0px, -2rem, 0px) scale3d(1, 1, 1) rotateX(0deg) rotateY(0deg) rotateZ(0deg) skew(0deg); transform-style: preserve-3d;" id="w-dropdown-list-0" aria-labelledby="w-dropdown-toggle-0"><div class="dropdown-product"><div class="container-intelligence"><h4 class="uui-navbar08_heading">Container Intelligence</h4><a href="/product/container-tracking-information" class="uui-navbar08_dropdown-link w-inline-block" tabindex="0"><div class="uui-navbar08_icon-wrapper"><svg width="100%" height="100%" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" class="uui-icon-1x1-xsmall-4"><path d="M8.186 1.113a.5.5 0 0 0-.372 0L1.846 3.5l2.404.961L10.404 2l-2.218-.887zm3.564 1.426L5.596 5 8 5.961 14.154 3.5l-2.404-.961zm3.25 1.7-6.5 2.6v7.922l6.5-2.6V4.24zM7.5 14.762V6.838L1 4.239v7.923l6.5 2.6zM7.443.184a1.5 1.5 0 0 1 1.114 0l7.129 2.852A.5.5 0 0 1 16 3.5v8.662a1 1 0 0 1-.629.928l-7.185 2.874a.5.5 0 0 1-.372 0L.63 13.09a1 1 0 0 1-.63-.928V3.5a.5.5 0 0 1 .314-.464L7.443.184z" fill="currentColor"></path></svg></div><div class="uui-navbar08_item-right"><div class="uui-navbar08_item-heading">Container Tracking</div><div class="uui-text-size-small-2 hide-mobile-landscape-2">Live container location</div></div></a><a href="/product/analytics" class="uui-navbar08_dropdown-link w-inline-block" tabindex="0"><div class="uui-navbar08_icon-wrapper"><svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="uui-icon-1x1-xsmall-4"><path d="M17.6241 7.5V9H20.6884L11.8116 17.8769L8.43659 14.5019L3.59375 19.3447L4.65444 20.4053L8.43659 16.6231L11.8116 19.9981L21.7491 10.0607V13.125H23.2491V7.5H17.6241Z" fill="currentColor"></path><path d="M2.25 4.875H0.75V23.25H23.25V21.75H2.25V4.875Z" fill="currentColor"></path></svg></div><div class="uui-navbar08_item-right"><div class="uui-navbar08_item-heading">Predictive analytics</div><div class="uui-text-size-small-2 hide-mobile-landscape-2">ETA forecasts &amp; trends</div></div></a><a id="w-node-_0927d473-7814-90e5-e874-dbf1c00de102-c00de0de" href="/product/carrier-coverage" class="uui-navbar08_dropdown-link w-inline-block" tabindex="0"><div class="uui-navbar08_icon-wrapper"><svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="uui-icon-1x1-xsmall-4"><path d="M22.428 4.17209L15.45 2.22021L8.45156 4.19159L1.94339 2.34537C1.80393 2.3058 1.6572 2.29912 1.51472 2.32583C1.37224 2.35255 1.23789 2.41194 1.12224 2.49935C1.00659 2.58675 0.91279 2.69978 0.8482 2.82956C0.783611 2.95934 0.749997 3.10233 0.75 3.24729V19.2129C0.750709 19.4576 0.830844 19.6954 0.97835 19.8906C1.12586 20.0857 1.33276 20.2277 1.56792 20.2952L8.44997 22.2476L15.4515 20.2753L22.06 22.1239C22.1994 22.1629 22.3458 22.1691 22.488 22.142C22.6301 22.1149 22.764 22.0553 22.8793 21.9678C22.9945 21.8804 23.0879 21.7674 23.1523 21.6378C23.2166 21.5082 23.25 21.3655 23.25 21.2208V5.25551C23.2494 5.01012 23.1688 4.77162 23.0205 4.57612C22.8722 4.38062 22.6642 4.23879 22.428 4.17209ZM7.64062 20.4585L2.25 18.9293V3.99153L7.64062 5.52078V20.4585ZM14.7007 18.9282L9.14062 20.4944V5.55584L14.7007 3.98965V18.9282ZM21.75 20.4793L16.2007 18.9273V3.98773L21.75 5.53981V20.4793Z" fill="currentColor"></path></svg></div><div class="uui-navbar08_item-right"><div class="uui-navbar08_item-heading">Carrier Coverage</div><div class="uui-text-size-small-2 hide-mobile-landscape-2">Global lineups mapped</div></div></a><a href="/product/alert" class="uui-navbar08_dropdown-link w-inline-block" tabindex="0"><div class="uui-navbar08_icon-wrapper"><svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="uui-icon-1x1-xsmall-4"><path d="M10 21H14C14 21.5304 13.7893 22.0391 13.4142 22.4142C13.0391 22.7893 12.5304 23 12 23C11.4696 23 10.9609 22.7893 10.5858 22.4142C10.2107 22.0391 10 21.5304 10 21ZM21 19V20H3V19L5 17V11C5 7.9 7.03 5.17 10 4.29C10 4.19 10 4.1 10 4C10 3.46957 10.2107 2.96086 10.5858 2.58579C10.9609 2.21071 11.4696 2 12 2C12.5304 2 13.0391 2.21071 13.4142 2.58579C13.7893 2.96086 14 3.46957 14 4C14 4.1 14 4.19 14 4.29C16.97 5.17 19 7.9 19 11V17L21 19ZM17 11C17 9.67392 16.4732 8.40215 15.5355 7.46447C14.5979 6.52678 13.3261 6 12 6C10.6739 6 9.40215 6.52678 8.46447 7.46447C7.52678 8.40215 7 9.67392 7 11V18H17V11ZM19.75 3.19L18.33 4.61C20.04 6.3 21 8.6 21 11H23C23 8.07 21.84 5.25 19.75 3.19ZM1 11H3C3 8.6 3.96 6.3 5.67 4.61L4.25 3.19C2.16 5.25 1 8.07 1 11Z" fill="currentColor"></path></svg></div><div class="uui-navbar08_item-right"><div class="uui-navbar08_item-heading">Alert intelligence</div><div class="uui-text-size-small-2 hide-mobile-landscape-2">Proactive alerts</div></div></a><a href="/product/collaborative-features" class="uui-navbar08_dropdown-link w-inline-block" tabindex="0"><div class="uui-navbar08_icon-wrapper iconcollaborative"><svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="uui-icon-1x1-xsmall-4"><path d="M21.0096 18.3988C22.4402 17.1238 23.2502 15.4243 23.2502 13.6607C23.2502 11.7865 22.3728 10.0336 20.7796 8.7248C19.229 7.45139 17.1765 6.75 15 6.75C12.8235 6.75 10.771 7.45139 9.22064 8.72489C7.62741 10.0336 6.75 11.7865 6.75 13.6607C6.75 15.535 7.62741 17.2878 9.22064 18.5967C10.771 19.8702 12.8235 20.5715 15 20.5715C15.29 20.5715 15.5818 20.5587 15.8712 20.5333L16.3655 20.9618C18.0686 22.4375 20.2465 23.2499 22.5 23.25H23.25V21.6536L23.0303 21.434C22.1638 20.5649 21.4771 19.5335 21.0096 18.3988ZM17.3479 19.8281L16.356 18.9684L16.0253 19.0089C15.6851 19.0505 15.3427 19.0714 15 19.0714C11.2781 19.0714 8.25 16.6442 8.25 13.6607C8.25 10.6773 11.2781 8.25 15 8.25C18.7219 8.25 21.75 10.6772 21.75 13.6607C21.75 15.1471 21.0084 16.5348 19.6619 17.5681L19.23 17.8996L19.4293 18.4637C19.8377 19.6159 20.4381 20.6907 21.205 21.6427C19.7768 21.4043 18.4421 20.7764 17.3479 19.8281Z" fill="currentColor"></path><path d="M2.82117 14.8817C3.52323 13.993 4.07445 12.995 4.4528 11.9275L4.65061 11.3662L4.21903 11.0349C2.94928 10.0606 2.25 8.75287 2.25 7.35267C2.25 4.53905 5.1098 2.25 8.625 2.25C11.211 2.25 13.4422 3.48891 14.4411 5.26406C14.6266 5.25506 14.8129 5.25 15 5.25C15.3758 5.25 15.7483 5.26823 16.1172 5.3047C15.7312 4.30463 15.0608 3.39169 14.1391 2.63466C12.6596 1.41933 10.7016 0.75 8.625 0.75C6.54844 0.75 4.59037 1.41933 3.11081 2.63466C1.58841 3.88523 0.75 5.56078 0.75 7.35267C0.75 9.0308 1.5165 10.6477 2.87109 11.8641C2.42903 12.9279 1.7831 13.8949 0.969703 14.7107L0.75 14.9304V16.5H1.5C2.88689 16.4998 4.25471 16.1769 5.4952 15.5566C5.35918 15.0411 5.27948 14.5123 5.2575 13.9795C4.50458 14.4208 3.6799 14.7262 2.82117 14.8817Z" fill="currentColor"></path></svg></div><div class="uui-navbar08_item-right"><div class="uui-navbar08_item-heading">Collaborative Features</div><div class="uui-text-size-small-2 hide-mobile-landscape-2">Shared insights &amp; notes</div></div></a><a href="/product/ai-anomaly-detection" class="uui-navbar08_dropdown-link w-inline-block" tabindex="0"><div class="uui-navbar08_icon-wrapper iconcollaborative"><div class="uui-icon-1x1-xsmall-4 w-embed"><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="iconify iconify--ph" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" viewBox="0 0 256 256"><path fill="currentColor" d="M248 152a8 8 0 0 1-8 8h-16v16a8 8 0 0 1-16 0v-16h-16a8 8 0 0 1 0-16h16v-16a8 8 0 0 1 16 0v16h16a8 8 0 0 1 8 8ZM64 68h12v12a8 8 0 0 0 16 0V68h12a8 8 0 0 0 0-16H92V40a8 8 0 0 0-16 0v12H64a8 8 0 0 0 0 16Zm120 124h-8v-8a8 8 0 0 0-16 0v8h-8a8 8 0 0 0 0 16h8v8a8 8 0 0 0 16 0v-8h8a8 8 0 0 0 0-16Zm-2.3-74.3L75.3 224a15.9 15.9 0 0 1-22.6 0L32 203.3a15.9 15.9 0 0 1 0-22.6L180.7 32a16.1 16.1 0 0 1 22.6 0L224 52.7a15.9 15.9 0 0 1 0 22.6l-42.3 42.4ZM155.3 80l20.7 20.7L212.7 64L192 43.3Zm9.4 32L144 91.3L43.3 192L64 212.7Z"></path></svg></div></div><div class="uui-navbar08_item-right"><div class="uui-navbar08_item-heading">Safecube AI</div><div class="uui-text-size-small-2 hide-mobile-landscape-2">Predicts delays</div></div></a></div></div></nav></div>

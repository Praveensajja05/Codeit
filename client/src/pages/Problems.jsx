import { useEffect, useState } from "react";
import { api } from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import { ProblemRow } from "../components/bits.jsx";

const EMPTY = { search: "", platform: "", tag: "", level: "", minRating: "", maxRating: "", unsolved: false };

export default function Problems() {
  const { user } = useAuth();
  const [filters, setFilters] = useState(EMPTY);
  const [search, setSearch] = useState("");   // what's typed; copied into filters after a short pause
  const [page, setPage] = useState(1);
  const [tags, setTags] = useState([]);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/problems/tags").then((d) => setTags(d.tags)).catch(() => {});
  }, []);

  // Wait 300 ms after the last keystroke, so we don't query the server on every letter.
  useEffect(() => {
    const t = setTimeout(() => setFilters((f) => (f.search === search ? f : { ...f, search })), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => setPage(1), [filters]);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ page: String(page) });
    for (const [key, value] of Object.entries(filters)) {
      if (value === "" || value === false) continue;
      params.set(key, String(value));
    }
    setError("");
    api(`/problems?${params}`)
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e.message));
    return () => { cancelled = true; };
  }, [filters, page, user]);

  const set = (key) => (e) =>
    setFilters({ ...filters, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  async function toggleFavorite(problem) {
    try {
      await api(`/favorites/problems/${problem.id}`, { method: problem.is_favorite ? "DELETE" : "POST" });
      setData((d) => ({
        ...d,
        problems: d.problems.map((p) => (p.id === problem.id ? { ...p, is_favorite: !p.is_favorite } : p)),
      }));
    } catch (e) {
      setError(e.message);
    }
  }

  const lastPage = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const isLeetcode = filters.platform === "leetcode";

  return (
    <section>
      <h1>Problems</h1>
      <div className="filters">
        <input type="search" placeholder="Search by name or ID (e.g. 1850A)" value={search}
          onChange={(e) => setSearch(e.target.value)} aria-label="Search problems" />
        <select value={filters.platform} onChange={(e) => setFilters({ ...filters, platform: e.target.value, level: "", minRating: "", maxRating: "" })} aria-label="Platform">
          <option value="">All platforms</option>
          <option value="codeforces">Codeforces</option>
          <option value="atcoder">AtCoder</option>
          <option value="leetcode">LeetCode</option>
        </select>
        <select value={filters.tag} onChange={set("tag")} aria-label="Tag">
          <option value="">Any tag</option>
          {tags.map((t) => <option key={t.tag} value={t.tag}>{t.tag} ({t.count})</option>)}
        </select>
        {isLeetcode ? (
          <select value={filters.level} onChange={set("level")} aria-label="Difficulty">
            <option value="">Any difficulty</option>
            <option>Easy</option><option>Medium</option><option>Hard</option>
          </select>
        ) : (
          <span className="range">
            <input type="number" placeholder="Min rating" value={filters.minRating} onChange={set("minRating")} step="100" aria-label="Minimum rating" />
            <input type="number" placeholder="Max rating" value={filters.maxRating} onChange={set("maxRating")} step="100" aria-label="Maximum rating" />
          </span>
        )}
        {user && (
          <label className="check"><input type="checkbox" checked={filters.unsolved} onChange={set("unsolved")} /> Only unsolved</label>
        )}
      </div>

      {error && <p className="error">{error}</p>}
      {data && (
        <>
          <p className="muted">{data.total.toLocaleString()} problems</p>
          {data.total === 0 ? (
            <p className="muted">No problems match these filters. If the list is empty everywhere, run "npm run sync-problems" on the server.</p>
          ) : (
            <ul className="list">
              {data.problems.map((p) => (
                <ProblemRow key={p.id} problem={p} onToggleFavorite={toggleFavorite} showStar={Boolean(user)} />
              ))}
            </ul>
          )}
          <div className="pager">
            <button onClick={() => setPage(page - 1)} disabled={page <= 1}>Previous</button>
            <span>Page {page} of {lastPage}</span>
            <button onClick={() => setPage(page + 1)} disabled={page >= lastPage}>Next</button>
          </div>
        </>
      )}
    </section>
  );
}

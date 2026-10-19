import { useEffect, useState } from "react";
import { api } from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import { StarButton } from "../components/bits.jsx";

const PLATFORMS = ["All", "Codeforces", "AtCoder", "LeetCode", "CodeChef", "GeeksforGeeks"];

export function startsIn(iso) {
  const ms = new Date(iso) - Date.now();
  if (ms <= 0) return "running now";
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `in ${days}d ${hours % 24}h`;
  if (hours > 0) return `in ${hours}h ${minutes % 60}m`;
  return `in ${minutes}m`;
}

export function duration(startIso, endIso) {
  const minutes = Math.round((new Date(endIso) - new Date(startIso)) / 60000);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h${m ? ` ${m}m` : ""}` : `${m}m`;
}

const when = (iso) =>
  new Date(iso).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function ContestRow({ contest, onToggleFavorite, showStar }) {
  return (
    <li className="contest">
      <span className={`platform p-${contest.platform.toLowerCase()}`}>{contest.platform}</span>
      <a href={contest.url} target="_blank" rel="noreferrer" className="cname">{contest.title}</a>
      <span className="when">{when(contest.start)}<small>{startsIn(contest.start)} · {duration(contest.start, contest.end)}</small></span>
      {contest.calendarUrl && (
        <a className="calendar" href={contest.calendarUrl} target="_blank" rel="noreferrer">Add to Google Calendar</a>
      )}
      {showStar && <StarButton active={contest.isFavorite} onClick={() => onToggleFavorite(contest)} label={contest.title} />}
    </li>
  );
}

export default function Contests() {
  const { user } = useAuth();
  const [platform, setPlatform] = useState("All");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;   // ignore a slow old response if the filter changed meanwhile
    setData(null);
    setError("");
    const query = platform === "All" ? "" : `?platform=${encodeURIComponent(platform)}`;
    api(`/contests${query}`)
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e.message));
    return () => { cancelled = true; };
  }, [platform, user]);

  async function toggleFavorite(contest) {
    try {
      if (contest.isFavorite) {
        await api(`/favorites/contests/${encodeURIComponent(contest.key)}`, { method: "DELETE" });
      } else {
        await api("/favorites/contests", { method: "POST", body: contest });
      }
      setData((d) => ({
        ...d,
        contests: d.contests.map((c) => (c.key === contest.key ? { ...c, isFavorite: !c.isFavorite } : c)),
      }));
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <section>
      <h1>Upcoming contests</h1>
      <div className="chips" role="group" aria-label="Filter by platform">
        {PLATFORMS.map((p) => (
          <button key={p} className={`chip ${p === platform ? "on" : ""}`} onClick={() => setPlatform(p)} aria-pressed={p === platform}>
            {p}
          </button>
        ))}
      </div>
      {data?.source === "codeforces-only" && (
        <p className="notice">Showing Codeforces contests only. Add a Clist API key on the server to include the other platforms.</p>
      )}
      {error && <p className="error">{error}</p>}
      {!data && !error && <p className="muted">Loading contests…</p>}
      {data && data.contests.length === 0 && <p className="muted">No upcoming contests for this platform.</p>}
      {data && (
        <ul className="list">
          {data.contests.map((c) => (
            <ContestRow key={c.key} contest={c} onToggleFavorite={toggleFavorite} showStar={Boolean(user)} />
          ))}
        </ul>
      )}
    </section>
  );
}

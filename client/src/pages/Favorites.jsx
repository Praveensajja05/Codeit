import { useEffect, useState } from "react";
import { api } from "../api.js";
import { ProblemRow } from "../components/bits.jsx";
import { ContestRow } from "./Contests.jsx";

export default function Favorites() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/favorites").then(setData).catch((e) => setError(e.message));
  }, []);

  async function removeProblem(problem) {
    try {
      await api(`/favorites/problems/${problem.id}`, { method: "DELETE" });
      setData((d) => ({ ...d, problems: d.problems.filter((p) => p.id !== problem.id) }));
    } catch (e) { setError(e.message); }
  }

  async function removeContest(contest) {
    try {
      await api(`/favorites/contests/${encodeURIComponent(contest.key)}`, { method: "DELETE" });
      setData((d) => ({ ...d, contests: d.contests.filter((c) => c.key !== contest.key) }));
    } catch (e) { setError(e.message); }
  }

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p className="muted">Loading favorites…</p>;

  return (
    <section>
      <h1>Favorites</h1>
      <h2>Contests</h2>
      {data.contests.length === 0 ? (
        <p className="muted">Star a contest on the Contests page to keep it here.</p>
      ) : (
        <ul className="list">
          {data.contests.map((c) => <ContestRow key={c.key} contest={c} onToggleFavorite={removeContest} showStar />)}
        </ul>
      )}
      <h2>Problems</h2>
      {data.problems.length === 0 ? (
        <p className="muted">Star a problem on the Problems page to keep it here.</p>
      ) : (
        <ul className="list">
          {data.problems.map((p) => <ProblemRow key={p.id} problem={p} onToggleFavorite={removeProblem} showStar />)}
        </ul>
      )}
    </section>
  );
}

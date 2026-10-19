import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { ratingClass } from "../components/bits.jsx";

export default function Daily() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api("/daily").then(setData).catch((e) => setError(e.message));
  }, []);

  async function check() {
    setChecking(true);
    setMessage("");
    try {
      const d = await api("/daily/check", { method: "POST" });
      setData(d);
      setMessage(d.solved
        ? "Accepted on Codeforces. Streak updated."
        : "No accepted submission for this problem today yet. Codeforces can take a minute to show new verdicts.");
    } catch (e) {
      setMessage(e.message);
    } finally {
      setChecking(false);
    }
  }

  if (error) return <section><h1>Daily problem</h1><p className="error">{error}</p></section>;
  if (!data) return <p className="muted">Picking today's problem…</p>;
  const p = data.problem;

  return (
    <section className="narrow">
      <p className="streak"><strong>{data.streak}</strong> day{data.streak === 1 ? "" : "s"} streak</p>
      <h1>Today's problem</h1>
      <article className="daily-card">
        <a href={p.url} target="_blank" rel="noreferrer" className="daily-name">
          <span className="pid">{p.externalId}</span> {p.name}
        </a>
        <p>
          Rating <span className={`rating ${ratingClass(p.rating)}`}>{p.rating}</span>
          {p.tags.length > 0 && <span className="tags"> · {p.tags.join(", ")}</span>}
        </p>
        {data.solved ? (
          <p className="success">Solved today. Come back tomorrow for a new one.</p>
        ) : data.hasCodeforcesHandle ? (
          <button className="primary" onClick={check} disabled={checking}>
            {checking ? "Checking Codeforces…" : "I solved it, check Codeforces"}
          </button>
        ) : (
          <p className="notice">Add your Codeforces handle in <Link to="/profile">Profile</Link> so your solve can be verified.</p>
        )}
        {message && <p className="muted">{message}</p>}
      </article>
      <p className="muted small">
        A new problem appears every day. Solve it on Codeforces the same day to keep your streak; miss a day and it resets.
      </p>
    </section>
  );
}

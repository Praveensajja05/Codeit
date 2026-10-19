import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { ratingClass } from "../components/bits.jsx";

const NOT_YET = "No accepted submission for today's problem yet. New verdicts can take a minute to show up.";

export default function Daily() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");          // the platform an action is running for
  const [messages, setMessages] = useState({});  // result of the last action, per platform

  useEffect(() => {
    api("/daily").then(setData).catch((e) => setError(e.message));
  }, []);

  // Every action returns the whole page state, so all three streaks update together.
  async function act(platform, path, method, describe) {
    setBusy(platform);
    setMessages((m) => ({ ...m, [platform]: "" }));
    try {
      const d = await api(path, { method });
      setData(d);
      if (describe) setMessages((m) => ({ ...m, [platform]: describe(d) }));
    } catch (e) {
      setMessages((m) => ({ ...m, [platform]: e.message }));
    } finally {
      setBusy("");
    }
  }

  const check = (platform, name) => act(platform, `/daily/check/${platform}`, "POST",
    (d) => (d[platform].solved ? `Accepted on ${name} today. Streak updated.` : NOT_YET));

  if (error) return <section><h1>Daily problems</h1><p className="error">{error}</p></section>;
  if (!data) return <p className="muted">Loading today's problems…</p>;
  const { streaks, codeforces: cf, leetcode: lc, gfg } = data;

  return (
    <section className="daily">
      <h1>Daily problems</h1>

      <div className="streaks">
        <p className="streak-main">
          <strong>{streaks.main}</strong> {streaks.main === 1 ? "day" : "days"} in a row
          <span className="small"> on Codeforces or LeetCode</span>
        </p>
        <p className="streak-other">LeetCode <strong>{streaks.leetcode}</strong></p>
        <p className="streak-other">GFG <strong>{streaks.gfg}</strong> <span className="small">self-reported</span></p>
      </div>

      <ul className="list">
        <DailyRow
          platform="Codeforces"
          error={cf.error}
          message={messages.codeforces}
          title={cf.problem && <><span className="pid">{cf.problem.externalId}</span> {cf.problem.name}</>}
          url={cf.problem?.url}
          details={cf.problem && <>
            <span className={`rating ${ratingClass(cf.problem.rating)}`}>{cf.problem.rating}</span>
            {cf.problem.tags.length > 0 && <span className="tags">{cf.problem.tags.join(", ")}</span>}
          </>}
          action={<VerifiedAction part={cf} name="Codeforces" handleLabel="Codeforces handle"
            busy={busy === "codeforces"} onCheck={() => check("codeforces", "Codeforces")} />}
        />
        <DailyRow
          platform="LeetCode"
          error={lc.error}
          message={messages.leetcode}
          title={lc.problem?.name}
          url={lc.problem?.url}
          details={lc.problem && <>
            <span className={`level level-${lc.problem.level.toLowerCase()}`}>{lc.problem.level}</span>
            {lc.problem.tags.length > 0 && <span className="tags">{lc.problem.tags.join(", ")}</span>}
          </>}
          action={<VerifiedAction part={lc} name="LeetCode" handleLabel="LeetCode username"
            busy={busy === "leetcode"} onCheck={() => check("leetcode", "LeetCode")} />}
        />
        <DailyRow
          platform="GFG"
          message={messages.gfg}
          title="Problem of the Day"
          url={gfg.url}
          details={<span className="muted small">Mark it yourself: GFG doesn't share solves with other apps.</span>}
          action={gfg.solved ? (
            <span className="success">
              Marked solved{" "}
              <button className="link-button" disabled={busy === "gfg"} onClick={() => act("gfg", "/daily/gfg", "DELETE")}>Undo</button>
            </span>
          ) : (
            <button disabled={busy === "gfg"} onClick={() => act("gfg", "/daily/gfg", "POST")}>Mark as solved</button>
          )}
        />
      </ul>

      <p className="muted small">
        The Codeforces and LeetCode problems change at 5:30 am India time (midnight UTC), when LeetCode
        posts its new one. GFG's changes at midnight India time. Miss a day and that streak starts again.
      </p>
    </section>
  );
}

function DailyRow({ platform, error, message, title, url, details, action }) {
  return (
    <li className="daily-row">
      <span className="platform">{platform}</span>
      <div className="daily-problem">
        {error ? <p className="error">{error}</p> : <>
          <a href={url} target="_blank" rel="noreferrer" className="daily-name">{title}</a>
          <p className="daily-details">{details}</p>
        </>}
        {message && <p className="muted small">{message}</p>}
      </div>
      <div className="daily-action">{!error && action}</div>
    </li>
  );
}

// Codeforces and LeetCode: the app asks the platform whether today's problem was accepted.
function VerifiedAction({ part, name, handleLabel, busy, onCheck }) {
  if (part.solved) return <span className="success">Solved today</span>;
  if (!part.hasHandle) return <span className="small">Add your {handleLabel} in <Link to="/profile">Profile</Link></span>;
  return <button className="primary" onClick={onCheck} disabled={busy}>{busy ? "Checking…" : `Check ${name}`}</button>;
}

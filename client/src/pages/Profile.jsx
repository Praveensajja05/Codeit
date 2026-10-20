import { useEffect, useState } from "react";
import { api } from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import { PLATFORM_NAMES } from "../components/bits.jsx";

export default function Profile() {
  const { setUser } = useAuth();
  const [form, setForm] = useState(null);
  const [counts, setCounts] = useState({});
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [reminders, setReminders] = useState(null);

  async function load() {
    const d = await api("/me");
    setCounts(d.solvedCounts);
    setForm({
      name: d.user.name,
      codeforcesHandle: d.user.codeforces_handle ?? "",
      atcoderHandle: d.user.atcoder_handle ?? "",
      leetcodeHandle: d.user.leetcode_handle ?? "",
      dailyMinRating: d.user.daily_min_rating,
      dailyMaxRating: d.user.daily_max_rating,
    });
  }

  const loadReminders = () => api("/reminders").then(setReminders);

  useEffect(() => {
    load().catch((e) => setStatus(e.message));
    loadReminders().catch((e) => setStatus(e.message));
  }, []);

  async function removeReminder(key) {
    try {
      await api(`/reminders/${encodeURIComponent(key)}`, { method: "DELETE" });
      await loadReminders();
    } catch (err) {
      setStatus(err.message);
    }
  }

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setStatus("");
    try {
      const d = await api("/me", {
        method: "PUT",
        body: { ...form, dailyMinRating: Number(form.dailyMinRating), dailyMaxRating: Number(form.dailyMaxRating) },
      });
      setUser(d.user);
      setStatus("Saved.");
    } catch (err) {
      setStatus(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function sync() {
    setBusy(true);
    setStatus("Fetching your accepted submissions…");
    try {
      const result = await api("/me/sync", { method: "POST" });
      const parts = Object.entries(result).map(([platform, r]) =>
        r.error ? `${PLATFORM_NAMES[platform]}: ${r.error}` : `${PLATFORM_NAMES[platform]}: ${r.added} newly marked solved`);
      setStatus(parts.join(". "));
      await load();
    } catch (err) {
      setStatus(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!form) return <p className="muted">{status || "Loading…"}</p>;

  return (
    <section className="narrow">
      <h1>Profile</h1>
      <form onSubmit={save} className="form">
        <label>Name<input value={form.name} onChange={set("name")} required /></label>
        <label>Codeforces handle<input value={form.codeforcesHandle} onChange={set("codeforcesHandle")} placeholder="e.g. tourist" /></label>
        <label>AtCoder handle<input value={form.atcoderHandle} onChange={set("atcoderHandle")} /></label>
        <label>LeetCode username<input value={form.leetcodeHandle} onChange={set("leetcodeHandle")} /></label>
        <fieldset>
          <legend>Daily problem rating range</legend>
          <span className="range">
            <input type="number" min="800" max="3500" step="100" value={form.dailyMinRating} onChange={set("dailyMinRating")} aria-label="Minimum" />
            <span>to</span>
            <input type="number" min="800" max="3500" step="100" value={form.dailyMaxRating} onChange={set("dailyMaxRating")} aria-label="Maximum" />
          </span>
        </fieldset>
        <button className="primary" disabled={busy}>Save</button>
      </form>

      <h2>Solved problems</h2>
      <p className="muted">
        {Object.keys(counts).length === 0
          ? "Nothing synced yet."
          : Object.entries(counts).map(([p, n]) => `${PLATFORM_NAMES[p]}: ${n}`).join(" · ")}
      </p>
      <button onClick={sync} disabled={busy}>Sync solved problems</button>
      <p className="muted small">
        LeetCode solves can't be synced: LeetCode only shares a user's most recent submissions publicly.
        Your LeetCode username is used to check the LeetCode daily problem.
      </p>
      {status && <p className="status">{status}</p>}

      <h2>Contest reminders</h2>
      {reminders && (
        <>
          <p className="muted small">
            You get an email about {reminders.leadMinutes} minutes before each of these contests.
            Add more with the 🔔 on the Contests page.
            {!reminders.emailConfigured && " Email isn't set up on this server yet, so reminders are printed in the server terminal."}
          </p>
          {reminders.reminders.length === 0 ? (
            <p className="muted">No reminders turned on.</p>
          ) : (
            <ul className="list reminders">
              {reminders.reminders.map((r) => (
                <li key={r.key} className="reminder">
                  <span className={`platform p-${r.platform.toLowerCase()}`}>{r.platform}</span>
                  <a href={r.url} target="_blank" rel="noreferrer">{r.title}</a>
                  <span className="muted small">
                    {new Date(r.start).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    {r.sentAt && " · sent"}
                  </span>
                  <button onClick={() => removeReminder(r.key)}>Remove</button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

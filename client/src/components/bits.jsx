// Small pieces shared by several pages.

// Codeforces' own rating colours, so ratings read the way CP people already know them.
export function ratingClass(rating) {
  if (rating == null) return "r-none";
  if (rating < 1200) return "r-gray";
  if (rating < 1400) return "r-green";
  if (rating < 1600) return "r-cyan";
  if (rating < 1900) return "r-blue";
  if (rating < 2100) return "r-violet";
  if (rating < 2400) return "r-orange";
  return "r-red";
}

export function Difficulty({ problem }) {
  if (problem.difficulty_label) {
    return <span className={`level level-${problem.difficulty_label.toLowerCase()}`}>{problem.difficulty_label}</span>;
  }
  return <span className={`rating ${ratingClass(problem.difficulty)}`}>{problem.difficulty ?? "—"}</span>;
}

export const PLATFORM_NAMES = { codeforces: "Codeforces", atcoder: "AtCoder", leetcode: "LeetCode" };

export function StarButton({ active, onClick, label }) {
  return (
    <button
      className={`star ${active ? "on" : ""}`}
      onClick={onClick}
      aria-pressed={active}
      aria-label={active ? `Remove ${label} from favorites` : `Add ${label} to favorites`}
      title={active ? "Remove from favorites" : "Add to favorites"}
    >
      {active ? "★" : "☆"}
    </button>
  );
}

export function BellButton({ active, onClick, label }) {
  return (
    <button
      className={`bell ${active ? "on" : ""}`}
      onClick={onClick}
      aria-pressed={active}
      aria-label={active ? `Turn off the email reminder for ${label}` : `Email me before ${label} starts`}
      title={active ? "Reminder on: click to turn off" : "Email me before it starts"}
    >
      🔔
    </button>
  );
}

export function ProblemRow({ problem, onToggleFavorite, showStar }) {
  return (
    <li className={`problem ${problem.is_solved ? "solved" : ""}`}>
      <span className="platform">{PLATFORM_NAMES[problem.platform]}</span>
      <span className="pid">{problem.external_id}</span>
      <a className="pname" href={problem.url} target="_blank" rel="noreferrer">{problem.name}</a>
      <Difficulty problem={problem} />
      <span className="tags">{problem.tags.slice(0, 3).join(", ")}</span>
      <span className="solved-mark" title={problem.is_solved ? "Solved" : ""}>{problem.is_solved ? "✓" : ""}</span>
      {showStar && <StarButton active={problem.is_favorite} onClick={() => onToggleFavorite(problem)} label={problem.name} />}
    </li>
  );
}

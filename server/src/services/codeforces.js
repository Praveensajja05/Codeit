// Codeforces has an official, documented API: https://codeforces.com/apiHelp
import { normalizeTag } from "../utils/tags.js";

async function cf(method, params = {}) {
  const url = `https://codeforces.com/api/${method}?${new URLSearchParams(params)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  const data = await res.json().catch(() => null);
  if (!data || data.status !== "OK") {
    throw new Error(`Codeforces: ${data?.comment ?? `HTTP ${res.status}`}`);
  }
  return data.result;
}

export const cfProblemId = (p) => `${p.contestId}${p.index}`;

export async function fetchCodeforcesProblems() {
  const { problems } = await cf("problemset.problems");
  return problems
    .filter((p) => p.contestId)
    .map((p) => ({
      platform: "codeforces",
      externalId: cfProblemId(p),
      name: p.name,
      url: `https://codeforces.com/problemset/problem/${p.contestId}/${p.index}`,
      difficulty: p.rating ?? null,
      difficultyLabel: null,
      tags: (p.tags ?? []).map(normalizeTag),
    }));
}

// Accepted submissions. `count` limits it to the most recent ones (used by the daily check).
export async function fetchCodeforcesSolved(handle, { count } = {}) {
  const params = { handle };
  if (count) Object.assign(params, { from: 1, count });
  const submissions = await cf("user.status", params);
  return submissions
    .filter((s) => s.verdict === "OK" && s.problem?.contestId)
    .map((s) => ({ externalId: cfProblemId(s.problem), solvedAt: new Date(s.creationTimeSeconds * 1000) }));
}

export async function fetchCodeforcesContests() {
  const contests = await cf("contest.list", { gym: "false" });
  return contests
    .filter((c) => c.phase === "BEFORE")
    .map((c) => ({
      key: `cf-${c.id}`,
      title: c.name,
      platform: "Codeforces",
      url: `https://codeforces.com/contests/${c.id}`,
      start: new Date(c.startTimeSeconds * 1000).toISOString(),
      end: new Date((c.startTimeSeconds + c.durationSeconds) * 1000).toISOString(),
    }));
}


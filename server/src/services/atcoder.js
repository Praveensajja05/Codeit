// AtCoder has no official API. AtCoder Problems (kenkoooo.com) is the community API most tools use.
// Its author asks clients to wait about a second between requests, so we do.
import { getJson, sleep } from "./http.js";

const BASE = "https://kenkoooo.com/atcoder";

// AtCoder Problems' estimated difficulties go negative for easy problems;
// this is the same adjustment their website applies before showing them.
export function adjustDifficulty(d) {
  if (d == null) return null;
  return Math.round(d >= 400 ? d : 400 / Math.exp(1 - d / 400));
}

export async function fetchAtcoderProblems() {
  const problems = await getJson(`${BASE}/resources/problems.json`);
  await sleep(1000);
  const models = await getJson(`${BASE}/resources/problem-models.json`);
  return problems.map((p) => ({
    platform: "atcoder",
    externalId: p.id,
    name: p.title ?? p.name,
    url: `https://atcoder.jp/contests/${p.contest_id}/tasks/${p.id}`,
    difficulty: adjustDifficulty(models[p.id]?.difficulty),
    difficultyLabel: null,
    tags: [],   // AtCoder does not tag problems
  }));
}

export async function fetchAtcoderSolved(user) {
  const solved = [];
  let fromSecond = 0;
  for (let page = 0; page < 100; page += 1) {
    const url = `${BASE}/atcoder-api/v3/user/submissions?user=${encodeURIComponent(user)}&from_second=${fromSecond}`;
    const submissions = await getJson(url);
    for (const s of submissions) {
      if (s.result === "AC") solved.push({ externalId: s.problem_id, solvedAt: new Date(s.epoch_second * 1000) });
    }
    if (submissions.length < 500) break;   // the API returns at most 500 per page
    fromSecond = submissions[submissions.length - 1].epoch_second + 1;
    await sleep(1000);
  }
  return solved;
}

import { Router } from "express";
import { query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { HttpError } from "../utils/errors.js";
import { DAY_ZONE, computeStreaks, todayIn, utcDayStart } from "../utils/time.js";
import { fetchCodeforcesSolved } from "../services/codeforces.js";
import { fetchLeetcodeDaily, fetchLeetcodeRecentAccepted } from "../services/leetcode.js";
import { getUser } from "./me.js";

const router = Router();
router.use(requireAuth);

// Three daily problems:
// - Codeforces: a random unsolved problem in the user's rating range, checked with Codeforces' official API.
// - LeetCode:   LeetCode's own daily question, checked with LeetCode's unofficial GraphQL endpoint.
// - GFG:        GeeksforGeeks' Problem of the Day. GFG has no public API, so we link to it and
//               the user marks the solve themselves; that streak is shown as self-reported.

const GFG_POTD_URL = "https://www.geeksforgeeks.org/problem-of-the-day";

// ---------- Codeforces ----------

async function codeforcesChallenge(userId, day) {
  const { rows } = await query(
    `SELECT p.id, p.external_id, p.name, p.url, p.difficulty, p.tags
     FROM daily_challenges d JOIN problems p ON p.id = d.problem_id
     WHERE d.user_id = $1 AND d.day = $2`,
    [userId, day],
  );
  return rows[0] ?? null;
}

// Today's Codeforces problem. The first time the user opens the page today, one is picked.
async function assignCodeforces(user, day) {
  const existing = await codeforcesChallenge(user.id, day);
  if (existing) return existing;
  // A random Codeforces problem in the user's rating range that they haven't solved
  // and haven't been given before.
  const { rows } = await query(
    `SELECT p.id FROM problems p
     WHERE p.platform = 'codeforces' AND p.difficulty BETWEEN $2 AND $3
       AND NOT EXISTS (SELECT 1 FROM solved s WHERE s.user_id = $1 AND s.problem_id = p.id)
       AND NOT EXISTS (SELECT 1 FROM daily_challenges d WHERE d.user_id = $1 AND d.problem_id = p.id)
     ORDER BY random() LIMIT 1`,
    [user.id, user.daily_min_rating, user.daily_max_rating],
  );
  if (!rows[0]) {
    throw new HttpError(503, "No Codeforces problems found in your rating range. Run 'npm run sync-problems' on the server, or widen the range in Profile.");
  }
  // ON CONFLICT: if two tabs open the page at once, both end up with the same problem.
  await query(
    "INSERT INTO daily_challenges (user_id, day, problem_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
    [user.id, day, rows[0].id],
  );
  return codeforcesChallenge(user.id, day);
}

// ---------- LeetCode ----------

// LeetCode's daily question is the same for everyone, so it's fetched once a day, not per request.
let leetcodeCache = null;

async function leetcodeDailyFor(day) {
  if (leetcodeCache?.date === day) return leetcodeCache;
  const daily = await fetchLeetcodeDaily();
  // If LeetCode's date isn't our date (a request right at midnight UTC), don't use or cache it:
  // the next request asks again.
  if (daily.date !== day) throw new Error("LeetCode hasn't switched to today's problem yet. Try again in a minute.");
  leetcodeCache = daily;
  return daily;
}

// ---------- The whole page ----------

async function solveRows(userId) {
  const { rows } = await query(
    "SELECT platform, to_char(day, 'YYYY-MM-DD') AS day FROM daily_solves WHERE user_id = $1",
    [userId],
  );
  return rows;
}

// Turns a failure into { error } instead of failing the whole page.
const settle = (promise) => promise.then((problem) => ({ problem }), (e) => ({ error: e.message }));

// Everything the Daily page shows, in one response. Each platform is filled in on its own,
// so if LeetCode is down the Codeforces and GFG parts still work, and the other way round.
async function dailyState(user) {
  const mainDay = todayIn(DAY_ZONE.main);
  const gfgDay = todayIn(DAY_ZONE.gfg);
  const [cf, lc, rows] = await Promise.all([
    settle(assignCodeforces(user, mainDay)),
    settle(leetcodeDailyFor(mainDay)),
    solveRows(user.id),
  ]);
  const solvedOn = (platform, day) => rows.some((r) => r.platform === platform && r.day === day);

  return {
    mainDay,
    gfgDay,
    streaks: computeStreaks(rows, { mainDay, gfgDay }),
    codeforces: {
      problem: cf.problem && {
        externalId: cf.problem.external_id, name: cf.problem.name, url: cf.problem.url,
        rating: cf.problem.difficulty, tags: cf.problem.tags,
      },
      error: cf.error ?? null,
      hasHandle: Boolean(user.codeforces_handle),
      solved: solvedOn("codeforces", mainDay),
    },
    leetcode: {
      problem: lc.problem && {
        externalId: lc.problem.externalId, name: lc.problem.name, url: lc.problem.url,
        level: lc.problem.level, tags: lc.problem.tags,
      },
      error: lc.error ?? null,
      hasHandle: Boolean(user.leetcode_handle),
      solved: solvedOn("leetcode", mainDay),
    },
    gfg: { url: GFG_POTD_URL, solved: solvedOn("gfg", gfgDay) },
  };
}

router.get("/", async (req, res) => {
  res.json(await dailyState(await getUser(req.user.id)));
});

// ---------- Checking a solve ----------

// Calls a platform; if it fails, the user sees which platform and why.
async function fromPlatform(name, call) {
  try {
    return await call();
  } catch (e) {
    throw new HttpError(502, `Couldn't check ${name} right now: ${e.message}`);
  }
}

// Each checker looks in the user's recent accepted submissions for today's problem,
// submitted after today started. It returns { problem, solvedAt } or null.
const checkers = {
  async codeforces(user, day) {
    if (!user.codeforces_handle) throw new HttpError(400, "Add your Codeforces handle in Profile first.");
    const challenge = await codeforcesChallenge(user.id, day);
    if (!challenge) throw new HttpError(404, "Open today's problem first.");
    const recent = await fromPlatform("Codeforces", () => fetchCodeforcesSolved(user.codeforces_handle, { count: 100 }));
    const hit = recent.find((s) => s.externalId === challenge.external_id && s.solvedAt >= utcDayStart(day));
    return hit ? { problem: challenge.external_id, solvedAt: hit.solvedAt } : null;
  },

  async leetcode(user, day) {
    if (!user.leetcode_handle) throw new HttpError(400, "Add your LeetCode username in Profile first.");
    const daily = await fromPlatform("LeetCode", () => leetcodeDailyFor(day));
    const recent = await fromPlatform("LeetCode", () => fetchLeetcodeRecentAccepted(user.leetcode_handle));
    const hit = recent.find((s) => s.externalId === daily.externalId && s.solvedAt >= utcDayStart(day));
    return hit ? { problem: daily.externalId, solvedAt: hit.solvedAt } : null;
  },
};

// Saves a confirmed solve, and marks the problem solved in the problem list if we have it.
// ON CONFLICT: checking twice, or from two tabs at once, still leaves one row.
async function recordSolve(userId, platform, day, problem, solvedAt) {
  await query(
    `INSERT INTO daily_solves (user_id, platform, day, problem, solved_at)
     VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
    [userId, platform, day, problem, solvedAt],
  );
  await query(
    `INSERT INTO solved (user_id, problem_id, solved_at)
     SELECT $1, id, $4 FROM problems WHERE platform = $2 AND external_id = $3
     ON CONFLICT DO NOTHING`,
    [userId, platform, problem, solvedAt],
  );
}

router.post("/check/:platform", async (req, res) => {
  const { platform } = req.params;
  // Object.hasOwn, not checkers[platform]: "constructor" or "toString" would otherwise
  // find a built-in function on every object.
  if (!Object.hasOwn(checkers, platform)) {
    throw new HttpError(404, "Only Codeforces and LeetCode solves can be checked. GFG solves are marked by hand.");
  }
  const user = await getUser(req.user.id);
  const day = todayIn(DAY_ZONE.main);
  const { rows } = await query(
    "SELECT 1 FROM daily_solves WHERE user_id = $1 AND platform = $2 AND day = $3",
    [user.id, platform, day],
  );
  if (!rows[0]) {
    const solve = await checkers[platform](user, day);
    if (solve) await recordSolve(user.id, platform, day, solve.problem, solve.solvedAt);
  }
  res.json(await dailyState(user));
});

// ---------- GFG (self-reported) ----------

// The server decides the day, so a user can only mark today, never a past day.
router.post("/gfg", async (req, res) => {
  const user = await getUser(req.user.id);
  await query(
    "INSERT INTO daily_solves (user_id, platform, day) VALUES ($1, 'gfg', $2) ON CONFLICT DO NOTHING",
    [user.id, todayIn(DAY_ZONE.gfg)],
  );
  res.json(await dailyState(user));
});

// Undo, in case it was marked by mistake.
router.delete("/gfg", async (req, res) => {
  const user = await getUser(req.user.id);
  await query(
    "DELETE FROM daily_solves WHERE user_id = $1 AND platform = 'gfg' AND day = $2",
    [user.id, todayIn(DAY_ZONE.gfg)],
  );
  res.json(await dailyState(user));
});

export default router;

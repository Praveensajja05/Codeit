import { Router } from "express";
import { query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { HttpError } from "../utils/errors.js";
import { appTimeZone, computeStreak, todayIn } from "../utils/time.js";
import { fetchCodeforcesSolved } from "../services/codeforces.js";
import { getUser } from "./me.js";

const router = Router();
router.use(requireAuth);

// Daily problems come from Codeforces only, because its official API lets us
// verify the solve. A user can't just click "done".

async function todaysChallenge(userId, day) {
  const { rows } = await query(
    `SELECT d.solved_at, p.id, p.external_id, p.name, p.url, p.difficulty, p.tags
     FROM daily_challenges d JOIN problems p ON p.id = d.problem_id
     WHERE d.user_id = $1 AND d.day = $2`,
    [userId, day],
  );
  return rows[0] ?? null;
}

async function streakFor(userId, today) {
  const { rows } = await query(
    `SELECT to_char(day, 'YYYY-MM-DD') AS day FROM daily_challenges
     WHERE user_id = $1 AND solved_at IS NOT NULL`,
    [userId],
  );
  return computeStreak(new Set(rows.map((r) => r.day)), today);
}

function view(day, challenge, streak, user) {
  return {
    day,
    streak,
    hasCodeforcesHandle: Boolean(user.codeforces_handle),
    solved: Boolean(challenge.solved_at),
    problem: {
      id: challenge.id, name: challenge.name, url: challenge.url,
      rating: challenge.difficulty, tags: challenge.tags, externalId: challenge.external_id,
    },
  };
}

router.get("/", async (req, res) => {
  const user = await getUser(req.user.id);
  const today = todayIn(appTimeZone());
  let challenge = await todaysChallenge(user.id, today);

  if (!challenge) {
    // A random Codeforces problem in the user's rating range that they haven't
    // solved and haven't been given before.
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
      [user.id, today, rows[0].id],
    );
    challenge = await todaysChallenge(user.id, today);
  }

  res.json(view(today, challenge, await streakFor(user.id, today), user));
});

// Check Codeforces for an accepted submission to today's problem, made today.
router.post("/check", async (req, res) => {
  const user = await getUser(req.user.id);
  if (!user.codeforces_handle) throw new HttpError(400, "Add your Codeforces handle in Profile first.");
  const today = todayIn(appTimeZone());
  const challenge = await todaysChallenge(user.id, today);
  if (!challenge) throw new HttpError(404, "Open today's problem first.");

  if (!challenge.solved_at) {
    const { rows } = await query(
      "SELECT extract(epoch FROM ($1::date::timestamp AT TIME ZONE $2))::bigint AS start",
      [today, appTimeZone()],
    );
    const dayStart = new Date(Number(rows[0].start) * 1000);
    let recent;
    try {
      recent = await fetchCodeforcesSolved(user.codeforces_handle, { count: 100 });
    } catch (e) {
      throw new HttpError(502, `Couldn't check Codeforces right now: ${e.message}`);
    }
    const hit = recent.find((s) => s.externalId === challenge.external_id && s.solvedAt >= dayStart);
    if (hit) {
      await query(
        "UPDATE daily_challenges SET solved_at = $3 WHERE user_id = $1 AND day = $2",
        [user.id, today, hit.solvedAt],
      );
      await query(
        "INSERT INTO solved (user_id, problem_id, solved_at) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
        [user.id, challenge.id, hit.solvedAt],
      );
      challenge.solved_at = hit.solvedAt;
    }
  }

  res.json(view(today, challenge, await streakFor(user.id, today), user));
});

export default router;

import { Router } from "express";
import { query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { HttpError } from "../utils/errors.js";
import { USER_COLUMNS } from "./auth.js";
import { fetchCodeforcesSolved } from "../services/codeforces.js";
import { fetchAtcoderSolved } from "../services/atcoder.js";
import { saveSolved } from "../services/problemStore.js";

const router = Router();
router.use(requireAuth);

export async function getUser(id) {
  const { rows } = await query(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [id]);
  if (!rows[0]) throw new HttpError(401, "Account not found. Please log in again.");
  return rows[0];
}

router.get("/", async (req, res) => {
  const user = await getUser(req.user.id);
  const { rows } = await query(
    `SELECT p.platform, count(*)::int AS solved
     FROM solved s JOIN problems p ON p.id = s.problem_id
     WHERE s.user_id = $1 GROUP BY p.platform`,
    [req.user.id],
  );
  res.json({ user, solvedCounts: Object.fromEntries(rows.map((r) => [r.platform, r.solved])) });
});

const HANDLE = /^[A-Za-z0-9_.-]{2,24}$/;
const LEETCODE_HANDLE = /^[A-Za-z0-9_.-]{2,40}$/;   // LeetCode usernames can be longer
const cleanHandle = (value, label, pattern = HANDLE) => {
  const h = (value ?? "").trim();
  if (!h) return null;
  if (!pattern.test(h)) throw new HttpError(400, `${label} handle has invalid characters.`);
  return h;
};

router.put("/", async (req, res) => {
  const body = req.body ?? {};
  const current = await getUser(req.user.id);
  const name = body.name?.trim() || current.name;
  const cf = "codeforcesHandle" in body ? cleanHandle(body.codeforcesHandle, "Codeforces") : current.codeforces_handle;
  const ac = "atcoderHandle" in body ? cleanHandle(body.atcoderHandle, "AtCoder") : current.atcoder_handle;
  const lc = "leetcodeHandle" in body ? cleanHandle(body.leetcodeHandle, "LeetCode", LEETCODE_HANDLE) : current.leetcode_handle;
  const min = Number(body.dailyMinRating ?? current.daily_min_rating);
  const max = Number(body.dailyMaxRating ?? current.daily_max_rating);
  if (![min, max].every(Number.isInteger) || min < 800 || max > 3500 || min > max) {
    throw new HttpError(400, "Daily rating range must be whole numbers between 800 and 3500, with min ≤ max.");
  }
  const { rows } = await query(
    `UPDATE users SET name = $2, codeforces_handle = $3, atcoder_handle = $4, leetcode_handle = $5,
       daily_min_rating = $6, daily_max_rating = $7
     WHERE id = $1 RETURNING ${USER_COLUMNS}`,
    [req.user.id, name, cf, ac, lc, min, max],
  );
  res.json({ user: rows[0] });
});

// Pull the user's accepted submissions and mark those problems as solved.
// Each platform is reported separately, so one failure doesn't hide the other result.
router.post("/sync", async (req, res) => {
  const user = await getUser(req.user.id);
  if (!user.codeforces_handle && !user.atcoder_handle) {
    throw new HttpError(400, "Add your Codeforces or AtCoder handle first.");
  }
  const result = {};
  if (user.codeforces_handle) {
    try {
      result.codeforces = { added: await saveSolved(user.id, "codeforces", await fetchCodeforcesSolved(user.codeforces_handle)) };
    } catch (e) {
      result.codeforces = { error: e.message };
    }
  }
  if (user.atcoder_handle) {
    try {
      result.atcoder = { added: await saveSolved(user.id, "atcoder", await fetchAtcoderSolved(user.atcoder_handle)) };
    } catch (e) {
      result.atcoder = { error: e.message };
    }
  }
  res.json(result);
});

export default router;

import { Router } from "express";
import { query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { HttpError } from "../utils/errors.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const problems = await query(
    `SELECT p.id, p.platform, p.external_id, p.name, p.url, p.difficulty, p.difficulty_label, p.tags,
            EXISTS (SELECT 1 FROM solved s WHERE s.user_id = $1 AND s.problem_id = p.id) AS is_solved,
            true AS is_favorite
     FROM favorite_problems f JOIN problems p ON p.id = f.problem_id
     WHERE f.user_id = $1 ORDER BY f.created_at DESC`,
    [req.user.id],
  );
  const contests = await query(
    `SELECT contest_key AS key, title, platform, url, start_time AS start, end_time AS "end", true AS "isFavorite"
     FROM favorite_contests WHERE user_id = $1 ORDER BY start_time`,
    [req.user.id],
  );
  res.json({ problems: problems.rows, contests: contests.rows });
});

const problemId = (req) => {
  const id = Number.parseInt(req.params.problemId, 10);
  if (!Number.isInteger(id)) throw new HttpError(400, "Invalid problem id.");
  return id;
};

router.post("/problems/:problemId", async (req, res) => {
  try {
    await query(
      "INSERT INTO favorite_problems (user_id, problem_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [req.user.id, problemId(req)],
    );
  } catch (e) {
    if (e.code === "23503") throw new HttpError(404, "Problem not found.");   // foreign key violation
    throw e;
  }
  res.status(201).json({ ok: true });
});

router.delete("/problems/:problemId", async (req, res) => {
  await query("DELETE FROM favorite_problems WHERE user_id = $1 AND problem_id = $2", [req.user.id, problemId(req)]);
  res.json({ ok: true });
});

router.post("/contests", async (req, res) => {
  const { key, title, platform, url, start, end } = req.body ?? {};
  if (![key, title, platform, url, start, end].every((v) => typeof v === "string" && v)) {
    throw new HttpError(400, "Contest details are incomplete.");
  }
  if (!/^https?:\/\//.test(url)) throw new HttpError(400, "Invalid contest link.");
  await query(
    `INSERT INTO favorite_contests (user_id, contest_key, title, platform, url, start_time, end_time)
     VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING`,
    [req.user.id, key, title, platform, url, start, end],
  );
  res.status(201).json({ ok: true });
});

router.delete("/contests/:key", async (req, res) => {
  await query("DELETE FROM favorite_contests WHERE user_id = $1 AND contest_key = $2", [req.user.id, req.params.key]);
  res.json({ ok: true });
});

export default router;

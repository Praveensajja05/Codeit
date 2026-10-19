import { Router } from "express";
import { query } from "../db.js";
import { optionalAuth } from "../middleware/auth.js";
import { HttpError } from "../utils/errors.js";

const router = Router();
const PAGE_SIZE = 25;
const PLATFORMS = ["codeforces", "atcoder", "leetcode"];
const LEVELS = ["Easy", "Medium", "Hard"];

router.get("/tags", async (req, res) => {
  const { rows } = await query(
    `SELECT tag, count(*)::int AS count FROM problems, unnest(tags) AS tag
     GROUP BY tag ORDER BY count(*) DESC LIMIT 60`,
  );
  res.json({ tags: rows });
});

// Every filter adds a WHERE condition with a numbered placeholder ($1, $2...).
// Values never go into the SQL text itself, which prevents SQL injection.
router.get("/", optionalAuth, async (req, res) => {
  const { search, platform, tag, level, minRating, maxRating, unsolved } = req.query;
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const where = [];
  const params = [];
  const param = (value) => { params.push(value); return `$${params.length}`; };

  if (search?.trim()) {
    const p = param(`%${search.trim()}%`);
    where.push(`(p.name ILIKE ${p} OR p.external_id ILIKE ${p})`);
  }
  if (platform) {
    if (!PLATFORMS.includes(platform)) throw new HttpError(400, "Unknown platform.");
    where.push(`p.platform = ${param(platform)}`);
  }
  if (tag) where.push(`${param(tag)} = ANY(p.tags)`);
  if (level) {
    if (!LEVELS.includes(level)) throw new HttpError(400, "Level must be Easy, Medium or Hard.");
    where.push(`p.difficulty_label = ${param(level)}`);
  }
  if (minRating && Number.isFinite(Number(minRating))) where.push(`p.difficulty >= ${param(Number(minRating))}`);
  if (maxRating && Number.isFinite(Number(maxRating))) where.push(`p.difficulty <= ${param(Number(maxRating))}`);

  if (req.user && unsolved === "true") {
    where.push(`NOT EXISTS (SELECT 1 FROM solved s WHERE s.user_id = ${param(req.user.id)} AND s.problem_id = p.id)`);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const total = (await query(`SELECT count(*)::int AS n FROM problems p ${whereSql}`, params)).rows[0].n;

  // Postgres rejects unused parameters, so the user id for these columns is added only to this query.
  const listParams = params.slice();
  let userColumns = "false AS is_solved, false AS is_favorite";
  if (req.user) {
    listParams.push(req.user.id);
    const u = `$${listParams.length}`;
    userColumns = `EXISTS (SELECT 1 FROM solved s WHERE s.user_id = ${u} AND s.problem_id = p.id) AS is_solved,
                   EXISTS (SELECT 1 FROM favorite_problems f WHERE f.user_id = ${u} AND f.problem_id = p.id) AS is_favorite`;
  }

  const { rows } = await query(
    `SELECT p.id, p.platform, p.external_id, p.name, p.url, p.difficulty, p.difficulty_label, p.tags, ${userColumns}
     FROM problems p ${whereSql}
     ORDER BY p.difficulty NULLS LAST, p.id
     LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`,
    listParams,
  );
  res.json({ page, pageSize: PAGE_SIZE, total, problems: rows });
});

export default router;

import { Router } from "express";
import { query } from "../db.js";
import { optionalAuth } from "../middleware/auth.js";
import { getUpcomingContests } from "../services/clist.js";

const router = Router();

router.get("/", optionalAuth, async (req, res) => {
  const { source, contests } = await getUpcomingContests();
  const list = req.query.platform ? contests.filter((c) => c.platform === req.query.platform) : contests;

  let favorites = new Set();
  if (req.user) {
    const { rows } = await query("SELECT contest_key FROM favorite_contests WHERE user_id = $1", [req.user.id]);
    favorites = new Set(rows.map((r) => r.contest_key));
  }
  res.json({ source, contests: list.map((c) => ({ ...c, isFavorite: favorites.has(c.key) })) });
});

export default router;

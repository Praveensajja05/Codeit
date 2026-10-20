import { Router } from "express";
import { query } from "../db.js";
import { optionalAuth } from "../middleware/auth.js";
import { getUpcomingContests } from "../services/clist.js";

const router = Router();

router.get("/", optionalAuth, async (req, res) => {
  const { source, contests } = await getUpcomingContests();
  const list = req.query.platform ? contests.filter((c) => c.platform === req.query.platform) : contests;

  let favorites = new Set();
  let reminders = new Set();
  if (req.user) {
    const [fav, rem] = await Promise.all([
      query("SELECT contest_key FROM favorite_contests WHERE user_id = $1", [req.user.id]),
      query("SELECT contest_key FROM contest_reminders WHERE user_id = $1", [req.user.id]),
    ]);
    favorites = new Set(fav.rows.map((r) => r.contest_key));
    reminders = new Set(rem.rows.map((r) => r.contest_key));
  }
  res.json({
    source,
    contests: list.map((c) => ({ ...c, isFavorite: favorites.has(c.key), hasReminder: reminders.has(c.key) })),
  });
});

export default router;

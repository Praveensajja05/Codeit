import { Router } from "express";
import { query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { HttpError } from "../utils/errors.js";
import { getUpcomingContests } from "../services/clist.js";
import { emailConfigured } from "../services/mailer.js";
import { REMINDER_LEAD_MINUTES } from "../services/reminders.js";

const router = Router();
router.use(requireAuth);

// The user's upcoming reminders: which contests they will get an email for.
router.get("/", async (req, res) => {
  const { rows } = await query(
    `SELECT contest_key AS key, title, platform, url, start_time AS start, sent_at AS "sentAt"
     FROM contest_reminders WHERE user_id = $1 AND start_time > now() ORDER BY start_time`,
    [req.user.id],
  );
  res.json({ leadMinutes: REMINDER_LEAD_MINUTES, emailConfigured: emailConfigured(), reminders: rows });
});

// Turn a reminder on. Only the contest key comes from the browser: the title, link and start
// time are taken from the server's own contest list, so nobody can save made-up contest details.
router.post("/:key", async (req, res) => {
  const { contests } = await getUpcomingContests();
  const contest = contests.find((c) => c.key === req.params.key);
  if (!contest) throw new HttpError(404, "That contest isn't in the upcoming list.");
  if (new Date(contest.start) <= new Date()) throw new HttpError(400, "That contest has already started.");
  await query(
    `INSERT INTO contest_reminders (user_id, contest_key, title, platform, url, start_time)
     VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING`,
    [req.user.id, contest.key, contest.title, contest.platform, contest.url, contest.start],
  );
  res.status(201).json({ ok: true });
});

router.delete("/:key", async (req, res) => {
  await query("DELETE FROM contest_reminders WHERE user_id = $1 AND contest_key = $2", [req.user.id, req.params.key]);
  res.json({ ok: true });
});

export default router;

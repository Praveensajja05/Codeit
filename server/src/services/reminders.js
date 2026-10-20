// Contest reminder emails. Every minute the server looks for reminders whose contest starts
// within the next REMINDER_LEAD_MINUTES, claims them, and emails each user once.
import { query } from "../db.js";

// 30 minutes normally. REMINDER_LEAD_MINUTES in .env can widen it for a quick test,
// e.g. 1440 sends reminders for any chosen contest in the next 24 hours right away.
const fromEnv = Number(process.env.REMINDER_LEAD_MINUTES);
export const REMINDER_LEAD_MINUTES = Number.isInteger(fromEnv) && fromEnv > 0 && fromEnv <= 10080 ? fromEnv : 30;
const SHOWN_IN = "Asia/Kolkata";   // times in the email are written in India time

export function formatStart(start) {
  const text = new Date(start).toLocaleString("en-IN", {
    timeZone: SHOWN_IN, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
  return `${text} IST`;
}

const oneLine = (s) => String(s).replace(/[\r\n]+/g, " ");   // contest names come from other sites

// "now" is a parameter so tests can fix the time. A reminder turned on late (say 10 minutes
// before the start) is sent right away, so the email states the real time left.
export function buildReminderEmail({ name, title, platform, url, start }, now = new Date()) {
  const minutesLeft = Math.max(1, Math.round((new Date(start) - now) / 60000));
  return {
    subject: oneLine(`Starting soon: ${title} (${platform})`),
    text: [
      `Hi ${name},`,
      "",
      `${title} on ${platform} starts at ${formatStart(start)}, in about ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}.`,
      `Contest page: ${url}`,
      "",
      "You get this email because you turned on a reminder for this contest in Codeit.",
      "To stop reminders, turn them off on the Contests page or in your Profile.",
    ].join("\n"),
  };
}

// Claims every due reminder in ONE statement: it sets sent_at and returns the rows it changed.
// If two runs overlap, PostgreSQL locks each row, and the second run re-checks
// "sent_at IS NULL" after the first one commits, so it skips rows already claimed.
export async function claimDueReminders(leadMinutes = REMINDER_LEAD_MINUTES) {
  const { rows } = await query(
    `UPDATE contest_reminders r
     SET sent_at = now()
     FROM users u
     WHERE u.id = r.user_id
       AND r.sent_at IS NULL
       AND r.start_time > now()
       AND r.start_time <= now() + make_interval(mins => $1)
     RETURNING r.user_id, r.contest_key, r.title, r.platform, r.url, r.start_time AS start, u.email, u.name`,
    [leadMinutes],
  );
  return rows;
}

export async function sendDueReminders(mailer) {
  const due = await claimDueReminders();
  let sent = 0;
  let failed = 0;
  for (const r of due) {
    try {
      await mailer.send({ to: r.email, ...buildReminderEmail(r) });
      sent++;
    } catch (e) {
      failed++;
      console.error(`Reminder email to user ${r.user_id} for ${r.contest_key} failed: ${e.message}`);
      // Un-claim it so the next run tries again (only while the contest hasn't started).
      await query(
        "UPDATE contest_reminders SET sent_at = NULL WHERE user_id = $1 AND contest_key = $2",
        [r.user_id, r.contest_key],
      );
    }
  }
  return { sent, failed };
}

// Runs sendDueReminders every intervalMs. A run is skipped if the previous one is still going.
export function startReminderJob(mailer, intervalMs = 60_000) {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await sendDueReminders(mailer);
    } catch (e) {
      console.error("Reminder job failed:", e.message);
    } finally {
      running = false;
    }
  };
  const timer = setInterval(tick, intervalMs);
  tick();
  return () => clearInterval(timer);
}

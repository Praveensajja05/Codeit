// "YYYY-MM-DD" for the current date in the given time zone.
export function todayIn(timeZone, now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
}

// solvedDays: Set of "YYYY-MM-DD" strings on which the daily problem was solved.
// If today isn't solved yet, the streak is still alive and counts back from yesterday.
export function computeStreak(solvedDays, today) {
  const d = new Date(`${today}T00:00:00Z`);
  if (!solvedDays.has(today)) d.setUTCDate(d.getUTCDate() - 1);
  let streak = 0;
  while (solvedDays.has(d.toISOString().slice(0, 10))) {
    streak += 1;
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return streak;
}

export const appTimeZone = () => process.env.APP_TIMEZONE || "Asia/Kolkata";

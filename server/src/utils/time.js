// "YYYY-MM-DD" for the current date in the given time zone.
export function todayIn(timeZone, now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
}

// When "today" starts on the Daily page.
// main: LeetCode's daily problem changes at midnight UTC (5:30 am in India). The Codeforces
//       problem, the main streak and the LeetCode streak all follow that day, so a LeetCode
//       solve always lands on the same day LeetCode itself counts it.
// gfg:  GFG's problem changes at midnight India time, so the GFG streak follows India's date.
export const DAY_ZONE = { main: "UTC", gfg: "Asia/Kolkata" };

// The moment a "main" (UTC) day starts. A submission before this belongs to an earlier day.
export const utcDayStart = (day) => new Date(`${day}T00:00:00Z`);

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

// rows: [{ platform, day }] from daily_solves.
// main:     a day counts if the Codeforces OR the LeetCode problem was solved; one is enough.
// leetcode: only LeetCode solves.
// gfg:      only GFG solves (self-reported), counted on India's date.
export function computeStreaks(rows, { mainDay, gfgDay }) {
  const daysFor = (platforms) =>
    new Set(rows.filter((r) => platforms.includes(r.platform)).map((r) => r.day));
  return {
    main: computeStreak(daysFor(["codeforces", "leetcode"]), mainDay),
    leetcode: computeStreak(daysFor(["leetcode"]), mainDay),
    gfg: computeStreak(daysFor(["gfg"]), gfgDay),
  };
}

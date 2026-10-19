// Upcoming contests from all five platforms through clist.by (needs a free API key).
// Without a key, or if Clist fails, we fall back to Codeforces' own API.
import { getJson } from "./http.js";
import { fetchCodeforcesContests } from "./codeforces.js";
import { googleCalendarUrl } from "./calendar.js";

export const PLATFORMS = {
  "codeforces.com": "Codeforces",
  "atcoder.jp": "AtCoder",
  "leetcode.com": "LeetCode",
  "codechef.com": "CodeChef",
  "geeksforgeeks.org": "GeeksforGeeks",
};

const CACHE_MS = 10 * 60 * 1000;   // Clist allows ~10 requests a minute; contests rarely change
let cache = { at: 0, value: null };

const asUtc = (s) => new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : `${s}Z`).toISOString();

async function fetchFromClist() {
  const params = new URLSearchParams({
    upcoming: "true",
    order_by: "start",
    limit: "200",
    host__regex: `^(${Object.keys(PLATFORMS).map((h) => h.replace(/\./g, "\\.")).join("|")})$`,
  });
  const data = await getJson(`https://clist.by/api/v4/contest/?${params}`, {
    headers: { Authorization: `ApiKey ${process.env.CLIST_USERNAME}:${process.env.CLIST_API_KEY}` },
  });
  return data.objects
    .filter((c) => PLATFORMS[c.host])
    .map((c) => ({
      key: `clist-${c.id}`,
      title: c.event,
      platform: PLATFORMS[c.host],
      url: c.href,
      start: asUtc(c.start),
      end: asUtc(c.end),
    }));
}

export async function getUpcomingContests() {
  if (cache.value && Date.now() - cache.at < CACHE_MS) return cache.value;

  let contests;
  let source = "clist";
  if (process.env.CLIST_USERNAME && process.env.CLIST_API_KEY) {
    try {
      contests = await fetchFromClist();
    } catch (e) {
      console.error("Clist failed, using Codeforces only:", e.message);
    }
  }
  if (!contests) {
    contests = await fetchCodeforcesContests();
    source = "codeforces-only";
  }

  contests.sort((a, b) => new Date(a.start) - new Date(b.start));
  const value = { source, contests: contests.map((c) => ({ ...c, calendarUrl: googleCalendarUrl(c) })) };
  cache = { at: Date.now(), value };
  return value;
}

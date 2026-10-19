import { test } from "node:test";
import assert from "node:assert/strict";
import { DAY_ZONE, computeStreak, computeStreaks, todayIn, utcDayStart } from "../src/utils/time.js";
import { googleCalendarUrl } from "../src/services/calendar.js";
import { adjustDifficulty } from "../src/services/atcoder.js";
import { normalizeTag } from "../src/utils/tags.js";

test("streak counts consecutive solved days ending today", () => {
  assert.equal(computeStreak(new Set(["2026-10-17", "2026-10-18", "2026-10-19"]), "2026-10-19"), 3);
});

test("streak is still alive if today isn't solved yet", () => {
  assert.equal(computeStreak(new Set(["2026-10-17", "2026-10-18"]), "2026-10-19"), 2);
});

test("a missed day resets the streak", () => {
  assert.equal(computeStreak(new Set(["2026-10-15", "2026-10-16"]), "2026-10-19"), 0);
  assert.equal(computeStreak(new Set(["2026-10-15", "2026-10-19"]), "2026-10-19"), 1);
});

test("streak crosses month boundaries", () => {
  assert.equal(computeStreak(new Set(["2026-09-30", "2026-10-01"]), "2026-10-01"), 2);
});

test("today depends on the time zone", () => {
  const instant = new Date("2026-10-19T20:00:00Z");   // 1:30 am on the 20th in India
  assert.equal(todayIn("Asia/Kolkata", instant), "2026-10-20");
  assert.equal(todayIn("UTC", instant), "2026-10-19");
});

test("the main day changes at 5:30 am in India, GFG's day at midnight", () => {
  const twoAm = new Date("2026-10-19T20:30:00Z");    // 2:00 am on the 20th in India
  assert.equal(todayIn(DAY_ZONE.main, twoAm), "2026-10-19");   // LeetCode hasn't changed yet
  assert.equal(todayIn(DAY_ZONE.gfg, twoAm), "2026-10-20");    // GFG already has
  const sixAm = new Date("2026-10-20T00:30:00Z");    // 6:00 am on the 20th in India
  assert.equal(todayIn(DAY_ZONE.main, sixAm), "2026-10-20");
  assert.equal(utcDayStart("2026-10-20").toISOString(), "2026-10-20T00:00:00.000Z");
});

const solve = (platform, day) => ({ platform, day });

test("main streak: solving Codeforces or LeetCode keeps it going", () => {
  const rows = [solve("codeforces", "2026-10-17"), solve("leetcode", "2026-10-18"), solve("codeforces", "2026-10-19")];
  const s = computeStreaks(rows, { mainDay: "2026-10-19", gfgDay: "2026-10-19" });
  assert.equal(s.main, 3);
  assert.equal(s.leetcode, 1);   // only the 18th; today isn't solved on LeetCode yet
  assert.equal(s.gfg, 0);
});

test("solving both on the same day counts that day once", () => {
  const rows = [solve("codeforces", "2026-10-19"), solve("leetcode", "2026-10-19")];
  const s = computeStreaks(rows, { mainDay: "2026-10-19", gfgDay: "2026-10-19" });
  assert.equal(s.main, 1);
  assert.equal(s.leetcode, 1);
});

test("GFG is counted on its own day and never keeps the main streak alive", () => {
  const rows = [solve("gfg", "2026-10-19"), solve("gfg", "2026-10-20")];
  const s = computeStreaks(rows, { mainDay: "2026-10-19", gfgDay: "2026-10-20" });
  assert.equal(s.gfg, 2);
  assert.equal(s.main, 0);
});

test("Google Calendar link has the right UTC times", () => {
  const url = new URL(googleCalendarUrl({
    title: "Codeforces Round 999", url: "https://codeforces.com/contests/999",
    start: "2026-10-20T14:35:00.000Z", end: "2026-10-20T16:35:00.000Z",
  }));
  assert.equal(url.searchParams.get("action"), "TEMPLATE");
  assert.equal(url.searchParams.get("dates"), "20261020T143500Z/20261020T163500Z");
  assert.equal(url.searchParams.get("text"), "Codeforces Round 999");
});

test("AtCoder difficulty adjustment keeps it positive", () => {
  assert.equal(adjustDifficulty(1200), 1200);
  assert.ok(adjustDifficulty(-1000) > 0);
  assert.equal(adjustDifficulty(null), null);
});

test("tags are unified across platforms", () => {
  assert.equal(normalizeTag("dp"), "dynamic programming");
  assert.equal(normalizeTag("Dynamic Programming"), "dynamic programming");
  assert.equal(normalizeTag("Greedy"), "greedy");
});

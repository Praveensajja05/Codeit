import { test } from "node:test";
import assert from "node:assert/strict";
import { computeStreak, todayIn } from "../src/utils/time.js";
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

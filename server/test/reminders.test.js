import { test } from "node:test";
import assert from "node:assert/strict";
import { buildReminderEmail, formatStart } from "../src/services/reminders.js";

test("reminder times are written in India time", () => {
  // 14:30 UTC is 20:00 in India (UTC+5:30)
  assert.match(formatStart("2026-10-24T14:30:00Z"), /Sat.*24 Oct.*08:00 pm IST/i);
});

test("reminder email names the contest, platform, time and link", () => {
  const { subject, text } = buildReminderEmail({
    name: "Praveen", title: "Codeforces Round 999", platform: "Codeforces",
    url: "https://codeforces.com/contests/999", start: "2026-10-24T14:30:00Z",
  }, new Date("2026-10-24T14:00:00Z"));
  assert.equal(subject, "Starting soon: Codeforces Round 999 (Codeforces)");
  assert.ok(text.startsWith("Hi Praveen,"));
  assert.ok(text.includes("in about 30 minutes."));
  assert.ok(text.includes("https://codeforces.com/contests/999"));
  assert.ok(text.includes("To stop reminders"));
});

test("a reminder sent late states the real time left", () => {
  const start = "2026-10-24T14:30:00Z";
  const at = (iso) => buildReminderEmail({ name: "X", title: "R", platform: "CF", url: "u", start }, new Date(iso)).text;
  assert.ok(at("2026-10-24T14:18:00Z").includes("in about 12 minutes."));
  assert.ok(at("2026-10-24T14:29:50Z").includes("in about 1 minute."));
});

test("a line break in a contest name can't sneak into the subject", () => {
  const { subject } = buildReminderEmail({ name: "X", title: "A\r\nBcc: someone@x.com", platform: "CF", url: "u", start: new Date() });
  assert.ok(!/[\r\n]/.test(subject));
});

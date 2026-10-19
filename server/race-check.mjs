// race-check.mjs: asks for today's Codeforces daily problem 10 times at the same moment, as one new user.
// Run it while the server is running:   node race-check.mjs
const base = "http://localhost:5000/api";
const json = { "Content-Type": "application/json" };
const email = `race${Date.now()}@test.com`;

const signup = await fetch(`${base}/auth/signup`, {
  method: "POST",
  headers: json,
  body: JSON.stringify({ name: "Race Test", email, password: "racetest123" }),
}).then((r) => r.json());
if (!signup.token) throw new Error(`Signup failed: ${signup.error}`);

const headers = { Authorization: `Bearer ${signup.token}` };
const results = await Promise.all(
  Array.from({ length: 10 }, () => fetch(`${base}/daily`, { headers }).then((r) => r.json())),
);

const problems = new Set(results.map((r) => r.codeforces?.problem?.externalId ?? `error: ${r.codeforces?.error ?? r.error}`));
console.log("Problems handed out:", [...problems].join(", "));
console.log(problems.size === 1
  ? "Responses agree: all 10 simultaneous requests showed the same daily problem."
  : "FAIL: one user was shown different daily problems for the same day.");
// The responses alone can hide the bug. Check the database too: this must print 1.
console.log("Now check the database (must be 1):");
console.log(`  SELECT count(*) FROM daily_challenges WHERE user_id = (SELECT id FROM users WHERE email = '${email}');`);

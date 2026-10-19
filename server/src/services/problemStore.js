import { query } from "../db.js";
import { fetchCodeforcesProblems } from "./codeforces.js";
import { fetchAtcoderProblems } from "./atcoder.js";
import { fetchLeetcodeProblems } from "./leetcode.js";

// Insert or update problems in batches. The whole batch is sent as one JSON parameter.
export async function upsertProblems(problems) {
  const unique = [...new Map(problems.map((p) => [`${p.platform}:${p.externalId}`, p])).values()];
  for (let i = 0; i < unique.length; i += 1000) {
    await query(
      `INSERT INTO problems (platform, external_id, name, url, difficulty, difficulty_label, tags)
       SELECT p->>'platform', p->>'externalId', p->>'name', p->>'url',
              (p->>'difficulty')::int, p->>'difficultyLabel',
              ARRAY(SELECT jsonb_array_elements_text(p->'tags'))
       FROM jsonb_array_elements($1::jsonb) AS p
       ON CONFLICT (platform, external_id) DO UPDATE SET
         name = EXCLUDED.name, url = EXCLUDED.url, difficulty = EXCLUDED.difficulty,
         difficulty_label = EXCLUDED.difficulty_label, tags = EXCLUDED.tags`,
      [JSON.stringify(unique.slice(i, i + 1000))],
    );
  }
  return unique.length;
}

// Each platform is synced on its own, so one broken API doesn't stop the others.
export async function syncAllProblems(log = console.log) {
  const sources = {
    codeforces: fetchCodeforcesProblems,
    atcoder: fetchAtcoderProblems,
    leetcode: fetchLeetcodeProblems,
  };
  const summary = {};
  for (const [name, fetchProblems] of Object.entries(sources)) {
    try {
      summary[name] = await upsertProblems(await fetchProblems());
      log(`${name}: ${summary[name]} problems saved`);
    } catch (e) {
      summary[name] = `failed: ${e.message}`;
      log(`${name}: FAILED - ${e.message}`);
    }
  }
  return summary;
}

// Mark problems as solved. Keeps the earliest accepted time per problem.
// Submissions for problems not in our table are ignored by the JOIN.
export async function saveSolved(userId, platform, solvedList) {
  const earliest = new Map();
  for (const { externalId, solvedAt } of solvedList) {
    const prev = earliest.get(externalId);
    if (!prev || solvedAt < prev) earliest.set(externalId, solvedAt);
  }
  if (earliest.size === 0) return 0;
  const payload = JSON.stringify([...earliest].map(([externalId, solvedAt]) => ({ externalId, solvedAt })));
  const { rowCount } = await query(
    `INSERT INTO solved (user_id, problem_id, solved_at)
     SELECT $1, pr.id, (s->>'solvedAt')::timestamptz
     FROM jsonb_array_elements($3::jsonb) AS s
     JOIN problems pr ON pr.platform = $2 AND pr.external_id = s->>'externalId'
     ON CONFLICT (user_id, problem_id) DO NOTHING`,
    [userId, platform, payload],
  );
  return rowCount;
}

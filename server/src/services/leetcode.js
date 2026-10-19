// LeetCode has no official public API. This uses the GraphQL endpoint its own website calls.
// It can change without notice; if it does, the LeetCode parts report an error and
// Codeforces/AtCoder keep working.
import { getJson, sleep } from "./http.js";
import { normalizeTag } from "../utils/tags.js";

function leetcodeGraphql(query, variables = {}, timeoutMs) {
  return getJson("https://leetcode.com/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json", Referer: "https://leetcode.com/problemset/" },
    body: JSON.stringify({ query, variables }),
  }, timeoutMs);
}

const PROBLEMS_QUERY = `
query problems($skip: Int, $limit: Int) {
  questionList(categorySlug: "", limit: $limit, skip: $skip, filters: {}) {
    totalNum
    data { questionFrontendId title titleSlug difficulty isPaidOnly topicTags { name } }
  }
}`;

export async function fetchLeetcodeProblems() {
  const problems = [];
  let skip = 0;
  let total = Infinity;
  while (skip < total) {
    const body = await leetcodeGraphql(PROBLEMS_QUERY, { skip, limit: 100 });
    const list = body?.data?.questionList;
    if (!list) throw new Error("LeetCode changed its API (no questionList in the response)");
    total = list.totalNum;
    if (list.data.length === 0) break;
    for (const q of list.data) {
      if (q.isPaidOnly) continue;   // premium problems can't be opened without a subscription
      problems.push({
        platform: "leetcode",
        externalId: q.titleSlug,
        name: `${q.questionFrontendId}. ${q.title}`,
        url: `https://leetcode.com/problems/${q.titleSlug}/`,
        difficulty: null,
        difficultyLabel: q.difficulty,
        tags: q.topicTags.map((t) => normalizeTag(t.name)),
      });
    }
    skip += list.data.length;
    await sleep(300);
  }
  return problems;
}

const DAILY_QUERY = `
query questionOfToday {
  activeDailyCodingChallengeQuestion {
    date
    link
    question { questionFrontendId title titleSlug difficulty topicTags { name } }
  }
}`;

// LeetCode's daily question, the same for everyone. `date` is LeetCode's day ("YYYY-MM-DD"),
// which starts at midnight UTC.
export async function fetchLeetcodeDaily() {
  const body = await leetcodeGraphql(DAILY_QUERY, {}, 10000);
  const daily = body?.data?.activeDailyCodingChallengeQuestion;
  if (!daily?.question) throw new Error("LeetCode changed its API (no daily question in the response)");
  const q = daily.question;
  // Use the link LeetCode gives for its daily, but only if it really points at leetcode.com.
  const link = daily.link ? new URL(daily.link, "https://leetcode.com") : null;
  return {
    date: daily.date,
    externalId: q.titleSlug,
    name: `${q.questionFrontendId}. ${q.title}`,
    url: link?.host === "leetcode.com" ? link.href : `https://leetcode.com/problems/${q.titleSlug}/`,
    level: q.difficulty,
    tags: q.topicTags.map((t) => normalizeTag(t.name)),
  };
}

const RECENT_ACCEPTED_QUERY = `
query recentAccepted($username: String!, $limit: Int!) {
  matchedUser(username: $username) { username }
  recentAcSubmissionList(username: $username, limit: $limit) { titleSlug timestamp }
}`;

// A user's most recent accepted submissions. LeetCode only shares the most recent ones
// publicly, so this can check today's daily problem but can't sync a full solved list.
export async function fetchLeetcodeRecentAccepted(username) {
  const body = await leetcodeGraphql(RECENT_ACCEPTED_QUERY, { username, limit: 20 }, 10000);
  if (body?.data && body.data.matchedUser === null) throw new Error(`LeetCode user "${username}" not found`);
  const list = body?.data?.recentAcSubmissionList;
  if (!Array.isArray(list)) {
    throw new Error(body?.errors?.[0]?.message ?? "LeetCode changed its API (no recent submissions in the response)");
  }
  return list.map((s) => ({ externalId: s.titleSlug, solvedAt: new Date(Number(s.timestamp) * 1000) }));
}

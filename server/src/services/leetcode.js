// LeetCode has no official public API. This uses the GraphQL endpoint its own website calls.
// It can change without notice; if it does, the sync reports LeetCode as failed and
// Codeforces/AtCoder keep working.
import { getJson, sleep } from "./http.js";
import { normalizeTag } from "../utils/tags.js";

const QUERY = `
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
    const body = await getJson("https://leetcode.com/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json", Referer: "https://leetcode.com/problemset/" },
      body: JSON.stringify({ query: QUERY, variables: { skip, limit: 100 } }),
    });
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

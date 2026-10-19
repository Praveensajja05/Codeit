// Codeforces and LeetCode name the same topics differently ("dp" vs "Dynamic Programming").
// Normalizing lets one tag filter work across platforms.
const ALIASES = {
  dp: "dynamic programming",
  graphs: "graph",
  trees: "tree",
  strings: "string",
  sortings: "sorting",
};

export function normalizeTag(tag) {
  const t = String(tag).trim().toLowerCase();
  return ALIASES[t] ?? t;
}

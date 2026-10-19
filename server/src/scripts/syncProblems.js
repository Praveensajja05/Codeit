import "dotenv/config";
import { getPool } from "../db.js";
import { syncAllProblems } from "../services/problemStore.js";

console.log("Downloading problem lists. LeetCode takes a minute or two...");
const summary = await syncAllProblems();
console.log("Done:", summary);
await getPool().end();

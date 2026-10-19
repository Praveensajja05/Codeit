import "dotenv/config";
import { readFile } from "node:fs/promises";
import { getPool } from "../db.js";

const sql = await readFile(new URL("../schema.sql", import.meta.url), "utf8");
await getPool().query(sql);
console.log("Database tables are ready.");
await getPool().end();

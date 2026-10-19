import pg from "pg";

let pool;

// Created on first use, so the .env file has been loaded by then.
export function getPool() {
  if (!pool) pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  return pool;
}

export function query(text, params) {
  return getPool().query(text, params);
}

import { Router } from "express";
import bcrypt from "bcryptjs";
import { query } from "../db.js";
import { HttpError } from "../utils/errors.js";
import { signToken } from "../utils/token.js";

export const USER_COLUMNS =
  "id, name, email, codeforces_handle, atcoder_handle, leetcode_handle, daily_min_rating, daily_max_rating";

const router = Router();

router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body ?? {};
  if (!name?.trim() || !email?.trim() || !password) {
    throw new HttpError(400, "Name, email and password are required.");
  }
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) throw new HttpError(400, "That email doesn't look valid.");
  if (password.length < 8) throw new HttpError(400, "Password must be at least 8 characters.");

  const passwordHash = await bcrypt.hash(password, 10);
  try {
    const { rows } = await query(
      `INSERT INTO users (name, email, password_hash) VALUES ($1, lower($2), $3) RETURNING ${USER_COLUMNS}`,
      [name.trim(), email.trim(), passwordHash],
    );
    res.status(201).json({ token: signToken(rows[0].id), user: rows[0] });
  } catch (e) {
    if (e.code === "23505") throw new HttpError(409, "An account with this email already exists.");
    throw e;
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) throw new HttpError(400, "Email and password are required.");

  const { rows } = await query(
    `SELECT ${USER_COLUMNS}, password_hash FROM users WHERE email = lower($1)`,
    [email.trim()],
  );
  const user = rows[0];
  // Same message for "no such email" and "wrong password", so attackers can't find valid emails.
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new HttpError(401, "Wrong email or password.");
  }
  delete user.password_hash;
  res.json({ token: signToken(user.id), user });
});

export default router;

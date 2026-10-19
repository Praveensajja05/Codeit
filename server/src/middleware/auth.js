import jwt from "jsonwebtoken";
import { HttpError } from "../utils/errors.js";

function readUser(req) {
  const [scheme, token] = (req.headers.authorization || "").split(" ");
  if (scheme !== "Bearer" || !token) return null;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    return { id: Number(payload.sub) };
  } catch {
    return null;   // expired or tampered token: treat as logged out
  }
}

export function requireAuth(req, res, next) {
  const user = readUser(req);
  if (!user) return next(new HttpError(401, "Please log in."));
  req.user = user;
  next();
}

// For pages that work logged out but show extra info (favorites, solved) when logged in.
export function optionalAuth(req, res, next) {
  req.user = readUser(req);
  next();
}

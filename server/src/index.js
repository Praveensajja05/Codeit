import "dotenv/config";   // must be the first import: loads .env before anything reads it
import { createApp } from "./app.js";

// Fail fast: refuse to start with missing or weak secrets instead of running insecurely.
const missing = ["DATABASE_URL", "JWT_SECRET"].filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Missing ${missing.join(", ")}. Copy .env.example to .env and fill it in.`);
  process.exit(1);
}
if (process.env.JWT_SECRET.length < 32) {
  console.error("JWT_SECRET must be at least 32 characters. See .env.example for how to generate one.");
  process.exit(1);
}

const port = Number(process.env.PORT) || 5000;
createApp().listen(port, () => console.log(`API running on http://localhost:${port}`));

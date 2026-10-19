import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import meRoutes from "./routes/me.js";
import contestRoutes from "./routes/contests.js";
import problemRoutes from "./routes/problems.js";
import favoriteRoutes from "./routes/favorites.js";
import dailyRoutes from "./routes/daily.js";

export function createApp() {
  const app = express();
  app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
  app.use(express.json());

  app.get("/api/health", (req, res) => res.json({ ok: true }));
  app.use("/api/auth", authRoutes);
  app.use("/api/me", meRoutes);
  app.use("/api/contests", contestRoutes);
  app.use("/api/problems", problemRoutes);
  app.use("/api/favorites", favoriteRoutes);
  app.use("/api/daily", dailyRoutes);

  app.use((req, res) => res.status(404).json({ error: "Not found." }));

  // Express 5 sends errors thrown inside async routes here automatically.
  // Our HttpErrors show their message; anything unexpected is logged and hidden from users.
  app.use((err, req, res, next) => {
    if (err.type === "entity.parse.failed") return res.status(400).json({ error: "Request body is not valid JSON." });
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: "Something went wrong on the server." });
  });

  return app;
}

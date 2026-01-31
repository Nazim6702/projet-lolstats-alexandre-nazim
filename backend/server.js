import "./env.js";
import express from "express";
import cors from "cors";

import debugRoutes from "./routes/debug.routes.js";
import playerRoutes from "./routes/player.routes.js";
import rankingRoutes from "./routes/ranking.routes.js";
import matchesRoutes from "./routes/matches.routes.js";

const { PORT = 3000, RIOT_API_KEY } = process.env;

if (!RIOT_API_KEY) {
  console.error("âŒ RIOT_API_KEY manquante dans .env");
  process.exit(1);
}

const app = express();
app.use(cors({ origin: "http://localhost:4200" }));
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "lolstats-proxy" });
});

app.use("/api/debug", debugRoutes);
app.use("/api/player", playerRoutes);
app.use("/api/ranking", rankingRoutes);
app.use("/api/matches", matchesRoutes);

app.listen(PORT, () => {
  console.log(`âœ… lolstats proxy running on http://localhost:${PORT}`);
});

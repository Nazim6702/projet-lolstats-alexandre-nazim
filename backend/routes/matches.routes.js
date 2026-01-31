import { Router } from "express";
import { getMatchDetail, getRecentMatchIds } from "../services/riot.service.js";

const router = Router();

router.get("/recent-ids/:puuid", async (req, res) => {
  try {
    const { puuid } = req.params;
    const start = req.query.start ?? 0;
    const count = req.query.count ?? 10;
    const ids = await getRecentMatchIds(puuid, start, count);
    res.json(ids);
  } catch (e) {
    res.status(e.response?.status || 500).json({
      message: "Erreur Riot (recent-ids)",
      status: e.response?.status,
      data: e.response?.data,
    });
  }
});

router.get("/:matchId", async (req, res) => {
  try {
    const { matchId } = req.params;
    const data = await getMatchDetail(matchId);
    res.json(data);
  } catch (e) {
    res.status(e.response?.status || 500).json({
      message: "Erreur Riot (match detail)",
      status: e.response?.status,
      data: e.response?.data,
    });
  }
});

export default router;

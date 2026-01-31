import { Router } from "express";
import { getAccountByPuuid, getSummonerByPuuid } from "../services/riot.service.js";

const router = Router();

router.get("/summoner/:puuid", async (req, res) => {
  try {
    const { puuid } = req.params;
    const data = await getSummonerByPuuid(puuid);
    res.json(data);
  } catch (e) {
    res.status(e.response?.status || 500).json({
      message: "Erreur Riot (debug summoner by puuid)",
      status: e.response?.status,
      data: e.response?.data,
    });
  }
});

router.get("/account/:puuid", async (req, res) => {
  try {
    const { puuid } = req.params;
    const data = await getAccountByPuuid(puuid);
    res.json(data);
  } catch (e) {
    res.status(e.response?.status || 500).json({
      message: "Erreur Riot (debug account by puuid)",
      status: e.response?.status,
      data: e.response?.data,
    });
  }
});

export default router;

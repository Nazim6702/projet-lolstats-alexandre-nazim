import { Router } from "express";
import {
  getRankingByTierQueue,
  getAccountByPuuid,
  getSummonerByPuuid,
} from "../services/riot.service.js";
import { cache, CACHE_TTL, getCache, setCache } from "../services/cache.service.js";
import { mapWithConcurrency } from "../utils/async.js";

const router = Router();

async function getAccountByPuuidCached(puuid) {
  const cached = getCache(cache.accountByPuuid, puuid);
  if (cached) return cached;
  const data = await getAccountByPuuid(puuid);
  setCache(cache.accountByPuuid, puuid, data, CACHE_TTL.accountMs);
  return data;
}

async function getProfileByPuuidCached(puuid) {
  const cached = getCache(cache.profileByPuuid, puuid);
  if (cached) return cached;
  const data = await getSummonerByPuuid(puuid);
  setCache(cache.profileByPuuid, puuid, data, CACHE_TTL.profileMs);
  return data;
}

router.get("/:tier", async (req, res) => {
  try {
    const { tier } = req.params;
    const queue = req.query.queue ?? "RANKED_SOLO_5x5";
    const limit = Math.max(1, Math.min(Number(req.query.limit ?? 15), 50));
    const page = Math.max(1, Number(req.query.page ?? 1));
    const refresh = String(req.query.refresh ?? "false") === "true";

    const tierLower = String(tier).toLowerCase();
    const allowed = ["challenger", "grandmaster", "master"];
    if (!allowed.includes(tierLower)) {
      return res.status(400).json({
        message: "tier invalide",
        allowed,
      });
    }

    const cacheKey = `${tierLower}|${queue}|${page}|${limit}`;
    if (!refresh) {
      const cached = getCache(cache.ranking, cacheKey);
      if (cached) return res.json({ ...cached, cached: true });
    }

    const data = await getRankingByTierQueue(tierLower, queue);
    const entries = Array.isArray(data?.entries) ? data.entries : [];
    const totalEntries = entries.length;
    const startIndex = (page - 1) * limit;
    const limitedEntries = entries.slice(startIndex, startIndex + limit);

    const enriched = await mapWithConcurrency(limitedEntries, 4, async (entry) => {
      if (entry?.riotId) return entry;
      if (!entry?.puuid) return entry;

      try {
        const [account, profile] = await Promise.all([
          getAccountByPuuidCached(entry.puuid),
          getProfileByPuuidCached(entry.puuid),
        ]);
        return {
          ...entry,
          riotId:
            account?.gameName && account?.tagLine
              ? `${account.gameName}#${account.tagLine}`
              : entry.riotId,
          profileIconId: profile?.profileIconId,
          summonerLevel: profile?.summonerLevel,
        };
      } catch {
        return entry;
      }
    });

    const response = { ...data, entries: enriched, totalEntries, page, limit, cached: false };
    setCache(cache.ranking, cacheKey, response, CACHE_TTL.rankingMs);
    res.json(response);
  } catch (e) {
    res.status(e.response?.status || 500).json({
      message: "Erreur Riot (ranking)",
      status: e.response?.status,
      data: e.response?.data,
    });
  }
});

export default router;

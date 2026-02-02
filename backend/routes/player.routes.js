import { Router } from "express";
import {
  getAccountByPuuid,
  getAccountByRiotId,
  getLeagueEntriesBySummonerId,
  getLeagueEntriesByPuuid,
  getMatchDetail,
  getRecentMatchIds,
  getSummonerByPuuid,
} from "../services/riot.service.js";
import { cache, CACHE_TTL, getCache, setCache } from "../services/cache.service.js";

const router = Router();

router.get("/by-riot-id/:gameName/:tagLine", async (req, res) => {
  try {
    const { gameName, tagLine } = req.params;
    const data = await getAccountByRiotId(gameName, tagLine);
    res.json(data);
  } catch (e) {
    res.status(e.response?.status || 500).json({
      message: "Erreur Riot (by-riot-id)",
      status: e.response?.status,
      data: e.response?.data,
    });
  }
});

router.get("/profile/:puuid", async (req, res) => {
  try {
    const { puuid } = req.params;
    const refresh = String(req.query.refresh ?? "false") === "true";

    const profileCached = !refresh ? getCache(cache.profileByPuuid, puuid) : null;
    const accountCached = !refresh ? getCache(cache.accountByPuuid, puuid) : null;

    const [summonerResp, accountResp] = await Promise.allSettled([
      profileCached ? Promise.resolve(profileCached) : getSummonerByPuuid(puuid),
      accountCached ? Promise.resolve(accountCached) : getAccountByPuuid(puuid),
    ]);

    const summonerData =
      summonerResp.status === "fulfilled" ? summonerResp.value : {};
    const accountData =
      accountResp.status === "fulfilled" ? accountResp.value : {};

    if (!profileCached && summonerData?.puuid) {
      setCache(cache.profileByPuuid, puuid, summonerData, CACHE_TTL.profileMs);
    }
    if (!accountCached && accountData?.puuid) {
      setCache(cache.accountByPuuid, puuid, accountData, CACHE_TTL.accountMs);
    }

    const riotId =
      accountData?.gameName && accountData?.tagLine
        ? `${accountData.gameName}#${accountData.tagLine}`
        : undefined;

    res.json({
      ...summonerData,
      riotId,
      gameName: accountData?.gameName,
      tagLine: accountData?.tagLine,
    });
  } catch (e) {
    res.status(e.response?.status || 500).json({
      message: "Erreur Riot (profile)",
      status: e.response?.status,
      data: e.response?.data,
    });
  }
});

router.get("/recent-stats/:puuid", async (req, res) => {
  try {
    const { puuid } = req.params;
    const count = Math.min(Number(req.query.count ?? 10), 20);
    const start = Math.max(0, Number(req.query.start ?? 0));
    const refresh = String(req.query.refresh ?? "false") === "true";
    const mode = String(req.query.mode ?? "ranked");
    const cacheKey = `${puuid}|${count}|${start}|${mode}`;

    if (!refresh) {
      const cached = getCache(cache.recentStats, cacheKey);
      if (cached) return res.json({ ...cached, cached: true });
    }

    const matchIds = await getRecentMatchIds(puuid, start, count);
    if (!Array.isArray(matchIds) || matchIds.length === 0) {
      return res.json({
        puuid,
        count: 0,
        winrate: 0,
        wins: 0,
        losses: 0,
        avgKda: null,
        topChampions: [],
        cached: false,
      });
    }

    const matches = await Promise.all(matchIds.map((id) => getMatchDetail(id)));
    const rankedQueues = new Set([420, 440]);
    const rankedMatches = matches.filter((m) => rankedQueues.has(m?.info?.queueId));
    const matchesToUse = mode === "all" ? matches : rankedMatches;

    let wins = 0;
    let losses = 0;
    let totalKills = 0;
    let totalDeaths = 0;
    let totalAssists = 0;

    const champCount = new Map();
    const roleCount = new Map();
    const recentMatches = [];

    for (const m of matchesToUse) {
      const participants = m?.info?.participants;
      if (!Array.isArray(participants)) continue;

      const me = participants.find((p) => p.puuid === puuid);
      if (!me) continue;

      if (me.win) wins++;
      else losses++;

      totalKills += Number(me.kills ?? 0);
      totalDeaths += Number(me.deaths ?? 0);
      totalAssists += Number(me.assists ?? 0);

      const champ = me.championName ?? "Unknown";
      champCount.set(champ, (champCount.get(champ) ?? 0) + 1);

      const teamPosition = me.teamPosition ?? "UNKNOWN";
      const lane = me.lane ?? "UNKNOWN";
      const role = me.role ?? "UNKNOWN";
      roleCount.set(teamPosition, (roleCount.get(teamPosition) ?? 0) + 1);

      const roleLabel =
        teamPosition === "TOP"
          ? "Top"
          : teamPosition === "JUNGLE"
          ? "Jungle"
          : teamPosition === "MIDDLE"
          ? "Mid"
          : teamPosition === "BOTTOM"
          ? "ADC"
          : teamPosition === "UTILITY"
          ? "Support"
          : lane === "TOP"
          ? "Top"
          : lane === "JUNGLE"
          ? "Jungle"
          : lane === "MIDDLE"
          ? "Mid"
          : lane === "BOTTOM" && role?.includes("SUPPORT")
          ? "Support"
          : lane === "BOTTOM"
          ? "ADC"
          : "Unknown";

      recentMatches.push({
        matchId: m?.metadata?.matchId,
        queueId: m?.info?.queueId,
        gameMode: m?.info?.gameMode,
        gameType: m?.info?.gameType,
        gameCreation: m?.info?.gameCreation,
        gameDuration: m?.info?.gameDuration,
        championName: me.championName,
        championId: me.championId,
        teamPosition,
        role,
        lane,
        roleLabel,
        win: me.win,
        kills: me.kills,
        deaths: me.deaths,
        assists: me.assists,
        totalMinionsKilled: me.totalMinionsKilled,
        participants: participants.map((p) => ({
          puuid: p.puuid,
          summonerName: p.summonerName,
          riotId:
            p.riotIdGameName && p.riotIdTagline
              ? `${p.riotIdGameName}#${p.riotIdTagline}`
              : p.summonerName,
          championName: p.championName,
          teamPosition: p.teamPosition,
          lane: p.lane,
          role: p.role,
          win: p.win,
          kills: p.kills,
          deaths: p.deaths,
          assists: p.assists,
          totalMinionsKilled: p.totalMinionsKilled,
          championId: p.championId,
          teamId: p.teamId,
        })),
      });
    }

    const played = wins + losses;
    const winrate = played > 0 ? wins / played : 0;

    const avgKda =
      played > 0
        ? {
          kills: totalKills / played,
          deaths: totalDeaths / played,
          assists: totalAssists / played,
        }
        : null;

    const topChampions = Array.from(champCount.entries())
      .map(([championName, games]) => ({ championName, games }))
      .sort((a, b) => b.games - a.games)
      .slice(0, 5);

    const roleMap = {
      TOP: "Top",
      JUNGLE: "Jungle",
      MIDDLE: "Mid",
      BOTTOM: "ADC",
      UTILITY: "Support",
    };

    const primaryRole = Array.from(roleCount.entries())
      .filter(([roleKey]) => roleMap[roleKey])
      .sort((a, b) => b[1] - a[1])[0]?.[0];

    const response = {
      puuid,
      count: played,
      winrate,
      wins,
      losses,
      avgKda,
      topChampions,
      primaryRole: primaryRole ? roleMap[primaryRole] : "Unknown",
      recentMatches,
      queuesUsed: rankedMatches.length > 0 ? ["RANKED_SOLO_5x5", "RANKED_FLEX_SR"] : [],
      mode,
      cached: false,
    };

    setCache(cache.recentStats, cacheKey, response, CACHE_TTL.recentStatsMs);
    return res.json(response);
  } catch (e) {
    res.status(e.response?.status || 500).json({
      message: "Erreur Riot (recent-stats)",
      status: e.response?.status,
      data: e.response?.data,
    });
  }
});

router.get("/rank/:puuid", async (req, res) => {
  try {
    const { puuid } = req.params;
    const refresh = String(req.query.refresh ?? "false") === "true";
    const debug = String(req.query.debug ?? "false") === "true";

    if (!refresh) {
      const cached = getCache(cache.rankByPuuid, puuid);
      if (cached) return res.json({ ...cached, cached: true });
    }

    const summoner = await getSummonerByPuuid(puuid);
    let entries = [];
    let method = "by-puuid";

    try {
      entries = await getLeagueEntriesByPuuid(puuid);
    } catch (err) {
      method = "by-summoner";
      if (summoner?.id) {
        entries = await getLeagueEntriesBySummonerId(summoner.id);
      }
    }

    const response = {
      entries: Array.isArray(entries) ? entries : [],
      cached: false,
      ...(debug
        ? {
            debug: {
              platformBase: process.env.RIOT_PLATFORM_BASE,
              summonerId: summoner?.id,
              summonerName: summoner?.name,
              method,
              entriesCount: Array.isArray(entries) ? entries.length : 0,
            },
          }
        : {}),
    };

    setCache(cache.rankByPuuid, puuid, response, CACHE_TTL.rankMs);
    res.json(response);
  } catch (e) {
    res.status(e.response?.status || 500).json({
      message: "Erreur Riot (rank)",
      status: e.response?.status,
      data: e.response?.data,
    });
  }
});

export default router;

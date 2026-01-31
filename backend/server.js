import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const app = express();
app.use(cors({ origin: "http://localhost:4200" })); // ou origin: true pour tout autoriser en dev
app.use(express.json());

const {
  PORT = 3000,
  RIOT_API_KEY,
  RIOT_REGIONAL_BASE,
  RIOT_PLATFORM_BASE,
} = process.env;

if (!RIOT_API_KEY) {
  console.error("❌ RIOT_API_KEY manquante dans .env");
  process.exit(1);
}

const riot = axios.create({
  headers: { "X-Riot-Token": RIOT_API_KEY },
  timeout: 15000,
});

// Helpers
function safeEncode(v) {
  return encodeURIComponent(String(v));
}

const cache = {
  ranking: new Map(),
  recentStats: new Map(),
  accountByPuuid: new Map(),
  profileByPuuid: new Map(),
  rankByPuuid: new Map(),
  summonerIdByPuuid: new Map(),
};

const CACHE_TTL = {
  rankingMs: 2 * 60 * 1000,
  recentStatsMs: 3 * 60 * 1000,
  accountMs: 10 * 60 * 1000,
  profileMs: 5 * 60 * 1000,
  rankMs: 10 * 60 * 1000,
};

function getCache(map, key) {
  const hit = map.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value;
  if (hit) map.delete(key);
  return null;
}

function setCache(map, key, value, ttlMs) {
  map.set(key, { value, expiresAt: Date.now() + ttlMs });
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let index = 0;
  const workers = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
    while (index < items.length) {
      const current = index++;
      results[current] = await mapper(items[current], current);
    }
  });
  await Promise.all(workers);
  return results;
}

async function fetchSummonerByPuuid(puuid) {
  const url = `${RIOT_PLATFORM_BASE}/lol/summoner/v4/summoners/by-puuid/${safeEncode(
    puuid
  )}`;
  const r = await riot.get(url);
  return r.data;
}

async function fetchAccountByPuuid(puuid) {
  const url = `${RIOT_REGIONAL_BASE}/riot/account/v1/accounts/by-puuid/${safeEncode(
    puuid
  )}`;
  const r = await riot.get(url);
  return r.data;
}

async function fetchAccountByPuuidCached(puuid) {
  const cached = getCache(cache.accountByPuuid, puuid);
  if (cached) return cached;
  const data = await fetchAccountByPuuid(puuid);
  setCache(cache.accountByPuuid, puuid, data, CACHE_TTL.accountMs);
  return data;
}

async function fetchProfileByPuuidCached(puuid) {
  const cached = getCache(cache.profileByPuuid, puuid);
  if (cached) return cached;
  const data = await fetchSummonerByPuuid(puuid);
  setCache(cache.profileByPuuid, puuid, data, CACHE_TTL.profileMs);
  if (data?.id) {
    setCache(cache.summonerIdByPuuid, puuid, data.id, CACHE_TTL.profileMs);
  }
  return data;
}

async function fetchLeagueEntriesBySummonerId(summonerId) {
  const url = `${RIOT_PLATFORM_BASE}/lol/league/v4/entries/by-summoner/${safeEncode(
    summonerId
  )}`;
  const r = await riot.get(url);
  return r.data;
}

async function fetchRankByPuuidCached(puuid, refresh) {
  const cached = getCache(cache.rankByPuuid, puuid);
  if (cached && !refresh) return { ...cached, cached: true };

  const profile = refresh
    ? await fetchSummonerByPuuid(puuid)
    : await fetchProfileByPuuidCached(puuid);
  if (refresh && profile) {
    setCache(cache.profileByPuuid, puuid, profile, CACHE_TTL.profileMs);
  }

  const summonerId =
    profile?.id ?? getCache(cache.summonerIdByPuuid, puuid);
  if (!summonerId) {
    return { entries: [], error: "summoner_id_missing", cached: false };
  }

  const entries = await fetchLeagueEntriesBySummonerId(summonerId);
  const response = { entries, cached: false };
  setCache(cache.rankByPuuid, puuid, response, CACHE_TTL.rankMs);
  return response;
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "lolstats-proxy" });
});

// Debug: fetch summoner profile by puuid
app.get("/api/debug/summoner/:puuid", async (req, res) => {
  try {
    const { puuid } = req.params;
    const data = await fetchSummonerByPuuid(puuid);
    res.json(data);
  } catch (e) {
    res.status(e.response?.status || 500).json({
      message: "Erreur Riot (debug summoner by puuid)",
      status: e.response?.status,
      data: e.response?.data,
    });
  }
});

// Debug: fetch account by puuid (Riot ID)
app.get("/api/debug/account/:puuid", async (req, res) => {
  try {
    const { puuid } = req.params;
    const data = await fetchAccountByPuuid(puuid);
    res.json(data);
  } catch (e) {
    res.status(e.response?.status || 500).json({
      message: "Erreur Riot (debug account by puuid)",
      status: e.response?.status,
      data: e.response?.data,
    });
  }
});

/**
 * 1) Rechercher joueur (Riot ID -> puuid)
 * GET /api/player/by-riot-id/:gameName/:tagLine
 */
app.get("/api/player/by-riot-id/:gameName/:tagLine", async (req, res) => {
  try {
    const { gameName, tagLine } = req.params;
    const url = `${RIOT_REGIONAL_BASE}/riot/account/v1/accounts/by-riot-id/${safeEncode(
      gameName
    )}/${safeEncode(tagLine)}`;

    const r = await riot.get(url);
    res.json(r.data);
  } catch (e) {
    res.status(e.response?.status || 500).json({
      message: "Erreur Riot (by-riot-id)",
      status: e.response?.status,
      data: e.response?.data,
    });
  }
});

/**
 * 2) Profil summoner (puuid -> profil)
 * GET /api/player/profile/:puuid
 */
app.get("/api/player/profile/:puuid", async (req, res) => {
  try {
    const { puuid } = req.params;
    const refresh = String(req.query.refresh ?? "false") === "true";
    const url = `${RIOT_PLATFORM_BASE}/lol/summoner/v4/summoners/by-puuid/${safeEncode(
      puuid
    )}`;

    const [summonerResp, accountResp] = await Promise.allSettled([
      refresh ? riot.get(url) : fetchProfileByPuuidCached(puuid),
      refresh ? fetchAccountByPuuid(puuid) : fetchAccountByPuuidCached(puuid),
    ]);

    const summonerData =
      summonerResp.status === "fulfilled"
        ? summonerResp.value.data ?? summonerResp.value
        : {};
    const accountData =
      accountResp.status === "fulfilled" ? accountResp.value : {};

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

/**
 * Rank actuel (solo/flex)
 * GET /api/player/rank/:puuid
 */
app.get("/api/player/rank/:puuid", async (req, res) => {
  try {
    const { puuid } = req.params;
    const refresh = String(req.query.refresh ?? "false") === "true";
    const result = await fetchRankByPuuidCached(puuid, refresh);
    res.json(result);
  } catch (e) {
    console.error("Rank error:", {
      message: e?.message,
      status: e?.response?.status,
      data: e?.response?.data,
    });
    res.status(e.response?.status || 500).json({
      message: "Erreur Riot (rank)",
      status: e.response?.status,
      data: e.response?.data,
    });
  }
});

/**
 * 3) Matches récents (IDs)
 * GET /api/matches/recent-ids/:puuid?start=0&count=20
 */
app.get("/api/matches/recent-ids/:puuid", async (req, res) => {
  try {
    const { puuid } = req.params;
    const start = req.query.start ?? 0;
    const count = req.query.count ?? 10;

    const url = `${RIOT_REGIONAL_BASE}/lol/match/v5/matches/by-puuid/${safeEncode(
      puuid
    )}/ids?start=${safeEncode(start)}&count=${safeEncode(count)}`;

    const r = await riot.get(url);
    res.json(r.data);
  } catch (e) {
    res.status(e.response?.status || 500).json({
      message: "Erreur Riot (recent-ids)",
      status: e.response?.status,
      data: e.response?.data,
    });
  }
});

/**
 * 4) Détail d'un match
 * GET /api/matches/:matchId
 */
app.get("/api/matches/:matchId", async (req, res) => {
  try {
    const { matchId } = req.params;
    const url = `${RIOT_REGIONAL_BASE}/lol/match/v5/matches/${safeEncode(
      matchId
    )}`;

    const r = await riot.get(url);
    res.json(r.data);
  } catch (e) {
    res.status(e.response?.status || 500).json({
      message: "Erreur Riot (match detail)",
      status: e.response?.status,
      data: e.response?.data,
    });
  }
});

/**
 * 5) Ladder (challenger/master/grandmaster)
 * GET /api/ranking/:tier?queue=RANKED_SOLO_5x5
 * tier: challenger | grandmaster | master
 */
app.get("/api/ranking/:tier", async (req, res) => {
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

    const url = `${RIOT_PLATFORM_BASE}/lol/league/v4/${tierLower}leagues/by-queue/${safeEncode(
      queue
    )}`;

    const r = await riot.get(url);
    const data = r.data ?? {};
    const entries = Array.isArray(data.entries) ? data.entries : [];
    const totalEntries = entries.length;
    const startIndex = (page - 1) * limit;
    const limitedEntries = entries.slice(startIndex, startIndex + limit);

    const enriched = await mapWithConcurrency(limitedEntries, 4, async (entry) => {
      if (entry?.riotId) return entry;
      if (!entry?.puuid) return entry;

      try {
        const [account, profile] = await Promise.all([
          fetchAccountByPuuidCached(entry.puuid),
          fetchProfileByPuuidCached(entry.puuid),
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

app.listen(PORT, () => {
  console.log(`✅ lolstats proxy running on http://localhost:${PORT}`);
});

/**
 * Stats recentes calculees
 * GET /api/player/recent-stats/:puuid?count=10
 */
app.get("/api/player/recent-stats/:puuid", async (req, res) => {
  try {
    const { puuid } = req.params;
    const count = Math.min(Number(req.query.count ?? 10), 20);
    const start = 0;
    const refresh = String(req.query.refresh ?? "false") === "true";
    const mode = String(req.query.mode ?? "ranked");
    const cacheKey = `${puuid}|${count}`;

    if (!refresh) {
      const cached = getCache(cache.recentStats, cacheKey);
      if (cached) return res.json({ ...cached, cached: true });
    }

    // 1) Recuperer les IDs
    const idsUrl = `${RIOT_REGIONAL_BASE}/lol/match/v5/matches/by-puuid/${safeEncode(
      puuid
    )}/ids?start=${start}&count=${count}`;

    const idsResp = await riot.get(idsUrl);
    const matchIds = idsResp.data;

    if (!Array.isArray(matchIds) || matchIds.length === 0) {
      return res.json({
        puuid,
        count: 0,
        winrate: 0,
        wins: 0,
        losses: 0,
        avgKda: null,
        topChampions: [],
      });
    }

    // 2) Details des matchs
    const matchDetailPromises = matchIds.map((matchId) => {
      const matchUrl = `${RIOT_REGIONAL_BASE}/lol/match/v5/matches/${safeEncode(matchId)}`;
      return riot.get(matchUrl).then((r) => r.data);
    });

    const matches = await Promise.all(matchDetailPromises);
    const rankedQueues = new Set([420, 440]); // SoloQ / Flex SR
    const rankedMatches = matches.filter((m) => rankedQueues.has(m?.info?.queueId));
    const matchesToUse =
      mode === "all" ? matches : rankedMatches.length > 0 ? rankedMatches : [];

    // 3) Calculs
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

      if (me.summonerId) {
        setCache(cache.summonerIdByPuuid, puuid, me.summonerId, CACHE_TTL.profileMs);
      }

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
      .filter(([role]) => roleMap[role])
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



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
    const url = `${RIOT_PLATFORM_BASE}/lol/summoner/v4/summoners/by-puuid/${safeEncode(
      puuid
    )}`;

    const [summonerResp, accountResp] = await Promise.allSettled([
      riot.get(url),
      fetchAccountByPuuid(puuid),
    ]);

    const summonerData =
      summonerResp.status === "fulfilled" ? summonerResp.value.data : {};
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

    const tierLower = String(tier).toLowerCase();
    const allowed = ["challenger", "grandmaster", "master"];
    if (!allowed.includes(tierLower)) {
      return res.status(400).json({
        message: "tier invalide",
        allowed,
      });
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
        const account = await fetchAccountByPuuid(entry.puuid);
        return {
          ...entry,
          riotId:
            account?.gameName && account?.tagLine
              ? `${account.gameName}#${account.tagLine}`
              : entry.riotId,
        };
      } catch {
        return entry;
      }
    });

    res.json({ ...data, entries: enriched, totalEntries, page, limit });
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
 * Stats récentes calculées
 * GET /api/player/recent-stats/:puuid?count=10
 */
app.get("/api/player/recent-stats/:puuid", async (req, res) => {
  try {
    const { puuid } = req.params;
    const count = Math.min(Number(req.query.count ?? 10), 20); // sécurité
    const start = 0;

    // 1) Récupérer les IDs
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

    // 2) Récupérer les détails des matchs (en parallèle, mais safe)
    const matchDetailPromises = matchIds.map((matchId) => {
      const matchUrl = `${RIOT_REGIONAL_BASE}/lol/match/v5/matches/${safeEncode(matchId)}`;
      return riot.get(matchUrl).then((r) => r.data);
    });

    const matches = await Promise.all(matchDetailPromises);

    // 3) Calculs
    let wins = 0;
    let losses = 0;

    let totalKills = 0;
    let totalDeaths = 0;
    let totalAssists = 0;

    const champCount = new Map(); // championName -> nb

    for (const m of matches) {
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

    return res.json({
      puuid,
      count: played,
      winrate,
      wins,
      losses,
      avgKda,
      topChampions,
    });
  } catch (e) {
    res.status(e.response?.status || 500).json({
      message: "Erreur Riot (recent-stats)",
      status: e.response?.status,
      data: e.response?.data,
    });
  }
});



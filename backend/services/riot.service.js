import axios from "axios";

const { RIOT_API_KEY, RIOT_REGIONAL_BASE, RIOT_PLATFORM_BASE } = process.env;

export function safeEncode(v) {
  return encodeURIComponent(String(v));
}

export const riot = axios.create({
  headers: { "X-Riot-Token": RIOT_API_KEY },
  timeout: 15000,
});

export async function getAccountByRiotId(gameName, tagLine) {
  const url = `${RIOT_REGIONAL_BASE}/riot/account/v1/accounts/by-riot-id/${safeEncode(
    gameName
  )}/${safeEncode(tagLine)}`;
  const r = await riot.get(url);
  return r.data;
}

export async function getAccountByPuuid(puuid) {
  const url = `${RIOT_REGIONAL_BASE}/riot/account/v1/accounts/by-puuid/${safeEncode(
    puuid
  )}`;
  const r = await riot.get(url);
  return r.data;
}

export async function getSummonerByPuuid(puuid) {
  const url = `${RIOT_PLATFORM_BASE}/lol/summoner/v4/summoners/by-puuid/${safeEncode(
    puuid
  )}`;
  const r = await riot.get(url);
  return r.data;
}

export async function getRecentMatchIds(puuid, start, count) {
  const url = `${RIOT_REGIONAL_BASE}/lol/match/v5/matches/by-puuid/${safeEncode(
    puuid
  )}/ids?start=${safeEncode(start)}&count=${safeEncode(count)}`;
  const r = await riot.get(url);
  return r.data;
}

export async function getMatchDetail(matchId) {
  const url = `${RIOT_REGIONAL_BASE}/lol/match/v5/matches/${safeEncode(matchId)}`;
  const r = await riot.get(url);
  return r.data;
}

export async function getRankingByTierQueue(tierLower, queue) {
  const url = `${RIOT_PLATFORM_BASE}/lol/league/v4/${tierLower}leagues/by-queue/${safeEncode(
    queue
  )}`;
  const r = await riot.get(url);
  return r.data;
}

export async function getLeagueEntriesBySummonerId(summonerId) {
  const url = `${RIOT_PLATFORM_BASE}/lol/league/v4/entries/by-summoner/${safeEncode(
    summonerId
  )}`;
  const r = await riot.get(url);
  return r.data;
}

export async function getLeagueEntriesByPuuid(puuid) {
  const url = `${RIOT_PLATFORM_BASE}/lol/league/v4/entries/by-puuid/${safeEncode(
    puuid
  )}`;
  const r = await riot.get(url);
  return r.data;
}

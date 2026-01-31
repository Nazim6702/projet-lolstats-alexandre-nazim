export const cache = {
  ranking: new Map(),
  recentStats: new Map(),
  accountByPuuid: new Map(),
  profileByPuuid: new Map(),
};

export const CACHE_TTL = {
  rankingMs: 2 * 60 * 1000,
  recentStatsMs: 3 * 60 * 1000,
  accountMs: 10 * 60 * 1000,
  profileMs: 5 * 60 * 1000,
};

export function getCache(map, key) {
  const hit = map.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value;
  if (hit) map.delete(key);
  return null;
}

export function setCache(map, key, value, ttlMs) {
  map.set(key, { value, expiresAt: Date.now() + ttlMs });
}

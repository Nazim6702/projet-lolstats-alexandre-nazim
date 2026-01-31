export interface RiotAccountDTO {
  puuid: string;
  gameName: string;
  tagLine: string;
}

export interface SummonerProfileDTO {
  id: string;
  accountId: string;
  puuid: string;
  name: string;
  summonerLevel: number;
  riotId?: string;
  gameName?: string;
  tagLine?: string;
}

export interface RecentMatchParticipantDTO {
  puuid?: string;
  summonerName?: string;
  riotId?: string;
  championName?: string;
  championId?: number;
  teamId?: number;
  teamPosition?: string;
  lane?: string;
  role?: string;
  win?: boolean;
  kills?: number;
  deaths?: number;
  assists?: number;
  totalMinionsKilled?: number;
}

export interface RecentMatchDTO {
  matchId?: string;
  queueId?: number;
  gameMode?: string;
  gameType?: string;
  gameCreation?: number;
  gameDuration?: number;
  championName?: string;
  championId?: number;
  teamPosition?: string;
  role?: string;
  lane?: string;
  roleLabel?: string;
  win?: boolean;
  kills?: number;
  deaths?: number;
  assists?: number;
  totalMinionsKilled?: number;
  participants?: RecentMatchParticipantDTO[];
}

export interface RecentStatsDTO {
  puuid: string;
  count: number;
  winrate: number;
  wins: number;
  losses: number;
  avgKda: { kills: number; deaths: number; assists: number } | null;
  topChampions: { championName: string; games: number }[];
  primaryRole?: string;
  recentMatches?: RecentMatchDTO[];
  queuesUsed?: string[];
  mode?: 'ranked' | 'all';
  cached?: boolean;
}

export interface RankingEntryDTO {
  puuid: string;
  summonerName?: string;
  riotId?: string;
  profileIconId?: number;
  summonerLevel?: number;
  leaguePoints: number;
  wins: number;
  losses: number;
  rank?: string;
}

export interface RankingDTO {
  leagueId: string;
  tier: string;
  name: string;
  queue: string;
  totalEntries?: number;
  page?: number;
  limit?: number;
  entries: RankingEntryDTO[];
  cached?: boolean;
}

export type RankingTier = 'challenger' | 'grandmaster' | 'master';

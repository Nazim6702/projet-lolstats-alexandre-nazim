import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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

export interface RecentStatsDTO {
  puuid: string;
  count: number;
  winrate: number;
  wins: number;
  losses: number;
  avgKda: { kills: number; deaths: number; assists: number } | null;
  topChampions: { championName: string; games: number }[];
  primaryRole?: string;
  recentMatches?: Array<{
    matchId?: string;
    queueId?: number;
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
    participants?: Array<{
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
    }>;
  }>;
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

export interface LeagueEntryDTO {
  leagueId: string;
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
}

export interface RankResponseDTO {
  entries: LeagueEntryDTO[];
  cached?: boolean;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class RiotApiService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = 'http://localhost:3000/api';

  getAccountByRiotId(gameName: string, tagLine: string): Observable<RiotAccountDTO> {
    const url = `${this.baseUrl}/player/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
    return this.http.get<RiotAccountDTO>(url);
  }

  getRecentStats(
    puuid: string,
    count: number = 20,
    refresh: boolean = false,
    mode: 'ranked' | 'all' = 'ranked'
  ): Observable<RecentStatsDTO> {
    const url = `${this.baseUrl}/player/recent-stats/${encodeURIComponent(
      puuid
    )}?count=${count}&refresh=${refresh}&mode=${mode}`;
    return this.http.get<RecentStatsDTO>(url);
  }

  getProfile(puuid: string, refresh: boolean = false): Observable<SummonerProfileDTO> {
    const url = `${this.baseUrl}/player/profile/${encodeURIComponent(
      puuid
    )}?refresh=${refresh}`;
    return this.http.get<SummonerProfileDTO>(url);
  }

  getRanking(
    tier: RankingTier,
    queue: string = 'RANKED_SOLO_5x5',
    page: number = 1,
    limit: number = 15,
    refresh: boolean = false
  ): Observable<RankingDTO> {
    const url = `${this.baseUrl}/ranking/${encodeURIComponent(tier)}?queue=${encodeURIComponent(
      queue
    )}&page=${page}&limit=${limit}&refresh=${refresh}`;
    return this.http.get<RankingDTO>(url);
  }

  getRank(puuid: string, refresh: boolean = false): Observable<RankResponseDTO> {
    const url = `${this.baseUrl}/player/rank/${encodeURIComponent(puuid)}?refresh=${refresh}`;
    return this.http.get<RankResponseDTO>(url);
  }
}

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
}

export interface RankingEntryDTO {
  puuid: string;
  summonerName?: string;
  riotId?: string;
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
}

export type RankingTier = 'challenger' | 'grandmaster' | 'master';

@Injectable({ providedIn: 'root' })
export class RiotApiService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = 'http://localhost:3000/api';

  getAccountByRiotId(gameName: string, tagLine: string): Observable<RiotAccountDTO> {
    const url = `${this.baseUrl}/player/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
    return this.http.get<RiotAccountDTO>(url);
  }

  getRecentStats(puuid: string, count: number = 20): Observable<RecentStatsDTO> {
    const url = `${this.baseUrl}/player/recent-stats/${encodeURIComponent(puuid)}?count=${count}`;
    return this.http.get<RecentStatsDTO>(url);
  }

  getProfile(puuid: string): Observable<SummonerProfileDTO> {
    const url = `${this.baseUrl}/player/profile/${encodeURIComponent(puuid)}`;
    return this.http.get<SummonerProfileDTO>(url);
  }

  getRanking(
    tier: RankingTier,
    queue: string = 'RANKED_SOLO_5x5',
    page: number = 1,
    limit: number = 15
  ): Observable<RankingDTO> {
    const url = `${this.baseUrl}/ranking/${encodeURIComponent(tier)}?queue=${encodeURIComponent(
      queue
    )}&page=${page}&limit=${limit}`;
    return this.http.get<RankingDTO>(url);
  }
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface RiotAccountDTO {
  puuid: string;
  gameName: string;
  tagLine: string;
}

// ✅ PHASE 5 : DTO pour /api/player/recent-stats/:puuid?count=20
export interface RecentStatsDTO {
  puuid: string;
  count: number;
  winrate: number; // ex: 0.55
  wins: number;
  losses: number;
  avgKda: { kills: number; deaths: number; assists: number } | null;
  topChampions: { championName: string; games: number }[];
}

@Injectable({
  providedIn: 'root',
})
export class RiotApiService {
  private readonly baseUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  getAccountByRiotId(gameName: string, tagLine: string): Observable<RiotAccountDTO> {
    const url = `${this.baseUrl}/player/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
    return this.http.get<RiotAccountDTO>(url);
  }

  // ✅ PHASE 5 : récupérer les stats calculées
  getRecentStats(puuid: string, count: number = 20): Observable<RecentStatsDTO> {
    const url = `${this.baseUrl}/player/recent-stats/${encodeURIComponent(puuid)}?count=${count}`;
    return this.http.get<RecentStatsDTO>(url);
  }

  getRanking(tier: RankingTier, queue: string = 'RANKED_SOLO_5x5'): Observable<RankingDTO> {
    const url = `${this.baseUrl}/ranking/${encodeURIComponent(tier)}?queue=${encodeURIComponent(queue)}`;
    return this.http.get<RankingDTO>(url);
  }

}

export interface RankingEntryDTO {
  summonerName: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  rank?: string; // souvent présent (I, II...) selon endpoint
}

export interface RankingDTO {
  leagueId: string;
  tier: string;
  name: string;
  queue: string;
  entries: RankingEntryDTO[];
}

export type RankingTier = 'challenger' | 'grandmaster' | 'master';

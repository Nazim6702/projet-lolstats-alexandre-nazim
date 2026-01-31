import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  RiotAccountDTO,
  SummonerProfileDTO,
  RecentStatsDTO,
  RankingDTO,
  RankingTier,
} from '../models/riot';

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

}

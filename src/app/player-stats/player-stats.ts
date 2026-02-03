import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { finalize, map, switchMap, catchError } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { RiotApiService } from '../services/riot-api';
import { PlayerRankEntryDTO, RecentStatsDTO } from '../models/riot';
import {
  formatMatchDate,
  getQueueLabel,
  getRoleLabel,
  getWinrateGradient,
  getWinratePercent,
  normalizeRole,
} from '../mappers/player-stats.mapper';
import { ChampionsService } from '../services/champions';
import { ERROR_BACKEND_OFF, ERROR_RATE_LIMIT, ERROR_PLAYER_NOT_FOUND } from '../utils/errors';

type RecentMatch = NonNullable<RecentStatsDTO['recentMatches']>[number];
type MatchParticipant = NonNullable<RecentMatch['participants']>[number];

@Component({
  selector: 'app-player-stats',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './player-stats.html',
  styleUrl: './player-stats.scss',
})
export class PlayerStatsComponent implements OnInit {
  protected puuid = '';
  protected playerName = '';
  protected riotId = '';
  protected summonerLevel: number | null = null;
  protected profileIconId: number | null = null;
  protected version = '';
  protected loading = false;
  protected error = '';
  protected stats: RecentStatsDTO | null = null;
  protected rankEntries: PlayerRankEntryDTO[] = [];
  protected rankCached = false;
  protected cached = false;
  protected mode: 'ranked' | 'all' = 'all';
  protected readonly pageSize = 10;
  protected page = 0;
  protected loadingMore = false;
  protected matchList: RecentMatch[] = [];
  protected canLoadMore = false;

  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(RiotApiService);
  private readonly championsService = inject(ChampionsService);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    // React to URL changes
    this.route.paramMap
      .pipe(
        map((p) => p.get('puuid') ?? ''),
        switchMap((puuid) => {
          this.puuid = puuid;

          if (!puuid) {
            this.error = "Puuid manquant dans l'URL.";
            this.stats = null;
            return of(null);
          }

          return this.fetchStats$(puuid, false);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  protected fetchStats(refresh: boolean = false): void {
    if (!this.puuid) return;
    this.fetchStats$(this.puuid, refresh)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  protected toggleMode(): void {
    this.mode = this.mode === 'ranked' ? 'all' : 'ranked';
    this.fetchStats(true);
  }

  protected get winratePercent(): number {
    if (!this.stats) return 0;
    return getWinratePercent(this.stats.winrate);
  }

  protected get winrateGradient(): string {
    return getWinrateGradient(this.winratePercent);
  }


  protected getTeamParticipants(match: RecentMatch | undefined, teamId: number): MatchParticipant[] {
    return match?.participants?.filter((p: MatchParticipant) => p.teamId === teamId) ?? [];
  }

  protected getQueueLabel(match: RecentMatch | undefined): string {
    return getQueueLabel(match?.queueId, match?.gameMode, match?.gameType);
  }

  protected getRoleLabel(match: RecentMatch | undefined): string {
    return getRoleLabel(match?.roleLabel, match?.teamPosition, match?.lane, match?.role);
  }

  protected getParticipantRole(p: MatchParticipant | undefined): string {
    return normalizeRole(p?.teamPosition, p?.lane, p?.role);
  }

  protected formatMatchDate(match: RecentMatch | undefined): string {
    return formatMatchDate(match?.gameCreation);
  }

  protected getLaneIcon(roleLabel: string | undefined | null): string | null {
    if (!roleLabel) return null;
    const role = roleLabel.toLowerCase();
    if (role.includes('top')) return '/assets/lane/top.png';
    if (role.includes('jungle')) return '/assets/lane/jungler.png';
    if (role.includes('mid')) return '/assets/lane/mid.png';
    if (role.includes('adc')) return '/assets/lane/adc.png';
    if (role.includes('support')) return '/assets/lane/support.png';
    return null;
  }

  private fetchStats$(puuid: string, refresh: boolean) {
    this.error = '';
    this.stats = null;
    this.playerName = '';
    this.riotId = '';
    this.summonerLevel = null;
    this.profileIconId = null;
    this.rankEntries = [];
    this.rankCached = false;
    this.cached = false;
    this.page = 0;
    this.matchList = [];
    this.canLoadMore = false;
    this.loading = true;

    return this.api.getRecentStats(puuid, this.pageSize, refresh, this.mode, 0).pipe(
      switchMap((stats) =>
        forkJoin({
          stats: of(stats),
          profile: this.api.getProfile(puuid, refresh).pipe(catchError(() => of(null))),
          rank: this.api.getPlayerRank(puuid, refresh).pipe(catchError(() => of(null))),
          version: this.championsService.getVersion().pipe(catchError(() => of(''))),
        })
      ),
      map(({ stats, profile, rank, version }) => {
        this.stats = stats;
        this.playerName = profile?.name ?? '';
        this.riotId = profile?.riotId ?? '';
        this.summonerLevel = profile?.summonerLevel ?? null;
        this.profileIconId = profile?.profileIconId ?? null;
        this.rankEntries = rank?.entries ?? [];
        this.rankCached = Boolean(rank?.cached);
        this.version = version ?? '';
        this.cached = Boolean(stats?.cached);
        this.matchList = stats?.recentMatches ?? [];
        this.canLoadMore = (stats?.recentMatches?.length ?? 0) >= this.pageSize;
        return stats;
      }),
      catchError((err) => {
        const status = err?.status;
        if (status === 429) {
          this.error = ERROR_RATE_LIMIT;
        } else if (status === 404) {
          this.error = ERROR_PLAYER_NOT_FOUND;
        } else {
          this.error = ERROR_BACKEND_OFF;
        }
        this.stats = null;
        this.matchList = [];
        this.canLoadMore = false;
        return of(null);
      }),
      finalize(() => {
        this.loading = false;
      }),
    );
  }

  protected loadMore(): void {
    if (this.loadingMore || !this.puuid || !this.canLoadMore) return;
    this.loadingMore = true;
    const nextPage = this.page + 1;
    const start = nextPage * this.pageSize;

    this.api
      .getRecentStats(this.puuid, this.pageSize, false, this.mode, start)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.loadingMore = false;
        }),
      )
      .subscribe({
        next: (res) => {
          const nextMatches = res?.recentMatches ?? [];
          const existing = new Set(this.matchList.map((m) => m.matchId));
          for (const m of nextMatches) {
            if (!existing.has(m.matchId)) this.matchList.push(m);
          }
          this.page = nextPage;
          this.canLoadMore = nextMatches.length >= this.pageSize;
        },
        error: () => {
          this.canLoadMore = false;
        },
      });
  }
}

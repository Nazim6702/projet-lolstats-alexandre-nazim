import { Component, DestroyRef, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { finalize, map, switchMap, catchError } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { RiotApiService } from '../services/riot-api';
import { RecentStatsDTO } from '../models/riot';
import { ChampionsService } from '../services/champions';

type RecentMatch = NonNullable<RecentStatsDTO['recentMatches']>[number];
type MatchParticipant = NonNullable<RecentMatch['participants']>[number];

@Component({
  selector: 'app-player-stats',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './player-stats.html',
  styleUrl: './player-stats.scss',
})
export class PlayerStatsComponent {
  protected puuid = '';
  protected playerName = '';
  protected riotId = '';
  protected version = '';
  protected loading = false;
  protected error = '';
  protected stats: RecentStatsDTO | null = null;
  protected cached = false;
  protected mode: 'ranked' | 'all' = 'ranked';

  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(RiotApiService);
  private readonly championsService = inject(ChampionsService);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    // Réagit aux changements d’URL
    this.route.paramMap
      .pipe(
        map((p) => p.get('puuid') ?? ''),
        switchMap((puuid) => {
          this.puuid = puuid;

          if (!puuid) {
            this.error = 'Puuid manquant dans l’URL.';
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
    return Math.round(this.stats.winrate * 100);
  }

  protected get winrateGradient(): string {
    const win = this.winratePercent;
    return `conic-gradient(var(--accent-0) 0deg ${win * 3.6}deg, rgba(255,255,255,0.08) ${win * 3.6}deg 360deg)`;
  }


  protected getTeamParticipants(match: RecentMatch | undefined, teamId: number): MatchParticipant[] {
    return match?.participants?.filter((p: MatchParticipant) => p.teamId === teamId) ?? [];
  }

  protected getQueueLabel(match: RecentMatch | undefined): string {
    const queueId = match?.queueId;
    if (queueId === 420) return 'SoloQ';
    if (queueId === 440) return 'Flex';
    if (queueId === 450) return 'ARAM';
    if (match?.gameMode) return match.gameMode;
    if (match?.gameType) return match.gameType;
    return 'Unknown';
  }

  protected getRoleLabel(match: RecentMatch | undefined): string {
    if (!match) return 'Unknown';
    const roleLabel = match.roleLabel;
    if (roleLabel && roleLabel !== 'Unknown') return roleLabel;
    return this.normalizeRole(match.teamPosition, match.lane, match.role);
  }

  protected getParticipantRole(p: MatchParticipant | undefined): string {
    if (!p) return 'Unknown';
    return this.normalizeRole(p.teamPosition, p.lane, p.role);
  }

  protected formatMatchDate(match: RecentMatch | undefined): string {
    const ts = match?.gameCreation;
    if (!ts) return '';
    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(ts));
  }

  private normalizeRole(teamPosition?: string, lane?: string, role?: string): string {
    if (teamPosition === 'TOP' || lane === 'TOP') return 'Top';
    if (teamPosition === 'JUNGLE' || lane === 'JUNGLE') return 'Jungle';
    if (teamPosition === 'MIDDLE' || lane === 'MIDDLE') return 'Mid';
    if (teamPosition === 'BOTTOM') return role?.includes('SUPPORT') ? 'Support' : 'ADC';
    if (teamPosition === 'UTILITY') return 'Support';
    if (lane === 'BOTTOM') return role?.includes('SUPPORT') ? 'Support' : 'ADC';
    return 'Unknown';
  }

  private fetchStats$(puuid: string, refresh: boolean) {
    this.error = '';
    this.stats = null;
    this.playerName = '';
    this.riotId = '';
    this.cached = false;
    this.loading = true;

    return this.api.getRecentStats(puuid, 10, refresh, this.mode).pipe(
      switchMap((stats) =>
        forkJoin({
          stats: of(stats),
          profile: this.api.getProfile(puuid, refresh).pipe(catchError(() => of(null))),
          version: this.championsService.getVersion().pipe(catchError(() => of(''))),
        })
      ),
      map(({ stats, profile, version }) => {
        this.stats = stats;
        this.playerName = profile?.name ?? '';
        this.riotId = profile?.riotId ?? '';
        this.version = version ?? '';
        this.cached = Boolean(stats?.cached);
        return stats;
      }),
      finalize(() => {
        this.loading = false;
      }),
    );
  }
}

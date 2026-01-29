import { Component, DestroyRef, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { finalize, map, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { RiotApiService, RecentStatsDTO } from '../services/riot-api';

@Component({
  selector: 'app-player-stats',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './player-stats.html',
  styleUrl: './player-stats.scss',
})
export class PlayerStatsComponent {
  protected puuid = '';
  protected loading = false;
  protected error = '';
  protected stats: RecentStatsDTO | null = null;

  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(RiotApiService);
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

          return this.fetchStats$(puuid);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  protected fetchStats(): void {
    if (!this.puuid) return;
    this.fetchStats$(this.puuid)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  protected get winratePercent(): number {
    if (!this.stats) return 0;
    return Math.round(this.stats.winrate * 100);
  }

  private fetchStats$(puuid: string) {
    this.error = '';
    this.stats = null;
    this.loading = true;

    return this.api.getRecentStats(puuid, 20).pipe(
      map((s) => {
        this.stats = s;
        return s;
      }),
      finalize(() => {
        this.loading = false;
      }),
    );
  }
}

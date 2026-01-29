import { Component, DestroyRef, inject } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';


import { RiotApiService, RankingEntryDTO, RankingTier } from '../services/riot-api';
import {SlicePipe} from '@angular/common';

type RankingEntryVm = RankingEntryDTO & { winrate: number };

@Component({
  selector: 'app-classement',
  standalone: true,
  templateUrl: './classement.html',
  styleUrl: './classement.scss',
  imports: [
    SlicePipe,RouterLink
  ]
})
export class ClassementComponent {
  protected loading = false;
  protected error = '';

  protected readonly queue = 'RANKED_SOLO_5x5';

  protected readonly tiers: readonly { key: RankingTier; label: string }[] = [
    { key: 'challenger', label: 'Challenger' },
    { key: 'grandmaster', label: 'Grandmaster' },
    { key: 'master', label: 'Master' },
  ] as const;

  protected tier: RankingTier = 'challenger';

  protected data: { tier: string; queue: string } | null = null;
  protected entries: RankingEntryVm[] = [];

  private readonly api = inject(RiotApiService);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.fetch();
  }

  protected setTier(tier: RankingTier): void {
    if (tier === this.tier) return;
    this.tier = tier;
    this.fetch();
  }

  protected fetch(): void {
    this.loading = true;
    this.error = '';
    this.entries = [];
    this.data = null;

    this.api
      .getRanking(this.tier, this.queue)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.loading = false;
        }),
      )
      .subscribe({
        next: (res) => {
          this.data = { tier: res.tier, queue: res.queue };

          this.entries = res.entries.map((e) => ({
            ...e,
            winrate: Math.round((e.wins / (e.wins + e.losses)) * 100),
          }));
        },
        error: () => {
          this.error = 'Impossible de charger le classement.';
        },
      });
  }
}

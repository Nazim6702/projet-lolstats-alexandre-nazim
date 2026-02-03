import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';


import { RiotApiService } from '../services/riot-api';
import { RankingEntryDTO, RankingTier } from '../models/riot';
import { ChampionsService } from '../services/champions';
import {SlicePipe} from '@angular/common';
import { ERROR_RATE_LIMIT } from '../utils/errors';

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
export class ClassementComponent implements OnInit {
  protected loading = false;
  protected error = '';

  protected readonly queue = 'RANKED_SOLO_5x5';
  protected readonly pageSize = 15;

  protected readonly tiers: readonly { key: RankingTier; label: string }[] = [
    { key: 'challenger', label: 'Challenger' },
    { key: 'grandmaster', label: 'Grandmaster' },
    { key: 'master', label: 'Master' },
  ] as const;

  protected tier: RankingTier = 'challenger';
  protected page = 1;
  protected totalPages = 1;
  protected cached = false;

  protected data: { tier: string; queue: string } | null = null;
  protected entries: RankingEntryVm[] = [];
  protected version = '';

  private readonly api = inject(RiotApiService);
  private readonly championsService = inject(ChampionsService);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.championsService
      .getVersion()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => {
        this.version = v;
      });
    this.fetch();
  }

  protected setTier(tier: RankingTier): void {
    if (tier === this.tier) return;
    this.tier = tier;
    this.page = 1;
    this.fetch();
  }

  protected goToPage(page: number): void {
    const nextPage = Math.max(1, Math.min(page, this.totalPages));
    if (nextPage === this.page) return;
    this.page = nextPage;
    this.fetch();
  }

  protected fetch(refresh: boolean = false): void {
    this.loading = true;
    this.error = '';
    this.entries = [];
    this.data = null;
    this.totalPages = 1;
    this.cached = false;

    this.api
      .getRanking(this.tier, this.queue, this.page, this.pageSize, refresh)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.loading = false;
        }),
      )
      .subscribe({
        next: (res) => {
          this.data = { tier: res.tier, queue: res.queue };
          const totalEntries = res.totalEntries ?? res.entries.length;
          this.totalPages = Math.max(1, Math.ceil(totalEntries / this.pageSize));
          this.cached = Boolean(res.cached);

          this.entries = res.entries.map((e) => ({
            ...e,
            winrate: Math.round((e.wins / (e.wins + e.losses)) * 100),
          }));
        },
        error: (err) => {
          const status = err?.status;
          if (status === 429) {
            this.error = ERROR_RATE_LIMIT;
          } else {
            this.error = 'Impossible de charger le classement.';
          }
        },
      });
  }
}

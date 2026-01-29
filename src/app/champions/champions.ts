import { Component, DestroyRef, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize, switchMap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ChampionsService, DDragonChampionSummary, RoleFilter } from '../services/champions';

type ChampionCardVm = DDragonChampionSummary & {
  imageUrl: string;
};

@Component({
  selector: 'app-champions',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './champions.html',
  styleUrl: './champions.scss',
})
export class ChampionsComponent {
  protected role: RoleFilter = 'ALL';

  protected loading = false;
  protected error = '';

  protected version = '';
  protected champions: ChampionCardVm[] = [];
  protected filtered: ChampionCardVm[] = [];

  protected readonly roles: readonly RoleFilter[] = ['ALL', 'TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];

  private readonly championsService = inject(ChampionsService);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.fetch();
  }

  protected fetch(): void {
    this.loading = true;
    this.error = '';
    this.champions = [];
    this.filtered = [];

    this.championsService
      .getVersion()
      .pipe(
        switchMap((v) => {
          this.version = v;

          return this.championsService.getChampions();
        }),
        finalize(() => {
          this.loading = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (list) => {
          // On enrichit la donnée dès le chargement
          const vm = list.map((c) => ({
            ...c,
            imageUrl: this.championsService.getChampionImageUrl(this.version, c.id),
          }));

          this.champions = vm;
          this.applyFilter();
        },
        error: () => {
          this.error = 'Impossible de charger les champions (Data Dragon).';
        },
      });
  }

  protected setRole(role: RoleFilter): void {
    this.role = role;
    this.applyFilter();
  }

  private applyFilter(): void {
    this.filtered = this.champions.filter((c) =>
      this.championsService.championMatchesRole(c, this.role),
    );
  }
}

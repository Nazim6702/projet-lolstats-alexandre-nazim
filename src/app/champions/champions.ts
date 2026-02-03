import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize, switchMap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ChampionsService } from '../services/champions';
import { DDragonChampionSummary, RoleFilter } from '../models/champions';

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
export class ChampionsComponent implements OnInit {
  protected role: RoleFilter = 'ALL';

  protected loading = false;
  protected error = '';

  protected version = '';
  protected champions: ChampionCardVm[] = [];
  protected filtered: ChampionCardVm[] = [];

  protected readonly roles: readonly RoleFilter[] = ['ALL', 'TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];

  private readonly championsService = inject(ChampionsService);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
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

  protected getRoleIcon(role: RoleFilter): string | null {
    switch (role) {
      case 'TOP':
        return '/assets/lane/top.png';
      case 'JUNGLE':
        return '/assets/lane/jungler.png';
      case 'MID':
        return '/assets/lane/mid.png';
      case 'ADC':
        return '/assets/lane/adc.png';
      case 'SUPPORT':
        return '/assets/lane/support.png';
      default:
        return null;
    }
  }

  private applyFilter(): void {
    this.filtered = this.champions.filter((c) =>
      this.championsService.championMatchesRole(c, this.role),
    );
  }
}

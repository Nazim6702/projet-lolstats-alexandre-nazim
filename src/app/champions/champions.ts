import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ChampionsService, DDragonChampionSummary, RoleFilter } from '../services/champions';

@Component({
  selector: 'app-champions',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './champions.html',
  styleUrl: './champions.scss',
})
export class Champions implements OnInit {
  role: RoleFilter = 'ALL';

  loading = false;
  error = '';

  version: string = '';
  champions: DDragonChampionSummary[] = [];
  filtered: DDragonChampionSummary[] = [];

  roles: RoleFilter[] = ['ALL', 'TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];

  constructor(private championsService: ChampionsService) {}

  ngOnInit(): void {
    this.loading = true;

    // On récupère version + champions
    this.championsService.getVersion().subscribe({
      next: (v) => (this.version = v),
      error: () => {},
    });

    this.championsService.getChampions().subscribe({
      next: (list) => {
        this.loading = false;
        this.champions = list;
        this.applyFilter();
      },
      error: () => {
        this.loading = false;
        this.error = 'Impossible de charger les champions (Data Dragon).';
      },
    });
  }

  setRole(role: RoleFilter): void {
    this.role = role;
    this.applyFilter();
  }

  applyFilter(): void {
    this.filtered = this.champions.filter((c) =>
      this.championsService.championMatchesRole(c, this.role)
    );
  }

  imgUrl(champ: DDragonChampionSummary): string {
    // champ.id = "Ahri"
    return this.championsService.getChampionImageUrl(this.version, champ.id)
  }
}

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { ChampionsService, DDragonChampionDetails } from '../services/champions';

@Component({
  selector: 'app-champion-details',
  standalone: true,
  imports: [],
  templateUrl: './champion-details.html',
  styleUrl: './champion-details.scss',
})
export class ChampionDetails implements OnInit {
  id = '';

  loading = false;
  error = '';

  version = '';
  champion: DDragonChampionDetails | null = null;

  constructor(private route: ActivatedRoute, private championsService: ChampionsService) {}

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id') ?? '';
    this.fetch();
  }

  fetch(): void {
    this.loading = true;
    this.error = '';
    this.champion = null;

    this.championsService.getVersion().subscribe({
      next: (v) => (this.version = v),
      error: () => {},
    });

    this.championsService.getChampionDetails(this.id).subscribe({
      next: (c) => {
        this.loading = false;
        this.champion = c;
      },
      error: () => {
        this.loading = false;
        this.error = "Impossible de charger les détails du champion.";
      },
    });
  }

  splashUrl(): string {
    return this.championsService.getSplashArtUrl(this.id);
  }

  spellImg(full: string): string {
    return this.championsService.getSpellImageUrl(this.version, full);
  }

  passiveImg(full: string): string {
    return this.championsService.getPassiveImageUrl(this.version, full);
  }
}

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RiotApiService, RecentStatsDTO } from '../services/riot-api';
import {DecimalPipe} from '@angular/common'; // adapte le chemin/nom
// ⚠️ adapte l'import selon ton fichier exact (riot-api.ts / riot-api.service.ts)

@Component({
  selector: 'app-player-stats',
  standalone: true,
  imports: [
    DecimalPipe
  ],
  templateUrl: './player-stats.html',
  styleUrl: './player-stats.scss',
})
export class PlayerStats implements OnInit {
  puuid = '';
  loading = false;
  error = '';
  stats: RecentStatsDTO | null = null;

  constructor(private route: ActivatedRoute, private api: RiotApiService) {}

  ngOnInit(): void {
    this.puuid = this.route.snapshot.paramMap.get('puuid') ?? '';
    this.fetchStats();
  }

  fetchStats(): void {
    this.error = '';
    this.stats = null;
    this.loading = true;

    this.api.getRecentStats(this.puuid, 20).subscribe({
      next: (s) => {
        this.loading = false;
        this.stats = s;
      },
      error: (err) => {
        this.loading = false;
        const status = err?.status;

        if (status === 429) this.error = 'Rate limit Riot. Réessaie dans quelques secondes.';
        else this.error = 'Erreur serveur. Vérifie que le backend tourne.';
      },
    });
  }

  get winratePercent(): number {
    if (!this.stats) return 0;
    return Math.round(this.stats.winrate * 100);
  }
}

import { Component, OnInit } from '@angular/core';
import { RiotApiService, RankingDTO, RankingEntryDTO, RankingTier } from '../services/riot-api';

@Component({
  selector: 'app-classement',
  standalone: true,
  imports: [],
  templateUrl: './classement.html',
  styleUrl: './classement.scss',
})
export class Classement implements OnInit {
  loading = false;
  error = '';

  tier: RankingTier = 'challenger';
  queue = 'RANKED_SOLO_5x5';

  data: RankingDTO | null = null;
  entries: RankingEntryDTO[] = [];

  tiers: { key: RankingTier; label: string }[] = [
    { key: 'challenger', label: 'Challenger' },
    { key: 'grandmaster', label: 'Grandmaster' },
    { key: 'master', label: 'Master' },
  ];

  constructor(private api: RiotApiService) {}

  ngOnInit(): void {
    this.fetch();
  }

  setTier(t: RankingTier): void {
    this.tier = t;
    this.fetch();
  }

  fetch(): void {
    this.loading = true;
    this.error = '';
    this.data = null;
    this.entries = [];

    this.api.getRanking(this.tier, this.queue).subscribe({
      next: (r: RankingDTO) => {
        this.loading = false;
        this.data = r;

        // Tri par LP décroissant
        this.entries = (r.entries ?? []).slice().sort((a, b) => b.leaguePoints - a.leaguePoints);
      },
      error: (err) => {
        this.loading = false;
        const status = err?.status;

        if (status === 429) this.error = 'Rate limit Riot. Réessaie dans quelques secondes.';
        else this.error = 'Erreur serveur. Vérifie que le backend est lancé.';
      },
    });
  }

  winratePercent(e: RankingEntryDTO): number {
    const total = (e.wins ?? 0) + (e.losses ?? 0);
    if (total === 0) return 0;
    return Math.round(((e.wins ?? 0) / total) * 100);
  }
}

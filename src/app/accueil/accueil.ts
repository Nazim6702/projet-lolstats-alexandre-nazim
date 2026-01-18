import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RiotApiService } from '../services/riot-api';

@Component({
  selector: 'app-accueil',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './accueil.html',
  styleUrl: './accueil.scss',
})
export class Accueil {
  gameName = '';
  tagLine = '';
  loading = false;
  error = '';

  constructor(private api: RiotApiService, private router: Router) {}

  search(): void {
    this.error = '';
    const gameName = this.gameName.trim();
    const tagLine = this.tagLine.trim();

    if (!gameName || !tagLine) {
      this.error = 'Merci de renseigner le pseudo et le tag (ex: Sumish / QLF).';
      return;
    }

    this.loading = true;

    this.api.getAccountByRiotId(gameName, tagLine).subscribe({
      next: (account) => {
        this.loading = false;
        this.router.navigate(['/joueur', account.puuid]);
      },
      error: (err) => {
        this.loading = false;

        const status = err?.status;
        if (status === 404) {
          this.error = 'Joueur introuvable. Vérifie le pseudo et le tag (ex: Pseudo#TAG).';
        } else if (status === 429) {
          this.error = 'Rate limit Riot (trop de requêtes). Réessaie dans quelques secondes.';
        } else {
          this.error = 'Erreur serveur. Vérifie que le backend est lancé sur http://localhost:3000.';
        }
      },
    });
  }
}

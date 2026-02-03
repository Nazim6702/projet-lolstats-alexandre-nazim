import { Component, DestroyRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { RiotApiService } from '../services/riot-api';
import { ERROR_BACKEND_OFF, ERROR_RATE_LIMIT, ERROR_PLAYER_NOT_FOUND } from '../utils/errors';

@Component({
  selector: 'app-accueil',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './accueil.html',
  styleUrl: './accueil.scss',
})
export class AccueilComponent {
  // utilisés dans le template => on les laisse accessibles
  protected gameName = '';
  protected tagLine = '';
  protected loading = false;
  protected error = '';

  private readonly api = inject(RiotApiService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  search(): void {
    this.error = '';

    const gameName = this.gameName.trim();
    const tagLine = this.tagLine.trim();

    if (!gameName || !tagLine) {
      this.error = 'Merci de renseigner le pseudo et le tag (ex: Sumish / 000).';
      return;
    }

    this.loading = true;

    this.api
      .getAccountByRiotId(gameName, tagLine)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.loading = false;
        }),
      )
      .subscribe({
        next: (account) => {
          this.router.navigate(['/joueur', account.puuid]);
        },
        error: (err) => {
          const status = err?.status;

          if (status === 404) {
            this.error = `${ERROR_PLAYER_NOT_FOUND} Verifie le pseudo et le tag (ex: Pseudo#TAG).`;
            return;
          }

          if (status === 429) {
            this.error = ERROR_RATE_LIMIT;
            return;
          }

          this.error = ERROR_BACKEND_OFF;
        },
      });
  }
}

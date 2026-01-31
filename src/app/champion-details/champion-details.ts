import { Component, DestroyRef, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { finalize, map, switchMap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';

import { ChampionsService } from '../services/champions';
import { DDragonChampionDetails } from '../models/champions';

type ChampionDetailsVm = DDragonChampionDetails & {
  splashUrl: string;
  passiveImgUrl: string;
  spellsVm: Array<
    DDragonChampionDetails['spells'][number] & { imgUrl: string; key: string }
  >;
};

@Component({
  selector: 'app-champion-details',
  standalone: true,
  templateUrl: './champion-details.html',
  styleUrl: './champion-details.scss',
})
export class ChampionDetailsComponent {
  protected loading = false;
  protected error = '';

  protected id = '';
  protected champion: ChampionDetailsVm | null = null;

  private readonly route = inject(ActivatedRoute);
  private readonly championsService = inject(ChampionsService);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    // On réagit aux changements d'URL (si tu navigues d'un champion à un autre sans détruire le composant)
    this.route.paramMap
      .pipe(
        map((p) => p.get('id') ?? ''),
        switchMap((id) => {
          this.id = id;
          if (!id) {
            this.error = 'Champion introuvable (id manquant).';
            return of(null);
          }
          return this.fetchChampionVm(id);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  protected fetch(): void {
    if (!this.id) return;
    this.fetchChampionVm(this.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  private fetchChampionVm(id: string) {
    this.loading = true;
    this.error = '';
    this.champion = null;

    return forkJoin({
      version: this.championsService.getVersion(),
      details: this.championsService.getChampionDetails(id),
    }).pipe(
      map(({ version, details }) => {
        const splashUrl = this.championsService.getSplashArtUrl(id);
        const passiveImgUrl = this.championsService.getPassiveImageUrl(
          version,
          details.passive.image.full,
        );

        const spellKeys = ['Q', 'W', 'E', 'R'];
        const spellsVm = details.spells.map((s, index) => ({
          ...s,
          imgUrl: this.championsService.getSpellImageUrl(version, s.image.full),
          key: spellKeys[index] ?? '',
        }));

        const vm: ChampionDetailsVm = {
          ...details,
          splashUrl,
          passiveImgUrl,
          spellsVm,
        };

        this.champion = vm;
        return vm;
      }),
      finalize(() => {
        this.loading = false;
      }),
      // gestion d'erreur simple (tu peux raffiner selon status)
      // eslint-disable-next-line rxjs/no-ignored-error
      // (pas nécessaire si tu n'as pas eslint rxjs)
      // catchError(() => { ... })
    );
  }
}

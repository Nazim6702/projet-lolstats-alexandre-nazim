import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, shareReplay, switchMap } from 'rxjs';

export type ChampionClassTag =
  | 'Fighter'
  | 'Tank'
  | 'Mage'
  | 'Assassin'
  | 'Marksman'
  | 'Support';

export type RoleFilter = 'ALL' | 'TOP' | 'JUNGLE' | 'MID' | 'ADC' | 'SUPPORT';

export interface DDragonChampionSummary {
  version: string;
  id: string;
  key: string;
  name: string;
  title: string;
  blurb: string;
  tags: ChampionClassTag[];
  image: { full: string };
}

interface DDragonChampionListResponse {
  version: string;
  data: Record<string, DDragonChampionSummary>;
}

@Injectable({
  providedIn: 'root',
})
export class ChampionsService {
  private readonly ddragonBase = 'https://ddragon.leagueoflegends.com';

  private readonly version$: Observable<string>;
  private readonly champions$: Observable<DDragonChampionSummary[]>;

  constructor(private http: HttpClient) {
    // ✅ version Data Dragon (mise en cache)
    this.version$ = this.http
      .get<string[]>(`${this.ddragonBase}/api/versions.json`)
      .pipe(
        map((versions) => versions?.[0] ?? 'latest'),
        shareReplay(1)
      );

    // ✅ liste champions (mise en cache)
    this.champions$ = this.version$.pipe(
      switchMap((v) =>
        this.http.get<DDragonChampionListResponse>(
          `${this.ddragonBase}/cdn/${v}/data/en_US/champion.json`
        )
      ),
      map((resp) => Object.values(resp.data)),
      map((list) => list.sort((a, b) => a.name.localeCompare(b.name))),
      shareReplay(1)
    );
  }

  getChampions(): Observable<DDragonChampionSummary[]> {
    return this.champions$;
  }

  getVersion(): Observable<string> {
    return this.version$;
  }

  championMatchesRole(champ: DDragonChampionSummary, role: RoleFilter): boolean {
    if (role === 'ALL') return true;

    const tags = champ.tags ?? [];

    switch (role) {
      case 'ADC':
        return tags.includes('Marksman');
      case 'SUPPORT':
        return tags.includes('Support');
      case 'MID':
        return tags.includes('Mage') || tags.includes('Assassin');
      case 'JUNGLE':
        return tags.includes('Assassin') || tags.includes('Fighter');
      case 'TOP':
        return tags.includes('Fighter') || tags.includes('Tank');
      default:
        return true;
    }
  }

  getChampionImageUrl(version: string, champId: string): string {
    return `${this.ddragonBase}/cdn/${version}/img/champion/${champId}.png`;
  }

  getChampionDetails(champId: string): Observable<DDragonChampionDetails> {
    return this.version$.pipe(
      switchMap((v) =>
        this.http.get<DDragonChampionDetailsResponse>(
          `${this.ddragonBase}/cdn/${v}/data/en_US/champion/${encodeURIComponent(champId)}.json`
        )
      ),
      map((resp) => resp.data[champId]),
      shareReplay(1)
    );
  }

  getSpellImageUrl(version: string, fullFileName: string): string {
    return `${this.ddragonBase}/cdn/${version}/img/spell/${fullFileName}`;
  }

  getPassiveImageUrl(version: string, fullFileName: string): string {
    return `${this.ddragonBase}/cdn/${version}/img/passive/${fullFileName}`;
  }

  getSplashArtUrl(champId: string): string {
    // Splash principal (0)
    return `${this.ddragonBase}/cdn/img/champion/splash/${encodeURIComponent(champId)}_0.jpg`;
  }

}

export interface DDragonChampionSpell {
  id: string;
  name: string;
  description: string;
  tooltip: string;
  image: { full: string };
}

export interface DDragonChampionDetails {
  id: string;
  name: string;
  title: string;
  lore: string;
  tags: string[];
  spells: DDragonChampionSpell[];
  passive: { name: string; description: string; image: { full: string } };
  image: { full: string };
}

interface DDragonChampionDetailsResponse {
  data: Record<string, DDragonChampionDetails>;
}


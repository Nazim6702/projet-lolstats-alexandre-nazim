import { Routes } from '@angular/router';

import { AccueilComponent } from './accueil/accueil';
import { ChampionsComponent } from './champions/champions';
import { ChampionDetailsComponent } from './champion-details/champion-details';
import { ClassementComponent } from './classement/classement';
import { PlayerStatsComponent } from './player-stats/player-stats';
import { Page404Component } from './page404/page404';

export const routes: Routes = [
  // page par défaut
  {
    path: '',
    redirectTo: 'accueil',
    pathMatch: 'full',
  },

  // accueil / recherche joueur
  {
    path: 'accueil',
    component: AccueilComponent,
  },

  // stats joueur
  {
    path: 'joueur/:puuid',
    component: PlayerStatsComponent,
  },

  // champions
  {
    path: 'champions',
    component: ChampionsComponent,
  },
  {
    path: 'champions/:id',
    component: ChampionDetailsComponent,
  },

  // classement
  {
    path: 'classement',
    component: ClassementComponent,
  },

  // 404
  {
    path: '**',
    component: Page404Component,
  },
];

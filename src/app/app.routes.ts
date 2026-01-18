import { Routes } from '@angular/router';

import { Accueil } from './accueil/accueil';
import { Champions } from './champions/champions';
import { Classement } from './classement/classement';
import { Page404 } from './page404/page404';

import { PlayerStats } from './player-stats/player-stats';
import { ChampionDetails } from './champion-details/champion-details';

export const routes: Routes = [
  { path: '', redirectTo: 'accueil', pathMatch: 'full' },

  { path: 'accueil', component: Accueil },
  { path: 'joueur/:puuid', component: PlayerStats },

  { path: 'champions', component: Champions },
  { path: 'champions/:id', component: ChampionDetails },

  { path: 'classement', component: Classement },

  { path: '**', component: Page404 },
];

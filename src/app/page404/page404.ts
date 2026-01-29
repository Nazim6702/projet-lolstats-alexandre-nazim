import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-page404',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './page404.html',
  styleUrl: './page404.scss',
})
export class Page404Component {
  protected readonly suggestions = [
    { label: 'Retour à l’accueil', link: '/accueil' },
    { label: 'Voir les champions', link: '/champions' },
    { label: 'Voir le classement', link: '/classement' },
  ] as const;
}

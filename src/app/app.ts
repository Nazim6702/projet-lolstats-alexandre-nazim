import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { RiotApiService } from './services/riot-api';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('projet-lolstats-alexandre-nazim');

  //Communication avec le backend RIOT API, verification de son etat actuel.
  protected backendStatus: 'checking' | 'ok' | 'down' = 'checking';
  protected checkingBackend = false;

  private readonly api = inject(RiotApiService);

  ngOnInit(): void {
    this.checkBackend();
  }

  protected checkBackend(): void {
    if (this.checkingBackend) return;
    this.checkingBackend = true;
    this.backendStatus = 'checking';

    this.api
      .getHealth()
      .pipe(
        finalize(() => {
          this.checkingBackend = false;
        })
      )
      .subscribe({
        next: () => {
          this.backendStatus = 'ok';
        },
        error: () => {
          this.backendStatus = 'down';
        },
      });
  }
}

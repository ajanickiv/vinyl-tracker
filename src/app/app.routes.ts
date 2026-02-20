import { Routes } from '@angular/router';
import { syncGuard, playerGuard } from './core/app.guards';

export const routes: Routes = [
  {
    path: 'setup',
    loadComponent: () =>
      import('./features/setup/setup-screen/setup-screen.component').then(
        (m) => m.SetupScreenComponent,
      ),
  },
  {
    path: 'sync',
    loadComponent: () =>
      import('./features/setup/sync-screen/sync-screen.component').then(
        (m) => m.SyncScreenComponent,
      ),
    canActivate: [syncGuard],
  },
  {
    path: '',
    loadComponent: () =>
      import('./features/player/vinyl-player/vinyl-player.component').then(
        (m) => m.VinylPlayerComponent,
      ),
    canActivate: [playerGuard],
  },
  {
    path: '**',
    redirectTo: '',
  },
];

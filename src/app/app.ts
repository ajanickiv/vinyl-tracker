import { Component, OnInit, signal } from '@angular/core';
import { SetupScreenComponent } from './components/setup-screen/setup-screen.component';
import { SyncScreenComponent } from './components/sync-screen/sync-screen.component';
import { VinylPlayerComponent } from './components/vinyl-player/vinyl-player.component';
import { DatabaseService } from './services/database.service';
import { CredentialsService } from './services/credentials.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [SetupScreenComponent, SyncScreenComponent, VinylPlayerComponent],
  template: `
    @if (!hasCredentials()) {
      <app-setup-screen (setupComplete)="onSetupComplete()"></app-setup-screen>
    } @else if (hasSyncedData()) {
      <app-vinyl-player></app-vinyl-player>
    } @else {
      <app-sync-screen (syncComplete)="onSyncComplete()"></app-sync-screen>
    }
  `,
})
export class AppComponent implements OnInit {
  hasCredentials = signal(false);
  hasSyncedData = signal(false);

  constructor(
    private db: DatabaseService,
    private credentialsService: CredentialsService,
  ) {}

  async ngOnInit() {
    this.hasCredentials.set(this.credentialsService.hasCredentials());

    if (this.hasCredentials()) {
      const count = await this.db.getCollectionCount();
      this.hasSyncedData.set(count > 0);
    }
  }

  async onSetupComplete() {
    this.hasCredentials.set(true);
    // Check if user already has synced data (upgrade scenario)
    const count = await this.db.getCollectionCount();
    this.hasSyncedData.set(count > 0);
  }

  onSyncComplete() {
    this.hasSyncedData.set(true);
  }
}

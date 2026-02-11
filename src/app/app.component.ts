import { Component, OnInit, signal } from '@angular/core';
import { SetupScreenComponent } from './components/setup-screen/setup-screen.component';
import { SyncScreenComponent } from './components/sync-screen/sync-screen.component';
import { VinylPlayerComponent } from './components/vinyl-player/vinyl-player.component';
import { DatabaseService } from './services/database.service';
import { CredentialsService } from './services/credentials.service';
import { MasterReleaseService } from './services/master-release.service';
import { PwaUpdateService } from './services/pwa-update.service';
import { AchievementsService } from './services/achievements.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [SetupScreenComponent, SyncScreenComponent, VinylPlayerComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  isInitialized = signal(false);
  hasCredentials = signal(false);
  hasSyncedData = signal(false);

  constructor(
    private db: DatabaseService,
    private credentialsService: CredentialsService,
    private masterReleaseService: MasterReleaseService,
    private pwaUpdateService: PwaUpdateService,
    private achievementsService: AchievementsService,
  ) {}

  async ngOnInit() {
    this.pwaUpdateService.initialize();
    this.hasCredentials.set(this.credentialsService.hasCredentials());

    if (this.hasCredentials()) {
      const count = await this.db.getCollectionCount();
      this.hasSyncedData.set(count > 0);

      // Resume background fetch of master release data if needed
      // and initialize achievements for retroactive badge unlocks
      if (count > 0) {
        this.masterReleaseService.resumeIfNeeded();
        const releases = await this.db.getAllReleases();
        this.achievementsService.initialize(releases);
      }
    }

    this.isInitialized.set(true);
  }

  async onSetupComplete() {
    this.hasCredentials.set(true);
    // Check if user already has synced data (upgrade scenario)
    const count = await this.db.getCollectionCount();
    this.hasSyncedData.set(count > 0);
  }

  async onSyncComplete() {
    this.hasSyncedData.set(true);
    // Initialize achievements after first sync
    const releases = await this.db.getAllReleases();
    this.achievementsService.initialize(releases);
  }
}

import { Component, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DiscogsService } from '../../services/discogs.service';
import { MasterReleaseService } from '../../services/master-release.service';
import { DatabaseService } from '../../services/database.service';
import { SYNC_TRANSITION_DELAY_MS } from '../../constants/timing.constants';

@Component({
  selector: 'app-sync-screen',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sync-screen.component.html',
  styleUrls: ['./sync-screen.component.scss'],
})
export class SyncScreenComponent {
  syncing = signal(false);
  syncProgress = signal('');
  fetchReleaseDates = signal(true);

  syncComplete = output<void>();

  constructor(
    private discogsService: DiscogsService,
    private masterReleaseService: MasterReleaseService,
    private db: DatabaseService,
  ) {}

  toggleFetchReleaseDates(): void {
    this.fetchReleaseDates.update((v) => !v);
  }

  async startSync() {
    this.syncing.set(true);
    this.syncProgress.set('Connecting to Discogs...');

    // Save the master release sync setting
    await this.db.setMasterReleaseSyncEnabled(this.fetchReleaseDates());

    const result = await this.discogsService.syncCollection();

    if (result.success) {
      this.syncProgress.set(`✅ Successfully synced ${result.totalSynced} releases!`);

      // Start background fetch of master release data (original years) if enabled
      if (this.fetchReleaseDates()) {
        await this.masterReleaseService.startBackgroundFetch();
      }

      // Wait a moment to show success message
      setTimeout(() => {
        this.syncComplete.emit();
      }, SYNC_TRANSITION_DELAY_MS);
    } else {
      this.syncProgress.set(`❌ Sync failed: ${result.error}`);
      this.syncing.set(false);
    }
  }
}

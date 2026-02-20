import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DiscogsService } from '../../discogs/discogs.service';
import { MasterReleaseService } from '../../discogs/master-release.service';
import { DatabaseService } from '../../../core/database.service';
import { AchievementsService } from '../../achievements/achievements.service';
import { SYNC_TRANSITION_DELAY_MS } from '../../../shared/constants/timing.constants';

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

  constructor(
    private discogsService: DiscogsService,
    private masterReleaseService: MasterReleaseService,
    private db: DatabaseService,
    private achievementsService: AchievementsService,
    private router: Router,
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

      // Initialize achievements with the newly synced releases
      const releases = await this.db.getAllReleases();
      this.achievementsService.initialize(releases);

      // Wait a moment to show success message, then navigate to player
      setTimeout(() => {
        this.router.navigate(['/']);
      }, SYNC_TRANSITION_DELAY_MS);
    } else {
      this.syncProgress.set(`❌ Sync failed: ${result.error}`);
      this.syncing.set(false);
    }
  }
}

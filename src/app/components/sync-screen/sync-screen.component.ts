import { Component, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DiscogsService } from '../../services/discogs.service';

@Component({
    selector: 'app-sync-screen',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './sync-screen.component.html',
    styleUrls: ['./sync-screen.component.scss']
})
export class SyncScreenComponent {
    syncing = signal(false);
    syncProgress = signal('');
    
    syncComplete = output<void>();

    constructor(private discogsService: DiscogsService) { }

    async startSync() {
        this.syncing.set(true);
        this.syncProgress.set('Connecting to Discogs...');

        const result = await this.discogsService.syncCollection();

        if (result.success) {
            this.syncProgress.set(`✅ Successfully synced ${result.totalSynced} releases!`);

            // Wait a moment to show success message
            setTimeout(() => {
                this.syncComplete.emit();
            }, 1500);
        } else {
            this.syncProgress.set(`❌ Sync failed: ${result.error}`);
            this.syncing.set(false);
        }
    }
}
import { Component, signal, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DatabaseService } from '../../services/database.service';
import { DiscogsService } from '../../services/discogs.service';
import { PlaybackService } from '../../services/playback.service';

@Component({
    selector: 'app-menu-drawer',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './menu-drawer.component.html',
    styleUrls: ['./menu-drawer.component.scss']
})
export class MenuDrawerComponent {
    isOpen = input.required<boolean>();
    close = output<void>();

    lastSyncDate = signal<Date | null>(null);
    collectionStats = signal<any>(null);
    syncing = signal(false);
    syncMessage = signal('');

    constructor(
        private db: DatabaseService,
        private discogsService: DiscogsService,
        private playbackService: PlaybackService
    ) {
        this.loadMenuData();
    }

    async loadMenuData() {
        const lastSync = await this.db.getLastSyncDate();
        this.lastSyncDate.set(lastSync);

        const stats = await this.playbackService.getCollectionStats();
        this.collectionStats.set(stats);
    }

    async resync() {
        this.syncing.set(true);
        this.syncMessage.set('Syncing...');

        const result = await this.discogsService.syncCollection();

        if (result.success) {
            this.syncMessage.set(`✅ Synced ${result.totalSynced} releases!`);
            await this.loadMenuData();
        } else {
            this.syncMessage.set(`❌ Sync failed: ${result.error}`);
        }

        setTimeout(() => {
            this.syncing.set(false);
            this.syncMessage.set('');
        }, 3000);
    }

    getTimeSinceSync(): string {
        const lastSync = this.lastSyncDate();
        if (!lastSync) return 'Never';

        const now = new Date();
        const diffMs = now.getTime() - lastSync.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        return `${Math.floor(diffDays / 30)} months ago`;
    }

    closeDrawer() {
        this.close.emit();
    }

    onBackdropClick() {
        this.closeDrawer();
    }
}
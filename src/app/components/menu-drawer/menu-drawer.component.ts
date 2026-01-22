import { Component, signal, input, output, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil, tap } from 'rxjs/operators';
import { DatabaseService } from '../../services/database.service';
import { DiscogsService } from '../../services/discogs.service';
import { PlaybackService } from '../../services/playback.service';
import { CollectionStats } from '../../models/collection-stats.model';

@Component({
  selector: 'app-menu-drawer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './menu-drawer.component.html',
  styleUrls: ['./menu-drawer.component.scss'],
})
export class MenuDrawerComponent implements OnDestroy {
  collectionStats = signal<CollectionStats | null>(null);
  lastSyncDate = signal<Date | null>(null);
  syncing = signal(false);
  syncMessage = signal('');

  isOpen = input.required<boolean>();
  close = output<void>();

  private destroy$ = new Subject<void>();

  constructor(
    private db: DatabaseService,
    private discogsService: DiscogsService,
    private playbackService: PlaybackService,
  ) {
    this.loadMenuData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  closeDrawer() {
    this.close.emit();
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

  loadMenuData(): void {
    this.db.getLastSyncDate().then((lastSync) => {
      this.lastSyncDate.set(lastSync);
    });

    this.playbackService
      .getCollectionStats()
      .pipe(
        tap((stats) => {
          this.collectionStats.set(stats);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  onBackdropClick() {
    this.closeDrawer();
  }

  resync(): void {
    this.syncing.set(true);
    this.syncMessage.set('Syncing...');

    this.discogsService.syncCollection().then((result) => {
      if (result.success) {
        this.syncMessage.set(`✅ Synced ${result.totalSynced} releases!`);
        this.loadMenuData();
      } else {
        this.syncMessage.set(`❌ Sync failed: ${result.error}`);
      }

      setTimeout(() => {
        this.syncing.set(false);
        this.syncMessage.set('');
      }, 3000);
    });
  }
}

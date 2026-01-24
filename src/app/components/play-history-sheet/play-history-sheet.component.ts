import { Component, signal, input, output, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { PlayHistoryService } from '../../services/play-history.service';
import { DatabaseService } from '../../services/database.service';
import { Release } from '../../models/release.model';
import { PlayHistoryEntry } from '../../models/play-history.model';

export interface HistoryDisplayItem {
  entry: PlayHistoryEntry;
  release: Release | null;
}

@Component({
  selector: 'app-play-history-sheet',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './play-history-sheet.component.html',
  styleUrls: ['./play-history-sheet.component.scss'],
})
export class PlayHistorySheetComponent implements OnInit, OnDestroy {
  historyItems = signal<HistoryDisplayItem[]>([]);
  isLoading = signal(true);

  isOpen = input.required<boolean>();
  close = output<void>();
  releaseSelected = output<Release>();

  private destroy$ = new Subject<void>();
  private releaseCache = new Map<number, Release>();

  constructor(
    private playHistoryService: PlayHistoryService,
    private db: DatabaseService,
  ) {}

  ngOnInit(): void {
    this.loadHistory();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onBackdropClick(): void {
    this.closeSheet();
  }

  closeSheet(): void {
    this.close.emit();
  }

  selectRelease(item: HistoryDisplayItem): void {
    if (item.release) {
      this.releaseSelected.emit(item.release);
      this.closeSheet();
    }
  }

  refreshHistory(): void {
    this.loadHistory();
  }

  getRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30)
      return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
    return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
  }

  private async loadHistory(): Promise<void> {
    this.isLoading.set(true);

    try {
      const history = this.playHistoryService.getHistory();

      // Load all releases to populate cache
      const releases = await this.db.getAllReleases();
      this.releaseCache.clear();
      releases.forEach((r) => this.releaseCache.set(r.id, r));

      // Map history entries to display items
      const items: HistoryDisplayItem[] = history.map((entry) => ({
        entry,
        release: this.releaseCache.get(entry.releaseId) || null,
      }));

      this.historyItems.set(items);
    } catch (error) {
      console.error('Failed to load play history:', error);
      this.historyItems.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }
}

import { Component, signal, input, output, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil, tap } from 'rxjs/operators';
import { PlaybackService } from '../../services/playback.service';
import { FilterService } from '../../services/filter.service';
import { CollectionStats } from '../../models/collection-stats.model';
import { Release } from '../../models/release.model';
import { ArtistNamePipe } from '../../pipes/artist-name.pipe';

@Component({
  selector: 'app-stats-sheet',
  standalone: true,
  imports: [CommonModule, ArtistNamePipe],
  templateUrl: './stats-sheet.component.html',
  styleUrls: ['./stats-sheet.component.scss'],
})
export class StatsSheetComponent implements OnInit, OnDestroy {
  collectionStats = signal<CollectionStats | null>(null);
  isLoading = signal(true);

  isOpen = input.required<boolean>();
  close = output<void>();
  filterApplied = output<void>();
  releaseSelected = output<Release>();

  private destroy$ = new Subject<void>();

  constructor(
    private playbackService: PlaybackService,
    private filterService: FilterService,
  ) {}

  ngOnInit(): void {
    this.loadStats();

    this.playbackService.statsUpdated$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.loadStats();
    });
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

  getCollectionPlayedPercentage(): number {
    const stats = this.collectionStats();
    if (!stats || stats.totalReleases === 0) return 0;
    return Math.round(((stats.totalReleases - stats.neverPlayed) / stats.totalReleases) * 100);
  }

  getPlayedThisYearPercentage(): number {
    const stats = this.collectionStats();
    if (!stats || stats.totalReleases === 0) return 0;
    return Math.round((stats.playedThisYear / stats.totalReleases) * 100);
  }

  refreshStats(): void {
    this.loadStats();
  }

  applyNeverPlayedFilter(): void {
    this.filterService.setNotPlayedIn6Months(true);
    this.filterApplied.emit();
    this.closeSheet();
  }

  selectOldestNeverPlayed(): void {
    const stats = this.collectionStats();
    if (stats?.oldestNeverPlayed) {
      this.releaseSelected.emit(stats.oldestNeverPlayed);
      this.closeSheet();
    }
  }

  private loadStats(): void {
    this.isLoading.set(true);
    this.playbackService
      .getCollectionStats()
      .pipe(
        tap((stats) => {
          this.collectionStats.set(stats);
          this.isLoading.set(false);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }
}

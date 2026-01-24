import { Component, signal, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, of, timer } from 'rxjs';
import { takeUntil, tap, catchError, switchMap } from 'rxjs/operators';
import { RecommendationService } from '../../services/recommendation.service';
import { PlaybackService } from '../../services/playback.service';
import { Release } from '../../models/release.model';
import { MenuDrawerComponent } from '../menu-drawer/menu-drawer.component';
import { SearchSheetComponent } from '../search-sheet/search-sheet.component';
import { PlayHistorySheetComponent } from '../play-history-sheet/play-history-sheet.component';
import { SPIN_ANIMATION_DURATION_MS } from '../../constants/timing.constants';

@Component({
  selector: 'app-vinyl-player',
  standalone: true,
  imports: [CommonModule, MenuDrawerComponent, SearchSheetComponent, PlayHistorySheetComponent],
  templateUrl: './vinyl-player.component.html',
  styleUrls: ['./vinyl-player.component.scss'],
})
export class VinylPlayerComponent implements OnDestroy {
  @ViewChild(PlayHistorySheetComponent) historySheet?: PlayHistorySheetComponent;

  currentRelease = signal<Release | null>(null);
  isSpinning = signal(false);
  isLoading = signal(true);
  menuOpen = signal(false);
  searchOpen = signal(false);
  historyOpen = signal(false);

  private destroy$ = new Subject<void>();

  constructor(
    private recommendationService: RecommendationService,
    private playbackService: PlaybackService,
  ) {
    this.loadInitialRecommendation();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadInitialRecommendation(): void {
    this.fetchRecommendation();
  }

  private fetchRecommendation(): void {
    this.isLoading.set(true);
    this.recommendationService
      .getRecommendation()
      .pipe(
        tap((release) => {
          this.currentRelease.set(release);
          this.isLoading.set(false);
        }),
        catchError((error) => {
          console.error('Failed to get recommendation:', error);
          this.isLoading.set(false);
          return of(null);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  getFormatString(release: Release): string {
    return release.basicInfo.formats?.join(', ') || 'Unknown';
  }

  getFormattedDate(date?: Date): string {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString();
  }

  getNewRecommendation(): void {
    this.fetchRecommendation();
  }

  markAsPlayed(): void {
    const release = this.currentRelease();
    if (!release || this.isSpinning()) return;

    this.isSpinning.set(true);

    // Wait for spin animation to complete, then mark as played
    timer(SPIN_ANIMATION_DURATION_MS)
      .pipe(
        switchMap(() => this.playbackService.markAsPlayed(release.id)),
        tap((updated) => {
          if (updated) {
            this.currentRelease.set(updated);
          }
          this.isSpinning.set(false);
        }),
        switchMap(() => this.recommendationService.getRecommendation()),
        tap((newRelease) => {
          this.currentRelease.set(newRelease);
          this.isLoading.set(false);
        }),
        catchError((error) => {
          console.error('Failed to mark as played:', error);
          this.isSpinning.set(false);
          return of(null);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }

  skipToNext(): void {
    if (this.isSpinning()) return;
    this.getNewRecommendation();
  }

  toggleMenu(): void {
    this.menuOpen.set(!this.menuOpen());
  }

  onDataCleared(): void {
    // Reload the page to show the sync screen
    window.location.reload();
  }

  onFiltersChanged(): void {
    // Get a new recommendation that respects the updated filters
    this.fetchRecommendation();
  }

  toggleSearch(): void {
    this.searchOpen.set(!this.searchOpen());
  }

  closeSearch(): void {
    this.searchOpen.set(false);
  }

  onReleaseSelected(release: Release): void {
    this.currentRelease.set(release);
    this.isLoading.set(false);
  }

  toggleHistory(): void {
    this.historyOpen.set(!this.historyOpen());
    // Refresh history data when opening
    if (this.historyOpen() && this.historySheet) {
      this.historySheet.refreshHistory();
    }
  }

  closeHistory(): void {
    this.historyOpen.set(false);
  }

  onHistoryReleaseSelected(release: Release): void {
    this.currentRelease.set(release);
    this.isLoading.set(false);
  }
}

import { Component, signal, OnDestroy, ViewChild, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, of, timer } from 'rxjs';
import { takeUntil, tap, catchError, switchMap } from 'rxjs/operators';
import { RecommendationService } from '../recommendation.service';
import { PlaybackService } from '../playback.service';
import { MasterReleaseService } from '../../discogs/master-release.service';
import { DatabaseService } from '../../../core/database.service';
import { Release } from '../../../shared/models/release.model';
import { MenuDrawerComponent } from '../../../layout/menu-drawer/menu-drawer.component';
import { SearchSheetComponent } from '../search-sheet/search-sheet.component';
import { PlayHistorySheetComponent } from '../play-history-sheet/play-history-sheet.component';
import { StatsSheetComponent } from '../../stats/stats-sheet/stats-sheet.component';
import { AchievementsSheetComponent } from '../../achievements/achievements-sheet/achievements-sheet.component';
import { AchievementToastComponent } from '../../achievements/achievement-toast/achievement-toast.component';
import { ChangelogSheetComponent } from '../../changelog/changelog-sheet/changelog-sheet.component';
import { ArtistNamePipe } from '../../../shared/pipes/artist-name.pipe';
import { SPIN_ANIMATION_DURATION_MS } from '../../../shared/constants/timing.constants';
import { APP_VERSION } from '../../../shared/constants/app.constants';
import { BadgeUnlockEvent } from '../../achievements/achievements.service';

@Component({
  selector: 'app-vinyl-player',
  standalone: true,
  imports: [
    CommonModule,
    MenuDrawerComponent,
    SearchSheetComponent,
    PlayHistorySheetComponent,
    StatsSheetComponent,
    AchievementsSheetComponent,
    AchievementToastComponent,
    ChangelogSheetComponent,
    ArtistNamePipe,
  ],
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
  statsOpen = signal(false);
  achievementsOpen = signal(false);
  changelogOpen = signal(false);
  pendingToast = signal<BadgeUnlockEvent | null>(null);

  private destroy$ = new Subject<void>();
  private toastQueue: BadgeUnlockEvent[] = [];

  // Expose master fetch progress to template
  masterFetchInProgress = computed(() => this.masterReleaseService.isInProgress());
  masterFetchProgress = computed(() => this.masterReleaseService.progress());
  masterFetchRemaining = computed(() => {
    const p = this.masterFetchProgress();
    return p.total - p.completed;
  });

  // Number of albums the algorithm is choosing from
  filteredCount = computed(() => this.recommendationService.filteredCount());

  // Pre-computed display values for current release
  releaseFormatString = computed(() => {
    const release = this.currentRelease();
    if (!release) return '';
    return release.basicInfo.formats?.join(', ') || 'Unknown';
  });

  releaseLastPlayedDate = computed(() => {
    const release = this.currentRelease();
    if (!release?.lastPlayedDate) return 'Never';
    return new Date(release.lastPlayedDate).toLocaleDateString();
  });

  constructor(
    private recommendationService: RecommendationService,
    private playbackService: PlaybackService,
    private masterReleaseService: MasterReleaseService,
    private db: DatabaseService,
    private router: Router,
  ) {
    this.loadInitialRecommendation();
    this.subscribeToAchievements();
    this.checkForChangelog();
  }

  private subscribeToAchievements(): void {
    this.playbackService.achievementUnlocked$.pipe(takeUntil(this.destroy$)).subscribe((badges) => {
      // Queue all unlocked badges
      this.toastQueue.push(...badges);
      // Show first toast if none is currently displayed
      if (!this.pendingToast()) {
        this.showNextToast();
      }
    });
  }

  private showNextToast(): void {
    const nextBadge = this.toastQueue.shift();
    this.pendingToast.set(nextBadge || null);
  }

  dismissToast(): void {
    this.showNextToast();
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

  setRating(level: 1 | 2 | 3): void {
    const release = this.currentRelease();
    if (!release || this.isSpinning()) return;

    const newRating = release.userRating === level ? undefined : level;

    this.playbackService
      .setUserRating(release.id, newRating)
      .pipe(takeUntil(this.destroy$))
      .subscribe((updated) => {
        if (updated) this.currentRelease.set(updated);
      });
  }

  toggleMenu(): void {
    this.menuOpen.set(!this.menuOpen());
  }

  onDataCleared(): void {
    this.router.navigate(['/sync']);
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

  toggleStats(): void {
    this.statsOpen.set(!this.statsOpen());
  }

  closeStats(): void {
    this.statsOpen.set(false);
  }

  toggleAchievements(): void {
    this.achievementsOpen.set(!this.achievementsOpen());
  }

  closeAchievements(): void {
    this.achievementsOpen.set(false);
  }

  openChangelog(): void {
    this.changelogOpen.set(true);
  }

  closeChangelog(): void {
    this.changelogOpen.set(false);
  }

  private async checkForChangelog(): Promise<void> {
    try {
      const lastSeen = await this.db.getMetadata('lastSeenVersion');
      if (lastSeen !== APP_VERSION) {
        this.changelogOpen.set(true);
        await this.db.setMetadata('lastSeenVersion', APP_VERSION);
      }
    } catch (error) {
      console.error('Failed to check changelog version:', error);
    }
  }

  onHistoryReleaseSelected(release: Release): void {
    this.currentRelease.set(release);
    this.isLoading.set(false);
  }
}

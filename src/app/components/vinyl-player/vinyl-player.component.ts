import { Component, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, of, timer } from 'rxjs';
import { takeUntil, tap, catchError, switchMap } from 'rxjs/operators';
import { RecommendationService } from '../../services/recommendation.service';
import { PlaybackService } from '../../services/playback.service';
import { Release } from '../../models/release.model';
import { MenuDrawerComponent } from '../menu-drawer/menu-drawer.component';

@Component({
  selector: 'app-vinyl-player',
  standalone: true,
  imports: [CommonModule, MenuDrawerComponent],
  templateUrl: './vinyl-player.component.html',
  styleUrls: ['./vinyl-player.component.scss'],
})
export class VinylPlayerComponent implements OnDestroy {
  currentRelease = signal<Release | null>(null);
  isSpinning = signal(false);
  isLoading = signal(true);
  menuOpen = signal(false);

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
    this.isLoading.set(true);
    this.recommendationService
      .getRecommendation()
      .pipe(
        tap((release) => {
          this.currentRelease.set(release);
          this.isLoading.set(false);
        }),
        catchError((error) => {
          console.error('Failed to load initial recommendation:', error);
          this.isLoading.set(false);
          return of(null);
        }),
        takeUntil(this.destroy$)
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
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  markAsPlayed(): void {
    const release = this.currentRelease();
    if (!release || this.isSpinning()) return;

    this.isSpinning.set(true);

    // Wait for spin animation to complete (2 seconds), then mark as played
    timer(2000)
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
        takeUntil(this.destroy$)
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
}

import { Injectable, signal, computed } from '@angular/core';
import { Subject } from 'rxjs';
import {
  AchievementsState,
  BadgeDefinition,
  BadgeId,
  BadgeProgress,
  BADGE_DEFINITIONS,
  DEFAULT_ACHIEVEMENTS_STATE,
} from '../models/achievement.model';
import { Release } from '../models/release.model';

const STORAGE_KEY = 'vinyl-tracker-achievements';

@Injectable({
  providedIn: 'root',
})
export class AchievementsService {
  private stateSignal = signal<AchievementsState>(this.loadState());

  /** Read-only access to achievements state */
  readonly state = this.stateSignal.asReadonly();

  /** Computed count of unlocked badges */
  readonly unlockedCount = computed(() => {
    return Object.keys(this.stateSignal().unlockedBadges).length;
  });

  /** Emits when new badges are unlocked (not including retroactive unlocks) */
  readonly badgeUnlocked$ = new Subject<BadgeDefinition[]>();

  constructor() {}

  /**
   * Initialize achievements with existing release data.
   * Called on app startup to handle retroactive badge unlocks.
   * Does NOT emit badgeUnlocked$ for retroactive unlocks.
   */
  initialize(releases: Release[]): void {
    const progress = this.calculateAllProgress(releases);
    const currentState = this.stateSignal();
    const newUnlockedBadges: Record<string, string> = {};

    for (const badge of progress) {
      if (badge.isUnlocked && !currentState.unlockedBadges[badge.badge.id]) {
        // Retroactively unlock without notification
        newUnlockedBadges[badge.badge.id] = new Date().toISOString();
      }
    }

    if (Object.keys(newUnlockedBadges).length > 0) {
      this.stateSignal.set({
        unlockedBadges: { ...currentState.unlockedBadges, ...newUnlockedBadges },
      });
      this.saveState();
    }
  }

  /**
   * Check for new badge unlocks after a play event.
   * Emits badgeUnlocked$ for newly unlocked badges.
   */
  checkForNewUnlocks(releases: Release[]): BadgeDefinition[] {
    const progress = this.calculateAllProgress(releases);
    const currentState = this.stateSignal();
    const newlyUnlocked: BadgeDefinition[] = [];
    const newUnlockedBadges: Record<string, string> = {};

    for (const badge of progress) {
      if (badge.isUnlocked && !currentState.unlockedBadges[badge.badge.id]) {
        newUnlockedBadges[badge.badge.id] = new Date().toISOString();
        newlyUnlocked.push(badge.badge);
      }
    }

    if (newlyUnlocked.length > 0) {
      this.stateSignal.set({
        unlockedBadges: { ...currentState.unlockedBadges, ...newUnlockedBadges },
      });
      this.saveState();
      this.badgeUnlocked$.next(newlyUnlocked);
    }

    return newlyUnlocked;
  }

  /**
   * Calculate progress for all badges given current release data.
   */
  calculateAllProgress(releases: Release[]): BadgeProgress[] {
    const stats = this.calculateStats(releases);
    const state = this.stateSignal();

    return BADGE_DEFINITIONS.map((badge) => {
      const { current, required } = this.getBadgeProgress(badge, stats);
      const isUnlocked = current >= required || !!state.unlockedBadges[badge.id];
      const unlockedAt = state.unlockedBadges[badge.id]
        ? new Date(state.unlockedBadges[badge.id])
        : undefined;

      return {
        badge,
        isUnlocked,
        current,
        required,
        unlockedAt,
      };
    });
  }

  /**
   * Get progress for a specific badge.
   */
  getBadgeProgress(
    badge: BadgeDefinition,
    stats: CollectionAchievementStats,
  ): { current: number; required: number } {
    const required = badge.requirement;
    let current = 0;

    switch (badge.id) {
      // Collection badges
      case 'starter':
      case 'collector':
      case 'archivist':
        current = stats.totalReleases;
        break;

      // Play count badges
      case 'century':
      case 'devoted':
      case 'obsessed':
        current = stats.totalPlays;
        break;

      // Coverage badge (percentage)
      case 'no-dust':
        current = stats.coveragePercentage;
        break;

      // Discovery badges
      case 'genre-explorer':
        current = stats.uniqueGenresPlayed;
        break;
      case 'decade-hopper':
        current = stats.uniqueDecadesPlayed;
        break;

      // Artist dedication badges
      case 'fan':
      case 'superfan':
      case 'fanatic':
        current = stats.maxArtistPlays;
        break;

      // Album replay badges
      case 'on-repeat':
      case 'worn-grooves':
      case 'needle-dropper':
        current = stats.maxAlbumPlays;
        break;
    }

    return { current, required };
  }

  /**
   * Check if a specific badge is unlocked.
   */
  isBadgeUnlocked(badgeId: BadgeId): boolean {
    return !!this.stateSignal().unlockedBadges[badgeId];
  }

  /**
   * Get unlock date for a badge (if unlocked).
   */
  getUnlockDate(badgeId: BadgeId): Date | undefined {
    const timestamp = this.stateSignal().unlockedBadges[badgeId];
    return timestamp ? new Date(timestamp) : undefined;
  }

  /**
   * Calculate all stats needed for badge evaluation.
   */
  private calculateStats(releases: Release[]): CollectionAchievementStats {
    const totalReleases = releases.length;
    let totalPlays = 0;
    let playedCount = 0;
    let maxAlbumPlays = 0;

    const genresPlayed = new Set<string>();
    const decadesPlayed = new Set<string>();
    const artistPlayCounts = new Map<string, number>();

    for (const release of releases) {
      const playCount = release.playCount;
      totalPlays += playCount;

      if (playCount > 0) {
        playedCount++;

        // Track max album plays
        if (playCount > maxAlbumPlays) {
          maxAlbumPlays = playCount;
        }

        // Track genres played
        if (release.basicInfo.genres) {
          for (const genre of release.basicInfo.genres) {
            genresPlayed.add(genre);
          }
        }

        // Track decades played (prefer originalYear, fall back to year)
        const year = release.basicInfo.originalYear || release.basicInfo.year;
        if (year) {
          const decade = this.getDecade(year);
          decadesPlayed.add(decade);
        }

        // Track artist play counts
        if (release.basicInfo.artists) {
          for (const artist of release.basicInfo.artists) {
            const currentCount = artistPlayCounts.get(artist) || 0;
            artistPlayCounts.set(artist, currentCount + playCount);
          }
        }
      }
    }

    // Find max artist plays
    let maxArtistPlays = 0;
    for (const count of artistPlayCounts.values()) {
      if (count > maxArtistPlays) {
        maxArtistPlays = count;
      }
    }

    // Calculate coverage percentage
    const coveragePercentage =
      totalReleases > 0 ? Math.round((playedCount / totalReleases) * 100) : 0;

    return {
      totalReleases,
      totalPlays,
      playedCount,
      coveragePercentage,
      uniqueGenresPlayed: genresPlayed.size,
      uniqueDecadesPlayed: decadesPlayed.size,
      maxArtistPlays,
      maxAlbumPlays,
    };
  }

  /**
   * Get the decade string for a year (e.g., 1985 -> "1980s").
   * Reuses logic from filter.service.ts.
   */
  private getDecade(year: number): string {
    const decade = Math.floor(year / 10) * 10;
    return `${decade}s`;
  }

  /**
   * Load state from localStorage.
   */
  private loadState(): AchievementsState {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_ACHIEVEMENTS_STATE, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Failed to load achievements:', error);
    }
    return { ...DEFAULT_ACHIEVEMENTS_STATE };
  }

  /**
   * Save state to localStorage.
   */
  private saveState(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.stateSignal()));
    } catch (error) {
      console.error('Failed to save achievements:', error);
    }
  }
}

/** Internal interface for calculated stats */
interface CollectionAchievementStats {
  totalReleases: number;
  totalPlays: number;
  playedCount: number;
  coveragePercentage: number;
  uniqueGenresPlayed: number;
  uniqueDecadesPlayed: number;
  maxArtistPlays: number;
  maxAlbumPlays: number;
}

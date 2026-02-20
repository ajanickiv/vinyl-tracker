import { Injectable, signal, computed } from '@angular/core';
import { Subject } from 'rxjs';
import {
  AchievementsState,
  BadgeDefinition,
  BadgeId,
  BadgeProgress,
  BadgeUnlockData,
  BADGE_DEFINITIONS,
  DEFAULT_ACHIEVEMENTS_STATE,
  TierConfig,
  TierLevel,
  CoverageTierLevel,
  isTieredBadge,
} from './achievement.model';
import { Release } from '../../shared/models/release.model';

const STORAGE_KEY = 'vinyl-tracker-achievements';

/** Event emitted when a badge is unlocked or upgraded */
export interface BadgeUnlockEvent {
  badge: BadgeDefinition;
  tier?: TierConfig;
  isUpgrade: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class AchievementsService {
  private stateSignal = signal<AchievementsState>(this.loadState());

  /** Read-only access to achievements state */
  readonly state = this.stateSignal.asReadonly();

  /** Computed count of unlocked badges (counts unique badges, not tiers) */
  readonly unlockedCount = computed(() => {
    return Object.keys(this.stateSignal().unlockedBadges).length;
  });

  /** Emits when badges are unlocked or upgraded (not including retroactive unlocks) */
  readonly badgeUnlocked$ = new Subject<BadgeUnlockEvent[]>();

  constructor() {}

  /**
   * Initialize achievements with existing release data.
   * Called on app startup to handle retroactive badge unlocks.
   * Does NOT emit badgeUnlocked$ for retroactive unlocks.
   */
  initialize(releases: Release[]): void {
    const progress = this.calculateAllProgress(releases);
    const currentState = this.stateSignal();
    const updatedBadges: Record<string, BadgeUnlockData> = { ...currentState.unlockedBadges };
    let hasChanges = false;

    for (const badgeProgress of progress) {
      if (!badgeProgress.isUnlocked) continue;

      const badgeId = badgeProgress.badge.id;
      const existingData = currentState.unlockedBadges[badgeId];
      const currentTier = badgeProgress.currentTier;

      if (!existingData) {
        // New badge unlock (retroactive)
        updatedBadges[badgeId] = {
          firstUnlockedAt: new Date().toISOString(),
          highestTier: currentTier?.level,
          lastUpgradeAt: currentTier ? new Date().toISOString() : undefined,
        };
        hasChanges = true;
      } else if (currentTier && this.isHigherTier(currentTier.level, existingData.highestTier)) {
        // Tier upgrade (retroactive)
        updatedBadges[badgeId] = {
          ...existingData,
          highestTier: currentTier.level,
          lastUpgradeAt: new Date().toISOString(),
        };
        hasChanges = true;
      }
    }

    if (hasChanges) {
      this.stateSignal.set({ unlockedBadges: updatedBadges });
      this.saveState();
    }
  }

  /**
   * Check for new badge unlocks or tier upgrades after a play event.
   * Emits badgeUnlocked$ for newly unlocked badges or tier upgrades.
   */
  checkForNewUnlocks(releases: Release[]): BadgeUnlockEvent[] {
    const progress = this.calculateAllProgress(releases);
    const currentState = this.stateSignal();
    const newEvents: BadgeUnlockEvent[] = [];
    const updatedBadges: Record<string, BadgeUnlockData> = { ...currentState.unlockedBadges };

    for (const badgeProgress of progress) {
      if (!badgeProgress.isUnlocked) continue;

      const badgeId = badgeProgress.badge.id;
      const existingData = currentState.unlockedBadges[badgeId];
      const currentTier = badgeProgress.currentTier;

      if (!existingData) {
        // New badge unlock
        updatedBadges[badgeId] = {
          firstUnlockedAt: new Date().toISOString(),
          highestTier: currentTier?.level,
          lastUpgradeAt: currentTier ? new Date().toISOString() : undefined,
        };
        newEvents.push({
          badge: badgeProgress.badge,
          tier: currentTier,
          isUpgrade: false,
        });
      } else if (currentTier && this.isHigherTier(currentTier.level, existingData.highestTier)) {
        // Tier upgrade
        updatedBadges[badgeId] = {
          ...existingData,
          highestTier: currentTier.level,
          lastUpgradeAt: new Date().toISOString(),
        };
        newEvents.push({
          badge: badgeProgress.badge,
          tier: currentTier,
          isUpgrade: true,
        });
      }
    }

    if (newEvents.length > 0) {
      this.stateSignal.set({ unlockedBadges: updatedBadges });
      this.saveState();
      this.badgeUnlocked$.next(newEvents);
    }

    return newEvents;
  }

  /**
   * Calculate progress for all badges given current release data.
   */
  calculateAllProgress(releases: Release[]): BadgeProgress[] {
    const stats = this.calculateStats(releases);
    const state = this.stateSignal();

    return BADGE_DEFINITIONS.map((badge) => {
      const currentValue = this.getBadgeCurrentValue(badge.id, stats);

      if (isTieredBadge(badge)) {
        return this.calculateTieredBadgeProgress(badge, currentValue, state);
      } else {
        return this.calculateSimpleBadgeProgress(badge, currentValue, state);
      }
    });
  }

  /**
   * Check if a specific badge is unlocked (has at least first tier).
   */
  isBadgeUnlocked(badgeId: BadgeId): boolean {
    return !!this.stateSignal().unlockedBadges[badgeId];
  }

  /**
   * Get unlock data for a badge (if unlocked).
   */
  getBadgeUnlockData(badgeId: BadgeId): BadgeUnlockData | undefined {
    return this.stateSignal().unlockedBadges[badgeId];
  }

  /**
   * Get unlock date for a badge (if unlocked).
   */
  getUnlockDate(badgeId: BadgeId): Date | undefined {
    const data = this.stateSignal().unlockedBadges[badgeId];
    return data ? new Date(data.firstUnlockedAt) : undefined;
  }

  /**
   * Calculate progress for a tiered badge.
   */
  private calculateTieredBadgeProgress(
    badge: BadgeDefinition,
    currentValue: number,
    state: AchievementsState,
  ): BadgeProgress {
    const tiers = badge.tiers!;
    const unlockData = state.unlockedBadges[badge.id];

    // Find current and next tier based on current value
    let currentTier: TierConfig | undefined;
    let nextTier: TierConfig | undefined;

    for (let i = 0; i < tiers.length; i++) {
      if (currentValue >= tiers[i].threshold) {
        currentTier = tiers[i];
        nextTier = tiers[i + 1];
      }
    }

    // If no tier reached yet, next tier is the first one
    if (!currentTier) {
      nextTier = tiers[0];
    }

    const isUnlocked = !!currentTier || !!unlockData;
    const required = nextTier?.threshold ?? currentTier?.threshold ?? tiers[0].threshold;

    return {
      badge,
      isUnlocked,
      current: currentValue,
      required,
      currentTier,
      nextTier,
      unlockedAt: unlockData ? new Date(unlockData.firstUnlockedAt) : undefined,
    };
  }

  /**
   * Calculate progress for a simple (non-tiered) badge.
   */
  private calculateSimpleBadgeProgress(
    badge: BadgeDefinition,
    currentValue: number,
    state: AchievementsState,
  ): BadgeProgress {
    const required = badge.requirement ?? 0;
    const unlockData = state.unlockedBadges[badge.id];
    const isUnlocked = currentValue >= required || !!unlockData;

    return {
      badge,
      isUnlocked,
      current: currentValue,
      required,
      unlockedAt: unlockData ? new Date(unlockData.firstUnlockedAt) : undefined,
    };
  }

  /**
   * Get current value for a badge based on stats.
   */
  private getBadgeCurrentValue(badgeId: BadgeId, stats: CollectionAchievementStats): number {
    switch (badgeId) {
      case 'collector':
        return stats.totalReleases;
      case 'spins':
        return stats.totalPlays;
      case 'coverage':
        return stats.coveragePercentage;
      case 'genre-explorer':
        return stats.uniqueGenresPlayed;
      case 'decade-hopper':
        return stats.uniqueDecadesPlayed;
      case 'devotion':
        return stats.maxArtistPlays;
      case 'favorite':
        return stats.maxAlbumPlays;
      default:
        return 0;
    }
  }

  /**
   * Check if newTier is higher than existingTier.
   */
  private isHigherTier(
    newTier: TierLevel | CoverageTierLevel,
    existingTier?: TierLevel | CoverageTierLevel,
  ): boolean {
    if (!existingTier) return true;

    // Standard tier order
    const standardOrder: TierLevel[] = [
      'bronze',
      'silver',
      'gold',
      'platinum',
      'diamond',
      'legendary',
    ];

    // Coverage tier order
    const coverageOrder: CoverageTierLevel[] = [
      'needle-drop',
      'flip-side',
      'inner-groove',
      'mint-condition',
    ];

    const standardNewIdx = standardOrder.indexOf(newTier as TierLevel);
    const standardExistingIdx = standardOrder.indexOf(existingTier as TierLevel);

    if (standardNewIdx !== -1 && standardExistingIdx !== -1) {
      return standardNewIdx > standardExistingIdx;
    }

    const coverageNewIdx = coverageOrder.indexOf(newTier as CoverageTierLevel);
    const coverageExistingIdx = coverageOrder.indexOf(existingTier as CoverageTierLevel);

    if (coverageNewIdx !== -1 && coverageExistingIdx !== -1) {
      return coverageNewIdx > coverageExistingIdx;
    }

    return false;
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
        const parsed = JSON.parse(stored);
        // Migrate old format (string timestamps) to new format (BadgeUnlockData)
        const migrated = this.migrateState(parsed);
        return { ...DEFAULT_ACHIEVEMENTS_STATE, ...migrated };
      }
    } catch (error) {
      console.error('Failed to load achievements:', error);
    }
    return { ...DEFAULT_ACHIEVEMENTS_STATE };
  }

  /**
   * Migrate old state format to new format.
   * Old format: { unlockedBadges: { badgeId: "timestamp" } }
   * New format: { unlockedBadges: { badgeId: BadgeUnlockData } }
   */
  private migrateState(state: AchievementsState): AchievementsState {
    const migratedBadges: Record<string, BadgeUnlockData> = {};

    for (const [badgeId, data] of Object.entries(state.unlockedBadges)) {
      if (typeof data === 'string') {
        // Old format - migrate to new format
        migratedBadges[badgeId] = {
          firstUnlockedAt: data,
        };
      } else {
        // Already new format
        migratedBadges[badgeId] = data;
      }
    }

    return { unlockedBadges: migratedBadges };
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

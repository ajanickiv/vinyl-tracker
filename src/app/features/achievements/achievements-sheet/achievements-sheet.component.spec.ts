import { createComponentFactory, Spectator, mockProvider } from '@ngneat/spectator/jest';
import { signal } from '@angular/core';
import { Subject } from 'rxjs';
import { AchievementsSheetComponent } from './achievements-sheet.component';
import { AchievementsService } from '../achievements.service';
import { DatabaseService } from '../../../core/database.service';
import { PlaybackService } from '../../player/playback.service';
import { BadgeProgress, BADGE_DEFINITIONS } from '../achievement.model';

describe('AchievementsSheetComponent', () => {
  let spectator: Spectator<AchievementsSheetComponent>;
  let statsUpdated$: Subject<void>;

  // Create mock badges using first 3 from definitions (collector, spins, coverage)
  const mockBadgeProgress: BadgeProgress[] = BADGE_DEFINITIONS.slice(0, 3).map((badge, index) => ({
    badge,
    isUnlocked: index === 0, // First badge (collector) is unlocked
    current: index === 0 ? 10 : 5,
    required: badge.tiers ? badge.tiers[0].threshold : (badge.requirement ?? 0),
    currentTier: index === 0 ? badge.tiers?.[0] : undefined, // Bronze tier for collector
    nextTier: index === 0 ? badge.tiers?.[1] : badge.tiers?.[0], // Next tier
  }));

  const createComponent = createComponentFactory({
    component: AchievementsSheetComponent,
    providers: [
      mockProvider(AchievementsService, {
        calculateAllProgress: jest.fn().mockReturnValue(mockBadgeProgress),
      }),
      mockProvider(DatabaseService, {
        getAllReleases: jest.fn().mockResolvedValue([]),
      }),
      {
        provide: PlaybackService,
        useFactory: () => {
          statsUpdated$ = new Subject<void>();
          return {
            statsUpdated$,
          };
        },
      },
    ],
  });

  beforeEach(() => {
    spectator = createComponent({
      props: {
        isOpen: signal(false),
      } as any,
    });
  });

  it('should create', () => {
    expect(spectator.component).toBeTruthy();
  });

  it('should load badges on init', async () => {
    const dbService = spectator.inject(DatabaseService);
    const achievementsService = spectator.inject(AchievementsService);

    await spectator.component.ngOnInit();

    expect(dbService.getAllReleases).toHaveBeenCalled();
    expect(achievementsService.calculateAllProgress).toHaveBeenCalled();
  });

  it('should display loading state initially', () => {
    spectator.component.isLoading.set(true);
    spectator.detectChanges();

    expect(spectator.query('.loading-state')).toBeTruthy();
  });

  it('should display badges after loading', async () => {
    spectator.component.badges.set(mockBadgeProgress);
    spectator.component.isLoading.set(false);
    spectator.detectChanges();

    expect(spectator.queryAll('.badge-item').length).toBe(3);
  });

  it('should show unlocked state for earned badges', () => {
    spectator.component.badges.set(mockBadgeProgress);
    spectator.component.isLoading.set(false);
    spectator.detectChanges();

    const unlockedBadges = spectator.queryAll('.badge-item.unlocked');
    expect(unlockedBadges.length).toBe(1);
  });

  it('should show locked state for unearned badges', () => {
    spectator.component.badges.set(mockBadgeProgress);
    spectator.component.isLoading.set(false);
    spectator.detectChanges();

    const lockedBadges = spectator.queryAll('.badge-item.locked');
    expect(lockedBadges.length).toBe(2);
  });

  it('should show progress bar for locked badges', () => {
    spectator.component.badges.set(mockBadgeProgress);
    spectator.component.isLoading.set(false);
    spectator.detectChanges();

    const progressBars = spectator.queryAll('.progress-bar');
    // All badges show progress bars (unlocked with nextTier + locked)
    expect(progressBars.length).toBe(3);
  });

  it('should emit close when backdrop clicked', () => {
    const closeSpy = jest.spyOn(spectator.component.close, 'emit');
    spectator.component.onBackdropClick();
    expect(closeSpy).toHaveBeenCalled();
  });

  it('should calculate unlocked count correctly', () => {
    spectator.component.badges.set(mockBadgeProgress);
    expect(spectator.component.unlockedCount()).toBe(1);
  });

  it('should calculate total count correctly', () => {
    spectator.component.badges.set(mockBadgeProgress);
    expect(spectator.component.totalCount()).toBe(3);
  });

  it('should calculate progress percentage for locked tiered badge', () => {
    const lockedBadge: BadgeProgress = {
      badge: BADGE_DEFINITIONS[0], // collector
      isUnlocked: false,
      current: 5,
      required: 10,
      nextTier: { level: 'bronze', threshold: 10, name: 'Bronze' },
    };

    expect(spectator.component.getProgressPercentage(lockedBadge)).toBe(50);
  });

  it('should calculate progress to next tier for unlocked badge', () => {
    const unlockedBadge: BadgeProgress = {
      badge: BADGE_DEFINITIONS[0], // collector
      isUnlocked: true,
      current: 30,
      required: 50,
      currentTier: { level: 'bronze', threshold: 10, name: 'Bronze' },
      nextTier: { level: 'silver', threshold: 50, name: 'Silver' },
    };

    // Progress from bronze (10) to silver (50) = 30-10 / 50-10 = 20/40 = 50%
    expect(spectator.component.getProgressPercentage(unlockedBadge)).toBe(50);
  });

  it('should return 100% for max tier badges', () => {
    const maxTierBadge: BadgeProgress = {
      badge: BADGE_DEFINITIONS[0],
      isUnlocked: true,
      current: 2500,
      required: 2500,
      currentTier: { level: 'legendary', threshold: 2500, name: 'Legendary' },
      // No nextTier means max tier
    };

    expect(spectator.component.getProgressPercentage(maxTierBadge)).toBe(100);
  });

  it('should format progress text showing next tier target', () => {
    const lockedBadge: BadgeProgress = {
      badge: BADGE_DEFINITIONS[0],
      isUnlocked: false,
      current: 5,
      required: 10,
      nextTier: { level: 'bronze', threshold: 10, name: 'Bronze' },
    };

    expect(spectator.component.formatProgress(lockedBadge)).toBe('5/10');
  });

  it('should format max tier badge correctly', () => {
    const maxTierBadge: BadgeProgress = {
      badge: BADGE_DEFINITIONS[0],
      isUnlocked: true,
      current: 2500,
      required: 2500,
      currentTier: { level: 'legendary', threshold: 2500, name: 'Legendary' },
    };

    expect(spectator.component.formatProgress(maxTierBadge)).toBe('Max: Legendary');
  });

  it('should refresh badges when stats update', () => {
    const dbService = spectator.inject(DatabaseService);
    const callsBefore = (dbService.getAllReleases as jest.Mock).mock.calls.length;

    statsUpdated$.next();

    const callsAfter = (dbService.getAllReleases as jest.Mock).mock.calls.length;
    expect(callsAfter).toBe(callsBefore + 1);
  });

  it('should display empty state when no badges', () => {
    spectator.component.badges.set([]);
    spectator.component.isLoading.set(false);
    spectator.detectChanges();

    expect(spectator.query('.empty-state')).toBeTruthy();
  });

  it('should display header with progress count', () => {
    spectator.component.badges.set(mockBadgeProgress);
    spectator.component.isLoading.set(false);
    spectator.detectChanges();

    const headerProgress = spectator.query('.header-progress');
    expect(headerProgress?.textContent).toContain('1/3');
  });

  it('should identify tiered badges correctly', () => {
    expect(spectator.component.isTiered(mockBadgeProgress[0])).toBe(true); // collector
    expect(spectator.component.isTiered(mockBadgeProgress[1])).toBe(true); // spins
  });

  it('should get tier name for unlocked tiered badge', () => {
    const unlockedWithTier: BadgeProgress = {
      badge: BADGE_DEFINITIONS[0],
      isUnlocked: true,
      current: 10,
      required: 50,
      currentTier: { level: 'bronze', threshold: 10, name: 'Bronze' },
      nextTier: { level: 'silver', threshold: 50, name: 'Silver' },
    };

    expect(spectator.component.getTierName(unlockedWithTier)).toBe('Bronze');
  });

  it('should identify max tier badges', () => {
    const maxTierBadge: BadgeProgress = {
      badge: BADGE_DEFINITIONS[0],
      isUnlocked: true,
      current: 2500,
      required: 2500,
      currentTier: { level: 'legendary', threshold: 2500, name: 'Legendary' },
    };

    expect(spectator.component.isMaxTier(maxTierBadge)).toBe(true);
  });
});

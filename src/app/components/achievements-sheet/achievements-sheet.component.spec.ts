import { createComponentFactory, Spectator, mockProvider } from '@ngneat/spectator/jest';
import { signal } from '@angular/core';
import { Subject } from 'rxjs';
import { AchievementsSheetComponent } from './achievements-sheet.component';
import { AchievementsService } from '../../services/achievements.service';
import { DatabaseService } from '../../services/database.service';
import { PlaybackService } from '../../services/playback.service';
import { BadgeProgress, BADGE_DEFINITIONS } from '../../models/achievement.model';

describe('AchievementsSheetComponent', () => {
  let spectator: Spectator<AchievementsSheetComponent>;
  let statsUpdated$: Subject<void>;

  const mockBadgeProgress: BadgeProgress[] = BADGE_DEFINITIONS.slice(0, 3).map((badge) => ({
    badge,
    isUnlocked: badge.id === 'starter',
    current: badge.id === 'starter' ? 10 : 5,
    required: badge.requirement,
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
    expect(progressBars.length).toBe(2);
  });

  it('should emit close when backdrop clicked', () => {
    const closeSpy = jest.spyOn(spectator.component.close, 'emit');
    spectator.component.onBackdropClick();
    expect(closeSpy).toHaveBeenCalled();
  });

  it('should calculate unlocked count correctly', () => {
    spectator.component.badges.set(mockBadgeProgress);
    expect(spectator.component.getUnlockedCount()).toBe(1);
  });

  it('should calculate total count correctly', () => {
    spectator.component.badges.set(mockBadgeProgress);
    expect(spectator.component.getTotalCount()).toBe(3);
  });

  it('should calculate progress percentage correctly', () => {
    const lockedBadge: BadgeProgress = {
      badge: BADGE_DEFINITIONS[1], // collector (50 requirement)
      isUnlocked: false,
      current: 25,
      required: 50,
    };

    expect(spectator.component.getProgressPercentage(lockedBadge)).toBe(50);
  });

  it('should return 100% for unlocked badges', () => {
    const unlockedBadge: BadgeProgress = {
      badge: BADGE_DEFINITIONS[0],
      isUnlocked: true,
      current: 10,
      required: 10,
    };

    expect(spectator.component.getProgressPercentage(unlockedBadge)).toBe(100);
  });

  it('should format progress text correctly', () => {
    const lockedBadge: BadgeProgress = {
      badge: BADGE_DEFINITIONS[1],
      isUnlocked: false,
      current: 25,
      required: 50,
    };

    expect(spectator.component.formatProgress(lockedBadge)).toBe('25/50');
  });

  it('should format unlocked badge as "Unlocked"', () => {
    const unlockedBadge: BadgeProgress = {
      badge: BADGE_DEFINITIONS[0],
      isUnlocked: true,
      current: 10,
      required: 10,
    };

    expect(spectator.component.formatProgress(unlockedBadge)).toBe('Unlocked');
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
});

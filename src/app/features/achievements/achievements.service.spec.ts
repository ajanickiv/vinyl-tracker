import { TestBed } from '@angular/core/testing';
import { AchievementsService, BadgeUnlockEvent } from './achievements.service';
import { Release } from '../../shared/models/release.model';

describe('AchievementsService', () => {
  let service: AchievementsService;

  const createMockRelease = (overrides: Partial<Release> = {}): Release => ({
    id: Math.floor(Math.random() * 100000),
    instanceId: Math.floor(Math.random() * 100000),
    playCount: 0,
    dateAdded: new Date(),
    basicInfo: {
      title: 'Test Album',
      artists: ['Test Artist'],
      year: 2020,
      formats: ['Vinyl'],
      genres: ['Rock'],
      ...overrides.basicInfo,
    },
    ...overrides,
  });

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    service = TestBed.inject(AchievementsService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Collector badge (tiered)', () => {
    it('should unlock Bronze tier at 10 albums', () => {
      const releases = Array.from({ length: 10 }, () => createMockRelease());
      const progress = service.calculateAllProgress(releases);

      const collector = progress.find((p) => p.badge.id === 'collector');
      expect(collector?.current).toBe(10);
      expect(collector?.isUnlocked).toBe(true);
      expect(collector?.currentTier?.level).toBe('bronze');
      expect(collector?.nextTier?.level).toBe('silver');
    });

    it('should not unlock with 9 albums', () => {
      const releases = Array.from({ length: 9 }, () => createMockRelease());
      const progress = service.calculateAllProgress(releases);

      const collector = progress.find((p) => p.badge.id === 'collector');
      expect(collector?.current).toBe(9);
      expect(collector?.isUnlocked).toBe(false);
      expect(collector?.currentTier).toBeUndefined();
      expect(collector?.nextTier?.level).toBe('bronze');
    });

    it('should unlock Silver tier at 50 albums', () => {
      const releases = Array.from({ length: 50 }, () => createMockRelease());
      const progress = service.calculateAllProgress(releases);

      const collector = progress.find((p) => p.badge.id === 'collector');
      expect(collector?.currentTier?.level).toBe('silver');
      expect(collector?.nextTier?.level).toBe('gold');
    });

    it('should unlock Gold tier at 100 albums', () => {
      const releases = Array.from({ length: 100 }, () => createMockRelease());
      const progress = service.calculateAllProgress(releases);

      const collector = progress.find((p) => p.badge.id === 'collector');
      expect(collector?.currentTier?.level).toBe('gold');
    });

    it('should unlock Legendary tier at 2500 albums', () => {
      const releases = Array.from({ length: 2500 }, () => createMockRelease());
      const progress = service.calculateAllProgress(releases);

      const collector = progress.find((p) => p.badge.id === 'collector');
      expect(collector?.currentTier?.level).toBe('legendary');
      expect(collector?.nextTier).toBeUndefined();
    });
  });

  describe('Spins badge (tiered)', () => {
    it('should unlock Bronze tier at 100 total plays', () => {
      const releases = [createMockRelease({ playCount: 50 }), createMockRelease({ playCount: 50 })];
      const progress = service.calculateAllProgress(releases);

      const spins = progress.find((p) => p.badge.id === 'spins');
      expect(spins?.current).toBe(100);
      expect(spins?.isUnlocked).toBe(true);
      expect(spins?.currentTier?.level).toBe('bronze');
    });

    it('should unlock Silver tier at 500 total plays', () => {
      const releases = [createMockRelease({ playCount: 500 })];
      const progress = service.calculateAllProgress(releases);

      const spins = progress.find((p) => p.badge.id === 'spins');
      expect(spins?.currentTier?.level).toBe('silver');
    });

    it('should unlock Legendary tier at 10000 total plays', () => {
      const releases = [createMockRelease({ playCount: 10000 })];
      const progress = service.calculateAllProgress(releases);

      const spins = progress.find((p) => p.badge.id === 'spins');
      expect(spins?.currentTier?.level).toBe('legendary');
      expect(spins?.nextTier).toBeUndefined();
    });
  });

  describe('Coverage badge (vinyl-themed tiers)', () => {
    it('should unlock Needle Drop tier at 25% coverage', () => {
      const releases = [
        createMockRelease({ playCount: 1 }),
        createMockRelease({ playCount: 0 }),
        createMockRelease({ playCount: 0 }),
        createMockRelease({ playCount: 0 }),
      ];
      const progress = service.calculateAllProgress(releases);

      const coverage = progress.find((p) => p.badge.id === 'coverage');
      expect(coverage?.current).toBe(25);
      expect(coverage?.isUnlocked).toBe(true);
      expect(coverage?.currentTier?.level).toBe('needle-drop');
      expect(coverage?.currentTier?.name).toBe('Needle Drop');
    });

    it('should unlock Flip Side tier at 50% coverage', () => {
      const releases = [
        createMockRelease({ playCount: 1 }),
        createMockRelease({ playCount: 1 }),
        createMockRelease({ playCount: 0 }),
        createMockRelease({ playCount: 0 }),
      ];
      const progress = service.calculateAllProgress(releases);

      const coverage = progress.find((p) => p.badge.id === 'coverage');
      expect(coverage?.currentTier?.level).toBe('flip-side');
      expect(coverage?.currentTier?.name).toBe('Flip Side');
    });

    it('should unlock Inner Groove tier at 75% coverage', () => {
      const releases = [
        createMockRelease({ playCount: 1 }),
        createMockRelease({ playCount: 1 }),
        createMockRelease({ playCount: 1 }),
        createMockRelease({ playCount: 0 }),
      ];
      const progress = service.calculateAllProgress(releases);

      const coverage = progress.find((p) => p.badge.id === 'coverage');
      expect(coverage?.currentTier?.level).toBe('inner-groove');
      expect(coverage?.currentTier?.name).toBe('Inner Groove');
    });

    it('should unlock Mint Condition tier at 100% coverage', () => {
      const releases = [
        createMockRelease({ playCount: 1 }),
        createMockRelease({ playCount: 1 }),
        createMockRelease({ playCount: 1 }),
      ];
      const progress = service.calculateAllProgress(releases);

      const coverage = progress.find((p) => p.badge.id === 'coverage');
      expect(coverage?.current).toBe(100);
      expect(coverage?.currentTier?.level).toBe('mint-condition');
      expect(coverage?.currentTier?.name).toBe('Mint Condition');
      expect(coverage?.nextTier).toBeUndefined();
    });

    it('should not unlock with no plays', () => {
      const releases = [createMockRelease({ playCount: 0 }), createMockRelease({ playCount: 0 })];
      const progress = service.calculateAllProgress(releases);

      const coverage = progress.find((p) => p.badge.id === 'coverage');
      expect(coverage?.current).toBe(0);
      expect(coverage?.isUnlocked).toBe(false);
    });
  });

  describe('Discovery badges (non-tiered)', () => {
    it('should unlock Genre Explorer badge with 5+ genres played', () => {
      const genres = ['Rock', 'Jazz', 'Electronic', 'Hip Hop', 'Classical'];
      const releases = genres.map((genre) =>
        createMockRelease({
          playCount: 1,
          basicInfo: { title: 'Test', artists: ['Artist'], genres: [genre], formats: [] },
        }),
      );
      const progress = service.calculateAllProgress(releases);

      const genreExplorer = progress.find((p) => p.badge.id === 'genre-explorer');
      expect(genreExplorer?.current).toBe(5);
      expect(genreExplorer?.isUnlocked).toBe(true);
      expect(genreExplorer?.currentTier).toBeUndefined(); // Non-tiered badge
    });

    it('should not count unplayed albums for Genre Explorer', () => {
      const genres = ['Rock', 'Jazz', 'Electronic', 'Hip Hop', 'Classical'];
      const releases = genres.map((genre) =>
        createMockRelease({
          playCount: 0,
          basicInfo: { title: 'Test', artists: ['Artist'], genres: [genre], formats: [] },
        }),
      );
      const progress = service.calculateAllProgress(releases);

      const genreExplorer = progress.find((p) => p.badge.id === 'genre-explorer');
      expect(genreExplorer?.current).toBe(0);
      expect(genreExplorer?.isUnlocked).toBe(false);
    });

    it('should unlock Decade Hopper badge with 5+ decades played', () => {
      const years = [1970, 1980, 1990, 2000, 2010];
      const releases = years.map((year) =>
        createMockRelease({
          playCount: 1,
          basicInfo: { title: 'Test', artists: ['Artist'], year, formats: [] },
        }),
      );
      const progress = service.calculateAllProgress(releases);

      const decadeHopper = progress.find((p) => p.badge.id === 'decade-hopper');
      expect(decadeHopper?.current).toBe(5);
      expect(decadeHopper?.isUnlocked).toBe(true);
    });

    it('should prefer originalYear for decade calculation', () => {
      const releases = [
        createMockRelease({
          playCount: 1,
          basicInfo: {
            title: 'Test',
            artists: ['Artist'],
            year: 2020,
            originalYear: 1975,
            formats: [],
          },
        }),
      ];
      const progress = service.calculateAllProgress(releases);

      const decadeHopper = progress.find((p) => p.badge.id === 'decade-hopper');
      // Should count as 1970s, not 2020s
      expect(decadeHopper?.current).toBe(1);
    });
  });

  describe('Devotion badge (tiered - artist dedication)', () => {
    it('should unlock Bronze tier with 10 plays of same artist', () => {
      const releases = [
        createMockRelease({
          playCount: 10,
          basicInfo: { title: 'Album 1', artists: ['The Beatles'], formats: [] },
        }),
      ];
      const progress = service.calculateAllProgress(releases);

      const devotion = progress.find((p) => p.badge.id === 'devotion');
      expect(devotion?.current).toBe(10);
      expect(devotion?.isUnlocked).toBe(true);
      expect(devotion?.currentTier?.level).toBe('bronze');
    });

    it('should aggregate plays across multiple albums by same artist', () => {
      const releases = [
        createMockRelease({
          playCount: 5,
          basicInfo: { title: 'Album 1', artists: ['The Beatles'], formats: [] },
        }),
        createMockRelease({
          playCount: 6,
          basicInfo: { title: 'Album 2', artists: ['The Beatles'], formats: [] },
        }),
      ];
      const progress = service.calculateAllProgress(releases);

      const devotion = progress.find((p) => p.badge.id === 'devotion');
      expect(devotion?.current).toBe(11);
      expect(devotion?.isUnlocked).toBe(true);
    });

    it('should unlock Silver tier at 25 artist plays', () => {
      const releases = [
        createMockRelease({
          playCount: 25,
          basicInfo: { title: 'Album 1', artists: ['Artist'], formats: [] },
        }),
      ];
      const progress = service.calculateAllProgress(releases);

      const devotion = progress.find((p) => p.badge.id === 'devotion');
      expect(devotion?.currentTier?.level).toBe('silver');
    });

    it('should unlock Legendary tier at 500 artist plays', () => {
      const releases = [
        createMockRelease({
          playCount: 500,
          basicInfo: { title: 'Album 1', artists: ['Artist'], formats: [] },
        }),
      ];
      const progress = service.calculateAllProgress(releases);

      const devotion = progress.find((p) => p.badge.id === 'devotion');
      expect(devotion?.currentTier?.level).toBe('legendary');
    });
  });

  describe('Favorite badge (tiered - album replay)', () => {
    it('should unlock Bronze tier at 10 plays of same album', () => {
      const releases = [createMockRelease({ playCount: 10 })];
      const progress = service.calculateAllProgress(releases);

      const favorite = progress.find((p) => p.badge.id === 'favorite');
      expect(favorite?.current).toBe(10);
      expect(favorite?.isUnlocked).toBe(true);
      expect(favorite?.currentTier?.level).toBe('bronze');
    });

    it('should unlock Silver tier at 25 plays', () => {
      const releases = [createMockRelease({ playCount: 25 })];
      const progress = service.calculateAllProgress(releases);

      const favorite = progress.find((p) => p.badge.id === 'favorite');
      expect(favorite?.currentTier?.level).toBe('silver');
    });

    it('should unlock Legendary tier at 500 plays', () => {
      const releases = [createMockRelease({ playCount: 500 })];
      const progress = service.calculateAllProgress(releases);

      const favorite = progress.find((p) => p.badge.id === 'favorite');
      expect(favorite?.currentTier?.level).toBe('legendary');
    });
  });

  describe('checkForNewUnlocks', () => {
    it('should emit badgeUnlocked$ when new badge is unlocked', (done) => {
      const releases = Array.from({ length: 10 }, () => createMockRelease());

      service.badgeUnlocked$.subscribe((events: BadgeUnlockEvent[]) => {
        expect(events.length).toBeGreaterThan(0);
        expect(events.some((e) => e.badge.id === 'collector')).toBe(true);
        expect(events[0].isUpgrade).toBe(false);
        done();
      });

      service.checkForNewUnlocks(releases);
    });

    it('should emit for tier upgrades', (done) => {
      // First, unlock Bronze tier
      const releases10 = Array.from({ length: 10 }, () => createMockRelease());
      service.checkForNewUnlocks(releases10);

      // Then, upgrade to Silver tier
      const releases50 = Array.from({ length: 50 }, () => createMockRelease());

      service.badgeUnlocked$.subscribe((events: BadgeUnlockEvent[]) => {
        const collectorEvent = events.find((e) => e.badge.id === 'collector');
        expect(collectorEvent).toBeTruthy();
        expect(collectorEvent?.isUpgrade).toBe(true);
        expect(collectorEvent?.tier?.level).toBe('silver');
        done();
      });

      service.checkForNewUnlocks(releases50);
    });

    it('should not emit for already unlocked badges at same tier', () => {
      const releases = Array.from({ length: 10 }, () => createMockRelease());
      let emitCount = 0;

      service.badgeUnlocked$.subscribe(() => {
        emitCount++;
      });

      // First check unlocks badges
      service.checkForNewUnlocks(releases);
      expect(emitCount).toBe(1);

      // Second check should not emit (same tier)
      service.checkForNewUnlocks(releases);
      expect(emitCount).toBe(1);
    });

    it('should persist unlocked badges to localStorage', () => {
      const releases = Array.from({ length: 10 }, () => createMockRelease());
      service.checkForNewUnlocks(releases);

      const stored = localStorage.getItem('vinyl-tracker-achievements');
      expect(stored).toBeTruthy();
      const state = JSON.parse(stored!);
      expect(state.unlockedBadges['collector']).toBeTruthy();
      expect(state.unlockedBadges['collector'].highestTier).toBe('bronze');
    });
  });

  describe('initialize (retroactive unlocks)', () => {
    it('should unlock earned badges without emitting', () => {
      const releases = Array.from({ length: 10 }, () => createMockRelease());
      let emitCount = 0;

      service.badgeUnlocked$.subscribe(() => {
        emitCount++;
      });

      service.initialize(releases);

      // Should not emit for retroactive unlocks
      expect(emitCount).toBe(0);

      // But badge should be unlocked
      expect(service.isBadgeUnlocked('collector')).toBe(true);
    });

    it('should persist retroactive unlocks with tier info', () => {
      const releases = Array.from({ length: 50 }, () => createMockRelease());
      service.initialize(releases);

      const stored = localStorage.getItem('vinyl-tracker-achievements');
      const state = JSON.parse(stored!);
      expect(state.unlockedBadges['collector'].highestTier).toBe('silver');
    });
  });

  describe('state migration', () => {
    it('should migrate old format (string timestamps) to new format', () => {
      // Old format: { unlockedBadges: { badgeId: "timestamp" } }
      const oldState = {
        unlockedBadges: {
          collector: '2024-01-01T00:00:00.000Z',
        },
      };
      localStorage.setItem('vinyl-tracker-achievements', JSON.stringify(oldState));

      // Reset and recreate service to load from storage
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      const newService = TestBed.inject(AchievementsService);

      expect(newService.isBadgeUnlocked('collector')).toBe(true);
      const unlockDate = newService.getUnlockDate('collector');
      expect(unlockDate?.toISOString()).toBe('2024-01-01T00:00:00.000Z');
    });
  });

  describe('persistence', () => {
    it('should load unlocked badges from localStorage', () => {
      const mockState = {
        unlockedBadges: {
          collector: {
            firstUnlockedAt: '2024-01-01T00:00:00.000Z',
            highestTier: 'bronze',
          },
        },
      };
      localStorage.setItem('vinyl-tracker-achievements', JSON.stringify(mockState));

      // Reset and recreate service to load from storage
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      const newService = TestBed.inject(AchievementsService);

      expect(newService.isBadgeUnlocked('collector')).toBe(true);
      expect(newService.unlockedCount()).toBe(1);
    });

    it('should return unlock date for unlocked badges', () => {
      const mockState = {
        unlockedBadges: {
          collector: {
            firstUnlockedAt: '2024-01-15T10:30:00.000Z',
            highestTier: 'bronze',
          },
        },
      };
      localStorage.setItem('vinyl-tracker-achievements', JSON.stringify(mockState));

      // Reset and recreate service to load from storage
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      const newService = TestBed.inject(AchievementsService);
      const unlockDate = newService.getUnlockDate('collector');

      expect(unlockDate).toBeInstanceOf(Date);
      expect(unlockDate?.toISOString()).toBe('2024-01-15T10:30:00.000Z');
    });

    it('should return undefined for locked badges', () => {
      // Create fresh service with no localStorage data
      localStorage.clear();
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      const freshService = TestBed.inject(AchievementsService);
      expect(freshService.getUnlockDate('collector')).toBeUndefined();
    });
  });

  describe('unlockedCount', () => {
    it('should return 0 when no badges unlocked', () => {
      // Create fresh service with no localStorage data
      localStorage.clear();
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      const freshService = TestBed.inject(AchievementsService);
      expect(freshService.unlockedCount()).toBe(0);
    });

    it('should update when badges are unlocked', () => {
      const releases = Array.from({ length: 10 }, () => createMockRelease());
      service.checkForNewUnlocks(releases);

      expect(service.unlockedCount()).toBeGreaterThan(0);
    });
  });

  describe('badge count', () => {
    it('should have exactly 7 badges defined', () => {
      const releases: Release[] = [];
      const progress = service.calculateAllProgress(releases);
      expect(progress.length).toBe(7);
    });

    it('should have correct badge IDs', () => {
      const releases: Release[] = [];
      const progress = service.calculateAllProgress(releases);
      const badgeIds = progress.map((p) => p.badge.id);

      expect(badgeIds).toContain('collector');
      expect(badgeIds).toContain('spins');
      expect(badgeIds).toContain('coverage');
      expect(badgeIds).toContain('genre-explorer');
      expect(badgeIds).toContain('decade-hopper');
      expect(badgeIds).toContain('devotion');
      expect(badgeIds).toContain('favorite');
    });
  });
});

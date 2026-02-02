import { TestBed } from '@angular/core/testing';
import { AchievementsService } from './achievements.service';
import { Release } from '../models/release.model';

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

  describe('Collection badges', () => {
    it('should unlock Starter badge at 10 albums', () => {
      const releases = Array.from({ length: 10 }, () => createMockRelease());
      const progress = service.calculateAllProgress(releases);

      const starter = progress.find((p) => p.badge.id === 'starter');
      expect(starter?.current).toBe(10);
      expect(starter?.isUnlocked).toBe(true);
    });

    it('should not unlock Starter badge with 9 albums', () => {
      const releases = Array.from({ length: 9 }, () => createMockRelease());
      const progress = service.calculateAllProgress(releases);

      const starter = progress.find((p) => p.badge.id === 'starter');
      expect(starter?.current).toBe(9);
      expect(starter?.isUnlocked).toBe(false);
    });

    it('should unlock Collector badge at 50 albums', () => {
      const releases = Array.from({ length: 50 }, () => createMockRelease());
      const progress = service.calculateAllProgress(releases);

      const collector = progress.find((p) => p.badge.id === 'collector');
      expect(collector?.current).toBe(50);
      expect(collector?.isUnlocked).toBe(true);
    });

    it('should unlock Archivist badge at 100 albums', () => {
      const releases = Array.from({ length: 100 }, () => createMockRelease());
      const progress = service.calculateAllProgress(releases);

      const archivist = progress.find((p) => p.badge.id === 'archivist');
      expect(archivist?.current).toBe(100);
      expect(archivist?.isUnlocked).toBe(true);
    });
  });

  describe('Play count badges', () => {
    it('should unlock Century badge at 100 total plays', () => {
      const releases = [createMockRelease({ playCount: 50 }), createMockRelease({ playCount: 50 })];
      const progress = service.calculateAllProgress(releases);

      const century = progress.find((p) => p.badge.id === 'century');
      expect(century?.current).toBe(100);
      expect(century?.isUnlocked).toBe(true);
    });

    it('should unlock Devoted badge at 500 total plays', () => {
      const releases = [createMockRelease({ playCount: 500 })];
      const progress = service.calculateAllProgress(releases);

      const devoted = progress.find((p) => p.badge.id === 'devoted');
      expect(devoted?.current).toBe(500);
      expect(devoted?.isUnlocked).toBe(true);
    });

    it('should unlock Obsessed badge at 1000 total plays', () => {
      const releases = [createMockRelease({ playCount: 1000 })];
      const progress = service.calculateAllProgress(releases);

      const obsessed = progress.find((p) => p.badge.id === 'obsessed');
      expect(obsessed?.current).toBe(1000);
      expect(obsessed?.isUnlocked).toBe(true);
    });
  });

  describe('Coverage badge', () => {
    it('should unlock No Dust badge when all albums played', () => {
      const releases = [
        createMockRelease({ playCount: 1 }),
        createMockRelease({ playCount: 1 }),
        createMockRelease({ playCount: 1 }),
      ];
      const progress = service.calculateAllProgress(releases);

      const noDust = progress.find((p) => p.badge.id === 'no-dust');
      expect(noDust?.current).toBe(100);
      expect(noDust?.isUnlocked).toBe(true);
    });

    it('should not unlock No Dust badge with unplayed albums', () => {
      const releases = [createMockRelease({ playCount: 1 }), createMockRelease({ playCount: 0 })];
      const progress = service.calculateAllProgress(releases);

      const noDust = progress.find((p) => p.badge.id === 'no-dust');
      expect(noDust?.current).toBe(50);
      expect(noDust?.isUnlocked).toBe(false);
    });
  });

  describe('Discovery badges', () => {
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

  describe('Artist dedication badges', () => {
    it('should unlock Fan badge with 10 plays of same artist', () => {
      const releases = [
        createMockRelease({
          playCount: 10,
          basicInfo: { title: 'Album 1', artists: ['The Beatles'], formats: [] },
        }),
      ];
      const progress = service.calculateAllProgress(releases);

      const fan = progress.find((p) => p.badge.id === 'fan');
      expect(fan?.current).toBe(10);
      expect(fan?.isUnlocked).toBe(true);
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

      const fan = progress.find((p) => p.badge.id === 'fan');
      expect(fan?.current).toBe(11);
      expect(fan?.isUnlocked).toBe(true);
    });

    it('should unlock Superfan badge at 25 artist plays', () => {
      const releases = [
        createMockRelease({
          playCount: 25,
          basicInfo: { title: 'Album 1', artists: ['Artist'], formats: [] },
        }),
      ];
      const progress = service.calculateAllProgress(releases);

      const superfan = progress.find((p) => p.badge.id === 'superfan');
      expect(superfan?.isUnlocked).toBe(true);
    });

    it('should unlock Fanatic badge at 50 artist plays', () => {
      const releases = [
        createMockRelease({
          playCount: 50,
          basicInfo: { title: 'Album 1', artists: ['Artist'], formats: [] },
        }),
      ];
      const progress = service.calculateAllProgress(releases);

      const fanatic = progress.find((p) => p.badge.id === 'fanatic');
      expect(fanatic?.isUnlocked).toBe(true);
    });
  });

  describe('Album replay badges', () => {
    it('should unlock On Repeat badge at 10 plays of same album', () => {
      const releases = [createMockRelease({ playCount: 10 })];
      const progress = service.calculateAllProgress(releases);

      const onRepeat = progress.find((p) => p.badge.id === 'on-repeat');
      expect(onRepeat?.current).toBe(10);
      expect(onRepeat?.isUnlocked).toBe(true);
    });

    it('should unlock Worn Grooves badge at 25 plays', () => {
      const releases = [createMockRelease({ playCount: 25 })];
      const progress = service.calculateAllProgress(releases);

      const wornGrooves = progress.find((p) => p.badge.id === 'worn-grooves');
      expect(wornGrooves?.isUnlocked).toBe(true);
    });

    it('should unlock Needle Dropper badge at 50 plays', () => {
      const releases = [createMockRelease({ playCount: 50 })];
      const progress = service.calculateAllProgress(releases);

      const needleDropper = progress.find((p) => p.badge.id === 'needle-dropper');
      expect(needleDropper?.isUnlocked).toBe(true);
    });
  });

  describe('checkForNewUnlocks', () => {
    it('should emit badgeUnlocked$ when new badge is unlocked', (done) => {
      const releases = Array.from({ length: 10 }, () => createMockRelease());

      service.badgeUnlocked$.subscribe((badges) => {
        expect(badges.length).toBeGreaterThan(0);
        expect(badges.some((b) => b.id === 'starter')).toBe(true);
        done();
      });

      service.checkForNewUnlocks(releases);
    });

    it('should not emit for already unlocked badges', () => {
      const releases = Array.from({ length: 10 }, () => createMockRelease());
      let emitCount = 0;

      service.badgeUnlocked$.subscribe(() => {
        emitCount++;
      });

      // First check unlocks badges
      service.checkForNewUnlocks(releases);
      expect(emitCount).toBe(1);

      // Second check should not emit
      service.checkForNewUnlocks(releases);
      expect(emitCount).toBe(1);
    });

    it('should persist unlocked badges to localStorage', () => {
      const releases = Array.from({ length: 10 }, () => createMockRelease());
      service.checkForNewUnlocks(releases);

      const stored = localStorage.getItem('vinyl-tracker-achievements');
      expect(stored).toBeTruthy();
      const state = JSON.parse(stored!);
      expect(state.unlockedBadges['starter']).toBeTruthy();
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
      expect(service.isBadgeUnlocked('starter')).toBe(true);
    });

    it('should persist retroactive unlocks', () => {
      const releases = Array.from({ length: 10 }, () => createMockRelease());
      service.initialize(releases);

      const stored = localStorage.getItem('vinyl-tracker-achievements');
      const state = JSON.parse(stored!);
      expect(state.unlockedBadges['starter']).toBeTruthy();
    });
  });

  describe('persistence', () => {
    it('should load unlocked badges from localStorage', () => {
      const mockState = {
        unlockedBadges: {
          starter: '2024-01-01T00:00:00.000Z',
        },
      };
      localStorage.setItem('vinyl-tracker-achievements', JSON.stringify(mockState));

      // Reset and recreate service to load from storage
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      const newService = TestBed.inject(AchievementsService);

      expect(newService.isBadgeUnlocked('starter')).toBe(true);
      expect(newService.unlockedCount()).toBe(1);
    });

    it('should return unlock date for unlocked badges', () => {
      const mockState = {
        unlockedBadges: {
          starter: '2024-01-15T10:30:00.000Z',
        },
      };
      localStorage.setItem('vinyl-tracker-achievements', JSON.stringify(mockState));

      // Reset and recreate service to load from storage
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      const newService = TestBed.inject(AchievementsService);
      const unlockDate = newService.getUnlockDate('starter');

      expect(unlockDate).toBeInstanceOf(Date);
      expect(unlockDate?.toISOString()).toBe('2024-01-15T10:30:00.000Z');
    });

    it('should return undefined for locked badges', () => {
      // Create fresh service with no localStorage data
      localStorage.clear();
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      const freshService = TestBed.inject(AchievementsService);
      expect(freshService.getUnlockDate('starter')).toBeUndefined();
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
});

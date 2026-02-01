import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { of, Subject } from 'rxjs';
import { StatsSheetComponent } from './stats-sheet.component';
import { PlaybackService } from '../../services/playback.service';
import { FilterService } from '../../services/filter.service';
import { CollectionStats } from '../../models/collection-stats.model';
import { Release } from '../../models/release.model';

describe('StatsSheetComponent', () => {
  let spectator: Spectator<StatsSheetComponent>;
  let mockPlaybackService: {
    getCollectionStats: jest.Mock;
    statsUpdated$: Subject<void>;
  };
  let mockFilterService: {
    setNotPlayedIn6Months: jest.Mock;
  };

  const createComponent = createComponentFactory({
    component: StatsSheetComponent,
    detectChanges: false,
  });

  const createMockRelease = (id: number, title: string, playCount: number): Release => ({
    id,
    instanceId: id,
    basicInfo: {
      title,
      artists: ['Test Artist'],
      year: 1985,
      formats: ['Vinyl'],
      thumb: 'thumb.jpg',
      coverImage: 'cover.jpg',
      labels: ['Test Label'],
      genres: ['Rock'],
      styles: [],
    },
    playCount,
    lastPlayedDate: playCount > 0 ? new Date() : undefined,
    dateAdded: new Date(),
    dateAddedToCollection: new Date(),
    notes: '',
    rating: 0,
  });

  const mockStats: CollectionStats = {
    totalReleases: 100,
    totalPlays: 250,
    neverPlayed: 30,
    mostPlayed: createMockRelease(1, 'Most Played Album', 50),
    leastPlayed: createMockRelease(2, 'Least Played Album', 1),
  };

  beforeEach(() => {
    mockPlaybackService = {
      getCollectionStats: jest.fn().mockReturnValue(of(mockStats)),
      statsUpdated$: new Subject<void>(),
    };

    mockFilterService = {
      setNotPlayedIn6Months: jest.fn(),
    };

    spectator = createComponent({
      props: {
        isOpen: false,
      },
      providers: [
        { provide: PlaybackService, useValue: mockPlaybackService },
        { provide: FilterService, useValue: mockFilterService },
      ],
    });
  });

  it('should create', () => {
    expect(spectator.component).toBeTruthy();
  });

  describe('initialization', () => {
    it('should initialize with null collectionStats', () => {
      expect(spectator.component.collectionStats()).toBeNull();
    });

    it('should initialize with isLoading as true', () => {
      expect(spectator.component.isLoading()).toBe(true);
    });

    it('should load stats on init', () => {
      spectator.detectChanges();

      expect(mockPlaybackService.getCollectionStats).toHaveBeenCalled();
      expect(spectator.component.collectionStats()).toEqual(mockStats);
      expect(spectator.component.isLoading()).toBe(false);
    });
  });

  describe('getCollectionPlayedPercentage', () => {
    it('should calculate correct percentage', () => {
      spectator.detectChanges();

      // (100 - 30) / 100 * 100 = 70%
      expect(spectator.component.getCollectionPlayedPercentage()).toBe(70);
    });

    it('should return 0 when no stats', () => {
      expect(spectator.component.getCollectionPlayedPercentage()).toBe(0);
    });

    it('should return 0 when totalReleases is 0', () => {
      mockPlaybackService.getCollectionStats.mockReturnValue(
        of({
          totalReleases: 0,
          totalPlays: 0,
          neverPlayed: 0,
        }),
      );

      spectator.detectChanges();

      expect(spectator.component.getCollectionPlayedPercentage()).toBe(0);
    });
  });

  describe('closeSheet', () => {
    it('should emit close event', () => {
      const closeSpy = jest.fn();
      spectator.component.close.subscribe(closeSpy);

      spectator.component.closeSheet();

      expect(closeSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('onBackdropClick', () => {
    it('should call closeSheet', () => {
      const closeSpy = jest.fn();
      spectator.component.close.subscribe(closeSpy);

      spectator.component.onBackdropClick();

      expect(closeSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('refreshStats', () => {
    it('should reload stats', () => {
      spectator.detectChanges();
      mockPlaybackService.getCollectionStats.mockClear();

      spectator.component.refreshStats();

      expect(mockPlaybackService.getCollectionStats).toHaveBeenCalled();
    });
  });

  describe('statsUpdated$ subscription', () => {
    it('should refresh stats when statsUpdated$ emits', () => {
      spectator.detectChanges();
      mockPlaybackService.getCollectionStats.mockClear();

      mockPlaybackService.statsUpdated$.next();

      expect(mockPlaybackService.getCollectionStats).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should complete destroy$ on ngOnDestroy', () => {
      spectator.detectChanges();

      expect(() => spectator.component.ngOnDestroy()).not.toThrow();
    });
  });

  describe('applyNeverPlayedFilter', () => {
    it('should enable the notPlayedIn6Months filter', () => {
      spectator.component.applyNeverPlayedFilter();

      expect(mockFilterService.setNotPlayedIn6Months).toHaveBeenCalledWith(true);
    });

    it('should emit filterApplied event', () => {
      const filterAppliedSpy = jest.fn();
      spectator.component.filterApplied.subscribe(filterAppliedSpy);

      spectator.component.applyNeverPlayedFilter();

      expect(filterAppliedSpy).toHaveBeenCalledTimes(1);
    });

    it('should close the sheet', () => {
      const closeSpy = jest.fn();
      spectator.component.close.subscribe(closeSpy);

      spectator.component.applyNeverPlayedFilter();

      expect(closeSpy).toHaveBeenCalledTimes(1);
    });

    it('should enable filter, emit filterApplied, and close in sequence', () => {
      const filterAppliedSpy = jest.fn();
      const closeSpy = jest.fn();
      spectator.component.filterApplied.subscribe(filterAppliedSpy);
      spectator.component.close.subscribe(closeSpy);

      spectator.component.applyNeverPlayedFilter();

      expect(mockFilterService.setNotPlayedIn6Months).toHaveBeenCalledWith(true);
      expect(filterAppliedSpy).toHaveBeenCalledTimes(1);
      expect(closeSpy).toHaveBeenCalledTimes(1);
    });
  });
});

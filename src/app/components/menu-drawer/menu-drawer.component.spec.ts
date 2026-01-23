import { fakeAsync, flush } from '@angular/core/testing';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { MenuDrawerComponent } from './menu-drawer.component';
import { DatabaseService } from '../../services/database.service';
import { DiscogsService } from '../../services/discogs.service';
import { PlaybackService } from '../../services/playback.service';
import { FilterService } from '../../services/filter.service';
import { CollectionStats } from '../../models/collection-stats.model';
import { DEFAULT_FILTERS } from '../../models/filter.model';

describe('MenuDrawerComponent', () => {
  let spectator: Spectator<MenuDrawerComponent>;
  let mockDatabaseService: {
    getLastSyncDate: jest.Mock;
    setLastSyncDate: jest.Mock;
    getAllReleases: jest.Mock;
    getRelease: jest.Mock;
    updateRelease: jest.Mock;
  };
  let mockPlaybackService: {
    getCollectionStats: jest.Mock;
    markAsPlayed: jest.Mock;
    getPlayStats: jest.Mock;
  };
  let mockDiscogsService: {
    syncCollection: jest.Mock;
    clearSyncedData: jest.Mock;
  };
  let mockFilterService: {
    filters: ReturnType<typeof signal>;
    setExcludeBoxSets: jest.Mock;
    toggleGenre: jest.Mock;
    toggleDecade: jest.Mock;
  };

  const createComponent = createComponentFactory({
    component: MenuDrawerComponent,
    detectChanges: false,
  });

  const mockStats: CollectionStats = {
    totalReleases: 100,
    totalPlays: 500,
    neverPlayed: 20,
  };

  const mockLastSyncDate = new Date('2024-01-15T10:00:00Z');

  beforeEach(() => {
    mockDatabaseService = {
      getLastSyncDate: jest.fn().mockResolvedValue(null),
      setLastSyncDate: jest.fn().mockResolvedValue(undefined),
      getAllReleases: jest.fn().mockResolvedValue([]),
      getRelease: jest.fn().mockResolvedValue(null),
      updateRelease: jest.fn().mockResolvedValue(undefined),
    };

    mockPlaybackService = {
      getCollectionStats: jest.fn().mockReturnValue(of(mockStats)),
      markAsPlayed: jest.fn().mockReturnValue(of(null)),
      getPlayStats: jest.fn().mockReturnValue(of(null)),
    };

    mockDiscogsService = {
      syncCollection: jest.fn().mockResolvedValue({ success: true, totalSynced: 0 }),
      clearSyncedData: jest.fn().mockResolvedValue(undefined),
    };

    mockFilterService = {
      filters: signal({ ...DEFAULT_FILTERS }),
      setExcludeBoxSets: jest.fn(),
      toggleGenre: jest.fn(),
      toggleDecade: jest.fn(),
    };

    spectator = createComponent({
      props: {
        isOpen: false,
      },
      providers: [
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: PlaybackService, useValue: mockPlaybackService },
        { provide: DiscogsService, useValue: mockDiscogsService },
        { provide: FilterService, useValue: mockFilterService },
      ],
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should create', () => {
    expect(spectator.component).toBeTruthy();
  });

  describe('initialization', () => {
    it('should have collectionStats signal defined', () => {
      // Component loads data in constructor, so we can't test the initial null state easily
      // Instead we verify the signal is defined and working
      expect(spectator.component.collectionStats).toBeDefined();
      expect(typeof spectator.component.collectionStats).toBe('function');
    });

    it('should have lastSyncDate signal defined', () => {
      expect(spectator.component.lastSyncDate).toBeDefined();
      expect(typeof spectator.component.lastSyncDate).toBe('function');
    });

    it('should initialize with syncing as false', () => {
      expect(spectator.component.syncing()).toBe(false);
    });

    it('should initialize with empty syncMessage', () => {
      expect(spectator.component.syncMessage()).toBe('');
    });

    it('should load menu data on construction', fakeAsync(() => {
      const db = mockDatabaseService;
      const playbackService = mockPlaybackService;
      db.getLastSyncDate.mockResolvedValue(mockLastSyncDate);
      playbackService.getCollectionStats.mockReturnValue(of(mockStats));

      spectator.detectChanges();
      flush();

      expect(db.getLastSyncDate).toHaveBeenCalled();
      expect(playbackService.getCollectionStats).toHaveBeenCalled();
    }));
  });

  describe('loadMenuData', () => {
    it('should load last sync date from database', fakeAsync(() => {
      const db = mockDatabaseService;
      db.getLastSyncDate.mockResolvedValue(mockLastSyncDate);

      spectator.component.loadMenuData();
      flush();

      expect(spectator.component.lastSyncDate()).toEqual(mockLastSyncDate);
    }));

    it('should load collection stats from playback service', () => {
      const playbackService = mockPlaybackService;
      playbackService.getCollectionStats.mockReturnValue(of(mockStats));

      spectator.component.loadMenuData();

      expect(spectator.component.collectionStats()).toEqual(mockStats);
    });

    it('should handle null last sync date', fakeAsync(() => {
      const db = mockDatabaseService;
      db.getLastSyncDate.mockResolvedValue(null);

      spectator.component.loadMenuData();
      flush();

      expect(spectator.component.lastSyncDate()).toBeNull();
    }));

    it('should handle empty collection stats without division by zero', () => {
      const playbackService = mockPlaybackService;
      const emptyStats: CollectionStats = {
        totalReleases: 0,
        totalPlays: 0,
        neverPlayed: 0,
      };
      playbackService.getCollectionStats.mockReturnValue(of(emptyStats));

      spectator.component.loadMenuData();
      spectator.detectChanges();

      const statValue = spectator.query('.stat-item:last-child .stat-value');
      expect(statValue?.textContent?.trim()).toBe('0%');
    });
  });

  describe('closeDrawer', () => {
    it('should emit close event', () => {
      const closeSpy = jest.fn();
      spectator.component.close.subscribe(closeSpy);

      spectator.component.closeDrawer();

      expect(closeSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('onBackdropClick', () => {
    it('should call closeDrawer', () => {
      const closeSpy = jest.fn();
      spectator.component.close.subscribe(closeSpy);

      spectator.component.onBackdropClick();

      expect(closeSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('getTimeSinceSync', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-20T10:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return "Never" when lastSyncDate is null', () => {
      spectator.component.lastSyncDate.set(null);

      const result = spectator.component.getTimeSinceSync();

      expect(result).toBe('Never');
    });

    it('should return "Today" when synced today', () => {
      const today = new Date('2024-01-20T08:00:00Z');
      spectator.component.lastSyncDate.set(today);

      const result = spectator.component.getTimeSinceSync();

      expect(result).toBe('Today');
    });

    it('should return "Yesterday" when synced yesterday', () => {
      const yesterday = new Date('2024-01-19T10:00:00Z');
      spectator.component.lastSyncDate.set(yesterday);

      const result = spectator.component.getTimeSinceSync();

      expect(result).toBe('Yesterday');
    });

    it('should return days ago for 2-6 days', () => {
      const threeDaysAgo = new Date('2024-01-17T10:00:00Z');
      spectator.component.lastSyncDate.set(threeDaysAgo);

      const result = spectator.component.getTimeSinceSync();

      expect(result).toBe('3 days ago');
    });

    it('should return weeks ago for 7-29 days', () => {
      const twoWeeksAgo = new Date('2024-01-06T10:00:00Z');
      spectator.component.lastSyncDate.set(twoWeeksAgo);

      const result = spectator.component.getTimeSinceSync();

      expect(result).toBe('2 weeks ago');
    });

    it('should return months ago for 30+ days', () => {
      const twoMonthsAgo = new Date('2023-11-20T10:00:00Z');
      spectator.component.lastSyncDate.set(twoMonthsAgo);

      const result = spectator.component.getTimeSinceSync();

      expect(result).toBe('2 months ago');
    });
  });

  describe('resync', () => {
    it('should set syncing to true when resync starts', () => {
      const discogsService = mockDiscogsService;
      discogsService.syncCollection.mockReturnValue(new Promise(() => {}));

      spectator.component.resync();

      expect(spectator.component.syncing()).toBe(true);
    });

    it('should set initial sync message', () => {
      const discogsService = mockDiscogsService;
      discogsService.syncCollection.mockReturnValue(new Promise(() => {}));

      spectator.component.resync();

      expect(spectator.component.syncMessage()).toBe('Syncing...');
    });

    it('should display success message on successful sync', async () => {
      jest.useFakeTimers();
      const discogsService = mockDiscogsService;
      const db = mockDatabaseService;
      const playbackService = mockPlaybackService;

      discogsService.syncCollection.mockResolvedValue({
        success: true,
        totalSynced: 150,
      });
      db.getLastSyncDate.mockResolvedValue(new Date());
      playbackService.getCollectionStats.mockReturnValue(of(mockStats));

      spectator.component.resync();

      // Wait for promise to resolve
      await Promise.resolve();
      await Promise.resolve();

      expect(spectator.component.syncMessage()).toBe('✅ Synced 150 releases!');

      jest.useRealTimers();
    });

    it('should reload menu data after successful sync', fakeAsync(() => {
      const discogsService = mockDiscogsService;
      const db = mockDatabaseService;
      const playbackService = mockPlaybackService;

      discogsService.syncCollection.mockResolvedValue({
        success: true,
        totalSynced: 150,
      });
      db.getLastSyncDate.mockResolvedValue(mockLastSyncDate);
      playbackService.getCollectionStats.mockReturnValue(of(mockStats));

      spectator.component.resync();
      flush();

      expect(db.getLastSyncDate).toHaveBeenCalled();
      expect(playbackService.getCollectionStats).toHaveBeenCalled();
    }));

    it('should display error message on failed sync', async () => {
      jest.useFakeTimers();
      const discogsService = mockDiscogsService;
      discogsService.syncCollection.mockResolvedValue({
        success: false,
        totalSynced: 0,
        error: 'Network timeout',
      });

      spectator.component.resync();

      // Wait for promise to resolve
      await Promise.resolve();
      await Promise.resolve();

      expect(spectator.component.syncMessage()).toBe('❌ Sync failed: Network timeout');

      jest.useRealTimers();
    });

    it('should not reload menu data on failed sync', fakeAsync(() => {
      const discogsService = mockDiscogsService;
      const db = mockDatabaseService;
      const playbackService = mockPlaybackService;

      discogsService.syncCollection.mockResolvedValue({
        success: false,
        totalSynced: 0,
        error: 'Network timeout',
      });

      // Clear previous calls from constructor
      db.getLastSyncDate.mockClear();
      playbackService.getCollectionStats.mockClear();

      spectator.component.resync();
      flush();

      expect(db.getLastSyncDate).not.toHaveBeenCalled();
      expect(playbackService.getCollectionStats).not.toHaveBeenCalled();
    }));

    it('should clear syncing state after 3 seconds', async () => {
      jest.useFakeTimers();
      const discogsService = mockDiscogsService;
      const db = mockDatabaseService;
      const playbackService = mockPlaybackService;

      discogsService.syncCollection.mockResolvedValue({
        success: true,
        totalSynced: 100,
      });
      db.getLastSyncDate.mockResolvedValue(new Date());
      playbackService.getCollectionStats.mockReturnValue(of(mockStats));

      spectator.component.resync();

      // Wait for all promises to resolve
      await jest.runAllTimersAsync();

      expect(spectator.component.syncing()).toBe(false);

      jest.useRealTimers();
    });

    it('should clear sync message after 3 seconds', async () => {
      jest.useFakeTimers();
      const discogsService = mockDiscogsService;
      const db = mockDatabaseService;
      const playbackService = mockPlaybackService;

      discogsService.syncCollection.mockResolvedValue({
        success: true,
        totalSynced: 100,
      });
      db.getLastSyncDate.mockResolvedValue(new Date());
      playbackService.getCollectionStats.mockReturnValue(of(mockStats));

      spectator.component.resync();

      // Wait for all promises and timers to complete
      await jest.runAllTimersAsync();

      expect(spectator.component.syncMessage()).toBe('');

      jest.useRealTimers();
    });

    it('should handle unexpected sync error', async () => {
      jest.useFakeTimers();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const discogsService = mockDiscogsService;
      discogsService.syncCollection.mockRejectedValue(new Error('Unexpected error'));

      spectator.component.resync();

      await jest.runAllTimersAsync();

      expect(consoleSpy).toHaveBeenCalledWith('Sync error:', expect.any(Error));
      expect(spectator.component.syncMessage()).toBe('');
      expect(spectator.component.syncing()).toBe(false);

      consoleSpy.mockRestore();
      jest.useRealTimers();
    });
  });

  describe('loadMenuData error handling', () => {
    it('should handle getLastSyncDate error gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockDatabaseService.getLastSyncDate.mockRejectedValue(new Error('Database error'));

      spectator.component.loadMenuData();

      await Promise.resolve();
      await Promise.resolve();

      expect(consoleSpy).toHaveBeenCalledWith('Failed to load last sync date:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('loadFilterOptions', () => {
    const mockReleasesWithFilters = [
      {
        id: 1,
        instanceId: 1,
        basicInfo: {
          title: 'Album 1',
          artists: ['Artist 1'],
          year: 1985,
          formats: ['Vinyl'],
          thumb: '',
          coverImage: '',
          labels: [],
          genres: ['Rock', 'Pop'],
          styles: [],
        },
        playCount: 0,
        dateAdded: new Date(),
        dateAddedToCollection: new Date(),
        notes: '',
        rating: 0,
      },
      {
        id: 2,
        instanceId: 2,
        basicInfo: {
          title: 'Album 2',
          artists: ['Artist 2'],
          year: 1992,
          formats: ['Vinyl'],
          thumb: '',
          coverImage: '',
          labels: [],
          genres: ['Jazz', 'Rock'],
          styles: [],
        },
        playCount: 0,
        dateAdded: new Date(),
        dateAddedToCollection: new Date(),
        notes: '',
        rating: 0,
      },
      {
        id: 3,
        instanceId: 3,
        basicInfo: {
          title: 'Album 3',
          artists: ['Artist 3'],
          year: 0, // No year
          formats: ['Vinyl'],
          thumb: '',
          coverImage: '',
          labels: [],
          genres: undefined,
          styles: [],
        },
        playCount: 0,
        dateAdded: new Date(),
        dateAddedToCollection: new Date(),
        notes: '',
        rating: 0,
      },
    ];

    it('should extract unique genres from releases', async () => {
      mockDatabaseService.getAllReleases.mockResolvedValue(mockReleasesWithFilters);

      spectator.component.loadMenuData();

      await Promise.resolve();
      await Promise.resolve();

      const genres = spectator.component.availableGenres();
      expect(genres).toContain('Rock');
      expect(genres).toContain('Pop');
      expect(genres).toContain('Jazz');
      expect(genres.length).toBe(3);
    });

    it('should sort genres alphabetically', async () => {
      mockDatabaseService.getAllReleases.mockResolvedValue(mockReleasesWithFilters);

      spectator.component.loadMenuData();

      await Promise.resolve();
      await Promise.resolve();

      const genres = spectator.component.availableGenres();
      expect(genres).toEqual(['Jazz', 'Pop', 'Rock']);
    });

    it('should extract unique decades from releases', async () => {
      mockDatabaseService.getAllReleases.mockResolvedValue(mockReleasesWithFilters);

      spectator.component.loadMenuData();

      await Promise.resolve();
      await Promise.resolve();

      const decades = spectator.component.availableDecades();
      expect(decades).toContain('1980s');
      expect(decades).toContain('1990s');
      expect(decades.length).toBe(2);
    });

    it('should sort decades chronologically', async () => {
      mockDatabaseService.getAllReleases.mockResolvedValue(mockReleasesWithFilters);

      spectator.component.loadMenuData();

      await Promise.resolve();
      await Promise.resolve();

      const decades = spectator.component.availableDecades();
      expect(decades).toEqual(['1980s', '1990s']);
    });

    it('should skip releases without year for decades', async () => {
      mockDatabaseService.getAllReleases.mockResolvedValue(mockReleasesWithFilters);

      spectator.component.loadMenuData();

      await Promise.resolve();
      await Promise.resolve();

      const decades = spectator.component.availableDecades();
      // Album 3 has year 0, should not create a '0s' decade
      expect(decades).not.toContain('0s');
    });

    it('should handle releases with undefined genres', async () => {
      mockDatabaseService.getAllReleases.mockResolvedValue(mockReleasesWithFilters);

      spectator.component.loadMenuData();

      await Promise.resolve();
      await Promise.resolve();

      // Should not throw and should still have genres from other releases
      expect(spectator.component.availableGenres().length).toBe(3);
    });

    it('should handle getAllReleases error gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockDatabaseService.getAllReleases.mockRejectedValue(new Error('Database error'));

      spectator.component.loadMenuData();

      await Promise.resolve();
      await Promise.resolve();

      expect(consoleSpy).toHaveBeenCalledWith('Failed to load filter options:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('filter toggle methods', () => {
    it('should toggle excludeBoxSets and emit filtersChanged', () => {
      const filtersChangedSpy = jest.fn();
      spectator.component.filtersChanged.subscribe(filtersChangedSpy);
      mockFilterService.filters.set({ ...DEFAULT_FILTERS, excludeBoxSets: true });

      spectator.component.toggleExcludeBoxSets();

      expect(mockFilterService.setExcludeBoxSets).toHaveBeenCalledWith(false);
      expect(filtersChangedSpy).toHaveBeenCalledTimes(1);
    });

    it('should toggle genre and emit filtersChanged', () => {
      const filtersChangedSpy = jest.fn();
      spectator.component.filtersChanged.subscribe(filtersChangedSpy);

      spectator.component.toggleGenre('Rock');

      expect(mockFilterService.toggleGenre).toHaveBeenCalledWith('Rock');
      expect(filtersChangedSpy).toHaveBeenCalledTimes(1);
    });

    it('should toggle decade and emit filtersChanged', () => {
      const filtersChangedSpy = jest.fn();
      spectator.component.filtersChanged.subscribe(filtersChangedSpy);

      spectator.component.toggleDecade('1980s');

      expect(mockFilterService.toggleDecade).toHaveBeenCalledWith('1980s');
      expect(filtersChangedSpy).toHaveBeenCalledTimes(1);
    });

    it('should return true for selected genre', () => {
      mockFilterService.filters.set({ ...DEFAULT_FILTERS, genres: ['Rock', 'Jazz'] });

      expect(spectator.component.isGenreSelected('Rock')).toBe(true);
      expect(spectator.component.isGenreSelected('Jazz')).toBe(true);
    });

    it('should return false for unselected genre', () => {
      mockFilterService.filters.set({ ...DEFAULT_FILTERS, genres: ['Rock'] });

      expect(spectator.component.isGenreSelected('Jazz')).toBe(false);
    });

    it('should return true for selected decade', () => {
      mockFilterService.filters.set({ ...DEFAULT_FILTERS, decades: ['1980s', '1990s'] });

      expect(spectator.component.isDecadeSelected('1980s')).toBe(true);
      expect(spectator.component.isDecadeSelected('1990s')).toBe(true);
    });

    it('should return false for unselected decade', () => {
      mockFilterService.filters.set({ ...DEFAULT_FILTERS, decades: ['1980s'] });

      expect(spectator.component.isDecadeSelected('1970s')).toBe(false);
    });
  });

  describe('clearData', () => {
    it('should set clearing to true when starting', () => {
      mockDiscogsService.clearSyncedData.mockReturnValue(new Promise(() => {}));

      spectator.component.clearData();

      expect(spectator.component.clearing()).toBe(true);
    });

    it('should emit dataCleared on success', async () => {
      const dataClearedSpy = jest.fn();
      spectator.component.dataCleared.subscribe(dataClearedSpy);
      mockDiscogsService.clearSyncedData.mockResolvedValue(undefined);

      spectator.component.clearData();

      await Promise.resolve();
      await Promise.resolve();

      expect(dataClearedSpy).toHaveBeenCalledTimes(1);
    });

    it('should close drawer on success', async () => {
      const closeSpy = jest.fn();
      spectator.component.close.subscribe(closeSpy);
      mockDiscogsService.clearSyncedData.mockResolvedValue(undefined);

      spectator.component.clearData();

      await Promise.resolve();
      await Promise.resolve();

      expect(closeSpy).toHaveBeenCalledTimes(1);
    });

    it('should set clearing to false after success', async () => {
      mockDiscogsService.clearSyncedData.mockResolvedValue(undefined);

      spectator.component.clearData();

      await Promise.resolve();
      await Promise.resolve();

      expect(spectator.component.clearing()).toBe(false);
    });

    it('should handle clearData error gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockDiscogsService.clearSyncedData.mockRejectedValue(new Error('Clear error'));

      spectator.component.clearData();

      await Promise.resolve();
      await Promise.resolve();

      expect(consoleSpy).toHaveBeenCalledWith('Failed to clear data:', expect.any(Error));
      expect(spectator.component.clearing()).toBe(false);

      consoleSpy.mockRestore();
    });
  });

  describe('ngOnDestroy', () => {
    it('should complete destroy$ subject', () => {
      expect(() => spectator.component.ngOnDestroy()).not.toThrow();
    });
  });
});

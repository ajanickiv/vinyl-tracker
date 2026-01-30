import { fakeAsync, flush } from '@angular/core/testing';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { signal } from '@angular/core';
import { of, Subject } from 'rxjs';
import { MenuDrawerComponent } from './menu-drawer.component';
import { DatabaseService } from '../../services/database.service';
import { DiscogsService } from '../../services/discogs.service';
import { PlaybackService } from '../../services/playback.service';
import { FilterService } from '../../services/filter.service';
import { CredentialsService } from '../../services/credentials.service';
import { PlayStatsExportService } from '../../services/play-stats-export.service';
import { MasterReleaseService } from '../../services/master-release.service';
import { CollectionStats } from '../../models/collection-stats.model';
import { DEFAULT_FILTERS } from '../../models/filter.model';
import { SYNC_MESSAGE_DISPLAY_MS } from '../../constants/timing.constants';

describe('MenuDrawerComponent', () => {
  let spectator: Spectator<MenuDrawerComponent>;
  let mockDatabaseService: {
    getLastSyncDate: jest.Mock;
    setLastSyncDate: jest.Mock;
    getAllReleases: jest.Mock;
    getRelease: jest.Mock;
    updateRelease: jest.Mock;
    isMasterReleaseSyncEnabled: jest.Mock;
    setMasterReleaseSyncEnabled: jest.Mock;
  };
  let mockPlaybackService: {
    getCollectionStats: jest.Mock;
    markAsPlayed: jest.Mock;
    getPlayStats: jest.Mock;
    statsUpdated$: Subject<void>;
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
  let mockCredentialsService: {
    getUsername: jest.Mock;
    getToken: jest.Mock;
    setCredentials: jest.Mock;
    hasCredentials: jest.Mock;
  };
  let mockPlayStatsExportService: {
    exportToFile: jest.Mock;
    validateImportFile: jest.Mock;
    importFromData: jest.Mock;
  };
  let mockMasterReleaseService: {
    startBackgroundFetch: jest.Mock;
    resumeIfNeeded: jest.Mock;
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
      isMasterReleaseSyncEnabled: jest.fn().mockResolvedValue(true),
      setMasterReleaseSyncEnabled: jest.fn().mockResolvedValue(undefined),
    };

    mockPlaybackService = {
      getCollectionStats: jest.fn().mockReturnValue(of(mockStats)),
      markAsPlayed: jest.fn().mockReturnValue(of(null)),
      getPlayStats: jest.fn().mockReturnValue(of(null)),
      statsUpdated$: new Subject<void>(),
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

    mockCredentialsService = {
      getUsername: jest.fn().mockReturnValue('testuser'),
      getToken: jest.fn().mockReturnValue('testtoken'),
      setCredentials: jest.fn(),
      hasCredentials: jest.fn().mockReturnValue(true),
    };

    mockPlayStatsExportService = {
      exportToFile: jest.fn().mockResolvedValue(undefined),
      validateImportFile: jest.fn().mockReturnValue({ valid: true, data: {} }),
      importFromData: jest
        .fn()
        .mockResolvedValue({ success: true, imported: 0, skipped: 0, errors: [] }),
    };

    mockMasterReleaseService = {
      startBackgroundFetch: jest.fn().mockResolvedValue(undefined),
      resumeIfNeeded: jest.fn().mockResolvedValue(undefined),
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
        { provide: CredentialsService, useValue: mockCredentialsService },
        { provide: PlayStatsExportService, useValue: mockPlayStatsExportService },
        { provide: MasterReleaseService, useValue: mockMasterReleaseService },
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

    it('should return "Yesterday" for previous calendar day even if less than 24 hours ago', () => {
      // System time is 2024-01-20 at 10:00 AM UTC
      // Sync was at 11:00 PM UTC on Jan 19 (only 11 hours ago, but different calendar day)
      const lastNight = new Date('2024-01-19T23:00:00Z');
      spectator.component.lastSyncDate.set(lastNight);

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

    it('should start master release fetch after successful sync when enabled', async () => {
      jest.useFakeTimers();
      mockDiscogsService.syncCollection.mockResolvedValue({
        success: true,
        totalSynced: 100,
      });
      mockDatabaseService.getLastSyncDate.mockResolvedValue(new Date());
      mockPlaybackService.getCollectionStats.mockReturnValue(of(mockStats));
      spectator.component.masterReleaseSyncEnabled.set(true);

      spectator.component.resync();

      await jest.runAllTimersAsync();

      expect(mockMasterReleaseService.startBackgroundFetch).toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('should not start master release fetch after successful sync when disabled', async () => {
      jest.useFakeTimers();
      mockDiscogsService.syncCollection.mockResolvedValue({
        success: true,
        totalSynced: 100,
      });
      mockDatabaseService.getLastSyncDate.mockResolvedValue(new Date());
      mockPlaybackService.getCollectionStats.mockReturnValue(of(mockStats));
      spectator.component.masterReleaseSyncEnabled.set(false);

      spectator.component.resync();

      await jest.runAllTimersAsync();

      expect(mockMasterReleaseService.startBackgroundFetch).not.toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('should not start master release fetch on failed sync even when enabled', async () => {
      jest.useFakeTimers();
      mockDiscogsService.syncCollection.mockResolvedValue({
        success: false,
        totalSynced: 0,
        error: 'Network error',
      });
      spectator.component.masterReleaseSyncEnabled.set(true);

      spectator.component.resync();

      await jest.runAllTimersAsync();

      expect(mockMasterReleaseService.startBackgroundFetch).not.toHaveBeenCalled();

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

  describe('toggleAdvanced', () => {
    it('should toggle advancedExpanded from false to true', () => {
      expect(spectator.component.advancedExpanded()).toBe(false);

      spectator.component.toggleAdvanced();

      expect(spectator.component.advancedExpanded()).toBe(true);
    });

    it('should toggle advancedExpanded from true to false', () => {
      spectator.component.advancedExpanded.set(true);

      spectator.component.toggleAdvanced();

      expect(spectator.component.advancedExpanded()).toBe(false);
    });
  });

  describe('ngOnDestroy', () => {
    it('should complete destroy$ subject', () => {
      expect(() => spectator.component.ngOnDestroy()).not.toThrow();
    });
  });

  describe('statsUpdated$ subscription', () => {
    it('should refresh collection stats when statsUpdated$ emits', () => {
      const playbackService = mockPlaybackService;
      playbackService.getCollectionStats.mockClear();

      const newStats: CollectionStats = {
        totalReleases: 110,
        totalPlays: 600,
        neverPlayed: 15,
      };
      playbackService.getCollectionStats.mockReturnValue(of(newStats));

      // Emit on statsUpdated$
      playbackService.statsUpdated$.next();

      expect(playbackService.getCollectionStats).toHaveBeenCalled();
      expect(spectator.component.collectionStats()).toEqual(newStats);
    });
  });

  describe('credentials editing', () => {
    it('should initialize editingCredentials as false', () => {
      expect(spectator.component.editingCredentials()).toBe(false);
    });

    describe('startEditCredentials', () => {
      it('should set editingCredentials to true', () => {
        spectator.component.startEditCredentials();

        expect(spectator.component.editingCredentials()).toBe(true);
      });

      it('should populate editUsername from credentials service', () => {
        mockCredentialsService.getUsername.mockReturnValue('existinguser');

        spectator.component.startEditCredentials();

        expect(spectator.component.editUsername()).toBe('existinguser');
      });

      it('should clear editToken', () => {
        spectator.component.editToken.set('oldtoken');

        spectator.component.startEditCredentials();

        expect(spectator.component.editToken()).toBe('');
      });

      it('should reset showEditToken to false', () => {
        spectator.component.showEditToken.set(true);

        spectator.component.startEditCredentials();

        expect(spectator.component.showEditToken()).toBe(false);
      });

      it('should clear credentialsMessage', () => {
        spectator.component.credentialsMessage.set('Previous message');

        spectator.component.startEditCredentials();

        expect(spectator.component.credentialsMessage()).toBe('');
      });

      it('should handle null username from credentials service', () => {
        mockCredentialsService.getUsername.mockReturnValue(null);

        spectator.component.startEditCredentials();

        expect(spectator.component.editUsername()).toBe('');
      });
    });

    describe('cancelEditCredentials', () => {
      it('should set editingCredentials to false', () => {
        spectator.component.editingCredentials.set(true);

        spectator.component.cancelEditCredentials();

        expect(spectator.component.editingCredentials()).toBe(false);
      });

      it('should clear editUsername', () => {
        spectator.component.editUsername.set('someuser');

        spectator.component.cancelEditCredentials();

        expect(spectator.component.editUsername()).toBe('');
      });

      it('should clear editToken', () => {
        spectator.component.editToken.set('sometoken');

        spectator.component.cancelEditCredentials();

        expect(spectator.component.editToken()).toBe('');
      });

      it('should clear credentialsMessage', () => {
        spectator.component.credentialsMessage.set('Some message');

        spectator.component.cancelEditCredentials();

        expect(spectator.component.credentialsMessage()).toBe('');
      });
    });

    describe('saveCredentials', () => {
      it('should show error when username is empty', () => {
        spectator.component.editUsername.set('');
        spectator.component.editToken.set('validtoken');

        spectator.component.saveCredentials();

        expect(spectator.component.credentialsMessage()).toBe('Username is required');
        expect(mockCredentialsService.setCredentials).not.toHaveBeenCalled();
      });

      it('should show error when username is whitespace only', () => {
        spectator.component.editUsername.set('   ');
        spectator.component.editToken.set('validtoken');

        spectator.component.saveCredentials();

        expect(spectator.component.credentialsMessage()).toBe('Username is required');
      });

      it('should show error when token is empty', () => {
        spectator.component.editUsername.set('validuser');
        spectator.component.editToken.set('');

        spectator.component.saveCredentials();

        expect(spectator.component.credentialsMessage()).toBe('Token is required');
        expect(mockCredentialsService.setCredentials).not.toHaveBeenCalled();
      });

      it('should show error when token is whitespace only', () => {
        spectator.component.editUsername.set('validuser');
        spectator.component.editToken.set('   ');

        spectator.component.saveCredentials();

        expect(spectator.component.credentialsMessage()).toBe('Token is required');
      });

      it('should save credentials when both fields are valid', () => {
        spectator.component.editUsername.set('newuser');
        spectator.component.editToken.set('newtoken');

        spectator.component.saveCredentials();

        expect(mockCredentialsService.setCredentials).toHaveBeenCalledWith({
          username: 'newuser',
          token: 'newtoken',
        });
      });

      it('should trim whitespace from username and token', () => {
        spectator.component.editUsername.set('  newuser  ');
        spectator.component.editToken.set('  newtoken  ');

        spectator.component.saveCredentials();

        expect(mockCredentialsService.setCredentials).toHaveBeenCalledWith({
          username: 'newuser',
          token: 'newtoken',
        });
      });

      it('should show success message after saving', () => {
        spectator.component.editUsername.set('newuser');
        spectator.component.editToken.set('newtoken');

        spectator.component.saveCredentials();

        expect(spectator.component.credentialsMessage()).toBe('Credentials saved!');
      });

      it('should set editingCredentials to false after saving', () => {
        spectator.component.editingCredentials.set(true);
        spectator.component.editUsername.set('newuser');
        spectator.component.editToken.set('newtoken');

        spectator.component.saveCredentials();

        expect(spectator.component.editingCredentials()).toBe(false);
      });

      it('should clear success message after timeout', async () => {
        jest.useFakeTimers();
        spectator.component.editUsername.set('newuser');
        spectator.component.editToken.set('newtoken');

        spectator.component.saveCredentials();

        expect(spectator.component.credentialsMessage()).toBe('Credentials saved!');

        jest.advanceTimersByTime(SYNC_MESSAGE_DISPLAY_MS);

        expect(spectator.component.credentialsMessage()).toBe('');

        jest.useRealTimers();
      });
    });

    describe('toggleShowEditToken', () => {
      it('should toggle showEditToken from false to true', () => {
        spectator.component.showEditToken.set(false);

        spectator.component.toggleShowEditToken();

        expect(spectator.component.showEditToken()).toBe(true);
      });

      it('should toggle showEditToken from true to false', () => {
        spectator.component.showEditToken.set(true);

        spectator.component.toggleShowEditToken();

        expect(spectator.component.showEditToken()).toBe(false);
      });
    });
  });

  describe('export/import', () => {
    describe('onExport', () => {
      it('should set exporting to true while exporting', async () => {
        mockPlayStatsExportService.exportToFile.mockReturnValue(new Promise(() => {}));

        spectator.component.onExport();

        expect(spectator.component.exporting()).toBe(true);
      });

      it('should show success message on successful export', async () => {
        jest.useFakeTimers();
        mockPlayStatsExportService.exportToFile.mockResolvedValue(undefined);

        await spectator.component.onExport();

        expect(spectator.component.importExportMessage()).toBe('Export downloaded successfully!');

        jest.useRealTimers();
      });

      it('should set exporting to false after export completes', async () => {
        mockPlayStatsExportService.exportToFile.mockResolvedValue(undefined);

        await spectator.component.onExport();

        expect(spectator.component.exporting()).toBe(false);
      });

      it('should show error message on export failure', async () => {
        jest.useFakeTimers();
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
        mockPlayStatsExportService.exportToFile.mockRejectedValue(new Error('Export failed'));

        await spectator.component.onExport();

        expect(spectator.component.importExportMessage()).toBe('Export failed. Please try again.');
        expect(consoleErrorSpy).toHaveBeenCalledWith('Export failed:', expect.any(Error));

        consoleErrorSpy.mockRestore();
        jest.useRealTimers();
      });

      it('should clear message after timeout', async () => {
        jest.useFakeTimers();
        mockPlayStatsExportService.exportToFile.mockResolvedValue(undefined);

        await spectator.component.onExport();

        expect(spectator.component.importExportMessage()).toBe('Export downloaded successfully!');

        jest.advanceTimersByTime(SYNC_MESSAGE_DISPLAY_MS);

        expect(spectator.component.importExportMessage()).toBe('');

        jest.useRealTimers();
      });
    });

    describe('setImportMode', () => {
      it('should set import mode to replace', () => {
        spectator.component.setImportMode('replace');

        expect(spectator.component.importMode()).toBe('replace');
      });

      it('should set import mode to merge', () => {
        spectator.component.setImportMode('merge');

        expect(spectator.component.importMode()).toBe('merge');
      });
    });

    describe('onFileSelected', () => {
      it('should do nothing when no file is selected', async () => {
        const event = { target: { files: [] } } as unknown as Event;

        await spectator.component.onFileSelected(event);

        expect(spectator.component.importing()).toBe(false);
        expect(mockPlayStatsExportService.validateImportFile).not.toHaveBeenCalled();
      });

      it('should set importing to true while importing', async () => {
        const mockFile = new File(['{}'], 'test.json', { type: 'application/json' });
        mockFile.text = jest.fn().mockResolvedValue('{}');
        const event = { target: { files: [mockFile], value: '' } } as unknown as Event;
        mockPlayStatsExportService.validateImportFile.mockReturnValue({ valid: true, data: {} });
        mockPlayStatsExportService.importFromData.mockReturnValue(new Promise(() => {}));

        spectator.component.onFileSelected(event);

        await Promise.resolve();
        await Promise.resolve();

        expect(spectator.component.importing()).toBe(true);
      });

      it('should show error for invalid file', async () => {
        jest.useFakeTimers();
        const mockFile = new File(['invalid'], 'test.json', { type: 'application/json' });
        mockFile.text = jest.fn().mockResolvedValue('invalid');
        const event = { target: { files: [mockFile], value: '' } } as unknown as Event;
        mockPlayStatsExportService.validateImportFile.mockReturnValue({
          valid: false,
          errors: ['Invalid JSON format'],
        });

        await spectator.component.onFileSelected(event);

        expect(spectator.component.importExportMessage()).toBe('Invalid file: Invalid JSON format');

        jest.useRealTimers();
      });

      it('should show success message on successful import', async () => {
        jest.useFakeTimers();
        const mockFile = new File(['{}'], 'test.json', { type: 'application/json' });
        mockFile.text = jest.fn().mockResolvedValue('{}');
        const event = { target: { files: [mockFile], value: '' } } as unknown as Event;
        mockPlayStatsExportService.validateImportFile.mockReturnValue({ valid: true, data: {} });
        mockPlayStatsExportService.importFromData.mockResolvedValue({
          success: true,
          imported: 10,
          skipped: 2,
          errors: [],
        });

        await spectator.component.onFileSelected(event);

        expect(spectator.component.importExportMessage()).toBe('Imported 10 releases, skipped 2');

        jest.useRealTimers();
      });

      it('should show success message without skipped when none skipped', async () => {
        jest.useFakeTimers();
        const mockFile = new File(['{}'], 'test.json', { type: 'application/json' });
        mockFile.text = jest.fn().mockResolvedValue('{}');
        const event = { target: { files: [mockFile], value: '' } } as unknown as Event;
        mockPlayStatsExportService.validateImportFile.mockReturnValue({ valid: true, data: {} });
        mockPlayStatsExportService.importFromData.mockResolvedValue({
          success: true,
          imported: 10,
          skipped: 0,
          errors: [],
        });

        await spectator.component.onFileSelected(event);

        expect(spectator.component.importExportMessage()).toBe('Imported 10 releases');

        jest.useRealTimers();
      });

      it('should handle import error', async () => {
        jest.useFakeTimers();
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
        const mockFile = new File(['{}'], 'test.json', { type: 'application/json' });
        mockFile.text = jest.fn().mockRejectedValue(new Error('Read error'));
        const event = { target: { files: [mockFile], value: '' } } as unknown as Event;

        await spectator.component.onFileSelected(event);

        expect(spectator.component.importExportMessage()).toBe('Import failed. Please try again.');
        expect(consoleErrorSpy).toHaveBeenCalledWith('Import failed:', expect.any(Error));

        consoleErrorSpy.mockRestore();
        jest.useRealTimers();
      });
    });
  });

  describe('original decade filter', () => {
    const mockReleasesWithOriginalDecades = [
      {
        id: 1,
        instanceId: 1,
        basicInfo: {
          title: 'Album 1',
          artists: ['Artist 1'],
          year: 2020,
          originalYear: 1975,
          formats: ['Vinyl'],
          thumb: '',
          coverImage: '',
          labels: [],
          genres: ['Rock'],
          styles: [],
        },
        playCount: 0,
        dateAdded: new Date(),
        dateAddedToCollection: new Date(),
      },
      {
        id: 2,
        instanceId: 2,
        basicInfo: {
          title: 'Album 2',
          artists: ['Artist 2'],
          year: 2015,
          originalYear: 1985,
          formats: ['Vinyl'],
          thumb: '',
          coverImage: '',
          labels: [],
          genres: ['Jazz'],
          styles: [],
        },
        playCount: 0,
        dateAdded: new Date(),
        dateAddedToCollection: new Date(),
      },
    ];

    it('should extract unique original decades from releases', async () => {
      mockDatabaseService.getAllReleases.mockResolvedValue(mockReleasesWithOriginalDecades);

      spectator.component.loadMenuData();

      await Promise.resolve();
      await Promise.resolve();

      const originalDecades = spectator.component.availableOriginalDecades();
      expect(originalDecades).toContain('1970s');
      expect(originalDecades).toContain('1980s');
      expect(originalDecades.length).toBe(2);
    });

    it('should sort original decades chronologically', async () => {
      mockDatabaseService.getAllReleases.mockResolvedValue(mockReleasesWithOriginalDecades);

      spectator.component.loadMenuData();

      await Promise.resolve();
      await Promise.resolve();

      const originalDecades = spectator.component.availableOriginalDecades();
      expect(originalDecades).toEqual(['1970s', '1980s']);
    });

    it('should skip releases without originalYear', async () => {
      const releasesWithMissingOriginalYear = [
        ...mockReleasesWithOriginalDecades,
        {
          id: 3,
          instanceId: 3,
          basicInfo: {
            title: 'Album 3',
            artists: ['Artist 3'],
            year: 2010,
            originalYear: undefined,
            formats: ['Vinyl'],
            thumb: '',
            coverImage: '',
            labels: [],
            genres: ['Pop'],
            styles: [],
          },
          playCount: 0,
          dateAdded: new Date(),
          dateAddedToCollection: new Date(),
        },
      ];
      mockDatabaseService.getAllReleases.mockResolvedValue(releasesWithMissingOriginalYear);

      spectator.component.loadMenuData();

      await Promise.resolve();
      await Promise.resolve();

      const originalDecades = spectator.component.availableOriginalDecades();
      expect(originalDecades.length).toBe(2);
    });

    describe('toggleOriginalDecade', () => {
      beforeEach(() => {
        (mockFilterService as any).toggleOriginalDecade = jest.fn();
      });

      it('should toggle original decade and emit filtersChanged', () => {
        const filtersChangedSpy = jest.fn();
        spectator.component.filtersChanged.subscribe(filtersChangedSpy);

        spectator.component.toggleOriginalDecade('1970s');

        expect((mockFilterService as any).toggleOriginalDecade).toHaveBeenCalledWith('1970s');
        expect(filtersChangedSpy).toHaveBeenCalledTimes(1);
      });
    });

    describe('isOriginalDecadeSelected', () => {
      it('should return true for selected original decade', () => {
        mockFilterService.filters.set({ ...DEFAULT_FILTERS, originalDecades: ['1970s', '1980s'] });

        expect(spectator.component.isOriginalDecadeSelected('1970s')).toBe(true);
        expect(spectator.component.isOriginalDecadeSelected('1980s')).toBe(true);
      });

      it('should return false for unselected original decade', () => {
        mockFilterService.filters.set({ ...DEFAULT_FILTERS, originalDecades: ['1970s'] });

        expect(spectator.component.isOriginalDecadeSelected('1990s')).toBe(false);
      });
    });
  });

  describe('master release sync toggle', () => {
    it('should initialize masterReleaseSyncEnabled as true', () => {
      expect(spectator.component.masterReleaseSyncEnabled()).toBe(true);
    });

    it('should load master release sync setting when drawer opens', async () => {
      mockDatabaseService.isMasterReleaseSyncEnabled.mockResolvedValue(false);

      spectator.setInput('isOpen', true);
      spectator.detectChanges();

      await Promise.resolve();

      expect(mockDatabaseService.isMasterReleaseSyncEnabled).toHaveBeenCalled();
    });

    describe('toggleMasterReleaseSync', () => {
      it('should toggle from true to false', () => {
        spectator.component.masterReleaseSyncEnabled.set(true);

        spectator.component.toggleMasterReleaseSync();

        expect(spectator.component.masterReleaseSyncEnabled()).toBe(false);
      });

      it('should toggle from false to true', () => {
        spectator.component.masterReleaseSyncEnabled.set(false);

        spectator.component.toggleMasterReleaseSync();

        expect(spectator.component.masterReleaseSyncEnabled()).toBe(true);
      });

      it('should save setting to database when toggled', () => {
        spectator.component.masterReleaseSyncEnabled.set(true);

        spectator.component.toggleMasterReleaseSync();

        expect(mockDatabaseService.setMasterReleaseSyncEnabled).toHaveBeenCalledWith(false);
      });

      it('should save true when toggled from false', () => {
        spectator.component.masterReleaseSyncEnabled.set(false);

        spectator.component.toggleMasterReleaseSync();

        expect(mockDatabaseService.setMasterReleaseSyncEnabled).toHaveBeenCalledWith(true);
      });
    });
  });
});

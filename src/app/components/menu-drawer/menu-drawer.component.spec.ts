import { fakeAsync, flush } from '@angular/core/testing';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { of } from 'rxjs';
import { MenuDrawerComponent } from './menu-drawer.component';
import { DatabaseService } from '../../services/database.service';
import { DiscogsService } from '../../services/discogs.service';
import { PlaybackService } from '../../services/playback.service';
import { CollectionStats } from '../../models/collection-stats.model';

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
    };

    spectator = createComponent({
      props: {
        isOpen: false,
      },
      providers: [
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: PlaybackService, useValue: mockPlaybackService },
        { provide: DiscogsService, useValue: mockDiscogsService },
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
  });
});

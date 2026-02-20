import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { Router } from '@angular/router';
import { SyncScreenComponent } from './sync-screen.component';
import { DiscogsService } from '../../discogs/discogs.service';
import { MasterReleaseService } from '../../discogs/master-release.service';
import { DatabaseService } from '../../../core/database.service';
import { AchievementsService } from '../../achievements/achievements.service';
import { SYNC_TRANSITION_DELAY_MS } from '../../../shared/constants/timing.constants';

describe('SyncScreenComponent', () => {
  let spectator: Spectator<SyncScreenComponent>;
  const createComponent = createComponentFactory({
    component: SyncScreenComponent,
    mocks: [DiscogsService, MasterReleaseService, DatabaseService, AchievementsService, Router],
  });

  beforeEach(() => {
    spectator = createComponent();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should create', () => {
    expect(spectator.component).toBeTruthy();
  });

  it('should initialize with syncing as false', () => {
    expect(spectator.component.syncing()).toBe(false);
  });

  it('should initialize with empty syncProgress', () => {
    expect(spectator.component.syncProgress()).toBe('');
  });

  describe('startSync', () => {
    it('should set syncing to true when sync starts', async () => {
      const discogsService = spectator.inject(DiscogsService);
      discogsService.syncCollection.mockReturnValue(
        new Promise(() => {}), // Never resolves to test initial state
      );

      spectator.component.startSync();

      expect(spectator.component.syncing()).toBe(true);
    });

    it('should set initial progress message when sync starts', async () => {
      const discogsService = spectator.inject(DiscogsService);
      discogsService.syncCollection.mockReturnValue(new Promise(() => {}));

      spectator.component.startSync();

      expect(spectator.component.syncProgress()).toBe('Connecting to Discogs...');
    });

    it('should display success message when sync succeeds', async () => {
      const discogsService = spectator.inject(DiscogsService);
      const db = spectator.inject(DatabaseService);
      discogsService.syncCollection.mockResolvedValue({
        success: true,
        totalSynced: 42,
      });
      db.getAllReleases.mockResolvedValue([]);

      await spectator.component.startSync();

      expect(spectator.component.syncProgress()).toBe('✅ Successfully synced 42 releases!');
    });

    it('should navigate to / after delay on successful sync', async () => {
      const discogsService = spectator.inject(DiscogsService);
      const db = spectator.inject(DatabaseService);
      const router = spectator.inject(Router);
      discogsService.syncCollection.mockResolvedValue({
        success: true,
        totalSynced: 10,
      });
      db.getAllReleases.mockResolvedValue([]);

      await spectator.component.startSync();

      // Should not navigate immediately
      expect(router.navigate).not.toHaveBeenCalled();

      // Should navigate after transition delay
      jest.advanceTimersByTime(SYNC_TRANSITION_DELAY_MS);
      expect(router.navigate).toHaveBeenCalledWith(['/']);
    });

    it('should keep syncing true during success delay', async () => {
      const discogsService = spectator.inject(DiscogsService);
      const db = spectator.inject(DatabaseService);
      discogsService.syncCollection.mockResolvedValue({
        success: true,
        totalSynced: 10,
      });
      db.getAllReleases.mockResolvedValue([]);

      await spectator.component.startSync();

      expect(spectator.component.syncing()).toBe(true);

      jest.advanceTimersByTime(SYNC_TRANSITION_DELAY_MS);
      expect(spectator.component.syncing()).toBe(true);
    });

    it('should initialize achievements after successful sync', async () => {
      const discogsService = spectator.inject(DiscogsService);
      const db = spectator.inject(DatabaseService);
      const achievementsService = spectator.inject(AchievementsService);
      const mockReleases = [{ id: 1 }];
      discogsService.syncCollection.mockResolvedValue({
        success: true,
        totalSynced: 1,
      });
      db.getAllReleases.mockResolvedValue(mockReleases);

      await spectator.component.startSync();

      expect(achievementsService.initialize).toHaveBeenCalledWith(mockReleases);
    });

    it('should display error message when sync fails', async () => {
      const discogsService = spectator.inject(DiscogsService);
      discogsService.syncCollection.mockResolvedValue({
        success: false,
        totalSynced: 0,
        error: 'Network error',
      });

      await spectator.component.startSync();

      expect(spectator.component.syncProgress()).toBe('❌ Sync failed: Network error');
    });

    it('should set syncing to false when sync fails', async () => {
      const discogsService = spectator.inject(DiscogsService);
      discogsService.syncCollection.mockResolvedValue({
        success: false,
        totalSynced: 0,
        error: 'Network error',
      });

      await spectator.component.startSync();

      expect(spectator.component.syncing()).toBe(false);
    });

    it('should not navigate when sync fails', async () => {
      const discogsService = spectator.inject(DiscogsService);
      const router = spectator.inject(Router);
      discogsService.syncCollection.mockResolvedValue({
        success: false,
        totalSynced: 0,
        error: 'Network error',
      });

      await spectator.component.startSync();

      jest.advanceTimersByTime(2000);
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should handle different sync counts', async () => {
      const discogsService = spectator.inject(DiscogsService);
      const db = spectator.inject(DatabaseService);
      discogsService.syncCollection.mockResolvedValue({
        success: true,
        totalSynced: 1,
      });
      db.getAllReleases.mockResolvedValue([]);

      await spectator.component.startSync();

      expect(spectator.component.syncProgress()).toBe('✅ Successfully synced 1 releases!');
    });

    it('should save master release sync setting before sync', async () => {
      const discogsService = spectator.inject(DiscogsService);
      const db = spectator.inject(DatabaseService);
      discogsService.syncCollection.mockResolvedValue({
        success: true,
        totalSynced: 10,
      });
      db.getAllReleases.mockResolvedValue([]);

      spectator.component.fetchReleaseDates.set(true);
      await spectator.component.startSync();

      expect(db.setMasterReleaseSyncEnabled).toHaveBeenCalledWith(true);
    });

    it('should start background fetch when enabled and sync succeeds', async () => {
      const discogsService = spectator.inject(DiscogsService);
      const masterReleaseService = spectator.inject(MasterReleaseService);
      const db = spectator.inject(DatabaseService);
      discogsService.syncCollection.mockResolvedValue({
        success: true,
        totalSynced: 10,
      });
      db.getAllReleases.mockResolvedValue([]);

      spectator.component.fetchReleaseDates.set(true);
      await spectator.component.startSync();

      expect(masterReleaseService.startBackgroundFetch).toHaveBeenCalled();
    });

    it('should not start background fetch when disabled', async () => {
      const discogsService = spectator.inject(DiscogsService);
      const masterReleaseService = spectator.inject(MasterReleaseService);
      const db = spectator.inject(DatabaseService);
      discogsService.syncCollection.mockResolvedValue({
        success: true,
        totalSynced: 10,
      });
      db.getAllReleases.mockResolvedValue([]);

      spectator.component.fetchReleaseDates.set(false);
      await spectator.component.startSync();

      expect(masterReleaseService.startBackgroundFetch).not.toHaveBeenCalled();
    });
  });

  describe('fetchReleaseDates toggle', () => {
    it('should initialize with fetchReleaseDates as true', () => {
      expect(spectator.component.fetchReleaseDates()).toBe(true);
    });

    it('should toggle fetchReleaseDates from true to false', () => {
      spectator.component.fetchReleaseDates.set(true);

      spectator.component.toggleFetchReleaseDates();

      expect(spectator.component.fetchReleaseDates()).toBe(false);
    });

    it('should toggle fetchReleaseDates from false to true', () => {
      spectator.component.fetchReleaseDates.set(false);

      spectator.component.toggleFetchReleaseDates();

      expect(spectator.component.fetchReleaseDates()).toBe(true);
    });
  });
});

import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { SyncScreenComponent } from './sync-screen.component';
import { DiscogsService } from '../../services/discogs.service';
import { MasterReleaseService } from '../../services/master-release.service';
import { DatabaseService } from '../../services/database.service';
import { SYNC_TRANSITION_DELAY_MS } from '../../constants/timing.constants';

describe('SyncScreenComponent', () => {
  let spectator: Spectator<SyncScreenComponent>;
  const createComponent = createComponentFactory({
    component: SyncScreenComponent,
    mocks: [DiscogsService, MasterReleaseService, DatabaseService],
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
      discogsService.syncCollection.mockResolvedValue({
        success: true,
        totalSynced: 42,
      });

      await spectator.component.startSync();

      expect(spectator.component.syncProgress()).toBe('✅ Successfully synced 42 releases!');
    });

    it('should emit syncComplete after delay on successful sync', async () => {
      const discogsService = spectator.inject(DiscogsService);
      discogsService.syncCollection.mockResolvedValue({
        success: true,
        totalSynced: 10,
      });

      const syncCompleteSpy = jest.fn();
      spectator.component.syncComplete.subscribe(syncCompleteSpy);

      await spectator.component.startSync();

      // Should not emit immediately
      expect(syncCompleteSpy).not.toHaveBeenCalled();

      // Should emit after transition delay
      jest.advanceTimersByTime(SYNC_TRANSITION_DELAY_MS);
      expect(syncCompleteSpy).toHaveBeenCalledTimes(1);
    });

    it('should keep syncing true during success delay', async () => {
      const discogsService = spectator.inject(DiscogsService);
      discogsService.syncCollection.mockResolvedValue({
        success: true,
        totalSynced: 10,
      });

      await spectator.component.startSync();

      expect(spectator.component.syncing()).toBe(true);

      jest.advanceTimersByTime(SYNC_TRANSITION_DELAY_MS);
      expect(spectator.component.syncing()).toBe(true);
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

    it('should not emit syncComplete when sync fails', async () => {
      const discogsService = spectator.inject(DiscogsService);
      discogsService.syncCollection.mockResolvedValue({
        success: false,
        totalSynced: 0,
        error: 'Network error',
      });

      const syncCompleteSpy = jest.fn();
      spectator.component.syncComplete.subscribe(syncCompleteSpy);

      await spectator.component.startSync();

      jest.advanceTimersByTime(2000);
      expect(syncCompleteSpy).not.toHaveBeenCalled();
    });

    it('should handle different sync counts', async () => {
      const discogsService = spectator.inject(DiscogsService);
      discogsService.syncCollection.mockResolvedValue({
        success: true,
        totalSynced: 1,
      });

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

      spectator.component.fetchReleaseDates.set(true);
      await spectator.component.startSync();

      expect(db.setMasterReleaseSyncEnabled).toHaveBeenCalledWith(true);
    });

    it('should start background fetch when enabled and sync succeeds', async () => {
      const discogsService = spectator.inject(DiscogsService);
      const masterReleaseService = spectator.inject(MasterReleaseService);
      discogsService.syncCollection.mockResolvedValue({
        success: true,
        totalSynced: 10,
      });

      spectator.component.fetchReleaseDates.set(true);
      await spectator.component.startSync();

      expect(masterReleaseService.startBackgroundFetch).toHaveBeenCalled();
    });

    it('should not start background fetch when disabled', async () => {
      const discogsService = spectator.inject(DiscogsService);
      const masterReleaseService = spectator.inject(MasterReleaseService);
      discogsService.syncCollection.mockResolvedValue({
        success: true,
        totalSynced: 10,
      });

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

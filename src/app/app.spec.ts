import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { of, Subject } from 'rxjs';
import { AppComponent } from './app';
import { DatabaseService } from './services/database.service';
import { CredentialsService } from './services/credentials.service';
import { RecommendationService } from './services/recommendation.service';
import { PlaybackService } from './services/playback.service';
import { MasterReleaseService } from './services/master-release.service';
import { PwaUpdateService } from './services/pwa-update.service';
import { AchievementsService } from './services/achievements.service';
import { SetupScreenComponent } from './components/setup-screen/setup-screen.component';
import { SyncScreenComponent } from './components/sync-screen/sync-screen.component';
import { VinylPlayerComponent } from './components/vinyl-player/vinyl-player.component';

describe('AppComponent', () => {
  let spectator: Spectator<AppComponent>;
  let mockCredentialsService: {
    hasCredentials: jest.Mock;
    getUsername: jest.Mock;
    getToken: jest.Mock;
  };

  const createComponent = createComponentFactory({
    component: AppComponent,
    mocks: [
      DatabaseService,
      RecommendationService,
      PlaybackService,
      MasterReleaseService,
      PwaUpdateService,
      AchievementsService,
    ],
    providers: [
      {
        provide: CredentialsService,
        useFactory: () => {
          mockCredentialsService = {
            hasCredentials: jest.fn().mockReturnValue(false),
            getUsername: jest.fn().mockReturnValue('testuser'),
            getToken: jest.fn().mockReturnValue('testtoken'),
          };
          return mockCredentialsService;
        },
      },
    ],
    overrideComponents: [
      [SetupScreenComponent, { set: { template: '' } }],
      [SyncScreenComponent, { set: { template: '' } }],
      [VinylPlayerComponent, { set: { template: '' } }],
    ],
  });

  beforeEach(() => {
    spectator = createComponent();

    // Setup mocks for VinylPlayerComponent dependencies
    const recommendationService = spectator.inject(RecommendationService);
    const playbackService = spectator.inject(PlaybackService);

    recommendationService.getRecommendation.mockReturnValue(of(null));
    playbackService.getCollectionStats.mockReturnValue(
      of({
        totalReleases: 0,
        totalPlays: 0,
        neverPlayed: 0,
      }),
    );
    // Add achievementUnlocked$ Subject for VinylPlayerComponent
    (playbackService as any).achievementUnlocked$ = new Subject<any[]>();
  });

  it('should create', () => {
    expect(spectator.component).toBeTruthy();
  });

  it('should initialize with hasCredentials and hasSyncedData as false when no credentials exist', () => {
    // Note: isInitialized is true because ngOnInit runs automatically during component creation
    expect(spectator.component.isInitialized()).toBe(true);
    expect(spectator.component.hasCredentials()).toBe(false);
    expect(spectator.component.hasSyncedData()).toBe(false);
  });

  describe('ngOnInit', () => {
    it('should set hasCredentials based on CredentialsService', async () => {
      mockCredentialsService.hasCredentials.mockReturnValue(true);

      await spectator.component.ngOnInit();

      expect(spectator.component.hasCredentials()).toBe(true);
    });

    it('should check collection count only when credentials exist', async () => {
      const dbService = spectator.inject(DatabaseService);
      mockCredentialsService.hasCredentials.mockReturnValue(true);
      dbService.getCollectionCount.mockResolvedValue(5);
      dbService.getAllReleases.mockResolvedValue([]);

      await spectator.component.ngOnInit();

      expect(dbService.getCollectionCount).toHaveBeenCalled();
      expect(spectator.component.hasSyncedData()).toBe(true);
    });

    it('should not check collection count when credentials do not exist', async () => {
      const dbService = spectator.inject(DatabaseService);
      mockCredentialsService.hasCredentials.mockReturnValue(false);
      dbService.getCollectionCount.mockClear(); // Clear any calls from previous tests

      await spectator.component.ngOnInit();

      expect(dbService.getCollectionCount).not.toHaveBeenCalled();
      expect(spectator.component.hasSyncedData()).toBe(false);
    });

    it('should set hasSyncedData to true when collection has items', async () => {
      const dbService = spectator.inject(DatabaseService);
      mockCredentialsService.hasCredentials.mockReturnValue(true);
      dbService.getCollectionCount.mockResolvedValue(5);
      dbService.getAllReleases.mockResolvedValue([]);

      await spectator.component.ngOnInit();

      expect(spectator.component.hasSyncedData()).toBe(true);
    });

    it('should keep hasSyncedData as false when collection is empty', async () => {
      const dbService = spectator.inject(DatabaseService);
      mockCredentialsService.hasCredentials.mockReturnValue(true);
      dbService.getCollectionCount.mockResolvedValue(0);

      await spectator.component.ngOnInit();

      expect(spectator.component.hasSyncedData()).toBe(false);
    });

    it('should set isInitialized to true after initialization completes', async () => {
      // ngOnInit runs automatically during component creation, so isInitialized is already true
      // This test verifies the signal is set correctly after ngOnInit
      expect(spectator.component.isInitialized()).toBe(true);
    });
  });

  describe('onSetupComplete', () => {
    it('should set hasCredentials to true', async () => {
      const dbService = spectator.inject(DatabaseService);
      dbService.getCollectionCount.mockResolvedValue(0);

      await spectator.component.onSetupComplete();

      expect(spectator.component.hasCredentials()).toBe(true);
    });

    it('should check collection count for existing data', async () => {
      const dbService = spectator.inject(DatabaseService);
      dbService.getCollectionCount.mockResolvedValue(100);

      await spectator.component.onSetupComplete();

      expect(dbService.getCollectionCount).toHaveBeenCalled();
      expect(spectator.component.hasSyncedData()).toBe(true);
    });

    it('should set hasSyncedData false when no existing data', async () => {
      const dbService = spectator.inject(DatabaseService);
      dbService.getCollectionCount.mockResolvedValue(0);

      await spectator.component.onSetupComplete();

      expect(spectator.component.hasSyncedData()).toBe(false);
    });
  });

  describe('onSyncComplete', () => {
    it('should set hasSyncedData to true', async () => {
      const dbService = spectator.inject(DatabaseService);
      dbService.getAllReleases.mockResolvedValue([]);
      expect(spectator.component.hasSyncedData()).toBe(false);

      await spectator.component.onSyncComplete();

      expect(spectator.component.hasSyncedData()).toBe(true);
    });

    it('should initialize achievements with releases', async () => {
      const dbService = spectator.inject(DatabaseService);
      const achievementsService = spectator.inject(AchievementsService);
      const mockReleases = [{ id: 1 }];
      dbService.getAllReleases.mockResolvedValue(mockReleases);

      await spectator.component.onSyncComplete();

      expect(achievementsService.initialize).toHaveBeenCalledWith(mockReleases);
    });
  });

  describe('template rendering', () => {
    it('should display nothing when not initialized', () => {
      spectator.component.isInitialized.set(false);
      spectator.detectChanges();

      expect(spectator.query('app-setup-screen')).toBeFalsy();
      expect(spectator.query('app-sync-screen')).toBeFalsy();
      expect(spectator.query('app-vinyl-player')).toBeFalsy();
    });

    it('should display setup-screen when no credentials', () => {
      spectator.component.isInitialized.set(true);
      spectator.component.hasCredentials.set(false);
      spectator.component.hasSyncedData.set(false);
      spectator.detectChanges();

      expect(spectator.query('app-setup-screen')).toBeTruthy();
      expect(spectator.query('app-sync-screen')).toBeFalsy();
      expect(spectator.query('app-vinyl-player')).toBeFalsy();
    });

    it('should display sync-screen when credentials exist but no data', () => {
      spectator.component.isInitialized.set(true);
      spectator.component.hasCredentials.set(true);
      spectator.component.hasSyncedData.set(false);
      spectator.detectChanges();

      expect(spectator.query('app-setup-screen')).toBeFalsy();
      expect(spectator.query('app-sync-screen')).toBeTruthy();
      expect(spectator.query('app-vinyl-player')).toBeFalsy();
    });

    it('should display vinyl-player when credentials and data exist', () => {
      spectator.component.isInitialized.set(true);
      spectator.component.hasCredentials.set(true);
      spectator.component.hasSyncedData.set(true);
      spectator.detectChanges();

      expect(spectator.query('app-setup-screen')).toBeFalsy();
      expect(spectator.query('app-sync-screen')).toBeFalsy();
      expect(spectator.query('app-vinyl-player')).toBeTruthy();
    });
  });
});

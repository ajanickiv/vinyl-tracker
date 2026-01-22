import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { of } from 'rxjs';
import { AppComponent } from './app';
import { DatabaseService } from './services/database.service';
import { RecommendationService } from './services/recommendation.service';
import { PlaybackService } from './services/playback.service';
import { SyncScreenComponent } from './components/sync-screen/sync-screen.component';
import { VinylPlayerComponent } from './components/vinyl-player/vinyl-player.component';

describe('AppComponent', () => {
  let spectator: Spectator<AppComponent>;
  const createComponent = createComponentFactory({
    component: AppComponent,
    mocks: [DatabaseService, RecommendationService, PlaybackService],
    overrideComponents: [
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
  });

  it('should create', () => {
    expect(spectator.component).toBeTruthy();
  });

  it('should initialize with hasSyncedData as false', () => {
    expect(spectator.component.hasSyncedData()).toBe(false);
  });

  describe('ngOnInit', () => {
    it('should set hasSyncedData to true when collection has items', async () => {
      const dbService = spectator.inject(DatabaseService);
      dbService.getCollectionCount.mockResolvedValue(5);

      await spectator.component.ngOnInit();

      expect(spectator.component.hasSyncedData()).toBe(true);
      expect(dbService.getCollectionCount).toHaveBeenCalled();
    });

    it('should keep hasSyncedData as false when collection is empty', async () => {
      const dbService = spectator.inject(DatabaseService);
      dbService.getCollectionCount.mockResolvedValue(0);

      await spectator.component.ngOnInit();

      expect(spectator.component.hasSyncedData()).toBe(false);
      expect(dbService.getCollectionCount).toHaveBeenCalled();
    });
  });

  describe('onSyncComplete', () => {
    it('should set hasSyncedData to true', () => {
      expect(spectator.component.hasSyncedData()).toBe(false);

      spectator.component.onSyncComplete();

      expect(spectator.component.hasSyncedData()).toBe(true);
    });
  });

  describe('template rendering', () => {
    it('should display sync-screen when hasSyncedData is false', () => {
      spectator.component.hasSyncedData.set(false);
      spectator.detectChanges();

      expect(spectator.query('app-sync-screen')).toBeTruthy();
      expect(spectator.query('app-vinyl-player')).toBeFalsy();
    });

    it('should display vinyl-player when hasSyncedData is true', () => {
      spectator.component.hasSyncedData.set(true);
      spectator.detectChanges();

      expect(spectator.query('app-vinyl-player')).toBeTruthy();
      expect(spectator.query('app-sync-screen')).toBeFalsy();
    });
  });
});

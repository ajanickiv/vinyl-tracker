import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { provideRouter, Router } from '@angular/router';
import { AppComponent } from './app.component';
import { DatabaseService } from './core/database.service';
import { CredentialsService } from './core/credentials.service';
import { MasterReleaseService } from './features/discogs/master-release.service';
import { PwaUpdateService } from './core/pwa-update.service';
import { AchievementsService } from './features/achievements/achievements.service';

describe('AppComponent', () => {
  let spectator: Spectator<AppComponent>;
  let mockCredentialsService: { hasCredentials: jest.Mock };

  const createComponent = createComponentFactory({
    component: AppComponent,
    mocks: [DatabaseService, MasterReleaseService, PwaUpdateService, AchievementsService],
    providers: [
      provideRouter([]),
      {
        provide: CredentialsService,
        useFactory: () => {
          mockCredentialsService = {
            hasCredentials: jest.fn().mockReturnValue(false),
          };
          return mockCredentialsService;
        },
      },
    ],
  });

  beforeEach(() => {
    spectator = createComponent();
    const router = spectator.inject(Router);
    jest.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  it('should create', () => {
    expect(spectator.component).toBeTruthy();
  });

  it('should render router-outlet', () => {
    expect(spectator.query('router-outlet')).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should initialize PWA service', async () => {
      const pwaService = spectator.inject(PwaUpdateService);

      await spectator.component.ngOnInit();

      expect(pwaService.initialize).toHaveBeenCalled();
    });

    it('should navigate to /setup when no credentials', async () => {
      const router = spectator.inject(Router);
      mockCredentialsService.hasCredentials.mockReturnValue(false);

      await spectator.component.ngOnInit();

      expect(router.navigate).toHaveBeenCalledWith(['/setup']);
    });

    it('should navigate to /sync when credentials exist but no data', async () => {
      const router = spectator.inject(Router);
      const db = spectator.inject(DatabaseService);
      mockCredentialsService.hasCredentials.mockReturnValue(true);
      db.getCollectionCount.mockResolvedValue(0);

      await spectator.component.ngOnInit();

      expect(router.navigate).toHaveBeenCalledWith(['/sync']);
    });

    it('should navigate to / when credentials and data exist', async () => {
      const router = spectator.inject(Router);
      const db = spectator.inject(DatabaseService);
      mockCredentialsService.hasCredentials.mockReturnValue(true);
      db.getCollectionCount.mockResolvedValue(5);
      db.getAllReleases.mockResolvedValue([]);

      await spectator.component.ngOnInit();

      expect(router.navigate).toHaveBeenCalledWith(['/']);
    });

    it('should resume master release service and initialize achievements for returning users', async () => {
      const db = spectator.inject(DatabaseService);
      const masterReleaseService = spectator.inject(MasterReleaseService);
      const achievementsService = spectator.inject(AchievementsService);
      const mockReleases = [{ id: 1 }];
      mockCredentialsService.hasCredentials.mockReturnValue(true);
      db.getCollectionCount.mockResolvedValue(5);
      db.getAllReleases.mockResolvedValue(mockReleases);

      await spectator.component.ngOnInit();

      expect(masterReleaseService.resumeIfNeeded).toHaveBeenCalled();
      expect(achievementsService.initialize).toHaveBeenCalledWith(mockReleases);
    });

    it('should not check database when no credentials', async () => {
      const db = spectator.inject(DatabaseService);
      mockCredentialsService.hasCredentials.mockReturnValue(false);
      db.getCollectionCount.mockClear();

      await spectator.component.ngOnInit();

      expect(db.getCollectionCount).not.toHaveBeenCalled();
    });
  });
});

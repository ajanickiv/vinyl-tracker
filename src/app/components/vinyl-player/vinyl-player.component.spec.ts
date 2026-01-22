import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { of } from 'rxjs';
import { VinylPlayerComponent } from './vinyl-player.component';
import { RecommendationService } from '../../services/recommendation.service';
import { PlaybackService } from '../../services/playback.service';
import { Release } from '../../models/release.model';
import { MenuDrawerComponent } from '../menu-drawer/menu-drawer.component';

describe('VinylPlayerComponent', () => {
  let spectator: Spectator<VinylPlayerComponent>;
  let mockRecommendationService: {
    getRecommendation: jest.Mock;
    getMultipleRecommendations: jest.Mock;
    getRecommendationByFormat: jest.Mock;
    getRecommendationByGenre: jest.Mock;
  };
  let mockPlaybackService: {
    markAsPlayed: jest.Mock;
    getCollectionStats: jest.Mock;
    getPlayStats: jest.Mock;
  };

  const createComponent = createComponentFactory({
    component: VinylPlayerComponent,
    overrideComponents: [[MenuDrawerComponent, { set: { template: '' } }]],
    detectChanges: false,
  });

  const mockRelease: Release = {
    id: 123,
    instanceId: 456,
    basicInfo: {
      title: 'Test Album',
      artists: ['Test Artist'],
      year: 2020,
      formats: ['Vinyl', 'LP'],
      thumb: 'thumb.jpg',
      coverImage: 'cover.jpg',
      labels: ['Test Label'],
      genres: ['Rock'],
      styles: ['Alternative'],
    },
    playCount: 5,
    lastPlayedDate: new Date('2024-01-15'),
    dateAdded: new Date('2024-01-01'),
    dateAddedToCollection: new Date('2024-01-01'),
    notes: 'Test notes',
    rating: 4,
  };

  beforeEach(() => {
    mockRecommendationService = {
      getRecommendation: jest.fn().mockReturnValue(of(null)),
      getMultipleRecommendations: jest.fn().mockReturnValue(of([])),
      getRecommendationByFormat: jest.fn().mockReturnValue(of(null)),
      getRecommendationByGenre: jest.fn().mockReturnValue(of(null)),
    };

    mockPlaybackService = {
      markAsPlayed: jest.fn().mockReturnValue(of(null)),
      getCollectionStats: jest.fn().mockReturnValue(of({})),
      getPlayStats: jest.fn().mockReturnValue(of(null)),
    };

    spectator = createComponent({
      providers: [
        { provide: RecommendationService, useValue: mockRecommendationService },
        { provide: PlaybackService, useValue: mockPlaybackService },
      ],
    });
  });

  it('should create', () => {
    expect(spectator.component).toBeTruthy();
  });

  describe('initialization', () => {
    it('should initialize with currentRelease as null', () => {
      expect(spectator.component.currentRelease()).toBeNull();
    });

    it('should initialize with isSpinning as false', () => {
      expect(spectator.component.isSpinning()).toBe(false);
    });

    it('should initialize with isLoading as false after synchronous observable completes', () => {
      // Since we're using of(null) which completes synchronously, isLoading will be false
      expect(spectator.component.isLoading()).toBe(false);
    });

    it('should initialize with menuOpen as false', () => {
      expect(spectator.component.menuOpen()).toBe(false);
    });

    it('should call getNewRecommendation on construction', () => {
      // The constructor calls loadInitialRecommendation, which was already called
      // during component creation in beforeEach
      expect(mockRecommendationService.getRecommendation).toHaveBeenCalled();
    });
  });

  describe('getNewRecommendation', () => {
    it('should set isLoading to false after synchronous observable completes', () => {
      mockRecommendationService.getRecommendation.mockReturnValue(of(mockRelease));

      spectator.component.getNewRecommendation();

      // Observable completes synchronously with of(), so isLoading is immediately false
      expect(spectator.component.isLoading()).toBe(false);
    });

    it('should set currentRelease when recommendation is received', () => {
      mockRecommendationService.getRecommendation.mockReturnValue(of(mockRelease));

      spectator.component.getNewRecommendation();
      spectator.detectChanges();

      expect(spectator.component.currentRelease()).toEqual(mockRelease);
    });

    it('should set isLoading to false after loading', () => {
      mockRecommendationService.getRecommendation.mockReturnValue(of(mockRelease));

      spectator.component.getNewRecommendation();
      spectator.detectChanges();

      expect(spectator.component.isLoading()).toBe(false);
    });

    it('should handle null recommendation', () => {
      mockRecommendationService.getRecommendation.mockReturnValue(of(null));

      spectator.component.getNewRecommendation();
      spectator.detectChanges();

      expect(spectator.component.currentRelease()).toBeNull();
      expect(spectator.component.isLoading()).toBe(false);
    });
  });

  describe('markAsPlayed', () => {
    beforeEach(() => {
      // Set up a mock release for these tests
      spectator.component.currentRelease.set(mockRelease);
    });

    it('should do nothing if no current release', () => {
      spectator.component.currentRelease.set(null);

      spectator.component.markAsPlayed();

      expect(mockPlaybackService.markAsPlayed).not.toHaveBeenCalled();
    });

    it('should do nothing if already spinning', () => {
      spectator.component.isSpinning.set(true);

      spectator.component.markAsPlayed();

      expect(mockPlaybackService.markAsPlayed).not.toHaveBeenCalled();
    });

    it('should set isSpinning to true immediately', () => {
      jest.useFakeTimers();
      mockPlaybackService.markAsPlayed.mockReturnValue(of(mockRelease));
      mockRecommendationService.getRecommendation.mockReturnValue(of(mockRelease));

      spectator.component.markAsPlayed();

      expect(spectator.component.isSpinning()).toBe(true);

      // Clean up timers
      jest.runAllTimers();
      jest.useRealTimers();
    });

    it('should wait 2 seconds before marking as played', () => {
      jest.useFakeTimers();
      mockPlaybackService.markAsPlayed.mockReturnValue(of(mockRelease));
      mockRecommendationService.getRecommendation.mockReturnValue(of(mockRelease));

      spectator.component.markAsPlayed();

      // Should not be called immediately
      expect(mockPlaybackService.markAsPlayed).not.toHaveBeenCalled();

      // Fast-forward 2 seconds
      jest.advanceTimersByTime(2000);
      spectator.detectChanges();

      expect(mockPlaybackService.markAsPlayed).toHaveBeenCalledWith(mockRelease.id);

      jest.useRealTimers();
    });

    it('should temporarily update currentRelease then load new recommendation', () => {
      jest.useFakeTimers();

      const updatedRelease = { ...mockRelease, playCount: 6 };
      const newRelease = { ...mockRelease, id: 789, playCount: 0 };
      mockPlaybackService.markAsPlayed.mockReturnValue(of(updatedRelease));
      mockRecommendationService.getRecommendation.mockReturnValue(of(newRelease));

      spectator.component.markAsPlayed();
      jest.runAllTimers();
      spectator.detectChanges();

      // After marking as played, a new recommendation is loaded
      expect(spectator.component.currentRelease()?.id).toBe(789);

      jest.useRealTimers();
    });

    it('should set isSpinning to false after completion', () => {
      jest.useFakeTimers();

      mockPlaybackService.markAsPlayed.mockReturnValue(of(mockRelease));
      mockRecommendationService.getRecommendation.mockReturnValue(of(mockRelease));

      spectator.component.markAsPlayed();
      jest.runAllTimers();
      spectator.detectChanges();

      expect(spectator.component.isSpinning()).toBe(false);

      jest.useRealTimers();
    });

    it('should load new recommendation after marking as played', () => {
      jest.useFakeTimers();

      const newRelease = { ...mockRelease, id: 999 };
      mockPlaybackService.markAsPlayed.mockReturnValue(of(mockRelease));
      mockRecommendationService.getRecommendation.mockReturnValue(of(newRelease));

      spectator.component.markAsPlayed();
      jest.runAllTimers();
      spectator.detectChanges();

      expect(spectator.component.currentRelease()?.id).toBe(999);

      jest.useRealTimers();
    });
  });

  describe('skipToNext', () => {
    it('should do nothing if spinning', () => {
      spectator.component.isSpinning.set(true);
      mockRecommendationService.getRecommendation.mockClear();

      spectator.component.skipToNext();

      expect(mockRecommendationService.getRecommendation).not.toHaveBeenCalled();
    });

    it('should load new recommendation when not spinning', () => {
      mockRecommendationService.getRecommendation.mockReturnValue(of(mockRelease));

      spectator.component.skipToNext();

      expect(mockRecommendationService.getRecommendation).toHaveBeenCalled();
    });
  });

  describe('toggleMenu', () => {
    it('should toggle menuOpen from false to true', () => {
      spectator.component.menuOpen.set(false);

      spectator.component.toggleMenu();

      expect(spectator.component.menuOpen()).toBe(true);
    });

    it('should toggle menuOpen from true to false', () => {
      spectator.component.menuOpen.set(true);

      spectator.component.toggleMenu();

      expect(spectator.component.menuOpen()).toBe(false);
    });
  });

  describe('closeMenu', () => {
    it('should set menuOpen to false', () => {
      spectator.component.menuOpen.set(true);

      spectator.component.closeMenu();

      expect(spectator.component.menuOpen()).toBe(false);
    });

    it('should keep menuOpen false if already false', () => {
      spectator.component.menuOpen.set(false);

      spectator.component.closeMenu();

      expect(spectator.component.menuOpen()).toBe(false);
    });
  });

  describe('getFormatString', () => {
    it('should return formatted string for formats array', () => {
      const result = spectator.component.getFormatString(mockRelease);

      expect(result).toBe('Vinyl, LP');
    });

    it('should return "Unknown" for empty formats array', () => {
      const release = { ...mockRelease, basicInfo: { ...mockRelease.basicInfo, formats: [] } };

      const result = spectator.component.getFormatString(release);

      expect(result).toBe('Unknown');
    });

    it('should return "Unknown" for undefined formats', () => {
      const release = {
        ...mockRelease,
        basicInfo: { ...mockRelease.basicInfo, formats: undefined as unknown as string[] },
      };

      const result = spectator.component.getFormatString(release);

      expect(result).toBe('Unknown');
    });

    it('should handle single format', () => {
      const release = { ...mockRelease, basicInfo: { ...mockRelease.basicInfo, formats: ['CD'] } };

      const result = spectator.component.getFormatString(release);

      expect(result).toBe('CD');
    });
  });

  describe('getFormattedDate', () => {
    it('should return formatted date string', () => {
      const date = new Date('2024-01-15T12:00:00');

      const result = spectator.component.getFormattedDate(date);

      expect(result).toMatch(/1\/15\/2024|15\/1\/2024/); // Handles different locale formats
    });

    it('should return "Never" for undefined date', () => {
      const result = spectator.component.getFormattedDate(undefined);

      expect(result).toBe('Never');
    });

    it('should handle date objects', () => {
      const date = new Date('2023-12-25T12:00:00');

      const result = spectator.component.getFormattedDate(date);

      expect(result).toMatch(/12\/25\/2023|25\/12\/2023/);
    });
  });
});

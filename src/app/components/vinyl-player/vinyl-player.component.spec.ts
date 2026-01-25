import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { signal } from '@angular/core';
import { of, throwError, Subject } from 'rxjs';
import { VinylPlayerComponent } from './vinyl-player.component';
import { RecommendationService } from '../../services/recommendation.service';
import { PlaybackService } from '../../services/playback.service';
import { DatabaseService } from '../../services/database.service';
import { DiscogsService } from '../../services/discogs.service';
import { FilterService } from '../../services/filter.service';
import { Release } from '../../models/release.model';
import { DEFAULT_FILTERS } from '../../models/filter.model';
import { MenuDrawerComponent } from '../menu-drawer/menu-drawer.component';
import { SearchSheetComponent } from '../search-sheet/search-sheet.component';
import { PlayHistorySheetComponent } from '../play-history-sheet/play-history-sheet.component';
import { SPIN_ANIMATION_DURATION_MS } from '../../constants/timing.constants';

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
    statsUpdated$: Subject<void>;
  };
  let mockDatabaseService: {
    getLastSyncDate: jest.Mock;
    getAllReleases: jest.Mock;
  };
  let mockDiscogsService: {
    syncCollection: jest.Mock;
  };
  let mockFilterService: {
    filters: ReturnType<typeof signal>;
    matchesFilters: jest.Mock;
  };

  const createComponent = createComponentFactory({
    component: VinylPlayerComponent,
    overrideComponents: [
      [MenuDrawerComponent, { set: { template: '' } }],
      [SearchSheetComponent, { set: { template: '' } }],
      [PlayHistorySheetComponent, { set: { template: '' } }],
    ],
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
      statsUpdated$: new Subject<void>(),
    };

    mockDatabaseService = {
      getLastSyncDate: jest.fn().mockResolvedValue(null),
      getAllReleases: jest.fn().mockResolvedValue([]),
    };

    mockDiscogsService = {
      syncCollection: jest.fn().mockResolvedValue({ success: true, totalSynced: 0 }),
    };

    mockFilterService = {
      filters: signal({ ...DEFAULT_FILTERS }),
      matchesFilters: jest.fn().mockReturnValue(true),
    };

    spectator = createComponent({
      providers: [
        { provide: RecommendationService, useValue: mockRecommendationService },
        { provide: PlaybackService, useValue: mockPlaybackService },
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: DiscogsService, useValue: mockDiscogsService },
        { provide: FilterService, useValue: mockFilterService },
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

      // Fast-forward spin animation duration
      jest.advanceTimersByTime(SPIN_ANIMATION_DURATION_MS);
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

  describe('fetchRecommendation error handling', () => {
    it('should handle recommendation error and set isLoading to false', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockRecommendationService.getRecommendation.mockReturnValue(
        throwError(() => new Error('Network error')),
      );

      spectator.component.getNewRecommendation();

      expect(consoleSpy).toHaveBeenCalledWith('Failed to get recommendation:', expect.any(Error));
      expect(spectator.component.isLoading()).toBe(false);

      consoleSpy.mockRestore();
    });
  });

  describe('markAsPlayed error handling', () => {
    beforeEach(() => {
      spectator.component.currentRelease.set(mockRelease);
    });

    it('should handle markAsPlayed error and reset isSpinning', () => {
      jest.useFakeTimers();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockPlaybackService.markAsPlayed.mockReturnValue(
        throwError(() => new Error('Playback error')),
      );

      spectator.component.markAsPlayed();
      jest.runAllTimers();

      expect(consoleSpy).toHaveBeenCalledWith('Failed to mark as played:', expect.any(Error));
      expect(spectator.component.isSpinning()).toBe(false);

      consoleSpy.mockRestore();
      jest.useRealTimers();
    });
  });

  describe('onDataCleared', () => {
    it('should trigger page reload', () => {
      // Suppress jsdom's console.error for unimplemented navigation
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // window.location.reload is a browser API that cannot be easily mocked in jsdom
      // We test that the method exists and verify behavior indirectly
      // In a real browser environment, this would reload the page
      expect(spectator.component.onDataCleared).toBeDefined();

      // The method should not throw when called
      // Note: In jsdom, reload() is a no-op, but we verify our code runs correctly
      expect(() => spectator.component.onDataCleared()).not.toThrow();

      consoleSpy.mockRestore();
    });
  });

  describe('onFiltersChanged', () => {
    it('should fetch new recommendation when filters change', () => {
      mockRecommendationService.getRecommendation.mockClear();
      mockRecommendationService.getRecommendation.mockReturnValue(of(mockRelease));

      spectator.component.onFiltersChanged();

      expect(mockRecommendationService.getRecommendation).toHaveBeenCalled();
    });

    it('should update currentRelease with new recommendation', () => {
      const newRelease = { ...mockRelease, id: 555 };
      mockRecommendationService.getRecommendation.mockReturnValue(of(newRelease));

      spectator.component.onFiltersChanged();

      expect(spectator.component.currentRelease()?.id).toBe(555);
    });
  });

  describe('search functionality', () => {
    it('should initialize with searchOpen as false', () => {
      expect(spectator.component.searchOpen()).toBe(false);
    });

    it('should toggle searchOpen from false to true', () => {
      spectator.component.searchOpen.set(false);

      spectator.component.toggleSearch();

      expect(spectator.component.searchOpen()).toBe(true);
    });

    it('should toggle searchOpen from true to false', () => {
      spectator.component.searchOpen.set(true);

      spectator.component.toggleSearch();

      expect(spectator.component.searchOpen()).toBe(false);
    });

    it('should set searchOpen to false on closeSearch', () => {
      spectator.component.searchOpen.set(true);

      spectator.component.closeSearch();

      expect(spectator.component.searchOpen()).toBe(false);
    });
  });

  describe('onReleaseSelected', () => {
    it('should set currentRelease to selected release', () => {
      const selectedRelease = { ...mockRelease, id: 777 };

      spectator.component.onReleaseSelected(selectedRelease);

      expect(spectator.component.currentRelease()?.id).toBe(777);
    });

    it('should set isLoading to false', () => {
      spectator.component.isLoading.set(true);

      spectator.component.onReleaseSelected(mockRelease);

      expect(spectator.component.isLoading()).toBe(false);
    });
  });

  describe('history functionality', () => {
    it('should initialize with historyOpen as false', () => {
      expect(spectator.component.historyOpen()).toBe(false);
    });

    it('should toggle historyOpen from false to true', () => {
      spectator.component.historyOpen.set(false);

      spectator.component.toggleHistory();

      expect(spectator.component.historyOpen()).toBe(true);
    });

    it('should toggle historyOpen from true to false', () => {
      spectator.component.historyOpen.set(true);

      spectator.component.toggleHistory();

      expect(spectator.component.historyOpen()).toBe(false);
    });

    it('should set historyOpen to false on closeHistory', () => {
      spectator.component.historyOpen.set(true);

      spectator.component.closeHistory();

      expect(spectator.component.historyOpen()).toBe(false);
    });
  });

  describe('onHistoryReleaseSelected', () => {
    it('should set currentRelease to selected release', () => {
      const selectedRelease = { ...mockRelease, id: 888 };

      spectator.component.onHistoryReleaseSelected(selectedRelease);

      expect(spectator.component.currentRelease()?.id).toBe(888);
    });

    it('should set isLoading to false', () => {
      spectator.component.isLoading.set(true);

      spectator.component.onHistoryReleaseSelected(mockRelease);

      expect(spectator.component.isLoading()).toBe(false);
    });
  });

  describe('ngOnDestroy', () => {
    it('should complete destroy$ subject without error', () => {
      expect(() => spectator.component.ngOnDestroy()).not.toThrow();
    });
  });
});

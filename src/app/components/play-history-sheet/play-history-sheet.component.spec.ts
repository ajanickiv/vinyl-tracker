import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { PlayHistorySheetComponent, HistoryDisplayItem } from './play-history-sheet.component';
import { PlayHistoryService } from '../../services/play-history.service';
import { DatabaseService } from '../../services/database.service';
import { Release } from '../../models/release.model';
import { PlayHistoryEntry } from '../../models/play-history.model';

// Helper to flush all pending promises
const flushPromises = () => new Promise(process.nextTick);

describe('PlayHistorySheetComponent', () => {
  let spectator: Spectator<PlayHistorySheetComponent>;
  let mockPlayHistoryService: {
    getHistory: jest.Mock;
    addToHistory: jest.Mock;
    clearHistory: jest.Mock;
  };
  let mockDatabaseService: {
    getAllReleases: jest.Mock;
  };

  const createComponent = createComponentFactory({
    component: PlayHistorySheetComponent,
    detectChanges: false,
  });

  const createMockRelease = (id: number, title: string, artists: string[]): Release => ({
    id,
    instanceId: id,
    basicInfo: {
      title,
      artists,
      year: 1985,
      formats: ['Vinyl'],
      thumb: 'thumb.jpg',
      coverImage: 'cover.jpg',
      labels: ['Test Label'],
      genres: ['Rock'],
      styles: [],
    },
    playCount: 1,
    lastPlayedDate: new Date(),
    dateAdded: new Date(),
    dateAddedToCollection: new Date(),
    notes: '',
    rating: 0,
  });

  const mockReleases: Release[] = [
    createMockRelease(1, 'Abbey Road', ['The Beatles']),
    createMockRelease(2, 'Dark Side of the Moon', ['Pink Floyd']),
    createMockRelease(3, 'The Wall', ['Pink Floyd']),
  ];

  const mockHistoryEntries: PlayHistoryEntry[] = [
    { releaseId: 1, playedAt: new Date() },
    { releaseId: 2, playedAt: new Date(Date.now() - 86400000) }, // 1 day ago
  ];

  beforeEach(() => {
    mockPlayHistoryService = {
      getHistory: jest.fn().mockReturnValue(mockHistoryEntries),
      addToHistory: jest.fn(),
      clearHistory: jest.fn(),
    };

    mockDatabaseService = {
      getAllReleases: jest.fn().mockResolvedValue(mockReleases),
    };

    spectator = createComponent({
      props: {
        isOpen: false,
      },
      providers: [
        { provide: PlayHistoryService, useValue: mockPlayHistoryService },
        { provide: DatabaseService, useValue: mockDatabaseService },
      ],
    });
  });

  it('should create', () => {
    expect(spectator.component).toBeTruthy();
  });

  describe('initialization', () => {
    it('should initialize with empty history items', () => {
      expect(spectator.component.historyItems()).toEqual([]);
    });

    it('should initialize with isLoading as true', () => {
      expect(spectator.component.isLoading()).toBe(true);
    });

    it('should load history on init', async () => {
      spectator.detectChanges();
      await flushPromises();

      expect(mockPlayHistoryService.getHistory).toHaveBeenCalled();
      expect(mockDatabaseService.getAllReleases).toHaveBeenCalled();
    });

    it('should populate historyItems after loading', async () => {
      spectator.detectChanges();
      await flushPromises();

      expect(spectator.component.historyItems().length).toBe(2);
      expect(spectator.component.isLoading()).toBe(false);
    });

    it('should match releases to history entries', async () => {
      spectator.detectChanges();
      await flushPromises();

      const items = spectator.component.historyItems();
      expect(items[0].release?.basicInfo.title).toBe('Abbey Road');
      expect(items[1].release?.basicInfo.title).toBe('Dark Side of the Moon');
    });
  });

  describe('closeSheet', () => {
    it('should emit close event', () => {
      const closeSpy = jest.fn();
      spectator.component.close.subscribe(closeSpy);

      spectator.component.closeSheet();

      expect(closeSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('onBackdropClick', () => {
    it('should call closeSheet', () => {
      const closeSpy = jest.fn();
      spectator.component.close.subscribe(closeSpy);

      spectator.component.onBackdropClick();

      expect(closeSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('selectRelease', () => {
    it('should emit releaseSelected event when release exists', async () => {
      spectator.detectChanges();
      await flushPromises();

      const selectSpy = jest.fn();
      spectator.component.releaseSelected.subscribe(selectSpy);

      const item = spectator.component.historyItems()[0];
      spectator.component.selectRelease(item);

      expect(selectSpy).toHaveBeenCalledWith(item.release);
    });

    it('should close the sheet after selection', async () => {
      spectator.detectChanges();
      await flushPromises();

      const closeSpy = jest.fn();
      spectator.component.close.subscribe(closeSpy);

      const item = spectator.component.historyItems()[0];
      spectator.component.selectRelease(item);

      expect(closeSpy).toHaveBeenCalledTimes(1);
    });

    it('should not emit releaseSelected when release is null', () => {
      const selectSpy = jest.fn();
      spectator.component.releaseSelected.subscribe(selectSpy);

      const item: HistoryDisplayItem = {
        entry: { releaseId: 999, playedAt: new Date() },
        release: null,
      };
      spectator.component.selectRelease(item);

      expect(selectSpy).not.toHaveBeenCalled();
    });
  });

  describe('refreshHistory', () => {
    it('should reload history data', async () => {
      spectator.detectChanges();
      await flushPromises();

      mockPlayHistoryService.getHistory.mockClear();
      mockDatabaseService.getAllReleases.mockClear();

      spectator.component.refreshHistory();
      await flushPromises();

      expect(mockPlayHistoryService.getHistory).toHaveBeenCalled();
      expect(mockDatabaseService.getAllReleases).toHaveBeenCalled();
    });
  });

  describe('getRelativeTime', () => {
    it('should return "Just now" for very recent times', () => {
      const now = new Date();
      expect(spectator.component.getRelativeTime(now)).toBe('Just now');
    });

    it('should return minutes for times less than an hour ago', () => {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      expect(spectator.component.getRelativeTime(thirtyMinutesAgo)).toBe('30 min ago');
    });

    it('should return hours for times less than a day ago', () => {
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
      expect(spectator.component.getRelativeTime(threeHoursAgo)).toBe('3 hours ago');
    });

    it('should return "1 hour ago" (singular) for one hour', () => {
      const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);
      expect(spectator.component.getRelativeTime(oneHourAgo)).toBe('1 hour ago');
    });

    it('should return "Yesterday" for one day ago', () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      expect(spectator.component.getRelativeTime(yesterday)).toBe('Yesterday');
    });

    it('should return days for times less than a week ago', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      expect(spectator.component.getRelativeTime(threeDaysAgo)).toBe('3 days ago');
    });

    it('should return weeks for times less than a month ago', () => {
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      expect(spectator.component.getRelativeTime(twoWeeksAgo)).toBe('2 weeks ago');
    });

    it('should return "1 week ago" (singular) for one week', () => {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      expect(spectator.component.getRelativeTime(oneWeekAgo)).toBe('1 week ago');
    });

    it('should return months for times more than a month ago', () => {
      const twoMonthsAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      expect(spectator.component.getRelativeTime(twoMonthsAgo)).toBe('2 months ago');
    });

    it('should return "1 month ago" (singular) for one month', () => {
      const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      expect(spectator.component.getRelativeTime(oneMonthAgo)).toBe('1 month ago');
    });
  });

  describe('error handling', () => {
    it('should handle database error when loading history', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockDatabaseService.getAllReleases.mockRejectedValue(new Error('Database error'));

      spectator.component.ngOnInit();
      await flushPromises();

      expect(consoleSpy).toHaveBeenCalledWith('Failed to load play history:', expect.any(Error));
      expect(spectator.component.historyItems()).toEqual([]);
      expect(spectator.component.isLoading()).toBe(false);

      consoleSpy.mockRestore();
    });
  });

  describe('missing releases', () => {
    it('should set release to null for entries not in collection', async () => {
      const historyWithMissing: PlayHistoryEntry[] = [
        { releaseId: 999, playedAt: new Date() }, // Not in mockReleases
        { releaseId: 1, playedAt: new Date() },
      ];
      mockPlayHistoryService.getHistory.mockReturnValue(historyWithMissing);

      spectator.detectChanges();
      await flushPromises();

      const items = spectator.component.historyItems();
      expect(items[0].release).toBeNull();
      expect(items[1].release).not.toBeNull();
    });
  });

  describe('cleanup', () => {
    it('should complete destroy$ on ngOnDestroy', () => {
      spectator.detectChanges();

      expect(() => spectator.component.ngOnDestroy()).not.toThrow();
    });
  });
});

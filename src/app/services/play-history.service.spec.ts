import { TestBed } from '@angular/core/testing';
import { PlayHistoryService } from './play-history.service';
import { MAX_HISTORY_ENTRIES, PLAY_HISTORY_STORAGE_KEY } from '../models/play-history.model';

describe('PlayHistoryService', () => {
  let service: PlayHistoryService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(PlayHistoryService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initialization', () => {
    it('should initialize with empty history', () => {
      expect(service.history()).toEqual([]);
    });

    it('should load history from localStorage if available', () => {
      const storedHistory = [
        { releaseId: 123, playedAt: '2024-01-15T10:00:00.000Z' },
        { releaseId: 456, playedAt: '2024-01-14T10:00:00.000Z' },
      ];
      localStorage.setItem(PLAY_HISTORY_STORAGE_KEY, JSON.stringify(storedHistory));

      const newService = new PlayHistoryService();

      expect(newService.history().length).toBe(2);
      expect(newService.history()[0].releaseId).toBe(123);
      expect(newService.history()[1].releaseId).toBe(456);
    });

    it('should convert stored date strings to Date objects', () => {
      const storedHistory = [{ releaseId: 123, playedAt: '2024-01-15T10:00:00.000Z' }];
      localStorage.setItem(PLAY_HISTORY_STORAGE_KEY, JSON.stringify(storedHistory));

      const newService = new PlayHistoryService();

      expect(newService.history()[0].playedAt).toBeInstanceOf(Date);
    });

    it('should handle invalid localStorage data gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      localStorage.setItem(PLAY_HISTORY_STORAGE_KEY, 'invalid json');

      const newService = new PlayHistoryService();

      expect(newService.history()).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load play history:',
        expect.any(SyntaxError),
      );
      consoleSpy.mockRestore();
    });
  });

  describe('hasHistory', () => {
    it('should return false when history is empty', () => {
      expect(service.hasHistory()).toBe(false);
    });

    it('should return true when history has entries', () => {
      service.addToHistory(123);

      expect(service.hasHistory()).toBe(true);
    });
  });

  describe('historyCount', () => {
    it('should return 0 when history is empty', () => {
      expect(service.historyCount()).toBe(0);
    });

    it('should return correct count', () => {
      service.addToHistory(1);
      service.addToHistory(2);
      service.addToHistory(3);

      expect(service.historyCount()).toBe(3);
    });
  });

  describe('addToHistory', () => {
    it('should add entry to history', () => {
      service.addToHistory(123);

      expect(service.history().length).toBe(1);
      expect(service.history()[0].releaseId).toBe(123);
    });

    it('should add new entries at the front', () => {
      service.addToHistory(1);
      service.addToHistory(2);
      service.addToHistory(3);

      expect(service.history()[0].releaseId).toBe(3);
      expect(service.history()[1].releaseId).toBe(2);
      expect(service.history()[2].releaseId).toBe(1);
    });

    it('should set playedAt to current date', () => {
      const before = new Date();
      service.addToHistory(123);
      const after = new Date();

      const playedAt = service.history()[0].playedAt;
      expect(playedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(playedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should remove duplicate entries (same releaseId)', () => {
      service.addToHistory(1);
      service.addToHistory(2);
      service.addToHistory(1); // duplicate

      expect(service.history().length).toBe(2);
      expect(service.history()[0].releaseId).toBe(1); // most recent
      expect(service.history()[1].releaseId).toBe(2);
    });

    it('should move duplicate to front with updated timestamp', () => {
      service.addToHistory(1);
      const firstPlayedAt = service.history()[0].playedAt;

      // Wait a tiny bit to ensure timestamp is different
      service.addToHistory(2);
      service.addToHistory(1); // play again

      const newPlayedAt = service.history()[0].playedAt;
      expect(service.history()[0].releaseId).toBe(1);
      expect(newPlayedAt.getTime()).toBeGreaterThanOrEqual(firstPlayedAt.getTime());
    });

    it('should limit history to MAX_HISTORY_ENTRIES', () => {
      // Add more than max entries
      for (let i = 0; i < MAX_HISTORY_ENTRIES + 5; i++) {
        service.addToHistory(i);
      }

      expect(service.history().length).toBe(MAX_HISTORY_ENTRIES);
    });

    it('should keep most recent entries when trimming', () => {
      for (let i = 0; i < MAX_HISTORY_ENTRIES + 5; i++) {
        service.addToHistory(i);
      }

      // The oldest entries (0-4) should be removed
      const releaseIds = service.history().map((e) => e.releaseId);
      expect(releaseIds).not.toContain(0);
      expect(releaseIds).not.toContain(4);
      // The newest entry should be at front
      expect(service.history()[0].releaseId).toBe(MAX_HISTORY_ENTRIES + 4);
    });

    it('should persist to localStorage', () => {
      service.addToHistory(123);

      const stored = JSON.parse(localStorage.getItem(PLAY_HISTORY_STORAGE_KEY)!);
      expect(stored.length).toBe(1);
      expect(stored[0].releaseId).toBe(123);
    });

    it('should store dates as ISO strings in localStorage', () => {
      service.addToHistory(123);

      const stored = JSON.parse(localStorage.getItem(PLAY_HISTORY_STORAGE_KEY)!);
      expect(typeof stored[0].playedAt).toBe('string');
      expect(stored[0].playedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('getHistory', () => {
    it('should return empty array when no history', () => {
      expect(service.getHistory()).toEqual([]);
    });

    it('should return all history entries', () => {
      service.addToHistory(1);
      service.addToHistory(2);

      const history = service.getHistory();
      expect(history.length).toBe(2);
    });
  });

  describe('clearHistory', () => {
    it('should clear all history entries', () => {
      service.addToHistory(1);
      service.addToHistory(2);
      service.addToHistory(3);

      service.clearHistory();

      expect(service.history()).toEqual([]);
    });

    it('should update hasHistory to false', () => {
      service.addToHistory(1);
      expect(service.hasHistory()).toBe(true);

      service.clearHistory();

      expect(service.hasHistory()).toBe(false);
    });

    it('should persist cleared state to localStorage', () => {
      service.addToHistory(1);
      service.clearHistory();

      const stored = JSON.parse(localStorage.getItem(PLAY_HISTORY_STORAGE_KEY)!);
      expect(stored).toEqual([]);
    });
  });

  describe('localStorage error handling', () => {
    it('should handle localStorage save errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn().mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      // Should not throw
      expect(() => service.addToHistory(123)).not.toThrow();

      localStorage.setItem = originalSetItem;
      consoleSpy.mockRestore();
    });
  });
});

import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { Subject } from 'rxjs';
import { PlayStatsExportService } from './play-stats-export.service';
import { DatabaseService } from './database.service';
import { PlayHistoryService } from './play-history.service';
import { PlaybackService } from './playback.service';
import { Release } from '../models/release.model';
import { PlayStatsExport } from '../models/play-stats-export.model';

describe('PlayStatsExportService', () => {
  let spectator: SpectatorService<PlayStatsExportService>;
  let mockStatsUpdated$: Subject<void>;

  const createService = createServiceFactory({
    service: PlayStatsExportService,
    mocks: [DatabaseService, PlayHistoryService],
    providers: [
      {
        provide: PlaybackService,
        useFactory: () => {
          mockStatsUpdated$ = new Subject<void>();
          return { statsUpdated$: mockStatsUpdated$ };
        },
      },
    ],
  });

  const mockRelease1: Release = {
    id: 1,
    instanceId: 101,
    basicInfo: {
      title: 'Test Album 1',
      artists: ['Artist 1'],
      year: 2020,
      formats: ['Vinyl'],
      thumb: 'thumb1.jpg',
      coverImage: 'cover1.jpg',
      labels: ['Label 1'],
      genres: ['Rock'],
      styles: ['Alternative'],
    },
    playCount: 5,
    lastPlayedDate: new Date('2024-01-15T10:00:00Z'),
    dateAdded: new Date('2024-01-01'),
    dateAddedToCollection: new Date('2024-01-01'),
  };

  const mockRelease2: Release = {
    id: 2,
    instanceId: 102,
    basicInfo: {
      title: 'Test Album 2',
      artists: ['Artist 2'],
      year: 2021,
      formats: ['Vinyl'],
      thumb: 'thumb2.jpg',
      coverImage: 'cover2.jpg',
      labels: ['Label 2'],
      genres: ['Jazz'],
      styles: ['Bebop'],
    },
    playCount: 0,
    dateAdded: new Date('2024-01-10'),
    dateAddedToCollection: new Date('2024-01-10'),
  };

  const mockRelease3: Release = {
    id: 3,
    instanceId: 103,
    basicInfo: {
      title: 'Test Album 3',
      artists: ['Artist 3'],
      year: 2022,
      formats: ['Vinyl'],
      thumb: 'thumb3.jpg',
      coverImage: 'cover3.jpg',
      labels: ['Label 3'],
      genres: ['Electronic'],
      styles: ['House'],
    },
    playCount: 10,
    lastPlayedDate: new Date('2024-01-20T10:00:00Z'),
    dateAdded: new Date('2024-01-05'),
    dateAddedToCollection: new Date('2024-01-05'),
  };

  beforeEach(() => {
    spectator = createService();
  });

  it('should be created', () => {
    expect(spectator.service).toBeTruthy();
  });

  describe('generateExportData', () => {
    it('should return correct structure with all play stats', async () => {
      const db = spectator.inject(DatabaseService);
      const playHistoryService = spectator.inject(PlayHistoryService);

      db.getAllReleases.mockResolvedValue([mockRelease1, mockRelease3]);
      playHistoryService.getHistory.mockReturnValue([
        { releaseId: 1, playedAt: new Date('2024-01-15T10:00:00Z') },
      ]);

      const result = await spectator.service.generateExportData();

      expect(result.version).toBe(1);
      expect(result.exportedAt).toBeDefined();
      expect(result.playStats['1']).toEqual({
        playCount: 5,
        lastPlayedDate: '2024-01-15T10:00:00.000Z',
      });
      expect(result.playStats['3']).toEqual({
        playCount: 10,
        lastPlayedDate: '2024-01-20T10:00:00.000Z',
      });
      expect(result.playHistory).toEqual([{ releaseId: 1, playedAt: '2024-01-15T10:00:00.000Z' }]);
    });

    it('should exclude releases with zero plays and no lastPlayedDate', async () => {
      const db = spectator.inject(DatabaseService);
      const playHistoryService = spectator.inject(PlayHistoryService);

      db.getAllReleases.mockResolvedValue([mockRelease1, mockRelease2]);
      playHistoryService.getHistory.mockReturnValue([]);

      const result = await spectator.service.generateExportData();

      expect(result.playStats['1']).toBeDefined();
      expect(result.playStats['2']).toBeUndefined();
    });

    it('should handle empty collection', async () => {
      const db = spectator.inject(DatabaseService);
      const playHistoryService = spectator.inject(PlayHistoryService);

      db.getAllReleases.mockResolvedValue([]);
      playHistoryService.getHistory.mockReturnValue([]);

      const result = await spectator.service.generateExportData();

      expect(result.playStats).toEqual({});
      expect(result.playHistory).toEqual([]);
    });
  });

  describe('validateImportFile', () => {
    it('should reject invalid JSON', () => {
      const result = spectator.service.validateImportFile('not valid json');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid JSON format');
    });

    it('should reject wrong version', () => {
      const data = {
        version: 2,
        exportedAt: '2024-01-15T10:00:00Z',
        playStats: {},
        playHistory: [],
      };

      const result = spectator.service.validateImportFile(JSON.stringify(data));

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Unsupported version');
    });

    it('should reject missing required fields', () => {
      const data = {
        version: 1,
      };

      const result = spectator.service.validateImportFile(JSON.stringify(data));

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject invalid playCount', () => {
      const data = {
        version: 1,
        exportedAt: '2024-01-15T10:00:00Z',
        playStats: {
          '1': { playCount: -5 },
        },
        playHistory: [],
      };

      const result = spectator.service.validateImportFile(JSON.stringify(data));

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('playCount'))).toBe(true);
    });

    it('should accept valid file', () => {
      const data: PlayStatsExport = {
        version: 1,
        exportedAt: '2024-01-15T10:00:00Z',
        playStats: {
          '1': { playCount: 5, lastPlayedDate: '2024-01-15T10:00:00Z' },
        },
        playHistory: [{ releaseId: 1, playedAt: '2024-01-15T10:00:00Z' }],
      };

      const result = spectator.service.validateImportFile(JSON.stringify(data));

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.data).toEqual(data);
    });
  });

  describe('importFromData', () => {
    const validExportData: PlayStatsExport = {
      version: 1,
      exportedAt: '2024-01-15T10:00:00Z',
      playStats: {
        '1': { playCount: 5, lastPlayedDate: '2024-01-15T10:00:00Z' },
        '999': { playCount: 3, lastPlayedDate: '2024-01-10T10:00:00Z' },
      },
      playHistory: [{ releaseId: 1, playedAt: '2024-01-15T10:00:00Z' }],
    };

    it('should overwrite existing values in replace mode', async () => {
      const db = spectator.inject(DatabaseService);
      const playHistoryService = spectator.inject(PlayHistoryService);

      // Mock getAllReleases for the reset phase
      db.getAllReleases.mockResolvedValue([mockRelease1, mockRelease3]);
      db.getRelease.mockImplementation(async (id: number) => {
        if (id === 1) return mockRelease1;
        return undefined;
      });
      db.updateRelease.mockResolvedValue(1);

      const result = await spectator.service.importFromData(validExportData, 'replace');

      // Should reset existing releases first, then apply import values
      expect(db.updateRelease).toHaveBeenCalledWith(1, {
        playCount: 5,
        lastPlayedDate: new Date('2024-01-15T10:00:00Z'),
      });
      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(1);
      // setHistory called twice: once to clear, once to set imported history
      expect(playHistoryService.setHistory).toHaveBeenCalledTimes(2);
    });

    it('should reset releases not in import file to zero in replace mode', async () => {
      const db = spectator.inject(DatabaseService);

      // mockRelease3 has playCount: 10 but is NOT in the import file
      db.getAllReleases.mockResolvedValue([mockRelease1, mockRelease3]);
      db.getRelease.mockImplementation(async (id: number) => {
        if (id === 1) return mockRelease1;
        return undefined;
      });
      db.updateRelease.mockResolvedValue(1);

      await spectator.service.importFromData(validExportData, 'replace');

      // mockRelease3 should be reset to 0 (it has playCount > 0)
      expect(db.updateRelease).toHaveBeenCalledWith(3, {
        playCount: 0,
        lastPlayedDate: undefined,
      });
    });

    it('should add play counts in merge mode', async () => {
      const db = spectator.inject(DatabaseService);
      const playHistoryService = spectator.inject(PlayHistoryService);

      db.getRelease.mockImplementation(async (id: number) => {
        if (id === 1) return mockRelease1; // Has playCount: 5
        return undefined;
      });
      db.updateRelease.mockResolvedValue(1);

      const result = await spectator.service.importFromData(validExportData, 'merge');

      // mockRelease1 has playCount: 5, import adds 5 more = 10
      expect(db.updateRelease).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          playCount: 10,
        }),
      );
      expect(result.imported).toBe(1);
      expect(playHistoryService.setHistory).toHaveBeenCalled();
    });

    it('should take latest date in merge mode', async () => {
      const db = spectator.inject(DatabaseService);

      // Release with older lastPlayedDate than import
      const olderRelease = {
        ...mockRelease1,
        lastPlayedDate: new Date('2024-01-01T10:00:00Z'),
      };

      db.getRelease.mockImplementation(async (id: number) => {
        if (id === 1) return olderRelease;
        return undefined;
      });
      db.updateRelease.mockResolvedValue(1);

      await spectator.service.importFromData(validExportData, 'merge');

      // Import has newer date (2024-01-15), so that should be used
      expect(db.updateRelease).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          lastPlayedDate: new Date('2024-01-15T10:00:00Z'),
        }),
      );
    });

    it('should skip releases not in database', async () => {
      const db = spectator.inject(DatabaseService);

      db.getAllReleases.mockResolvedValue([]);
      db.getRelease.mockResolvedValue(undefined);

      const result = await spectator.service.importFromData(validExportData, 'replace');

      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(2);
      // updateRelease not called for import (reset phase has nothing to reset)
      expect(db.updateRelease).not.toHaveBeenCalled();
    });

    it('should return correct counts', async () => {
      const db = spectator.inject(DatabaseService);

      db.getAllReleases.mockResolvedValue([mockRelease1]);
      db.getRelease.mockImplementation(async (id: number) => {
        if (id === 1) return mockRelease1;
        return undefined;
      });
      db.updateRelease.mockResolvedValue(1);

      const result = await spectator.service.importFromData(validExportData, 'replace');

      expect(result.success).toBe(true);
      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.errors).toEqual([]);
    });

    it('should import play history', async () => {
      const db = spectator.inject(DatabaseService);
      const playHistoryService = spectator.inject(PlayHistoryService);

      db.getAllReleases.mockResolvedValue([]);
      db.getRelease.mockResolvedValue(undefined);

      await spectator.service.importFromData(validExportData, 'replace');

      // In replace mode, setHistory is called twice: first to clear, then to set imported
      expect(playHistoryService.setHistory).toHaveBeenCalledWith([
        { releaseId: 1, playedAt: new Date('2024-01-15T10:00:00Z') },
      ]);
    });

    it('should clear history in replace mode even with empty import history', async () => {
      const db = spectator.inject(DatabaseService);
      const playHistoryService = spectator.inject(PlayHistoryService);

      const dataWithNoHistory: PlayStatsExport = {
        ...validExportData,
        playHistory: [],
      };

      db.getAllReleases.mockResolvedValue([]);
      db.getRelease.mockResolvedValue(undefined);

      await spectator.service.importFromData(dataWithNoHistory, 'replace');

      // In replace mode, history is cleared even if import has no history
      expect(playHistoryService.setHistory).toHaveBeenCalledWith([]);
    });

    it('should not modify history in merge mode with empty import history', async () => {
      const db = spectator.inject(DatabaseService);
      const playHistoryService = spectator.inject(PlayHistoryService);

      const dataWithNoHistory: PlayStatsExport = {
        ...validExportData,
        playHistory: [],
      };

      db.getRelease.mockResolvedValue(undefined);

      await spectator.service.importFromData(dataWithNoHistory, 'merge');

      expect(playHistoryService.setHistory).not.toHaveBeenCalled();
    });

    it('should emit on statsUpdated$ after successful import', async () => {
      const db = spectator.inject(DatabaseService);

      db.getAllReleases.mockResolvedValue([mockRelease1]);
      db.getRelease.mockImplementation(async (id: number) => {
        if (id === 1) return mockRelease1;
        return undefined;
      });
      db.updateRelease.mockResolvedValue(1);

      const statsUpdatedSpy = jest.fn();
      mockStatsUpdated$.subscribe(statsUpdatedSpy);

      await spectator.service.importFromData(validExportData, 'replace');

      expect(statsUpdatedSpy).toHaveBeenCalledTimes(1);
    });

    it('should emit on statsUpdated$ when releases are reset even if none imported', async () => {
      const db = spectator.inject(DatabaseService);

      // Have releases to reset, but import file has no matching releases
      db.getAllReleases.mockResolvedValue([mockRelease1]);
      db.getRelease.mockResolvedValue(undefined);
      db.updateRelease.mockResolvedValue(1);

      const statsUpdatedSpy = jest.fn();
      mockStatsUpdated$.subscribe(statsUpdatedSpy);

      await spectator.service.importFromData(validExportData, 'replace');

      // Should still emit because releases were reset
      expect(statsUpdatedSpy).toHaveBeenCalledTimes(1);
    });

    it('should not emit on statsUpdated$ when nothing changes', async () => {
      const db = spectator.inject(DatabaseService);

      // No releases to reset, no releases to import
      db.getAllReleases.mockResolvedValue([]);
      db.getRelease.mockResolvedValue(undefined);

      const statsUpdatedSpy = jest.fn();
      mockStatsUpdated$.subscribe(statsUpdatedSpy);

      await spectator.service.importFromData(validExportData, 'replace');

      expect(statsUpdatedSpy).not.toHaveBeenCalled();
    });
  });
});

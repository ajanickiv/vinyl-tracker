import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { firstValueFrom } from 'rxjs';
import { PlaybackService } from './playback.service';
import { DatabaseService } from './database.service';
import { PlayHistoryService } from './play-history.service';
import { Release } from '../models/release.model';

describe('PlaybackService', () => {
  let spectator: SpectatorService<PlaybackService>;
  const createService = createServiceFactory({
    service: PlaybackService,
    mocks: [DatabaseService, PlayHistoryService],
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
    lastPlayedDate: new Date('2024-01-15'),
    dateAdded: new Date('2024-01-01'),
    dateAddedToCollection: new Date('2024-01-01'),
    notes: 'Great album',
    rating: 5,
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
    notes: 'New addition',
    rating: 4,
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
    lastPlayedDate: new Date('2024-01-20'),
    dateAdded: new Date('2024-01-05'),
    dateAddedToCollection: new Date('2024-01-05'),
    notes: 'Most played',
    rating: 5,
  };

  beforeEach(() => {
    spectator = createService();
  });

  it('should be created', () => {
    expect(spectator.service).toBeTruthy();
  });

  describe('getCollectionStats', () => {
    it('should calculate stats for empty collection', async () => {
      const db = spectator.inject(DatabaseService);
      db.getAllReleases.mockResolvedValue([]);

      const stats = await firstValueFrom(spectator.service.getCollectionStats());

      expect(stats).toEqual({
        totalReleases: 0,
        totalPlays: 0,
        neverPlayed: 0,
        mostPlayed: undefined,
        leastPlayed: undefined,
      });
    });

    it('should calculate total releases correctly', async () => {
      const db = spectator.inject(DatabaseService);
      db.getAllReleases.mockResolvedValue([mockRelease1, mockRelease2, mockRelease3]);

      const stats = await firstValueFrom(spectator.service.getCollectionStats());

      expect(stats.totalReleases).toBe(3);
    });

    it('should calculate total plays correctly', async () => {
      const db = spectator.inject(DatabaseService);
      db.getAllReleases.mockResolvedValue([mockRelease1, mockRelease2, mockRelease3]);

      const stats = await firstValueFrom(spectator.service.getCollectionStats());

      expect(stats.totalPlays).toBe(15); // 5 + 0 + 10
    });

    it('should count never played releases correctly', async () => {
      const db = spectator.inject(DatabaseService);
      db.getAllReleases.mockResolvedValue([mockRelease1, mockRelease2, mockRelease3]);

      const stats = await firstValueFrom(spectator.service.getCollectionStats());

      expect(stats.neverPlayed).toBe(1); // Only mockRelease2 has 0 plays
    });

    it('should identify most played release', async () => {
      const db = spectator.inject(DatabaseService);
      db.getAllReleases.mockResolvedValue([mockRelease1, mockRelease2, mockRelease3]);

      const stats = await firstValueFrom(spectator.service.getCollectionStats());

      expect(stats.mostPlayed).toEqual(mockRelease3); // Has 10 plays
    });

    it('should identify least played release (excluding never played)', async () => {
      const db = spectator.inject(DatabaseService);
      db.getAllReleases.mockResolvedValue([mockRelease1, mockRelease2, mockRelease3]);

      const stats = await firstValueFrom(spectator.service.getCollectionStats());

      expect(stats.leastPlayed).toEqual(mockRelease1); // Has 5 plays (lowest non-zero)
    });

    it('should handle collection with all releases never played', async () => {
      const neverPlayed1 = { ...mockRelease1, playCount: 0, lastPlayedDate: undefined };
      const neverPlayed2 = { ...mockRelease2, playCount: 0 };

      const db = spectator.inject(DatabaseService);
      db.getAllReleases.mockResolvedValue([neverPlayed1, neverPlayed2]);

      const stats = await firstValueFrom(spectator.service.getCollectionStats());

      expect(stats.totalPlays).toBe(0);
      expect(stats.neverPlayed).toBe(2);
      expect(stats.leastPlayed).toBeUndefined();
    });

    it('should handle collection with single release', async () => {
      const db = spectator.inject(DatabaseService);
      db.getAllReleases.mockResolvedValue([mockRelease1]);

      const stats = await firstValueFrom(spectator.service.getCollectionStats());

      expect(stats.totalReleases).toBe(1);
      expect(stats.totalPlays).toBe(5);
      expect(stats.neverPlayed).toBe(0);
      expect(stats.mostPlayed).toEqual(mockRelease1);
      expect(stats.leastPlayed).toEqual(mockRelease1);
    });
  });

  describe('markAsPlayed', () => {
    it('should increment play count', async () => {
      const db = spectator.inject(DatabaseService);
      db.getRelease.mockResolvedValue(mockRelease1);
      db.updateRelease.mockResolvedValue(1);

      const result = await firstValueFrom(spectator.service.markAsPlayed(1));

      expect(result?.playCount).toBe(6); // Was 5, now 6
    });

    it('should set lastPlayedDate to current date', async () => {
      const db = spectator.inject(DatabaseService);
      db.getRelease.mockResolvedValue(mockRelease1);
      db.updateRelease.mockResolvedValue(1);

      const before = new Date();
      const result = await firstValueFrom(spectator.service.markAsPlayed(1));
      const after = new Date();

      expect(result?.lastPlayedDate).toBeDefined();
      expect(result!.lastPlayedDate!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result!.lastPlayedDate!.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should call db.updateRelease with correct parameters', async () => {
      const db = spectator.inject(DatabaseService);
      db.getRelease.mockResolvedValue(mockRelease1);
      db.updateRelease.mockResolvedValue(1);

      await firstValueFrom(spectator.service.markAsPlayed(1));

      expect(db.updateRelease).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          playCount: 6,
          lastPlayedDate: expect.any(Date),
        }),
      );
    });

    it('should return null if release not found', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const db = spectator.inject(DatabaseService);
      db.getRelease.mockResolvedValue(undefined);

      const result = await firstValueFrom(spectator.service.markAsPlayed(999));

      expect(result).toBeNull();
      expect(db.updateRelease).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Release 999 not found');
      consoleSpy.mockRestore();
    });

    it('should return null and log error on database failure', async () => {
      const db = spectator.inject(DatabaseService);
      db.getRelease.mockRejectedValue(new Error('Database error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await firstValueFrom(spectator.service.markAsPlayed(1));

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Failed to mark as played:', expect.any(Error));

      consoleSpy.mockRestore();
    });

    it('should increment play count from 0 for never played release', async () => {
      const db = spectator.inject(DatabaseService);
      db.getRelease.mockResolvedValue(mockRelease2);
      db.updateRelease.mockResolvedValue(1);

      const result = await firstValueFrom(spectator.service.markAsPlayed(2));

      expect(result?.playCount).toBe(1); // Was 0, now 1
    });

    it('should preserve other release properties', async () => {
      const db = spectator.inject(DatabaseService);
      db.getRelease.mockResolvedValue(mockRelease1);
      db.updateRelease.mockResolvedValue(1);

      const result = await firstValueFrom(spectator.service.markAsPlayed(1));

      expect(result?.basicInfo.title).toBe('Test Album 1');
      expect(result?.basicInfo.artists).toEqual(['Artist 1']);
      expect(result?.rating).toBe(5);
    });

    it('should add release to play history', async () => {
      const db = spectator.inject(DatabaseService);
      const playHistoryService = spectator.inject(PlayHistoryService);
      db.getRelease.mockResolvedValue(mockRelease1);
      db.updateRelease.mockResolvedValue(1);

      await firstValueFrom(spectator.service.markAsPlayed(1));

      expect(playHistoryService.addToHistory).toHaveBeenCalledWith(1);
    });

    it('should not add to history if release not found', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const db = spectator.inject(DatabaseService);
      const playHistoryService = spectator.inject(PlayHistoryService);
      db.getRelease.mockResolvedValue(undefined);

      await firstValueFrom(spectator.service.markAsPlayed(999));

      expect(playHistoryService.addToHistory).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Release 999 not found');
      consoleSpy.mockRestore();
    });
  });

  describe('getPlayStats', () => {
    it('should return play stats for existing release', async () => {
      const db = spectator.inject(DatabaseService);
      db.getRelease.mockResolvedValue(mockRelease1);

      const stats = await firstValueFrom(spectator.service.getPlayStats(1));

      expect(stats).toEqual({
        playCount: 5,
        lastPlayedDate: mockRelease1.lastPlayedDate,
        daysSinceLastPlayed: expect.any(Number),
      });
    });

    it('should return null for non-existent release', async () => {
      const db = spectator.inject(DatabaseService);
      db.getRelease.mockResolvedValue(undefined);

      const stats = await firstValueFrom(spectator.service.getPlayStats(999));

      expect(stats).toBeNull();
    });

    it('should not include daysSinceLastPlayed if never played', async () => {
      const db = spectator.inject(DatabaseService);
      db.getRelease.mockResolvedValue(mockRelease2);

      const stats = await firstValueFrom(spectator.service.getPlayStats(2));

      expect(stats).toEqual({
        playCount: 0,
        lastPlayedDate: undefined,
        daysSinceLastPlayed: undefined,
      });
    });

    it('should calculate days since last played correctly', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-20T10:00:00Z'));

      const release = {
        ...mockRelease1,
        lastPlayedDate: new Date('2024-01-15T10:00:00Z'),
      };

      const db = spectator.inject(DatabaseService);
      db.getRelease.mockResolvedValue(release);

      const stats = await firstValueFrom(spectator.service.getPlayStats(1));

      expect(stats?.daysSinceLastPlayed).toBe(5);

      jest.useRealTimers();
    });

    it('should return 0 days if played today', async () => {
      jest.useFakeTimers();
      const now = new Date('2024-01-20T10:00:00Z');
      jest.setSystemTime(now);

      const release = {
        ...mockRelease1,
        lastPlayedDate: new Date('2024-01-20T08:00:00Z'),
      };

      const db = spectator.inject(DatabaseService);
      db.getRelease.mockResolvedValue(release);

      const stats = await firstValueFrom(spectator.service.getPlayStats(1));

      expect(stats?.daysSinceLastPlayed).toBe(0);

      jest.useRealTimers();
    });
  });
});

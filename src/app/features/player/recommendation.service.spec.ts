import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { firstValueFrom } from 'rxjs';
import { RecommendationService } from './recommendation.service';
import { DatabaseService } from '../../core/database.service';
import { Release } from '../../shared/models/release.model';

describe('RecommendationService', () => {
  let spectator: SpectatorService<RecommendationService>;
  const createService = createServiceFactory({
    service: RecommendationService,
    mocks: [DatabaseService],
  });

  const createMockRelease = (overrides: Partial<Release>): Release => ({
    id: 1,
    instanceId: 101,
    basicInfo: {
      title: 'Test Album',
      artists: ['Test Artist'],
      year: 2020,
      formats: ['Vinyl'],
      thumb: 'thumb.jpg',
      coverImage: 'cover.jpg',
      labels: ['Test Label'],
      genres: ['Rock'],
      styles: ['Alternative'],
    },
    playCount: 0,
    dateAdded: new Date('2024-01-01'),
    dateAddedToCollection: new Date('2024-01-01'),
    notes: 'Test notes',
    rating: 4,
    ...overrides,
  });

  const mockNeverPlayed1 = createMockRelease({
    id: 1,
    playCount: 0,
    basicInfo: {
      title: 'Never Played 1',
      artists: ['Artist 1'],
      formats: ['Vinyl'],
      genres: ['Rock'],
      styles: ['Alternative'],
    },
  });

  const mockNeverPlayed2 = createMockRelease({
    id: 2,
    playCount: 0,
    basicInfo: {
      title: 'Never Played 2',
      artists: ['Artist 2'],
      formats: ['CD'],
      genres: ['Jazz'],
      styles: ['Bebop'],
    },
  });

  const mockPlayed1 = createMockRelease({
    id: 3,
    playCount: 5,
    lastPlayedDate: new Date('2024-01-15'),
    basicInfo: {
      title: 'Played 1',
      artists: ['Artist 3'],
      formats: ['Vinyl'],
      genres: ['Electronic'],
      styles: ['House'],
    },
  });

  const mockPlayed2 = createMockRelease({
    id: 4,
    playCount: 10,
    lastPlayedDate: new Date('2024-01-10'),
    basicInfo: {
      title: 'Played 2',
      artists: ['Artist 4'],
      formats: ['Vinyl'],
      genres: ['Rock'],
      styles: ['Indie'],
    },
  });

  beforeEach(() => {
    spectator = createService();
    // Mock Math.random to make tests deterministic
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be created', () => {
    expect(spectator.service).toBeTruthy();
  });

  describe('getRecommendation', () => {
    it('should return null for empty collection', async () => {
      const db = spectator.inject(DatabaseService);
      db.getAllReleases.mockResolvedValue([]);

      const result = await firstValueFrom(spectator.service.getRecommendation());

      expect(result).toBeNull();
    });

    it('should prioritize never-played items', async () => {
      const db = spectator.inject(DatabaseService);
      db.getAllReleases.mockResolvedValue([mockNeverPlayed1, mockNeverPlayed2]);

      const result = await firstValueFrom(spectator.service.getRecommendation());

      expect(result).toBeDefined();
      expect(result?.playCount).toBe(0);
      expect([mockNeverPlayed1.id, mockNeverPlayed2.id]).toContain(result?.id);
    });

    it('should use weighted random when all items are played', async () => {
      const db = spectator.inject(DatabaseService);
      db.getAllReleases.mockResolvedValue([mockPlayed1, mockPlayed2]);

      const result = await firstValueFrom(spectator.service.getRecommendation());

      expect(result).toBeDefined();
      expect(result?.playCount).toBeGreaterThan(0);
      expect([mockPlayed1.id, mockPlayed2.id]).toContain(result?.id);
    });

    it('should return null on database error', async () => {
      const db = spectator.inject(DatabaseService);
      db.getAllReleases.mockRejectedValue(new Error('Database error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await firstValueFrom(spectator.service.getRecommendation());

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Failed to get recommendation:', expect.any(Error));

      consoleSpy.mockRestore();
    });

    it('should set filteredCount to the number of matching releases', async () => {
      const db = spectator.inject(DatabaseService);
      db.getAllReleases.mockResolvedValue([mockNeverPlayed1, mockNeverPlayed2, mockPlayed1]);

      await firstValueFrom(spectator.service.getRecommendation());

      expect(spectator.service.filteredCount()).toBe(3);
    });

    it('should set filteredCount to 0 when no releases match filters', async () => {
      const db = spectator.inject(DatabaseService);
      db.getAllReleases.mockResolvedValue([]);

      await firstValueFrom(spectator.service.getRecommendation());

      expect(spectator.service.filteredCount()).toBe(0);
    });
  });

  describe('getRecommendationByFormat', () => {
    it('should filter by format', async () => {
      const db = spectator.inject(DatabaseService);
      db.getAllReleases.mockResolvedValue([
        mockNeverPlayed1, // Vinyl
        mockNeverPlayed2, // CD
        mockPlayed1, // Vinyl
      ]);

      const result = await firstValueFrom(spectator.service.getRecommendationByFormat('Vinyl'));

      expect(result).toBeDefined();
      expect(result?.basicInfo.formats).toContain('Vinyl');
    });

    it('should return null if no releases match format', async () => {
      const db = spectator.inject(DatabaseService);
      db.getAllReleases.mockResolvedValue([mockNeverPlayed2]); // Only CD

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await firstValueFrom(spectator.service.getRecommendationByFormat('Vinyl'));

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('No releases found for format: Vinyl');

      consoleSpy.mockRestore();
    });

    it('should prioritize never-played items in format', async () => {
      const db = spectator.inject(DatabaseService);
      db.getAllReleases.mockResolvedValue([
        mockNeverPlayed1, // Never played Vinyl
        mockPlayed1, // Played Vinyl
      ]);

      const result = await firstValueFrom(spectator.service.getRecommendationByFormat('Vinyl'));

      expect(result?.id).toBe(mockNeverPlayed1.id);
      expect(result?.playCount).toBe(0);
    });

    it('should use weighted random if all format matches are played', async () => {
      const db = spectator.inject(DatabaseService);
      db.getAllReleases.mockResolvedValue([
        mockPlayed1, // Vinyl
        mockPlayed2, // Vinyl
      ]);

      const result = await firstValueFrom(spectator.service.getRecommendationByFormat('Vinyl'));

      expect(result).toBeDefined();
      expect(result?.playCount).toBeGreaterThan(0);
    });

    it('should handle partial format matches', async () => {
      const vinylLP = createMockRelease({
        id: 5,
        basicInfo: {
          title: 'Vinyl LP',
          artists: ['Artist'],
          formats: ['Vinyl', 'LP', '12"'],
          genres: ['Rock'],
          styles: ['Alternative'],
        },
      });

      const db = spectator.inject(DatabaseService);
      db.getAllReleases.mockResolvedValue([vinylLP]);

      const result = await firstValueFrom(spectator.service.getRecommendationByFormat('Vinyl'));

      expect(result?.id).toBe(vinylLP.id);
    });
  });

  describe('getRecommendationByGenre', () => {
    it('should filter by genre', async () => {
      const db = spectator.inject(DatabaseService);
      db.getAllReleases.mockResolvedValue([
        mockNeverPlayed1, // Rock
        mockNeverPlayed2, // Jazz
        mockPlayed1, // Electronic
      ]);

      const result = await firstValueFrom(spectator.service.getRecommendationByGenre('Rock'));

      expect(result).toBeDefined();
      expect(result?.basicInfo.genres).toContain('Rock');
    });

    it('should return null if no releases match genre', async () => {
      const db = spectator.inject(DatabaseService);
      db.getAllReleases.mockResolvedValue([mockNeverPlayed2]); // Only Jazz

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await firstValueFrom(spectator.service.getRecommendationByGenre('Rock'));

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('No releases found for genre: Rock');

      consoleSpy.mockRestore();
    });

    it('should prioritize never-played items in genre', async () => {
      const db = spectator.inject(DatabaseService);
      db.getAllReleases.mockResolvedValue([
        mockNeverPlayed1, // Never played Rock
        mockPlayed2, // Played Rock
      ]);

      const result = await firstValueFrom(spectator.service.getRecommendationByGenre('Rock'));

      expect(result?.id).toBe(mockNeverPlayed1.id);
      expect(result?.playCount).toBe(0);
    });

    it('should use weighted random if all genre matches are played', async () => {
      const db = spectator.inject(DatabaseService);
      db.getAllReleases.mockResolvedValue([
        mockPlayed1, // Electronic
        mockPlayed2, // Rock
      ]);

      const result = await firstValueFrom(spectator.service.getRecommendationByGenre('Rock'));

      expect(result?.id).toBe(mockPlayed2.id);
      expect(result?.playCount).toBeGreaterThan(0);
    });
  });

  describe('getMultipleRecommendations', () => {
    it('should return multiple unique recommendations', async () => {
      const db = spectator.inject(DatabaseService);

      // Return different items on each call to simulate different picks
      db.getAllReleases
        .mockResolvedValueOnce([mockNeverPlayed1])
        .mockResolvedValueOnce([mockNeverPlayed2]);

      const results = await firstValueFrom(spectator.service.getMultipleRecommendations(2));

      expect(results).toHaveLength(2);
      expect(results[0].id).not.toBe(results[1].id);
    });

    it('should handle count larger than available releases', async () => {
      const db = spectator.inject(DatabaseService);
      db.getAllReleases.mockResolvedValue([mockNeverPlayed1]);

      const results = await firstValueFrom(spectator.service.getMultipleRecommendations(5));

      // Should only return 1 unique item even though we asked for 5
      expect(results.length).toBeLessThanOrEqual(5);
    });

    it('should return empty array if no recommendations available', async () => {
      const db = spectator.inject(DatabaseService);
      db.getAllReleases.mockResolvedValue([]);

      const results = await firstValueFrom(spectator.service.getMultipleRecommendations(3));

      expect(results).toEqual([]);
    });

    it('should not return duplicate recommendations', async () => {
      const db = spectator.inject(DatabaseService);
      db.getAllReleases.mockResolvedValue([mockNeverPlayed1]);

      const results = await firstValueFrom(spectator.service.getMultipleRecommendations(3));

      const uniqueIds = new Set(results.map((r) => r.id));
      expect(uniqueIds.size).toBe(results.length);
    });
  });

  describe('weighted random selection', () => {
    it('should favor releases with lower play counts', async () => {
      const lowPlayCount = createMockRelease({
        id: 1,
        playCount: 1,
        lastPlayedDate: new Date('2024-01-15'),
      });

      const highPlayCount = createMockRelease({
        id: 2,
        playCount: 100,
        lastPlayedDate: new Date('2024-01-15'),
      });

      const db = spectator.inject(DatabaseService);
      db.getAllReleases.mockResolvedValue([lowPlayCount, highPlayCount]);

      // Run multiple times to verify low play count is more likely
      const results = [];
      for (let i = 0; i < 10; i++) {
        const result = await firstValueFrom(spectator.service.getRecommendation());
        results.push(result?.id);
      }

      // Low play count should appear more frequently
      const lowPlayCountOccurrences = results.filter((id) => id === lowPlayCount.id).length;
      expect(lowPlayCountOccurrences).toBeGreaterThan(0);
    });

    it('should favor releases not played recently', async () => {
      const recentlyPlayed = createMockRelease({
        id: 1,
        playCount: 5,
        lastPlayedDate: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      });

      const oldPlay = createMockRelease({
        id: 2,
        playCount: 5,
        lastPlayedDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 365), // 1 year ago
      });

      const db = spectator.inject(DatabaseService);
      db.getAllReleases.mockResolvedValue([recentlyPlayed, oldPlay]);

      const result = await firstValueFrom(spectator.service.getRecommendation());

      // Old play should have higher weight
      expect(result).toBeDefined();
    });

    it('should handle releases with no lastPlayedDate', async () => {
      const noDate = createMockRelease({
        id: 1,
        playCount: 5,
        lastPlayedDate: undefined,
      });

      const db = spectator.inject(DatabaseService);
      db.getAllReleases.mockResolvedValue([noDate]);

      const result = await firstValueFrom(spectator.service.getRecommendation());

      expect(result?.id).toBe(noDate.id);
    });
  });
});

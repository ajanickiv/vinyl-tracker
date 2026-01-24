import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { DiscogsService } from './discogs.service';
import { DatabaseService } from './database.service';
import { HttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { DiscogsCollectionResponse, DiscogsRelease } from '../models/discogs-api.model';
import { Release } from '../models/release.model';

describe('DiscogsService', () => {
  let spectator: SpectatorService<DiscogsService>;
  const createService = createServiceFactory({
    service: DiscogsService,
    mocks: [HttpClient, DatabaseService],
  });

  const mockDiscogsRelease: DiscogsRelease = {
    id: 123,
    instance_id: 456,
    date_added: '2024-01-01T00:00:00Z',
    rating: 5,
    notes: [{ value: 'Great album!' }],
    basic_information: {
      id: 123,
      title: 'Test Album',
      year: 2020,
      artists: [{ name: 'Test Artist', id: 1 }],
      formats: [{ name: 'Vinyl', descriptions: ['LP', '12"'] }],
      labels: [{ name: 'Test Label', id: 1 }],
      genres: ['Rock'],
      styles: ['Alternative'],
      thumb: 'thumb.jpg',
      cover_image: 'cover.jpg',
    },
  };

  const mockCollectionResponse: DiscogsCollectionResponse = {
    pagination: {
      page: 1,
      pages: 1,
      items: 1,
      per_page: 100,
    },
    releases: [mockDiscogsRelease],
  };

  beforeEach(() => {
    spectator = createService();
  });

  it('should be created', () => {
    expect(spectator.service).toBeTruthy();
  });

  describe('clearSyncedData', () => {
    it('should call db.clearAllData', async () => {
      const db = spectator.inject(DatabaseService);
      db.clearAllData.mockResolvedValue(undefined);

      await spectator.service.clearSyncedData();

      expect(db.clearAllData).toHaveBeenCalled();
    });

    it('should log confirmation message', async () => {
      const db = spectator.inject(DatabaseService);
      db.clearAllData.mockResolvedValue(undefined);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await spectator.service.clearSyncedData();

      expect(consoleSpy).toHaveBeenCalledWith('All synced data cleared');

      consoleSpy.mockRestore();
    });
  });

  describe('hasSyncedData', () => {
    it('should return true when collection has items', async () => {
      const db = spectator.inject(DatabaseService);
      db.getCollectionCount.mockResolvedValue(10);

      const result = await spectator.service.hasSyncedData();

      expect(result).toBe(true);
    });

    it('should return false when collection is empty', async () => {
      const db = spectator.inject(DatabaseService);
      db.getCollectionCount.mockResolvedValue(0);

      const result = await spectator.service.hasSyncedData();

      expect(result).toBe(false);
    });
  });

  describe('syncCollection', () => {
    it('should sync single page collection successfully', async () => {
      const http = spectator.inject(HttpClient);
      const db = spectator.inject(DatabaseService);

      http.get.mockReturnValue(of(mockCollectionResponse));
      db.getRelease.mockResolvedValue(undefined);
      db.addRelease.mockResolvedValue(123);
      db.setLastSyncDate.mockResolvedValue(undefined);
      db.getCollectionCount.mockResolvedValue(1);

      const result = await spectator.service.syncCollection();

      expect(result.success).toBe(true);
      expect(result.totalSynced).toBe(1);
      expect(result.error).toBeUndefined();
    });

    it('should make HTTP request with correct headers', async () => {
      const http = spectator.inject(HttpClient);
      const db = spectator.inject(DatabaseService);

      http.get.mockReturnValue(of(mockCollectionResponse));
      db.getRelease.mockResolvedValue(undefined);
      db.addRelease.mockResolvedValue(123);
      db.setLastSyncDate.mockResolvedValue(undefined);
      db.getCollectionCount.mockResolvedValue(1);

      await spectator.service.syncCollection();

      expect(http.get).toHaveBeenCalledWith(
        expect.stringContaining('/users/'),
        expect.objectContaining({
          headers: expect.objectContaining({
            lazyInit: expect.any(Function),
          }),
          params: expect.objectContaining({
            page: '1',
            per_page: '100',
          }),
        }),
      );
    });

    it('should handle multiple pages', async () => {
      const http = spectator.inject(HttpClient);
      const db = spectator.inject(DatabaseService);

      const multiPageResponse: DiscogsCollectionResponse = {
        pagination: {
          page: 1,
          pages: 2,
          items: 2,
          per_page: 100,
        },
        releases: [mockDiscogsRelease],
      };

      const secondPageResponse: DiscogsCollectionResponse = {
        pagination: {
          page: 2,
          pages: 2,
          items: 2,
          per_page: 100,
        },
        releases: [{ ...mockDiscogsRelease, id: 124, instance_id: 457 }],
      };

      http.get
        .mockReturnValueOnce(of(multiPageResponse))
        .mockReturnValueOnce(of(secondPageResponse));

      db.getRelease.mockResolvedValue(undefined);
      db.addRelease.mockResolvedValue(123);
      db.setLastSyncDate.mockResolvedValue(undefined);
      db.getCollectionCount.mockResolvedValue(2);

      const result = await spectator.service.syncCollection();

      expect(result.success).toBe(true);
      expect(result.totalSynced).toBe(2);
      expect(http.get).toHaveBeenCalledTimes(2);
    });

    it('should update existing releases while preserving play data', async () => {
      const http = spectator.inject(HttpClient);
      const db = spectator.inject(DatabaseService);

      const existingRelease: Release = {
        id: 123,
        instanceId: 456,
        basicInfo: {
          title: 'Old Title',
          artists: ['Test Artist'],
          year: 2020,
          formats: ['Vinyl'],
          labels: ['Test Label'],
          genres: ['Rock'],
          styles: ['Alternative'],
        },
        playCount: 10,
        lastPlayedDate: new Date('2024-01-15'),
        dateAdded: new Date('2024-01-01'),
        dateAddedToCollection: new Date('2024-01-01'),
      };

      http.get.mockReturnValue(of(mockCollectionResponse));
      db.getRelease.mockResolvedValue(existingRelease);
      db.updateRelease.mockResolvedValue(1);
      db.setLastSyncDate.mockResolvedValue(undefined);
      db.getCollectionCount.mockResolvedValue(1);

      await spectator.service.syncCollection();

      expect(db.updateRelease).toHaveBeenCalledWith(
        123,
        expect.objectContaining({
          basicInfo: expect.any(Object),
          dateAddedToCollection: expect.any(Date),
          notes: 'Great album!',
          rating: 5,
        }),
      );
      expect(db.addRelease).not.toHaveBeenCalled();
    });

    it('should add new releases with default play data', async () => {
      const http = spectator.inject(HttpClient);
      const db = spectator.inject(DatabaseService);

      http.get.mockReturnValue(of(mockCollectionResponse));
      db.getRelease.mockResolvedValue(undefined);
      db.addRelease.mockResolvedValue(123);
      db.setLastSyncDate.mockResolvedValue(undefined);
      db.getCollectionCount.mockResolvedValue(1);

      await spectator.service.syncCollection();

      expect(db.addRelease).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 123,
          playCount: 0,
          lastPlayedDate: undefined,
        }),
      );
    });

    it('should set last sync date after successful sync', async () => {
      const http = spectator.inject(HttpClient);
      const db = spectator.inject(DatabaseService);

      http.get.mockReturnValue(of(mockCollectionResponse));
      db.getRelease.mockResolvedValue(undefined);
      db.addRelease.mockResolvedValue(123);
      db.setLastSyncDate.mockResolvedValue(undefined);
      db.getCollectionCount.mockResolvedValue(1);

      const beforeSync = new Date();
      await spectator.service.syncCollection();
      const afterSync = new Date();

      expect(db.setLastSyncDate).toHaveBeenCalledWith(expect.any(Date));
      const callArg = db.setLastSyncDate.mock.calls[0][0] as Date;
      expect(callArg.getTime()).toBeGreaterThanOrEqual(beforeSync.getTime());
      expect(callArg.getTime()).toBeLessThanOrEqual(afterSync.getTime());
    });

    it('should handle HTTP errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const http = spectator.inject(HttpClient);
      const db = spectator.inject(DatabaseService);

      http.get.mockReturnValue(throwError(() => new Error('Network error')));
      db.getCollectionCount.mockResolvedValue(0);

      const result = await spectator.service.syncCollection();

      expect(result.success).toBe(false);
      expect(result.totalSynced).toBe(0);
      expect(result.error).toBe('Network error');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle database errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const http = spectator.inject(HttpClient);
      const db = spectator.inject(DatabaseService);

      http.get.mockReturnValue(of(mockCollectionResponse));
      db.getRelease.mockRejectedValue(new Error('Database error'));

      const result = await spectator.service.syncCollection();

      expect(result.success).toBe(false);
      expect(result.totalSynced).toBe(0);
      expect(result.error).toBe('Database error');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle non-Error objects in catch', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const http = spectator.inject(HttpClient);

      http.get.mockReturnValue(throwError(() => 'String error'));

      const result = await spectator.service.syncCollection();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('convertToRelease (via syncCollection)', () => {
    it('should convert Discogs format to Release format', async () => {
      const http = spectator.inject(HttpClient);
      const db = spectator.inject(DatabaseService);

      http.get.mockReturnValue(of(mockCollectionResponse));
      db.getRelease.mockResolvedValue(undefined);
      db.addRelease.mockResolvedValue(123);
      db.setLastSyncDate.mockResolvedValue(undefined);
      db.getCollectionCount.mockResolvedValue(1);

      await spectator.service.syncCollection();

      expect(db.addRelease).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 123,
          instanceId: 456,
          basicInfo: expect.objectContaining({
            title: 'Test Album',
            artists: ['Test Artist'],
            year: 2020,
            formats: ['Vinyl (LP, 12")'],
            labels: ['Test Label'],
            genres: ['Rock'],
            styles: ['Alternative'],
            thumb: 'thumb.jpg',
            coverImage: 'cover.jpg',
          }),
          notes: 'Great album!',
          rating: 5,
        }),
      );
    });

    it('should handle formats without descriptions', async () => {
      const http = spectator.inject(HttpClient);
      const db = spectator.inject(DatabaseService);

      const releaseNoDescriptions: DiscogsRelease = {
        ...mockDiscogsRelease,
        basic_information: {
          ...mockDiscogsRelease.basic_information,
          formats: [{ name: 'CD', descriptions: undefined }],
        },
      };

      http.get.mockReturnValue(
        of({
          ...mockCollectionResponse,
          releases: [releaseNoDescriptions],
        }),
      );

      db.getRelease.mockResolvedValue(undefined);
      db.addRelease.mockResolvedValue(123);
      db.setLastSyncDate.mockResolvedValue(undefined);
      db.getCollectionCount.mockResolvedValue(1);

      await spectator.service.syncCollection();

      expect(db.addRelease).toHaveBeenCalledWith(
        expect.objectContaining({
          basicInfo: expect.objectContaining({
            formats: ['CD'],
          }),
        }),
      );
    });

    it('should handle missing notes', async () => {
      const http = spectator.inject(HttpClient);
      const db = spectator.inject(DatabaseService);

      const releaseNoNotes: DiscogsRelease = {
        ...mockDiscogsRelease,
        notes: undefined,
      };

      http.get.mockReturnValue(
        of({
          ...mockCollectionResponse,
          releases: [releaseNoNotes],
        }),
      );

      db.getRelease.mockResolvedValue(undefined);
      db.addRelease.mockResolvedValue(123);
      db.setLastSyncDate.mockResolvedValue(undefined);
      db.getCollectionCount.mockResolvedValue(1);

      await spectator.service.syncCollection();

      expect(db.addRelease).toHaveBeenCalledWith(
        expect.objectContaining({
          notes: undefined,
        }),
      );
    });

    it('should handle zero rating', async () => {
      const http = spectator.inject(HttpClient);
      const db = spectator.inject(DatabaseService);

      const releaseNoRating: DiscogsRelease = {
        ...mockDiscogsRelease,
        rating: 0,
      };

      http.get.mockReturnValue(
        of({
          ...mockCollectionResponse,
          releases: [releaseNoRating],
        }),
      );

      db.getRelease.mockResolvedValue(undefined);
      db.addRelease.mockResolvedValue(123);
      db.setLastSyncDate.mockResolvedValue(undefined);
      db.getCollectionCount.mockResolvedValue(1);

      await spectator.service.syncCollection();

      expect(db.addRelease).toHaveBeenCalledWith(
        expect.objectContaining({
          rating: undefined,
        }),
      );
    });

    it('should parse date_added correctly', async () => {
      const http = spectator.inject(HttpClient);
      const db = spectator.inject(DatabaseService);

      http.get.mockReturnValue(of(mockCollectionResponse));
      db.getRelease.mockResolvedValue(undefined);
      db.addRelease.mockResolvedValue(123);
      db.setLastSyncDate.mockResolvedValue(undefined);
      db.getCollectionCount.mockResolvedValue(1);

      await spectator.service.syncCollection();

      expect(db.addRelease).toHaveBeenCalledWith(
        expect.objectContaining({
          dateAddedToCollection: new Date('2024-01-01T00:00:00Z'),
        }),
      );
    });
  });

  describe('rate limiting', () => {
    it('should wait 1 second between page requests', async () => {
      jest.useFakeTimers();

      const http = spectator.inject(HttpClient);
      const db = spectator.inject(DatabaseService);

      const multiPageResponse: DiscogsCollectionResponse = {
        pagination: {
          page: 1,
          pages: 2,
          items: 2,
          per_page: 100,
        },
        releases: [mockDiscogsRelease],
      };

      const secondPageResponse: DiscogsCollectionResponse = {
        pagination: {
          page: 2,
          pages: 2,
          items: 2,
          per_page: 100,
        },
        releases: [{ ...mockDiscogsRelease, id: 124 }],
      };

      http.get
        .mockReturnValueOnce(of(multiPageResponse))
        .mockReturnValueOnce(of(secondPageResponse));

      db.getRelease.mockResolvedValue(undefined);
      db.addRelease.mockResolvedValue(123);
      db.setLastSyncDate.mockResolvedValue(undefined);
      db.getCollectionCount.mockResolvedValue(2);

      const syncPromise = spectator.service.syncCollection();

      // Fast-forward through delays
      await jest.runAllTimersAsync();

      const result = await syncPromise;

      expect(result.success).toBe(true);

      jest.useRealTimers();
    });
  });
});

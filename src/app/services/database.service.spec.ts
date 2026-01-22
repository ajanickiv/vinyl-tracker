import { DatabaseService } from './database.service';
import { Release } from '../models/release.model';

describe('DatabaseService', () => {
  let service: DatabaseService;

  const mockRelease: Release = {
    id: 123,
    instanceId: 456,
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
  };

  beforeEach(() => {
    service = new DatabaseService();

    // Mock the tables
    service.releases = {
      add: jest.fn(),
      get: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
      toArray: jest.fn(),
      count: jest.fn(),
    } as any;

    service.metadata = {
      get: jest.fn(),
      put: jest.fn(),
    } as any;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have releases table', () => {
    expect(service.releases).toBeDefined();
  });

  it('should have metadata table', () => {
    expect(service.metadata).toBeDefined();
  });

  describe('addRelease', () => {
    it('should call releases.add with release', async () => {
      (service.releases.add as jest.Mock).mockResolvedValue(123);

      const result = await service.addRelease(mockRelease);

      expect(service.releases.add).toHaveBeenCalledWith(mockRelease);
      expect(result).toBe(123);
    });
  });

  describe('getRelease', () => {
    it('should call releases.get with id', async () => {
      (service.releases.get as jest.Mock).mockResolvedValue(mockRelease);

      const result = await service.getRelease(123);

      expect(service.releases.get).toHaveBeenCalledWith(123);
      expect(result).toEqual(mockRelease);
    });

    it('should return undefined for non-existent release', async () => {
      (service.releases.get as jest.Mock).mockResolvedValue(undefined);

      const result = await service.getRelease(999);

      expect(result).toBeUndefined();
    });
  });

  describe('getAllReleases', () => {
    it('should call releases.toArray', async () => {
      const releases = [mockRelease];
      (service.releases.toArray as jest.Mock).mockResolvedValue(releases);

      const result = await service.getAllReleases();

      expect(service.releases.toArray).toHaveBeenCalled();
      expect(result).toEqual(releases);
    });

    it('should return empty array when no releases', async () => {
      (service.releases.toArray as jest.Mock).mockResolvedValue([]);

      const result = await service.getAllReleases();

      expect(result).toEqual([]);
    });
  });

  describe('updateRelease', () => {
    it('should call releases.update with id and changes', async () => {
      (service.releases.update as jest.Mock).mockResolvedValue(1);

      const changes = { playCount: 5 };
      const result = await service.updateRelease(123, changes);

      expect(service.releases.update).toHaveBeenCalledWith(123, changes);
      expect(result).toBe(1);
    });

    it('should return 0 for non-existent release', async () => {
      (service.releases.update as jest.Mock).mockResolvedValue(0);

      const result = await service.updateRelease(999, { playCount: 5 });

      expect(result).toBe(0);
    });
  });

  describe('deleteRelease', () => {
    it('should call releases.delete with id', async () => {
      (service.releases.delete as jest.Mock).mockResolvedValue(undefined);

      await service.deleteRelease(123);

      expect(service.releases.delete).toHaveBeenCalledWith(123);
    });
  });

  describe('getCollectionCount', () => {
    it('should call releases.count', async () => {
      (service.releases.count as jest.Mock).mockResolvedValue(10);

      const result = await service.getCollectionCount();

      expect(service.releases.count).toHaveBeenCalled();
      expect(result).toBe(10);
    });

    it('should return 0 for empty collection', async () => {
      (service.releases.count as jest.Mock).mockResolvedValue(0);

      const result = await service.getCollectionCount();

      expect(result).toBe(0);
    });
  });

  describe('clearAllData', () => {
    it('should call releases.clear', async () => {
      (service.releases.clear as jest.Mock).mockResolvedValue(undefined);

      await service.clearAllData();

      expect(service.releases.clear).toHaveBeenCalled();
    });
  });

  describe('setLastSyncDate', () => {
    it('should call metadata.put with formatted date', async () => {
      (service.metadata.put as jest.Mock).mockResolvedValue('lastSyncDate');

      const date = new Date('2024-01-15T10:00:00Z');
      await service.setLastSyncDate(date);

      expect(service.metadata.put).toHaveBeenCalledWith({
        key: 'lastSyncDate',
        value: '2024-01-15T10:00:00.000Z',
      });
    });
  });

  describe('getLastSyncDate', () => {
    it('should return null when no sync date exists', async () => {
      (service.metadata.get as jest.Mock).mockResolvedValue(undefined);

      const result = await service.getLastSyncDate();

      expect(result).toBeNull();
    });

    it('should return Date object when sync date exists', async () => {
      (service.metadata.get as jest.Mock).mockResolvedValue({
        key: 'lastSyncDate',
        value: '2024-01-15T10:00:00.000Z',
      });

      const result = await service.getLastSyncDate();

      expect(result).toBeInstanceOf(Date);
      expect(result?.toISOString()).toBe('2024-01-15T10:00:00.000Z');
    });

    it('should call metadata.get with lastSyncDate key', async () => {
      (service.metadata.get as jest.Mock).mockResolvedValue(null);

      await service.getLastSyncDate();

      expect(service.metadata.get).toHaveBeenCalledWith('lastSyncDate');
    });
  });

  describe('method integration', () => {
    it('should handle add and get flow', async () => {
      (service.releases.add as jest.Mock).mockResolvedValue(123);
      (service.releases.get as jest.Mock).mockResolvedValue(mockRelease);

      const id = await service.addRelease(mockRelease);
      const retrieved = await service.getRelease(id);

      expect(id).toBe(123);
      expect(retrieved).toEqual(mockRelease);
    });

    it('should handle update workflow', async () => {
      const updated = { ...mockRelease, playCount: 5 };
      (service.releases.update as jest.Mock).mockResolvedValue(1);
      (service.releases.get as jest.Mock).mockResolvedValue(updated);

      await service.updateRelease(123, { playCount: 5 });
      const result = await service.getRelease(123);

      expect(result?.playCount).toBe(5);
    });

    it('should handle sync date workflow', async () => {
      const date = new Date('2024-01-15T10:00:00Z');
      (service.metadata.put as jest.Mock).mockResolvedValue('lastSyncDate');
      (service.metadata.get as jest.Mock).mockResolvedValue({
        key: 'lastSyncDate',
        value: date.toISOString(),
      });

      await service.setLastSyncDate(date);
      const retrieved = await service.getLastSyncDate();

      expect(retrieved).toEqual(date);
    });
  });
});

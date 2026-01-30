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

  describe('getReleasesNeedingMasterData', () => {
    it('should return releases with masterId but no originalYear', async () => {
      const releaseNeedingData = {
        ...mockRelease,
        basicInfo: {
          ...mockRelease.basicInfo,
          masterId: 1000,
          originalYear: undefined,
        },
      };
      (service.releases.toArray as jest.Mock).mockResolvedValue([releaseNeedingData]);

      const result = await service.getReleasesNeedingMasterData();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(releaseNeedingData);
    });

    it('should filter out releases without masterId', async () => {
      const releaseWithoutMasterId = {
        ...mockRelease,
        basicInfo: {
          ...mockRelease.basicInfo,
          masterId: undefined,
          originalYear: undefined,
        },
      };
      (service.releases.toArray as jest.Mock).mockResolvedValue([releaseWithoutMasterId]);

      const result = await service.getReleasesNeedingMasterData();

      expect(result).toHaveLength(0);
    });

    it('should filter out releases that already have originalYear', async () => {
      const releaseWithOriginalYear = {
        ...mockRelease,
        basicInfo: {
          ...mockRelease.basicInfo,
          masterId: 1000,
          originalYear: 1985,
        },
      };
      (service.releases.toArray as jest.Mock).mockResolvedValue([releaseWithOriginalYear]);

      const result = await service.getReleasesNeedingMasterData();

      expect(result).toHaveLength(0);
    });

    it('should return empty array when no releases need data', async () => {
      (service.releases.toArray as jest.Mock).mockResolvedValue([]);

      const result = await service.getReleasesNeedingMasterData();

      expect(result).toEqual([]);
    });

    it('should handle mix of releases needing and not needing data', async () => {
      const releaseNeedingData = {
        ...mockRelease,
        id: 1,
        basicInfo: { ...mockRelease.basicInfo, masterId: 1000, originalYear: undefined },
      };
      const releaseWithData = {
        ...mockRelease,
        id: 2,
        basicInfo: { ...mockRelease.basicInfo, masterId: 1001, originalYear: 1990 },
      };
      const releaseNoMaster = {
        ...mockRelease,
        id: 3,
        basicInfo: { ...mockRelease.basicInfo, masterId: undefined },
      };

      (service.releases.toArray as jest.Mock).mockResolvedValue([
        releaseNeedingData,
        releaseWithData,
        releaseNoMaster,
      ]);

      const result = await service.getReleasesNeedingMasterData();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });
  });

  describe('getReleasesWithOriginalYearCount', () => {
    it('should count releases with originalYear populated', async () => {
      const releaseWithYear = {
        ...mockRelease,
        basicInfo: { ...mockRelease.basicInfo, originalYear: 1985 },
      };
      (service.releases.toArray as jest.Mock).mockResolvedValue([releaseWithYear]);

      const result = await service.getReleasesWithOriginalYearCount();

      expect(result).toBe(1);
    });

    it('should return 0 when no releases have originalYear', async () => {
      const releaseWithoutYear = {
        ...mockRelease,
        basicInfo: { ...mockRelease.basicInfo, originalYear: undefined },
      };
      (service.releases.toArray as jest.Mock).mockResolvedValue([releaseWithoutYear]);

      const result = await service.getReleasesWithOriginalYearCount();

      expect(result).toBe(0);
    });

    it('should return 0 for empty collection', async () => {
      (service.releases.toArray as jest.Mock).mockResolvedValue([]);

      const result = await service.getReleasesWithOriginalYearCount();

      expect(result).toBe(0);
    });

    it('should count only releases with non-null originalYear', async () => {
      const releases = [
        { ...mockRelease, id: 1, basicInfo: { ...mockRelease.basicInfo, originalYear: 1985 } },
        { ...mockRelease, id: 2, basicInfo: { ...mockRelease.basicInfo, originalYear: null } },
        { ...mockRelease, id: 3, basicInfo: { ...mockRelease.basicInfo, originalYear: 1990 } },
        { ...mockRelease, id: 4, basicInfo: { ...mockRelease.basicInfo, originalYear: undefined } },
      ];
      (service.releases.toArray as jest.Mock).mockResolvedValue(releases);

      const result = await service.getReleasesWithOriginalYearCount();

      expect(result).toBe(2);
    });
  });

  describe('getMetadata', () => {
    it('should return metadata value when key exists', async () => {
      (service.metadata.get as jest.Mock).mockResolvedValue({
        key: 'testKey',
        value: 'testValue',
      });

      const result = await service.getMetadata('testKey');

      expect(service.metadata.get).toHaveBeenCalledWith('testKey');
      expect(result).toBe('testValue');
    });

    it('should return null when key does not exist', async () => {
      (service.metadata.get as jest.Mock).mockResolvedValue(undefined);

      const result = await service.getMetadata('nonExistentKey');

      expect(result).toBeNull();
    });
  });

  describe('setMetadata', () => {
    it('should store metadata with key and value', async () => {
      (service.metadata.put as jest.Mock).mockResolvedValue('testKey');

      await service.setMetadata('testKey', 'testValue');

      expect(service.metadata.put).toHaveBeenCalledWith({
        key: 'testKey',
        value: 'testValue',
      });
    });

    it('should overwrite existing metadata', async () => {
      (service.metadata.put as jest.Mock).mockResolvedValue('existingKey');

      await service.setMetadata('existingKey', 'newValue');

      expect(service.metadata.put).toHaveBeenCalledWith({
        key: 'existingKey',
        value: 'newValue',
      });
    });
  });

  describe('isMasterReleaseSyncEnabled', () => {
    it('should return true when setting is not set (default)', async () => {
      (service.metadata.get as jest.Mock).mockResolvedValue(undefined);

      const result = await service.isMasterReleaseSyncEnabled();

      expect(service.metadata.get).toHaveBeenCalledWith('masterReleaseSyncEnabled');
      expect(result).toBe(true);
    });

    it('should return true when setting is "true"', async () => {
      (service.metadata.get as jest.Mock).mockResolvedValue({
        key: 'masterReleaseSyncEnabled',
        value: 'true',
      });

      const result = await service.isMasterReleaseSyncEnabled();

      expect(result).toBe(true);
    });

    it('should return false when setting is "false"', async () => {
      (service.metadata.get as jest.Mock).mockResolvedValue({
        key: 'masterReleaseSyncEnabled',
        value: 'false',
      });

      const result = await service.isMasterReleaseSyncEnabled();

      expect(result).toBe(false);
    });
  });

  describe('setMasterReleaseSyncEnabled', () => {
    it('should store true as string', async () => {
      (service.metadata.put as jest.Mock).mockResolvedValue('masterReleaseSyncEnabled');

      await service.setMasterReleaseSyncEnabled(true);

      expect(service.metadata.put).toHaveBeenCalledWith({
        key: 'masterReleaseSyncEnabled',
        value: 'true',
      });
    });

    it('should store false as string', async () => {
      (service.metadata.put as jest.Mock).mockResolvedValue('masterReleaseSyncEnabled');

      await service.setMasterReleaseSyncEnabled(false);

      expect(service.metadata.put).toHaveBeenCalledWith({
        key: 'masterReleaseSyncEnabled',
        value: 'false',
      });
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

import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { Release } from '../models/release.model';

export interface AppMetadata {
  key: string;
  value: string;
}

@Injectable({
  providedIn: 'root',
})
export class DatabaseService extends Dexie {
  releases!: Table<Release, number>;
  metadata!: Table<AppMetadata, string>;

  constructor() {
    super('DiscogsTrackerDB');

    this.version(1).stores({
      releases: 'id, playCount, lastPlayedDate, dateAdded',
      metadata: 'key',
    });

    // Version 2: Support for master release data (masterId, originalYear in basicInfo)
    // No index changes needed - we query all releases and filter in memory
    this.version(2).stores({
      releases: 'id, playCount, lastPlayedDate, dateAdded',
      metadata: 'key',
    });
  }

  async addRelease(release: Release): Promise<number> {
    return await this.releases.add(release);
  }

  async clearAllData(): Promise<void> {
    await this.releases.clear();
  }

  async deleteRelease(id: number): Promise<void> {
    await this.releases.delete(id);
  }

  async getAllReleases(): Promise<Release[]> {
    return await this.releases.toArray();
  }

  async getCollectionCount(): Promise<number> {
    return await this.releases.count();
  }

  async getLastSyncDate(): Promise<Date | null> {
    const record = await this.metadata.get('lastSyncDate');
    return record ? new Date(record.value) : null;
  }

  async getRelease(id: number): Promise<Release | undefined> {
    return await this.releases.get(id);
  }

  async setLastSyncDate(date: Date): Promise<void> {
    await this.metadata.put({ key: 'lastSyncDate', value: date.toISOString() });
  }

  async updateRelease(id: number, changes: Partial<Release>): Promise<number> {
    return await this.releases.update(id, changes);
  }

  /**
   * Get releases that have a masterId but no originalYear (need master data fetch)
   */
  async getReleasesNeedingMasterData(): Promise<Release[]> {
    const all = await this.releases.toArray();
    return all.filter((r) => r.basicInfo.masterId != null && r.basicInfo.originalYear == null);
  }

  /**
   * Get count of releases that have original year populated
   */
  async getReleasesWithOriginalYearCount(): Promise<number> {
    const all = await this.releases.toArray();
    return all.filter((r) => r.basicInfo.originalYear != null).length;
  }

  /**
   * Get metadata value by key
   */
  async getMetadata(key: string): Promise<string | null> {
    const record = await this.metadata.get(key);
    return record ? record.value : null;
  }

  /**
   * Set metadata value
   */
  async setMetadata(key: string, value: string): Promise<void> {
    await this.metadata.put({ key, value });
  }

  /**
   * Check if master release sync is enabled (defaults to true)
   */
  async isMasterReleaseSyncEnabled(): Promise<boolean> {
    const value = await this.getMetadata('masterReleaseSyncEnabled');
    // Default to true if not set
    return value !== 'false';
  }

  /**
   * Set master release sync enabled/disabled
   */
  async setMasterReleaseSyncEnabled(enabled: boolean): Promise<void> {
    await this.setMetadata('masterReleaseSyncEnabled', String(enabled));
  }
}

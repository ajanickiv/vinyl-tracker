import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { Release } from '../models/release.model';

export interface AppMetadata {
  key: string;
  value: any;
}

@Injectable({
  providedIn: 'root'
})
export class DatabaseService extends Dexie {
  releases!: Table<Release, number>;
  metadata!: Table<AppMetadata, string>;

  constructor() {
    super('DiscogsTrackerDB');

    this.version(1).stores({
      releases: 'id, playCount, lastPlayedDate, dateAdded',
      metadata: 'key'
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

}
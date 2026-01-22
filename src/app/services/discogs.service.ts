import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { DatabaseService } from './database.service';
import { Release } from '../models/release.model';
import { DiscogsCollectionResponse, DiscogsRelease } from '../models/discogs-api.model';
import { DISCOGS_API_DELAY_MS } from '../constants/timing.constants';

@Injectable({
  providedIn: 'root',
})
export class DiscogsService {
  private apiUrl = environment.discogsApiUrl;
  private username = environment.discogsUsername;
  private token = environment.discogsToken;

  constructor(
    private http: HttpClient,
    private db: DatabaseService,
  ) {}

  /**
   * Clear all synced data (useful for re-syncing from scratch)
   */
  async clearSyncedData(): Promise<void> {
    await this.db.clearAllData();
    console.log('All synced data cleared');
  }

  /**
   * Check if user has any synced data
   */
  async hasSyncedData(): Promise<boolean> {
    const count = await this.db.getCollectionCount();
    return count > 0;
  }

  /**
   * Fetch and sync the entire collection from Discogs
   */
  async syncCollection(): Promise<{ success: boolean; totalSynced: number; error?: string }> {
    try {
      console.log('Starting collection sync...');

      // Get first page to determine total pages
      const firstPage = await this.fetchCollectionPage(1);
      const totalPages = firstPage.pagination.pages;
      const totalItems = firstPage.pagination.items;

      console.log(`Found ${totalItems} items across ${totalPages} pages`);

      // Process first page
      await this.processReleases(firstPage.releases);

      // Fetch remaining pages
      for (let page = 2; page <= totalPages; page++) {
        console.log(`Fetching page ${page} of ${totalPages}...`);
        const pageData = await this.fetchCollectionPage(page);
        await this.processReleases(pageData.releases);

        // Respect rate limits - Discogs allows 60 requests per minute
        await this.delay(DISCOGS_API_DELAY_MS);
      }

      await this.db.setLastSyncDate(new Date());
      const finalCount = await this.db.getCollectionCount();
      console.log(`✅ Sync complete! ${finalCount} releases in database`);

      return { success: true, totalSynced: finalCount };
    } catch (error) {
      console.error('❌ Sync failed:', error);
      return {
        success: false,
        totalSynced: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Convert Discogs API format to our Release model
   */
  private convertToRelease(discogsRelease: DiscogsRelease): Release {
    const basicInfo = discogsRelease.basic_information;

    return {
      id: basicInfo.id,
      instanceId: discogsRelease.instance_id,
      basicInfo: {
        title: basicInfo.title,
        artists: basicInfo.artists.map((a) => a.name),
        year: basicInfo.year,
        formats: basicInfo.formats.map((f) => {
          const descriptions = f.descriptions ? ` (${f.descriptions.join(', ')})` : '';
          return `${f.name}${descriptions}`;
        }),
        thumb: basicInfo.thumb,
        coverImage: basicInfo.cover_image,
        labels: basicInfo.labels.map((l) => l.name),
        genres: basicInfo.genres,
        styles: basicInfo.styles,
      },
      playCount: 0,
      lastPlayedDate: undefined,
      dateAdded: new Date(),
      dateAddedToCollection: new Date(discogsRelease.date_added),
      notes: discogsRelease.notes?.[0]?.value,
      rating: discogsRelease.rating > 0 ? discogsRelease.rating : undefined,
    };
  }

  /**
   * Utility function to delay execution (for rate limiting)
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Fetch a single page of collection data from Discogs API
   */
  private async fetchCollectionPage(page: number): Promise<DiscogsCollectionResponse> {
    const url = `${this.apiUrl}/users/${this.username}/collection/folders/0/releases`;
    const headers = new HttpHeaders({
      Authorization: `Discogs token=${this.token}`,
      'User-Agent': 'DiscogsTracker/1.0',
    });

    const params = {
      page: page.toString(),
      per_page: '100', // Max allowed by Discogs
    };

    try {
      const response = await firstValueFrom(
        this.http.get<DiscogsCollectionResponse>(url, { headers, params }),
      );
      return response;
    } catch (error) {
      console.error(`Failed to fetch page ${page}:`, error);
      throw error;
    }
  }

  /**
   * Convert Discogs API releases to our Release model and store in database
   */
  private async processReleases(discogsReleases: DiscogsRelease[]): Promise<void> {
    for (const discogsRelease of discogsReleases) {
      const release: Release = this.convertToRelease(discogsRelease);

      // Check if release already exists
      const existing = await this.db.getRelease(release.id);

      if (existing) {
        // Update only the Discogs metadata, preserve play tracking data
        await this.db.updateRelease(release.id, {
          basicInfo: release.basicInfo,
          dateAddedToCollection: release.dateAddedToCollection,
          notes: release.notes,
          rating: release.rating,
        });
      } else {
        // New release, add with default tracking values
        await this.db.addRelease(release);
      }
    }
  }
}

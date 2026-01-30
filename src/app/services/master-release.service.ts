import { Injectable, signal, computed } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { DatabaseService } from './database.service';
import { CredentialsService } from './credentials.service';
import { DiscogsMasterRelease } from '../models/discogs-api.model';
import { DISCOGS_API_DELAY_MS } from '../constants/timing.constants';

export interface MasterFetchProgress {
  total: number;
  completed: number;
  inProgress: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class MasterReleaseService {
  private apiUrl = environment.discogsApiUrl;
  private abortController: AbortController | null = null;

  private progressSignal = signal<MasterFetchProgress>({
    total: 0,
    completed: 0,
    inProgress: false,
  });

  readonly progress = this.progressSignal.asReadonly();
  readonly isInProgress = computed(() => this.progressSignal().inProgress);

  constructor(
    private http: HttpClient,
    private db: DatabaseService,
    private credentialsService: CredentialsService,
  ) {}

  private get token(): string {
    return this.credentialsService.getToken() ?? '';
  }

  /**
   * Start fetching master release data in the background
   * Does not block - runs asynchronously
   */
  async startBackgroundFetch(): Promise<void> {
    if (this.progressSignal().inProgress) {
      console.log('Master fetch already in progress');
      return;
    }

    // Check if master release sync is enabled
    const isEnabled = await this.db.isMasterReleaseSyncEnabled();
    if (!isEnabled) {
      console.log('Master release sync is disabled');
      return;
    }

    this.fetchMasterReleasesInBackground();
  }

  /**
   * Resume background fetch if there are pending releases
   */
  async resumeIfNeeded(): Promise<void> {
    try {
      // Check if master release sync is enabled
      const isEnabled = await this.db.isMasterReleaseSyncEnabled();
      if (!isEnabled) {
        console.log('Master release sync is disabled, not resuming');
        return;
      }

      const pending = await this.db.getReleasesNeedingMasterData();
      if (pending && pending.length > 0 && !this.progressSignal().inProgress) {
        console.log(`Resuming master fetch for ${pending.length} releases`);
        await this.startBackgroundFetch();
      }
    } catch (error) {
      console.error('Failed to check for pending master data:', error);
    }
  }

  /**
   * Stop the background fetch
   */
  stopBackgroundFetch(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.progressSignal.update((p) => ({ ...p, inProgress: false }));
  }

  /**
   * Fetch master release data for all releases that need it
   */
  private async fetchMasterReleasesInBackground(): Promise<void> {
    this.abortController = new AbortController();

    try {
      const releasesNeedingData = await this.db.getReleasesNeedingMasterData();
      const completedCount = await this.db.getReleasesWithOriginalYearCount();

      if (releasesNeedingData.length === 0) {
        console.log('All releases already have master data');
        return;
      }

      this.progressSignal.set({
        total: releasesNeedingData.length + completedCount,
        completed: completedCount,
        inProgress: true,
      });

      console.log(`Starting master fetch: ${releasesNeedingData.length} releases to process`);

      for (const release of releasesNeedingData) {
        if (this.abortController.signal.aborted) {
          console.log('Master fetch aborted');
          break;
        }

        if (!release.basicInfo.masterId) {
          continue;
        }

        try {
          const masterData = await this.fetchMasterRelease(release.basicInfo.masterId);

          if (masterData) {
            await this.db.updateRelease(release.id, {
              basicInfo: {
                ...release.basicInfo,
                originalYear: masterData.year,
              },
            });

            // Only increment after successful database update
            this.progressSignal.update((p) => ({
              ...p,
              completed: p.completed + 1,
            }));
          }
        } catch (error) {
          console.error(`Failed to fetch master for release ${release.id}:`, error);
        }

        // Rate limiting delay
        await this.delay(DISCOGS_API_DELAY_MS);
      }

      console.log('Master fetch completed');
    } catch (error) {
      console.error('Master fetch failed:', error);
    } finally {
      this.progressSignal.update((p) => ({ ...p, inProgress: false }));
      this.abortController = null;
    }
  }

  /**
   * Fetch a single master release from Discogs API with retry logic
   */
  private async fetchMasterRelease(
    masterId: number,
    maxRetries = 3,
  ): Promise<DiscogsMasterRelease | null> {
    const url = `${this.apiUrl}/masters/${masterId}`;
    const headers = new HttpHeaders({
      Authorization: `Discogs token=${this.token}`,
      'User-Agent': 'VinylTracker/1.0',
    });

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await firstValueFrom(
          this.http.get<DiscogsMasterRelease>(url, { headers }),
        );
        return response;
      } catch (error) {
        if (attempt === maxRetries) {
          console.error(`Failed to fetch master ${masterId} after ${maxRetries} attempts:`, error);
          return null;
        }
        // Wait before retrying (exponential backoff: 2s, 4s, 8s...)
        const retryDelay = DISCOGS_API_DELAY_MS * Math.pow(2, attempt);
        console.warn(`Retry ${attempt}/${maxRetries} for master ${masterId} in ${retryDelay}ms`);
        await this.delay(retryDelay);
      }
    }

    return null;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

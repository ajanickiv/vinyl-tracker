import { Injectable } from '@angular/core';
import { Observable, Subject, from, of } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import { DatabaseService } from './database.service';
import { PlayHistoryService } from './play-history.service';
import { Release } from '../models/release.model';
import { CollectionStats } from '../models/collection-stats.model';
import { PlayStats } from '../models/play-stats.model';

@Injectable({
  providedIn: 'root',
})
export class PlaybackService {
  /**
   * Emits when play stats have been updated (after markAsPlayed)
   * Components can subscribe to refresh their stats displays
   */
  readonly statsUpdated$ = new Subject<void>();

  constructor(
    private db: DatabaseService,
    private playHistoryService: PlayHistoryService,
  ) {}

  /**
   * Get overall collection statistics
   */
  getCollectionStats(): Observable<CollectionStats> {
    return from(this.db.getAllReleases()).pipe(
      map((allReleases) => {
        let totalPlays = 0;
        let neverPlayed = 0;
        let playedThisYear = 0;
        let mostPlayed: Release | undefined;
        let leastPlayed: Release | undefined;

        const currentYear = new Date().getFullYear();

        for (const release of allReleases) {
          totalPlays += release.playCount;

          if (release.playCount === 0) {
            neverPlayed++;
          } else {
            // Track least played (only among played releases)
            if (!leastPlayed || release.playCount < leastPlayed.playCount) {
              leastPlayed = release;
            }
          }

          // Track most played
          if (!mostPlayed || release.playCount > mostPlayed.playCount) {
            mostPlayed = release;
          }

          // Track played this year
          if (release.lastPlayedDate) {
            const lastPlayedYear = new Date(release.lastPlayedDate).getFullYear();
            if (lastPlayedYear === currentYear) {
              playedThisYear++;
            }
          }
        }

        return {
          totalReleases: allReleases.length,
          totalPlays,
          neverPlayed,
          playedThisYear,
          mostPlayed,
          leastPlayed,
        };
      }),
      catchError((error) => {
        console.error('Failed to get collection stats:', error);
        return of({
          totalReleases: 0,
          totalPlays: 0,
          neverPlayed: 0,
          playedThisYear: 0,
          mostPlayed: undefined,
          leastPlayed: undefined,
        });
      }),
    );
  }

  /**
   * Mark a release as played
   * Increments play count and updates last played date
   */
  markAsPlayed(releaseId: number): Observable<Release | null> {
    return from(this.db.getRelease(releaseId)).pipe(
      switchMap((release) => {
        if (!release) {
          console.error(`Release ${releaseId} not found`);
          return of(null);
        }

        const updatedRelease = {
          ...release,
          playCount: release.playCount + 1,
          lastPlayedDate: new Date(),
        };

        return from(
          this.db.updateRelease(releaseId, {
            playCount: updatedRelease.playCount,
            lastPlayedDate: updatedRelease.lastPlayedDate,
          }),
        ).pipe(
          tap(() => {
            // Add to play history
            this.playHistoryService.addToHistory(releaseId);
            // Notify subscribers that stats have changed
            this.statsUpdated$.next();
          }),
          map(() => {
            console.log(
              `✅ Marked as played: ${release.basicInfo.title} (play count: ${updatedRelease.playCount})`,
            );
            return updatedRelease;
          }),
        );
      }),
      catchError((error) => {
        console.error('Failed to mark as played:', error);
        return of(null);
      }),
    );
  }

  /**
   * Get play statistics for a release
   */
  getPlayStats(releaseId: number): Observable<PlayStats | null> {
    return from(this.db.getRelease(releaseId)).pipe(
      map((release) => {
        if (!release) {
          return null;
        }

        let daysSinceLastPlayed: number | undefined;
        if (release.lastPlayedDate) {
          const now = new Date();
          const diff = now.getTime() - release.lastPlayedDate.getTime();
          daysSinceLastPlayed = Math.floor(diff / (1000 * 60 * 60 * 24));
        }

        return {
          playCount: release.playCount,
          lastPlayedDate: release.lastPlayedDate,
          daysSinceLastPlayed,
        };
      }),
      catchError((error) => {
        console.error('Failed to get play stats:', error);
        return of(null);
      }),
    );
  }
}

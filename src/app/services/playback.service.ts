import { Injectable } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { DatabaseService } from './database.service';
import { Release } from '../models/release.model';
import { CollectionStats } from '../models/collection-stats.model';

@Injectable({
  providedIn: 'root',
})
export class PlaybackService {
  constructor(private db: DatabaseService) {}

  /**
   * Get overall collection statistics
   */
  getCollectionStats(): Observable<CollectionStats> {
    return from(this.db.getAllReleases()).pipe(
      map((allReleases) => {
        const totalReleases = allReleases.length;
        const totalPlays = allReleases.reduce((sum, r) => sum + r.playCount, 0);
        const neverPlayed = allReleases.filter((r) => r.playCount === 0).length;

        const sortedByPlayCount = [...allReleases].sort((a, b) => b.playCount - a.playCount);
        const mostPlayed = sortedByPlayCount[0];

        const playedReleases = allReleases.filter((r) => r.playCount > 0);
        const leastPlayed = playedReleases.sort((a, b) => a.playCount - b.playCount)[0];

        return {
          totalReleases,
          totalPlays,
          neverPlayed,
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
  getPlayStats(releaseId: number): Observable<{
    playCount: number;
    lastPlayedDate?: Date;
    daysSinceLastPlayed?: number;
  } | null> {
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

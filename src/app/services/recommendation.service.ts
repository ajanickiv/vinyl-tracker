import { Injectable } from '@angular/core';
import { Observable, from, of, forkJoin } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { DatabaseService } from './database.service';
import { Release } from '../models/release.model';

@Injectable({
  providedIn: 'root',
})
export class RecommendationService {
  constructor(private db: DatabaseService) {}

  /**
   * Get multiple recommendations at once
   */
  getMultipleRecommendations(count: number): Observable<Release[]> {
    const recommendations$: Observable<Release | null>[] = [];

    for (let i = 0; i < count; i++) {
      recommendations$.push(this.getRecommendation());
    }

    return forkJoin(recommendations$).pipe(
      map((recommendations) => {
        const usedIds = new Set<number>();
        return recommendations.filter((rec): rec is Release => {
          if (rec && !usedIds.has(rec.id)) {
            usedIds.add(rec.id);
            return true;
          }
          return false;
        });
      }),
    );
  }

  /**
   * Get a recommendation using weighted random selection
   * Priority: never-played items first, then weighted by play count and recency
   */
  getRecommendation(): Observable<Release | null> {
    return from(this.db.releases.where('playCount').equals(0).toArray()).pipe(
      switchMap((neverPlayed) => {
        if (neverPlayed.length > 0) {
          console.log(`Found ${neverPlayed.length} never-played items`);
          return of(this.pickRandom(neverPlayed));
        }

        // All items have been played at least once
        return from(this.db.getAllReleases()).pipe(
          map((allReleases) => {
            if (allReleases.length === 0) {
              console.log('No releases in collection');
              return null;
            }

            console.log('All items played at least once, using weighted random selection');
            return this.weightedRandomPick(allReleases);
          }),
        );
      }),
      catchError((error) => {
        console.error('Failed to get recommendation:', error);
        return of(null);
      }),
    );
  }

  /**
   * Get recommendations filtered by format (e.g., "Vinyl", "CD")
   */
  getRecommendationByFormat(format: string): Observable<Release | null> {
    return from(this.db.getAllReleases()).pipe(
      map((allReleases) => {
        const filtered = allReleases.filter((r) =>
          r.basicInfo.formats?.some((f) => f.includes(format)),
        );

        if (filtered.length === 0) {
          console.log(`No releases found for format: ${format}`);
          return null;
        }

        const neverPlayed = filtered.filter((r) => r.playCount === 0);
        if (neverPlayed.length > 0) {
          return this.pickRandom(neverPlayed);
        }

        return this.weightedRandomPick(filtered);
      }),
      catchError((error) => {
        console.error('Failed to get recommendation by format:', error);
        return of(null);
      }),
    );
  }

  /**
   * Get recommendations filtered by genre
   */
  getRecommendationByGenre(genre: string): Observable<Release | null> {
    return from(this.db.getAllReleases()).pipe(
      map((allReleases) => {
        const filtered = allReleases.filter((r) => r.basicInfo.genres?.includes(genre));

        if (filtered.length === 0) {
          console.log(`No releases found for genre: ${genre}`);
          return null;
        }

        const neverPlayed = filtered.filter((r) => r.playCount === 0);
        if (neverPlayed.length > 0) {
          return this.pickRandom(neverPlayed);
        }

        return this.weightedRandomPick(filtered);
      }),
      catchError((error) => {
        console.error('Failed to get recommendation by genre:', error);
        return of(null);
      }),
    );
  }

  /**
   * Pick a random item from an array
   */
  private pickRandom<T>(items: T[]): T {
    return items[Math.floor(Math.random() * items.length)];
  }

  /**
   * Pick a release using weighted random selection
   * Weight = (1 / playCount) * log(daysSincePlay + 1)
   * Higher weight = more likely to be selected
   */
  private weightedRandomPick(releases: Release[]): Release {
    const now = new Date();

    // Calculate weight for each release
    const weights = releases.map((release) => {
      const daysSincePlay = release.lastPlayedDate
        ? (now.getTime() - release.lastPlayedDate.getTime()) / (1000 * 60 * 60 * 24)
        : 365; // Default to 1 year if somehow no date

      // Weight formula: higher weight = more likely to be picked
      // Inversely proportional to play count
      // Proportional to days since last play (log scale)
      const playCountFactor = 1 / release.playCount;
      const recencyFactor = Math.log(daysSincePlay + 1);

      const weight = playCountFactor * recencyFactor;

      return weight;
    });

    // Pick based on weights using cumulative distribution
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < releases.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        const selected = releases[i];
        console.log(
          `Selected: ${selected.basicInfo.title} (plays: ${selected.playCount}, weight: ${weights[i].toFixed(2)})`,
        );
        return selected;
      }
    }

    // Fallback (shouldn't reach here)
    return releases[releases.length - 1];
  }
}

import { Injectable, signal } from '@angular/core';
import { Observable, from, of, forkJoin } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { DatabaseService } from '../../core/database.service';
import { FilterService } from '../../shared/services/filter.service';
import { Release } from '../../shared/models/release.model';
import { DEFAULT_DAYS_SINCE_PLAYED } from '../../shared/constants/timing.constants';

@Injectable({
  providedIn: 'root',
})
export class RecommendationService {
  readonly filteredCount = signal(0);

  constructor(
    private db: DatabaseService,
    private filterService: FilterService,
  ) {}

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
   * Respects active filters from FilterService
   */
  getRecommendation(): Observable<Release | null> {
    return from(this.db.getAllReleases()).pipe(
      map((allReleases) => {
        const filtered = allReleases.filter((r) => this.filterService.matchesFilters(r));
        this.filteredCount.set(filtered.length);

        if (filtered.length === 0) {
          console.log('No releases match current filters');
          return null;
        }

        const neverPlayed = filtered.filter((r) => r.playCount === 0);
        if (neverPlayed.length > 0) {
          console.log(`Found ${neverPlayed.length} never-played items`);
          return this.pickRandom(neverPlayed);
        }

        console.log(
          `All filtered items played at least once, using weighted random selection (${allReleases.length - filtered.length} filtered out)`,
        );
        return this.weightedRandomPick(filtered);
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
    return this.getFilteredRecommendation(
      (r) => r.basicInfo.formats?.some((f) => f.includes(format)) ?? false,
      `format: ${format}`,
    );
  }

  /**
   * Get recommendations filtered by genre
   */
  getRecommendationByGenre(genre: string): Observable<Release | null> {
    return this.getFilteredRecommendation(
      (r) => r.basicInfo.genres?.includes(genre) ?? false,
      `genre: ${genre}`,
    );
  }

  /**
   * Get a recommendation from releases matching a filter predicate
   */
  private getFilteredRecommendation(
    predicate: (release: Release) => boolean,
    filterDescription: string,
  ): Observable<Release | null> {
    return from(this.db.getAllReleases()).pipe(
      map((allReleases) => {
        const filtered = allReleases.filter(predicate);

        if (filtered.length === 0) {
          console.log(`No releases found for ${filterDescription}`);
          return null;
        }

        const neverPlayed = filtered.filter((r) => r.playCount === 0);
        if (neverPlayed.length > 0) {
          return this.pickRandom(neverPlayed);
        }

        return this.weightedRandomPick(filtered);
      }),
      catchError((error) => {
        console.error(`Failed to get recommendation by ${filterDescription}:`, error);
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
   * Selects a release using weighted random selection based on play history.
   *
   * The algorithm favors releases that:
   * - Have been played fewer times (inversely proportional)
   * - Haven't been played recently (logarithmically proportional)
   * - Have a higher user rating (multiplicative bonus)
   *
   * **Weight Formula:** `weight = (1 / playCount) * log(daysSincePlay + 1) * ratingMultiplier`
   *
   * **Why this formula works:**
   * - `1 / playCount`: Releases played once have weight 1, played twice have 0.5, etc.
   *   This ensures less-played releases get proportionally more selection chance.
   * - `log(daysSincePlay + 1)`: Uses logarithmic scaling so recency matters but
   *   doesn't dominate. A release played 30 days ago isn't 30x more likely than
   *   one played yesterday - the log dampens extreme values.
   * - The +1 prevents log(0) when a release was played today.
   * - `ratingMultiplier`: User rating (0.75× for rating 1, 1.0× for rating 2 or unrated, 1.5× for rating 3).
   *   Play count and recency still dominate; rating provides a subtle tiebreaker.
   *
   * **Selection Process:**
   * 1. Calculate weight for each release
   * 2. Sum all weights to get total weight
   * 3. Generate random number between 0 and total weight
   * 4. Walk through releases, subtracting each weight until random <= 0
   * 5. Return the release where we "landed"
   *
   * @param releases - Array of releases to choose from (must have playCount > 0)
   * @returns The selected release
   */
  private weightedRandomPick(releases: Release[]): Release {
    const now = new Date();

    // Calculate weight for each release
    const weights = releases.map((release) => {
      const daysSincePlay = release.lastPlayedDate
        ? (now.getTime() - release.lastPlayedDate.getTime()) / (1000 * 60 * 60 * 24)
        : DEFAULT_DAYS_SINCE_PLAYED;

      // Weight formula: higher weight = more likely to be picked
      // Inversely proportional to play count
      // Proportional to days since last play (log scale)
      // Multiplied by user rating factor
      const playCountFactor = 1 / release.playCount;
      const recencyFactor = Math.log(daysSincePlay + 1);
      const ratingMultiplier = this.getRatingMultiplier(release.userRating);

      const weight = playCountFactor * recencyFactor * ratingMultiplier;

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

  /**
   * Returns a weight multiplier based on the user's personal rating.
   * Unrated and rating 2 are neutral (1.0×).
   * Rating 1 is slightly penalized (0.75×); rating 3 is slightly boosted (1.5×).
   */
  private getRatingMultiplier(rating?: 1 | 2 | 3): number {
    switch (rating) {
      case 1:
        return 0.75;
      case 3:
        return 1.5;
      default:
        return 1.0; // rating 2 or unrated — neutral
    }
  }
}

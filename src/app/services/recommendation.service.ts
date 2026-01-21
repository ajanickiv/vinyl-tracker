import { Injectable } from '@angular/core';
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
  async getMultipleRecommendations(count: number): Promise<Release[]> {
    const recommendations: Release[] = [];
    const usedIds = new Set<number>();

    for (let i = 0; i < count; i++) {
      const recommendation = await this.getRecommendation();
      if (recommendation && !usedIds.has(recommendation.id)) {
        recommendations.push(recommendation);
        usedIds.add(recommendation.id);
      }
    }

    return recommendations;
  }

  /**
   * Get a recommendation using weighted random selection
   * Priority: never-played items first, then weighted by play count and recency
   */
  async getRecommendation(): Promise<Release | null> {
    try {
      // Step 1: Check for never-played items
      const neverPlayed = await this.db.releases.where('playCount').equals(0).toArray();

      if (neverPlayed.length > 0) {
        console.log(`Found ${neverPlayed.length} never-played items`);
        return this.pickRandom(neverPlayed);
      }

      // Step 2: All items have been played at least once
      // Get all releases and calculate weights
      const allReleases = await this.db.getAllReleases();

      if (allReleases.length === 0) {
        console.log('No releases in collection');
        return null;
      }

      console.log('All items played at least once, using weighted random selection');
      return this.weightedRandomPick(allReleases);
    } catch (error) {
      console.error('Failed to get recommendation:', error);
      return null;
    }
  }

  /**
   * Get recommendations filtered by format (e.g., "Vinyl", "CD")
   */
  async getRecommendationByFormat(format: string): Promise<Release | null> {
    const allReleases = await this.db.getAllReleases();
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
  }

  /**
   * Get recommendations filtered by genre
   */
  async getRecommendationByGenre(genre: string): Promise<Release | null> {
    const allReleases = await this.db.getAllReleases();
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

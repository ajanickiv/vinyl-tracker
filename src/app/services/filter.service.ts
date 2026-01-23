import { Injectable, signal, computed } from '@angular/core';
import { RecommendationFilters, DEFAULT_FILTERS } from '../models/filter.model';
import { Release } from '../models/release.model';

const STORAGE_KEY = 'vinyl-tracker-filters';

@Injectable({
  providedIn: 'root',
})
export class FilterService {
  private filtersSignal = signal<RecommendationFilters>(this.loadFilters());

  readonly filters = this.filtersSignal.asReadonly();

  readonly hasActiveFilters = computed(() => {
    const f = this.filtersSignal();
    return f.excludeBoxSets || f.genres.length > 0 || f.decades.length > 0;
  });

  constructor() {}

  /**
   * Apply all active filters to a release
   */
  matchesFilters(release: Release): boolean {
    const filters = this.filtersSignal();

    // Box set filter
    if (filters.excludeBoxSets && this.isBoxSet(release)) {
      return false;
    }

    // Genre filter (if any genres selected, release must match at least one)
    if (filters.genres.length > 0) {
      const releaseGenres = release.basicInfo.genres || [];
      const hasMatchingGenre = filters.genres.some((g) => releaseGenres.includes(g));
      if (!hasMatchingGenre) {
        return false;
      }
    }

    // Decade filter (if any decades selected, release year must be in one)
    if (filters.decades.length > 0) {
      const year = release.basicInfo.year;
      if (!year) {
        return false;
      }
      const releaseDecade = this.getDecade(year);
      if (!filters.decades.includes(releaseDecade)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Set the exclude box sets filter
   */
  setExcludeBoxSets(exclude: boolean): void {
    this.updateFilters({ excludeBoxSets: exclude });
  }

  /**
   * Set the selected genres
   */
  setGenres(genres: string[]): void {
    this.updateFilters({ genres });
  }

  /**
   * Set the selected decades
   */
  setDecades(decades: string[]): void {
    this.updateFilters({ decades });
  }

  /**
   * Toggle a genre in the filter
   */
  toggleGenre(genre: string): void {
    const current = this.filtersSignal().genres;
    const updated = current.includes(genre)
      ? current.filter((g) => g !== genre)
      : [...current, genre];
    this.setGenres(updated);
  }

  /**
   * Toggle a decade in the filter
   */
  toggleDecade(decade: string): void {
    const current = this.filtersSignal().decades;
    const updated = current.includes(decade)
      ? current.filter((d) => d !== decade)
      : [...current, decade];
    this.setDecades(updated);
  }

  /**
   * Reset all filters to defaults
   */
  resetFilters(): void {
    this.filtersSignal.set({ ...DEFAULT_FILTERS });
    this.saveFilters();
  }

  /**
   * Check if a release is a box set
   */
  private isBoxSet(release: Release): boolean {
    return release.basicInfo.formats?.some((f) => f.toLowerCase().includes('box set')) ?? false;
  }

  /**
   * Get the decade string for a year (e.g., 1985 -> "1980s")
   */
  private getDecade(year: number): string {
    const decade = Math.floor(year / 10) * 10;
    return `${decade}s`;
  }

  /**
   * Load filters from localStorage
   */
  private loadFilters(): RecommendationFilters {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_FILTERS, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Failed to load filters:', error);
    }
    return { ...DEFAULT_FILTERS };
  }

  /**
   * Save filters to localStorage
   */
  private saveFilters(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.filtersSignal()));
    } catch (error) {
      console.error('Failed to save filters:', error);
    }
  }

  /**
   * Update filters and persist
   */
  private updateFilters(changes: Partial<RecommendationFilters>): void {
    this.filtersSignal.update((current) => ({ ...current, ...changes }));
    this.saveFilters();
  }
}

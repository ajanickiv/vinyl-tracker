import { Injectable, signal, computed } from '@angular/core';
import {
  PlayHistoryEntry,
  MAX_HISTORY_ENTRIES,
  PLAY_HISTORY_STORAGE_KEY,
} from '../models/play-history.model';

interface StoredHistoryEntry {
  releaseId: number;
  playedAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class PlayHistoryService {
  private historySignal = signal<PlayHistoryEntry[]>(this.loadHistory());

  readonly history = this.historySignal.asReadonly();

  readonly hasHistory = computed(() => this.historySignal().length > 0);

  readonly historyCount = computed(() => this.historySignal().length);

  /**
   * Add a release to play history.
   * Removes any existing entry for the same release (deduplication),
   * adds the new entry at the front, and trims to max size.
   */
  addToHistory(releaseId: number): void {
    this.historySignal.update((current) => {
      // Remove existing entry for this release (if any)
      const filtered = current.filter((entry) => entry.releaseId !== releaseId);

      // Add new entry at the front
      const newEntry: PlayHistoryEntry = {
        releaseId,
        playedAt: new Date(),
      };

      // Trim to max entries
      const updated = [newEntry, ...filtered].slice(0, MAX_HISTORY_ENTRIES);

      return updated;
    });

    this.saveHistory();
  }

  /**
   * Get the full play history
   */
  getHistory(): PlayHistoryEntry[] {
    return this.historySignal();
  }

  /**
   * Clear all play history
   */
  clearHistory(): void {
    this.historySignal.set([]);
    this.saveHistory();
  }

  /**
   * Load history from localStorage
   */
  private loadHistory(): PlayHistoryEntry[] {
    try {
      const stored = localStorage.getItem(PLAY_HISTORY_STORAGE_KEY);
      if (stored) {
        const parsed: StoredHistoryEntry[] = JSON.parse(stored);
        // Convert string dates back to Date objects
        return parsed.map((entry) => ({
          releaseId: entry.releaseId,
          playedAt: new Date(entry.playedAt),
        }));
      }
    } catch (error) {
      console.error('Failed to load play history:', error);
    }
    return [];
  }

  /**
   * Save history to localStorage
   */
  private saveHistory(): void {
    try {
      const toStore: StoredHistoryEntry[] = this.historySignal().map((entry) => ({
        releaseId: entry.releaseId,
        playedAt: entry.playedAt.toISOString(),
      }));
      localStorage.setItem(PLAY_HISTORY_STORAGE_KEY, JSON.stringify(toStore));
    } catch (error) {
      console.error('Failed to save play history:', error);
    }
  }
}

import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { PlayHistoryService } from './play-history.service';
import { PlaybackService } from './playback.service';
import {
  PlayStatsExport,
  ImportMode,
  ImportResult,
  ValidationResult,
} from '../models/play-stats-export.model';

@Injectable({
  providedIn: 'root',
})
export class PlayStatsExportService {
  constructor(
    private db: DatabaseService,
    private playHistoryService: PlayHistoryService,
    private playbackService: PlaybackService,
  ) {}

  /**
   * Generate export data from current database and play history
   */
  async generateExportData(): Promise<PlayStatsExport> {
    const releases = await this.db.getAllReleases();
    const playHistory = this.playHistoryService.getHistory();

    const playStats: PlayStatsExport['playStats'] = {};

    for (const release of releases) {
      if (release.playCount > 0 || release.lastPlayedDate) {
        playStats[release.id.toString()] = {
          playCount: release.playCount,
          lastPlayedDate: release.lastPlayedDate?.toISOString(),
        };
      }
    }

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      playStats,
      playHistory: playHistory.map((entry) => ({
        releaseId: entry.releaseId,
        playedAt: entry.playedAt.toISOString(),
      })),
    };
  }

  /**
   * Trigger file download with export data
   */
  async exportToFile(): Promise<void> {
    const data = await this.generateExportData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });

    const date = new Date().toISOString().split('T')[0];
    const filename = `vinyl-tracker-playstats-${date}.json`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Validate import file structure and data
   */
  validateImportFile(content: string): ValidationResult {
    try {
      const data = JSON.parse(content);
      const errors: string[] = [];

      // Check version
      if (data.version !== 1) {
        errors.push(`Unsupported version: ${data.version}. Expected version 1.`);
      }

      // Check required fields
      if (!data.exportedAt || typeof data.exportedAt !== 'string') {
        errors.push('Missing or invalid exportedAt field');
      }

      if (!data.playStats || typeof data.playStats !== 'object') {
        errors.push('Missing or invalid playStats field');
      }

      if (!Array.isArray(data.playHistory)) {
        errors.push('Missing or invalid playHistory field');
      }

      // Validate playStats entries
      if (data.playStats && typeof data.playStats === 'object') {
        for (const [releaseId, stats] of Object.entries(data.playStats)) {
          if (isNaN(parseInt(releaseId))) {
            errors.push(`Invalid releaseId in playStats: ${releaseId}`);
          }
          const typedStats = stats as { playCount?: number; lastPlayedDate?: string };
          if (typeof typedStats.playCount !== 'number' || typedStats.playCount < 0) {
            errors.push(`Invalid playCount for release ${releaseId}`);
          }
        }
      }

      // Validate playHistory entries
      if (Array.isArray(data.playHistory)) {
        for (const entry of data.playHistory) {
          if (typeof entry.releaseId !== 'number') {
            errors.push('Invalid releaseId in playHistory');
          }
          if (typeof entry.playedAt !== 'string') {
            errors.push('Invalid playedAt in playHistory');
          }
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        data: errors.length === 0 ? (data as PlayStatsExport) : undefined,
      };
    } catch {
      return {
        valid: false,
        errors: ['Invalid JSON format'],
      };
    }
  }

  /**
   * Import play stats from validated data
   */
  async importFromData(data: PlayStatsExport, mode: ImportMode): Promise<ImportResult> {
    let imported = 0;
    let skipped = 0;
    let reset = 0;
    const errors: string[] = [];

    // In replace mode, first reset ALL releases to zero plays
    if (mode === 'replace') {
      const allReleases = await this.db.getAllReleases();
      for (const release of allReleases) {
        if (release.playCount > 0 || release.lastPlayedDate) {
          try {
            await this.db.updateRelease(release.id, {
              playCount: 0,
              lastPlayedDate: undefined,
            });
            reset++;
          } catch {
            errors.push(`Failed to reset release ${release.id}`);
          }
        }
      }

      // Clear play history in replace mode
      this.playHistoryService.setHistory([]);
    }

    // Import playStats
    for (const [releaseIdStr, stats] of Object.entries(data.playStats)) {
      const releaseId = parseInt(releaseIdStr);
      const existingRelease = await this.db.getRelease(releaseId);

      if (!existingRelease) {
        skipped++;
        continue;
      }

      try {
        if (mode === 'replace') {
          await this.db.updateRelease(releaseId, {
            playCount: stats.playCount,
            lastPlayedDate: stats.lastPlayedDate ? new Date(stats.lastPlayedDate) : undefined,
          });
        } else {
          // Merge mode: add play counts, take latest date
          const newPlayCount = existingRelease.playCount + stats.playCount;
          const existingDate = existingRelease.lastPlayedDate?.getTime() || 0;
          const importedDate = stats.lastPlayedDate ? new Date(stats.lastPlayedDate).getTime() : 0;
          const latestDate = Math.max(existingDate, importedDate);

          await this.db.updateRelease(releaseId, {
            playCount: newPlayCount,
            lastPlayedDate: latestDate > 0 ? new Date(latestDate) : undefined,
          });
        }
        imported++;
      } catch {
        errors.push(`Failed to update release ${releaseId}`);
      }
    }

    // Import playHistory (for merge mode or if replace mode has history)
    if (data.playHistory.length > 0) {
      this.playHistoryService.setHistory(
        data.playHistory.map((entry) => ({
          releaseId: entry.releaseId,
          playedAt: new Date(entry.playedAt),
        })),
      );
    }

    // Notify subscribers that stats have changed
    if (imported > 0 || reset > 0) {
      this.playbackService.statsUpdated$.next();
    }

    return {
      success: errors.length === 0,
      imported,
      skipped,
      errors,
    };
  }
}

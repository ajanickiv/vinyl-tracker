/**
 * Export file format version 1
 */
export interface PlayStatsExportV1 {
  version: 1;
  exportedAt: string;
  playStats: {
    [releaseId: string]: {
      playCount: number;
      lastPlayedDate?: string;
    };
  };
  playHistory: Array<{
    releaseId: number;
    playedAt: string;
  }>;
}

export type PlayStatsExport = PlayStatsExportV1;

export type ImportMode = 'replace' | 'merge';

export interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  data?: PlayStatsExport;
}

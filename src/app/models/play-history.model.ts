export interface PlayHistoryEntry {
  releaseId: number;
  playedAt: Date;
}

export const MAX_HISTORY_ENTRIES = 10;
export const PLAY_HISTORY_STORAGE_KEY = 'vinyl-tracker-play-history';

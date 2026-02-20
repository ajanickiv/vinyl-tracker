/**
 * Play statistics for a single release
 */
export interface PlayStats {
  playCount: number;
  lastPlayedDate?: Date;
  daysSinceLastPlayed?: number;
}

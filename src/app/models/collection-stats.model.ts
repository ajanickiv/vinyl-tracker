import { Release } from './release.model';

export interface CollectionStats {
  totalReleases: number;
  totalPlays: number;
  neverPlayed: number;
  playedThisYear: number;
  mostPlayed?: Release;
  leastPlayed?: Release;
}

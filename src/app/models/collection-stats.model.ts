import { Release } from './release.model';

export interface CollectionStats {
  totalReleases: number;
  totalPlays: number;
  neverPlayed: number;
  mostPlayed?: Release;
  leastPlayed?: Release;
}

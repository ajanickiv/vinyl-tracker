/** Badge category types */
export type BadgeCategory = 'collection' | 'plays' | 'coverage' | 'discovery' | 'artist' | 'album';

/** Badge identifiers - 7 total badges (down from 15) */
export type BadgeId =
  | 'collector' // Collection size
  | 'spins' // Total plays
  | 'coverage' // Collection coverage %
  | 'genre-explorer' // Unique genres played
  | 'decade-hopper' // Unique decades played
  | 'devotion' // Artist dedication
  | 'favorite'; // Album replay

/** Standard tier levels for most badges (metal/gem progression) */
export type TierLevel = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'legendary';

/** Coverage badge uses vinyl-themed tier names */
export type CoverageTierLevel = 'needle-drop' | 'flip-side' | 'inner-groove' | 'mint-condition';

/** Tier configuration with threshold and display name */
export interface TierConfig {
  level: TierLevel | CoverageTierLevel;
  threshold: number;
  name: string;
}

/** Badge definition with optional tier configuration */
export interface BadgeDefinition {
  id: BadgeId;
  name: string;
  description: string;
  category: BadgeCategory;
  /** For non-tiered badges like discovery badges */
  requirement?: number;
  /** Tier thresholds for tiered badges */
  tiers?: TierConfig[];
}

/** Progress for a badge, including current tier for tiered badges */
export interface BadgeProgress {
  badge: BadgeDefinition;
  isUnlocked: boolean;
  current: number;
  required: number;
  /** Current tier level (for tiered badges) */
  currentTier?: TierConfig;
  /** Next tier to unlock (for tiered badges) */
  nextTier?: TierConfig;
  unlockedAt?: Date;
}

/** Persisted achievements state */
export interface AchievementsState {
  /** Map of badge ID to unlock data (timestamp and highest tier) */
  unlockedBadges: Record<string, BadgeUnlockData>;
}

/** Data stored for each unlocked badge */
export interface BadgeUnlockData {
  /** ISO timestamp of first unlock */
  firstUnlockedAt: string;
  /** Highest tier achieved (for tiered badges) */
  highestTier?: TierLevel | CoverageTierLevel;
  /** ISO timestamp of most recent tier upgrade */
  lastUpgradeAt?: string;
}

export const DEFAULT_ACHIEVEMENTS_STATE: AchievementsState = {
  unlockedBadges: {},
};

/** Standard tier thresholds for collection badge */
const COLLECTOR_TIERS: TierConfig[] = [
  { level: 'bronze', threshold: 10, name: 'Bronze' },
  { level: 'silver', threshold: 50, name: 'Silver' },
  { level: 'gold', threshold: 100, name: 'Gold' },
  { level: 'platinum', threshold: 500, name: 'Platinum' },
  { level: 'diamond', threshold: 1000, name: 'Diamond' },
  { level: 'legendary', threshold: 2500, name: 'Legendary' },
];

/** Standard tier thresholds for total plays badge */
const SPINS_TIERS: TierConfig[] = [
  { level: 'bronze', threshold: 100, name: 'Bronze' },
  { level: 'silver', threshold: 500, name: 'Silver' },
  { level: 'gold', threshold: 1000, name: 'Gold' },
  { level: 'platinum', threshold: 2500, name: 'Platinum' },
  { level: 'diamond', threshold: 5000, name: 'Diamond' },
  { level: 'legendary', threshold: 10000, name: 'Legendary' },
];

/** Vinyl-themed tier thresholds for coverage badge */
const COVERAGE_TIERS: TierConfig[] = [
  { level: 'needle-drop', threshold: 25, name: 'Needle Drop' },
  { level: 'flip-side', threshold: 50, name: 'Flip Side' },
  { level: 'inner-groove', threshold: 75, name: 'Inner Groove' },
  { level: 'mint-condition', threshold: 100, name: 'Mint Condition' },
];

/** Standard tier thresholds for artist dedication badge */
const DEVOTION_TIERS: TierConfig[] = [
  { level: 'bronze', threshold: 10, name: 'Bronze' },
  { level: 'silver', threshold: 25, name: 'Silver' },
  { level: 'gold', threshold: 50, name: 'Gold' },
  { level: 'platinum', threshold: 100, name: 'Platinum' },
  { level: 'diamond', threshold: 250, name: 'Diamond' },
  { level: 'legendary', threshold: 500, name: 'Legendary' },
];

/** Standard tier thresholds for album replay badge */
const FAVORITE_TIERS: TierConfig[] = [
  { level: 'bronze', threshold: 10, name: 'Bronze' },
  { level: 'silver', threshold: 25, name: 'Silver' },
  { level: 'gold', threshold: 50, name: 'Gold' },
  { level: 'platinum', threshold: 100, name: 'Platinum' },
  { level: 'diamond', threshold: 200, name: 'Diamond' },
  { level: 'legendary', threshold: 500, name: 'Legendary' },
];

/** All badge definitions - 7 badges total */
export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  // Collection badge (tiered)
  {
    id: 'collector',
    name: 'Collector',
    description: 'Build your vinyl collection',
    category: 'collection',
    tiers: COLLECTOR_TIERS,
  },

  // Total plays badge (tiered)
  {
    id: 'spins',
    name: 'Spins',
    description: 'Log plays across your collection',
    category: 'plays',
    tiers: SPINS_TIERS,
  },

  // Coverage badge (tiered with vinyl-themed names)
  {
    id: 'coverage',
    name: 'Coverage',
    description: 'Play through your collection',
    category: 'coverage',
    tiers: COVERAGE_TIERS,
  },

  // Discovery badges (non-tiered)
  {
    id: 'genre-explorer',
    name: 'Genre Explorer',
    description: 'Play albums from 5+ different genres',
    category: 'discovery',
    requirement: 5,
  },
  {
    id: 'decade-hopper',
    name: 'Decade Hopper',
    description: 'Play albums from 5+ different decades',
    category: 'discovery',
    requirement: 5,
  },

  // Artist dedication badge (tiered)
  {
    id: 'devotion',
    name: 'Devotion',
    description: 'Dedicate plays to a single artist',
    category: 'artist',
    tiers: DEVOTION_TIERS,
  },

  // Album replay badge (tiered)
  {
    id: 'favorite',
    name: 'Favorite',
    description: 'Replay your favorite album',
    category: 'album',
    tiers: FAVORITE_TIERS,
  },
];

/** Tier colors for styling */
export const TIER_COLORS: Record<TierLevel | CoverageTierLevel, string> = {
  // Standard tiers
  bronze: '#cd7f32',
  silver: '#c0c0c0',
  gold: '#ffd700',
  platinum: '#e5e4e2',
  diamond: '#b9f2ff',
  legendary: '#ff6b6b',
  // Coverage tiers (use copper theme variations)
  'needle-drop': '#cd7f32',
  'flip-side': '#c0c0c0',
  'inner-groove': '#ffd700',
  'mint-condition': '#50c878',
};

/** Helper to check if a badge is tiered */
export function isTieredBadge(badge: BadgeDefinition): boolean {
  return !!badge.tiers && badge.tiers.length > 0;
}

/** Helper to get tier by level */
export function getTierByLevel(
  badge: BadgeDefinition,
  level: TierLevel | CoverageTierLevel,
): TierConfig | undefined {
  return badge.tiers?.find((t) => t.level === level);
}

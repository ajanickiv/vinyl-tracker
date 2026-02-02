export type BadgeCategory = 'collection' | 'plays' | 'coverage' | 'discovery' | 'artist' | 'album';

export type BadgeId =
  | 'starter'
  | 'collector'
  | 'archivist'
  | 'century'
  | 'devoted'
  | 'obsessed'
  | 'no-dust'
  | 'genre-explorer'
  | 'decade-hopper'
  | 'fan'
  | 'superfan'
  | 'fanatic'
  | 'on-repeat'
  | 'worn-grooves'
  | 'needle-dropper';

export interface BadgeDefinition {
  id: BadgeId;
  name: string;
  description: string;
  category: BadgeCategory;
  requirement: number;
}

export interface BadgeProgress {
  badge: BadgeDefinition;
  isUnlocked: boolean;
  current: number;
  required: number;
  unlockedAt?: Date;
}

export interface AchievementsState {
  /** Map of badge ID to unlock timestamp (ISO string) */
  unlockedBadges: Record<string, string>;
}

export const DEFAULT_ACHIEVEMENTS_STATE: AchievementsState = {
  unlockedBadges: {},
};

/** All badge definitions */
export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  // Collection badges
  {
    id: 'starter',
    name: 'Starter',
    description: 'Add 10 albums to your collection',
    category: 'collection',
    requirement: 10,
  },
  {
    id: 'collector',
    name: 'Collector',
    description: 'Add 50 albums to your collection',
    category: 'collection',
    requirement: 50,
  },
  {
    id: 'archivist',
    name: 'Archivist',
    description: 'Add 100 albums to your collection',
    category: 'collection',
    requirement: 100,
  },

  // Play count badges
  {
    id: 'century',
    name: 'Century',
    description: 'Log 100 total plays',
    category: 'plays',
    requirement: 100,
  },
  {
    id: 'devoted',
    name: 'Devoted',
    description: 'Log 500 total plays',
    category: 'plays',
    requirement: 500,
  },
  {
    id: 'obsessed',
    name: 'Obsessed',
    description: 'Log 1000 total plays',
    category: 'plays',
    requirement: 1000,
  },

  // Coverage badge
  {
    id: 'no-dust',
    name: 'No Dust',
    description: 'Play every album in your collection at least once',
    category: 'coverage',
    requirement: 100, // 100% coverage
  },

  // Discovery badges
  {
    id: 'genre-explorer',
    name: 'Genre Explorer',
    description: 'Play albums from 5 or more different genres',
    category: 'discovery',
    requirement: 5,
  },
  {
    id: 'decade-hopper',
    name: 'Decade Hopper',
    description: 'Play albums from 5 or more different decades',
    category: 'discovery',
    requirement: 5,
  },

  // Artist dedication badges
  {
    id: 'fan',
    name: 'Fan',
    description: 'Play albums by the same artist 10 times',
    category: 'artist',
    requirement: 10,
  },
  {
    id: 'superfan',
    name: 'Superfan',
    description: 'Play albums by the same artist 25 times',
    category: 'artist',
    requirement: 25,
  },
  {
    id: 'fanatic',
    name: 'Fanatic',
    description: 'Play albums by the same artist 50 times',
    category: 'artist',
    requirement: 50,
  },

  // Album replay badges
  {
    id: 'on-repeat',
    name: 'On Repeat',
    description: 'Play the same album 10 times',
    category: 'album',
    requirement: 10,
  },
  {
    id: 'worn-grooves',
    name: 'Worn Grooves',
    description: 'Play the same album 25 times',
    category: 'album',
    requirement: 25,
  },
  {
    id: 'needle-dropper',
    name: 'Needle Dropper',
    description: 'Play the same album 50 times',
    category: 'album',
    requirement: 50,
  },
];

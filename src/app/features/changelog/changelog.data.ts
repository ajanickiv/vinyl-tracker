export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.5.0',
    date: 'March 2025',
    changes: [
      'Personal ratings — rate albums 1–3 to influence how often they are recommended',
      'Tiered achievement system — achievements now unlock across multiple tiers as you hit higher milestones',
      'Algorithm pool size — the player now shows how many albums the recommendation algorithm is choosing from',
      'Vinyl size filter — filter your collection by record size (7", 10", 12")',
      'Disc count filter — filter by number of discs in a release',
      "What's New — a changelog now appears automatically when the app updates, and can be revisited from the menu",
      'Bug fix — search results now update correctly after a collection re-sync',
    ],
  },
  {
    version: '1.4.0',
    date: 'February 2025',
    changes: [
      'Original release decade filter — filter by the decade a recording was originally released',
      'Number of discs synced from Discogs for multi-disc releases',
      'Box set exclusion filter improvements',
    ],
  },
];

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.5.0',
    date: 'March 2026',
    changes: [
      'Personal ratings — rate albums 1–3 to influence how often they are recommended',
      'Tiered achievement system — achievements now unlock across multiple tiers as you hit higher milestones',
      'Algorithm pool size — the player now shows how many albums the recommendation algorithm is choosing from',
      'Vinyl size filter — filter your collection by record size (7", 10", 12")',
      'Disc count filter — disc count is synced from Discogs and can be used to filter your collection',
      "What's New — a changelog now appears automatically when the app updates, and can be revisited from the menu",
      'Search re-sync — fixed an issue where results would not update after a collection re-sync',
    ],
  },
  {
    version: '1.4.0',
    date: 'February 2026',
    changes: [
      'Achievement badges — earn badges for collection milestones and track your habits from the trophy button',
    ],
  },
  {
    version: '1.3.0',
    date: 'February 2026',
    changes: ['PWA support — install the app on your home screen and use it offline'],
  },
  {
    version: '1.2.0',
    date: 'February 2026',
    changes: [
      'Stats drawer — view collection insights including play counts, never-played albums, and records played this year',
      'Unplayed filter — find albums that have not been listened to in 6+ months',
    ],
  },
  {
    version: '1.1.0',
    date: 'January 2026',
    changes: [
      'Original release year — master release data is synced from Discogs to show the year a recording was first released',
      'Decade filter — filter your collection by the decade a recording was originally released',
    ],
  },
];

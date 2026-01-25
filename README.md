# Vinyl Tracker

A personal listening tracker for your Discogs vinyl collection. Get personalized album recommendations based on play history, search your collection, and track your listening habits.

![Copper Theme](https://img.shields.io/badge/theme-Copper-c9845c)
![Angular](https://img.shields.io/badge/Angular-19+-red)
![License](https://img.shields.io/badge/license-MIT-blue)

## Features

- **Sync Your Collection** - Import your entire Discogs collection with one click
- **Smart Recommendations** - Get weighted random recommendations that prioritize unplayed and neglected albums
- **Play Tracking** - Track play counts and last played dates for each release
- **Search** - Quickly find any album in your collection with real-time search
- **Play History** - View your 10 most recent plays with quick access to replay
- **Filtering** - Filter recommendations by genre, decade, or exclude box sets
- **Collection Stats** - View stats about your listening habits and most played albums
- **Backup & Restore** - Export and import your play data as JSON files
- **Local Storage** - All play data stored locally in your browser using IndexedDB
- **Mobile First** - Optimized for mobile devices with a clean, touch-friendly interface

## How It Works

### First Time Setup

1. Launch the app and click "Sync from Discogs"
2. The app imports your collection from Discogs (this may take a few minutes for large collections)
3. Once synced, you're ready to start tracking your listening!

### Using the App

**Main Screen**

- The app displays a vinyl record with album art from your collection
- You'll see the artist, album title, year, format, play count, and last played date
- Two main actions:
  - **Mark as Played** - Logs a play (increments count, updates date) and loads the next recommendation
  - **Skip / Get Another** - Get a new recommendation without logging a play

**Header Buttons**

- **Search (magnifying glass)** - Open the search sheet to find any album
- **History (clock)** - View your 10 most recent plays
- **Menu (three dots)** - Open the settings drawer

**Search Sheet**

- Tap the search icon to open the search panel
- Type to filter your collection in real-time
- Results show artist, title, year, and play count
- Tap any result to load it on the turntable

**Play History Sheet**

- Tap the history icon to see your recent plays
- Shows the last 10 albums you've played
- Tap any entry to load it on the turntable
- Albums no longer in your collection appear grayed out

**Recommendation Algorithm**

- **Never played items** are always recommended first (random selection)
- Once all items have been played at least once, the algorithm uses **weighted random selection**:
  - Items with **lower play counts** have higher weight
  - Items **not played recently** have higher weight
  - Recent plays still have a chance, just lower probability
  - Formula: `weight = (1 / playCount) * log(daysSincePlay + 1)`

**Menu Drawer**

Tap the menu icon in the top-right to access:

- **Filters** - Customize recommendations
  - Toggle "Exclude Box Sets" to skip box set releases
  - Select genres to filter by (e.g., Rock, Jazz, Electronic)
  - Select decades to filter by (e.g., 1970s, 1980s, 1990s)
- **Collection Stats** - View totals and percentages
  - Total releases, total plays, never played count
  - Percentage of collection played
- **Most Played** - See your most played album
- **Advanced** (collapsible section)
  - **Collection Sync** - Re-sync from Discogs to add new purchases
  - **Backup & Restore** - Export/import play data as JSON

### Filtering Your Collection

Use filters to focus recommendations on specific parts of your collection:

1. Open the menu drawer
2. Under "Filters", you'll see available options based on your collection
3. Toggle "Exclude Box Sets" to skip box set releases
4. Tap genre chips to filter by one or more genres
5. Tap decade chips to filter by era
6. Filters apply immediately to recommendations

### Backup & Restore

Export your play data to keep a backup or transfer to another device:

**Exporting**

1. Open menu drawer > Advanced > Backup & Restore
2. Tap "Export Play Stats"
3. A JSON file downloads with your play counts and history

**Importing**

1. Choose import mode:
   - **Replace** - Overwrites existing play data completely
   - **Merge** - Adds imported play counts to existing counts
2. Tap "Import Play Stats" and select your backup file
3. Only releases in your current collection are imported (others are skipped)

### Re-syncing Your Collection

When you add new records to your Discogs collection:

1. Open the menu drawer > Advanced > Collection Sync
2. Tap "Re-sync from Discogs"
3. New releases are added to your local database
4. **Your play counts and dates are preserved** for existing releases

## Development

### Prerequisites

- Node.js 18+ and npm
- Angular CLI: `npm install -g @angular/cli`
- Discogs account with API access

### Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd vinyl-tracker
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up Discogs API credentials:
   - Go to https://www.discogs.com/settings/developers
   - Generate a new personal access token
   - Update `src/environments/environment.ts`:
     ```typescript
     export const environment = {
       production: false,
       discogsToken: 'YOUR_TOKEN_HERE',
       discogsUsername: 'YOUR_USERNAME_HERE',
       discogsApiUrl: 'https://api.discogs.com',
     };
     ```

4. Run the development server:

   ```bash
   ng serve
   ```

5. Navigate to `http://localhost:4200`

### Running Tests

```bash
npm test
```

### Building for Production

```bash
ng build --configuration production
```

The build artifacts will be stored in the `dist/` directory.

### Project Structure

```
src/
├── app/
│   ├── components/
│   │   ├── vinyl-player/          # Main player interface
│   │   ├── sync-screen/           # First-time sync UI
│   │   ├── menu-drawer/           # Side menu with stats, filters, settings
│   │   ├── search-sheet/          # Collection search bottom sheet
│   │   └── play-history-sheet/    # Recent plays bottom sheet
│   ├── models/
│   │   ├── release.model.ts       # Release data structure
│   │   ├── discogs-api.model.ts   # Discogs API types
│   │   ├── collection-stats.model.ts  # Stats types
│   │   ├── filter.model.ts        # Filter configuration
│   │   ├── play-history.model.ts  # Play history entry
│   │   └── play-stats-export.model.ts # Export/import format
│   ├── services/
│   │   ├── database.service.ts    # Dexie/IndexedDB wrapper
│   │   ├── discogs.service.ts     # Discogs API integration
│   │   ├── playback.service.ts    # Play tracking logic
│   │   ├── recommendation.service.ts  # Recommendation algorithm
│   │   ├── filter.service.ts      # Filter state management
│   │   ├── play-history.service.ts    # Recent plays tracking
│   │   └── play-stats-export.service.ts # Backup/restore logic
│   ├── constants/
│   │   └── timing.constants.ts    # Animation and timing values
│   └── app.ts                     # Root component
├── styles/
│   ├── _variables.scss            # Color and design tokens
│   └── _mixins.scss               # Reusable style patterns
├── environments/
│   ├── environment.ts             # Development config
│   └── environment.prod.ts        # Production config
└── index.html
```

## Tech Stack

- **Angular 19+** - Frontend framework with standalone components
- **Signals** - Angular's reactive primitives for state management
- **Dexie.js** - IndexedDB wrapper for local storage
- **Discogs API** - Music database and collection access
- **SCSS** - Styling with Copper color theme and reusable mixins

## Data Storage

All data is stored locally in your browser using IndexedDB:

- **Releases Table** - Your synced collection with play tracking data
  - Discogs metadata (title, artist, year, formats, genres, etc.)
  - Play tracking (playCount, lastPlayedDate)
  - User data (notes, rating)

- **Metadata Table** - App settings
  - Last sync timestamp

- **Local Storage** - Play history (last 10 plays)

**Privacy** Your play data never leaves your device. It's stored entirely in your browser's local database.

## API Rate Limiting

The Discogs API allows 60 requests per minute for authenticated users. The sync service:

- Fetches 100 releases per page (maximum allowed)
- Waits 1 second between page requests
- Displays progress during sync

For a collection of 500 releases, expect sync to take approximately 30-45 seconds.

## Customization

### Colors

The app uses a copper theme with a charcoal background. To customize:

Edit the SCSS variables in `src/styles/_variables.scss`:

```scss
// Primary Brand Colors (Copper Theme)
$color-primary: #c9845c;
$color-primary-dark: #a86d4a;
$color-primary-darker: #8a5a3d;

// Background Colors (Charcoal Theme)
$color-background: #1c1c1c;
$color-background-light: #2a2a2a;

// Turntable Colors
$color-turntable-light: #3986b3;
$color-turntable-dark: #2a6a8f;
```

### Recommendation Algorithm

To adjust the recommendation weighting, edit `recommendation.service.ts`:

```typescript
// Current formula
const playCountFactor = 1 / release.playCount;
const recencyFactor = Math.log(daysSincePlay + 1);
const weight = playCountFactor * recencyFactor;

// Examples:
// Make play count matter more:
const playCountFactor = 1 / Math.pow(release.playCount, 1.5);

// Make recency matter more:
const recencyFactor = Math.sqrt(daysSincePlay);
```

## Deployment

### Netlify (Recommended)

1. Build the production app:

   ```bash
   ng build --configuration production
   ```

2. Create a `_redirects` file in `dist/vinyl-tracker/browser/`:

   ```
   /*    /index.html   200
   ```

3. Deploy to Netlify:
   - Drag the `dist/vinyl-tracker/browser` folder to Netlify's web interface
   - Or use the Netlify CLI:
     ```bash
     npm install -g netlify-cli
     netlify login
     netlify deploy --prod
     ```

### Other Platforms

The app is a static Angular application and can be deployed to:

- Vercel
- GitHub Pages
- AWS S3 + CloudFront
- Any static hosting service

## Future Enhancement Ideas

- PWA support for offline use
- Listening streaks ("X days in a row")
- Share what you're listening to on social media
- Multi-device sync with backend storage
- Listening timeline/calendar view
- Collection value tracking via Discogs marketplace data

## Troubleshooting

**Sync fails with authentication error:**

- Verify your Discogs token is valid
- Check that your username is correct in environment config

**Collection not loading:**

- Open browser DevTools > Application > IndexedDB
- Check if `DiscogsTrackerDB` exists with data
- Try clearing the database and re-syncing

**Recommendations seem skewed:**

- The algorithm is working as designed - items with very low play counts will dominate
- Play more of your collection to balance things out
- Or adjust the weighting formula in `recommendation.service.ts`

**Filters not showing genres/decades:**

- Filters are populated based on your collection data
- If genres or decades are empty, your collection may not have that metadata
- Try re-syncing from Discogs

**Import not working:**

- Ensure the file is valid JSON in the expected format
- Only releases that exist in your current collection are imported
- Check the status message for details on skipped releases

**App won't load after deployment:**

- Ensure the `_redirects` file is present for client-side routing
- Check browser console for errors

## License

MIT

## Credits

Built with love for vinyl collectors.

Powered by the [Discogs API](https://www.discogs.com/developers/).

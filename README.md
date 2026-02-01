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
- **Filtering** - Filter recommendations by genre, pressing decade, original decade, exclude box sets, or albums not played in 6+ months
- **Original Release Year** - Optionally sync master release data to see when albums were first released
- **Collection Stats** - Dedicated stats drawer with collection coverage metrics, most played album, and oldest never-played discovery
- **Backup & Restore** - Export and import your play data as JSON files
- **Local Storage** - All play data stored locally in your browser using IndexedDB
- **Mobile First** - Optimized for mobile devices with a clean, touch-friendly interface

## How It Works

### First Time Setup

1. Launch the app and you'll be prompted to connect your Discogs account
2. Enter your Discogs username and personal access token
   - [Get a token from Discogs Developer Settings](https://www.discogs.com/settings/developers)
3. Click "Connect to Discogs" to save your credentials
4. The app then syncs your collection (this may take a few minutes for large collections)
5. Once synced, you're ready to start tracking your listening!

Your credentials are stored locally in your browser and never sent anywhere except to the Discogs API.

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
- **Stats (bar chart)** - Open the collection stats drawer
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

**Stats Drawer**

- Tap the stats icon to see collection coverage metrics
- **Total Releases** - Number of albums in your collection
- **Total Plays** - Sum of all play counts
- **Never Played** - Tappable stat that applies the "not played in 6+ months" filter
- **Collection Played %** - Percentage of collection played at least once
- **Played This Year %** - Percentage of collection played in the current year
- **Most Played** - Your most listened-to album with play count
- **Oldest Never Played** - Tap to load the oldest unplayed album and start discovering neglected gems

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
  - Toggle "Not Played in 6+ Months" to focus on neglected albums
  - Select genres to filter by (e.g., Rock, Jazz, Electronic)
  - Select pressing decades to filter by when your pressing was released (e.g., a 2020 reissue)
  - Select original decades to filter by when the album was first released (requires master release sync)
- **Advanced** (collapsible section)
  - **Discogs Account** - View connected username and edit credentials
  - **Collection Sync** - Re-sync from Discogs to add new purchases
  - **Master Release Sync** - Toggle to fetch original release years from Discogs master releases
  - **Backup & Restore** - Export/import play data as JSON

### Filtering Your Collection

Use filters to focus recommendations on specific parts of your collection:

1. Open the menu drawer
2. Under "Filters", you'll see available options based on your collection
3. Toggle "Exclude Box Sets" to skip box set releases
4. Toggle "Not Played in 6+ Months" to focus on neglected albums (or tap "Never Played" in the stats drawer)
5. Tap genre chips to filter by one or more genres
6. Tap pressing decade chips to filter by when your specific pressing was released (e.g., find all your 2010s reissues)
7. Tap original decade chips to filter by when albums were first released (e.g., find all albums originally from the 1970s, regardless of pressing year)
8. Filters apply immediately to recommendations

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

### Changing Your Discogs Account

To update your credentials or switch to a different Discogs account:

1. Open the menu drawer > Advanced > Discogs Account
2. Tap "Edit Credentials"
3. Enter your new username and personal access token
4. Tap "Save" to update

Note: Your play data is stored locally and will remain even if you change accounts.

### Re-syncing Your Collection

When you add new records to your Discogs collection:

1. Open the menu drawer > Advanced > Collection Sync
2. Tap "Re-sync from Discogs"
3. New releases are added to your local database
4. **Your play counts and dates are preserved** for existing releases

### Master Release Sync (Original Release Years)

Many releases in Discogs are reissues, remasters, or later pressings. Each release has a "pressing year" (when your specific copy was manufactured), but you may want to know when the album was _originally_ released. The master release sync feature fetches the original release year from Discogs master releases, allowing you to:

- See when an album was originally released (displayed on the vinyl player alongside the pressing year)
- Filter your collection by original decade (e.g., find all albums originally from the 1970s, even if you own a 2020 reissue)

**Enabling Master Release Sync:**

1. Open the menu drawer > Advanced
2. Toggle "Master Release Sync" to On
3. The app will fetch master release data in the background after each collection sync
4. Progress is shown in the header while syncing

**Notes:**

- Master release data is fetched in the background to respect Discogs API rate limits
- Not all releases have a master release (singles, compilations, etc.)
- Original year data is cached locally and only needs to be fetched once per release
- The sync can be paused/resumed automatically between sessions

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

3. Run the development server:

   ```bash
   ng serve
   ```

4. Navigate to `http://localhost:4200`

5. On first launch, the app will prompt you for your Discogs credentials:
   - [Get a personal access token from Discogs](https://www.discogs.com/settings/developers)
   - Enter your username and token in the setup screen
   - Credentials are stored in your browser's localStorage

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
│   │   ├── setup-screen/          # First-time credentials setup
│   │   ├── sync-screen/           # Collection sync UI
│   │   ├── menu-drawer/           # Side menu with filters and settings
│   │   ├── search-sheet/          # Collection search bottom sheet
│   │   ├── play-history-sheet/    # Recent plays bottom sheet
│   │   └── stats-sheet/           # Collection stats bottom sheet
│   ├── models/
│   │   ├── release.model.ts       # Release data structure
│   │   ├── discogs-api.model.ts   # Discogs API types
│   │   ├── credentials.model.ts   # Discogs credentials types
│   │   ├── collection-stats.model.ts  # Stats types
│   │   ├── filter.model.ts        # Filter configuration
│   │   ├── play-history.model.ts  # Play history entry
│   │   └── play-stats-export.model.ts # Export/import format
│   ├── services/
│   │   ├── database.service.ts    # Dexie/IndexedDB wrapper
│   │   ├── discogs.service.ts     # Discogs API integration
│   │   ├── credentials.service.ts # Discogs credentials management
│   │   ├── playback.service.ts    # Play tracking logic
│   │   ├── recommendation.service.ts  # Recommendation algorithm
│   │   ├── filter.service.ts      # Filter state management
│   │   ├── play-history.service.ts    # Recent plays tracking
│   │   ├── play-stats-export.service.ts # Backup/restore logic
│   │   └── master-release.service.ts # Fetches original years from Discogs master releases
│   ├── pipes/
│   │   └── artist-name.pipe.ts    # Cleans Discogs artist name disambiguation
│   ├── constants/
│   │   └── timing.constants.ts    # Animation and timing values
│   └── app.ts                     # Root component
├── styles/
│   ├── _variables.scss            # Color and design tokens
│   └── _mixins.scss               # Reusable style patterns
├── environments/
│   ├── environment.ts             # Development config (API URL only)
│   └── environment.prod.ts        # Production config (API URL only)
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

- **Local Storage** - Play history (last 10 plays), filter preferences, Discogs credentials

**Privacy**: Your data never leaves your device except for API calls to Discogs. Credentials, play history, and collection data are stored entirely in your browser.

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

- Verify your Discogs token is valid and hasn't expired
- Check that your username is correct
- Go to Menu > Advanced > Discogs Account to update your credentials
- Generate a new token at [Discogs Developer Settings](https://www.discogs.com/settings/developers)

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

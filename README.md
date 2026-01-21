# Vinyl Tracker

A personal listening tracker for your Discogs vinyl collection. Get personalized album recommendations based on play history and track your listening habits.

![Browns Colors](https://img.shields.io/badge/colors-Browns%20Orange%20%26%20Brown-FF3C00)
![Angular](https://img.shields.io/badge/Angular-18+-red)
![License](https://img.shields.io/badge/license-MIT-blue)

## Features

- 🎵 **Sync Your Collection** - Import your entire Discogs collection with one click
- 🎲 **Smart Recommendations** - Get weighted random recommendations that prioritize unplayed and neglected albums
- 📊 **Play Tracking** - Track play counts and last played dates for each release
- 📈 **Collection Stats** - View stats about your listening habits
- 💾 **Local Storage** - All play data stored locally in your browser using IndexedDB
- 📱 **Mobile First** - Optimized for mobile devices with a clean, touch-friendly interface
- 🟤🟠 **Cleveland Browns Theme** - Custom color scheme for Browns fans

## How It Works

### First Time Setup

1. Launch the app and click "Sync from Discogs"
2. The app imports your collection from Discogs (this may take a few minutes for large collections)
3. Once synced, you're ready to start tracking your listening!

### Using the App

**Main Screen:**

- The app displays a vinyl record with album art from your collection
- You'll see the artist, album title, year, format, play count, and last played date
- Two main actions:
  - **Mark as Played** - Logs a play (increments count, updates date) and loads the next recommendation
  - **Skip / Get Another** - Get a new recommendation without logging a play

**Recommendation Algorithm:**

- **Never played items** are always recommended first (random selection)
- Once all items have been played at least once, the algorithm uses **weighted random selection**:
  - Items with **lower play counts** have higher weight
  - Items **not played recently** have higher weight
  - Recent plays still have a chance, just lower probability
  - Formula: `weight = (1 / playCount) * log(daysSincePlay + 1)`

**Menu Drawer:**

- Tap the menu icon (⋮) in the top-right to access:
  - **Sync status** - See when you last synced with Discogs
  - **Re-sync** - Pull new additions from Discogs (preserves your play data)
  - **Collection stats** - Total releases, total plays, never played count, most played album

### Re-syncing Your Collection

When you add new records to your Discogs collection:

1. Open the menu drawer
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
│   │   └── menu-drawer/           # Side menu with stats
│   ├── models/
│   │   ├── release.model.ts       # Release data structure
│   │   └── discogs-api.model.ts   # Discogs API types
│   ├── services/
│   │   ├── database.service.ts    # Dexie/IndexedDB wrapper
│   │   ├── discogs.service.ts     # Discogs API integration
│   │   ├── playback.service.ts    # Play tracking logic
│   │   └── recommendation.service.ts  # Recommendation algorithm
│   └── app.component.ts           # Root component
├── environments/
│   ├── environment.ts             # Development config
│   └── environment.prod.ts        # Production config
└── index.html
```

## Tech Stack

- **Angular 18+** - Frontend framework with standalone components
- **Signals** - Angular's reactive primitives for state management
- **Dexie.js** - IndexedDB wrapper for local storage
- **Discogs API** - Music database and collection access
- **SCSS** - Styling with Browns color theme

## Data Storage

All data is stored locally in your browser using IndexedDB:

- **Releases Table** - Your synced collection with play tracking data
  - Discogs metadata (title, artist, year, formats, genres, etc.)
  - Play tracking (playCount, lastPlayedDate)
  - User data (notes, rating)

- **Metadata Table** - App settings
  - Last sync timestamp

**Privacy:** Your play data never leaves your device. It's stored entirely in your browser's local database.

## API Rate Limiting

The Discogs API allows 60 requests per minute for authenticated users. The sync service:

- Fetches 100 releases per page (maximum allowed)
- Waits 1 second between page requests
- Displays progress during sync

For a collection of 500 releases, expect sync to take approximately 30-45 seconds.

## Customization

### Colors

The app uses Cleveland Browns colors by default. To customize:

Edit the SCSS variables in component stylesheets:

- Brown: `#311D00`
- Orange: `#FF3C00`
- Burnt Orange: `#CC5500`
- Turntable Blue: `#3986b3`

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

- Filter recommendations by genre, format, or decade
- Listening history timeline
- Export play data to CSV
- PWA support for offline use
- Listening streaks ("X days in a row")
- Share what you're listening to on social media
- Multi-device sync with backend storage

## Troubleshooting

**Sync fails with authentication error:**

- Verify your Discogs token is valid
- Check that your username is correct in environment config

**Collection not loading:**

- Open browser DevTools → Application → IndexedDB
- Check if `DiscogsTrackerDB` exists with data
- Try clearing the database and re-syncing

**Recommendations seem skewed:**

- The algorithm is working as designed - items with very low play counts will dominate
- Play more of your collection to balance things out
- Or adjust the weighting formula in `recommendation.service.ts`

**App won't load after deployment:**

- Ensure the `_redirects` file is present for client-side routing
- Check browser console for errors

## License

MIT

## Credits

Built with ❤️ for vinyl collectors and Cleveland Browns fans.

Powered by the [Discogs API](https://www.discogs.com/developers/).

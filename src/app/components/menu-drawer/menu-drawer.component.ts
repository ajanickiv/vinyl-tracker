import { Component, signal, input, output, OnDestroy, isDevMode, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, tap } from 'rxjs/operators';
import { DatabaseService } from '../../services/database.service';
import { DiscogsService } from '../../services/discogs.service';
import { PlaybackService } from '../../services/playback.service';
import { FilterService } from '../../services/filter.service';
import { PlayStatsExportService } from '../../services/play-stats-export.service';
import { CredentialsService } from '../../services/credentials.service';
import { MasterReleaseService } from '../../services/master-release.service';
import { CollectionStats } from '../../models/collection-stats.model';
import { ImportMode } from '../../models/play-stats-export.model';
import { ArtistNamePipe } from '../../pipes/artist-name.pipe';
import { SYNC_MESSAGE_DISPLAY_MS } from '../../constants/timing.constants';
import { APP_VERSION } from '../../constants/app.constants';

@Component({
  selector: 'app-menu-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule, ArtistNamePipe],
  templateUrl: './menu-drawer.component.html',
  styleUrls: ['./menu-drawer.component.scss'],
})
export class MenuDrawerComponent implements OnDestroy {
  collectionStats = signal<CollectionStats | null>(null);
  lastSyncDate = signal<Date | null>(null);
  syncing = signal(false);
  syncMessage = signal('');
  clearing = signal(false);

  // Filter-related signals
  availableGenres = signal<string[]>([]);
  availableDecades = signal<string[]>([]);
  availableOriginalDecades = signal<string[]>([]);

  // Export/Import signals
  exporting = signal(false);
  importing = signal(false);
  importExportMessage = signal('');
  importMode = signal<ImportMode>('replace');

  // Advanced section collapsed state
  advancedExpanded = signal(false);

  // Credentials editing signals
  editingCredentials = signal(false);
  editUsername = signal('');
  editToken = signal('');
  showEditToken = signal(false);
  credentialsMessage = signal('');

  // Master release sync setting
  masterReleaseSyncEnabled = signal(true);

  readonly isDevMode = isDevMode();
  readonly appVersion = APP_VERSION;

  isOpen = input.required<boolean>();
  close = output<void>();
  dataCleared = output<void>();
  filtersChanged = output<void>();

  private destroy$ = new Subject<void>();

  constructor(
    private db: DatabaseService,
    private discogsService: DiscogsService,
    private playbackService: PlaybackService,
    public filterService: FilterService,
    private playStatsExportService: PlayStatsExportService,
    public credentialsService: CredentialsService,
    private masterReleaseService: MasterReleaseService,
  ) {
    this.loadMenuData();

    // Subscribe to stats updates to refresh when plays change
    this.playbackService.statsUpdated$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.refreshCollectionStats();
    });

    // Reload filter options and settings when drawer opens
    effect(() => {
      if (this.isOpen()) {
        this.loadFilterOptions();
        this.loadMasterReleaseSyncSetting();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  closeDrawer() {
    this.close.emit();
  }

  getTimeSinceSync(): string {
    const lastSync = this.lastSyncDate();
    if (!lastSync) return 'Never';

    // Compare calendar dates (midnight to midnight)
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const syncDay = new Date(lastSync.getFullYear(), lastSync.getMonth(), lastSync.getDate());
    const diffDays = Math.floor((today.getTime() - syncDay.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  }

  loadMenuData(): void {
    this.db
      .getLastSyncDate()
      .then((lastSync) => {
        this.lastSyncDate.set(lastSync);
      })
      .catch((error) => {
        console.error('Failed to load last sync date:', error);
      });

    this.refreshCollectionStats();

    // Load available genres and decades for filter chips
    this.loadFilterOptions();
  }

  private refreshCollectionStats(): void {
    this.playbackService
      .getCollectionStats()
      .pipe(
        tap((stats) => {
          this.collectionStats.set(stats);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }

  private loadFilterOptions(): void {
    this.db
      .getAllReleases()
      .then((releases) => {
        // Extract unique genres
        const genreSet = new Set<string>();
        releases.forEach((r) => {
          r.basicInfo.genres?.forEach((g) => genreSet.add(g));
        });
        this.availableGenres.set([...genreSet].sort());

        // Extract unique decades (pressing year)
        const decadeSet = new Set<string>();
        releases.forEach((r) => {
          if (r.basicInfo.year) {
            const decade = Math.floor(r.basicInfo.year / 10) * 10;
            decadeSet.add(`${decade}s`);
          }
        });
        this.availableDecades.set([...decadeSet].sort((a, b) => parseInt(a) - parseInt(b)));

        // Extract unique original decades (from master release)
        const originalDecadeSet = new Set<string>();
        releases.forEach((r) => {
          if (r.basicInfo.originalYear) {
            const decade = Math.floor(r.basicInfo.originalYear / 10) * 10;
            originalDecadeSet.add(`${decade}s`);
          }
        });
        this.availableOriginalDecades.set(
          [...originalDecadeSet].sort((a, b) => parseInt(a) - parseInt(b)),
        );
      })
      .catch((error) => {
        console.error('Failed to load filter options:', error);
      });
  }

  toggleExcludeBoxSets(): void {
    const current = this.filterService.filters().excludeBoxSets;
    this.filterService.setExcludeBoxSets(!current);
    this.filtersChanged.emit();
  }

  toggleGenre(genre: string): void {
    this.filterService.toggleGenre(genre);
    this.filtersChanged.emit();
  }

  toggleDecade(decade: string): void {
    this.filterService.toggleDecade(decade);
    this.filtersChanged.emit();
  }

  isGenreSelected(genre: string): boolean {
    return this.filterService.filters().genres.includes(genre);
  }

  isDecadeSelected(decade: string): boolean {
    return this.filterService.filters().decades.includes(decade);
  }

  toggleOriginalDecade(decade: string): void {
    this.filterService.toggleOriginalDecade(decade);
    this.filtersChanged.emit();
  }

  isOriginalDecadeSelected(decade: string): boolean {
    return this.filterService.filters().originalDecades.includes(decade);
  }

  onBackdropClick() {
    this.closeDrawer();
  }

  async resync(): Promise<void> {
    this.syncing.set(true);
    this.syncMessage.set('Syncing...');

    try {
      const result = await this.discogsService.syncCollection();
      if (result.success) {
        this.syncMessage.set(`✅ Synced ${result.totalSynced} releases!`);
        this.loadMenuData();

        // Start background fetch of master release data if enabled
        if (this.masterReleaseSyncEnabled()) {
          await this.masterReleaseService.startBackgroundFetch();
        }
      } else {
        this.syncMessage.set(`❌ Sync failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Sync error:', error);
      this.syncMessage.set('❌ Sync failed: Unexpected error');
    } finally {
      setTimeout(() => {
        this.syncing.set(false);
        this.syncMessage.set('');
      }, SYNC_MESSAGE_DISPLAY_MS);
    }
  }

  clearData(): void {
    this.clearing.set(true);
    this.discogsService
      .clearSyncedData()
      .then(() => {
        this.dataCleared.emit();
        this.closeDrawer();
      })
      .catch((error) => {
        console.error('Failed to clear data:', error);
      })
      .finally(() => {
        this.clearing.set(false);
      });
  }

  async onExport(): Promise<void> {
    this.exporting.set(true);
    this.importExportMessage.set('');

    try {
      await this.playStatsExportService.exportToFile();
      this.importExportMessage.set('Export downloaded successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      this.importExportMessage.set('Export failed. Please try again.');
    } finally {
      this.exporting.set(false);
      setTimeout(() => this.importExportMessage.set(''), SYNC_MESSAGE_DISPLAY_MS);
    }
  }

  onImportClick(): void {
    const fileInput = document.getElementById('import-file-input') as HTMLInputElement;
    fileInput?.click();
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    this.importing.set(true);
    this.importExportMessage.set('Importing...');

    try {
      const content = await file.text();
      const validation = this.playStatsExportService.validateImportFile(content);

      if (!validation.valid) {
        this.importExportMessage.set(`Invalid file: ${validation.errors[0]}`);
        return;
      }

      const result = await this.playStatsExportService.importFromData(
        validation.data!,
        this.importMode(),
      );

      if (result.success) {
        this.importExportMessage.set(
          `Imported ${result.imported} releases` +
            (result.skipped > 0 ? `, skipped ${result.skipped}` : ''),
        );
        this.loadMenuData();
      } else {
        this.importExportMessage.set(`Import completed with errors: ${result.errors[0]}`);
      }
    } catch (error) {
      console.error('Import failed:', error);
      this.importExportMessage.set('Import failed. Please try again.');
    } finally {
      this.importing.set(false);
      input.value = '';
      setTimeout(() => this.importExportMessage.set(''), SYNC_MESSAGE_DISPLAY_MS);
    }
  }

  setImportMode(mode: ImportMode): void {
    this.importMode.set(mode);
  }

  toggleAdvanced(): void {
    this.advancedExpanded.set(!this.advancedExpanded());
  }

  // Credentials editing methods
  startEditCredentials(): void {
    this.editUsername.set(this.credentialsService.getUsername() ?? '');
    this.editToken.set('');
    this.showEditToken.set(false);
    this.credentialsMessage.set('');
    this.editingCredentials.set(true);
  }

  cancelEditCredentials(): void {
    this.editingCredentials.set(false);
    this.editUsername.set('');
    this.editToken.set('');
    this.credentialsMessage.set('');
  }

  saveCredentials(): void {
    const username = this.editUsername().trim();
    const token = this.editToken().trim();

    if (!username) {
      this.credentialsMessage.set('Username is required');
      return;
    }

    if (!token) {
      this.credentialsMessage.set('Token is required');
      return;
    }

    this.credentialsService.setCredentials({ username, token });
    this.credentialsMessage.set('Credentials saved!');
    this.editingCredentials.set(false);

    setTimeout(() => this.credentialsMessage.set(''), SYNC_MESSAGE_DISPLAY_MS);
  }

  toggleShowEditToken(): void {
    this.showEditToken.update((v) => !v);
  }

  private loadMasterReleaseSyncSetting(): void {
    this.db.isMasterReleaseSyncEnabled().then((enabled) => {
      this.masterReleaseSyncEnabled.set(enabled);
    });
  }

  toggleMasterReleaseSync(): void {
    const newValue = !this.masterReleaseSyncEnabled();
    this.masterReleaseSyncEnabled.set(newValue);
    this.db.setMasterReleaseSyncEnabled(newValue);
  }
}

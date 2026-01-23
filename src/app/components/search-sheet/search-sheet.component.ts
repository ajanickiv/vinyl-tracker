import { Component, signal, input, output, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { DatabaseService } from '../../services/database.service';
import { Release } from '../../models/release.model';

@Component({
  selector: 'app-search-sheet',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search-sheet.component.html',
  styleUrls: ['./search-sheet.component.scss'],
})
export class SearchSheetComponent implements OnInit, OnDestroy {
  searchQuery = signal('');
  searchResults = signal<Release[]>([]);
  allReleases = signal<Release[]>([]);
  isSearching = signal(false);

  isOpen = input.required<boolean>();
  close = output<void>();
  releaseSelected = output<Release>();

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(private db: DatabaseService) {}

  ngOnInit(): void {
    this.loadAllReleases();
    this.setupSearchDebounce();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onBackdropClick(): void {
    this.closeSheet();
  }

  closeSheet(): void {
    this.searchQuery.set('');
    this.searchResults.set([]);
    this.close.emit();
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
    this.searchSubject.next(value);
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.searchResults.set([]);
  }

  selectRelease(release: Release): void {
    this.releaseSelected.emit(release);
    this.closeSheet();
  }

  private loadAllReleases(): void {
    this.db
      .getAllReleases()
      .then((releases) => {
        this.allReleases.set(releases);
      })
      .catch((error) => {
        console.error('Failed to load releases for search:', error);
      });
  }

  private setupSearchDebounce(): void {
    this.searchSubject
      .pipe(debounceTime(200), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((query) => {
        this.performSearch(query);
      });
  }

  private performSearch(query: string): void {
    if (!query.trim()) {
      this.searchResults.set([]);
      return;
    }

    this.isSearching.set(true);
    const lowerQuery = query.toLowerCase();

    const results = this.allReleases().filter((release) => {
      const titleMatch = release.basicInfo.title.toLowerCase().includes(lowerQuery);
      const artistMatch = release.basicInfo.artists.some((a) =>
        a.toLowerCase().includes(lowerQuery),
      );
      return titleMatch || artistMatch;
    });

    // Sort by relevance: exact matches first, then partial matches
    results.sort((a, b) => {
      const aTitle = a.basicInfo.title.toLowerCase();
      const bTitle = b.basicInfo.title.toLowerCase();
      const aArtist = a.basicInfo.artists.join(' ').toLowerCase();
      const bArtist = b.basicInfo.artists.join(' ').toLowerCase();

      // Exact title match gets priority
      const aExactTitle = aTitle === lowerQuery;
      const bExactTitle = bTitle === lowerQuery;
      if (aExactTitle && !bExactTitle) return -1;
      if (bExactTitle && !aExactTitle) return 1;

      // Title starts with query
      const aStartsTitle = aTitle.startsWith(lowerQuery);
      const bStartsTitle = bTitle.startsWith(lowerQuery);
      if (aStartsTitle && !bStartsTitle) return -1;
      if (bStartsTitle && !aStartsTitle) return 1;

      // Artist starts with query
      const aStartsArtist = aArtist.startsWith(lowerQuery);
      const bStartsArtist = bArtist.startsWith(lowerQuery);
      if (aStartsArtist && !bStartsArtist) return -1;
      if (bStartsArtist && !aStartsArtist) return 1;

      // Alphabetical by artist then title
      const artistCompare = aArtist.localeCompare(bArtist);
      if (artistCompare !== 0) return artistCompare;
      return aTitle.localeCompare(bTitle);
    });

    this.searchResults.set(results.slice(0, 20)); // Limit results
    this.isSearching.set(false);
  }
}

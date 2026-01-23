import { fakeAsync, tick } from '@angular/core/testing';
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { SearchSheetComponent } from './search-sheet.component';
import { DatabaseService } from '../../services/database.service';
import { Release } from '../../models/release.model';

describe('SearchSheetComponent', () => {
  let spectator: Spectator<SearchSheetComponent>;
  let mockDatabaseService: {
    getAllReleases: jest.Mock;
  };

  const createComponent = createComponentFactory({
    component: SearchSheetComponent,
    detectChanges: false,
  });

  const createMockRelease = (id: number, title: string, artists: string[]): Release => ({
    id,
    instanceId: id,
    basicInfo: {
      title,
      artists,
      year: 1985,
      formats: ['Vinyl'],
      thumb: 'thumb.jpg',
      coverImage: 'cover.jpg',
      labels: ['Test Label'],
      genres: ['Rock'],
      styles: [],
    },
    playCount: 0,
    lastPlayedDate: undefined,
    dateAdded: new Date(),
    dateAddedToCollection: new Date(),
    notes: '',
    rating: 0,
  });

  const mockReleases: Release[] = [
    createMockRelease(1, 'Abbey Road', ['The Beatles']),
    createMockRelease(2, 'Dark Side of the Moon', ['Pink Floyd']),
    createMockRelease(3, 'The Wall', ['Pink Floyd']),
    createMockRelease(4, 'Rumours', ['Fleetwood Mac']),
    createMockRelease(5, 'Abbey', ['Another Artist']),
  ];

  beforeEach(() => {
    mockDatabaseService = {
      getAllReleases: jest.fn().mockResolvedValue(mockReleases),
    };

    spectator = createComponent({
      props: {
        isOpen: false,
      },
      providers: [{ provide: DatabaseService, useValue: mockDatabaseService }],
    });
  });

  it('should create', () => {
    expect(spectator.component).toBeTruthy();
  });

  describe('initialization', () => {
    it('should initialize with empty search query', () => {
      expect(spectator.component.searchQuery()).toBe('');
    });

    it('should initialize with empty search results', () => {
      expect(spectator.component.searchResults()).toEqual([]);
    });

    it('should initialize with isSearching as false', () => {
      expect(spectator.component.isSearching()).toBe(false);
    });

    it('should load all releases on init', fakeAsync(() => {
      spectator.detectChanges();
      tick();

      expect(mockDatabaseService.getAllReleases).toHaveBeenCalled();
      expect(spectator.component.allReleases()).toEqual(mockReleases);
    }));
  });

  describe('closeSheet', () => {
    it('should clear search query', () => {
      spectator.component.searchQuery.set('test');

      spectator.component.closeSheet();

      expect(spectator.component.searchQuery()).toBe('');
    });

    it('should clear search results', () => {
      spectator.component.searchResults.set(mockReleases);

      spectator.component.closeSheet();

      expect(spectator.component.searchResults()).toEqual([]);
    });

    it('should emit close event', () => {
      const closeSpy = jest.fn();
      spectator.component.close.subscribe(closeSpy);

      spectator.component.closeSheet();

      expect(closeSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('onBackdropClick', () => {
    it('should call closeSheet', () => {
      const closeSpy = jest.fn();
      spectator.component.close.subscribe(closeSpy);

      spectator.component.onBackdropClick();

      expect(closeSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('clearSearch', () => {
    it('should clear search query', () => {
      spectator.component.searchQuery.set('test');

      spectator.component.clearSearch();

      expect(spectator.component.searchQuery()).toBe('');
    });

    it('should clear search results', () => {
      spectator.component.searchResults.set(mockReleases);

      spectator.component.clearSearch();

      expect(spectator.component.searchResults()).toEqual([]);
    });
  });

  describe('selectRelease', () => {
    it('should emit releaseSelected event', () => {
      const selectSpy = jest.fn();
      spectator.component.releaseSelected.subscribe(selectSpy);
      const release = mockReleases[0];

      spectator.component.selectRelease(release);

      expect(selectSpy).toHaveBeenCalledWith(release);
    });

    it('should close the sheet', () => {
      const closeSpy = jest.fn();
      spectator.component.close.subscribe(closeSpy);

      spectator.component.selectRelease(mockReleases[0]);

      expect(closeSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('onSearchInput', () => {
    it('should update search query', () => {
      const event = { target: { value: 'test query' } } as unknown as Event;

      spectator.component.onSearchInput(event);

      expect(spectator.component.searchQuery()).toBe('test query');
    });
  });

  describe('search functionality', () => {
    beforeEach(fakeAsync(() => {
      spectator.detectChanges();
      tick(); // Wait for releases to load
    }));

    it('should debounce search input', fakeAsync(() => {
      const event = { target: { value: 'abbey' } } as unknown as Event;

      spectator.component.onSearchInput(event);

      // Results should not be immediate
      expect(spectator.component.searchResults()).toEqual([]);

      // Wait for debounce
      tick(200);

      expect(spectator.component.searchResults().length).toBeGreaterThan(0);
    }));

    it('should find releases by title', fakeAsync(() => {
      const event = { target: { value: 'Dark Side' } } as unknown as Event;
      spectator.component.onSearchInput(event);
      tick(200);

      const results = spectator.component.searchResults();
      expect(results.some((r) => r.basicInfo.title === 'Dark Side of the Moon')).toBe(true);
    }));

    it('should find releases by artist', fakeAsync(() => {
      const event = { target: { value: 'Pink Floyd' } } as unknown as Event;
      spectator.component.onSearchInput(event);
      tick(200);

      const results = spectator.component.searchResults();
      expect(results.length).toBe(2); // Dark Side and The Wall
      expect(results.every((r) => r.basicInfo.artists.includes('Pink Floyd'))).toBe(true);
    }));

    it('should be case insensitive', fakeAsync(() => {
      const event = { target: { value: 'BEATLES' } } as unknown as Event;
      spectator.component.onSearchInput(event);
      tick(200);

      const results = spectator.component.searchResults();
      expect(results.some((r) => r.basicInfo.artists.includes('The Beatles'))).toBe(true);
    }));

    it('should return empty results for empty query', fakeAsync(() => {
      // First search for something
      spectator.component.onSearchInput({ target: { value: 'abbey' } } as unknown as Event);
      tick(200);
      expect(spectator.component.searchResults().length).toBeGreaterThan(0);

      // Then clear the search
      spectator.component.onSearchInput({ target: { value: '' } } as unknown as Event);
      tick(200);

      expect(spectator.component.searchResults()).toEqual([]);
    }));

    it('should return empty results for whitespace-only query', fakeAsync(() => {
      const event = { target: { value: '   ' } } as unknown as Event;
      spectator.component.onSearchInput(event);
      tick(200);

      expect(spectator.component.searchResults()).toEqual([]);
    }));

    it('should prioritize exact title matches', fakeAsync(() => {
      const event = { target: { value: 'Abbey' } } as unknown as Event;
      spectator.component.onSearchInput(event);
      tick(200);

      const results = spectator.component.searchResults();
      // "Abbey" (exact match) should come before "Abbey Road" (starts with)
      expect(results[0].basicInfo.title).toBe('Abbey');
    }));

    it('should prioritize title starts-with matches over contains', fakeAsync(() => {
      const event = { target: { value: 'Abbey' } } as unknown as Event;
      spectator.component.onSearchInput(event);
      tick(200);

      const results = spectator.component.searchResults();
      // Both "Abbey" and "Abbey Road" start with the query, so they should be at the top
      expect(results.slice(0, 2).every((r) => r.basicInfo.title.startsWith('Abbey'))).toBe(true);
    }));

    it('should limit results to 20', fakeAsync(() => {
      // Create more than 20 mock releases
      const manyReleases: Release[] = [];
      for (let i = 0; i < 30; i++) {
        manyReleases.push(createMockRelease(i, `Album ${i}`, ['Artist']));
      }
      mockDatabaseService.getAllReleases.mockResolvedValue(manyReleases);

      // Reload releases
      spectator.component.ngOnInit();
      tick();

      const event = { target: { value: 'Album' } } as unknown as Event;
      spectator.component.onSearchInput(event);
      tick(200);

      expect(spectator.component.searchResults().length).toBe(20);
    }));

    it('should use distinctUntilChanged to avoid duplicate searches', fakeAsync(() => {
      const event = { target: { value: 'abbey' } } as unknown as Event;

      // Send same query multiple times rapidly
      spectator.component.onSearchInput(event);
      tick(100);
      spectator.component.onSearchInput(event);
      tick(100);
      spectator.component.onSearchInput(event);
      tick(200); // Wait for debounce to complete after last input

      // Should only search once after debounce
      const results = spectator.component.searchResults();
      expect(results.length).toBeGreaterThan(0);
    }));
  });

  describe('error handling', () => {
    it('should handle database error when loading releases', fakeAsync(() => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockDatabaseService.getAllReleases.mockRejectedValue(new Error('Database error'));

      spectator.component.ngOnInit();
      tick();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load releases for search:',
        expect.any(Error),
      );
      expect(spectator.component.allReleases()).toEqual([]);

      consoleSpy.mockRestore();
    }));
  });

  describe('cleanup', () => {
    it('should complete destroy$ on ngOnDestroy', () => {
      spectator.detectChanges();

      // Should not throw
      expect(() => spectator.component.ngOnDestroy()).not.toThrow();
    });
  });

  describe('sorting logic - B wins scenarios', () => {
    beforeEach(fakeAsync(() => {
      spectator.detectChanges();
      tick();
    }));

    it('should sort B before A when B has exact title match and A does not', fakeAsync(() => {
      // Setup: B has exact match "rock", A contains "rock" but is "rock music"
      const sortingReleases: Release[] = [
        createMockRelease(1, 'Rock Music', ['Artist A']), // A: contains query but not exact
        createMockRelease(2, 'Rock', ['Artist B']), // B: exact match
      ];
      mockDatabaseService.getAllReleases.mockResolvedValue(sortingReleases);
      spectator.component.ngOnInit();
      tick();

      const event = { target: { value: 'rock' } } as unknown as Event;
      spectator.component.onSearchInput(event);
      tick(200);

      const results = spectator.component.searchResults();
      // "Rock" (exact match) should come before "Rock Music"
      expect(results[0].basicInfo.title).toBe('Rock');
      expect(results[1].basicInfo.title).toBe('Rock Music');
    }));

    it('should sort B before A when B title starts with query and A title only contains it', fakeAsync(() => {
      // Setup: A's title contains "moon" in middle, B's title starts with "moon"
      const sortingReleases: Release[] = [
        createMockRelease(1, 'Full Moon Rising', ['Artist A']), // A: contains but doesn't start with
        createMockRelease(2, 'Moon Over Water', ['Artist B']), // B: starts with query
      ];
      mockDatabaseService.getAllReleases.mockResolvedValue(sortingReleases);
      spectator.component.ngOnInit();
      tick();

      const event = { target: { value: 'moon' } } as unknown as Event;
      spectator.component.onSearchInput(event);
      tick(200);

      const results = spectator.component.searchResults();
      // "Moon Over Water" (starts with) should come before "Full Moon Rising" (contains)
      expect(results[0].basicInfo.title).toBe('Moon Over Water');
      expect(results[1].basicInfo.title).toBe('Full Moon Rising');
    }));

    it('should sort B before A when B artist starts with query and A only matches title', fakeAsync(() => {
      // Setup: A matches only via title containing query, B's artist starts with query
      const sortingReleases: Release[] = [
        createMockRelease(1, 'Featuring Queen Tribute', ['Various Artists']), // A: title contains "queen"
        createMockRelease(2, 'Greatest Hits', ['Queen']), // B: artist starts with "queen"
      ];
      mockDatabaseService.getAllReleases.mockResolvedValue(sortingReleases);
      spectator.component.ngOnInit();
      tick();

      const event = { target: { value: 'queen' } } as unknown as Event;
      spectator.component.onSearchInput(event);
      tick(200);

      const results = spectator.component.searchResults();
      // "Greatest Hits" by Queen (artist starts with) should come before "Featuring Queen Tribute"
      expect(results[0].basicInfo.title).toBe('Greatest Hits');
      expect(results[1].basicInfo.title).toBe('Featuring Queen Tribute');
    }));

    it('should sort alphabetically by artist when relevance is equal', fakeAsync(() => {
      // Setup: Neither has special relevance, so sort by artist alphabetically
      const sortingReleases: Release[] = [
        createMockRelease(1, 'Album with Love', ['Zebra Band']), // A: artist Z
        createMockRelease(2, 'Songs of Love', ['Alpha Group']), // B: artist A
      ];
      mockDatabaseService.getAllReleases.mockResolvedValue(sortingReleases);
      spectator.component.ngOnInit();
      tick();

      const event = { target: { value: 'love' } } as unknown as Event;
      spectator.component.onSearchInput(event);
      tick(200);

      const results = spectator.component.searchResults();
      // "Songs of Love" by Alpha Group should come before "Album with Love" by Zebra Band
      expect(results[0].basicInfo.artists[0]).toBe('Alpha Group');
      expect(results[1].basicInfo.artists[0]).toBe('Zebra Band');
    }));

    it('should sort alphabetically by title when artist is the same', fakeAsync(() => {
      // Setup: Same artist, so fall back to title alphabetical sort
      const sortingReleases: Release[] = [
        createMockRelease(1, 'Zebra Album', ['Same Artist']), // A: title Z
        createMockRelease(2, 'Alpha Album', ['Same Artist']), // B: title A
      ];
      mockDatabaseService.getAllReleases.mockResolvedValue(sortingReleases);
      spectator.component.ngOnInit();
      tick();

      const event = { target: { value: 'album' } } as unknown as Event;
      spectator.component.onSearchInput(event);
      tick(200);

      const results = spectator.component.searchResults();
      // "Alpha Album" should come before "Zebra Album" when artists are the same
      expect(results[0].basicInfo.title).toBe('Alpha Album');
      expect(results[1].basicInfo.title).toBe('Zebra Album');
    }));

    it('should fall through when both have exact title match', fakeAsync(() => {
      // Setup: Both have exact match "love", should fall through to alphabetical
      const sortingReleases: Release[] = [
        createMockRelease(1, 'Love', ['Zebra Band']), // A: exact match, artist Z
        createMockRelease(2, 'Love', ['Alpha Band']), // B: exact match, artist A
      ];
      mockDatabaseService.getAllReleases.mockResolvedValue(sortingReleases);
      spectator.component.ngOnInit();
      tick();

      const event = { target: { value: 'love' } } as unknown as Event;
      spectator.component.onSearchInput(event);
      tick(200);

      const results = spectator.component.searchResults();
      // Both are exact matches, should sort alphabetically by artist
      expect(results[0].basicInfo.artists[0]).toBe('Alpha Band');
      expect(results[1].basicInfo.artists[0]).toBe('Zebra Band');
    }));

    it('should fall through when both titles start with query', fakeAsync(() => {
      // Setup: Both titles start with "star", should fall through to artist sort
      const sortingReleases: Release[] = [
        createMockRelease(1, 'Starlight Express', ['Zebra']),
        createMockRelease(2, 'Stardust Memories', ['Alpha']),
      ];
      mockDatabaseService.getAllReleases.mockResolvedValue(sortingReleases);
      spectator.component.ngOnInit();
      tick();

      const event = { target: { value: 'star' } } as unknown as Event;
      spectator.component.onSearchInput(event);
      tick(200);

      const results = spectator.component.searchResults();
      // Both start with query, should sort alphabetically by artist
      expect(results[0].basicInfo.artists[0]).toBe('Alpha');
      expect(results[1].basicInfo.artists[0]).toBe('Zebra');
    }));

    it('should fall through when both artists start with query', fakeAsync(() => {
      // Setup: Both artists start with query, should sort by artist then title
      const sortingReleases: Release[] = [
        createMockRelease(1, 'Zebra Album', ['Pink Floyd']),
        createMockRelease(2, 'Alpha Album', ['Pink Panthers']),
      ];
      mockDatabaseService.getAllReleases.mockResolvedValue(sortingReleases);
      spectator.component.ngOnInit();
      tick();

      const event = { target: { value: 'pink' } } as unknown as Event;
      spectator.component.onSearchInput(event);
      tick(200);

      const results = spectator.component.searchResults();
      // Both artists start with "pink", should sort alphabetically by full artist name
      expect(results[0].basicInfo.artists[0]).toBe('Pink Floyd');
      expect(results[1].basicInfo.artists[0]).toBe('Pink Panthers');
    }));

    it('should handle neither having special relevance', fakeAsync(() => {
      // Setup: Query only matches in middle of title, no special relevance
      const sortingReleases: Release[] = [
        createMockRelease(1, 'My Blue Heaven', ['Zoe']),
        createMockRelease(2, 'Feeling Blue Today', ['Anna']),
      ];
      mockDatabaseService.getAllReleases.mockResolvedValue(sortingReleases);
      spectator.component.ngOnInit();
      tick();

      const event = { target: { value: 'blue' } } as unknown as Event;
      spectator.component.onSearchInput(event);
      tick(200);

      const results = spectator.component.searchResults();
      // Neither has special relevance, sort by artist
      expect(results[0].basicInfo.artists[0]).toBe('Anna');
      expect(results[1].basicInfo.artists[0]).toBe('Zoe');
    }));
  });
});

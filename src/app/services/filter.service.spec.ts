import { TestBed } from '@angular/core/testing';
import { FilterService } from './filter.service';
import { DEFAULT_FILTERS } from '../models/filter.model';
import { Release } from '../models/release.model';

describe('FilterService', () => {
  let service: FilterService;

  const createMockRelease = (overrides: Partial<Release> = {}): Release => ({
    id: 1,
    instanceId: 1,
    basicInfo: {
      title: 'Test Album',
      artists: ['Test Artist'],
      year: 1985,
      formats: ['Vinyl', 'LP'],
      thumb: '',
      coverImage: '',
      labels: [],
      genres: ['Rock'],
      styles: [],
    },
    playCount: 0,
    lastPlayedDate: undefined,
    dateAdded: new Date(),
    dateAddedToCollection: new Date(),
    notes: '',
    rating: 0,
    ...overrides,
  });

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(FilterService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initialization', () => {
    it('should initialize with default filters', () => {
      expect(service.filters()).toEqual(DEFAULT_FILTERS);
    });

    it('should load filters from localStorage if available', () => {
      const storedFilters = {
        excludeBoxSets: false,
        genres: ['Jazz'],
        decades: ['1970s'],
      };
      localStorage.setItem('vinyl-tracker-filters', JSON.stringify(storedFilters));

      // Create a new service instance to test loading
      const newService = new FilterService();

      expect(newService.filters().excludeBoxSets).toBe(false);
      expect(newService.filters().genres).toEqual(['Jazz']);
      expect(newService.filters().decades).toEqual(['1970s']);
    });

    it('should handle invalid localStorage data gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      localStorage.setItem('vinyl-tracker-filters', 'invalid json');

      const newService = new FilterService();

      expect(newService.filters()).toEqual(DEFAULT_FILTERS);
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load filters:', expect.any(SyntaxError));
      consoleSpy.mockRestore();
    });
  });

  describe('hasActiveFilters', () => {
    it('should return true when excludeBoxSets is enabled', () => {
      service.setExcludeBoxSets(true);

      expect(service.hasActiveFilters()).toBe(true);
    });

    it('should return true when genres are selected', () => {
      service.setExcludeBoxSets(false);
      service.setGenres(['Rock']);

      expect(service.hasActiveFilters()).toBe(true);
    });

    it('should return true when decades are selected', () => {
      service.setExcludeBoxSets(false);
      service.setDecades(['1980s']);

      expect(service.hasActiveFilters()).toBe(true);
    });

    it('should return false when no filters are active', () => {
      service.setExcludeBoxSets(false);
      service.setGenres([]);
      service.setDecades([]);

      expect(service.hasActiveFilters()).toBe(false);
    });
  });

  describe('matchesFilters', () => {
    describe('box set filter', () => {
      it('should exclude releases with "box set" in formats when enabled', () => {
        service.setExcludeBoxSets(true);
        const boxSetRelease = createMockRelease({
          basicInfo: {
            title: 'Box Set Album',
            artists: ['Artist'],
            year: 1990,
            formats: ['Vinyl', 'Box Set'],
            thumb: '',
            coverImage: '',
            labels: [],
            genres: ['Rock'],
            styles: [],
          },
        });

        expect(service.matchesFilters(boxSetRelease)).toBe(false);
      });

      it('should be case insensitive for box set detection', () => {
        service.setExcludeBoxSets(true);
        const boxSetRelease = createMockRelease({
          basicInfo: {
            title: 'Album',
            artists: ['Artist'],
            year: 1990,
            formats: ['Vinyl', 'BOX SET'],
            thumb: '',
            coverImage: '',
            labels: [],
            genres: ['Rock'],
            styles: [],
          },
        });

        expect(service.matchesFilters(boxSetRelease)).toBe(false);
      });

      it('should include non-box set releases when filter enabled', () => {
        service.setExcludeBoxSets(true);
        const normalRelease = createMockRelease();

        expect(service.matchesFilters(normalRelease)).toBe(true);
      });

      it('should include box sets when filter is disabled', () => {
        service.setExcludeBoxSets(false);
        const boxSetRelease = createMockRelease({
          basicInfo: {
            title: 'Album',
            artists: ['Artist'],
            year: 1990,
            formats: ['Vinyl', 'Box Set'],
            thumb: '',
            coverImage: '',
            labels: [],
            genres: ['Rock'],
            styles: [],
          },
        });

        expect(service.matchesFilters(boxSetRelease)).toBe(true);
      });

      it('should handle releases with undefined formats', () => {
        service.setExcludeBoxSets(true);
        const release = createMockRelease({
          basicInfo: {
            title: 'Album',
            artists: ['Artist'],
            year: 1990,
            formats: undefined as unknown as string[],
            thumb: '',
            coverImage: '',
            labels: [],
            genres: ['Rock'],
            styles: [],
          },
        });

        expect(service.matchesFilters(release)).toBe(true);
      });
    });

    describe('genre filter', () => {
      it('should match release when its genre is in selected genres', () => {
        service.setExcludeBoxSets(false);
        service.setGenres(['Rock']);
        const release = createMockRelease();

        expect(service.matchesFilters(release)).toBe(true);
      });

      it('should not match release when its genre is not in selected genres', () => {
        service.setExcludeBoxSets(false);
        service.setGenres(['Jazz']);
        const release = createMockRelease();

        expect(service.matchesFilters(release)).toBe(false);
      });

      it('should match if any release genre matches any selected genre', () => {
        service.setExcludeBoxSets(false);
        service.setGenres(['Jazz', 'Rock', 'Electronic']);
        const release = createMockRelease({
          basicInfo: {
            title: 'Album',
            artists: ['Artist'],
            year: 1990,
            formats: ['Vinyl'],
            thumb: '',
            coverImage: '',
            labels: [],
            genres: ['Rock', 'Pop'],
            styles: [],
          },
        });

        expect(service.matchesFilters(release)).toBe(true);
      });

      it('should pass all releases when no genres selected', () => {
        service.setExcludeBoxSets(false);
        service.setGenres([]);
        const release = createMockRelease();

        expect(service.matchesFilters(release)).toBe(true);
      });

      it('should handle releases with no genres', () => {
        service.setExcludeBoxSets(false);
        service.setGenres(['Rock']);
        const release = createMockRelease({
          basicInfo: {
            title: 'Album',
            artists: ['Artist'],
            year: 1990,
            formats: ['Vinyl'],
            thumb: '',
            coverImage: '',
            labels: [],
            genres: [],
            styles: [],
          },
        });

        expect(service.matchesFilters(release)).toBe(false);
      });
    });

    describe('decade filter', () => {
      it('should match release when its decade is selected', () => {
        service.setExcludeBoxSets(false);
        service.setDecades(['1980s']);
        const release = createMockRelease({
          basicInfo: { ...createMockRelease().basicInfo, year: 1985 },
        });

        expect(service.matchesFilters(release)).toBe(true);
      });

      it('should not match release when its decade is not selected', () => {
        service.setExcludeBoxSets(false);
        service.setDecades(['1990s']);
        const release = createMockRelease({
          basicInfo: { ...createMockRelease().basicInfo, year: 1985 },
        });

        expect(service.matchesFilters(release)).toBe(false);
      });

      it('should pass all releases when no decades selected', () => {
        service.setExcludeBoxSets(false);
        service.setDecades([]);
        const release = createMockRelease();

        expect(service.matchesFilters(release)).toBe(true);
      });

      it('should not match releases without a year when decades are selected', () => {
        service.setExcludeBoxSets(false);
        service.setDecades(['1980s']);
        const release = createMockRelease({
          basicInfo: {
            title: 'Album',
            artists: ['Artist'],
            year: 0,
            formats: ['Vinyl'],
            thumb: '',
            coverImage: '',
            labels: [],
            genres: ['Rock'],
            styles: [],
          },
        });

        expect(service.matchesFilters(release)).toBe(false);
      });

      it('should correctly calculate decade for edge years', () => {
        service.setExcludeBoxSets(false);
        service.setDecades(['1980s']);

        const release1980 = createMockRelease({
          basicInfo: { ...createMockRelease().basicInfo, year: 1980 },
        });
        const release1989 = createMockRelease({
          basicInfo: { ...createMockRelease().basicInfo, year: 1989 },
        });
        const release1990 = createMockRelease({
          basicInfo: { ...createMockRelease().basicInfo, year: 1990 },
        });

        expect(service.matchesFilters(release1980)).toBe(true);
        expect(service.matchesFilters(release1989)).toBe(true);
        expect(service.matchesFilters(release1990)).toBe(false);
      });
    });

    describe('combined filters', () => {
      it('should require all filters to pass', () => {
        service.setExcludeBoxSets(true);
        service.setGenres(['Rock']);
        service.setDecades(['1980s']);

        const matchingRelease = createMockRelease();

        expect(service.matchesFilters(matchingRelease)).toBe(true);
      });

      it('should fail if box set filter fails', () => {
        service.setExcludeBoxSets(true);
        service.setGenres(['Rock']);
        service.setDecades(['1980s']);

        const boxSet = createMockRelease({
          basicInfo: {
            title: 'Album',
            artists: ['Artist'],
            year: 1985,
            formats: ['Vinyl', 'Box Set'],
            thumb: '',
            coverImage: '',
            labels: [],
            genres: ['Rock'],
            styles: [],
          },
        });

        expect(service.matchesFilters(boxSet)).toBe(false);
      });

      it('should fail if genre filter fails', () => {
        service.setExcludeBoxSets(false);
        service.setGenres(['Jazz']);
        service.setDecades(['1980s']);

        const release = createMockRelease();

        expect(service.matchesFilters(release)).toBe(false);
      });

      it('should fail if decade filter fails', () => {
        service.setExcludeBoxSets(false);
        service.setGenres(['Rock']);
        service.setDecades(['1970s']);

        const release = createMockRelease();

        expect(service.matchesFilters(release)).toBe(false);
      });
    });
  });

  describe('setExcludeBoxSets', () => {
    it('should update the excludeBoxSets filter', () => {
      service.setExcludeBoxSets(false);
      expect(service.filters().excludeBoxSets).toBe(false);

      service.setExcludeBoxSets(true);
      expect(service.filters().excludeBoxSets).toBe(true);
    });

    it('should persist to localStorage', () => {
      service.setExcludeBoxSets(false);

      const stored = JSON.parse(localStorage.getItem('vinyl-tracker-filters')!);
      expect(stored.excludeBoxSets).toBe(false);
    });
  });

  describe('setGenres', () => {
    it('should update the genres filter', () => {
      service.setGenres(['Rock', 'Jazz']);

      expect(service.filters().genres).toEqual(['Rock', 'Jazz']);
    });

    it('should persist to localStorage', () => {
      service.setGenres(['Electronic']);

      const stored = JSON.parse(localStorage.getItem('vinyl-tracker-filters')!);
      expect(stored.genres).toEqual(['Electronic']);
    });
  });

  describe('setDecades', () => {
    it('should update the decades filter', () => {
      service.setDecades(['1970s', '1980s']);

      expect(service.filters().decades).toEqual(['1970s', '1980s']);
    });

    it('should persist to localStorage', () => {
      service.setDecades(['1990s']);

      const stored = JSON.parse(localStorage.getItem('vinyl-tracker-filters')!);
      expect(stored.decades).toEqual(['1990s']);
    });
  });

  describe('toggleGenre', () => {
    it('should add genre if not present', () => {
      service.setGenres([]);

      service.toggleGenre('Rock');

      expect(service.filters().genres).toEqual(['Rock']);
    });

    it('should remove genre if already present', () => {
      service.setGenres(['Rock', 'Jazz']);

      service.toggleGenre('Rock');

      expect(service.filters().genres).toEqual(['Jazz']);
    });
  });

  describe('toggleDecade', () => {
    it('should add decade if not present', () => {
      service.setDecades([]);

      service.toggleDecade('1980s');

      expect(service.filters().decades).toEqual(['1980s']);
    });

    it('should remove decade if already present', () => {
      service.setDecades(['1980s', '1990s']);

      service.toggleDecade('1980s');

      expect(service.filters().decades).toEqual(['1990s']);
    });
  });

  describe('resetFilters', () => {
    it('should reset all filters to defaults', () => {
      service.setExcludeBoxSets(false);
      service.setGenres(['Rock', 'Jazz']);
      service.setDecades(['1980s']);

      service.resetFilters();

      expect(service.filters()).toEqual(DEFAULT_FILTERS);
    });

    it('should persist reset to localStorage', () => {
      service.setGenres(['Rock']);
      service.resetFilters();

      const stored = JSON.parse(localStorage.getItem('vinyl-tracker-filters')!);
      expect(stored).toEqual(DEFAULT_FILTERS);
    });
  });
});

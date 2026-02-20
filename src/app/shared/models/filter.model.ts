export interface RecommendationFilters {
  excludeBoxSets: boolean;
  genres: string[];
  decades: string[];
  originalDecades: string[];
  notPlayedIn6Months: boolean;
  vinylSizes: string[];
}

export const DEFAULT_FILTERS: RecommendationFilters = {
  excludeBoxSets: true,
  genres: [],
  decades: [],
  originalDecades: [],
  notPlayedIn6Months: false,
  vinylSizes: [],
};

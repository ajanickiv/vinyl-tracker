export interface RecommendationFilters {
  excludeBoxSets: boolean;
  genres: string[];
  decades: string[];
}

export const DEFAULT_FILTERS: RecommendationFilters = {
  excludeBoxSets: true,
  genres: [],
  decades: [],
};

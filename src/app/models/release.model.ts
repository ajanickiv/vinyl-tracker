export interface Release {
  id: number;              // Discogs release ID (primary key)
  instanceId: number;      // Discogs collection instance ID
  basicInfo: {
    title: string;
    artists: string[];
    year?: number;
    formats: string[];
    thumb?: string;
    coverImage?: string;
    labels?: string[];
    genres?: string[];
    styles?: string[];
  };

  // Tracking data
  playCount: number;
  lastPlayedDate?: Date;
  dateAdded: Date;

  // Discogs metadata
  dateAddedToCollection?: Date;
  notes?: string;
  rating?: number;
}

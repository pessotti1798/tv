export interface Episode {
  id: string;
  showId: string;
  showTitle: string;
  network: string;
  seasonNumber: number;
  episodeNumber: number;
  code: string; // e.g. "S04E03"
  title: string;
  runtime: number; // in minutes
  airDate: string;
  overview: string;
  stillUrl: string;
  backdropUrl: string;
  averageRating: number;
  director?: string;
  guestStars?: string[];
}

export interface SeasonInfo {
  seasonNumber: number;
  name: string;
  episodeCount: number;
  overview?: string;
  posterUrl?: string;
  airDate?: string;
  episodes?: Episode[];
}

export interface Show {
  id: string;
  tmdbId?: number;
  title: string;
  network: string;
  firstAirYear: string;
  posterUrl: string;
  backdropUrl: string;
  overview: string;
  totalSeasons: number;
  totalEpisodes: number;
  currentEpisode: Episode;
  progressText: string;
  progressPercent: number;
  completed?: boolean;
  seasons?: SeasonInfo[];
}

export interface WatchLog {
  id: string;
  episodeId: string;
  showId: string;
  showTitle: string;
  episodeCode: string;
  episodeTitle: string;
  posterUrl: string;
  watchedAt: string;
  rating?: number; // 0.5 to 5.0
  reviewText?: string;
  hasSpoilers?: boolean;
  isRewatch?: boolean;
}

export interface Review {
  id: string;
  episodeId: string;
  userName: string;
  userAvatar: string;
  userHandle: string;
  rating: number;
  content: string;
  hasSpoilers: boolean;
  createdAt: string;
  likesCount: number;
  userLiked?: boolean;
}

export interface UserProfile {
  name: string;
  handle: string;
  avatarUrl: string;
  bio: string;
  memberSince: string;
  totalMinutesWatched: number;
  totalEpisodesWatched: number;
  totalShowsCompleted: number;
  favoriteShowIds: string[];
}

export interface ListItem {
  id: string;
  title: string;
  posterUrl: string;
  subtitle?: string;
}

export interface UserList {
  id: string;
  title: string;
  description: string;
  authorName: string;
  itemType: "shows" | "episodes";
  items: ListItem[];
  likesCount: number;
  userLiked?: boolean;
  createdAt: string;
}

/** Item de busca/tendências do TMDB, antes de virar uma `Show` completa. */
export interface ShowSearchResult {
  id: string;
  tmdbId: number;
  title: string;
  firstAirYear: string;
  posterUrl: string;
  backdropUrl: string;
  overview: string;
  voteAverage: number;
}

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
  seasons?: SeasonInfo[];
  /** Duração típica de um episódio, em minutos (usada quando o episódio não tem a sua). */
  runtime?: number;
  /**
   * Episódio escolhido em "Focar no Radar". O próximo episódio passa a ser o
   * primeiro não visto a partir dele. Ausente = segue o último episódio visto.
   */
  focusEpisodeId?: string;
  /** Última atualização da lista de temporadas pelo TMDB (ISO 8601). */
  syncedAt?: string;
}

/**
 * Série como a interface usa: os dados salvos (`Show`) mais o que é calculado
 * a partir dos episódios vistos. Nada daqui é salvo.
 */
export interface TrackedShow extends Show {
  /** Próximo episódio a assistir (ou o último, se a série foi concluída). */
  currentEpisode: Episode;
  completed: boolean;
  watchedCount: number;
  progressPercent: number;
  progressText: string;
}

export interface WatchLog {
  id: string;
  episodeId: string;
  showId: string;
  showTitle: string;
  episodeCode: string;
  episodeTitle: string;
  posterUrl: string;
  watchedAt: string; // data local no formato YYYY-MM-DD
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
  /** Data de estreia (YYYY-MM-DD), quando o TMDB informa. */
  firstAirDate?: string;
  posterUrl: string;
  backdropUrl: string;
  overview: string;
  voteAverage: number;
  /** Quantidade de votos no TMDB. */
  voteCount?: number;
}

/** Como registrar uma sessão no diário (opções da ficha do episódio). */
export interface DiaryLogOptions {
  /** Cria um registro no diário. */
  save: boolean;
  /** Marca o registro como rewatch. */
  isRewatch: boolean;
  /** Data em que assistiu, YYYY-MM-DD. */
  date: string;
}

/** Informações extras da série (notas externas e onde assistir). */
export interface SeriesExtras {
  imdbId: string | null;
  imdbRating: string | null;
  metascore: string | null;
  tmdbRating: number | null;
  /** Serviços de streaming por assinatura no Brasil (TMDB / JustWatch). */
  providers: { name: string; logoUrl: string }[];
  /** Página do TMDB com as opções de onde assistir. */
  providersLink: string | null;
  /** false quando OMDB_API_KEY não está configurada (sem notas de IMDb/Metacritic). */
  omdbConfigured: boolean;
  /** Situação no TMDB, ex.: "Returning Series", "Ended", "Canceled". */
  status: string;
  /** Próximo episódio a ser lançado, segundo o TMDB (null se nenhum anunciado). */
  nextAirEpisode: { code: string; title: string; airDate: string | null } | null;
}

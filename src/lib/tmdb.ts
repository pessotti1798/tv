import { Show, Episode, SeasonInfo, SeriesExtras, ShowSearchResult } from "@/types";
import { episodeCode, makeEpisodeId } from "./episodes";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";
const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=500&auto=format&fit=crop&q=80";
const DEFAULT_RUNTIME = 50;

// ---------------------------------------------------------------------------
// Formato das respostas do TMDB (apenas os campos usados aqui)
// ---------------------------------------------------------------------------

interface TMDBShowListItem {
  id: number;
  name?: string;
  original_name?: string;
  first_air_date?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  overview?: string;
  vote_average?: number;
  vote_count?: number;
}

interface TMDBEpisode {
  episode_number: number;
  season_number: number;
  name?: string;
  runtime?: number | null;
  air_date?: string | null;
  overview?: string;
  still_path?: string | null;
  vote_average?: number;
  crew?: { job?: string; name: string }[];
  guest_stars?: { name: string }[];
}

interface TMDBSeason {
  name?: string;
  overview?: string;
  poster_path?: string | null;
  air_date?: string | null;
  episodes?: TMDBEpisode[];
}

interface TMDBSeasonSummary {
  season_number: number;
  name?: string;
  episode_count?: number;
  overview?: string;
  poster_path?: string | null;
  air_date?: string | null;
}

interface TMDBShowDetails extends TMDBShowListItem {
  name: string;
  status?: string;
  networks?: { name: string }[];
  number_of_seasons?: number;
  number_of_episodes?: number;
  episode_run_time?: number[];
  seasons?: TMDBSeasonSummary[];
  next_episode_to_air?: TMDBEpisode | null;
  last_episode_to_air?: TMDBEpisode | null;
}

interface TMDBPaged<T> {
  results?: T[];
  page?: number;
  total_pages?: number;
}

// ---------------------------------------------------------------------------
// Cliente
// ---------------------------------------------------------------------------

export function getTMDBImageUrl(path: string | null | undefined, size: "w300" | "w500" | "w1280" | "original" = "w500"): string {
  if (!path) return FALLBACK_IMAGE;
  if (path.startsWith("http")) return path;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export async function fetchTMDB<T>(endpoint: string, params: Record<string, string> = {}): Promise<T | null> {
  const apiKey = process.env.TMDB_API_KEY;
  const token = process.env.TMDB_ACCESS_TOKEN;

  if (!apiKey && !token) {
    console.warn("TMDB: Nenhuma chave ou token de API configurado em .env.local");
    return null;
  }

  const query = new URLSearchParams(params);
  if (apiKey && !token) query.set("api_key", apiKey);
  query.set("language", "pt-BR");

  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(`${TMDB_BASE_URL}${endpoint}?${query.toString()}`, {
      headers,
      next: { revalidate: 3600 }, // cache de 1 hora no Next.js
    });

    if (!res.ok) {
      console.error(`TMDB Error ${res.status}: ${await res.text()}`);
      return null;
    }

    return (await res.json()) as T;
  } catch (err) {
    console.error("TMDB Fetch Error:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Conversões TMDB -> modelo do app
// ---------------------------------------------------------------------------

function yearOf(date?: string | null): string {
  return date ? date.split("-")[0] : "—";
}

function roundRating(value?: number): number {
  return value ? Number(value.toFixed(1)) : 0;
}

function toSearchResult(item: TMDBShowListItem): ShowSearchResult {
  return {
    id: String(item.id),
    tmdbId: item.id,
    title: item.name || item.original_name || "Sem título",
    firstAirYear: yearOf(item.first_air_date),
    firstAirDate: item.first_air_date || undefined,
    posterUrl: getTMDBImageUrl(item.poster_path, "w500"),
    backdropUrl: getTMDBImageUrl(item.backdrop_path, "w1280"),
    overview: item.overview || "Sem sinopse disponível em português.",
    voteAverage: roundRating(item.vote_average),
    voteCount: item.vote_count ?? 0,
  };
}

function toEpisode(
  ep: TMDBEpisode,
  show: { id: string; title: string; network: string; backdropUrl?: string; runtime?: number }
): Episode {
  return {
    id: makeEpisodeId(show.id, ep.season_number, ep.episode_number),
    showId: show.id,
    showTitle: show.title,
    network: show.network,
    seasonNumber: ep.season_number,
    episodeNumber: ep.episode_number,
    code: episodeCode(ep.season_number, ep.episode_number),
    title: ep.name || `Episódio ${ep.episode_number}`,
    runtime: ep.runtime || show.runtime || DEFAULT_RUNTIME,
    airDate: ep.air_date || "—",
    overview: ep.overview || "Sem sinopse disponível em português.",
    stillUrl: getTMDBImageUrl(ep.still_path ?? null, "w500"),
    backdropUrl: ep.still_path ? getTMDBImageUrl(ep.still_path, "w1280") : show.backdropUrl || FALLBACK_IMAGE,
    averageRating: roundRating(ep.vote_average),
    director: ep.crew?.find((c) => c.job === "Director")?.name,
    guestStars: (ep.guest_stars || []).slice(0, 4).map((g) => g.name),
  };
}

// ---------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------

export async function searchTMDBShows(query: string): Promise<ShowSearchResult[]> {
  if (!query.trim()) return [];
  const data = await fetchTMDB<TMDBPaged<TMDBShowListItem>>("/search/tv", { query });
  return (data?.results ?? []).map(toSearchResult);
}

/** Quantos dias para trás contam como "lançamento recente". */
const RECENT_RELEASE_DAYS = 180;
/** Mínimo de votos para a nota do TMDB significar algo. */
const RECENT_RELEASE_MIN_VOTES = "100";
/** Notícias, reality, novelas e talk shows ficam de fora das sugestões. */
const RECENT_RELEASE_EXCLUDED_GENRES = "10763,10764,10766,10767";

/**
 * Séries que estrearam nos últimos meses, da maior para a menor nota no TMDB.
 * Paginado como o TMDB (20 por página).
 */
export async function getTMDBRecentReleases(
  page = 1
): Promise<{ results: ShowSearchResult[]; totalPages: number }> {
  const today = new Date();
  const from = new Date(today);
  from.setDate(from.getDate() - RECENT_RELEASE_DAYS);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const data = await fetchTMDB<TMDBPaged<TMDBShowListItem>>("/discover/tv", {
    "first_air_date.gte": iso(from),
    "first_air_date.lte": iso(today),
    "vote_count.gte": RECENT_RELEASE_MIN_VOTES,
    without_genres: RECENT_RELEASE_EXCLUDED_GENRES,
    sort_by: "vote_average.desc",
    include_adult: "false",
    page: String(page),
  });
  return { results: (data?.results ?? []).map(toSearchResult), totalPages: data?.total_pages ?? 0 };
}

/** Temporada com todos os episódios. Os IDs usam o ID do TMDB como showId. */
export async function getTMDBSeasonDetails(tmdbId: number | string, seasonNumber: number): Promise<SeasonInfo | null> {
  const seasonData = await fetchTMDB<TMDBSeason>(`/tv/${tmdbId}/season/${seasonNumber}`);
  if (!seasonData) return null;

  const showRef = { id: String(tmdbId), title: "", network: "" };
  const episodes = (seasonData.episodes || []).map((ep) =>
    toEpisode({ ...ep, season_number: ep.season_number ?? seasonNumber }, showRef)
  );

  return {
    seasonNumber,
    name: seasonData.name || `Temporada ${seasonNumber}`,
    episodeCount: episodes.length,
    overview: seasonData.overview || "",
    posterUrl: getTMDBImageUrl(seasonData.poster_path, "w500"),
    airDate: seasonData.air_date || "",
    episodes,
  };
}

/** Metadados da série para entrar no Radar. Episódios são buscados sob demanda. */
export async function getTMDBShowFullDetails(tmdbId: number | string): Promise<Show | null> {
  const showData = await fetchTMDB<TMDBShowDetails>(`/tv/${tmdbId}`);
  if (!showData) return null;

  const seasons: SeasonInfo[] = (showData.seasons || [])
    .filter((s) => s.season_number > 0)
    .map((s) => ({
      seasonNumber: s.season_number,
      name: s.name || `Temporada ${s.season_number}`,
      episodeCount: s.episode_count || 0,
      overview: s.overview || "",
      posterUrl: getTMDBImageUrl(s.poster_path, "w500"),
      airDate: s.air_date || "",
    }));

  return {
    id: String(showData.id),
    tmdbId: showData.id,
    title: showData.name,
    network: showData.networks?.[0]?.name || "Streaming",
    firstAirYear: yearOf(showData.first_air_date),
    posterUrl: getTMDBImageUrl(showData.poster_path, "w500"),
    backdropUrl: getTMDBImageUrl(showData.backdrop_path, "w1280"),
    overview: showData.overview || "Sem sinopse.",
    totalSeasons: showData.number_of_seasons || seasons.length || 1,
    totalEpisodes: showData.number_of_episodes || seasons.reduce((sum, s) => sum + s.episodeCount, 0),
    seasons,
    runtime: showData.episode_run_time?.[0],
  };
}

// ---------------------------------------------------------------------------
// Agenda de transmissão (calendário)
// ---------------------------------------------------------------------------

export interface AirSchedule {
  /** Status da série no TMDB, ex.: "Returning Series", "Ended". */
  status: string;
  /** Data (YYYY-MM-DD) do próximo episódio anunciado, se houver. */
  nextAirDate: string | null;
  /** Episódios da(s) temporada(s) em exibição com data a partir de `since`. */
  episodes: Episode[];
}

/**
 * Agenda de uma série: episódios que estreiam a partir de `since` (YYYY-MM-DD),
 * vindos das temporadas do último e do próximo episódio anunciados.
 */
export async function getTMDBAirSchedule(tmdbId: number | string, since: string): Promise<AirSchedule | null> {
  const show = await fetchTMDB<TMDBShowDetails>(`/tv/${tmdbId}`);
  if (!show) return null;

  const seasonNumbers = new Set<number>();
  for (const ep of [show.last_episode_to_air, show.next_episode_to_air]) {
    if (ep && ep.season_number > 0) seasonNumbers.add(ep.season_number);
  }

  const seasons = await Promise.all([...seasonNumbers].map((n) => getTMDBSeasonDetails(tmdbId, n)));
  const episodes = seasons
    .flatMap((s) => s?.episodes ?? [])
    // airDate vem como "YYYY-MM-DD" (ou "—" quando não há data); comparação de string serve.
    .filter((ep) => /^\d{4}-\d{2}-\d{2}$/.test(ep.airDate) && ep.airDate >= since)
    .sort((a, b) => a.airDate.localeCompare(b.airDate) || a.episodeNumber - b.episodeNumber);

  return {
    status: show.status ?? "",
    nextAirDate: show.next_episode_to_air?.air_date ?? null,
    episodes,
  };
}

// ---------------------------------------------------------------------------
// Extras da série: notas externas (OMDb) e onde assistir (TMDB / JustWatch)
// ---------------------------------------------------------------------------

interface TMDBProvider {
  provider_name: string;
  logo_path?: string | null;
}

interface TMDBShowExtras {
  vote_average?: number;
  status?: string;
  next_episode_to_air?: TMDBEpisode | null;
  external_ids?: { imdb_id?: string | null };
  "watch/providers"?: {
    results?: Record<string, { link?: string; flatrate?: TMDBProvider[] }>;
  };
}

interface OMDbResponse {
  Response?: string;
  imdbRating?: string;
  Metascore?: string;
}

function omdbValue(value?: string): string | null {
  return value && value !== "N/A" ? value : null;
}

export async function getSeriesExtras(tmdbId: number | string, region = "BR"): Promise<SeriesExtras | null> {
  const data = await fetchTMDB<TMDBShowExtras>(`/tv/${tmdbId}`, {
    append_to_response: "external_ids,watch/providers",
  });
  if (!data) return null;

  const imdbId = data.external_ids?.imdb_id || null;
  const local = data["watch/providers"]?.results?.[region];

  let imdbRating: string | null = null;
  let metascore: string | null = null;
  const omdbKey = process.env.OMDB_API_KEY;
  if (omdbKey && imdbId) {
    try {
      const res = await fetch(`https://www.omdbapi.com/?i=${imdbId}&apikey=${omdbKey}`, {
        next: { revalidate: 86400 }, // notas mudam pouco: cache de 1 dia
      });
      if (res.ok) {
        const omdb = (await res.json()) as OMDbResponse;
        if (omdb.Response === "True") {
          imdbRating = omdbValue(omdb.imdbRating);
          metascore = omdbValue(omdb.Metascore);
        }
      }
    } catch (err) {
      console.error("OMDb Fetch Error:", err);
    }
  }

  return {
    imdbId,
    imdbRating,
    metascore,
    tmdbRating: data.vote_average ? roundRating(data.vote_average) : null,
    providers: (local?.flatrate ?? []).map((p) => ({
      name: p.provider_name,
      logoUrl: getTMDBImageUrl(p.logo_path, "w300"),
    })),
    providersLink: local?.link ?? null,
    omdbConfigured: !!omdbKey,
    status: data.status ?? "",
    nextAirEpisode: data.next_episode_to_air
      ? {
          code: episodeCode(data.next_episode_to_air.season_number, data.next_episode_to_air.episode_number),
          title: data.next_episode_to_air.name || `Episódio ${data.next_episode_to_air.episode_number}`,
          airDate: data.next_episode_to_air.air_date || null,
        }
      : null,
  };
}

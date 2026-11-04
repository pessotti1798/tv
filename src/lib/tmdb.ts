import { Show, Episode, SeasonInfo } from "@/types";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

export function getTMDBImageUrl(path: string | null | undefined, size: "w300" | "w500" | "w1280" | "original" = "w500"): string {
  if (!path) return "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=500&auto=format&fit=crop&q=80";
  if (path.startsWith("http")) return path;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

function getApiKey(): string | null {
  return process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY || null;
}

function getHeaders(): HeadersInit {
  const token = process.env.TMDB_ACCESS_TOKEN;
  if (token) {
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }
  return {
    "Content-Type": "application/json",
  };
}

export async function fetchTMDB<T>(endpoint: string, params: Record<string, string> = {}): Promise<T | null> {
  const apiKey = getApiKey();
  const token = process.env.TMDB_ACCESS_TOKEN;

  if (!apiKey && !token) {
    console.warn("TMDB: Nenhuma chave ou token de API configurado em .env.local");
    return null;
  }

  const query = new URLSearchParams(params);
  if (apiKey && !token) {
    query.set("api_key", apiKey);
  }
  query.set("language", "pt-BR");

  const url = `${TMDB_BASE_URL}${endpoint}?${query.toString()}`;

  try {
    const res = await fetch(url, {
      headers: getHeaders(),
      next: { revalidate: 3600 }, // cache for 1 hour in Next.js
    });

    if (!res.ok) {
      console.error(`TMDB Error ${res.status}: ${await res.text()}`);
      return null;
    }

    return await res.json();
  } catch (err) {
    console.error("TMDB Fetch Error:", err);
    return null;
  }
}

// Search TV Shows
export async function searchTMDBShows(query: string) {
  if (!query.trim()) return [];
  const data = await fetchTMDB<{ results: any[] }>("/search/tv", { query });
  if (!data?.results) return [];

  return data.results.map((item) => ({
    id: String(item.id),
    tmdbId: item.id,
    title: item.name || item.original_name,
    network: "TV",
    firstAirYear: item.first_air_date ? item.first_air_date.split("-")[0] : "—",
    posterUrl: getTMDBImageUrl(item.poster_path, "w500"),
    backdropUrl: getTMDBImageUrl(item.backdrop_path, "w1280"),
    overview: item.overview || "Sem sinopse disponível em português.",
    voteAverage: item.vote_average ? Number(item.vote_average.toFixed(1)) : 0,
  }));
}

// Get Season Details with all episodes
export async function getTMDBSeasonDetails(tmdbId: number | string, seasonNumber: number): Promise<SeasonInfo | null> {
  const seasonData = await fetchTMDB<any>(`/tv/${tmdbId}/season/${seasonNumber}`);
  if (!seasonData) return null;

  const episodes: Episode[] = (seasonData.episodes || []).map((ep: any) => {
    const sCode = seasonNumber < 10 ? `0${seasonNumber}` : `${seasonNumber}`;
    const eCode = ep.episode_number < 10 ? `0${ep.episode_number}` : `${ep.episode_number}`;
    return {
      id: `${tmdbId}-${seasonNumber}-${ep.episode_number}`,
      showId: String(tmdbId),
      showTitle: "",
      network: "",
      seasonNumber,
      episodeNumber: ep.episode_number,
      code: `S${sCode}E${eCode}`,
      title: ep.name || `Episódio ${ep.episode_number}`,
      runtime: ep.runtime || 50,
      airDate: ep.air_date || "—",
      overview: ep.overview || "Sem sinopse disponível em português.",
      stillUrl: getTMDBImageUrl(ep.still_path, "w500"),
      backdropUrl: getTMDBImageUrl(ep.still_path, "w1280"),
      averageRating: ep.vote_average ? Number(ep.vote_average.toFixed(1)) : 8.0,
      director: ep.crew?.find((c: any) => c.job === "Director")?.name,
      guestStars: (ep.guest_stars || []).slice(0, 4).map((g: any) => g.name),
    };
  });

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

// Get TV Show Details with Seasons & Episodes
export async function getTMDBShowFullDetails(tmdbId: number | string): Promise<Show | null> {
  const showData = await fetchTMDB<any>(`/tv/${tmdbId}`);
  if (!showData) return null;

  // Fetch Season 1 details by default to get the first episode
  const seasonNum = 1;
  const seasonData = await fetchTMDB<any>(`/tv/${tmdbId}/season/${seasonNum}`);
  
  const networkName = showData.networks?.[0]?.name || "Streaming";
  const firstEpisode = seasonData?.episodes?.[0];

  const currentEpisode: Episode = {
    id: `${tmdbId}-1-${firstEpisode?.episode_number || 1}`,
    showId: String(tmdbId),
    showTitle: showData.name,
    network: networkName,
    seasonNumber: seasonNum,
    episodeNumber: firstEpisode?.episode_number || 1,
    code: `S01E0${firstEpisode?.episode_number || 1}`,
    title: firstEpisode?.name || "Episódio 1",
    runtime: firstEpisode?.runtime || showData.episode_run_time?.[0] || 50,
    airDate: firstEpisode?.air_date || showData.first_air_date || "—",
    overview: firstEpisode?.overview || showData.overview || "Sem sinopse.",
    stillUrl: getTMDBImageUrl(firstEpisode?.still_path, "w500"),
    backdropUrl: getTMDBImageUrl(showData.backdrop_path, "w1280"),
    averageRating: firstEpisode?.vote_average ? Number(firstEpisode.vote_average.toFixed(1)) : 8.5,
  };

  const seasons: SeasonInfo[] = (showData.seasons || [])
    .filter((s: any) => s.season_number > 0)
    .map((s: any) => ({
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
    network: networkName,
    firstAirYear: showData.first_air_date ? showData.first_air_date.split("-")[0] : "—",
    posterUrl: getTMDBImageUrl(showData.poster_path, "w500"),
    backdropUrl: getTMDBImageUrl(showData.backdrop_path, "w1280"),
    overview: showData.overview || "Sem sinopse.",
    totalSeasons: showData.number_of_seasons || 1,
    totalEpisodes: showData.number_of_episodes || 10,
    currentEpisode,
    progressText: `1 de ${showData.number_of_episodes || 10} episódios (0%)`,
    progressPercent: 0,
    seasons,
  };
}

// Get Trending Shows
export async function getTMDBTrendingShows() {
  const data = await fetchTMDB<{ results: any[] }>("/trending/tv/week");
  if (!data?.results) return [];

  return data.results.slice(0, 10).map((item) => ({
    id: String(item.id),
    tmdbId: item.id,
    title: item.name,
    firstAirYear: item.first_air_date ? item.first_air_date.split("-")[0] : "—",
    posterUrl: getTMDBImageUrl(item.poster_path, "w500"),
    backdropUrl: getTMDBImageUrl(item.backdrop_path, "w1280"),
    overview: item.overview,
    voteAverage: item.vote_average ? Number(item.vote_average.toFixed(1)) : 0,
  }));
}


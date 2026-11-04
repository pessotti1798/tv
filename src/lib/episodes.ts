import { Episode, SeasonInfo, Show } from "@/types";

/** Posição de um episódio dentro da série. */
export interface EpisodeRef {
  season: number;
  episode: number;
}

const DEFAULT_RUNTIME = 50;

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function episodeCode(season: number, episode: number): string {
  return `S${pad2(season)}E${pad2(episode)}`;
}

/** Formato canônico de ID de episódio: `${showId}-${temporada}-${episódio}`. */
export function makeEpisodeId(showId: string, season: number, episode: number): string {
  return `${showId}-${season}-${episode}`;
}

/** Faz o caminho inverso de makeEpisodeId. O showId pode conter hífens. */
export function parseEpisodeId(id: string): ({ showId: string } & EpisodeRef) | null {
  const match = /^(.+)-(\d+)-(\d+)$/.exec(id);
  if (!match) return null;
  return { showId: match[1], season: Number(match[2]), episode: Number(match[3]) };
}

export function compareRefs(a: EpisodeRef, b: EpisodeRef): number {
  return a.season - b.season || a.episode - b.episode;
}

function refOf(ep: Episode): EpisodeRef {
  return { season: ep.seasonNumber, episode: ep.episodeNumber };
}

/** Números das temporadas da série (sem especiais), em ordem. */
export function getSeasonNumbers(show: Show): number[] {
  if (show.seasons && show.seasons.length > 0) {
    return show.seasons.map((s) => s.seasonNumber).filter((n) => n > 0).sort((a, b) => a - b);
  }
  return Array.from({ length: Math.max(1, show.totalSeasons || 1) }, (_, i) => i + 1);
}

/** Quantidade de episódios de uma temporada. Usa os dados reais quando existem. */
export function getSeasonEpisodeCount(show: Show, season: number): number {
  const info = show.seasons?.find((s) => s.seasonNumber === season);
  if (info) return info.episodeCount;
  const seasons = Math.max(1, show.totalSeasons || 1);
  return Math.max(1, Math.ceil((show.totalEpisodes || 10) / seasons));
}

export function getNextEpisodeRef(show: Show, ref: EpisodeRef): EpisodeRef | null {
  if (ref.episode < getSeasonEpisodeCount(show, ref.season)) {
    return { season: ref.season, episode: ref.episode + 1 };
  }
  const nextSeason = getSeasonNumbers(show).find(
    (n) => n > ref.season && getSeasonEpisodeCount(show, n) > 0
  );
  return nextSeason !== undefined ? { season: nextSeason, episode: 1 } : null;
}

export function getPrevEpisodeRef(show: Show, ref: EpisodeRef): EpisodeRef | null {
  if (ref.episode > 1) return { season: ref.season, episode: ref.episode - 1 };
  const prevSeason = getSeasonNumbers(show)
    .filter((n) => n < ref.season && getSeasonEpisodeCount(show, n) > 0)
    .pop();
  return prevSeason !== undefined
    ? { season: prevSeason, episode: getSeasonEpisodeCount(show, prevSeason) }
    : null;
}

export function getLastEpisodeRef(show: Show): EpisodeRef | null {
  const lastSeason = getSeasonNumbers(show)
    .filter((n) => getSeasonEpisodeCount(show, n) > 0)
    .pop();
  return lastSeason !== undefined
    ? { season: lastSeason, episode: getSeasonEpisodeCount(show, lastSeason) }
    : null;
}

export function getSeasonEpisodeIds(show: Show, season: number): string[] {
  const count = getSeasonEpisodeCount(show, season);
  return Array.from({ length: count }, (_, i) => makeEpisodeId(show.id, season, i + 1));
}

export function getAllEpisodeIds(show: Show): string[] {
  return getSeasonNumbers(show).flatMap((n) => getSeasonEpisodeIds(show, n));
}

/** IDs de todos os episódios anteriores a `ref` (exclusivo). */
export function getEpisodeIdsBefore(show: Show, ref: EpisodeRef): string[] {
  return getSeasonNumbers(show).flatMap((n) =>
    getSeasonEpisodeIds(show, n).filter((id) => {
      const parsed = parseEpisodeId(id);
      return parsed !== null && compareRefs(parsed, ref) < 0;
    })
  );
}

/**
 * Episódio provisório para uma posição, usado enquanto os dados reais do TMDB
 * não chegam (ou quando não há chave de API).
 */
export function buildPlaceholderEpisode(show: Show, ref: EpisodeRef): Episode {
  return {
    id: makeEpisodeId(show.id, ref.season, ref.episode),
    showId: show.id,
    showTitle: show.title,
    network: show.network,
    seasonNumber: ref.season,
    episodeNumber: ref.episode,
    code: episodeCode(ref.season, ref.episode),
    title: `Episódio ${ref.episode}`,
    runtime: show.currentEpisode?.runtime || DEFAULT_RUNTIME,
    airDate: "—",
    overview: "Sinopse ainda não carregada.",
    stillUrl: show.backdropUrl,
    backdropUrl: show.backdropUrl,
    averageRating: 0,
  };
}

/** Recalcula os campos de progresso a partir dos episódios realmente vistos. */
export function withProgress(show: Show, watched: Record<string, boolean>): Show {
  const total = show.totalEpisodes || getAllEpisodeIds(show).length;
  const watchedCount = getAllEpisodeIds(show).filter((id) => watched[id]).length;
  if (show.completed) {
    return { ...show, progressPercent: 100, progressText: "Série Concluída (100%)" };
  }
  const percent = total > 0 ? Math.min(100, Math.round((watchedCount / total) * 100)) : 0;
  return {
    ...show,
    progressPercent: percent,
    progressText: `${watchedCount} de ${total} episódios (${percent}%)`,
  };
}

/** Data de exibição no diário, ex.: "4 de nov., 2026". */
export function formatWatchDate(date: Date = new Date()): string {
  return `${date.getDate()} de ${date.toLocaleString("pt-BR", { month: "short" })}, ${date.getFullYear()}`;
}

// ---------------------------------------------------------------------------
// Carregamento de temporadas via API interna (com cache em memória)
// ---------------------------------------------------------------------------

const seasonCache = new Map<string, Promise<SeasonInfo | null>>();

/** Ajusta um episódio vindo do TMDB para o ID e os metadados da série local. */
function normalizeEpisode(show: Show, ep: Episode): Episode {
  return {
    ...ep,
    id: makeEpisodeId(show.id, ep.seasonNumber, ep.episodeNumber),
    showId: show.id,
    showTitle: show.title,
    network: show.network,
    backdropUrl: ep.backdropUrl || show.backdropUrl,
  };
}

function normalizeSeason(show: Show, season: SeasonInfo): SeasonInfo {
  return { ...season, episodes: (season.episodes || []).map((ep) => normalizeEpisode(show, ep)) };
}

export async function fetchSeason(show: Show, season: number): Promise<SeasonInfo | null> {
  if (!show.tmdbId) return null;
  const key = `${show.tmdbId}-${season}`;
  let pending = seasonCache.get(key);
  if (!pending) {
    pending = fetch(`/api/tmdb/season/${show.tmdbId}/${season}`)
      .then(async (res) => (res.ok ? ((await res.json()).season as SeasonInfo) : null))
      .catch(() => null);
    seasonCache.set(key, pending);
    // Não guarda falhas no cache, para tentar de novo depois.
    pending.then((result) => {
      if (!result) seasonCache.delete(key);
    });
  }
  const result = await pending;
  return result ? normalizeSeason(show, result) : null;
}

export async function fetchEpisode(show: Show, ref: EpisodeRef): Promise<Episode | null> {
  const season = await fetchSeason(show, ref.season);
  return season?.episodes?.find((e) => compareRefs(refOf(e), ref) === 0) ?? null;
}

// ---------------------------------------------------------------------------
// Agenda de transmissão (calendário)
// ---------------------------------------------------------------------------

export interface ShowSchedule {
  status: string;
  nextAirDate: string | null;
  episodes: Episode[];
}

const scheduleCache = new Map<string, Promise<ShowSchedule | null>>();

/** Episódios da série que estreiam a partir de `since` (YYYY-MM-DD). */
export async function fetchSchedule(show: Show, since: string): Promise<ShowSchedule | null> {
  if (!show.tmdbId) return null;
  const key = `${show.tmdbId}-${since}`;
  let pending = scheduleCache.get(key);
  if (!pending) {
    pending = fetch(`/api/tmdb/schedule/${show.tmdbId}?since=${since}`)
      .then(async (res) => (res.ok ? ((await res.json()).schedule as ShowSchedule) : null))
      .catch(() => null);
    scheduleCache.set(key, pending);
    pending.then((result) => {
      if (!result) scheduleCache.delete(key);
    });
  }
  const result = await pending;
  return result ? { ...result, episodes: result.episodes.map((ep) => normalizeEpisode(show, ep)) } : null;
}

// ---------------------------------------------------------------------------
// Datas locais no formato YYYY-MM-DD (sem conversão para UTC)
// ---------------------------------------------------------------------------

export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, days: number): string {
  const date = parseISODate(iso);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

/** Diferença em dias entre duas datas ISO (b - a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((parseISODate(b).getTime() - parseISODate(a).getTime()) / 86_400_000);
}

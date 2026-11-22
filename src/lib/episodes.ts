import { Episode, SeasonInfo, Show, TrackedShow } from "@/types";
import { episodeCode, makeEpisodeId, pad2 } from "./episode-id";
import { getTMDBAirSchedule, getTMDBSeasonDetails, getTMDBShowFullDetails } from "./tmdb";

/** Posição de um episódio dentro da série. */
export interface EpisodeRef {
  season: number;
  episode: number;
}

export const DEFAULT_RUNTIME = 50;
const PLACEHOLDER_OVERVIEW = "Sinopse ainda não carregada.";

export { pad2, episodeCode, makeEpisodeId };

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
    runtime: show.runtime || DEFAULT_RUNTIME,
    airDate: "—",
    overview: PLACEHOLDER_OVERVIEW,
    stillUrl: show.backdropUrl,
    backdropUrl: show.backdropUrl,
    averageRating: 0,
  };
}

/**
 * Próximo episódio a assistir, calculado só a partir dos episódios vistos:
 * - com foco ("Focar no Radar"): o primeiro não visto a partir do foco;
 * - sem foco (ou foco já todo visto): o episódio seguinte ao mais avançado visto
 *   (ou o primeiro da série, se nada foi visto).
 * Retorna null quando não há mais episódios: a série está concluída.
 */
export function deriveNextEpisodeRef(show: Show, watched: Record<string, boolean>): EpisodeRef | null {
  const ids = getAllEpisodeIds(show);

  const focus = show.focusEpisodeId ? parseEpisodeId(show.focusEpisodeId) : null;
  if (focus) {
    for (const id of ids) {
      const ref = parseEpisodeId(id)!;
      if (compareRefs(ref, focus) >= 0 && !watched[id]) return ref;
    }
  }

  let furthest: EpisodeRef | null = null;
  for (const id of ids) {
    if (watched[id]) furthest = parseEpisodeId(id);
  }
  if (!furthest) {
    const first = getSeasonNumbers(show).find((n) => getSeasonEpisodeCount(show, n) > 0);
    return first !== undefined ? { season: first, episode: 1 } : null;
  }
  return getNextEpisodeRef(show, furthest);
}

/** Junta os dados salvos da série com o que é derivado dos episódios vistos. */
export function trackShow(
  show: Show,
  watched: Record<string, boolean>,
  episodeCache: Record<string, Episode>
): TrackedShow {
  const ids = getAllEpisodeIds(show);
  const total = show.totalEpisodes || ids.length;
  const watchedCount = ids.filter((id) => watched[id]).length;

  const next = deriveNextEpisodeRef(show, watched);
  const completed = next === null;
  const ref = next ?? getLastEpisodeRef(show) ?? { season: 1, episode: 1 };
  const id = makeEpisodeId(show.id, ref.season, ref.episode);
  const currentEpisode = episodeCache[id] ?? buildPlaceholderEpisode(show, ref);

  const percent = completed ? 100 : total > 0 ? Math.min(100, Math.round((watchedCount / total) * 100)) : 0;
  return {
    ...show,
    currentEpisode,
    completed,
    watchedCount,
    progressPercent: percent,
    progressText: completed ? "Série Concluída (100%)" : `${watchedCount} de ${total} episódios (${percent}%)`,
  };
}

/** Indica se o episódio é só um provisório (sem dados reais do TMDB). */
export function isPlaceholderEpisode(ep: Episode): boolean {
  return ep.overview === PLACEHOLDER_OVERVIEW;
}

/** Data de exibição no diário, ex.: "04 nov. 2026". */
export function formatDiaryDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const [y, m, d] = iso.split("-");
  return `${d} ${PT_MONTHS[Number(m) - 1]}. ${y}`;
}

const PT_MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/**
 * Converte datas de diário salvas por versões antigas ("09 de abr., 2023",
 * "4 de Nov, 2026", "Hoje") para YYYY-MM-DD. Quando o texto não tem data,
 * usa o horário embutido no ID do registro (ex.: "log-1793836490507").
 */
export function legacyDiaryDateToISO(text: string, logId: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const match = /(\d{1,2})\s+de\s+([a-zç]{3})[a-zç]*\.?,?\s+(\d{4})/i.exec(text);
  if (match) {
    const month = PT_MONTHS.indexOf(match[2].toLowerCase());
    if (month >= 0) return toISODate(new Date(Number(match[3]), month, Number(match[1])));
  }
  const stamp = /(\d{12,})/.exec(logId);
  return toISODate(stamp ? new Date(Number(stamp[1])) : new Date());
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
    pending = getTMDBSeasonDetails(show.tmdbId, season).catch(() => null);
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
    pending = getTMDBAirSchedule(show.tmdbId, since).catch(() => null);
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

// ---------------------------------------------------------------------------
// Sincronização da estrutura da série (temporadas e episódios) com o TMDB
// ---------------------------------------------------------------------------

export const SHOW_SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000;

/** Séries do TMDB que nunca foram sincronizadas ou estão há mais de 24h sem atualizar. */
/** Imagens que vêm do TMDB (as do demo antigo são fotos genéricas do Unsplash). */
function isTMDBImage(url: string | undefined): boolean {
  return !!url && url.startsWith("https://image.tmdb.org/");
}

export function needsSync(show: Show, now: number = Date.now()): boolean {
  if (!show.tmdbId) return false;
  // Séries com imagem genérica sincronizam já, para receber o pôster oficial.
  if (!isTMDBImage(show.posterUrl)) return true;
  const last = show.syncedAt ? Date.parse(show.syncedAt) : NaN;
  return Number.isNaN(last) || now - last > SHOW_SYNC_INTERVAL_MS;
}

export async function fetchShowMetadata(show: Show): Promise<Show | null> {
  if (!show.tmdbId) return null;
  try {
    return await getTMDBShowFullDetails(show.tmdbId);
  } catch {
    return null;
  }
}

/**
 * Aplica a estrutura vinda do TMDB (temporadas, totais) à série local, sem
 * mexer em título, foco ou ID. Imagens genéricas são trocadas pelas oficiais.
 * Uma resposta sem temporadas só atualiza as imagens.
 */
export function mergeShowStructure(local: Show, remote: Show, syncedAt: string): Show {
  // Imagens: troca só as genéricas (não-TMDB) pelas oficiais.
  const images = {
    posterUrl: !isTMDBImage(local.posterUrl) && isTMDBImage(remote.posterUrl) ? remote.posterUrl : local.posterUrl,
    backdropUrl:
      !isTMDBImage(local.backdropUrl) && isTMDBImage(remote.backdropUrl) ? remote.backdropUrl : local.backdropUrl,
  };
  if (!remote.seasons || remote.seasons.length === 0) return { ...local, ...images, syncedAt };
  return {
    ...local,
    ...images,
    seasons: remote.seasons,
    totalSeasons: remote.totalSeasons,
    totalEpisodes: remote.totalEpisodes,
    runtime: local.runtime ?? remote.runtime,
    syncedAt,
  };
}

/**
 * Se o episódio já foi ao ar. Datas ISO são comparadas com hoje; "—" (sem data)
 * conta como não lançado; textos antigos (dados demo) contam como lançados.
 */
export function hasAired(airDate: string, today: string): boolean {
  if (/^\d{4}-\d{2}-\d{2}$/.test(airDate)) return airDate <= today;
  return airDate !== "—";
}

// ---------------------------------------------------------------------------
// Situação de lançamento de um episódio (lista inicial e página da série)
// ---------------------------------------------------------------------------

/**
 * Data de estreia como YYYY-MM-DD. Aceita ISO (TMDB) e o texto dos dados demo
 * ("12 de Maio, 2024"). Retorna null quando não há data conhecida.
 */
export function episodeAirISO(ep: Episode): string | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(ep.airDate)) return ep.airDate;
  const match = /(\d{1,2})\s+de\s+([a-zç]{3})[a-zç]*\.?,?\s+(\d{4})/i.exec(ep.airDate);
  if (!match) return null;
  const month = PT_MONTHS.indexOf(match[2].toLowerCase());
  return month >= 0 ? toISODate(new Date(Number(match[3]), month, Number(match[1]))) : null;
}

/** Segunda-feira da semana de `today` (YYYY-MM-DD). */
export function startOfWeekISO(today: string): string {
  const day = parseISODate(today).getDay(); // 0 = domingo
  return addDays(today, -((day + 6) % 7));
}

/**
 * - "upcoming": ainda não estreou (ou estreia sem data anunciada);
 * - "this-week": estreou nesta semana (segunda até hoje);
 * - "aired": estreou antes;
 * - "unknown": detalhes ainda carregando.
 */
export type ReleaseStatus = "upcoming" | "this-week" | "aired" | "unknown";

export function releaseStatus(ep: Episode, today: string): ReleaseStatus {
  if (isPlaceholderEpisode(ep)) return "unknown";
  const air = episodeAirISO(ep);
  if (!air) return ep.airDate === "—" ? "upcoming" : "aired";
  if (air > today) return "upcoming";
  return air >= startOfWeekISO(today) ? "this-week" : "aired";
}

const PT_WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

/** Data curta com dia da semana, ex.: "sáb 8 nov". */
export function formatShortDay(iso: string): string {
  const date = parseISODate(iso);
  return `${PT_WEEKDAYS[date.getDay()]} ${date.getDate()} ${PT_MONTHS[date.getMonth()]}`;
}

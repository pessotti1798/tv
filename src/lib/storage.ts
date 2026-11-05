import { Episode, Show, WatchLog, Review, UserProfile, UserList } from "@/types";
import {
  INITIAL_SHOWS,
  INITIAL_REVIEWS,
  INITIAL_USER_PROFILE,
  INITIAL_LISTS,
  DEMO_WATCHED,
  DEMO_RATINGS,
  DEMO_DIARY,
  DEMO_EPISODE_CACHE,
} from "./catalog";
import {
  deriveNextEpisodeRef,
  getAllEpisodeIds,
  isPlaceholderEpisode,
  legacyDiaryDateToISO,
  makeEpisodeId,
} from "./episodes";

export const STORAGE_KEYS = {
  SHOWS: "episodic_shows",
  WATCHED: "episodic_watched",
  RATINGS: "episodic_ratings",
  DIARY: "episodic_diary",
  REVIEWS: "episodic_reviews",
  LISTS: "episodic_lists",
  PROFILE: "episodic_profile",
  /** Detalhes de episódios já carregados (título, sinopse, imagem). */
  EPISODES: "episodic_episodes",
} as const;

export interface EpisodicBackupData {
  version: number;
  timestamp: string;
  shows: Show[];
  watched: Record<string, boolean>;
  ratings: Record<string, number>;
  diary: WatchLog[];
  reviews: Record<string, Review[]>;
  lists: UserList[];
  profile: UserProfile;
  episodes?: Record<string, Episode>;
}

export function getFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (err) {
    console.warn(`Erro ao ler ${key} do localStorage:`, err);
    return defaultValue;
  }
}

export function saveToStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Erro ao salvar ${key} no localStorage:`, err);
  }
}

export function exportBackupData(): string {
  const data: EpisodicBackupData = {
    version: 1,
    timestamp: new Date().toISOString(),
    shows: getFromStorage(STORAGE_KEYS.SHOWS, []),
    watched: getFromStorage(STORAGE_KEYS.WATCHED, {}),
    ratings: getFromStorage(STORAGE_KEYS.RATINGS, {}),
    diary: getFromStorage(STORAGE_KEYS.DIARY, []),
    reviews: getFromStorage(STORAGE_KEYS.REVIEWS, {}),
    lists: getFromStorage(STORAGE_KEYS.LISTS, []),
    profile: getFromStorage(STORAGE_KEYS.PROFILE, INITIAL_USER_PROFILE),
    episodes: getFromStorage(STORAGE_KEYS.EPISODES, {}),
  };
  return JSON.stringify(data, null, 2);
}

export function importBackupData(jsonString: string): boolean {
  try {
    const parsed = JSON.parse(jsonString) as Partial<EpisodicBackupData>;
    if (!parsed || typeof parsed !== "object") return false;

    if (Array.isArray(parsed.shows)) saveToStorage(STORAGE_KEYS.SHOWS, parsed.shows);
    if (parsed.watched) saveToStorage(STORAGE_KEYS.WATCHED, parsed.watched);
    if (parsed.ratings) saveToStorage(STORAGE_KEYS.RATINGS, parsed.ratings);
    if (Array.isArray(parsed.diary)) saveToStorage(STORAGE_KEYS.DIARY, parsed.diary);
    if (parsed.reviews) saveToStorage(STORAGE_KEYS.REVIEWS, parsed.reviews);
    if (Array.isArray(parsed.lists)) saveToStorage(STORAGE_KEYS.LISTS, parsed.lists);
    if (parsed.profile) saveToStorage(STORAGE_KEYS.PROFILE, parsed.profile);
    if (parsed.episodes) saveToStorage(STORAGE_KEYS.EPISODES, parsed.episodes);

    return true;
  } catch (err) {
    console.error("Falha ao importar backup:", err);
    return false;
  }
}

export function resetToDemoData(): void {
  saveToStorage(STORAGE_KEYS.SHOWS, INITIAL_SHOWS);
  saveToStorage(STORAGE_KEYS.EPISODES, DEMO_EPISODE_CACHE);
  saveToStorage(STORAGE_KEYS.WATCHED, DEMO_WATCHED);
  saveToStorage(STORAGE_KEYS.RATINGS, DEMO_RATINGS);
  saveToStorage(STORAGE_KEYS.DIARY, DEMO_DIARY);
  saveToStorage(STORAGE_KEYS.REVIEWS, INITIAL_REVIEWS);
  saveToStorage(STORAGE_KEYS.LISTS, INITIAL_LISTS);
  saveToStorage(STORAGE_KEYS.PROFILE, INITIAL_USER_PROFILE);
}

/**
 * Versões antigas usavam "hotd-2-4" para House of the Dragon, diferente do ID
 * da série ("house-of-dragon"). Reescreve esses IDs nos dados já salvos.
 */
const LEGACY_ID_PREFIXES: [string, string][] = [["hotd-", "house-of-dragon-"]];

function migrateId(id: string): string {
  for (const [from, to] of LEGACY_ID_PREFIXES) {
    if (id.startsWith(from)) return to + id.slice(from.length);
  }
  return id;
}

function migrateKeys<T>(record: Record<string, T>): Record<string, T> {
  return Object.fromEntries(Object.entries(record).map(([k, v]) => [migrateId(k), v]));
}

/** Imagens do demo antigo que não existem mais no Unsplash (404) -> substitutas. */
const BROKEN_IMAGE_IDS: [string, string][] = [
  ["photo-1528164344705-475647b2a1e5", "photo-1493976040374-85c8e12f0c0e"],
  ["photo-1579783902614-a3fb3927b675", "photo-1563089145-599997674d42"],
];

function fixBrokenImageUrls(): void {
  for (const key of Object.values(STORAGE_KEYS)) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    let fixed = raw;
    for (const [from, to] of BROKEN_IMAGE_IDS) fixed = fixed.split(from).join(to);
    if (fixed !== raw) localStorage.setItem(key, fixed);
  }
}

export function migrateLegacyData(): void {
  if (typeof window === "undefined") return;
  fixBrokenImageUrls();
  const watched = getFromStorage<Record<string, boolean> | null>(STORAGE_KEYS.WATCHED, null);
  if (watched) saveToStorage(STORAGE_KEYS.WATCHED, migrateKeys(watched));
  const ratings = getFromStorage<Record<string, number> | null>(STORAGE_KEYS.RATINGS, null);
  if (ratings) saveToStorage(STORAGE_KEYS.RATINGS, migrateKeys(ratings));
  const reviews = getFromStorage<Record<string, Review[]> | null>(STORAGE_KEYS.REVIEWS, null);
  if (reviews) {
    const migrated = migrateKeys(reviews);
    for (const key of Object.keys(migrated)) {
      migrated[key] = migrated[key].map((r) => ({ ...r, episodeId: migrateId(r.episodeId) }));
    }
    saveToStorage(STORAGE_KEYS.REVIEWS, migrated);
  }
  const diary = getFromStorage<WatchLog[] | null>(STORAGE_KEYS.DIARY, null);
  if (diary) {
    saveToStorage(
      STORAGE_KEYS.DIARY,
      diary.map((l) => ({
        ...l,
        episodeId: migrateId(l.episodeId),
        // Datas antigas eram texto livre; agora são YYYY-MM-DD.
        watchedAt: legacyDiaryDateToISO(l.watchedAt, l.id),
      }))
    );
  }
  const shows = getFromStorage<LegacyShow[] | null>(STORAGE_KEYS.SHOWS, null);
  if (shows) {
    saveToStorage(
      STORAGE_KEYS.SHOWS,
      shows.map((show) => {
        // Séries do catálogo demo ganharam tmdbId e lista de temporadas.
        const demo = INITIAL_SHOWS.find((d) => d.id === show.id);
        return {
          ...show,
          tmdbId: show.tmdbId ?? demo?.tmdbId,
          seasons: show.seasons ?? demo?.seasons,
          currentEpisode: show.currentEpisode && {
            ...show.currentEpisode,
            id: migrateId(show.currentEpisode.id),
          },
        };
      })
    );
  }
  const lists = getFromStorage<UserList[] | null>(STORAGE_KEYS.LISTS, null);
  if (lists) {
    saveToStorage(
      STORAGE_KEYS.LISTS,
      lists.map((l) => ({ ...l, items: l.items.map((i) => ({ ...i, id: migrateId(i.id) })) }))
    );
  }
  migrateToDerivedModel();
}

/** Formato antigo: a série guardava o episódio atual e o progresso já calculados. */
type LegacyShow = Show & {
  currentEpisode?: Episode;
  progressText?: string;
  progressPercent?: number;
  completed?: boolean;
};

/**
 * Converte séries do formato antigo para o modelo derivado, preservando o que o
 * usuário via: o episódio atual vira foco (se diferir do calculado), séries
 * concluídas ficam com todos os episódios vistos e os detalhes do episódio
 * atual vão para o cache.
 */
function migrateToDerivedModel(): void {
  const shows = getFromStorage<LegacyShow[] | null>(STORAGE_KEYS.SHOWS, null);
  if (!shows || !shows.some((s) => "currentEpisode" in s || "progressText" in s || "completed" in s)) return;

  const watched = { ...getFromStorage<Record<string, boolean>>(STORAGE_KEYS.WATCHED, {}) };
  const cache = { ...getFromStorage<Record<string, Episode>>(STORAGE_KEYS.EPISODES, {}) };

  const migrated: Show[] = shows.map((legacy) => {
    const { currentEpisode, progressText: _text, progressPercent: _percent, completed, ...show } = legacy;
    void _text;
    void _percent;
    const result: Show = { ...show, runtime: show.runtime ?? currentEpisode?.runtime };

    if (completed) {
      getAllEpisodeIds(result).forEach((id) => (watched[id] = true));
    } else if (currentEpisode) {
      const derived = deriveNextEpisodeRef(result, watched);
      const derivedId = derived ? makeEpisodeId(result.id, derived.season, derived.episode) : null;
      if (derivedId !== currentEpisode.id) result.focusEpisodeId = currentEpisode.id;
    }
    if (currentEpisode && !isPlaceholderEpisode(currentEpisode)) cache[currentEpisode.id] = currentEpisode;
    return result;
  });

  saveToStorage(STORAGE_KEYS.SHOWS, migrated);
  saveToStorage(STORAGE_KEYS.WATCHED, watched);
  saveToStorage(STORAGE_KEYS.EPISODES, cache);
}

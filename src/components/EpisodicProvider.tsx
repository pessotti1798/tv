"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DiaryLogOptions, Episode, Show, TrackedShow, WatchLog, Review, UserProfile, UserList } from "@/types";
import {
  INITIAL_SHOWS,
  INITIAL_REVIEWS,
  INITIAL_USER_PROFILE,
  INITIAL_LISTS,
  DEMO_WATCHED,
  DEMO_RATINGS,
  DEMO_DIARY,
  DEMO_EPISODE_CACHE,
} from "@/lib/catalog";
import { STORAGE_KEYS, getFromStorage, saveToStorage, migrateLegacyData } from "@/lib/storage";
import {
  DEFAULT_RUNTIME,
  fetchEpisode,
  fetchShowMetadata,
  getSeasonEpisodeIds,
  hasAired,
  isPlaceholderEpisode,
  mergeShowStructure,
  needsSync,
  parseEpisodeId,
  toISODate,
  trackShow,
} from "@/lib/episodes";


/** Padrão dos botões "Marcar Visto" fora da ficha: registra hoje no diário. */
const DEFAULT_LOG_OPTIONS = (): DiaryLogOptions => ({ save: true, isRewatch: false, date: toISODate(new Date()) });

/** Lê todos os dados salvos (com a migração de IDs antigos). Só roda no navegador. */
function loadStoredData() {
  migrateLegacyData();
  return {
    shows: getFromStorage<Show[]>(STORAGE_KEYS.SHOWS, INITIAL_SHOWS),
    watched: getFromStorage<Record<string, boolean>>(STORAGE_KEYS.WATCHED, DEMO_WATCHED),
    ratings: getFromStorage<Record<string, number>>(STORAGE_KEYS.RATINGS, DEMO_RATINGS),
    diary: getFromStorage<WatchLog[]>(STORAGE_KEYS.DIARY, DEMO_DIARY),
    reviews: getFromStorage<Record<string, Review[]>>(STORAGE_KEYS.REVIEWS, INITIAL_REVIEWS),
    lists: getFromStorage<UserList[]>(STORAGE_KEYS.LISTS, INITIAL_LISTS),
    profile: getFromStorage<UserProfile>(STORAGE_KEYS.PROFILE, INITIAL_USER_PROFILE),
    episodes: getFromStorage<Record<string, Episode>>(STORAGE_KEYS.EPISODES, DEMO_EPISODE_CACHE),
  };
}

/** Estado e ações do Episodic. Usado uma única vez, pelo EpisodicProvider. */
function useEpisodicState() {

  // Core Data States (carregados uma vez do localStorage)
  const [initialData] = useState(loadStoredData);
  const [shows, setShows] = useState<Show[]>(initialData.shows);
  const [watchedEpisodes, setWatchedEpisodes] = useState<Record<string, boolean>>(initialData.watched);
  const [userRatings, setUserRatings] = useState<Record<string, number>>(initialData.ratings);
  const [reviewsMap, setReviewsMap] = useState<Record<string, Review[]>>(initialData.reviews);
  const [diaryLogs, setDiaryLogs] = useState<WatchLog[]>(initialData.diary);
  const [userLists, setUserLists] = useState<UserList[]>(initialData.lists);
  const [profile, setProfile] = useState<UserProfile>(initialData.profile);
  // Detalhes de episódios já carregados do TMDB (o resto é derivado).
  const [episodeCache, setEpisodeCache] = useState<Record<string, Episode>>(initialData.episodes);

  // Recarrega tudo do localStorage (após importar backup ou restaurar o demo).
  const reloadDataFromStorage = useCallback(() => {
    const data = loadStoredData();
    setShows(data.shows);
    setWatchedEpisodes(data.watched);
    setUserRatings(data.ratings);
    setDiaryLogs(data.diary);
    setReviewsMap(data.reviews);
    setUserLists(data.lists);
    setProfile(data.profile);
    setEpisodeCache(data.episodes);
  }, []);

  // Persistência: cada fatia do estado é salva quando muda.
  useEffect(() => saveToStorage(STORAGE_KEYS.SHOWS, shows), [shows]);
  useEffect(() => saveToStorage(STORAGE_KEYS.WATCHED, watchedEpisodes), [watchedEpisodes]);
  useEffect(() => saveToStorage(STORAGE_KEYS.RATINGS, userRatings), [userRatings]);
  useEffect(() => saveToStorage(STORAGE_KEYS.DIARY, diaryLogs), [diaryLogs]);
  useEffect(() => saveToStorage(STORAGE_KEYS.REVIEWS, reviewsMap), [reviewsMap]);
  useEffect(() => saveToStorage(STORAGE_KEYS.LISTS, userLists), [userLists]);
  useEffect(() => saveToStorage(STORAGE_KEYS.PROFILE, profile), [profile]);
  useEffect(() => saveToStorage(STORAGE_KEYS.EPISODES, episodeCache), [episodeCache]);

  // Séries com próximo episódio e progresso calculados a partir dos episódios vistos.
  const trackedShows = useMemo<TrackedShow[]>(
    () => shows.map((show) => trackShow(show, watchedEpisodes, episodeCache)),
    [shows, watchedEpisodes, episodeCache]
  );

  // Busca no TMDB os detalhes dos próximos episódios que ainda são provisórios.
  const missingKey = trackedShows
    .filter((s) => s.tmdbId && isPlaceholderEpisode(s.currentEpisode))
    .map((s) => s.currentEpisode.id)
    .join(",");
  useEffect(() => {
    if (!missingKey) return;
    let cancelled = false;
    trackedShows
      .filter((s) => s.tmdbId && isPlaceholderEpisode(s.currentEpisode))
      .forEach((show) => {
        const ep = show.currentEpisode;
        fetchEpisode(show, { season: ep.seasonNumber, episode: ep.episodeNumber }).then((real) => {
          if (real && !cancelled) setEpisodeCache((prev) => ({ ...prev, [real.id]: real }));
        });
      });
    return () => {
      cancelled = true;
    };
    // Só quando o conjunto de episódios faltando muda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missingKey]);

  // Ao abrir o app, atualiza a lista de temporadas das séries há mais de 24h sem
  // sincronizar. Com o modelo derivado, uma temporada nova faz a série voltar
  // sozinha ao Radar.
  useEffect(() => {
    const stale = shows.filter((s) => needsSync(s));
    if (stale.length === 0) return;
    let cancelled = false;
    const today = toISODate(new Date());

    stale.forEach((show) => {
      fetchShowMetadata(show).then((remote) => {
        if (cancelled || !remote) return;
        const syncedAt = new Date().toISOString();
        setShows((prev) => prev.map((s) => (s.id === show.id ? mergeShowStructure(s, remote, syncedAt) : s)));
        // Episódios que ainda não foram ao ar mudam (título, data); recarrega depois.
        setEpisodeCache((prev) =>
          Object.fromEntries(
            Object.entries(prev).filter(([, ep]) => ep.showId !== show.id || hasAired(ep.airDate, today))
          )
        );
      });
    });

    return () => {
      cancelled = true;
    };
    // Só na abertura do app.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dynamic Statistics (a partir dos episódios realmente marcados)
  const dynamicStats = useMemo(() => {
    const showsById = new Map(shows.map((s) => [s.id, s]));
    let minutes = 0;
    let totalEps = 0;
    Object.entries(watchedEpisodes).forEach(([id, isWatched]) => {
      if (!isWatched) return;
      totalEps++;
      const parsed = parseEpisodeId(id);
      const show = parsed ? showsById.get(parsed.showId) : undefined;
      minutes += episodeCache[id]?.runtime || show?.runtime || DEFAULT_RUNTIME;
    });

    return {
      totalMinutesWatched: minutes,
      totalEpisodesWatched: totalEps,
      totalShowsCompleted: trackedShows.filter((s) => s.completed).length,
    };
  }, [watchedEpisodes, shows, trackedShows, episodeCache]);

  // ---------------------------------------------------------------------------
  // Helpers de atualização
  // ---------------------------------------------------------------------------

  const updateShow = (showId: string, changes: Partial<Show>) => {
    setShows((prev) => prev.map((s) => (s.id === showId ? { ...s, ...changes } : s)));
  };

  const rememberEpisode = (episode: Episode) => {
    if (!isPlaceholderEpisode(episode)) setEpisodeCache((prev) => ({ ...prev, [episode.id]: episode }));
  };

  type DiaryExtras = Partial<Pick<WatchLog, "watchedAt" | "isRewatch" | "reviewText" | "hasSpoilers">>;

  const makeDiaryEntry = (show: Show | undefined, episode: Episode, extras: DiaryExtras = {}): WatchLog => ({
    id: `log-${Date.now()}-${episode.id}`,
    episodeId: episode.id,
    showId: show?.id ?? episode.showId,
    showTitle: show?.title ?? episode.showTitle,
    episodeCode: episode.code,
    episodeTitle: episode.title,
    posterUrl: show?.posterUrl ?? episode.stillUrl,
    watchedAt: toISODate(new Date()),
    rating: userRatings[episode.id] || undefined,
    isRewatch: false,
    ...extras,
  });

  /**
   * Ao desmarcar um episódio, remove do diário só os registros sem resenha:
   * resenhas escritas não somem por um clique (podem ser apagadas no Diário).
   */
  const dropUnreviewedLogs = (episodeId: string) => {
    setDiaryLogs((prev) => prev.filter((l) => l.episodeId !== episodeId || !!l.reviewText?.trim()));
  };

  const makeBulkDiaryEntry = (show: Show, suffix: string, code: string, title: string, text: string): WatchLog => ({
    id: `log-${suffix}-${Date.now()}`,
    episodeId: `${show.id}-${suffix}`,
    showId: show.id,
    showTitle: show.title,
    episodeCode: code,
    episodeTitle: title,
    posterUrl: show.posterUrl,
    watchedAt: toISODate(new Date()),
    reviewText: text,
    isRewatch: false,
  });

  // ---------------------------------------------------------------------------
  // Ações de "assistido": só mudam os episódios vistos (e o foco); o próximo
  // episódio e o progresso de cada série são recalculados automaticamente.
  // ---------------------------------------------------------------------------

  const handleToggleWatch = (episode: Episode, log: DiaryLogOptions = DEFAULT_LOG_OPTIONS()) => {
    const isNowWatched = !watchedEpisodes[episode.id];
    setWatchedEpisodes((prev) => {
      const next = { ...prev };
      if (isNowWatched) next[episode.id] = true;
      else delete next[episode.id];
      return next;
    });
    rememberEpisode(episode);

    if (isNowWatched && log.save) {
      const show = shows.find((s) => s.id === episode.showId);
      const entry = makeDiaryEntry(show, episode, { watchedAt: log.date, isRewatch: log.isRewatch });
      setDiaryLogs((prev) => [entry, ...prev]);
    } else if (!isNowWatched) {
      dropUnreviewedLogs(episode.id);
    }
  };

  // Desmarca um episódio sem depender do estado capturado (usado pelo "desfazer").
  const handleUnwatch = (episode: Episode) => {
    setWatchedEpisodes((prev) => {
      const next = { ...prev };
      delete next[episode.id];
      return next;
    });
    dropUnreviewedLogs(episode.id);
  };

  // Mark Entire Season as Watched
  const handleMarkSeasonWatched = (showId: string, seasonNum: number) => {
    const show = shows.find((s) => s.id === showId);
    if (!show) return;

    setWatchedEpisodes((prev) => {
      const next = { ...prev };
      getSeasonEpisodeIds(show, seasonNum).forEach((id) => (next[id] = true));
      return next;
    });
    updateShow(showId, { focusEpisodeId: undefined });

    const code = `T${seasonNum < 10 ? "0" + seasonNum : seasonNum}`;
    const entry = makeBulkDiaryEntry(
      show,
      `s${seasonNum}`,
      code,
      `Temporada ${seasonNum} Completa`,
      `Temporada ${seasonNum} inteira marcada como assistida.`
    );
    setDiaryLogs((logs) => [entry, ...logs]);
  };

  // Remove Show
  const handleRemoveShow = (showId: string) => {
    setShows((prev) => prev.filter((s) => s.id !== showId));
  };

  // Add Show from Search Modal
  const handleAddShow = (newShow: Show) => {
    // Séries recém-buscadas no TMDB já vêm atualizadas; as do catálogo demo sincronizam na próxima abertura.
    const show = newShow.id === String(newShow.tmdbId) ? { ...newShow, syncedAt: new Date().toISOString() } : newShow;
    setShows((prev) => [show, ...prev.filter((s) => s.id !== show.id)]);
  };

  // Delete Log from Diary
  const handleDeleteLog = (logId: string) => {
    setDiaryLogs((prev) => prev.filter((l) => l.id !== logId));
  };

  /**
   * Edita nota, comentário e spoiler de um registro do diário. Se for o registro
   * mais recente do episódio, a nota também vale como nota atual do episódio.
   */
  const handleUpdateLog = (logId: string, patch: Partial<Pick<WatchLog, "rating" | "reviewText" | "hasSpoilers">>) => {
    const log = diaryLogs.find((l) => l.id === logId);
    if (!log) return;
    setDiaryLogs((prev) => prev.map((l) => (l.id === logId ? { ...l, ...patch } : l)));
    const isLatest = diaryLogs.find((l) => l.episodeId === log.episodeId)?.id === logId;
    if (isLatest && "rating" in patch) {
      setUserRatings((prev) => {
        const next = { ...prev };
        if (patch.rating && patch.rating > 0) next[log.episodeId] = patch.rating;
        else delete next[log.episodeId];
        return next;
      });
    }
  };

  // Devolve um registro apagado à posição original (usado pelo "desfazer").
  const handleRestoreLog = (log: WatchLog, index: number) => {
    setDiaryLogs((prev) => {
      if (prev.some((l) => l.id === log.id)) return prev;
      const next = [...prev];
      next.splice(Math.min(index, next.length), 0, log);
      return next;
    });
  };

  // List Management
  const handleCreateList = (newList: UserList) => {
    setUserLists((prev) => [newList, ...prev]);
  };

  const handleDeleteList = (listId: string) => {
    setUserLists((prev) => prev.filter((l) => l.id !== listId));
  };

  const handleUpdateList = (listId: string, patch: Partial<Pick<UserList, "title" | "description" | "items">>) => {
    setUserLists((prev) => prev.map((l) => (l.id === listId ? { ...l, ...patch } : l)));
  };

  const currentProfile: UserProfile = {
    ...profile,
    totalMinutesWatched: dynamicStats.totalMinutesWatched,
    totalEpisodesWatched: dynamicStats.totalEpisodesWatched,
    totalShowsCompleted: dynamicStats.totalShowsCompleted,
  };

  const existingShowIds = shows.flatMap((s) => (s.tmdbId ? [s.id, String(s.tmdbId)] : [s.id]));

  return {
    shows,
    trackedShows,
    watchedEpisodes,
    diaryLogs,
    userLists,
    profile,
    setProfile,
    currentProfile,
    existingShowIds,
    reloadDataFromStorage,
    handleToggleWatch,
    handleUnwatch,
    handleMarkSeasonWatched,
    handleRemoveShow,
    handleAddShow,
    handleDeleteLog,
    handleUpdateLog,
    handleRestoreLog,
    handleCreateList,
    handleUpdateList,
    handleDeleteList,
  };
}

export type EpisodicState = ReturnType<typeof useEpisodicState>;

const EpisodicContext = createContext<EpisodicState | null>(null);

/**
 * Estado compartilhado por todas as páginas. Montado só no cliente (ver components/ClientRoot.tsx),
 * então o estado inicial vem direto do localStorage.
 */
export function EpisodicProvider({ children }: { children: React.ReactNode }) {
  const value = useEpisodicState();
  return <EpisodicContext.Provider value={value}>{children}</EpisodicContext.Provider>;
}

export function useEpisodic(): EpisodicState {
  const ctx = useContext(EpisodicContext);
  if (!ctx) throw new Error("useEpisodic precisa estar dentro de <EpisodicProvider>");
  return ctx;
}

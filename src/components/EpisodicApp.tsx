"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  EpisodeRef,
  buildPlaceholderEpisode,
  fetchEpisode,
  getAllEpisodeIds,
  getLastEpisodeRef,
  getPrevEpisodeRef,
  getSeasonEpisodeIds,
  isPlaceholderEpisode,
  makeEpisodeId,
  parseEpisodeId,
  toISODate,
  trackShow,
} from "@/lib/episodes";
import { Navbar } from "@/components/Navbar";
import { UpNextSection } from "@/components/UpNextSection";
import { CalendarSection } from "@/components/CalendarSection";
import { DiarySection } from "@/components/DiarySection";
import { ListsSection } from "@/components/ListsSection";
import { ProfileSection } from "@/components/ProfileSection";
import { EpisodeModal } from "@/components/EpisodeModal";
import { ShowDetailsModal } from "@/components/ShowDetailsModal";
import { SearchShowModal } from "@/components/SearchShowModal";


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

/**
 * App inteiro do Episodic. Renderizado só no cliente (ver app/page.tsx), então
 * o estado inicial pode vir direto do localStorage.
 */
export default function EpisodicApp() {
  const [activeTab, setActiveTab] = useState<string>("upnext");

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

  // Modal States
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [isEpisodeModalOpen, setIsEpisodeModalOpen] = useState<boolean>(false);
  // Guarda só o ID: a série exibida é sempre lida do estado atual.
  const [selectedShowId, setSelectedShowId] = useState<string | null>(null);
  const [isShowDetailsOpen, setIsShowDetailsOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

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

  const selectedShow = useMemo(
    () => trackedShows.find((s) => s.id === selectedShowId) ?? null,
    [trackedShows, selectedShowId]
  );

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

  // Desfaz o último episódio visto: ele volta a ser o próximo.
  const handleRewindEpisode = (showId: string) => {
    const show = trackedShows.find((s) => s.id === showId);
    if (!show) return;

    const current: EpisodeRef = { season: show.currentEpisode.seasonNumber, episode: show.currentEpisode.episodeNumber };
    const prev = show.completed ? getLastEpisodeRef(show) : getPrevEpisodeRef(show, current);
    if (!prev) return;

    const prevId = makeEpisodeId(show.id, prev.season, prev.episode);
    setWatchedEpisodes((w) => {
      const next = { ...w };
      delete next[prevId];
      return next;
    });
    dropUnreviewedLogs(prevId);
    updateShow(showId, { focusEpisodeId: prevId });
  };

  // "Focar no Radar": define a partir de qual episódio seguir.
  const handleSetCurrentEpisode = (showId: string, episode: Episode) => {
    rememberEpisode(episode);
    updateShow(showId, { focusEpisodeId: episode.id });
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

  // Mark Entire Show as Watched
  const handleMarkShowWatched = (showId: string) => {
    const show = shows.find((s) => s.id === showId);
    if (!show) return;

    setWatchedEpisodes((prev) => {
      const next = { ...prev };
      getAllEpisodeIds(show).forEach((id) => (next[id] = true));
      return next;
    });
    updateShow(showId, { focusEpisodeId: undefined });

    const entry = makeBulkDiaryEntry(
      show,
      "full",
      "COMPLETA",
      `Todos os ${show.totalEpisodes} episódios`,
      "Série completa assistida e arquivada com sucesso."
    );
    setDiaryLogs((logs) => [entry, ...logs]);
  };

  // Remove Show
  const handleRemoveShow = (showId: string) => {
    setShows((prev) => prev.filter((s) => s.id !== showId));
  };

  // Rating Change (0 remove a nota)
  const handleSetRating = (rating: number) => {
    if (!selectedEpisode) return;
    const id = selectedEpisode.id;
    setUserRatings((prev) => {
      const next = { ...prev };
      if (rating > 0) next[id] = rating;
      else delete next[id];
      return next;
    });
    // A nota vale para o registro mais recente do episódio (rewatches anteriores mantêm a sua).
    setDiaryLogs((prev) => {
      const latest = prev.findIndex((l) => l.episodeId === id);
      return prev.map((l, i) => (i === latest ? { ...l, rating: rating > 0 ? rating : undefined } : l));
    });
  };

  // Add Review
  const handleAddReview = (content: string, hasSpoilers: boolean, log: DiaryLogOptions) => {
    if (!selectedEpisode) return;
    const episode = selectedEpisode;

    const newReview: Review = {
      id: `rev-${Date.now()}`,
      episodeId: selectedEpisode.id,
      userName: profile.name,
      userAvatar: profile.avatarUrl,
      userHandle: profile.handle,
      rating: userRatings[selectedEpisode.id] || 0,
      content,
      hasSpoilers,
      createdAt: "Agora",
      likesCount: 0,
    };

    setReviewsMap((prev) => ({
      ...prev,
      [selectedEpisode.id]: [newReview, ...(prev[selectedEpisode.id] || [])],
    }));

    // Resenha implica ter assistido. O registro no diário é feito abaixo.
    if (!watchedEpisodes[episode.id]) {
      handleToggleWatch(episode, { ...log, save: false });
    }

    if (log.save) {
      const show = shows.find((s) => s.id === episode.showId);
      setDiaryLogs((prev) => {
        // Se já existe um registro do mesmo dia sem resenha, a resenha entra nele.
        const idx = prev.findIndex(
          (l) =>
            l.episodeId === episode.id &&
            l.watchedAt === log.date &&
            !!l.isRewatch === log.isRewatch &&
            !l.reviewText?.trim()
        );
        if (idx >= 0) {
          return prev.map((l, i) => (i === idx ? { ...l, reviewText: content, hasSpoilers } : l));
        }
        const entry = makeDiaryEntry(show, episode, {
          watchedAt: log.date,
          isRewatch: log.isRewatch,
          reviewText: content,
          hasSpoilers,
        });
        return [entry, ...prev];
      });
    }
  };

  // Registra mais uma sessão de um episódio já visto (rewatch), sem mexer no progresso.
  const handleLogWatch = (episode: Episode, log: DiaryLogOptions) => {
    const show = shows.find((s) => s.id === episode.showId);
    const entry = makeDiaryEntry(show, episode, { watchedAt: log.date, isRewatch: log.isRewatch });
    setDiaryLogs((prev) => [entry, ...prev]);
  };

  // Like / unlike Review
  const handleLikeReview = (reviewId: string) => {
    setReviewsMap((prev) => {
      const updated: Record<string, Review[]> = {};
      Object.entries(prev).forEach(([epId, list]) => {
        updated[epId] = list.map((r) =>
          r.id === reviewId
            ? { ...r, userLiked: !r.userLiked, likesCount: Math.max(0, r.likesCount + (r.userLiked ? -1 : 1)) }
            : r
        );
      });
      return updated;
    });
  };

  // Add Show from Search Modal
  const handleAddShow = (newShow: Show) => {
    setShows((prev) => [newShow, ...prev.filter((s) => s.id !== newShow.id)]);
  };

  // Delete Log from Diary
  const handleDeleteLog = (logId: string) => {
    setDiaryLogs((prev) => prev.filter((l) => l.id !== logId));
  };

  const openEpisode = (ep: Episode) => {
    setSelectedEpisode(ep);
    setIsEpisodeModalOpen(true);
  };

  const openShowDetails = (show: Show) => {
    setSelectedShowId(show.id);
    setIsShowDetailsOpen(true);
  };

  // Open Episode Modal by IDs (a partir do diário)
  const handleSelectEpisodeById = (episodeId: string, showId: string) => {
    const show = trackedShows.find((s) => s.id === showId);
    const cached = episodeCache[episodeId];
    if (cached) {
      openEpisode(cached);
      return;
    }

    const parsed = parseEpisodeId(episodeId);
    if (!parsed) {
      // Entradas de temporada/série inteira: abre a ficha da série.
      if (show) openShowDetails(show);
      return;
    }

    if (!show) return;
    const placeholder = buildPlaceholderEpisode(show, parsed);
    openEpisode(placeholder);
    fetchEpisode(show, parsed).then((real) => {
      if (real) rememberEpisode(real);
    });
  };

  // List Management
  const handleCreateList = (newList: UserList) => {
    setUserLists((prev) => [newList, ...prev]);
  };

  const handleDeleteList = (listId: string) => {
    setUserLists((prev) => prev.filter((l) => l.id !== listId));
  };

  const handleToggleLikeList = (listId: string) => {
    setUserLists((prev) =>
      prev.map((l) =>
        l.id === listId
          ? { ...l, userLiked: !l.userLiked, likesCount: l.likesCount + (l.userLiked ? -1 : 1) }
          : l
      )
    );
  };

  const currentProfile: UserProfile = {
    ...profile,
    totalMinutesWatched: dynamicStats.totalMinutesWatched,
    totalEpisodesWatched: dynamicStats.totalEpisodesWatched,
    totalShowsCompleted: dynamicStats.totalShowsCompleted,
  };

  const totalReviewsCount = Object.values(reviewsMap).flat().length;
  const existingShowIds = shows.flatMap((s) => (s.tmdbId ? [s.id, String(s.tmdbId)] : [s.id]));

  return (
    <div className="min-h-screen flex flex-col bg-[#14181c] text-[#e1e7ed] selection:bg-[#00e054] selection:text-black">
      
      {/* Top Header Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalMinutesWatched={currentProfile.totalMinutesWatched}
        onOpenSearch={() => setIsSearchOpen(true)}
        userName={currentProfile.name.split(" ")[0]}
        userAvatar={currentProfile.avatarUrl}
      />

      {/* Main Tab Views */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-8">
        {activeTab === "upnext" && (
          <UpNextSection
            shows={trackedShows}
            onSelectEpisode={openEpisode}
            onToggleWatch={handleToggleWatch}
            onMarkSeasonWatched={handleMarkSeasonWatched}
            onMarkShowWatched={handleMarkShowWatched}
            onRemoveShow={handleRemoveShow}
            onOpenSearch={() => setIsSearchOpen(true)}
            onOpenShowDetails={openShowDetails}
            onRewindEpisode={handleRewindEpisode}
          />
        )}

        {activeTab === "calendar" && (
          <CalendarSection
            shows={trackedShows}
            watchedEpisodes={watchedEpisodes}
            onSelectEpisode={openEpisode}
            onToggleWatch={handleToggleWatch}
            onOpenSearch={() => setIsSearchOpen(true)}
            onOpenShowDetails={openShowDetails}
          />
        )}

        {activeTab === "diary" && (
          <DiarySection
            logs={diaryLogs}
            onDeleteLog={handleDeleteLog}
            onSelectEpisodeById={handleSelectEpisodeById}
          />
        )}

        {activeTab === "lists" && (
          <ListsSection
            lists={userLists}
            shows={trackedShows}
            onCreateList={handleCreateList}
            onDeleteList={handleDeleteList}
            onToggleLikeList={handleToggleLikeList}
          />
        )}

        {activeTab === "profile" && (
          <ProfileSection
            profile={currentProfile}
            shows={trackedShows}
            diaryLogs={diaryLogs}
            totalReviewsCount={totalReviewsCount}
            onUpdateProfile={setProfile}
            onRefreshAllData={reloadDataFromStorage}
          />
        )}
      </main>

      {/* Episode Modal with Anti-Spoiler & Reviews */}
      {selectedEpisode && (
        <EpisodeModal
          key={selectedEpisode.id}
          episode={episodeCache[selectedEpisode.id] ?? selectedEpisode}
          isOpen={isEpisodeModalOpen}
          isWatched={!!watchedEpisodes[selectedEpisode.id]}
          userRating={userRatings[selectedEpisode.id] || 0}
          reviews={reviewsMap[selectedEpisode.id] || []}
          onClose={() => setIsEpisodeModalOpen(false)}
          onToggleWatch={(log) => handleToggleWatch(selectedEpisode, log)}
          onLogWatch={(log) => handleLogWatch(selectedEpisode, log)}
          onMarkSeasonWatched={() =>
            handleMarkSeasonWatched(selectedEpisode.showId, selectedEpisode.seasonNumber)
          }
          onMarkShowWatched={() => handleMarkShowWatched(selectedEpisode.showId)}
          onSetRating={handleSetRating}
          onAddReview={handleAddReview}
          onLikeReview={handleLikeReview}
        />
      )}

      {/* Show Details & Season Browser Modal */}
      {selectedShow && isShowDetailsOpen && (
        <ShowDetailsModal
          key={selectedShow.id}
          show={selectedShow}
          isOpen={isShowDetailsOpen}
          watchedEpisodes={watchedEpisodes}
          onClose={() => setIsShowDetailsOpen(false)}
          onToggleWatch={handleToggleWatch}
          onSelectEpisode={openEpisode}
          onSetCurrentEpisode={handleSetCurrentEpisode}
          onMarkSeasonWatched={handleMarkSeasonWatched}
          onMarkShowWatched={handleMarkShowWatched}
        />
      )}

      {/* TMDB Live Search & Add Show Modal */}
      <SearchShowModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onAddShow={handleAddShow}
        existingShowIds={existingShowIds}
      />

      {/* Footer */}
      <footer className="border-t border-[#242d36] py-6 px-4 text-center text-xs text-[#8b9baa]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>
            EPISODIC — A elegância do Letterboxd com o poder de tracking do TV Time.
          </span>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab("upnext")}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Radar
            </button>
            <span>•</span>
            <button
              onClick={() => setActiveTab("calendar")}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Calendário
            </button>
            <span>•</span>
            <button
              onClick={() => setActiveTab("diary")}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Diário
            </button>
            <span>•</span>
            <button
              onClick={() => setActiveTab("lists")}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Listas
            </button>
            <span>•</span>
            <button
              onClick={() => setActiveTab("profile")}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Perfil
            </button>
          </div>
        </div>
      </footer>

    </div>
  );
}

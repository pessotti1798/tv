"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Episode, Show, WatchLog, Review, UserProfile, UserList } from "@/types";
import {
  INITIAL_SHOWS,
  INITIAL_REVIEWS,
  INITIAL_USER_PROFILE,
  INITIAL_LISTS,
  DEMO_WATCHED,
  DEMO_RATINGS,
  DEMO_DIARY,
} from "@/lib/catalog";
import { STORAGE_KEYS, getFromStorage, saveToStorage, migrateLegacyData } from "@/lib/storage";
import {
  EpisodeRef,
  buildPlaceholderEpisode,
  compareRefs,
  fetchEpisode,
  formatWatchDate,
  getAllEpisodeIds,
  getLastEpisodeRef,
  getNextEpisodeRef,
  getPrevEpisodeRef,
  getSeasonEpisodeIds,
  getSeasonEpisodeCount,
  makeEpisodeId,
  parseEpisodeId,
  withProgress,
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

const refOf = (ep: Episode): EpisodeRef => ({ season: ep.seasonNumber, episode: ep.episodeNumber });

export default function Home() {
  const [activeTab, setActiveTab] = useState<string>("upnext");
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // Core Data States
  const [shows, setShows] = useState<Show[]>([]);
  const [watchedEpisodes, setWatchedEpisodes] = useState<Record<string, boolean>>({});
  const [userRatings, setUserRatings] = useState<Record<string, number>>({});
  const [reviewsMap, setReviewsMap] = useState<Record<string, Review[]>>(INITIAL_REVIEWS);
  const [diaryLogs, setDiaryLogs] = useState<WatchLog[]>([]);
  const [userLists, setUserLists] = useState<UserList[]>([]);
  const [profile, setProfile] = useState<UserProfile>(INITIAL_USER_PROFILE);

  // Modal States
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [isEpisodeModalOpen, setIsEpisodeModalOpen] = useState<boolean>(false);
  // Guarda só o ID: a série exibida é sempre lida do estado atual.
  const [selectedShowId, setSelectedShowId] = useState<string | null>(null);
  const [isShowDetailsOpen, setIsShowDetailsOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  // Load all data from storage
  const reloadDataFromStorage = useCallback(() => {
    try {
      migrateLegacyData();
      setShows(getFromStorage<Show[]>(STORAGE_KEYS.SHOWS, INITIAL_SHOWS));
      setWatchedEpisodes(getFromStorage<Record<string, boolean>>(STORAGE_KEYS.WATCHED, DEMO_WATCHED));
      setUserRatings(getFromStorage<Record<string, number>>(STORAGE_KEYS.RATINGS, DEMO_RATINGS));
      setDiaryLogs(getFromStorage<WatchLog[]>(STORAGE_KEYS.DIARY, DEMO_DIARY));
      setReviewsMap(getFromStorage<Record<string, Review[]>>(STORAGE_KEYS.REVIEWS, INITIAL_REVIEWS));
      setUserLists(getFromStorage<UserList[]>(STORAGE_KEYS.LISTS, INITIAL_LISTS));
      setProfile(getFromStorage<UserProfile>(STORAGE_KEYS.PROFILE, INITIAL_USER_PROFILE));
    } catch (err) {
      console.error("Erro ao carregar dados do Episodic:", err);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    reloadDataFromStorage();
  }, [reloadDataFromStorage]);

  // Persistência: cada fatia do estado é salva quando muda (depois do carregamento).
  useEffect(() => { if (isLoaded) saveToStorage(STORAGE_KEYS.SHOWS, shows); }, [isLoaded, shows]);
  useEffect(() => { if (isLoaded) saveToStorage(STORAGE_KEYS.WATCHED, watchedEpisodes); }, [isLoaded, watchedEpisodes]);
  useEffect(() => { if (isLoaded) saveToStorage(STORAGE_KEYS.RATINGS, userRatings); }, [isLoaded, userRatings]);
  useEffect(() => { if (isLoaded) saveToStorage(STORAGE_KEYS.DIARY, diaryLogs); }, [isLoaded, diaryLogs]);
  useEffect(() => { if (isLoaded) saveToStorage(STORAGE_KEYS.REVIEWS, reviewsMap); }, [isLoaded, reviewsMap]);
  useEffect(() => { if (isLoaded) saveToStorage(STORAGE_KEYS.LISTS, userLists); }, [isLoaded, userLists]);
  useEffect(() => { if (isLoaded) saveToStorage(STORAGE_KEYS.PROFILE, profile); }, [isLoaded, profile]);

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
      minutes += show?.currentEpisode?.runtime || 50;
    });

    return {
      totalMinutesWatched: minutes,
      totalEpisodesWatched: totalEps,
      totalShowsCompleted: shows.filter((s) => s.completed).length,
    };
  }, [watchedEpisodes, shows]);

  const selectedShow = useMemo(
    () => shows.find((s) => s.id === selectedShowId) ?? null,
    [shows, selectedShowId]
  );

  // ---------------------------------------------------------------------------
  // Helpers de atualização
  // ---------------------------------------------------------------------------

  /** Substitui uma série na lista recalculando o progresso. */
  const replaceShow = (updated: Show, watched: Record<string, boolean>) => {
    setShows((prev) => prev.map((s) => (s.id === updated.id ? withProgress(updated, watched) : s)));
  };

  /**
   * Troca o episódio atual por um provisório e, em seguida, busca os dados reais
   * no TMDB (título, sinopse, imagem). Só aplica se o usuário não tiver mudado
   * o episódio atual nesse meio-tempo.
   */
  const setCurrentEpisodeRef = (show: Show, ref: EpisodeRef, watched: Record<string, boolean>, known?: Episode) => {
    const episode = known ?? buildPlaceholderEpisode(show, ref);
    replaceShow({ ...show, completed: false, currentEpisode: episode }, watched);
    if (known) return;
    fetchEpisode(show, ref).then((real) => {
      if (!real) return;
      setShows((prev) =>
        prev.map((s) =>
          s.id === show.id && s.currentEpisode.id === episode.id ? { ...s, currentEpisode: real } : s
        )
      );
    });
  };

  const markCompleted = (show: Show, watched: Record<string, boolean>) => {
    replaceShow({ ...show, completed: true }, watched);
  };

  const makeDiaryEntry = (show: Show | undefined, episode: Episode): WatchLog => ({
    id: `log-${Date.now()}-${episode.id}`,
    episodeId: episode.id,
    showId: show?.id ?? episode.showId,
    showTitle: show?.title ?? episode.showTitle,
    episodeCode: episode.code,
    episodeTitle: episode.title,
    posterUrl: show?.posterUrl ?? episode.stillUrl,
    watchedAt: formatWatchDate(),
    rating: userRatings[episode.id] || undefined,
    isRewatch: false,
  });

  // ---------------------------------------------------------------------------
  // Ações de "assistido"
  // ---------------------------------------------------------------------------

  // Marca/desmarca um episódio qualquer e ajusta o próximo episódio da série.
  const handleToggleWatch = (episode: Episode) => {
    const isNowWatched = !watchedEpisodes[episode.id];
    const newWatched = { ...watchedEpisodes };
    if (isNowWatched) newWatched[episode.id] = true;
    else delete newWatched[episode.id];
    setWatchedEpisodes(newWatched);

    const show = shows.find((s) => s.id === episode.showId);

    if (isNowWatched) {
      setDiaryLogs((prev) => [makeDiaryEntry(show, episode), ...prev]);
    } else {
      setDiaryLogs((prev) => prev.filter((l) => l.episodeId !== episode.id));
    }

    if (!show) return;
    const epRef = refOf(episode);
    const currentRef = refOf(show.currentEpisode);

    if (isNowWatched && !show.completed && compareRefs(epRef, currentRef) >= 0) {
      // Assistiu o episódio atual (ou um posterior): avança para o seguinte.
      const next = getNextEpisodeRef(show, epRef);
      if (next) setCurrentEpisodeRef(show, next, newWatched);
      else markCompleted(show, newWatched);
    } else if (!isNowWatched && (show.completed || compareRefs(epRef, currentRef) < 0)) {
      // Desmarcou um episódio anterior: ele volta a ser o próximo a assistir.
      setCurrentEpisodeRef(show, epRef, newWatched, { ...episode, showTitle: show.title, network: show.network });
    } else {
      replaceShow(show, newWatched);
    }
  };

  // Rewind Episode (desfaz o último episódio visto)
  const handleRewindEpisode = (showId: string) => {
    const show = shows.find((s) => s.id === showId);
    if (!show) return;

    const prev = show.completed ? getLastEpisodeRef(show) : getPrevEpisodeRef(show, refOf(show.currentEpisode));
    if (!prev) return;

    const prevId = makeEpisodeId(show.id, prev.season, prev.episode);
    const newWatched = { ...watchedEpisodes };
    delete newWatched[prevId];
    setWatchedEpisodes(newWatched);
    setDiaryLogs((logs) => logs.filter((l) => l.episodeId !== prevId));
    setCurrentEpisodeRef(show, prev, newWatched);
  };

  // Set specific episode as current in Radar
  const handleSetCurrentEpisode = (showId: string, episode: Episode) => {
    const show = shows.find((s) => s.id === showId);
    if (!show) return;
    setCurrentEpisodeRef(show, refOf(episode), watchedEpisodes, episode);
  };

  // Mark Entire Season as Watched
  const handleMarkSeasonWatched = (showId: string, seasonNum: number) => {
    const show = shows.find((s) => s.id === showId);
    if (!show) return;

    const newWatched = { ...watchedEpisodes };
    getSeasonEpisodeIds(show, seasonNum).forEach((id) => (newWatched[id] = true));
    setWatchedEpisodes(newWatched);

    // Só avança se o episódio atual estiver nesta temporada ou antes dela.
    if (!show.completed && show.currentEpisode.seasonNumber <= seasonNum) {
      const lastOfSeason = { season: seasonNum, episode: getSeasonEpisodeCount(show, seasonNum) };
      const next = getNextEpisodeRef(show, lastOfSeason);
      if (next) setCurrentEpisodeRef(show, next, newWatched);
      else markCompleted(show, newWatched);
    } else {
      replaceShow(show, newWatched);
    }

    const seasonEntry: WatchLog = {
      id: `log-season-${Date.now()}`,
      episodeId: `${showId}-s${seasonNum}`,
      showId: show.id,
      showTitle: show.title,
      episodeCode: `T${seasonNum < 10 ? "0" + seasonNum : seasonNum}`,
      episodeTitle: `Temporada ${seasonNum} Completa`,
      posterUrl: show.posterUrl,
      watchedAt: formatWatchDate(),
      reviewText: `Temporada ${seasonNum} inteira marcada como assistida.`,
      isRewatch: false,
    };
    setDiaryLogs((logs) => [seasonEntry, ...logs]);
  };

  // Mark Entire Show as Watched
  const handleMarkShowWatched = (showId: string) => {
    const show = shows.find((s) => s.id === showId);
    if (!show) return;

    const newWatched = { ...watchedEpisodes };
    getAllEpisodeIds(show).forEach((id) => (newWatched[id] = true));
    setWatchedEpisodes(newWatched);
    markCompleted(show, newWatched);

    const showEntry: WatchLog = {
      id: `log-show-${Date.now()}`,
      episodeId: `${showId}-full`,
      showId: show.id,
      showTitle: show.title,
      episodeCode: "COMPLETA",
      episodeTitle: `Todos os ${show.totalEpisodes} episódios`,
      posterUrl: show.posterUrl,
      watchedAt: formatWatchDate(),
      reviewText: "Série completa assistida e arquivada com sucesso.",
      isRewatch: false,
    };
    setDiaryLogs((logs) => [showEntry, ...logs]);
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
    setDiaryLogs((prev) =>
      prev.map((l) => (l.episodeId === id ? { ...l, rating: rating > 0 ? rating : undefined } : l))
    );
  };

  // Add Review
  const handleAddReview = (content: string, hasSpoilers: boolean) => {
    if (!selectedEpisode) return;

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

    // Ensure episode is marked as watched
    if (!watchedEpisodes[selectedEpisode.id]) {
      handleToggleWatch(selectedEpisode);
    }
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
    const show = shows.find((s) => s.id === showId);
    if (show?.currentEpisode?.id === episodeId) {
      openEpisode(show.currentEpisode);
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
      if (real) setSelectedEpisode((cur) => (cur?.id === real.id ? real : cur));
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

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#14181c] flex items-center justify-center text-xs text-[#8b9baa]">
        Carregando Episodic...
      </div>
    );
  }

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
            shows={shows}
            watchedEpisodes={watchedEpisodes}
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
            shows={shows}
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
            shows={shows}
            onCreateList={handleCreateList}
            onDeleteList={handleDeleteList}
            onToggleLikeList={handleToggleLikeList}
          />
        )}

        {activeTab === "profile" && (
          <ProfileSection
            profile={currentProfile}
            shows={shows}
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
          episode={selectedEpisode}
          isOpen={isEpisodeModalOpen}
          isWatched={!!watchedEpisodes[selectedEpisode.id]}
          userRating={userRatings[selectedEpisode.id] || 0}
          reviews={reviewsMap[selectedEpisode.id] || []}
          onClose={() => setIsEpisodeModalOpen(false)}
          onToggleWatch={() => handleToggleWatch(selectedEpisode)}
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

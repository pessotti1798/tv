"use client";

import React, { useMemo, useState } from "react";
import { Episode, Show } from "@/types";
import { buildPlaceholderEpisode, fetchEpisode, parseEpisodeId } from "@/lib/episodes";
import { useEpisodic } from "@/components/EpisodicProvider";
import { Navbar } from "@/components/Navbar";
import { UpNextSection } from "@/components/UpNextSection";
import { CalendarSection } from "@/components/CalendarSection";
import { DiarySection } from "@/components/DiarySection";
import { ListsSection } from "@/components/ListsSection";
import { ProfileSection } from "@/components/ProfileSection";
import { EpisodeModal } from "@/components/EpisodeModal";
import { ShowDetailsModal } from "@/components/ShowDetailsModal";
import { SearchShowModal } from "@/components/SearchShowModal";

/** Interface original (abas Radar, Calendário, Diário, Listas e Perfil). */
export default function EpisodicApp() {
  // A aba inicial pode vir da URL (?aba=diary), usada pelos atalhos da página nova.
  const [activeTab, setActiveTab] = useState<string>(
    () => new URLSearchParams(window.location.search).get("aba") ?? "upnext"
  );
  const {
    trackedShows,
    watchedEpisodes,
    userRatings,
    reviewsMap,
    diaryLogs,
    userLists,
    setProfile,
    episodeCache,
    currentProfile,
    totalReviewsCount,
    existingShowIds,
    reloadDataFromStorage,
    rememberEpisode,
    handleToggleWatch,
    handleRewindEpisode,
    handleSetCurrentEpisode,
    handleMarkSeasonWatched,
    handleMarkShowWatched,
    handleRemoveShow,
    handleSetRating,
    handleAddReview,
    handleLogWatch,
    handleLikeReview,
    handleAddShow,
    handleDeleteLog,
    handleCreateList,
    handleDeleteList,
    handleToggleLikeList,
  } = useEpisodic();

  // Modal States
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [isEpisodeModalOpen, setIsEpisodeModalOpen] = useState<boolean>(false);
  // Guarda só o ID: a série exibida é sempre lida do estado atual.
  const [selectedShowId, setSelectedShowId] = useState<string | null>(null);
  const [isShowDetailsOpen, setIsShowDetailsOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  const selectedShow = useMemo(
    () => trackedShows.find((s) => s.id === selectedShowId) ?? null,
    [trackedShows, selectedShowId]
  );

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
          onSetRating={(rating) => handleSetRating(selectedEpisode, rating)}
          onAddReview={(content, spoilers, log) => handleAddReview(selectedEpisode, content, spoilers, log)}
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

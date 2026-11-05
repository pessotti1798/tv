"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Episode, SeasonInfo, TrackedShow } from "@/types";
import { buildPlaceholderEpisode, fetchSeason, getSeasonEpisodeCount, getSeasonNumbers } from "@/lib/episodes";
import { X, Check, CheckCheck, Loader2 } from "lucide-react";

interface ShowDetailsModalProps {
  show: TrackedShow | null;
  isOpen: boolean;
  watchedEpisodes: Record<string, boolean>;
  onClose: () => void;
  onToggleWatch: (episode: Episode) => void;
  onSelectEpisode: (episode: Episode) => void;
  onSetCurrentEpisode: (showId: string, episode: Episode) => void;
  onMarkSeasonWatched: (showId: string, seasonNum: number) => void;
  onMarkShowWatched: (showId: string) => void;
}

export const ShowDetailsModal: React.FC<ShowDetailsModalProps> = ({
  show,
  isOpen,
  watchedEpisodes,
  onClose,
  onToggleWatch,
  onSelectEpisode,
  onSetCurrentEpisode,
  onMarkSeasonWatched,
  onMarkShowWatched,
}) => {
  // O modal é montado de novo para cada série (key no pai), então o estado
  // inicial já parte da temporada do episódio atual.
  const [activeSeasonNumber, setActiveSeasonNumber] = useState<number>(
    show?.currentEpisode?.seasonNumber || 1
  );
  const [seasonData, setSeasonData] = useState<SeasonInfo | null>(null);
  const [expandedEpisodeId, setExpandedEpisodeId] = useState<string | null>(null);

  const showId = show?.id;
  // Carregando enquanto os dados exibidos não forem da temporada selecionada.
  const loadingSeason = seasonData?.seasonNumber !== activeSeasonNumber;

  // Fetch season episodes on demand
  useEffect(() => {
    if (!show || !isOpen) return;

    let isMounted = true;

    fetchSeason(show, activeSeasonNumber).then((season) => {
      if (!isMounted) return;
      if (season?.episodes?.length) {
        setSeasonData(season);
      } else {
        // Sem TMDB (sem chave ou série local): monta a temporada com a contagem conhecida.
        const count = getSeasonEpisodeCount(show, activeSeasonNumber);
        const episodes: Episode[] = Array.from({ length: count }, (_, idx) => {
          const ref = { season: activeSeasonNumber, episode: idx + 1 };
          const isCurrent =
            show.currentEpisode?.seasonNumber === ref.season &&
            show.currentEpisode?.episodeNumber === ref.episode;
          return isCurrent ? show.currentEpisode : buildPlaceholderEpisode(show, ref);
        });
        setSeasonData({
          seasonNumber: activeSeasonNumber,
          name: `Temporada ${activeSeasonNumber}`,
          episodeCount: episodes.length,
          episodes,
        });
      }
    });

    return () => {
      isMounted = false;
    };
    // `show` muda a cada episódio marcado; recarregar só quando a série/temporada mudar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showId, activeSeasonNumber, isOpen]);

  if (!isOpen || !show) return null;

  const seasonsList = getSeasonNumbers(show);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-6 overflow-y-auto animate-fadeIn">
      <div className="bg-[#1b2228] border border-[#2c3642] w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl my-auto transition-all max-h-[92vh] flex flex-col">
        
        {/* Header Hero */}
        <div className="relative h-60 sm:h-72 w-full overflow-hidden shrink-0">
          <Image fill sizes="(max-width: 896px) 100vw, 896px" loading="eager"
            src={show.backdropUrl || show.posterUrl}
            alt={show.title}
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1b2228] via-[#1b2228]/60 to-transparent" />
          
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center transition-colors cursor-pointer z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Show Info Overlay */}
          <div className="absolute bottom-4 left-6 right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-[#00e054] text-black">
                  {show.network}
                </span>
                <span className="text-xs text-[#8b9baa] font-mono">
                  {show.firstAirYear} • {show.totalSeasons} Temporadas • {show.totalEpisodes} Episódios
                </span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight">
                {show.title}
              </h1>
            </div>

            {/* Batch actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => onMarkShowWatched(show.id)}
                className="px-3 py-1.5 rounded-xl bg-[#242f38] hover:bg-[#2c3642] text-xs font-semibold text-[#ffaa00] transition-colors border border-[#2c3642] flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Marcar Série Toda</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Overview & Progress Bar */}
          <div className="space-y-3 bg-[#14181c] p-4 rounded-xl border border-[#2c3642]">
            <p className="text-xs sm:text-sm text-[#8b9baa] leading-relaxed">
              {show.overview}
            </p>
            <div className="pt-2 border-t border-[#242d36] flex items-center justify-between text-xs">
              <span className="text-[#8b9baa]">Seu Progresso: <strong className="text-white">{show.progressText}</strong></span>
              <span className="text-[#00e054] font-bold">{show.progressPercent}% Concluído</span>
            </div>
          </div>

          {/* Season Selector Tabs */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#242d36]">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
                {seasonsList.map((sNum) => (
                  <button
                    key={sNum}
                    onClick={() => setActiveSeasonNumber(sNum)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      activeSeasonNumber === sNum
                        ? "bg-[#00e054] text-black shadow-sm"
                        : "bg-[#14181c] text-[#8b9baa] hover:text-white border border-[#2c3642]"
                    }`}
                  >
                    Temporada {sNum}
                  </button>
                ))}
              </div>

              <button
                onClick={() => onMarkSeasonWatched(show.id, activeSeasonNumber)}
                className="px-3 py-1.5 rounded-lg bg-[#14181c] hover:bg-[#242f38] text-xs font-medium text-[#00e054] transition-colors border border-[#2c3642] shrink-0 flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Marcar Temporada {activeSeasonNumber}</span>
              </button>
            </div>

            {/* Episodes List */}
            {loadingSeason ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-[#8b9baa]">
                <Loader2 className="w-6 h-6 animate-spin text-[#00e054]" />
                <span className="text-xs">Carregando episódios da Temporada {activeSeasonNumber}...</span>
              </div>
            ) : (
              <div className="space-y-2.5">
                {seasonData?.episodes?.map((ep) => {
                  const isWatched = !!watchedEpisodes[ep.id];
                  const isCurrent = show.currentEpisode?.id === ep.id;
                  const isExpanded = expandedEpisodeId === ep.id;

                  return (
                    <div
                      key={ep.id}
                      className={`p-3 rounded-xl border transition-all ${
                        isCurrent
                          ? "bg-[#1f2a33] border-[#00e054]/50 shadow-sm"
                          : "bg-[#14181c] border-[#2c3642] hover:border-[#384656]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        {/* Thumbnail & Title */}
                        <div
                          className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                          onClick={() => setExpandedEpisodeId(isExpanded ? null : ep.id)}
                        >
                          <div className="relative w-16 h-10 rounded-md overflow-hidden bg-[#242f38] shrink-0">
                            <Image fill sizes="64px"
                              src={ep.stillUrl || show.posterUrl}
                              alt={ep.title}
                              className="w-full h-full object-cover"
                            />
                            {isWatched && (
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <Check className="w-4 h-4 text-[#00e054] stroke-[3]" />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-[#00e054]">
                                {ep.code}
                              </span>
                              <span className="text-xs font-bold text-white truncate">
                                {ep.title}
                              </span>
                              {isCurrent && (
                                <span className="text-[10px] bg-[#00e054]/20 text-[#00e054] border border-[#00e054]/40 px-1.5 py-0.2 rounded font-semibold uppercase">
                                  Atual no Radar
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-[#687684] mt-0.5">
                              <span>{ep.runtime} min</span>
                              <span>•</span>
                              <span>{ep.airDate}</span>
                              {ep.averageRating > 0 && (
                                <>
                                  <span>•</span>
                                  <span className="text-[#ffaa00]">★ {ep.averageRating}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* O próximo episódio é sempre um não visto, então só esses podem receber foco. */}
                          {!isCurrent && !isWatched && (
                            <button
                              onClick={() => onSetCurrentEpisode(show.id, ep)}
                              className="px-2.5 py-1 rounded-md text-[11px] text-[#8b9baa] hover:text-white hover:bg-[#242f38] transition-colors cursor-pointer"
                              title="Definir como próximo episódio a assistir no Radar"
                            >
                              Focar no Radar
                            </button>
                          )}

                          <button
                            onClick={() => onSelectEpisode(ep)}
                            className="px-2.5 py-1 rounded-md text-[11px] bg-[#242f38] hover:bg-[#2c3642] text-white transition-colors cursor-pointer"
                          >
                            Resenhas
                          </button>

                          <button
                            onClick={() => onToggleWatch(ep)}
                            className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                              isWatched
                                ? "bg-[#00e054] text-black hover:bg-[#00c749]"
                                : "bg-[#242f38] text-[#8b9baa] hover:text-white hover:bg-[#2c3642]"
                            }`}
                            title={isWatched ? "Desmarcar visto" : "Marcar como visto"}
                          >
                            <Check className="w-4 h-4 stroke-[2.5]" />
                          </button>
                        </div>
                      </div>

                      {/* Expandable Overview & Credits */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-[#242d36] text-xs text-[#8b9baa] space-y-1.5 animate-fadeIn">
                          <p className="leading-relaxed">{ep.overview}</p>
                          {(ep.director || ep.guestStars?.length) && (
                            <div className="text-[11px] text-[#687684] pt-1">
                              {ep.director && <span>Direção: {ep.director} </span>}
                              {ep.guestStars && ep.guestStars.length > 0 && (
                                <span>• Elenco Convidado: {ep.guestStars.join(", ")}</span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

"use client";

import React, { useState, useMemo } from "react";
import { Show, Episode } from "@/types";
import { Check, ArrowRight, Plus, MoreVertical, CheckCheck, Trash2, Sparkles, Layers, RotateCcw } from "lucide-react";

interface UpNextSectionProps {
  shows: Show[];
  watchedEpisodes: Record<string, boolean>;
  onSelectEpisode: (episode: Episode) => void;
  onToggleWatch: (episode: Episode) => void;
  onMarkSeasonWatched: (showId: string, seasonNum: number) => void;
  onMarkShowWatched: (showId: string) => void;
  onRemoveShow: (showId: string) => void;
  onOpenSearch: () => void;
  onOpenShowDetails: (show: Show) => void;
  onRewindEpisode: (showId: string) => void;
}

export const UpNextSection: React.FC<UpNextSectionProps> = ({
  shows,
  watchedEpisodes,
  onSelectEpisode,
  onToggleWatch,
  onMarkSeasonWatched,
  onMarkShowWatched,
  onRemoveShow,
  onOpenSearch,
  onOpenShowDetails,
  onRewindEpisode,
}) => {
  const [openMenuShowId, setOpenMenuShowId] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<string>("recent");

  const toggleMenu = (showId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenuShowId(openMenuShowId === showId ? null : showId);
  };

  const activeShows = shows.filter((s) => !s.completed);
  const completedShows = shows.filter((s) => s.completed);

  // Sorting active shows
  const sortedActiveShows = useMemo(() => {
    const list = [...activeShows];
    if (sortOption === "alpha") {
      list.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortOption === "progress") {
      list.sort((a, b) => b.progressPercent - a.progressPercent);
    } else {
      // Default: recent / natural order
    }
    return list;
  }, [activeShows, sortOption]);

  return (
    <section className="space-y-12 animate-fadeIn">
      
      {/* ACTIVE SHOWS SECTION */}
      <div className="space-y-6">
        {/* Top Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-[#242d36]">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-[#00e054] uppercase">
              <span className="w-2 h-2 rounded-full bg-[#00e054] inline-block animate-pulse"></span>
              <span>Radar de Transmissão</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-white mt-1">
              Próximos a Assistir
            </h1>
            <p className="text-sm text-[#8b9baa]">
              Sua fila personalizada de séries e episódios ativos.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-[#1b2228] px-3 py-1.5 rounded-xl border border-[#2c3642] text-xs">
              <span className="text-[#8b9baa]">Ordenar:</span>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
              >
                <option value="recent" className="bg-[#14181c]">Lançamento mais recente</option>
                <option value="alpha" className="bg-[#14181c]">Ordem alfabética (A-Z)</option>
                <option value="progress" className="bg-[#14181c]">Mais perto de terminar</option>
              </select>
            </div>

            <button
              onClick={onOpenSearch}
              className="px-4 py-2 rounded-xl bg-[#00e054] hover:bg-[#00c749] text-black text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Série do TMDB</span>
            </button>
          </div>
        </div>

        {/* Empty State / Active Shows Grid */}
        {sortedActiveShows.length === 0 ? (
          <div className="py-16 px-4 text-center border border-dashed border-[#2c3642] rounded-2xl bg-[#1b2228]/50 space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#00e054]/10 text-[#00e054] flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Seu Radar está Vazio</h3>
              <p className="text-xs text-[#8b9baa] max-w-sm mx-auto">
                Adicione as séries que você está acompanhando usando a base mundial do TMDB para receber os próximos episódios.
              </p>
            </div>
            <button
              onClick={onOpenSearch}
              className="px-4 py-2 rounded-xl bg-[#00e054] hover:bg-[#00c749] text-black text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2 shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Buscar no Catálogo Global</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {sortedActiveShows.map((show) => {
              const ep = show.currentEpisode;
              const isWatched = !!watchedEpisodes[ep.id];
              const isMenuOpen = openMenuShowId === show.id;

              return (
                <div
                  key={show.id}
                  className="group bg-[#1b2228] border border-[#2c3642] hover:border-[#384656] rounded-2xl overflow-hidden transition-all duration-200 flex flex-col justify-between shadow-sm relative"
                >
                  <div>
                    {/* Image Header with Clickable Trigger */}
                    <div
                      className="relative h-40 overflow-hidden cursor-pointer"
                      onClick={() => onSelectEpisode(ep)}
                    >
                      <img
                        src={ep.stillUrl || show.backdropUrl}
                        alt={show.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#1b2228] via-[#1b2228]/40 to-transparent" />
                      
                      {/* Network pill & Options dropdown */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-black/60 backdrop-blur px-2.5 py-1 rounded-full text-white border border-white/10">
                          {show.network}
                        </span>

                        {/* Dropdown trigger */}
                        <div className="relative">
                          <button
                            onClick={(e) => toggleMenu(show.id, e)}
                            className="p-1 rounded-full bg-black/60 hover:bg-black text-[#8b9baa] hover:text-white transition-colors cursor-pointer border border-white/10"
                            title="Mais opções"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {/* Dropdown Menu */}
                          {isMenuOpen && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 top-7 z-20 w-56 bg-[#14181c] border border-[#2c3642] rounded-xl shadow-xl py-1 text-xs text-left animate-fadeIn"
                            >
                              <button
                                onClick={() => {
                                  onOpenShowDetails(show);
                                  setOpenMenuShowId(null);
                                }}
                                className="w-full px-3 py-2 text-white hover:bg-[#242f38] flex items-center gap-2 cursor-pointer transition-colors"
                              >
                                <Layers className="w-3.5 h-3.5 text-[#40bcf4]" />
                                <span>Ver Todas as Temporadas</span>
                              </button>

                              <button
                                onClick={() => {
                                  onRewindEpisode(show.id);
                                  setOpenMenuShowId(null);
                                }}
                                className="w-full px-3 py-2 text-white hover:bg-[#242f38] flex items-center gap-2 cursor-pointer transition-colors"
                              >
                                <RotateCcw className="w-3.5 h-3.5 text-[#ffaa00]" />
                                <span>Voltar 1 Episódio</span>
                              </button>

                              <div className="h-px bg-[#242d36] my-1" />

                              <button
                                onClick={() => {
                                  onMarkSeasonWatched(show.id, ep.seasonNumber);
                                  setOpenMenuShowId(null);
                                }}
                                className="w-full px-3 py-2 text-white hover:bg-[#242f38] flex items-center gap-2 cursor-pointer transition-colors"
                              >
                                <CheckCheck className="w-3.5 h-3.5 text-[#00e054]" />
                                <span>Marcar Temporada {ep.seasonNumber}</span>
                              </button>
                              <button
                                onClick={() => {
                                  onMarkShowWatched(show.id);
                                  setOpenMenuShowId(null);
                                }}
                                className="w-full px-3 py-2 text-white hover:bg-[#242f38] flex items-center gap-2 cursor-pointer transition-colors"
                              >
                                <CheckCheck className="w-3.5 h-3.5 text-[#ffaa00]" />
                                <span>Marcar Série Toda</span>
                              </button>
                              <div className="h-px bg-[#242d36] my-1" />
                              <button
                                onClick={() => {
                                  onRemoveShow(show.id);
                                  setOpenMenuShowId(null);
                                }}
                                className="w-full px-3 py-2 text-red-400 hover:bg-red-500/10 flex items-center gap-2 cursor-pointer transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Remover do Radar</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Title and Code */}
                      <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                        <div>
                          <span className="text-xs font-semibold text-[#00e054]">{show.title}</span>
                          <h3 className="text-base font-bold text-white leading-snug">
                            {ep.code} • &ldquo;{ep.title}&rdquo;
                          </h3>
                        </div>
                      </div>
                    </div>

                    {/* Card Info */}
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between text-xs text-[#8b9baa]">
                        <span>Duração: {ep.runtime} min</span>
                        <span>Estreia: {ep.airDate}</span>
                      </div>

                      <p className="text-xs text-[#8b9baa] line-clamp-2 leading-relaxed">
                        {ep.overview}
                      </p>

                      {/* Progress bar */}
                      <div className="space-y-1 pt-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-[#687684]">Progresso</span>
                          <span className="text-white font-medium">
                            {show.progressText}
                          </span>
                        </div>
                        <div className="w-full bg-[#14181c] h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-[#00e054] h-full rounded-full transition-all duration-300"
                            style={{ width: `${show.progressPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="px-4 pb-4 pt-1 flex items-center justify-between gap-2 border-t border-[#242d36]/60">
                    <button
                      onClick={() => onOpenShowDetails(show)}
                      className="text-xs text-[#8b9baa] hover:text-white px-2 py-1.5 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5 text-[#00e054]" />
                      <span>Temporadas</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onSelectEpisode(ep)}
                        className="text-xs text-[#8b9baa] hover:text-white px-2 py-1.5 transition-colors cursor-pointer"
                      >
                        Ficha
                      </button>

                      <button
                        onClick={() => onToggleWatch(ep)}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer bg-[#00e054] text-black hover:bg-[#00c749] shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Marcar Visto</span>
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* COMPLETED SHOWS SECTION */}
      {completedShows.length > 0 && (
        <div className="space-y-6 pt-6 border-t border-[#242d36]/50">
          <div>
            <h2 className="text-xl font-bold text-white">
              Séries Finalizadas
            </h2>
            <p className="text-sm text-[#8b9baa]">
              Você concluiu todos os episódios disponíveis destas séries.
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {completedShows.map((show) => (
              <div
                key={show.id}
                onClick={() => onOpenShowDetails(show)}
                className="group relative bg-[#1b2228] border border-[#2c3642] hover:border-[#384656] rounded-xl overflow-hidden shadow-sm cursor-pointer"
              >
                <div className="relative h-48 sm:h-56">
                  <img
                    src={show.posterUrl}
                    alt={show.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2 flex justify-between items-end">
                    <span className="text-sm font-bold text-white line-clamp-1">
                      {show.title}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveShow(show.id);
                      }}
                      className="p-1.5 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
                      title="Remover"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="absolute top-2 left-2">
                    <span className="bg-[#00e054] text-black text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                      COMPLETA
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </section>
  );
};

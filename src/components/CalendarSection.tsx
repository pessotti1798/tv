"use client";

import React, { useState, useMemo } from "react";
import { Show, Episode, CalendarRelease } from "@/types";
import { Clock, Check, Bell, Calendar as CalendarIcon, Sparkles } from "lucide-react";

interface CalendarSectionProps {
  shows: Show[];
  watchedEpisodes: Record<string, boolean>;
  onSelectEpisode: (episode: Episode) => void;
  onToggleWatch: (episode: Episode) => void;
  onOpenSearch: () => void;
}

export const CalendarSection: React.FC<CalendarSectionProps> = ({
  shows,
  watchedEpisodes,
  onSelectEpisode,
  onToggleWatch,
  onOpenSearch,
}) => {
  const [filterView, setFilterView] = useState<"week" | "month" | "all">("week");

  // Derive calendar schedule from user's active shows
  const releases = useMemo<CalendarRelease[]>(() => {
    const list: CalendarRelease[] = [];

    // Fallback baseline upcoming schedule items so the timeline is never blank
    const baselineEpisodes: Partial<CalendarRelease>[] = [
      {
        id: "cal-slow-horses",
        showId: "slow-horses",
        showTitle: "Slow Horses",
        network: "Apple TV+",
        episodeCode: "S04E04",
        episodeTitle: "Returns",
        airDate: "Hoje • 22:00 BRT",
        rawAirDate: new Date().toISOString().split("T")[0],
        timeBRT: "22:00 BRT",
        posterUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=200&auto=format&fit=crop&q=80",
        backdropUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&auto=format&fit=crop&q=80",
        isToday: true,
        isAvailable: true,
        daysRemaining: 0,
      },
      {
        id: "cal-omitb",
        showId: "omitb",
        showTitle: "Only Murders in the Building",
        network: "Disney+ / Hulu",
        episodeCode: "S04E05",
        episodeTitle: "Adaptation",
        airDate: "Nesta Terça • 04:00 BRT",
        rawAirDate: "",
        timeBRT: "04:00 BRT",
        posterUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=200&auto=format&fit=crop&q=80",
        backdropUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&auto=format&fit=crop&q=80",
        isToday: false,
        isAvailable: false,
        daysRemaining: 2,
      },
      {
        id: "cal-penguin",
        showId: "the-penguin",
        showTitle: "The Penguin",
        network: "HBO Max",
        episodeCode: "S01E02",
        episodeTitle: "Inside Man",
        airDate: "Domingo • 22:00 BRT",
        rawAirDate: "",
        timeBRT: "22:00 BRT",
        posterUrl: "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=200&auto=format&fit=crop&q=80",
        backdropUrl: "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1200&auto=format&fit=crop&q=80",
        isToday: false,
        isAvailable: false,
        daysRemaining: 5,
      },
    ];

    // Map active shows
    shows.forEach((show) => {
      if (show.completed || !show.currentEpisode) return;
      const ep = show.currentEpisode;

      list.push({
        id: `cal-${ep.id}`,
        showId: show.id,
        showTitle: show.title,
        network: show.network,
        episodeCode: ep.code,
        episodeTitle: ep.title,
        airDate: ep.airDate || "Em breve",
        rawAirDate: "",
        timeBRT: "21:00 BRT",
        posterUrl: show.posterUrl,
        backdropUrl: ep.stillUrl || show.backdropUrl,
        episode: ep,
        isToday: ep.airDate?.toLowerCase().includes("hoje") || false,
        isAvailable: true,
        daysRemaining: 1,
      });
    });

    // If user has shows, merge them with baseline; else show baseline
    if (list.length === 0) {
      return baselineEpisodes.map((item, idx) => ({
        id: item.id || `cal-${idx}`,
        showId: item.showId || "",
        showTitle: item.showTitle || "",
        network: item.network || "TV",
        episodeCode: item.episodeCode || "S01E01",
        episodeTitle: item.episodeTitle || "Episódio",
        airDate: item.airDate || "",
        rawAirDate: item.rawAirDate || "",
        timeBRT: item.timeBRT || "22:00 BRT",
        posterUrl: item.posterUrl || "",
        backdropUrl: item.backdropUrl || "",
        isToday: !!item.isToday,
        isAvailable: !!item.isAvailable,
        daysRemaining: item.daysRemaining || 0,
        episode: {
          id: item.id || `ep-${idx}`,
          showId: item.showId || "",
          showTitle: item.showTitle || "",
          network: item.network || "",
          seasonNumber: 1,
          episodeNumber: 1,
          code: item.episodeCode || "S01E01",
          title: item.episodeTitle || "",
          runtime: 55,
          airDate: item.airDate || "",
          overview: "Novo episódio com lançamento agendado na programação oficial.",
          stillUrl: item.backdropUrl || "",
          backdropUrl: item.backdropUrl || "",
          averageRating: 8.9,
        },
      }));
    }

    return list;
  }, [shows]);

  const filteredReleases = useMemo(() => {
    if (filterView === "week") {
      return releases.slice(0, 6);
    }
    return releases;
  }, [releases, filterView]);

  return (
    <section className="space-y-8 animate-fadeIn">
      
      {/* Header */}
      <div className="pb-4 border-b border-[#242d36] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-[#00e054] uppercase">
            <span className="w-2 h-2 rounded-full bg-[#00e054] inline-block animate-pulse"></span>
            <span>Linha do Tempo de Transmissão</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white mt-1">
            Calendário de Estreias
          </h1>
          <p className="text-sm text-[#8b9baa]">
            Próximos episódios a serem transmitidos pelas emissoras e serviços de streaming.
          </p>
        </div>

        {/* Filter Switcher */}
        <div className="flex items-center gap-2 bg-[#1b2228] p-1 rounded-xl border border-[#2c3642] text-xs">
          <button
            onClick={() => setFilterView("week")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              filterView === "week"
                ? "bg-[#242f38] text-white"
                : "text-[#8b9baa] hover:text-white"
            }`}
          >
            Esta Semana
          </button>
          <button
            onClick={() => setFilterView("month")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              filterView === "month"
                ? "bg-[#242f38] text-white"
                : "text-[#8b9baa] hover:text-white"
            }`}
          >
            Mês
          </button>
          <button
            onClick={() => setFilterView("all")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              filterView === "all"
                ? "bg-[#242f38] text-white"
                : "text-[#8b9baa] hover:text-white"
            }`}
          >
            Todos ({releases.length})
          </button>
        </div>
      </div>

      {/* Grid of Releases */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredReleases.map((item) => {
          const isWatched = !!watchedEpisodes[item.episode.id];

          return (
            <div
              key={item.id}
              className="bg-[#1b2228] border border-[#2c3642] hover:border-[#384656] p-4 rounded-2xl flex gap-4 transition-all group shadow-sm flex-col justify-between"
            >
              <div className="flex gap-4">
                <div
                  className="w-20 h-28 rounded-xl bg-[#2c3642] shrink-0 overflow-hidden cursor-pointer relative"
                  onClick={() => onSelectEpisode(item.episode)}
                >
                  <img
                    src={item.posterUrl}
                    alt={item.showTitle}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {isWatched && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <Check className="w-5 h-5 text-[#00e054] stroke-[3]" />
                    </div>
                  )}
                </div>

                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#00e054] font-semibold truncate max-w-[130px]">
                        {item.network}
                      </span>
                      <span className="text-[11px] text-[#8b9baa] font-mono shrink-0">
                        {item.timeBRT}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white mt-0.5 truncate">
                      {item.showTitle}
                    </h3>

                    <p className="text-xs text-[#8b9baa] line-clamp-1 mt-0.5">
                      {item.episodeCode} • &ldquo;{item.episodeTitle}&rdquo;
                    </p>
                  </div>

                  <div className="pt-2 flex items-center gap-1.5">
                    {item.isToday ? (
                      <span className="text-[11px] text-[#00e054] font-semibold flex items-center gap-1">
                        <Clock className="w-3 h-3 animate-pulse" />
                        Disponível hoje
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#ffaa00] font-medium flex items-center gap-1">
                        <CalendarIcon className="w-3 h-3" />
                        {item.airDate}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-[#242d36] flex items-center justify-between gap-2 text-xs">
                <button
                  onClick={() => onSelectEpisode(item.episode)}
                  className="text-[#8b9baa] hover:text-white transition-colors cursor-pointer px-1"
                >
                  Ficha
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onToggleWatch(item.episode)}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer ${
                      isWatched
                        ? "bg-[#242f38] text-[#00e054]"
                        : "bg-[#00e054] text-black hover:bg-[#00c749]"
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>{isWatched ? "Assistido ✓" : "Marcar Visto"}</span>
                  </button>
                </div>
              </div>

            </div>
          );
        })}
      </div>

    </section>
  );
};

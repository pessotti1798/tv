"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Show, Episode } from "@/types";
import { Clock, Check, Calendar as CalendarIcon, Sparkles, Plus, Layers, Loader2, AlertTriangle } from "lucide-react";
import { ShowSchedule, addDays, daysBetween, fetchSchedule, parseISODate, toISODate } from "@/lib/episodes";

interface CalendarSectionProps {
  shows: Show[];
  watchedEpisodes: Record<string, boolean>;
  onSelectEpisode: (episode: Episode) => void;
  onToggleWatch: (episode: Episode) => void;
  onOpenSearch: () => void;
  onOpenShowDetails: (show: Show) => void;
}

type FilterView = "week" | "month" | "all";

/** Quantos dias à frente cada filtro mostra. */
const HORIZON_DAYS: Record<FilterView, number> = { week: 7, month: 30, all: Infinity };

/** Episódios lançados nos últimos dias também aparecem, como "saiu recentemente". */
const RECENT_DAYS = 7;

/** Um card: um ou mais episódios da mesma série no mesmo dia (ex.: temporada inteira lançada de uma vez). */
interface ReleaseItem {
  key: string;
  show: Show;
  airDate: string;
  episodes: Episode[];
}

function dayLabel(today: string, iso: string): string {
  const diff = daysBetween(today, iso);
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Amanhã";
  if (diff === -1) return "Ontem";
  const label = parseISODate(iso).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function shortDate(iso: string): string {
  return parseISODate(iso).toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" });
}

function relativeDays(today: string, iso: string): string {
  const diff = daysBetween(today, iso);
  if (diff === 0) return "Disponível hoje";
  if (diff < 0) return diff === -1 ? "Saiu ontem" : `Saiu há ${-diff} dias`;
  return diff === 1 ? "Estreia amanhã" : `Estreia em ${diff} dias`;
}

export const CalendarSection: React.FC<CalendarSectionProps> = ({
  shows,
  watchedEpisodes,
  onSelectEpisode,
  onToggleWatch,
  onOpenSearch,
  onOpenShowDetails,
}) => {
  const [filterView, setFilterView] = useState<FilterView>("week");
  const [today] = useState(() => toISODate(new Date()));
  const since = addDays(today, -RECENT_DAYS);

  // Agenda por série (ID local). `null` = falhou; ausente = ainda carregando.
  const [schedules, setSchedules] = useState<Record<string, ShowSchedule | null>>({});

  const trackedShows = useMemo(() => shows.filter((s) => s.tmdbId), [shows]);
  const trackedKey = trackedShows.map((s) => s.id).join(",");

  useEffect(() => {
    let isMounted = true;
    trackedShows.forEach((show) => {
      fetchSchedule(show, since).then((result) => {
        if (isMounted) setSchedules((prev) => ({ ...prev, [show.id]: result }));
      });
    });
    return () => {
      isMounted = false;
    };
    // Só refaz a busca quando o conjunto de séries muda (não a cada episódio marcado).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackedKey, since]);

  const isLoading = trackedShows.some((s) => !(s.id in schedules));
  const failedShows = trackedShows.filter((s) => s.id in schedules && schedules[s.id] === null);

  // Todos os lançamentos conhecidos, agrupados por série + dia.
  const allItems = useMemo<ReleaseItem[]>(() => {
    const items: ReleaseItem[] = [];
    trackedShows.forEach((show) => {
      const byDay = new Map<string, Episode[]>();
      (schedules[show.id]?.episodes ?? []).forEach((ep) => {
        byDay.set(ep.airDate, [...(byDay.get(ep.airDate) ?? []), ep]);
      });
      byDay.forEach((episodes, airDate) => {
        items.push({ key: `${show.id}-${airDate}`, show, airDate, episodes });
      });
    });
    return items.sort((a, b) => a.airDate.localeCompare(b.airDate) || a.show.title.localeCompare(b.show.title));
  }, [trackedShows, schedules]);

  const horizon = HORIZON_DAYS[filterView];
  const visibleItems = allItems.filter((item) => daysBetween(today, item.airDate) <= horizon);

  // Agrupa por dia para a linha do tempo.
  const days = useMemo(() => {
    const map = new Map<string, ReleaseItem[]>();
    visibleItems.forEach((item) => map.set(item.airDate, [...(map.get(item.airDate) ?? []), item]));
    return [...map.entries()];
  }, [visibleItems]);

  const recentDays = days.filter(([date]) => date < today);
  const upcomingDays = days.filter(([date]) => date >= today);

  // Séries sem lançamento no período visível, mas com informação útil.
  const showsWithItems = new Set(visibleItems.map((i) => i.show.id));
  const laterReleases = trackedShows
    .filter((s) => !showsWithItems.has(s.id) && schedules[s.id]?.nextAirDate)
    .map((s) => ({ show: s, date: schedules[s.id]!.nextAirDate! }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const awaitingDate = trackedShows.filter(
    (s) =>
      !showsWithItems.has(s.id) &&
      !schedules[s.id]?.nextAirDate &&
      schedules[s.id]?.status === "Returning Series"
  );

  const filterButton = (view: FilterView, label: string) => (
    <button
      onClick={() => setFilterView(view)}
      className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
        filterView === view ? "bg-[#242f38] text-white" : "text-[#8b9baa] hover:text-white"
      }`}
    >
      {label}
    </button>
  );

  // Os primeiros cards aparecem no topo da página: carregam já (LCP).
  const eagerKeys = new Set(visibleItems.slice(0, 3).map((i) => i.key));

  const renderItem = (item: ReleaseItem) => {
    const { show, episodes, airDate } = item;
    const isSingle = episodes.length === 1;
    const first = episodes[0];
    const last = episodes[episodes.length - 1];
    const hasAired = airDate <= today;
    const watchedCount = episodes.filter((ep) => watchedEpisodes[ep.id]).length;
    const allWatched = watchedCount === episodes.length;

    return (
      <div
        key={item.key}
        className="bg-[#1b2228] border border-[#2c3642] hover:border-[#384656] p-4 rounded-2xl flex gap-4 transition-all group shadow-sm flex-col justify-between"
      >
        <div className="flex gap-4">
          <div
            className="w-20 h-28 rounded-xl bg-[#2c3642] shrink-0 overflow-hidden cursor-pointer relative"
            onClick={() => (isSingle ? onSelectEpisode(first) : onOpenShowDetails(show))}
          >
            <Image fill sizes="80px" loading={eagerKeys.has(item.key) ? "eager" : "lazy"}
              src={show.posterUrl}
              alt={show.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            {allWatched && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <Check className="w-5 h-5 text-[#00e054] stroke-[3]" />
              </div>
            )}
          </div>

          <div className="flex-1 flex flex-col justify-between min-w-0">
            <div>
              <div className="flex items-center justify-between text-xs gap-2">
                <span className="text-[#00e054] font-semibold truncate">{show.network}</span>
                <span className="text-[11px] text-[#8b9baa] font-mono shrink-0">
                  {isSingle ? first.code : `${first.code}–E${String(last.episodeNumber).padStart(2, "0")}`}
                </span>
              </div>

              <h3 className="text-base font-bold text-white mt-0.5 truncate">{show.title}</h3>

              <p className="text-xs text-[#8b9baa] line-clamp-1 mt-0.5">
                {isSingle
                  ? <>&ldquo;{first.title}&rdquo;</>
                  : `Temporada ${first.seasonNumber} • ${episodes.length} episódios de uma vez`}
              </p>
            </div>

            <div className="pt-2 flex items-center gap-1.5">
              {hasAired ? (
                <span className="text-[11px] text-[#00e054] font-semibold flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {relativeDays(today, airDate)}
                </span>
              ) : (
                <span className="text-[11px] text-[#ffaa00] font-medium flex items-center gap-1">
                  <CalendarIcon className="w-3 h-3" />
                  {relativeDays(today, airDate)}
                </span>
              )}
              {!isSingle && watchedCount > 0 && (
                <span className="text-[11px] text-[#8b9baa]">• {watchedCount}/{episodes.length} vistos</span>
              )}
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-[#242d36] flex items-center justify-between gap-2 text-xs">
          {isSingle ? (
            <button
              onClick={() => onSelectEpisode(first)}
              className="text-[#8b9baa] hover:text-white transition-colors cursor-pointer px-1"
            >
              Ficha
            </button>
          ) : (
            <span />
          )}

          {isSingle && hasAired ? (
            <button
              onClick={() => onToggleWatch(first)}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer ${
                allWatched ? "bg-[#242f38] text-[#00e054]" : "bg-[#00e054] text-black hover:bg-[#00c749]"
              }`}
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>{allWatched ? "Assistido ✓" : "Marcar Visto"}</span>
            </button>
          ) : isSingle ? (
            <span className="text-[11px] text-[#8b9baa]">Ainda não lançado</span>
          ) : (
            <button
              onClick={() => onOpenShowDetails(show)}
              className="px-3 py-1.5 rounded-lg font-semibold text-xs bg-[#242f38] text-white hover:bg-[#2c3642] transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Ver episódios</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderDays = (list: [string, ReleaseItem[]][]) =>
    list.map(([date, items]) => (
      <div key={date} className="space-y-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <span className={date === today ? "text-[#00e054]" : ""}>{dayLabel(today, date)}</span>
          {Math.abs(daysBetween(today, date)) <= 1 && (
            <span className="text-xs font-normal text-[#8b9baa]">{shortDate(date)}</span>
          )}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">{items.map(renderItem)}</div>
      </div>
    ));

  return (
    <section className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="pb-4 border-b border-[#242d36] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-[#00e054] uppercase">
            <span className="w-2 h-2 rounded-full bg-[#00e054] inline-block animate-pulse"></span>
            <span>Linha do Tempo de Transmissão</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white mt-1">Calendário de Estreias</h1>
          <p className="text-sm text-[#8b9baa]">
            Próximos episódios das séries no seu Radar, com datas do TMDB.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#1b2228] p-1 rounded-xl border border-[#2c3642] text-xs">
          {filterButton("week", "7 dias")}
          {filterButton("month", "30 dias")}
          {filterButton("all", `Todos (${allItems.length})`)}
        </div>
      </div>

      {trackedShows.length === 0 ? (
        <div className="bg-[#1b2228] border border-dashed border-[#2c3642] rounded-2xl p-10 flex flex-col items-center text-center gap-4">
          <Sparkles className="w-8 h-8 text-[#00e054]" />
          <div>
            <h3 className="text-lg font-bold text-white">Nenhuma série para acompanhar</h3>
            <p className="text-sm text-[#8b9baa] max-w-md mt-1">
              Adicione séries do TMDB ao seu Radar para ver aqui as datas dos próximos episódios.
            </p>
          </div>
          <button
            onClick={onOpenSearch}
            className="px-4 py-2 rounded-xl bg-[#00e054] hover:bg-[#00c749] text-black font-bold text-sm flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Série</span>
          </button>
        </div>
      ) : (
        <>
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-[#8b9baa]">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Consultando a agenda no TMDB...</span>
            </div>
          )}

          {failedShows.length > 0 && (
            <div className="bg-[#2a1f14] border border-[#ffaa00]/30 text-[#ffcc80] rounded-xl p-3 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                {failedShows.length === trackedShows.length
                  ? "Não foi possível consultar o TMDB. Verifique a chave TMDB_API_KEY em .env.local."
                  : `Não foi possível carregar a agenda de: ${failedShows.map((s) => s.title).join(", ")}.`}
              </span>
            </div>
          )}

          {!isLoading && visibleItems.length === 0 && failedShows.length < trackedShows.length && (
            <div className="bg-[#1b2228] border border-[#2c3642] rounded-2xl p-8 text-center">
              <CalendarIcon className="w-7 h-7 text-[#8b9baa] mx-auto mb-2" />
              <p className="text-sm text-white font-semibold">
                {filterView === "all"
                  ? "Nenhum episódio anunciado para as séries do seu Radar."
                  : `Nenhum episódio nos próximos ${horizon} dias.`}
              </p>
              {filterView !== "all" && allItems.length > 0 && (
                <button
                  onClick={() => setFilterView("all")}
                  className="text-xs text-[#00e054] hover:underline mt-2 cursor-pointer"
                >
                  Ver todas as datas anunciadas
                </button>
              )}
            </div>
          )}

          {recentDays.length > 0 && (
            <div className="space-y-5">
              <h2 className="text-xs font-semibold tracking-wider text-[#8b9baa] uppercase">
                Saiu recentemente
              </h2>
              {renderDays(recentDays)}
            </div>
          )}

          {upcomingDays.length > 0 && (
            <div className="space-y-5">
              <h2 className="text-xs font-semibold tracking-wider text-[#8b9baa] uppercase">Próximas estreias</h2>
              {renderDays(upcomingDays)}
            </div>
          )}

          {(laterReleases.length > 0 || awaitingDate.length > 0) && (
            <div className="pt-4 border-t border-[#242d36] grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              {laterReleases.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold tracking-wider text-[#8b9baa] uppercase mb-2">
                    Mais adiante
                  </h3>
                  <ul className="space-y-1">
                    {laterReleases.map(({ show, date }) => (
                      <li key={show.id} className="flex justify-between gap-3">
                        <button
                          onClick={() => onOpenShowDetails(show)}
                          className="text-white hover:text-[#00e054] truncate cursor-pointer text-left"
                        >
                          {show.title}
                        </button>
                        <span className="text-[#8b9baa] shrink-0">{shortDate(date)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {awaitingDate.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold tracking-wider text-[#8b9baa] uppercase mb-2">
                    Renovadas, sem data anunciada
                  </h3>
                  <p className="text-[#8b9baa]">{awaitingDate.map((s) => s.title).join(" • ")}</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
};

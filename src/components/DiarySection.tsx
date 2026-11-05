"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import { WatchLog } from "@/types";
import { Trash2, Search, BookOpen } from "lucide-react";

interface DiarySectionProps {
  logs: WatchLog[];
  onDeleteLog?: (logId: string) => void;
  onSelectEpisodeById?: (episodeId: string, showId: string) => void;
}

export const DiarySection: React.FC<DiarySectionProps> = ({
  logs,
  onDeleteLog,
  onSelectEpisodeById,
}) => {
  const [filterType, setFilterType] = useState<"all" | "review" | "rewatch">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredLogs = useMemo(() => {
    let result = [...logs];

    // Filter by type
    if (filterType === "review") {
      result = result.filter((l) => !!l.reviewText?.trim());
    } else if (filterType === "rewatch") {
      result = result.filter((l) => !!l.isRewatch);
    }

    // Filter by query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (l) =>
          l.showTitle.toLowerCase().includes(q) ||
          l.episodeTitle.toLowerCase().includes(q) ||
          l.episodeCode.toLowerCase().includes(q) ||
          l.reviewText?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [logs, filterType, searchQuery]);

  return (
    <section className="space-y-6 animate-fadeIn">
      
      {/* Header */}
      <div className="pb-4 border-b border-[#242d36] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-[#00e054] uppercase">
            <span className="w-2 h-2 rounded-full bg-[#00e054] inline-block"></span>
            <span>Registro Cronológico</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white mt-1">
            Diário de Episódios
          </h1>
          <p className="text-sm text-[#8b9baa]">
            Cada episódio assistido, com sua respectiva data, avaliação crítica e anotação.
          </p>
        </div>

        {/* Search & Sort Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#8b9baa] absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar no diário..."
              className="bg-[#1b2228] border border-[#2c3642] focus:border-[#00e054] rounded-xl py-1.5 pl-8 pr-3 text-xs text-white placeholder-[#687684] focus:outline-none transition-colors w-40 sm:w-52"
            />
          </div>

          <div className="flex items-center gap-1 bg-[#1b2228] p-1 rounded-xl border border-[#2c3642] text-xs">
            <button
              onClick={() => setFilterType("all")}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                filterType === "all" ? "bg-[#242f38] text-white" : "text-[#8b9baa] hover:text-white"
              }`}
            >
              Todos ({logs.length})
            </button>
            <button
              onClick={() => setFilterType("review")}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                filterType === "review" ? "bg-[#242f38] text-white" : "text-[#8b9baa] hover:text-white"
              }`}
            >
              Com resenha
            </button>
            <button
              onClick={() => setFilterType("rewatch")}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                filterType === "rewatch" ? "bg-[#242f38] text-white" : "text-[#8b9baa] hover:text-white"
              }`}
            >
              Rewatch
            </button>
          </div>
        </div>
      </div>

      {/* Diary Table (Letterboxd Style) */}
      <div className="bg-[#1b2228] border border-[#2c3642] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#14181c] border-b border-[#2c3642] text-[#8b9baa] uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-4 w-28">Data</th>
                <th className="py-3.5 px-4 w-16">Pôster</th>
                <th className="py-3.5 px-4">Série & Episódio</th>
                <th className="py-3.5 px-4 w-32">Avaliação</th>
                <th className="py-3.5 px-4">Resenha / Impressão</th>
                <th className="py-3.5 px-4 w-16 text-center">Rewatch</th>
                <th className="py-3.5 px-4 w-12 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#242d36] text-[#e1e7ed]">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-[#8b9baa] space-y-2">
                    <BookOpen className="w-8 h-8 text-[#404f5e] mx-auto mb-2" />
                    <p className="text-sm font-semibold text-white">Nenhum registro encontrado</p>
                    <p className="text-xs text-[#687684]">
                      Marque episódios como assistidos para povoar seu diário cinematográfico.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-[#222b34]/50 transition-colors group cursor-pointer"
                    onClick={() => {
                      if (onSelectEpisodeById) {
                        onSelectEpisodeById(log.episodeId, log.showId);
                      }
                    }}
                  >
                    <td className="py-3 px-4 font-mono text-[#8b9baa] text-xs whitespace-nowrap">
                      {log.watchedAt}
                    </td>
                    <td className="py-3 px-4">
                      <Image width={40} height={56}
                        src={log.posterUrl}
                        alt={log.showTitle}
                        className="w-10 h-14 object-cover rounded-md shadow border border-[#2c3642]"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-white text-sm group-hover:text-[#00e054] transition-colors">
                        {log.showTitle}
                      </div>
                      <div className="text-[#8b9baa] text-xs">
                        {log.episodeCode} • &ldquo;{log.episodeTitle}&rdquo;
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {log.rating ? (
                        <span className="text-[#00e054] text-xs font-semibold flex items-center gap-1">
                          <span>{"★".repeat(Math.floor(log.rating))}</span>
                          {log.rating % 1 !== 0 && <span>½</span>}
                          <span className="text-[#687684] text-[10px] ml-1">({log.rating.toFixed(1)})</span>
                        </span>
                      ) : (
                        <span className="text-[#687684]">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-[#8b9baa] max-w-sm truncate">
                      {log.reviewText ? (
                        <span className="italic text-[#cbd5e1]">&ldquo;{log.reviewText}&rdquo;</span>
                      ) : (
                        <span className="text-[#687684]">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {log.isRewatch ? (
                        <span className="text-xs text-[#40bcf4]" title="Rewatch">🔁</span>
                      ) : (
                        <span className="text-[#687684]">—</span>
                      )}
                    </td>
                    <td
                      className="py-3 px-4 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {onDeleteLog && (
                        <button
                          onClick={() => onDeleteLog(log.id)}
                          className="p-1 rounded text-[#687684] hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                          title="Remover do diário"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </section>
  );
};

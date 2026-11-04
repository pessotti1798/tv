"use client";

import React, { useState, useEffect } from "react";
import { Show } from "@/types";
import { Search, Plus, X, Loader2, Sparkles, TrendingUp } from "lucide-react";
import { INITIAL_SHOWS } from "@/lib/catalog";

interface SearchShowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddShow: (show: Show) => void;
  existingShowIds: string[];
}

export const SearchShowModal: React.FC<SearchShowModalProps> = ({
  isOpen,
  onClose,
  onAddShow,
  existingShowIds,
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [trending, setTrending] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  // Fetch trending on open
  useEffect(() => {
    if (!isOpen) return;

    async function loadTrending() {
      try {
        const res = await fetch("/api/tmdb/trending");
        if (res.ok) {
          const data = await res.json();
          if (data.results && data.results.length > 0) {
            setTrending(data.results);
            return;
          }
        }
      } catch (err) {
        console.warn("Trending fetch failed:", err);
      }

      // Fallback trending from INITIAL_SHOWS
      setTrending(
        INITIAL_SHOWS.map((s) => ({
          id: s.id,
          tmdbId: s.tmdbId || s.id,
          title: s.title,
          firstAirYear: s.firstAirYear,
          posterUrl: s.posterUrl,
          backdropUrl: s.backdropUrl,
          overview: s.overview,
          voteAverage: 8.8,
        }))
      );
    }

    loadTrending();
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/tmdb/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          setResults(data.results);
        } else {
          // Local catalog fallback search
          const q = query.toLowerCase();
          const localMatches = INITIAL_SHOWS.filter((s) => s.title.toLowerCase().includes(q)).map((s) => ({
            id: s.id,
            tmdbId: s.tmdbId || s.id,
            title: s.title,
            firstAirYear: s.firstAirYear,
            posterUrl: s.posterUrl,
            backdropUrl: s.backdropUrl,
            overview: s.overview,
            voteAverage: 9.0,
          }));
          setResults(localMatches);
        }
      } catch (err) {
        console.error("Erro ao buscar no TMDB:", err);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const handleSelectShow = async (item: any) => {
    setAddingId(String(item.tmdbId || item.id));
    try {
      // Check if it's in INITIAL_SHOWS first
      const localShow = INITIAL_SHOWS.find((s) => s.id === item.id || String(s.tmdbId) === String(item.tmdbId));
      if (localShow) {
        onAddShow(localShow);
        onClose();
        return;
      }

      const res = await fetch(`/api/tmdb/show/${item.tmdbId || item.id}`);
      const data = await res.json();
      if (data.show) {
        onAddShow(data.show);
        onClose();
      }
    } catch (err) {
      console.error("Erro ao carregar detalhes da série:", err);
    } finally {
      setAddingId(null);
    }
  };

  const displayedList = query.trim() ? results : trending;
  const listTitle = query.trim() ? "Resultados da Pesquisa" : "Em Alta nesta Semana";

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn">
      <div className="bg-[#1b2228] border border-[#2c3642] w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl my-auto max-h-[90vh] flex flex-col">
        
        {/* Header with Search Input */}
        <div className="p-4 border-b border-[#242d36] flex items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#8b9baa] absolute left-3 top-3" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar qualquer série no TMDB (ex: Severance, The Bear, Shōgun)..."
              autoFocus
              className="w-full bg-[#14181c] border border-[#2c3642] focus:border-[#00e054] rounded-xl py-2 pl-9 pr-4 text-sm text-white placeholder-[#687684] focus:outline-none transition-colors"
            />
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[#8b9baa] hover:text-white hover:bg-[#242f38] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List Subtitle */}
        <div className="px-5 py-2.5 bg-[#14181c]/50 border-b border-[#242d36] flex items-center justify-between text-xs text-[#8b9baa] shrink-0">
          <span className="font-semibold flex items-center gap-1.5 text-white">
            {query.trim() ? <Search className="w-3.5 h-3.5 text-[#00e054]" /> : <TrendingUp className="w-3.5 h-3.5 text-[#ffaa00]" />}
            <span>{listTitle}</span>
          </span>
          <span>{displayedList.length} séries</span>
        </div>

        {/* Results Body */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-[#8b9baa]">
              <Loader2 className="w-6 h-6 animate-spin text-[#00e054]" />
              <span className="text-xs">Consultando catálogo mundial do TMDB...</span>
            </div>
          ) : displayedList.length === 0 ? (
            <div className="py-16 text-center text-[#8b9baa] text-xs space-y-2">
              <Sparkles className="w-6 h-6 text-[#404f5e] mx-auto" />
              <p className="text-white font-semibold">Nenhuma série encontrada para essa busca.</p>
              <p className="text-[#687684]">Tente outros termos ou navegue pelas séries sugeridas.</p>
            </div>
          ) : (
            displayedList.map((item) => {
              const showIdentifier = String(item.tmdbId || item.id);
              const isAlreadyAdded = existingShowIds.includes(String(item.id)) || existingShowIds.includes(showIdentifier);
              const isAddingThis = addingId === showIdentifier;

              return (
                <div
                  key={showIdentifier}
                  className="bg-[#14181c] border border-[#2c3642] hover:border-[#384656] p-3 rounded-xl flex items-center justify-between gap-4 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={item.posterUrl}
                      alt={item.title}
                      className="w-12 h-16 rounded-md object-cover bg-[#242f38] shrink-0"
                    />
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-white truncate">{item.title}</h4>
                      <p className="text-xs text-[#8b9baa]">
                        {item.firstAirYear} {item.voteAverage > 0 && `• ★ ${item.voteAverage}`}
                      </p>
                      <p className="text-[11px] text-[#687684] line-clamp-1 mt-0.5">
                        {item.overview}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSelectShow(item)}
                    disabled={isAlreadyAdded || isAddingThis}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                      isAlreadyAdded
                        ? "bg-[#242f38] text-[#8b9baa] cursor-not-allowed"
                        : "bg-[#00e054] hover:bg-[#00c749] text-black shadow-sm font-bold"
                    }`}
                  >
                    {isAddingThis ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Adicionando...</span>
                      </>
                    ) : isAlreadyAdded ? (
                      <span>No Radar ✓</span>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Adicionar</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
};

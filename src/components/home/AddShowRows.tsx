"use client";

import React, { useEffect, useState } from "react";
import { ShowSearchResult } from "@/types";
import { useEpisodic } from "@/components/EpisodicProvider";
import { getTMDBShowFullDetails, searchTMDBShows } from "@/lib/tmdb";
import { GRAY, LIGHT_GRAY, LeftAlign, leftText } from "./styles";

const MAX_RESULTS = 8;

/**
 * Linhas finais da lista: "+adicionar" vira um campo de busca no próprio lugar,
 * e os resultados aparecem como novas linhas, no mesmo estilo da lista.
 */
export function AddShowRows({ align }: { align: LeftAlign }) {
  const { existingShowIds, handleAddShow } = useEpisodic();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const trimmed = query.trim();
  // Resultado guardado com o termo buscado: respostas antigas não aparecem para um termo novo.
  const [search, setSearch] = useState<{ query: string; items: ShowSearchResult[] }>({ query: "", items: [] });
  const [addingId, setAddingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!trimmed) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      let items: ShowSearchResult[] = [];
      try {
        items = await searchTMDBShows(trimmed);
      } catch {
        // Sem conexão ou TMDB fora: a lista fica vazia.
      }
      if (!cancelled) setSearch({ query: trimmed, items: items.slice(0, MAX_RESULTS) });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmed]);

  const close = () => {
    setIsOpen(false);
    setQuery("");
    setError(null);
  };

  const add = async (item: ShowSearchResult) => {
    setAddingId(item.tmdbId);
    setError(null);
    try {
      const show = await getTMDBShowFullDetails(item.tmdbId);
      if (!show) throw new Error("sem dados");
      handleAddShow(show);
      close();
    } catch {
      setError("não foi possível adicionar");
    } finally {
      setAddingId(null);
    }
  };

  // Espaço extra antes do botão, como no layout.
  const firstRowSpacing = "mt-[0.6em]";

  if (!isOpen) {
    return (
      <>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`${firstRowSpacing} ${LIGHT_GRAY} ${leftText(align)} hover:text-black transition-colors cursor-pointer`}
        >
          +adicionar
        </button>
        <span className={firstRowSpacing} />
      </>
    );
  }

  const loading = !!trimmed && search.query !== trimmed;
  const results = trimmed && !loading ? search.items : [];

  return (
    <>
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && close()}
        onBlur={() => !query && close()}
        placeholder="buscar série"
        aria-label="Buscar série para adicionar"
        className={`${firstRowSpacing} w-full min-w-0 bg-transparent ${leftText(align)} font-light outline-none placeholder:text-[#c8c8c8] caret-black`}
      />
      <span className={`${firstRowSpacing} ${LIGHT_GRAY}`}>
        {loading ? "buscando…" : error ?? (trimmed && results.length === 0 ? "nada encontrado" : "")}
      </span>

      {results.map((item) => {
        const alreadyAdded =
          existingShowIds.includes(item.id) || existingShowIds.includes(String(item.tmdbId));
        const isAdding = addingId === item.tmdbId;
        return (
          <div key={item.tmdbId} className="contents">
            <button
              type="button"
              disabled={alreadyAdded || addingId !== null}
              onClick={() => add(item)}
              className={`${GRAY} ${leftText(align)} break-words enabled:hover:text-black enabled:cursor-pointer transition-colors`}
            >
              {item.title}
            </button>
            <span className={`${LIGHT_GRAY}`}>
              {isAdding ? "adicionando…" : alreadyAdded ? `${item.firstAirYear} · já na lista` : item.firstAirYear}
            </span>
          </div>
        );
      })}
    </>
  );
}

"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Show, ShowSearchResult } from "@/types";
import { parseEpisodeId } from "@/lib/episodes";
import { getTMDBRecentReleases, getTMDBShowFullDetails } from "@/lib/tmdb";
import { useEpisodic } from "@/components/EpisodicProvider";
import { DETAIL_TEXT, GRAY, LIGHT_GRAY, LIST_TEXT, STACKED_ROW_GAP, homeGrid, leftText, seriesHref, withAlign } from "./styles";
import { seasonSummary } from "./CompletedPage";
import { useLeftAlign } from "./useLeftAlign";

/** Quantas sugestões aparecem por vez. */
const PAGE_SIZE = 5;

/**
 * Lançamentos: séries que estrearam nos últimos meses e que você ainda não
 * acompanha nem viu, da maior para a menor nota. Mesma forma da página de
 * concluídas; "outros lançamentos" mostra as próximas cinco. O título abre a
 * página da série, onde dá para adicioná-la.
 */
export default function ReleasesPage() {
  const { existingShowIds, watchedEpisodes } = useEpisodic();
  const align = useLeftAlign();

  // Séries que já são suas (acompanhadas ou com episódio visto). Calculado uma vez:
  // uma série adicionada pela página dela continua aqui até recarregar.
  const [excluded] = useState(() => {
    const ids = new Set(existingShowIds);
    Object.keys(watchedEpisodes).forEach((id) => {
      const showId = parseEpisodeId(id)?.showId;
      if (showId) ids.add(showId);
    });
    return ids;
  });

  const [pool, setPool] = useState<ShowSearchResult[]>([]);
  const [fetched, setFetched] = useState({ page: 0, totalPages: 1 });
  const [failed, setFailed] = useState(false);
  const [offset, setOffset] = useState(0);
  // Temporadas e episódios de cada sugestão (o discover do TMDB não traz). `null` = falhou.
  const [details, setDetails] = useState<Record<number, Show | null>>({});

  const suggestions = useMemo(
    () => pool.filter((s) => !excluded.has(s.id) && !excluded.has(String(s.tmdbId))),
    [pool, excluded]
  );
  const hasMorePages = fetched.page < fetched.totalPages;
  const needsMore = suggestions.length < offset + PAGE_SIZE && hasMorePages && !failed;

  // Busca a próxima página do TMDB enquanto faltar sugestão para a tela.
  useEffect(() => {
    if (!needsMore) return;
    let cancelled = false;
    const page = fetched.page + 1;
    getTMDBRecentReleases(page)
      .then((data) => {
        if (cancelled) return;
        setPool((prev) => {
          const seen = new Set(prev.map((s) => s.tmdbId));
          return [...prev, ...data.results.filter((s) => !seen.has(s.tmdbId))];
        });
        setFetched({ page, totalPages: data.totalPages });
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [needsMore, fetched.page]);

  const visible = suggestions.slice(offset, offset + PAGE_SIZE);
  const loading = needsMore && visible.length < PAGE_SIZE;
  // Sem mais nada depois destas cinco: "outros lançamentos" volta ao começo.
  const atEnd = !hasMorePages && offset + PAGE_SIZE >= suggestions.length;
  const showOthers = () => setOffset(atEnd ? 0 : offset + PAGE_SIZE);

  // Busca os detalhes das sugestões na tela que ainda não têm.
  const missingKey = visible
    .filter((s) => !(s.tmdbId in details))
    .map((s) => s.tmdbId)
    .join(",");
  useEffect(() => {
    if (!missingKey) return;
    let cancelled = false;
    missingKey.split(",").forEach((tmdbId) => {
      getTMDBShowFullDetails(tmdbId)
        .catch(() => null)
        .then((show) => !cancelled && setDetails((prev) => ({ ...prev, [Number(tmdbId)]: show })));
    });
    return () => {
      cancelled = true;
    };
  }, [missingKey]);

  return (
    <main className="min-h-screen bg-white text-black flex flex-col items-center px-4">
      <div className="flex-1 w-full flex flex-col items-center justify-center py-24 gap-[clamp(2rem,5vw,3.5rem)]">
        <div className={`${homeGrid(align)} ${DETAIL_TEXT}`}>
          <Link href={withAlign("/", align)} className={`${GRAY} hover:text-black ${leftText(align)}`}>
            ← voltar
          </Link>
          <span className={GRAY}>lançamentos</span>
        </div>

        <div className={`${homeGrid(align)} ${LIST_TEXT}`}>
          {visible.map((item) => {
            const detail = details[item.tmdbId];
            return (
              <div key={item.tmdbId} className="contents">
                <Link
                  href={seriesHref(item.tmdbId, align)}
                  className={`${leftText(align)} break-words decoration-1 underline-offset-[0.18em] hover:underline`}
                >
                  {item.title}
                </Link>
                <span className={`${GRAY} ${STACKED_ROW_GAP}`}>
                  {detail ? seasonSummary(detail) : detail === null ? "—" : "…"}
                </span>
              </div>
            );
          })}

          {(loading || failed || (!loading && visible.length === 0)) && (
            <>
              <span className={`${GRAY} ${leftText(align)}`}>{loading ? "buscando" : "nada"}</span>
              <span className={GRAY}>
                {loading ? "lançamentos no TMDB…" : failed ? "o TMDB não respondeu" : "nenhum lançamento novo para você"}
              </span>
            </>
          )}

          {suggestions.length > PAGE_SIZE && (
            <>
              <button
                type="button"
                onClick={showOthers}
                className={`mt-[0.6em] ${LIGHT_GRAY} ${leftText(align)} hover:text-black transition-colors cursor-pointer`}
              >
                outros lançamentos
              </button>
              <span className="mt-[0.6em]" />
            </>
          )}
        </div>
      </div>
    </main>
  );
}

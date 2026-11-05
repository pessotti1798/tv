"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { Show } from "@/types";
import { useEpisodic } from "@/components/EpisodicProvider";
import { DETAIL_TEXT, GRAY, LIST_TEXT, STACKED_ROW_GAP, homeGrid, leftText, withAlign } from "./styles";
import { useLeftAlign } from "./useLeftAlign";

/** "N temporadas · N episódios". */
export function seasonSummary(show: Show): string {
  // Conta só temporadas com episódios (as apenas anunciadas vêm do TMDB com 0).
  const count = show.seasons ? show.seasons.filter((s) => s.episodeCount > 0).length : show.totalSeasons;
  return `${count} temporada${count === 1 ? "" : "s"} · ${show.totalEpisodes} episódios`;
}

/** Séries concluídas: mesma linguagem da lista inicial, em ordem alfabética. */
export default function CompletedPage() {
  const { trackedShows } = useEpisodic();
  const align = useLeftAlign();
  const completed = useMemo(
    () => trackedShows.filter((s) => s.completed).sort((a, b) => a.title.localeCompare(b.title)),
    [trackedShows]
  );

  return (
    <main className="min-h-screen bg-white text-black flex flex-col items-center px-4">
      <div className="flex-1 w-full flex flex-col items-center justify-center py-24 gap-[clamp(2rem,5vw,3.5rem)]">
        <div className={`${homeGrid(align)} ${DETAIL_TEXT}`}>
          <Link href={withAlign("/", align)} className={`${GRAY} hover:text-black ${leftText(align)}`}>
            ← voltar
          </Link>
          <span className={GRAY}>concluídas</span>
        </div>

        <div className={`${homeGrid(align)} ${LIST_TEXT}`}>
          {completed.length === 0 ? (
            <>
              <span className={`${GRAY} ${leftText(align)}`}>nenhuma série</span>
              <span className={GRAY}>concluída ainda</span>
            </>
          ) : (
            completed.map((show) => (
              <div key={show.id} className="contents">
                <Link
                  href={withAlign(`/serie/${encodeURIComponent(show.id)}`, align)}
                  className={`${leftText(align)} break-words decoration-1 underline-offset-[0.18em] hover:underline`}
                >
                  {show.title}
                </Link>
                <span className={`${GRAY} ${STACKED_ROW_GAP}`}>{seasonSummary(show)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}

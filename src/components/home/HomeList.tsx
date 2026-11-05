"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { WatchableEpisode, useMarkAnimation } from "./WatchableEpisode";
import Link from "next/link";
import { TrackedShow } from "@/types";
import { ReleaseStatus, episodeAirISO, formatShortDay, releaseStatus, toISODate } from "@/lib/episodes";
import { useEpisodic } from "@/components/EpisodicProvider";
import { AddShowRows } from "./AddShowRows";
import { LIGHT_GRAY, LIST_TEXT, STACKED_ROW_GAP, homeGrid, leftText, statusClass, withAlign } from "./styles";
import { useLeftAlign } from "./useLeftAlign";
import { useUndo } from "./useUndo";
import { SECTIONS } from "./SectionShell";

interface Row {
  show: TrackedShow;
  status: ReleaseStatus;
  airDate: string | null;
}

/** Ordem dos grupos: desta semana, já lançados, carregando, ainda não lançados. */
const GROUP_ORDER: Record<ReleaseStatus, number> = { "this-week": 0, aired: 1, unknown: 2, upcoming: 3 };

function buildRows(shows: TrackedShow[], today: string): Row[] {
  return shows
    .filter((show) => !show.completed)
    .map<Row>((show) => ({
      show,
      status: releaseStatus(show.currentEpisode, today),
      airDate: episodeAirISO(show.currentEpisode),
    }))
    .sort((a, b) => {
      const byGroup = GROUP_ORDER[a.status] - GROUP_ORDER[b.status];
      if (byGroup !== 0) return byGroup;
      if (a.status === "upcoming") {
        // Próximas estreias: a mais próxima primeiro; sem data por último.
        return (a.airDate ?? "9999").localeCompare(b.airDate ?? "9999");
      }
      if (a.status === "this-week" || a.status === "aired") {
        // Episódios mais novos por cima.
        return (b.airDate ?? "").localeCompare(a.airDate ?? "");
      }
      return a.show.title.localeCompare(b.show.title);
    });
}

/** Texto da coluna do episódio. Nos que ainda não estrearam, a data importa mais que o nome. */
function episodeLabel({ show, status, airDate }: Row): string {
  const ep = show.currentEpisode;
  if (status === "upcoming") return `${ep.code} · ${airDate ? formatShortDay(airDate) : "sem data"}`;
  return `${ep.code} ${ep.title}`;
}

/**
 * Página inicial: séries em andamento e o próximo episódio de cada uma.
 * As concluídas ficam em /concluidas (link no rodapé).
 */
export default function HomeList() {
  const { trackedShows, handleToggleWatch, handleUnwatch } = useEpisodic();
  const [today] = useState(() => toISODate(new Date()));
  const rows = useMemo(() => buildRows(trackedShows, today), [trackedShows, today]);
  const completedCount = useMemo(() => trackedShows.filter((s) => s.completed).length, [trackedShows]);
  const align = useLeftAlign();
  const { offerUndo, undoElement } = useUndo();

  const markWatched = (show: TrackedShow) => {
    const ep = show.currentEpisode;
    handleToggleWatch(ep);
    offerUndo(`${show.title} ${ep.code} marcado como visto`, () => handleUnwatch(ep));
  };

  // Séries cujo episódio acabou de avançar: o próximo entra animado.
  const markAnimation = useMarkAnimation();
  const [justAdvanced, setJustAdvanced] = useState<Record<string, boolean>>({});
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const commitWatched = (show: TrackedShow) => {
    markWatched(show);
    setJustAdvanced((prev) => ({ ...prev, [show.id]: true }));
    timers.current.push(
      setTimeout(
        () =>
          setJustAdvanced((prev) => {
            const next = { ...prev };
            delete next[show.id];
            return next;
          }),
        1500
      )
    );
  };

  const seriesHref = (show: TrackedShow) => withAlign(`/serie/${encodeURIComponent(show.id)}`, align);

  return (
    <main className="min-h-screen bg-white text-black flex flex-col items-center px-4">
      <div className="flex-1 w-full flex items-center justify-center py-24">
        <div className={`${homeGrid(align)} ${LIST_TEXT}`}>
          {rows.map((row) => {
            const { show, status } = row;
            const cls = statusClass(status);
            const canMark = status === "this-week" || status === "aired";

            return (
              // `contents` mantém as duas células na grade.
              <div key={show.id} className="contents">
                <Link
                  href={seriesHref(show)}
                  className={`${cls} ${leftText(align)} break-words decoration-1 underline-offset-[0.18em] hover:underline`}
                >
                  {show.title}
                </Link>

                {canMark ? (
                  <WatchableEpisode
                    // Chave pelo episódio: o próximo entra como elemento novo, com a animação de chegada.
                    key={show.currentEpisode.id}
                    code={show.currentEpisode.code}
                    title={show.currentEpisode.title}
                    variant={markAnimation}
                    entering={!!justAdvanced[show.id]}
                    onCommit={() => commitWatched(show)}
                    className={`${cls} ${STACKED_ROW_GAP}`}
                  />
                ) : (
                  <span
                    // Logo depois de marcar, o próximo episódio pode ainda estar carregando do TMDB:
                    // o provisório fica invisível (ocupando o espaço) e o real entra com a animação.
                    className={`${cls} ${STACKED_ROW_GAP} break-words ${
                      status === "unknown" && justAdvanced[show.id] ? "opacity-0" : ""
                    }`}
                  >
                    {episodeLabel(row)}
                  </span>
                )}
              </div>
            );
          })}

          <AddShowRows align={align} />
        </div>
      </div>

      <nav aria-label="Outras seções" className={`${LIGHT_GRAY} text-sm pb-8 flex flex-wrap justify-center gap-x-4`}>
        {completedCount > 0 && (
          <Link href={withAlign("/concluidas", align)} className="hover:text-black">
            concluídas ({completedCount})
          </Link>
        )}
        {SECTIONS.map(({ href, label }) => (
          <Link key={href} href={withAlign(href, align)} className="hover:text-black">
            {label}
          </Link>
        ))}
      </nav>

      {undoElement}
    </main>
  );
}

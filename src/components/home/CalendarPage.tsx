"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Episode, Show } from "@/types";
import { ShowSchedule, daysBetween, fetchSchedule, formatShortDay, startOfWeekISO, toISODate } from "@/lib/episodes";
import { useEpisodic } from "@/components/EpisodicProvider";
import { GRAY, LIGHT_GRAY, LIST_TEXT, STACKED_ROW_GAP, homeGrid, leftText, seriesHref } from "./styles";
import { SectionShell } from "./SectionShell";
import { useLeftAlign } from "./useLeftAlign";

/** Um lançamento: um ou mais episódios da mesma série no mesmo dia. */
interface Release {
  key: string;
  show: Show;
  date: string;
  episodes: Episode[];
}

function dayLabel(today: string, iso: string): string {
  const diff = daysBetween(today, iso);
  if (diff === 0) return "hoje";
  if (diff === 1) return "amanhã";
  if (diff === -1) return "ontem";
  return formatShortDay(iso);
}

/** "S02E03" ou, para vários episódios no mesmo dia, "S02E01–E08". */
function episodesLabel(episodes: Episode[]): string {
  if (episodes.length === 1) {
    const ep = episodes[0];
    // Títulos provisórios do TMDB ("Episódio 4") não acrescentam nada ao código.
    return /^epis[óo]dio \d+$/i.test(ep.title.trim()) ? ep.code : `${ep.code} ${ep.title}`;
  }
  const first = episodes[0];
  const last = episodes[episodes.length - 1];
  return `${first.code}–${last.code.slice(last.code.indexOf("E"))} · ${episodes.length} episódios`;
}

/**
 * Calendário: lançamentos desde o início desta semana, em ordem de data.
 * Mesmas regras da página inicial: o que já saiu nesta semana em negrito,
 * o que ainda vai estrear em cinza.
 */
export default function CalendarPage() {
  const { trackedShows } = useEpisodic();
  const align = useLeftAlign();
  const [today] = useState(() => toISODate(new Date()));
  const since = startOfWeekISO(today);

  // Agenda por série. `null` = falhou; ausente = carregando.
  const [schedules, setSchedules] = useState<Record<string, ShowSchedule | null>>({});
  const shows = useMemo(() => trackedShows.filter((s) => s.tmdbId), [trackedShows]);
  const showsKey = shows.map((s) => s.id).join(",");

  useEffect(() => {
    let mounted = true;
    shows.forEach((show) => {
      fetchSchedule(show, since).then((result) => {
        if (mounted) setSchedules((prev) => ({ ...prev, [show.id]: result }));
      });
    });
    return () => {
      mounted = false;
    };
    // Só quando o conjunto de séries muda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showsKey, since]);

  const loading = shows.some((s) => !(s.id in schedules));
  const failed = shows.filter((s) => s.id in schedules && schedules[s.id] === null).length;

  const releases = useMemo<Release[]>(() => {
    const items: Release[] = [];
    shows.forEach((show) => {
      const schedule = schedules[show.id];
      if (!schedule) return;
      const byDay = new Map<string, Episode[]>();
      schedule.episodes.forEach((ep) => byDay.set(ep.airDate, [...(byDay.get(ep.airDate) ?? []), ep]));
      byDay.forEach((episodes, date) => items.push({ key: `${show.id}-${date}`, show, date, episodes }));
      // Próxima data conhecida sem episódio detalhado ainda.
      if (byDay.size === 0 && schedule.nextAirDate) {
        items.push({ key: `${show.id}-next`, show, date: schedule.nextAirDate, episodes: [] });
      }
    });
    return items.sort((a, b) => a.date.localeCompare(b.date) || a.show.title.localeCompare(b.show.title));
  }, [shows, schedules]);

  // Séries renovadas, mas ainda sem data.
  const awaiting = shows.filter((s) => {
    const schedule = schedules[s.id];
    return schedule && schedule.episodes.length === 0 && !schedule.nextAirDate && schedule.status === "Returning Series";
  });

  const seriesLink = (show: Show) => (
    <Link
      href={seriesHref(show.id, align)}
      className="decoration-1 underline-offset-[0.18em] hover:underline"
    >
      {show.title}
    </Link>
  );

  const empty = !loading && releases.length === 0 && awaiting.length === 0;

  return (
    <SectionShell title="calendário" current="/calendario" align={align}>
      <div className={`${homeGrid(align)} ${LIST_TEXT}`}>
        {releases.map((r, i) => {
          const upcoming = r.date > today;
          const cls = upcoming ? GRAY : "font-semibold text-black";
          const firstOfDay = i === 0 || releases[i - 1].date !== r.date;
          const isToday = r.date === today;
          return (
            <div key={r.key} className="contents">
              <span
                className={`${leftText(align)} ${isToday ? "text-black" : GRAY} ${
                  firstOfDay ? "" : "hidden min-[480px]:block min-[480px]:invisible"
                } ${firstOfDay && i > 0 ? "mt-[0.6em]" : ""}`}
              >
                {dayLabel(today, r.date)}
              </span>
              <span className={`${cls} ${STACKED_ROW_GAP} break-words ${firstOfDay && i > 0 ? "min-[480px]:mt-[0.6em]" : ""}`}>
                {seriesLink(r.show)} {r.episodes.length > 0 ? episodesLabel(r.episodes) : <span className={GRAY}>nova temporada</span>}
              </span>
            </div>
          );
        })}

        {awaiting.map((show, i) => (
          <div key={show.id} className="contents">
            <span className={`${leftText(align)} ${GRAY} ${i === 0 ? "mt-[0.6em]" : "hidden min-[480px]:block min-[480px]:invisible"}`}>
              sem data
            </span>
            <span className={`${GRAY} ${STACKED_ROW_GAP} break-words ${i === 0 ? "min-[480px]:mt-[0.6em]" : ""}`}>
              {seriesLink(show)} renovada
            </span>
          </div>
        ))}

        {(loading || empty || failed > 0) && (
          <>
            <span className={`${LIGHT_GRAY} ${leftText(align)} mt-[0.6em]`}>
              {loading ? "carregando" : empty ? "nada" : ""}
            </span>
            <span className={`${LIGHT_GRAY} min-[480px]:mt-[0.6em]`}>
              {loading
                ? "buscando datas no TMDB…"
                : empty
                ? "nenhuma estreia nas suas séries"
                : `${failed} série${failed === 1 ? "" : "s"} sem resposta do TMDB`}
            </span>
          </>
        )}
      </div>
    </SectionShell>
  );
}

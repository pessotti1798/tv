"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Episode, SeriesExtras, Show, TrackedShow } from "@/types";
import {
  buildPlaceholderEpisode,
  daysBetween,
  fetchSeason,
  formatDiaryDate,
  getSeasonEpisodeCount,
  getSeasonNumbers,
  releaseStatus,
  toISODate,
  trackShow,
} from "@/lib/episodes";
import { useEpisodic } from "@/components/EpisodicProvider";
import { getSeriesExtras, getTMDBShowFullDetails } from "@/lib/tmdb";
import { DETAIL_TEXT, GRAY, LIGHT_GRAY, LIST_TEXT, LeftAlign, leftItems, leftText, pageGrid, statusClass, withAlign } from "./styles";
import { useLeftAlign } from "./useLeftAlign";
import { useUndo } from "./useUndo";

/** Episódios de cada temporada (TMDB; sem TMDB, episódios provisórios com a contagem conhecida). */
function useSeasonEpisodes(show: TrackedShow | undefined) {
  const [seasons, setSeasons] = useState<Record<number, Episode[]>>({});
  const seasonKey = show ? getSeasonNumbers(show).join(",") : "";

  useEffect(() => {
    if (!show) return;
    let cancelled = false;
    getSeasonNumbers(show).forEach((n) => {
      fetchSeason(show, n).then((season) => {
        if (cancelled) return;
        const episodes = season?.episodes?.length
          ? season.episodes
          : Array.from({ length: getSeasonEpisodeCount(show, n) }, (_, i) =>
              buildPlaceholderEpisode(show, { season: n, episode: i + 1 })
            );
        setSeasons((prev) => ({ ...prev, [n]: episodes }));
      });
    });
    return () => {
      cancelled = true;
    };
    // Recarrega só quando a série ou a lista de temporadas muda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show?.id, seasonKey]);

  return seasons;
}

/**
 * Série que não está na sua lista (ex.: vinda de "lançamentos"), buscada no TMDB
 * pelo ID. `undefined` = carregando ou não se aplica; `null` = não encontrada.
 */
function usePreviewShow(id: string, enabled: boolean) {
  const [result, setResult] = useState<{ id: string; show: Show | null } | null>(null);
  const isTmdbId = /^\d+$/.test(id);

  useEffect(() => {
    if (!enabled || !isTmdbId) return;
    let cancelled = false;
    getTMDBShowFullDetails(id)
      .catch(() => null)
      .then((show) => {
        if (!cancelled) setResult({ id, show });
      });
    return () => {
      cancelled = true;
    };
  }, [id, enabled, isTmdbId]);

  if (!enabled) return undefined;
  if (!isTmdbId) return null;
  return result?.id === id ? result.show : undefined;
}

/** Notas externas e onde assistir. `undefined` = carregando; `null` = indisponível. */
function useExtras(tmdbId: number | undefined) {
  const [extras, setExtras] = useState<{ id: number; data: SeriesExtras | null } | null>(null);

  useEffect(() => {
    if (!tmdbId) return;
    let cancelled = false;
    getSeriesExtras(tmdbId)
      .catch(() => null)
      .then((data) => !cancelled && setExtras({ id: tmdbId, data }));
    return () => {
      cancelled = true;
    };
  }, [tmdbId]);

  if (!tmdbId) return null;
  return extras?.id === tmdbId ? extras.data : undefined;
}

/** "hoje", "amanhã", "em 5 dias" ou "há 2 dias". */
function relativeDay(today: string, iso: string): string {
  const diff = daysBetween(today, iso);
  if (diff === 0) return "hoje";
  if (diff === 1) return "amanhã";
  if (diff === -1) return "ontem";
  return diff > 0 ? `em ${diff} dias` : `há ${-diff} dias`;
}

/** Linha "próxima estreia": data do próximo episódio a ser lançado (TMDB). */
function NextRelease({ extras, today }: { extras: SeriesExtras | null | undefined; today: string }) {
  if (extras === undefined) return <span className={GRAY}>…</span>;
  if (!extras) return <span className={GRAY}>—</span>;

  const next = extras.nextAirEpisode;
  if (next) {
    return (
      <span>
        {next.airDate ? (
          <>
            <span className="font-semibold">{formatDiaryDate(next.airDate)}</span>{" "}
            <span className={GRAY}>({relativeDay(today, next.airDate)})</span>
          </>
        ) : (
          "sem data anunciada"
        )}
        <span className={GRAY}>
          {" "}
          · {next.code} {next.title}
        </span>
      </span>
    );
  }
  const ended = extras.status === "Ended" || extras.status === "Canceled";
  return <span className={GRAY}>{ended ? "série encerrada" : "nenhum episódio anunciado"}</span>;
}

/** Espaço abaixo de cada valor quando rótulo e valor estão empilhados (celular). */
const DETAIL_VALUE = "mb-[1em] min-[480px]:mb-0";

function Label({ children, align }: { children: React.ReactNode; align: LeftAlign }) {
  return <span className={`${GRAY} ${leftText(align)}`}>{children}</span>;
}

export default function SeriesPage({ id }: { id: string }) {
  const router = useRouter();
  const {
    trackedShows,
    watchedEpisodes,
    handleToggleWatch,
    handleUnwatch,
    handleMarkSeasonWatched,
    handleRemoveShow,
    handleAddShow,
  } = useEpisodic();
  const { offerUndo, undoElement } = useUndo();
  const tracked = trackedShows.find((s) => s.id === id);
  // Fora da sua lista: a mesma página, só para consulta, com "+adicionar".
  const preview = usePreviewShow(id, !tracked);
  const previewView = useMemo(() => (preview ? trackShow(preview, {}, {}) : undefined), [preview]);
  const show = tracked ?? previewView;
  const inList = !!tracked;
  const [today] = useState(() => toISODate(new Date()));
  const seasons = useSeasonEpisodes(show);
  const extras = useExtras(show?.tmdbId);
  const align = useLeftAlign();

  if (!show && preview === undefined) {
    return <main className={`min-h-screen bg-white flex items-center justify-center px-4 ${DETAIL_TEXT} ${GRAY}`}>carregando…</main>;
  }

  if (!show) {
    return (
      <main className={`min-h-screen bg-white flex flex-col items-center justify-center gap-4 px-4 ${DETAIL_TEXT}`}>
        <p>Série não encontrada.</p>
        <Link href="/" className={`${GRAY} hover:text-black`}>
          ← voltar
        </Link>
      </main>
    );
  }

  const remove = () => {
    if (!confirm(`Remover ${show.title} da sua lista? O histórico de episódios vistos é mantido.`)) return;
    handleRemoveShow(show.id);
    router.push("/");
  };

  // Marcar oferece "desfazer"; desmarcar é o próprio desfazer, então não pede confirmação.
  const toggleEpisode = (ep: Episode) => {
    const wasWatched = !!watchedEpisodes[ep.id];
    handleToggleWatch(ep);
    if (!wasWatched) offerUndo(`${ep.code} marcado como visto`, () => handleUnwatch(ep));
  };

  const poster = (className: string) => (
    <Image
      src={show.posterUrl}
      alt={`Pôster de ${show.title}`}
      width={600}
      height={900}
      sizes="(max-width: 480px) 70vw, 440px"
      loading="eager"
      className={`aspect-[2/3] object-cover bg-[#f2f2f2] ${className}`}
    />
  );

  const ratings: { label: string; value: string | null; href?: string }[] = [
    {
      label: "IMDb",
      value: extras?.imdbRating ?? null,
      href: extras?.imdbId ? `https://www.imdb.com/title/${extras.imdbId}/` : undefined,
    },
    { label: "Metacritic", value: extras?.metascore ?? null },
    { label: "TMDB", value: extras?.tmdbRating != null ? String(extras.tmdbRating) : null },
  ];

  return (
    <main className="min-h-screen bg-white text-black px-4 py-12 sm:py-20">
      <div className="max-w-7xl mx-auto">
        <div className={`${pageGrid(align)} ${DETAIL_TEXT}`}>
          {/* Séries fora da sua lista só chegam aqui por "lançamentos". */}
          <Link href={withAlign(inList ? "/" : "/lancamentos", align)} className={`${GRAY} hover:text-black ${leftText(align)}`}>
            ← voltar
          </Link>
          <span />
        </div>

        {/* Capa: pôster grande na coluna da esquerda, encostado no eixo entre as colunas
            (o mesmo dos rótulos); título e dados à direita, alinhados com a base do pôster.
            No celular o pôster fica em cima, com 70% da largura. */}
        <div className={`${pageGrid(align)} ${LIST_TEXT} mt-[clamp(2rem,6vw,5rem)]`}>
          <div className={`flex flex-col ${leftItems(align)}`}>
            {poster("w-[70%] max-w-[360px] min-[480px]:w-full min-[480px]:max-w-[clamp(200px,30vw,440px)] h-auto")}
          </div>
          <div className="flex flex-col justify-end mt-[0.6em] min-[480px]:mt-0">
            <h1 className="font-semibold break-words">{show.title}</h1>
            <p className={GRAY}>
              {[show.firstAirYear, show.network, `${show.totalSeasons} temporada${show.totalSeasons === 1 ? "" : "s"}`]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {!inList && (
              <button
                type="button"
                // Ao adicionar, a série entra na sua lista com o mesmo ID e a página vira a normal.
                onClick={() => preview && handleAddShow(preview)}
                className={`${LIGHT_GRAY} self-start text-left hover:text-black transition-colors cursor-pointer mt-[0.3em]`}
              >
                +adicionar
              </button>
            )}
          </div>
        </div>

        {/* Detalhes */}
        {/* Celular: rótulo colado ao valor, espaço maior entre os pares. */}
        <div className={`${pageGrid(align)} ${DETAIL_TEXT} gap-y-[0.15em] min-[480px]:gap-y-[1.1em] mt-[clamp(2rem,5vw,4rem)]`}>
          <Label align={align}>próxima estreia</Label>
          <p className={DETAIL_VALUE}>
            <NextRelease extras={extras} today={today} />
          </p>

          <Label align={align}>sinopse</Label>
          <p className={`max-w-[38rem] ${DETAIL_VALUE}`}>{show.overview}</p>

          <Label align={align}>notas</Label>
          <p className={`flex flex-wrap gap-x-[1.2em] ${DETAIL_VALUE}`}>
            {ratings.map((r) => (
              <span key={r.label}>
                {r.href ? (
                  <a href={r.href} target="_blank" rel="noreferrer" className="hover:underline underline-offset-[0.18em]">
                    {r.label}
                  </a>
                ) : (
                  r.label
                )}{" "}
                <span className={r.value ? "font-semibold" : GRAY}>{extras === undefined ? "…" : r.value ?? "—"}</span>
              </span>
            ))}
          </p>

          <Label align={align}>onde assistir</Label>
          <p className={DETAIL_VALUE}>
            {extras === undefined ? (
              <span className={GRAY}>…</span>
            ) : extras && extras.providers.length > 0 ? (
              <a
                href={extras.providersLink ?? undefined}
                target="_blank"
                rel="noreferrer"
                className="hover:underline underline-offset-[0.18em]"
              >
                {extras.providers.map((p) => p.name).join(", ")}
              </a>
            ) : (
              <span>
                {show.network} <span className={GRAY}>(sem streaming por assinatura no Brasil)</span>
              </span>
            )}
          </p>

          {inList && (
            <>
              <Label align={align}>progresso</Label>
              <p className={DETAIL_VALUE}>{show.progressText}</p>
            </>
          )}
        </div>

        {/* Episódios */}
        <div className={`${pageGrid(align)} ${DETAIL_TEXT} mt-[clamp(2.5rem,6vw,5rem)]`}>
          {getSeasonNumbers(show).map((n) => {
            const episodes = seasons[n];
            // Espaço entre temporadas, aplicado às duas células da primeira linha.
            const seasonGap = n > 1 ? "mt-[1.4em]" : "";
            if (!episodes) {
              return (
                <div key={n} className="contents">
                  <span className={`${GRAY} ${leftText(align)} ${seasonGap}`}>Temporada {n}</span>
                  <span className={`${LIGHT_GRAY} ${seasonGap}`}>carregando…</span>
                </div>
              );
            }
            return (
              <div key={n} className="contents">
                {episodes.map((ep, idx) => {
                  const status = releaseStatus(ep, today);
                  const isWatched = inList && !!watchedEpisodes[ep.id];
                  const isNext = inList && !show.completed && show.currentEpisode.id === ep.id;
                  // Só dá para marcar episódios de séries que estão na sua lista.
                  const canToggle = inList && (status === "this-week" || status === "aired");
                  return (
                    <div key={ep.id} className="contents group">
                      {/* Coluna esquerda: nome da temporada na 1ª linha, ação de marcar na 2ª. */}
                      <span className={`${leftText(align)} ${idx === 0 ? seasonGap : ""}`}>
                        {idx === 0 && (
                          <>
                            <span className={GRAY}>Temporada {n}</span>
                            {/* Celular: a ação fica ao lado do nome, para não cair entre episódios. */}
                            {inList && (
                              <button
                                type="button"
                                onClick={() => handleMarkSeasonWatched(show.id, n)}
                                className={`${LIGHT_GRAY} text-[0.8em] hover:text-black cursor-pointer ml-3 min-[480px]:hidden`}
                              >
                                marcar como vista
                              </button>
                            )}
                          </>
                        )}
                        {idx === 1 && inList && (
                          <button
                            type="button"
                            onClick={() => handleMarkSeasonWatched(show.id, n)}
                            className={`${LIGHT_GRAY} text-[0.8em] hover:text-black cursor-pointer hidden min-[480px]:inline`}
                          >
                            marcar temporada como vista
                          </button>
                        )}
                      </span>
                      <button
                        type="button"
                        disabled={!canToggle}
                        onClick={() => toggleEpisode(ep)}
                        title={canToggle ? (isWatched ? "Desmarcar" : "Marcar como visto") : "Ainda não estreou"}
                        className={`${statusClass(status)} ${idx === 0 ? seasonGap : ""} text-left break-words enabled:cursor-pointer transition-colors duration-150 enabled:hover:text-[#8a8a8a] enabled:focus-visible:text-[#8a8a8a]`}
                      >
                        {ep.code} {ep.title}
                        {isWatched && <span className={`${GRAY} font-normal`}> ✓</span>}
                        {isNext && <span className={`${GRAY} font-normal text-[0.8em]`}> · próximo</span>}
                        {canToggle && (
                          <span className={`${LIGHT_GRAY} font-normal text-[0.7em] ml-[0.6em] opacity-0 group-hover:opacity-100 [@media(hover:none)]:hidden`}>
                            {isWatched ? "desmarcar" : "marcar visto"}
                          </span>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Remover */}
        {inList && (
        <div className={`${pageGrid(align)} ${DETAIL_TEXT} mt-[clamp(2.5rem,6vw,5rem)]`}>
          <button type="button" onClick={remove} className={`${LIGHT_GRAY} ${leftText(align)} hover:text-black cursor-pointer`}>
            remover série
          </button>
          <span />
        </div>
        )}
      </div>
      {undoElement}
    </main>
  );
}

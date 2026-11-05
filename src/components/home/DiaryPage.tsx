"use client";

import React, { useMemo, useState } from "react";
import { WatchLog } from "@/types";
import { parseISODate, toISODate } from "@/lib/episodes";
import { useEpisodic } from "@/components/EpisodicProvider";
import { DETAIL_TEXT, GRAY, LIGHT_GRAY, LIST_TEXT, STACKED_ROW_GAP, homeGrid, leftText } from "./styles";
import { ACTION, SectionShell, TextOptions } from "./SectionShell";
import { useLeftAlign } from "./useLeftAlign";
import { useUndo } from "./useUndo";

type Filter = "all" | "review" | "rewatch";
type Sort = "recent" | "oldest" | "rating";

const PT_MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function logDate(iso: string, currentYear: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "sem data";
  const d = parseISODate(iso);
  const base = `${d.getDate()} ${PT_MONTHS[d.getMonth()]}`;
  return d.getFullYear() === currentYear ? base : `${base} ${d.getFullYear()}`;
}

/** Nota em estrelas de texto: 3,5 → "★★★½". */
export function starsText(rating: number): string {
  const full = Math.floor(rating);
  return "★".repeat(full) + (rating - full >= 0.5 ? "½" : "");
}

/** Cinco estrelas clicáveis; a metade esquerda de cada uma vale meia estrela. */
function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value;
  return (
    <span className="inline-flex items-center gap-x-[0.1em] text-[1.4em] leading-none" onMouseLeave={() => setHover(null)}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = shown >= i ? "full" : shown >= i - 0.5 ? "half" : "empty";
        const pick = (e: React.MouseEvent<HTMLButtonElement>) => {
          const rect = e.currentTarget.getBoundingClientRect();
          return e.clientX - rect.left < rect.width / 2 ? i - 0.5 : i;
        };
        return (
          <button
            key={i}
            type="button"
            aria-label={`${i} estrela${i === 1 ? "" : "s"}`}
            onMouseMove={(e) => setHover(pick(e))}
            onClick={(e) => onChange(pick(e))}
            className={`cursor-pointer ${
              fill === "full"
                ? "text-black"
                : fill === "half"
                ? "bg-[linear-gradient(90deg,#000_50%,#d4d4d4_50%)] bg-clip-text text-transparent"
                : "text-[#d4d4d4]"
            }`}
          >
            ★
          </button>
        );
      })}
    </span>
  );
}

/** Edição de nota, comentário e spoiler de um registro, na própria linha. */
function LogEditor({
  log,
  onSave,
  onCancel,
  onDelete,
}: {
  log: WatchLog;
  onSave: (patch: Pick<WatchLog, "rating" | "reviewText" | "hasSpoilers">) => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const [rating, setRating] = useState(log.rating ?? 0);
  const [text, setText] = useState(log.reviewText ?? "");
  const [spoilers, setSpoilers] = useState(!!log.hasSpoilers);

  const save = () =>
    onSave({ rating: rating > 0 ? rating : undefined, reviewText: text.trim() || undefined, hasSpoilers: spoilers && !!text.trim() });

  return (
    <div className={`${DETAIL_TEXT} flex flex-col gap-y-[0.7em] mt-[0.4em] mb-[0.6em] max-w-[38rem]`}>
      <span className="flex items-center gap-x-[0.9em]">
        <StarInput value={rating} onChange={setRating} />
        {rating > 0 && (
          <button type="button" onClick={() => setRating(0)} className={ACTION}>
            sem nota
          </button>
        )}
      </span>
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") onCancel();
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save();
        }}
        rows={3}
        placeholder="escreva um comentário"
        aria-label="Comentário"
        className="w-full bg-transparent resize-none outline-none border-b border-[#e5e5e5] focus:border-black pb-[0.3em] placeholder:text-[#c8c8c8] [field-sizing:content] min-h-[3lh]"
      />
      <button
        type="button"
        aria-pressed={spoilers}
        onClick={() => setSpoilers((v) => !v)}
        className={`self-start ${spoilers ? "text-black" : `${GRAY} hover:text-black`} cursor-pointer`}
      >
        {spoilers ? "✓ " : ""}contém spoiler
      </button>
      <span className="flex flex-wrap gap-x-[0.9em]">
        <button type="button" onClick={save} className="text-black hover:text-[#8a8a8a] cursor-pointer">
          salvar
        </button>
        <button type="button" onClick={onCancel} className={ACTION}>
          cancelar
        </button>
        <button type="button" onClick={onDelete} className={`${ACTION} ml-auto`}>
          apagar registro
        </button>
      </span>
    </div>
  );
}

/** Comentário do registro; os com spoiler ficam escondidos até pedir. */
function Review({ log }: { log: WatchLog }) {
  const [revealed, setRevealed] = useState(false);
  if (!log.reviewText?.trim()) return null;
  if (log.hasSpoilers && !revealed) {
    return (
      <button
        type="button"
        onClick={() => setRevealed(true)}
        className={`${DETAIL_TEXT} ${GRAY} hover:text-black cursor-pointer text-left mt-[0.2em] mb-[0.6em]`}
      >
        contém spoiler · mostrar
      </button>
    );
  }
  return <p className={`${DETAIL_TEXT} max-w-[38rem] whitespace-pre-line mt-[0.2em] mb-[0.6em]`}>{log.reviewText}</p>;
}

/**
 * Diário: cada sessão assistida, com data, nota e comentário. É o único lugar
 * do visual novo onde se avalia e comenta.
 */
export default function DiaryPage() {
  const { diaryLogs, handleUpdateLog, handleDeleteLog, handleRestoreLog } = useEpisodic();
  const align = useLeftAlign();
  const { offerUndo, undoElement } = useUndo();
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("recent");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentYear] = useState(() => parseISODate(toISODate(new Date())).getFullYear());

  const logs = useMemo(() => {
    const filtered = diaryLogs
      .map((log, index) => ({ log, index }))
      .filter(({ log }) =>
        filter === "review" ? !!log.reviewText?.trim() : filter === "rewatch" ? !!log.isRewatch : true
      );
    // O índice desempata: registros mais novos vêm primeiro no array.
    filtered.sort((a, b) => {
      if (sort === "rating") {
        return (b.log.rating || 0) - (a.log.rating || 0) || b.log.watchedAt.localeCompare(a.log.watchedAt) || a.index - b.index;
      }
      const byDate = a.log.watchedAt.localeCompare(b.log.watchedAt);
      return sort === "oldest" ? byDate || b.index - a.index : -byDate || a.index - b.index;
    });
    return filtered.map(({ log }) => log);
  }, [diaryLogs, filter, sort]);

  const ratedCount = diaryLogs.filter((l) => l.rating).length;
  const average = ratedCount ? diaryLogs.reduce((sum, l) => sum + (l.rating || 0), 0) / ratedCount : 0;

  const remove = (log: WatchLog) => {
    const index = diaryLogs.findIndex((l) => l.id === log.id);
    handleDeleteLog(log.id);
    setEditingId(null);
    offerUndo(`${log.showTitle} ${log.episodeCode} apagado do diário`, () => handleRestoreLog(log, index));
  };

  return (
    <SectionShell title="diário" current="/diario" align={align} overlay={undoElement}>
      <div className={`${homeGrid(align)} ${DETAIL_TEXT} gap-y-[0.15em] min-[480px]:gap-y-[0.4em]`}>
        <span className={`${GRAY} ${leftText(align)}`}>mostrar</span>
        <span className="mb-[0.6em] min-[480px]:mb-0">
          <TextOptions
            label="Filtrar diário"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "todos" },
              { value: "review", label: "com comentário" },
              { value: "rewatch", label: "revistos" },
            ]}
          />
        </span>
        <span className={`${GRAY} ${leftText(align)}`}>ordem</span>
        <span className="mb-[0.6em] min-[480px]:mb-0">
          <TextOptions
            label="Ordenar diário"
            value={sort}
            onChange={setSort}
            options={[
              { value: "recent", label: "recentes" },
              { value: "oldest", label: "antigos" },
              { value: "rating", label: "nota" },
            ]}
          />
        </span>
        {ratedCount > 0 && (
          <>
            <span className={`${GRAY} ${leftText(align)}`}>média</span>
            <span>
              {starsText(Math.round(average * 2) / 2)}{" "}
              <span className={GRAY}>
                {average.toFixed(1).replace(".", ",")} em {ratedCount} nota{ratedCount === 1 ? "" : "s"}
              </span>
            </span>
          </>
        )}
      </div>

      <div className={`${homeGrid(align)} ${LIST_TEXT}`}>
        {logs.length === 0 && (
          <>
            <span className={`${GRAY} ${leftText(align)}`}>nada</span>
            <span className={GRAY}>{diaryLogs.length === 0 ? "nenhum episódio no diário ainda" : "nenhum registro neste filtro"}</span>
          </>
        )}

        {logs.map((log, i) => {
          const byDate = sort !== "rating";
          // Na ordem por data, cada dia ganha um cabeçalho; a série aparece só uma vez seguida.
          const newDay = byDate && (i === 0 || logs[i - 1].watchedAt !== log.watchedAt);
          const repeatShow = !newDay && i > 0 && logs[i - 1].showId === log.showId;
          const editing = editingId === log.id;
          return (
            <div key={log.id} className="contents">
              {newDay && (
                <>
                  <span
                    className={`${DETAIL_TEXT} ${GRAY} ${leftText(align)} ${i > 0 ? "mt-[1.6em]" : ""} mb-[0.2em]`}
                  >
                    {logDate(log.watchedAt, currentYear)}
                  </span>
                  <span className={`hidden min-[480px]:block ${i > 0 ? "mt-[1.6em]" : ""}`} />
                </>
              )}
              <span
                className={`${leftText(align)} break-words ${
                  repeatShow ? "hidden min-[480px]:block min-[480px]:invisible" : ""
                }`}
              >
                {log.showTitle}
              </span>
              <div className={`${STACKED_ROW_GAP} min-w-0`}>
                <button
                  type="button"
                  onClick={() => setEditingId(editing ? null : log.id)}
                  aria-expanded={editing}
                  title={editing ? "Fechar" : "Avaliar e comentar"}
                  className="text-left break-words cursor-pointer transition-colors duration-150 hover:text-[#8a8a8a] focus-visible:text-[#8a8a8a]"
                >
                  {log.episodeCode} {log.episodeTitle}
                  {log.rating ? <span className="whitespace-nowrap"> {starsText(log.rating)}</span> : null}
                  {log.isRewatch && <span className={`${GRAY} text-[0.6em] ml-[0.6em] align-middle`}>revisto</span>}
                  {!byDate && (
                    <span className={`${GRAY} text-[0.6em] ml-[0.6em] align-middle whitespace-nowrap`}>
                      {logDate(log.watchedAt, currentYear)}
                    </span>
                  )}
                </button>
                {editing ? (
                  <LogEditor
                    log={log}
                    onCancel={() => setEditingId(null)}
                    onDelete={() => remove(log)}
                    onSave={(patch) => {
                      handleUpdateLog(log.id, patch);
                      setEditingId(null);
                    }}
                  />
                ) : (
                  <Review log={log} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {logs.length > 0 && !editingId && (
        <p className={`${LIGHT_GRAY} ${DETAIL_TEXT} text-center`}>clique num episódio para dar nota ou comentar</p>
      )}
    </SectionShell>
  );
}
